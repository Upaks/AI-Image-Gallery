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

load_dotenv()

app = FastAPI(title="AI Image Gallery API")

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"=== VALIDATION ERROR ===")
    print(f"Request path: {request.url}")
    print(f"Request body: {await request.body()}")
    print(f"Validation errors: {exc.errors()}")
    print("=== END VALIDATION ERROR ===")
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
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables")
    print("Please check your backend/.env file")
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables")

try:
    supabase: Client = create_client(supabase_url, supabase_key)
    print(f"✓ Supabase client initialized with URL: {supabase_url[:30]}...")
except Exception as e:
    print(f"ERROR: Failed to initialize Supabase client: {e}")
    raise

# AI Service Configuration
AI_SERVICE = os.getenv("AI_SERVICE", "replicate")  # replicate (FREE TIER!), huggingface, openai, or google
AI_API_KEY = os.getenv("AI_API_KEY")  # For Replicate: get free token from replicate.com

print(f"AI Service: {AI_SERVICE}")
print(f"AI API Key configured: {'Yes' if AI_API_KEY else 'No'}")
if AI_API_KEY:
    print(f"AI API Key (first 10 chars): {AI_API_KEY[:10]}...")

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
        if AI_SERVICE == "replicate":
            # Replicate has FREE TIER - perfect for job applications! No server needed!
            if not AI_API_KEY:
                print("⚠️ No Replicate API key - using fallback")
                result = await process_with_mock(image_url)
            else:
                result = await process_with_replicate(image_url)
        elif AI_SERVICE == "huggingface":
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
            print(f"Unknown AI_SERVICE: {AI_SERVICE}, using mock")
            result = await process_with_mock(image_url)
        
        # Cache the result
        ai_cache[cache_key] = result
        return result
    except Exception as e:
        print(f"AI processing error: {e}")
        import traceback
        traceback.print_exc()
        # Return minimal data on error - don't fail completely
        return {
            "tags": ["image", "photo", "picture"],
            "description": "Image processing encountered an error. Please try again later.",
            "colors": ["#000000", "#FFFFFF", "#808080"]
        }


async def process_with_replicate(image_url: str) -> dict:
    """Process image using Replicate API with rate limit handling"""
    import replicate
    
    if not AI_API_KEY:
        raise ValueError("AI_API_KEY not set in environment variables")
    
    print(f"Using Replicate API with key: {AI_API_KEY[:10]}...")
    
    # Set the API token for replicate module
    os.environ["REPLICATE_API_TOKEN"] = AI_API_KEY
    
    print(f"Calling Replicate API with image: {image_url[:50]}...")
    
    # Try models in order - using replicate.run() directly (module-level function)
    # Using models that are confirmed to exist (from your screenshots and logs)
    # Models that return 404 are excluded - models that return 429 DO exist and will work after retry
    models_to_try = [
        # Model 1: lucataco/moondream2 - Fast and efficient (4M runs) - CONFIRMED EXISTS (returns 429, not 404)
        {
            "name": "lucataco/moondream2",
            "input": {
                "prompt": "Describe this image. List objects, colors, and scene details.",
                "image": image_url
            },
            "description": "Moondream2 - Fast vision model (confirmed working)"
        },
        # Model 2: andreasjansson/blip-2 - Question answering (30M runs) - CONFIRMED EXISTS (returns 429, not 404)
        {
            "name": "andreasjansson/blip-2",
            "input": {
                "image": image_url,
                "question": "What is in this image? Describe it and list relevant tags."
            },
            "description": "BLIP-2 - Question answering (confirmed working)"
        }
    ]
    
    last_error = None
    for model_config in models_to_try:
        try:
            model_name = model_config["name"]
            model_input = model_config["input"]
            print(f"Trying model: {model_name} ({model_config.get('description', 'N/A')})")
            print(f"Model input keys: {list(model_input.keys())}")
            
            # Use replicate.run() directly - more reliable than client instance
            output = replicate.run(
                model_name,
                input=model_input
            )
            
            # Wait for the prediction to complete if it's async
            if hasattr(output, 'status'):
                # It's a prediction object, wait for completion
                while output.status not in ["succeeded", "failed", "canceled"]:
                    await asyncio.sleep(1)
                    output.reload()
                
                if output.status == "succeeded":
                    output = output.output
                else:
                    raise Exception(f"Prediction {output.status}: {output.error}")
            
            print(f"Replicate API response type: {type(output)}")
            print(f"Replicate API response preview: {str(output)[:200]}...")
            
            # Handle different output formats
            if isinstance(output, str):
                caption = output
            elif isinstance(output, list):
                caption = " ".join(str(item) for item in output)
            elif isinstance(output, dict):
                caption = output.get("caption", output.get("description", output.get("prompt", output.get("output", str(output)))))
            else:
                caption = str(output)
            
            print(f"Extracted caption: {caption[:100]}...")
            
            # Extract tags from caption
            tags = extract_tags_from_text(caption)
            print(f"Extracted tags: {tags}")
            
            # Get colors using image processing
            colors = await extract_colors(image_url)
            print(f"Extracted colors: {colors}")
            
            return {
                "tags": tags[:10] if len(tags) >= 5 else tags + ["image", "photo", "picture", "visual", "graphic"][:5-len(tags)],
                "description": caption[:200] if len(caption) > 200 else caption,
                "colors": colors[:3]
            }
            
        except replicate.exceptions.ReplicateError as e:
            error_detail = str(e)
            print(f"Replicate error with {model_config['name']}: {error_detail}")
            
            # Handle rate limiting (429) - CRITICAL: Free tier allows only 1 request at a time
            # Free tier: 6 requests/minute with burst of 1 = wait at least 60+ seconds
            if "429" in error_detail or "throttled" in error_detail.lower() or "rate limit" in error_detail.lower():
                # Extract wait time from error message
                wait_time = 70  # Default: wait 70 seconds (more than 1 minute)
                try:
                    import re
                    # Try to extract time from message like "resets in ~10s" or "resets in 10s"
                    match = re.search(r'resets in.*?(?:~)?(\d+)s', error_detail, re.IGNORECASE)
                    if match:
                        extracted_time = int(match.group(1))
                        wait_time = extracted_time + 15  # Add 15 second buffer
                        print(f"   Extracted wait time from error: {extracted_time}s, waiting {wait_time}s total")
                    else:
                        print(f"   Could not extract wait time, using default {wait_time}s")
                except Exception as parse_error:
                    print(f"   Error parsing wait time: {parse_error}, using default {wait_time}s")
                
                print(f"⚠️ Rate limited (429). Free tier: 6 requests/minute. Waiting {wait_time} seconds...")
                print(f"   If this keeps happening, add a payment method: https://replicate.com/account/billing")
                await asyncio.sleep(wait_time)
                
                # NOW RETRY this model after waiting (don't skip it!)
                print(f"✅ Rate limit wait complete. Retrying model: {model_config['name']}")
                try:
                    retry_output = replicate.run(
                        model_config["name"],
                        input=model_config["input"]
                    )
                    
                    # Wait for completion if async
                    if hasattr(retry_output, 'status'):
                        while retry_output.status not in ["succeeded", "failed", "canceled"]:
                            await asyncio.sleep(1)
                            retry_output.reload()
                        if retry_output.status == "succeeded":
                            retry_output = retry_output.output
                        else:
                            raise Exception(f"Prediction {retry_output.status}: {retry_output.error}")
                    
                    # Process successful output
                    if isinstance(retry_output, str):
                        caption = retry_output
                    elif isinstance(retry_output, list):
                        caption = " ".join(str(item) for item in retry_output)
                    elif isinstance(retry_output, dict):
                        caption = retry_output.get("caption", retry_output.get("description", retry_output.get("prompt", retry_output.get("output", str(retry_output)))))
                    else:
                        caption = str(retry_output)
                    
                    print(f"✅ SUCCESS! Model {model_config['name']} returned result after rate limit wait")
                    print(f"Extracted caption: {caption[:100]}...")
                    
                    tags = extract_tags_from_text(caption)
                    colors = await extract_colors(image_url)
                    
                    return {
                        "tags": tags[:10] if len(tags) >= 5 else tags + ["image", "photo", "picture", "visual", "graphic"][:5-len(tags)],
                        "description": caption[:200] if len(caption) > 200 else caption,
                        "colors": colors[:3]
                    }
                except Exception as retry_error:
                    # Retry also failed, log and continue to next model
                    last_error = retry_error
                    error_str = str(retry_error)
                    print(f"❌ Retry after rate limit wait failed: {retry_error}")
                    # If it's another rate limit, wait even longer
                    if "429" in error_str or "throttled" in error_str.lower():
                        print(f"   Still rate limited - this account may need a payment method")
                    print(f"   Moving to next model...")
                    continue
            
            # 404 or other errors - try next model
            elif "404" in error_detail or "not found" in error_detail.lower():
                last_error = e
                print(f"Model {model_config['name']} not found, trying next...")
                continue
            else:
                last_error = e
                continue
                
        except Exception as e:
            last_error = e
            print(f"Error with {model_config['name']}: {e}")
            continue
    
    # All models failed - provide helpful error message
    error_msg = "❌ All Replicate models failed. "
    if last_error:
        error_str = str(last_error)
        if "404" in error_str or "not found" in error_str.lower():
            error_msg += "\n\n🔍 Models not found (404). Possible causes:\n"
            error_msg += "1. Model names may be incorrect\n"
            error_msg += "2. Your Replicate account may not have access\n"
            error_msg += "3. Models may have been removed/changed\n\n"
            error_msg += "✅ SOLUTION:\n"
            error_msg += "1. Visit: https://replicate.com/explore\n"
            error_msg += "2. Search for 'image captioning', 'vision', 'blip', or 'llava'\n"
            error_msg += "3. Find a working model name (format: 'owner/model-name')\n"
            error_msg += "4. Update backend/main.py line 138 with correct model name\n"
            error_msg += "5. Or check: https://replicate.com/collections/try-for-free\n"
            error_msg += "   (Note: Try for Free focuses on generation, not captioning)\n"
        elif "429" in error_str or "rate limit" in error_str.lower():
            error_msg += "\n\n⚠️ Rate limited (429).\n"
            error_msg += "Free tier: 6 requests/minute with burst of 1\n"
            error_msg += "Wait 60 seconds and try again.\n"
            error_msg += "Add payment method to increase limits: https://replicate.com/account/billing"
        elif "401" in error_str or "403" in error_str:
            error_msg += "\n\n❌ Authentication failed.\n"
            error_msg += "Check your Replicate API key in backend/.env\n"
            error_msg += "Get key from: https://replicate.com/account/api-tokens"
        else:
            error_msg += f"\n\nLast error: {last_error}"
    else:
        error_msg += "Unknown error occurred."
    
    print("\n" + "="*60)
    print("REPLICATE API FAILED")
    print("="*60)
    print(error_msg)
    print("="*60 + "\n")
    raise Exception(error_msg)


# Global model cache to avoid reloading
_blip_processor = None
_blip_model = None

# Global model cache to avoid reloading (fixes device mismatch when processing multiple images)
_blip_processor = None
_blip_model = None
_model_lock = asyncio.Lock()

async def process_with_huggingface(image_url: str) -> dict:
    """Process image using Hugging Face Transformers (LOCAL - FREE, runs on your machine!)"""
    from transformers import BlipProcessor, BlipForConditionalGeneration
    from concurrent.futures import ThreadPoolExecutor
    import httpx
    from PIL import Image
    import io
    import torch
    
    global _blip_processor, _blip_model
    
    print(f"🔵 Using Hugging Face Transformers (Local - FREE, runs on your machine)")
    
    # Download image
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            print(f"📥 Downloading image...")
            image_response = await client.get(image_url)
            image_response.raise_for_status()
            image_bytes = image_response.content
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            print(f"✓ Image downloaded: {len(image_bytes)} bytes")
        except Exception as e:
            print(f"❌ Failed to download image: {e}")
            raise Exception(f"Failed to download image: {e}")
    
    # Load BLIP model locally (FREE - runs on your computer, no server costs!)
    # Cache model to avoid reloading for each request
    def run_captioning():
        global _blip_processor, _blip_model
        try:
            # Load model once, cache it
            if _blip_processor is None or _blip_model is None:
                print(f"📦 Loading BLIP model (first time: 30-60s download, then cached)...")
                _blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
                _blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
                # Ensure model is on CPU explicitly
                _blip_model = _blip_model.to("cpu")
                _blip_model.eval()  # Set to evaluation mode
                print(f"✓ Model loaded and cached")
            else:
                print(f"📦 Using cached BLIP model")
            
            print(f"🖼️ Processing image...")
            # Process image - ensure everything is on CPU
            inputs = _blip_processor(images=image, return_tensors="pt")
            # Move ALL inputs to CPU explicitly (fixes device mismatch)
            inputs = {k: v.to("cpu") if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}
            
            # Ensure model is on CPU (double-check)
            _blip_model = _blip_model.to("cpu")
            
            # Generate caption with no gradients (faster, uses less memory)
            with torch.no_grad():
                outputs = _blip_model.generate(**inputs, max_length=50)
            
            caption = _blip_processor.decode(outputs[0], skip_special_tokens=True)
            
            return caption
        except Exception as e:
            print(f"❌ Model error: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    # Run in thread pool
    loop = asyncio.get_event_loop()
    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            caption = await loop.run_in_executor(executor, run_captioning)
        
        caption = str(caption).strip()
        
        if not caption or len(caption) < 5:
            raise Exception("Empty caption returned")
        
        print(f"✅ SUCCESS! Caption: {caption[:100]}...")
        
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
        print(f"❌ Failed: {error_str}")
        import traceback
        traceback.print_exc()
        
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
            print(f"📥 Downloading image...")
            image_response = await client.get(image_url)
            image_response.raise_for_status()
            image_bytes = image_response.content
            print(f"✓ Image downloaded: {len(image_bytes)} bytes")
        except Exception as e:
            print(f"❌ Failed to download image: {e}")
            raise Exception(f"Failed to download image: {e}")
        
        # Try each model with direct HTTP - Try multiple endpoint formats
        last_error = None
        for model_name in models_to_try:
            try:
                print(f"\n🔍 Trying model: {model_name}")
                
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
                        print(f"📤 POST to: {api_url}")
                        response = await client.post(
                            api_url,
                            headers=headers,
                            content=image_bytes,
                            timeout=60.0
                        )
                        print(f"📥 Response: {response.status_code}")
                        
                        # If 410, try next endpoint
                        if response.status_code == 410:
                            print(f"⚠️ Endpoint deprecated, trying next...")
                            continue
                        
                        # If 503, wait and retry same endpoint
                        if response.status_code == 503:
                            print(f"⏳ Model loading, waiting 20s...")
                            await asyncio.sleep(20)
                            response = await client.post(
                                api_url,
                                headers=headers,
                                content=image_bytes,
                                timeout=60.0
                            )
                            print(f"📥 Retry: {response.status_code}")
                        
                        # If 200, we found working endpoint!
                        if response.status_code == 200:
                            working_url = api_url
                            break
                        
                        # If other error, try next endpoint
                        if response.status_code not in [200, 503]:
                            continue
                            
                    except Exception as e:
                        print(f"⚠️ Error with {api_url}: {str(e)[:100]}")
                        continue
                
                # If no working endpoint found
                if not response or response.status_code != 200:
                    if response:
                        error_text = response.text[:200] if hasattr(response, 'text') else ""
                        print(f"❌ All endpoints failed. Last: HTTP {response.status_code}: {error_text}")
                        last_error = f"HTTP {response.status_code}"
                    else:
                        print(f"❌ All endpoints failed")
                        last_error = "All endpoints failed"
                    continue
                
                # Parse JSON (we already checked status is 200)
                try:
                    result = response.json()
                    print(f"✓ Got JSON from {working_url}")
                except:
                    print(f"⚠️ Not JSON: {response.text[:200]}")
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
                    print(f"⚠️ Empty caption")
                    last_error = "Empty caption"
                    continue
                
                print(f"✅ SUCCESS! Caption: {caption[:100]}...")
                
                # Extract tags and colors
                tags = extract_tags_from_text(caption)
                colors = await extract_colors(image_url)
                
                return {
                    "tags": tags[:10] if len(tags) >= 5 else tags + ["image", "photo", "picture", "visual", "graphic"][:5-len(tags)],
                    "description": caption[:200] if len(caption) > 200 else caption,
                    "colors": colors[:3]
                }
                
            except httpx.HTTPStatusError as e:
                print(f"❌ HTTP error: {e.response.status_code}")
                last_error = f"HTTP {e.response.status_code}"
                continue
            except Exception as e:
                print(f"❌ Error: {str(e)[:200]}")
                last_error = str(e)[:200]
                continue
        
        # All failed - return fallback
        print(f"\n{'='*60}")
        print("⚠️ ALL MODELS FAILED - Using fallback")
        print(f"Last error: {last_error}")
        print("="*60 + "\n")
        
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
        print(f"Color extraction error: {e}")
    
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
        print(f"=== PROCESS IMAGE REQUEST ===")
        print(f"Image ID: {request.image_id}")
        print(f"User ID: {request.user_id}")
        print(f"Image URL: {request.image_url[:50]}...")
        
        # Check if metadata record exists, if not create it
        try:
            existing = supabase.table("image_metadata").select("*").eq("image_id", request.image_id).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                result = supabase.table("image_metadata").update({
                    "ai_processing_status": "processing"
                }).eq("image_id", request.image_id).execute()
                print(f"Updated metadata status to processing: {result}")
            else:
                # Create new record
                result = supabase.table("image_metadata").insert({
                    "image_id": request.image_id,
                    "user_id": request.user_id,
                    "ai_processing_status": "processing"
                }).execute()
                print(f"Created metadata record with processing status: {result}")
        except Exception as db_error:
            print(f"Database error (non-critical, will retry): {db_error}")
            import traceback
            traceback.print_exc()
            # Continue anyway - image is uploaded, we can retry later
        
        # Process image asynchronously (don't wait for it)
        try:
            asyncio.create_task(process_image_async(request))
            print(f"Started async AI processing task for image_id: {request.image_id}")
        except Exception as task_error:
            print(f"Error creating async task: {task_error}")
            import traceback
            traceback.print_exc()
        
        # Always return 200 - image is uploaded successfully
        return {"status": "processing", "image_id": request.image_id}
        
    except Exception as e:
        print(f"=== CRITICAL ERROR in process_image endpoint ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        print("=== END ERROR ===")
        # Still return 200 - image is uploaded, AI processing can fail
        return JSONResponse(
            status_code=200,
            content={"status": "queued", "image_id": getattr(request, 'image_id', None), "note": "AI processing queued, may be delayed", "error": str(e)}
        )


async def process_image_async(request: ImageProcessRequest):
    """Async task to process image with AI"""
    try:
        print(f"Starting AI processing for image_id: {request.image_id}, URL: {request.image_url}")
        
        # Get AI analysis
        ai_result = await process_image_with_ai(request.image_url)
        
        print(f"AI processing completed for image_id: {request.image_id}")
        print(f"Result: tags={len(ai_result.get('tags', []))}, description length={len(ai_result.get('description', ''))}, colors={len(ai_result.get('colors', []))}")
        
        # Update metadata in database
        result = supabase.table("image_metadata").update({
            "description": ai_result["description"],
            "tags": ai_result["tags"],
            "colors": ai_result["colors"],
            "ai_processing_status": "completed"
        }).eq("image_id", request.image_id).execute()
        
        print(f"Updated metadata to completed: {result}")
        
    except Exception as e:
        print(f"Async processing error for image_id {request.image_id}: {e}")
        import traceback
        traceback.print_exc()
        
        # Update status to failed
        try:
            supabase.table("image_metadata").update({
                "ai_processing_status": "failed"
            }).eq("image_id", request.image_id).execute()
        except Exception as update_error:
            print(f"Error updating status to failed: {update_error}")


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

