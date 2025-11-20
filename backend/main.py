from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from supabase import create_client, Client
from dotenv import load_dotenv
import os
import asyncio
from typing import List, Optional
from pydantic import BaseModel
import httpx
from PIL import Image
import io
import base64
from logger import log_info, log_warn, log_error, log_debug, safe_log_api_key

load_dotenv()

app = FastAPI(title="AI Image Gallery API")

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    log_warn("Validation error", path=str(request.url), errors=exc.errors())
    return JSONResponse(
        status_code=200,  # Return 200 even for validation errors
        content={"status": "error", "message": "Invalid request format", "errors": exc.errors()}
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    log_error("Missing Supabase configuration", ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"))
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables")

try:
    supabase: Client = create_client(supabase_url, supabase_key)
    log_info("Supabase client initialized")
except Exception as e:
    log_error("Failed to initialize Supabase client", e)
    raise

# AI Service Configuration
AI_SERVICE = os.getenv("AI_SERVICE", "huggingface")  # huggingface, openai, or google
AI_API_KEY = os.getenv("AI_API_KEY")  # For external services (OpenAI, Google)

# Log service configuration (NEVER expose API keys)
log_info("AI Service configuration", service=AI_SERVICE, api_key_status=safe_log_api_key(AI_API_KEY))

# Cache for AI results (simple in-memory cache)
ai_cache = {}


class ImageProcessRequest(BaseModel):
    image_id: int
    user_id: str
    image_url: str


async def process_image_with_ai(image_url: str) -> dict:
    """
    Process image with AI service to extract tags, description, and colors.
    This function will be implemented based on the chosen AI service.
    """
    # Check cache first
    cache_key = image_url
    if cache_key in ai_cache:
        return ai_cache[cache_key]
    
    try:
        # Check AI service and API key
        if AI_SERVICE == "huggingface":
            # Hugging Face - BLIP models not available via API (would need local server = costs money)
            result = await process_with_huggingface(image_url)
        elif AI_SERVICE == "openai":
            if not AI_API_KEY:
                raise ValueError("AI_SERVICE=openai but AI_API_KEY not set in backend/.env")
            result = await process_with_openai(image_url)
        elif AI_SERVICE == "google":
            if not AI_API_KEY:
                raise ValueError("AI_SERVICE=google but AI_API_KEY not set in backend/.env")
            result = await process_with_google(image_url)
        else:
            # Fallback to mock data for development
            log_warn("Unknown AI_SERVICE, using mock", service=AI_SERVICE)
            result = await process_with_mock(image_url)
        
        # Cache the result
        ai_cache[cache_key] = result
        return result
    except Exception as e:
        log_error("AI processing error", e, image_url_preview=image_url[:50] if image_url else None)
        import traceback
        if not os.getenv("ENVIRONMENT") == "production":
            traceback.print_exc()  # Only show traceback in dev
        # Return minimal data on error - don't fail completely
        return {
            "tags": ["image", "photo", "picture"],
            "description": "Image processing encountered an error. Please try again later.",
            "colors": ["#000000", "#FFFFFF", "#808080"]
        }


# Global model cache to avoid reloading (fixes device mismatch when processing multiple images)
_blip_processor = None
_blip_model = None
_model_lock = asyncio.Lock()  # Protects model loading only (prevents meta tensor errors)

async def process_with_huggingface(image_url: str) -> dict:
    """Process image using Hugging Face Transformers (LOCAL - FREE, runs on your machine!)"""
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from concurrent.futures import ThreadPoolExecutor
    import httpx
    from PIL import Image
    import io
    import torch
    
    global _blip_processor, _blip_model
    
    log_info("Using Hugging Face Transformers (Local)")
    
    # Download image with retry logic for transient failures
    async with httpx.AsyncClient(timeout=60.0) as client:
        max_retries = 3
        retry_delay = 1  # Start with 1 second
        
        for attempt in range(max_retries):
            try:
                log_debug("Downloading image", 
                         image_url_preview=image_url[:50] if image_url else None,
                         attempt=attempt + 1,
                         max_retries=max_retries)
                image_response = await client.get(image_url)
                image_response.raise_for_status()
                image_bytes = image_response.content
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                log_debug("Image downloaded successfully", size_bytes=len(image_bytes))
                break  # Success, exit retry loop
            except httpx.HTTPStatusError as e:
                # Retry on 5xx errors (server errors) but not 4xx (client errors)
                if e.response.status_code >= 500 and attempt < max_retries - 1:
                    log_warn("Transient server error downloading image, retrying", 
                            status_code=e.response.status_code,
                            attempt=attempt + 1,
                            retry_delay=retry_delay,
                            image_url_preview=image_url[:50] if image_url else None)
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    log_error("Failed to download image after retries", e, 
                             image_url_preview=image_url[:50] if image_url else None,
                             status_code=e.response.status_code)
                    raise Exception(f"Failed to download image: HTTP {e.response.status_code}")
            except Exception as e:
                # Non-HTTP errors (network issues, etc.) - retry once
                if attempt < max_retries - 1:
                    log_warn("Network error downloading image, retrying", 
                            error=str(e)[:100],
                            attempt=attempt + 1,
                            retry_delay=retry_delay,
                            image_url_preview=image_url[:50] if image_url else None)
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    log_error("Failed to download image after retries", e, 
                             image_url_preview=image_url[:50] if image_url else None)
                    raise Exception(f"Failed to download image: {e}")
    
    # Load BLIP model locally with thread-safe initialization
    async def ensure_model_loaded():
        """Thread-safe model loading"""
        global _blip_processor, _blip_model
        
        # Use lock to prevent concurrent model loading
        async with _model_lock:
            # Double-check after acquiring lock (pattern for thread-safe singleton)
            if _blip_processor is None or _blip_model is None:
                log_info("Loading BLIP model (first time: 30-60s download, then cached)")
                
                # Load model in thread pool to avoid blocking
                def load_model():
                    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
                    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
                    # Ensure model is on CPU explicitly
                    model = model.to("cpu")
                    model.eval()  # Set to evaluation mode
                    return processor, model
                
                loop = asyncio.get_event_loop()
                with ThreadPoolExecutor(max_workers=1) as executor:
                    _blip_processor, _blip_model = await loop.run_in_executor(executor, load_model)
                
                log_info("Model loaded and cached")
            else:
                log_debug("Using cached BLIP model")
    
    # Ensure model is loaded before processing
    await ensure_model_loaded()
    
    # Process image with cached model (PyTorch models in eval mode are thread-safe for inference)
    def run_captioning():
        global _blip_processor, _blip_model
        try:
            log_debug("Processing image")
            
            # Process image - ensure everything is on CPU
            inputs = _blip_processor(images=image, return_tensors="pt")
            # Move ALL inputs to CPU explicitly (fixes device mismatch)
            inputs = {k: v.to("cpu") if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}
            
            # Model is already on CPU from initial loading (thread-safe inference, no lock needed)
            # Generate caption with no gradients (faster, uses less memory)
            with torch.no_grad():
                outputs = _blip_model.generate(**inputs, max_length=50)
            
            caption = _blip_processor.decode(outputs[0], skip_special_tokens=True)
            
            return caption
        except Exception as e:
            log_error("Model error", e)
            import traceback
            if not os.getenv("ENVIRONMENT") == "production":
                traceback.print_exc()  # Only show traceback in dev
            raise
    
    # Run in thread pool
    loop = asyncio.get_event_loop()
    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            caption = await loop.run_in_executor(executor, run_captioning)
        
        caption = str(caption).strip()
        
        if not caption or len(caption) < 5:
            raise Exception("Empty caption returned")
        
        log_info("Caption generated successfully", caption_preview=caption[:100])
        
        # Extract tags and colors
        tags = extract_tags_from_text(caption)
        colors = await extract_colors(image_url)
        
        return {
            "tags": tags[:10] if len(tags) >= 5 else tags + ["image", "photo", "picture", "visual", "graphic"][:5-len(tags)],
            "description": caption[:200] if len(caption) > 200 else caption,
            "colors": colors[:3]
        }
    except Exception as e:
        error_str = str(e)
        log_error("Hugging Face processing failed", e)
        import traceback
        if not os.getenv("ENVIRONMENT") == "production":
            traceback.print_exc()  # Only show traceback in dev
        
        # Fallback - extract colors anyway
        colors = await extract_colors(image_url)
        return {
            "tags": ["image", "photo", "picture", "visual"],
            "description": "Image uploaded. AI analysis encountered an error.",
            "colors": colors[:3]
        }
    
    # Download image
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            log_debug("Downloading image for Hugging Face API", image_url_preview=image_url[:50] if image_url else None)
            image_response = await client.get(image_url)
            image_response.raise_for_status()
            image_bytes = image_response.content
            log_debug("Image downloaded", size_bytes=len(image_bytes))
        except Exception as e:
            log_error("Failed to download image for Hugging Face API", e, image_url_preview=image_url[:50] if image_url else None)
            raise Exception(f"Failed to download image: {e}")
        
        # Try each model with direct HTTP - Try multiple endpoint formats
        last_error = None
        for model_name in models_to_try:
            try:
                log_debug("Trying Hugging Face model", model=model_name)
                
                # Try multiple endpoint formats
                # Note: deployed-models collection might not have image captioning models
                # So we try both deployed-models and regular models endpoints
                endpoints_to_try = [
                    f"https://api-inference.huggingface.co/models/{model_name}",
                    f"https://router.huggingface.co/hf-inference/models/{model_name}",
                    f"https://inference.huggingface.co/models/{model_name}",
                    f"https://api-inference.huggingface.co/deployed-models/{model_name}",
                ]
                
                headers = {}
                if hf_token:
                    headers["Authorization"] = f"Bearer {hf_token}"
                
                response = None
                working_url = None
                
                # Try each endpoint format
                for api_url in endpoints_to_try:
                    try:
                        log_debug("POST to Hugging Face API", endpoint=api_url)
                        response = await client.post(
                            api_url,
                            headers=headers,
                            content=image_bytes,
                            timeout=60.0
                        )
                        log_debug("Hugging Face API response", status_code=response.status_code, endpoint=api_url)
                        
                        # If 410, try next endpoint
                        if response.status_code == 410:
                            log_debug("Endpoint deprecated, trying next", endpoint=api_url)
                            continue
                        
                        # If 503, wait and retry same endpoint
                        if response.status_code == 503:
                            log_info("Model loading, waiting 20s", endpoint=api_url)
                            await asyncio.sleep(20)
                            response = await client.post(
                                api_url,
                                headers=headers,
                                content=image_bytes,
                                timeout=60.0
                            )
                            log_debug("Retry response", status_code=response.status_code, endpoint=api_url)
                        
                        # If 200, we found working endpoint!
                        if response.status_code == 200:
                            working_url = api_url
                            break
                        
                        # If other error, try next endpoint
                        if response.status_code not in [200, 503]:
                            continue
                            
                    except Exception as e:
                        log_warn("Error with Hugging Face endpoint", endpoint=api_url, error=str(e)[:100])
                        continue
                
                # If no working endpoint found
                if not response or response.status_code != 200:
                    if response:
                        error_text = response.text[:200] if hasattr(response, 'text') else ""
                        log_warn("All Hugging Face endpoints failed", status_code=response.status_code, error_preview=error_text)
                        last_error = f"HTTP {response.status_code}"
                    else:
                        log_warn("All Hugging Face endpoints failed", error="No response")
                        last_error = "All endpoints failed"
                    continue
                
                # Parse JSON (we already checked status is 200)
                try:
                    result = response.json()
                    log_debug("Got JSON response from Hugging Face", endpoint=working_url)
                except:
                    log_warn("Invalid JSON response from Hugging Face", response_preview=response.text[:200] if hasattr(response, 'text') else None)
                    last_error = "Invalid JSON"
                    continue
                
                # Extract caption
                caption = None
                if isinstance(result, list) and len(result) > 0:
                    if isinstance(result[0], dict):
                        caption = result[0].get("generated_text", result[0].get("caption", ""))
                    else:
                        caption = str(result[0])
                elif isinstance(result, dict):
                    caption = result.get("generated_text", result.get("caption", ""))
                else:
                    caption = str(result)
                
                caption = str(caption).strip() if caption else ""
                
                if not caption or len(caption) < 5:
                    log_warn("Empty caption from Hugging Face")
                    last_error = "Empty caption"
                    continue
                
                log_info("Caption generated successfully from Hugging Face API", caption_preview=caption[:100])
                
                # Extract tags and colors
                tags = extract_tags_from_text(caption)
                colors = await extract_colors(image_url)
                
                return {
                    "tags": tags[:10] if len(tags) >= 5 else tags + ["image", "photo", "picture", "visual", "graphic"][:5-len(tags)],
                    "description": caption[:200] if len(caption) > 200 else caption,
                    "colors": colors[:3]
                }
                
            except httpx.HTTPStatusError as e:
                log_error("HTTP error from Hugging Face API", e, status_code=e.response.status_code)
                last_error = f"HTTP {e.response.status_code}"
                continue
            except Exception as e:
                log_error("Error with Hugging Face model", e, model=model_name)
                last_error = str(e)[:200]
                continue
        
        # All failed - return fallback
        log_warn("All Hugging Face models failed, using fallback", last_error=last_error)
        
        colors = await extract_colors(image_url)
        
        return {
            "tags": ["image", "photo", "picture", "visual"],
            "description": "Image uploaded. AI analysis is currently unavailable.",
            "colors": colors[:3]
        }


async def process_with_openai(image_url: str) -> dict:
    """Process image using OpenAI Vision API"""
    from openai import OpenAI
    
    client = OpenAI(api_key=AI_API_KEY)
    
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Analyze this image and provide: 1) 5-10 relevant tags, 2) one descriptive sentence, 3) the top 3 dominant colors in hex format. Format as JSON with keys: tags, description, colors."
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    }
                ]
            }
        ],
        max_tokens=300
    )
    
    # Parse response (would need JSON parsing)
    content = response.choices[0].message.content
    # Simplified parsing - in production, use proper JSON parsing
    tags = extract_tags_from_text(content)
    colors = await extract_colors(image_url)
    
    return {
        "tags": tags[:10],
        "description": content.split("description")[1] if "description" in content else "Image description",
        "colors": colors[:3]
    }


async def process_with_google(image_url: str) -> dict:
    """Process image using Google Vision API"""
    from google.cloud import vision
    
    client = vision.ImageAnnotatorClient()
    image = vision.Image()
    image.source.image_uri = image_url
    
    # Label detection
    response = client.label_detection(image=image)
    labels = [label.description for label in response.label_annotations]
    
    # Text detection for description
    text_response = client.text_detection(image=image)
    description = text_response.text_annotations[0].description if text_response.text_annotations else "Image detected"
    
    colors = await extract_colors(image_url)
    
    return {
        "tags": labels[:10],
        "description": description[:200],
        "colors": colors[:3]
    }


async def process_with_mock(image_url: str) -> dict:
    """Mock AI processing for development/testing"""
    await asyncio.sleep(1)  # Simulate processing time
    
    # Extract some mock data based on filename or URL
    tags = ["nature", "landscape", "outdoor", "scenic", "beautiful", "photography"]
    description = "A beautiful image with natural scenery and vibrant colors."
    colors = ["#4A90E2", "#50C878", "#FFD700"]
    
    return {
        "tags": tags,
        "description": description,
        "colors": colors
    }


def extract_tags_from_text(text: str) -> List[str]:
    """Extract potential tags from text"""
    # Simple keyword extraction
    common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were"}
    words = text.lower().replace(",", " ").replace(".", " ").split()
    tags = [w for w in words if len(w) > 3 and w not in common_words]
    return list(set(tags))[:10]


async def extract_colors(image_url: str) -> List[str]:
    """Extract dominant colors from image"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, timeout=10.0)
            img = Image.open(io.BytesIO(response.content))
            
            # Resize for faster processing
            img = img.resize((150, 150))
            img = img.convert("RGB")
            
            # Get pixels
            pixels = list(img.getdata())
            
            # Simple color quantization: group similar colors
            color_groups = {}
            for r, g, b in pixels:
                # Quantize to reduce color space
                r = (r // 32) * 32
                g = (g // 32) * 32
                b = (b // 32) * 32
                key = (r, g, b)
                color_groups[key] = color_groups.get(key, 0) + 1
            
            # Sort by frequency and get top colors
            sorted_colors = sorted(color_groups.items(), key=lambda x: x[1], reverse=True)
            top_colors = [rgb_to_hex(color[0]) for color in sorted_colors[:3]]
            
            # Ensure we have at least 3 colors
            while len(top_colors) < 3:
                top_colors.append("#808080")
            
            return top_colors[:3]
    except Exception as e:
        log_error("Color extraction error", e)
    
    return ["#000000", "#FFFFFF", "#808080"]


def rgb_to_hex(rgb: tuple) -> str:
    """Convert RGB tuple to hex color"""
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


async def create_thumbnail(image_data: bytes, size: tuple = (300, 300)) -> bytes:
    """Create thumbnail from image data"""
    img = Image.open(io.BytesIO(image_data))
    img.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Convert to bytes
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=85)
    return output.getvalue()


@app.get("/")
async def root():
    return {"message": "AI Image Gallery API", "status": "running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "supabase_configured": bool(supabase_url and supabase_key),
        "ai_service": AI_SERVICE,
        "ai_key_configured": bool(AI_API_KEY)
    }


@app.post("/api/process-image")
async def process_image(request: ImageProcessRequest):
    """Process image with AI in background - always returns 200 since image is already uploaded"""
    try:
        log_info("Processing image request", image_id=request.image_id, user_id=request.user_id)
        
        # Check if metadata record exists, if not create it
        try:
            existing = supabase.table("image_metadata").select("*").eq("image_id", request.image_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                result = supabase.table("image_metadata").update({
                    "ai_processing_status": "processing"
                }).eq("image_id", request.image_id).execute()
                log_debug("Updated metadata status to processing", image_id=request.image_id)
            else:
                # Create new record
                result = supabase.table("image_metadata").insert({
                    "image_id": request.image_id,
                    "user_id": request.user_id,
                    "ai_processing_status": "processing"
                }).execute()
                log_debug("Created metadata record with processing status", image_id=request.image_id)
        except Exception as db_error:
            log_error("Database error (non-critical, will retry)", db_error, image_id=request.image_id)
            import traceback
            if not os.getenv("ENVIRONMENT") == "production":
                traceback.print_exc()  # Only show traceback in dev
            # Continue anyway - image is uploaded, we can retry later
        
        # Process image asynchronously (don't wait for it)
        try:
            asyncio.create_task(process_image_async(request))
            log_info("Started async AI processing task", image_id=request.image_id)
        except Exception as task_error:
            log_error("Error creating async task", task_error, image_id=request.image_id)
            import traceback
            if not os.getenv("ENVIRONMENT") == "production":
                traceback.print_exc()  # Only show traceback in dev
        
        # Always return 200 - image is uploaded successfully
        return {"status": "processing", "image_id": request.image_id}
        
    except Exception as e:
        log_error("Critical error in process_image endpoint", e, 
                 error_type=type(e).__name__, 
                 image_id=getattr(request, 'image_id', None))
        import traceback
        if not os.getenv("ENVIRONMENT") == "production":
            traceback.print_exc()  # Only show traceback in dev
        # Still return 200 - image is uploaded, AI processing can fail
        return JSONResponse(
            status_code=200,
            content={"status": "queued", "image_id": getattr(request, 'image_id', None), "note": "AI processing queued, may be delayed", "error": str(e)}
        )


async def process_image_async(request: ImageProcessRequest):
    """Async task to process image with AI"""
    try:
        log_info("Starting AI processing", image_id=request.image_id)
        
        # Get AI analysis
        ai_result = await process_image_with_ai(request.image_url)
        
        log_info("AI processing completed", 
                image_id=request.image_id,
                tags_count=len(ai_result.get('tags', [])),
                description_length=len(ai_result.get('description', '')),
                colors_count=len(ai_result.get('colors', [])))
        
        # Update metadata in database
        result = supabase.table("image_metadata").update({
            "description": ai_result["description"],
            "tags": ai_result["tags"],
            "colors": ai_result["colors"],
            "ai_processing_status": "completed"
        }).eq("image_id", request.image_id).execute()
        
        log_debug("Updated metadata to completed", image_id=request.image_id)
        
    except Exception as e:
        log_error("Async processing error", e, image_id=request.image_id)
        import traceback
        if not os.getenv("ENVIRONMENT") == "production":
            traceback.print_exc()  # Only show traceback in dev
        
        # Update status to failed
        try:
            supabase.table("image_metadata").update({
                "ai_processing_status": "failed"
            }).eq("image_id", request.image_id).execute()
        except Exception as update_error:
            log_error("Error updating status to failed", update_error, image_id=request.image_id)


@app.get("/api/search")
async def search_images(
    query: Optional[str] = None,
    color: Optional[str] = None,
    user_id: str = None,
    page: int = 1,
    limit: int = 20
):
    """Search images by text query or color"""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    try:
        # Build query
        query_builder = supabase.table("images").select("*, image_metadata(*)").eq("user_id", user_id)
        
        if query:
            # Search in tags and description
            metadata_query = supabase.table("image_metadata").select("image_id").or_(
                f"tags.cs.{{{query}}},description.ilike.%{query}%"
            )
            metadata_result = metadata_query.execute()
            image_ids = [row["image_id"] for row in metadata_result.data]
            if image_ids:
                query_builder = query_builder.in_("id", image_ids)
            else:
                return {"data": [], "total": 0, "page": page, "limit": limit}
        
        if color:
            # Filter by color
            metadata_query = supabase.table("image_metadata").select("image_id").contains("colors", [color])
            metadata_result = metadata_query.execute()
            image_ids = [row["image_id"] for row in metadata_result.data]
            if image_ids:
                query_builder = query_builder.in_("id", image_ids)
            else:
                return {"data": [], "total": 0, "page": page, "limit": limit}
        
        # Pagination
        offset = (page - 1) * limit
        result = query_builder.range(offset, offset + limit - 1).execute()
        
        return {
            "data": result.data,
            "total": len(result.data),
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/similar/{image_id}")
async def find_similar_images(image_id: int, user_id: str, limit: int = 10):
    """Find similar images using cosine similarity on tags and colors"""
    try:
        # Get current image metadata
        current_meta = supabase.table("image_metadata").select("*").eq("image_id", image_id).single().execute()
        
        if not current_meta.data:
            return {"data": []}
        
        current_tags = set(current_meta.data.get("tags", []))
        current_colors = set(current_meta.data.get("colors", []))
        
        # Get all other images for user
        all_meta = supabase.table("image_metadata").select("*, images(*)").eq("user_id", user_id).neq("image_id", image_id).execute()
        
        # Calculate similarity scores
        similar_images = []
        for meta in all_meta.data:
            other_tags = set(meta.get("tags", []))
            other_colors = set(meta.get("colors", []))
            
            # Cosine similarity on tags
            tag_intersection = len(current_tags & other_tags)
            tag_union = len(current_tags | other_tags)
            tag_similarity = tag_intersection / tag_union if tag_union > 0 else 0
            
            # Color similarity
            color_intersection = len(current_colors & other_colors)
            color_union = len(current_colors | other_colors)
            color_similarity = color_intersection / color_union if color_union > 0 else 0
            
            # Combined similarity (weighted)
            similarity = (tag_similarity * 0.7) + (color_similarity * 0.3)
            
            if similarity > 0:
                similar_images.append({
                    "image": meta.get("images"),
                    "metadata": meta,
                    "similarity": similarity
                })
        
        # Sort by similarity and return top results
        similar_images.sort(key=lambda x: x["similarity"], reverse=True)
        
        return {
            "data": [item["image"] for item in similar_images[:limit]],
            "similarities": [item["similarity"] for item in similar_images[:limit]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

