# AI Image Gallery

A production-ready, full-stack web application where users can upload images, get automatic AI-generated tags and descriptions, and intelligently search through their images using text queries or visual similarity. Built with modern best practices, comprehensive error handling, and enterprise-grade security.

**Live Demo**: [Frontend](https://ai-image-gallery-sable.vercel.app) | [Backend API](https://upaks-ai-image-gallery-api.hf.space)

**Demo Video**: [Watch Full Walkthrough](https://www.loom.com/share/539d3751845847b6b61c6ff01ce53dfc)

---

## 🎯 Project Overview

This application demonstrates a complete image management system with AI-powered analysis capabilities. Users can upload multiple images, receive automatic AI-generated metadata (tags, descriptions, and color extraction), and search their collection using natural language or visual similarity.

---

## ✨ Features

### Core Functionality (All Requirements Met ✅)

#### 1️⃣ Authentication
- **Supabase Auth** with email/password authentication
- Secure sign up and sign in pages
- Protected routes (gallery only accessible when authenticated)
- Row Level Security (RLS) ensures complete user data isolation
- Persistent session management
- Logout functionality

#### 2️⃣ Image Management
- **Drag & drop** or click to upload multiple images
- Support for **JPEG and PNG** formats
- Automatic **thumbnail generation** (300x300px, client-side)
- Store both original and thumbnail images in Supabase Storage
- Real-time upload progress indicators
- Responsive image grid view with pagination (20 images per page)
- Image download functionality

#### 3️⃣ AI Analysis
- **Automatic AI-generated tags** (5-10 relevant tags per image)
- **Descriptive sentence generation** (one contextual sentence)
- **Dominant color extraction** (top 3 colors with hex codes)
- **Asynchronous background processing** (non-blocking uploads)
- Processing status indicators with real-time updates
- Graceful error handling with fallback data

#### 4️⃣ Search Features
- **Text Search**: Search by tags or description with instant results
- **Similar Images**: Find visually similar images using cosine similarity on tags and colors
- **Color Filter**: Click any color to find images with similar dominant colors
- Results update without page reload
- Search only within user's own images (RLS enforced)
- Export search results as JSON

#### 5️⃣ Frontend Requirements
- Clean, modern UI with **Tailwind CSS**
- Fully responsive design (mobile, tablet, desktop)
- **Loading states**: Skeleton screens and spinners during processing
- **Error states**: User-friendly error messages
- **User menu**: Display email and logout option
- Smooth interactions and animations

#### 6️⃣ Technical Requirements
- **Supabase** for auth, database, and storage
- Images processed asynchronously in background
- Graceful error handling (AI failures don't break upload)
- **Pagination**: 20 images per page with "Load More"
- In-memory caching of AI results
- **Row Level Security (RLS)** for multi-tenant data isolation
- Structured logging (production-ready)

### ⚡ Bonus Features (All Implemented ✅)

- ✅ **Deployed to free hosting**: Vercel (frontend) + Hugging Face Spaces (backend)
- ✅ **Image download feature**: Download original images with cross-origin handling
- ✅ **Tag editing**: Add, remove, and edit tags with inline UI and persistence
- ✅ **Dark mode toggle**: System preference detection with manual toggle
- ✅ **Export search results as JSON**: Export all matching results with metadata
- ✅ **Unit tests**: Comprehensive test suite (37 tests) with Vitest

---

## 🏗️ Architecture Decisions

### Technology Stack

#### Frontend
- **React 18.2** - Modern UI library with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Lucide React** - Modern icon library
- **Axios** - HTTP client for API calls

**Why this stack?**
- React provides component reusability and state management
- Vite offers fast hot module replacement and optimized builds
- Tailwind CSS enables rapid UI development with consistent design
- React Router handles navigation without page reloads

#### Backend
- **FastAPI** - Modern, fast Python web framework
- **Uvicorn** - ASGI server with async support
- **Supabase Python Client** - Official Python SDK
- **Hugging Face Transformers** - Local AI model execution
- **PIL (Pillow)** - Image processing and color extraction

**Why FastAPI?**
- Built-in async/await support for concurrent processing
- Automatic API documentation (OpenAPI/Swagger)
- Type validation with Pydantic
- High performance for I/O-bound operations
- Easy integration with async AI model loading

#### Database & Storage
- **Supabase (PostgreSQL)** - Managed PostgreSQL database
- **Row Level Security (RLS)** - Database-level security
- **Supabase Storage** - S3-compatible object storage

**Why Supabase?**
- Integrated auth, database, and storage
- Real-time capabilities (not used but available)
- Generous free tier
- PostgreSQL with RLS provides strong security
- No vendor lock-in (standard PostgreSQL)

#### AI Service
- **Hugging Face Transformers** - Local BLIP model execution
- **Model**: `Salesforce/blip-image-captioning-base`
- **Color Extraction**: PIL-based server-side processing

**Why Hugging Face Local Models?**
- **FREE** - No API costs or per-image charges
- **Privacy** - Images never leave your server
- **Control** - Full control over model selection and processing
- **Scalability** - No rate limits or quotas
- **Cost-effective** - Scales without additional costs

See [AI_SERVICE_COMPARISON.md](./AI_SERVICE_COMPARISON.md) for detailed analysis of alternatives.

### System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │──────▶│   Vercel     │──────▶│  Supabase   │
│  (React)    │◀──────│  (Frontend)  │◀──────│   (Auth/DB) │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       │              │   Hugging    │
       │              │ Face Spaces  │
       │              │  (Backend)   │
       └──────────────▶│  (FastAPI)   │
                      └──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │ BLIP Model   │
                      │ (Local CPU)  │
                      └──────────────┘
```

### Key Design Decisions

1. **Asynchronous AI Processing**
   - Images upload immediately, processing happens in background
   - Users see images instantly with "processing" status
   - Non-blocking architecture improves UX

2. **Client-Side Thumbnail Generation**
   - Reduces upload time and storage costs
   - Better user experience (instant preview)
   - Leverages browser capabilities

3. **Row Level Security (RLS)**
   - Database-level security, not application-level
   - Impossible to bypass even with direct DB access
   - Zero-trust architecture

4. **In-Memory Caching**
   - Avoids re-processing same images
   - Improves performance for repeated requests
   - Simple implementation for MVP

5. **Structured Logging**
   - Production-ready logging system
   - No sensitive data exposure
   - Environment-aware (debug logs disabled in production)

6. **Thread-Safe Model Loading**
   - Prevents race conditions during concurrent uploads
   - Uses asyncio.Lock for safe initialization
   - Enables parallel inference after initial load

---

## 📋 Setup Instructions

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.9+**
- **Supabase account** (free tier works)
- **Git** (for cloning repository)

### Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/AI-Image-Gallery.git
cd AI-Image-Gallery
```

### Step 2: Install Dependencies

#### Frontend Dependencies

```bash
npm install
```

This installs:
- React, React DOM, React Router
- Tailwind CSS and PostCSS
- Axios for API calls
- Lucide React for icons
- Vitest for testing

#### Backend Dependencies

```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

This installs:
- FastAPI and Uvicorn
- Supabase Python client
- Hugging Face Transformers
- Pillow for image processing
- And other dependencies

### Step 3: Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose a name, database password, and region
   - Wait for project initialization (~2 minutes)

2. **Run Database Schema**
   - Go to **SQL Editor** in your Supabase project
   - Click "New Query"
   - Copy and paste contents of `database/schema.sql`
   - Click "Run" to execute the schema
   - Verify tables are created: `images` and `image_metadata`

3. **Set Up Storage Bucket**
   - Go to **Storage** in your Supabase project
   - Click "New bucket"
   - Name: `images`
   - **Make it public** (check "Public bucket")
   - Click "Create bucket"

4. **Set Up Storage Policies**
   - In your `images` bucket, go to **Policies** tab
   - Click "New Policy"
   - Use the policy templates or see `database/storage-policies.sql`
   - Create policies for SELECT, INSERT, UPDATE, DELETE
   - Ensure all policies use `auth.uid() = user_id` for user isolation

5. **Get API Keys**
   - Go to **Settings** → **API**
   - Copy the following:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)
     - **service_role key** (starts with `eyJ...`) - Keep this secret!

### Step 4: Configure Environment Variables

#### Frontend Environment Variables

Create `.env` file in the **root** directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE_URL=http://localhost:8000
```

**Where to find these values:**
- `VITE_SUPABASE_URL`: Supabase → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase → Settings → API → anon public key
- `VITE_API_BASE_URL`: Local backend URL (development only)

#### Backend Environment Variables

Create `.env` file in the `backend/` directory:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
AI_SERVICE=huggingface
FRONTEND_URL=http://localhost:3000
PORT=8000
```

**Where to find these values:**
- `SUPABASE_URL`: Supabase → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase → Settings → API → service_role key (secret!)
- `AI_SERVICE`: Set to `huggingface` for local models
- `FRONTEND_URL`: Local frontend URL (for CORS)
- `PORT`: Backend port (optional, defaults to 8000)

**⚠️ Important**: Never commit `.env` files to Git! They're already in `.gitignore`.

### Step 5: Run the Application

#### Terminal 1 - Start Backend

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload
```

Backend will start at `http://localhost:8000`

**First-time model download:**
- BLIP model (~1.5GB) will download automatically
- Takes 5-10 minutes on first request
- Subsequent requests use cached model

#### Terminal 2 - Start Frontend

```bash
npm run dev
```

Frontend will start at `http://localhost:3000`

### Step 6: Verify Installation

1. Open `http://localhost:3000` in your browser
2. Sign up with a new account
3. Upload a test image
4. Wait for AI processing (first image may take 5-10 minutes)
5. Verify tags, description, and colors appear

---

## 🔑 API Keys & Configuration

### Required API Keys

| Service | Key Name | Where to Find | Required For |
|---------|----------|---------------|--------------|
| Supabase | `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | Frontend (Auth, DB, Storage) |
| Supabase | `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key | Frontend (Auth, DB, Storage) |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Backend (DB writes, admin) |

### Environment Variables Summary

**Frontend** (`.env` in root):
```env
VITE_SUPABASE_URL=          # Required
VITE_SUPABASE_ANON_KEY=     # Required
VITE_API_BASE_URL=          # Optional (defaults to empty string for local)
```

**Backend** (`backend/.env`):
```env
SUPABASE_URL=               # Required
SUPABASE_SERVICE_ROLE_KEY=  # Required
AI_SERVICE=huggingface      # Required (options: huggingface, openai, google)
FRONTEND_URL=               # Optional (for CORS, defaults to localhost:3000)
PORT=                       # Optional (defaults to 8000)
```

### Security Notes

- ✅ **Never commit `.env` files** - They're in `.gitignore`
- ✅ **Use `anon` key for frontend** - Limited permissions, safe to expose
- ✅ **Keep `service_role` key secret** - Full database access, backend only
- ✅ **RLS protects data** - Even with service_role key, RLS policies enforce user isolation

---

## 🧪 Testing

### Unit Tests

Run the test suite:

```bash
npm test
```

**Test Coverage:**
- `src/tests/utils/imageUtils.test.js` - Image validation and processing (12 tests)
- `src/tests/utils/searchUtils.test.js` - Search and filtering logic (25 tests)
- **Total: 37 tests** - All passing ✅

### Manual Testing Checklist

- [x] Sign up with new account
- [x] Sign in with existing account
- [x] Upload single image
- [x] Upload multiple images (drag & drop)
- [x] Verify AI processing completes (tags, description, colors)
- [x] Search by text query
- [x] Filter by color
- [x] Find similar images
- [x] View image modal with metadata
- [x] Download image
- [x] Edit tags (add/remove)
- [x] Toggle dark mode
- [x] Export search results as JSON
- [x] Logout and verify images are inaccessible
- [x] Test on mobile device
- [x] Test pagination (Load More)
- [x] Test error handling (network errors, AI failures)

---

## 📦 Project Structure

```
ai-image-gallery/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── ImageUpload.jsx      # Drag & drop upload zone
│   │   ├── ImageGrid.jsx        # Gallery grid with thumbnails
│   │   ├── ImageModal.jsx       # Image detail modal (download, tag editing)
│   │   ├── SearchBar.jsx        # Search input component
│   │   └── UserMenu.jsx         # User menu (email, dark mode, logout)
│   ├── pages/                    # Page components
│   │   ├── SignIn.jsx           # Sign in page
│   │   ├── SignUp.jsx           # Sign up page
│   │   └── Gallery.jsx          # Main gallery page (upload, search, grid)
│   ├── contexts/                 # React contexts
│   │   └── ThemeContext.jsx     # Dark mode theme management
│   ├── lib/                      # Utility libraries
│   │   ├── api.js               # API client (centralized HTTP requests)
│   │   └── supabase.js          # Supabase client initialization
│   ├── utils/                    # Utility functions
│   │   ├── logger.js            # Structured logging utility
│   │   ├── imageUtils.js        # Image processing utilities
│   │   └── searchUtils.js       # Search and filtering utilities
│   ├── tests/                    # Test files
│   │   ├── utils/               # Unit tests for utilities
│   │   │   ├── imageUtils.test.js
│   │   │   └── searchUtils.test.js
│   │   ├── setup.js             # Test configuration
│   │   └── README.md            # Testing documentation
│   ├── App.jsx                   # Main app component with routing
│   └── main.jsx                  # Application entry point
├── backend/                       # Backend source code
│   ├── main.py                   # FastAPI application
│   ├── logger.py                 # Structured logging utility
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Docker configuration for deployment
│   ├── .dockerignore            # Docker ignore file
│   ├── railway.json             # Railway deployment config
│   ├── nixpacks.toml            # Nixpacks deployment config
│   └── .env                      # Backend environment variables (not committed)
├── database/                      # Database files
│   ├── schema.sql               # Database schema with RLS
│   └── storage-policies.sql     # Storage bucket policies
├── AI_SERVICE_COMPARISON.md      # Detailed AI service research document
├── package.json                  # Frontend dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── vitest.config.js              # Vitest test configuration
└── README.md                     # This file
```

---

## 🎨 UI/UX Features

### Responsive Design
- **Mobile-first** approach
- Adapts to all screen sizes (phone, tablet, desktop)
- Touch-friendly interface for mobile devices

### Loading States
- Skeleton screens during image loading
- Processing spinners with status text
- Progress indicators for uploads

### Error Handling
- User-friendly error messages
- Graceful degradation (images still upload if AI fails)
- Retry mechanisms for transient failures

### Accessibility
- Semantic HTML elements
- Keyboard navigation support
- High contrast colors in dark mode
- Clear focus indicators

---

## 🔐 Security Features

### Authentication & Authorization
- **Supabase Auth** - Industry-standard authentication
- **Row Level Security (RLS)** - Database-level user isolation
- **Protected Routes** - Client-side route guards
- **JWT-based Sessions** - Secure session management

### Data Protection
- **Environment Variables** - Sensitive keys never in code
- **CORS Configuration** - Restricted cross-origin requests
- **Input Validation** - Server-side validation with Pydantic
- **SQL Injection Prevention** - Parameterized queries via Supabase
- **XSS Prevention** - React's built-in XSS protection

### API Security
- **Service Role Key** - Backend only, never exposed to frontend
- **Anon Key** - Limited permissions, safe for frontend
- **API Rate Limiting** - Handled by hosting platform
- **Structured Logging** - No sensitive data in logs

---

## 🚀 Deployment

### Live Deployment

**Frontend**: [Vercel](https://ai-image-gallery-sable.vercel.app)
- Automatic deployments from GitHub
- Environment variables configured in Vercel dashboard
- Global CDN for fast loading

**Backend**: [Hugging Face Spaces](https://upaks-ai-image-gallery-api.hf.space)
- Docker-based deployment
- 16GB RAM (CPU Basic tier - FREE)
- Automatic builds from Git pushes
- Environment variables in Space settings

### Deployment Instructions

#### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (your backend URL)
4. Deploy automatically on every push

#### Backend (Hugging Face Spaces)

1. Create a new Space at [huggingface.co/spaces](https://huggingface.co/spaces)
2. Select **Docker** SDK
3. Choose **CPU Basic** hardware (16GB RAM - FREE)
4. Connect GitHub repository or push code directly
5. Set root directory to `backend/`
6. Add environment variables in Space settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL`
   - `PORT=7860`
7. Space builds and deploys automatically

**Note**: First deployment may take 10-15 minutes due to model download.

---

## 📊 Database Schema

### Tables

#### `images`
Stores image file metadata.

```sql
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### `image_metadata`
Stores AI-generated analysis results.

```sql
CREATE TABLE image_metadata (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    colors VARCHAR(7)[] DEFAULT '{}',
    ai_processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(image_id)
);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only **SELECT** their own data
- Users can only **INSERT** with their own `user_id`
- Users can only **UPDATE** their own data
- Users can only **DELETE** their own data

This provides database-level security that cannot be bypassed.

---

## 🤖 AI Service Comparison

See [AI_SERVICE_COMPARISON.md](./AI_SERVICE_COMPARISON.md) for detailed analysis.

### Selected Solution: Hugging Face Transformers (Local)

**Model**: `Salesforce/blip-image-captioning-base`

**Why this choice?**

1. **Cost**: **FREE** - No API costs or per-image charges
   - Runs locally on your server
   - Scales without additional costs
   - Estimated cost: **$0.00 per 1000 images**

2. **Privacy**: Full data privacy
   - Images never leave your server
   - No third-party API calls
   - GDPR compliant by default

3. **Features**: Meets all requirements
   - Generates 5-10 relevant tags
   - Creates descriptive sentences
   - Extracts dominant colors (server-side with PIL)

4. **Performance**: Fast after initial load
   - First model load: ~30-60 seconds
   - Subsequent requests: ~2-5 seconds
   - Model cached in memory

5. **Reliability**: No rate limits or quotas
   - No API downtime concerns
   - Full control over processing
   - No external dependencies for AI

**Alternatives Considered:**
- Replicate API (low cost but per-image charges)
- OpenAI Vision API (high quality but expensive)
- Google Cloud Vision API (enterprise-grade but complex)
- Hugging Face Inference API (free tier but rate limited)

See [AI_SERVICE_COMPARISON.md](./AI_SERVICE_COMPARISON.md) for complete analysis.

---

## 📈 Performance Optimizations

### Frontend
- **Code Splitting** - Automatic route-based splitting with Vite
- **Image Optimization** - Client-side thumbnail generation
- **Lazy Loading** - Images load on scroll
- **Memoization** - React.memo for expensive components
- **Debounced Search** - Reduces API calls

### Backend
- **Async Processing** - Non-blocking AI analysis
- **In-Memory Caching** - Avoids re-processing same images
- **Connection Pooling** - Supabase client reuses connections
- **Thread-Safe Model Loading** - Enables parallel processing
- **Retry Logic** - Exponential backoff for transient failures

### Database
- **Indexed Queries** - Fast searches on user_id, image_id
- **Array Indexing** - Optimized tag searches
- **RLS Overhead** - Minimal performance impact

---

## 🐛 Troubleshooting

### AI Processing Not Working

**Symptoms**: Images upload but no tags/description appear

**Solutions**:
1. Check `backend/.env` has `AI_SERVICE=huggingface`
2. Check backend logs for model download progress
3. First image takes 5-10 minutes (model download)
4. Verify sufficient RAM (16GB recommended)
5. Check for errors in backend logs

### Images Not Uploading

**Symptoms**: Upload fails or hangs

**Solutions**:
1. Verify Supabase Storage bucket `images` exists and is public
2. Check browser console for CORS errors
3. Verify RLS policies are set correctly
4. Check Supabase project is active
5. Verify file size (large files may timeout)

### Search Not Returning Results

**Symptoms**: Search bar doesn't find images

**Solutions**:
1. Ensure AI processing completed (check modal status)
2. Verify tags/description exist in metadata
3. Check database for metadata records
4. Clear search and try again
5. Check browser console for errors

### Build/Deployment Issues

**Symptoms**: Build fails or deployment errors

**Solutions**:
1. Check environment variables are set correctly
2. Verify all dependencies are in requirements.txt
3. Check Docker build logs for errors
4. Ensure port configuration matches hosting platform
5. Verify Python version compatibility (3.9+)

### Authentication Issues

**Symptoms**: Can't sign in or sign up

**Solutions**:
1. Verify Supabase project is active
2. Check environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
3. Verify email confirmation (if enabled)
4. Check Supabase Auth logs
5. Clear browser cache and cookies

---

## 🎯 Potential Improvements

### Implemented ✅
- [x] Image download feature
- [x] Tag editing functionality
- [x] Dark mode toggle
- [x] Export search results as JSON
- [x] Unit tests for core functions
- [x] Deployment to free hosting

### Future Enhancements
- [ ] Image deletion functionality
- [ ] Batch operations (delete multiple, tag multiple)
- [ ] Image organization (folders/albums/collections)
- [ ] Share images with other users
- [ ] Advanced filters (date range, file size, dimensions)
- [ ] Image compression before upload
- [ ] Progress bar for AI processing
- [ ] Retry failed AI processing from UI
- [ ] Image metadata editing (description, custom tags)
- [ ] Duplicate detection
- [ ] Image slideshow view
- [ ] Keyboard shortcuts for navigation
- [ ] Bulk tag management
- [ ] Import/export gallery data
- [ ] Image versioning/history
- [ ] Advanced similarity search (visual embeddings)
- [ ] Integration with cloud storage (Google Drive, Dropbox)

---

## 📝 Development Notes

### AI Processing Flow

1. User uploads image → Stored in Supabase Storage
2. Image record created in `images` table
3. Metadata record created with `ai_processing_status='pending'`
4. Frontend calls `/api/process-image` endpoint
5. Backend starts async processing task
6. Model loaded (first time: downloads ~1.5GB)
7. Image downloaded from Supabase Storage
8. BLIP model generates caption (tags + description)
9. PIL extracts dominant colors
10. Results saved to `image_metadata` table
11. Status updated to `'completed'`
12. Frontend polls for updates and displays results

### Similarity Search Algorithm

Uses **cosine similarity** on:
- **Tags**: Normalized tag vectors (presence/absence)
- **Colors**: RGB color distance
- Combined similarity score determines results

### Polling Mechanism

- Frontend polls Supabase every 3 seconds for pending images
- Uses React refs to avoid stale closures
- Automatically stops when processing completes
- Updates UI in real-time

### Error Handling Strategy

- **Upload errors**: User sees error message, can retry
- **AI processing errors**: Image still uploaded, shows fallback metadata
- **Network errors**: Retry logic with exponential backoff
- **Database errors**: Logged and handled gracefully
- **Model loading errors**: Detailed error messages in logs

---

## 📄 License

This project is created for a developer challenge. Feel free to use and modify as needed.

---

## 👨‍💻 Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

- **ESLint** - Code linting (if configured)
- **Prettier** - Code formatting (if configured)
- **Type Safety** - Pydantic models for backend validation
- **Error Handling** - Comprehensive try-catch blocks
- **Logging** - Structured logging throughout

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

## 🎬 Demo & Screenshots

### 📹 Demo Video

**[Watch Full Demo Video](https://www.loom.com/share/539d3751845847b6b61c6ff01ce53dfc)**

The demo video showcases:
- Complete user flow from signup to image upload
- AI processing in action with real-time status updates
- Search and filter features (text search, color filter, similar images)
- All bonus features (tag editing, dark mode, JSON export, image download)
- Responsive design and mobile-friendly interface
- Technical architecture overview

### Screenshots

Key screenshots from the application:
1. **Sign in/Sign up page** - Clean authentication interface
2. **Gallery view** - Image grid with processing indicators
3. **Image modal** - AI-generated metadata (tags, description, colors)
4. **Search functionality** - Real-time search results
5. **Dark mode toggle** - Theme switching with persistence
6. **Tag editing interface** - Add/remove tags with inline editing
7. **Export JSON feature** - Download search results with metadata

---

## 📚 Additional Documentation

- [Development Timeline & Time Breakdown](./DEVELOPMENT_TIMELINE.md) - Detailed breakdown of time spent on project development, including all phases from planning to deployment
- [AI Service Comparison](./AI_SERVICE_COMPARISON.md) - Detailed AI service analysis
- [Database Schema](./database/schema.sql) - Complete database schema
- [Storage Policies](./database/storage-policies.sql) - Supabase Storage policies
- [Setup Guide](./SETUP.md) - Detailed setup instructions (if exists)
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

---

## 🙏 Acknowledgments

- **Hugging Face** - For the excellent transformers library and BLIP model
- **Supabase** - For the comprehensive backend-as-a-service platform
- **FastAPI** - For the modern Python web framework
- **React** - For the robust UI library

---

## 📧 Contact

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ for the developer challenge**
