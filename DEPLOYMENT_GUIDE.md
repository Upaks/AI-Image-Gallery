# Deployment Guide: Frontend (Vercel) + Backend (Railway/Render)

## 🏗️ Architecture Overview

```
┌─────────────────┐         HTTP API Calls         ┌──────────────────┐
│                 │ ────────────────────────────> │                  │
│  Frontend       │                                │   Backend        │
│  (Vercel)       │ <──────────────────────────── │   (Railway)      │
│                 │         JSON Responses        │                  │
└─────────────────┘                                └──────────────────┘
       │                                                      │
       │                                                      │
       ▼                                                      ▼
┌─────────────────┐                                ┌──────────────────┐
│   Supabase     │                                │  AI Processing   │
│   (Database +  │                                │  (Transformers)  │
│    Storage)     │                                │                  │
└─────────────────┘                                └──────────────────┘
```

## 📦 What Code Goes Where?

### Frontend → Vercel
**Deploy these files/folders:**
- `src/` folder (all React components)
- `public/` folder (if any)
- `package.json`
- `vite.config.js` (modified for production)
- `.env` (with Vercel environment variables)

**What it does:**
- Serves your React app
- Makes HTTP calls to your backend API
- Handles user interface

### Backend → Railway/Render
**Deploy these files/folders:**
- `backend/` folder (entire folder)
  - `main.py`
  - `requirements.txt`
  - `.env` (with Railway/Render environment variables)

**What it does:**
- Runs FastAPI server
- Processes images with AI
- Communicates with Supabase
- Handles AI model inference

---

## 🔄 How They Communicate

### Current Setup (Local Development)
```javascript
// vite.config.js - PROXY (only works locally)
proxy: {
  '/api': {
    target: 'http://localhost:8000'  // Your local backend
  }
}
```

### Production Setup
```javascript
// Frontend makes direct HTTP calls to backend URL
const API_URL = 'https://your-backend.railway.app'  // Your Railway backend URL

// Example API call:
fetch(`${API_URL}/api/process-image`, {
  method: 'POST',
  body: formData
})
```

**You need to:**
1. Get your Railway/Render backend URL (e.g., `https://myapp.railway.app`)
2. Update frontend to use that URL instead of localhost
3. Update CORS in backend to allow your Vercel domain

---

## 💰 Pricing Comparison

### Vercel (Frontend)
- **Free Tier**: ✅ Yes
  - Unlimited deployments
  - 100GB bandwidth/month
  - Perfect for frontend

### Railway (Backend)
- **Free Tier**: ❌ No (discontinued)
- **Hobby Plan**: $5/month
  - $5 credit/month
  - Enough for small apps
  - Auto-scales

### Render (Backend)
- **Free Tier**: ✅ Yes
  - Slower cold starts (30-60s)
  - Spins down after 15min inactivity
  - Good for testing
- **Starter Plan**: $7/month
  - Always on
  - Better performance

---

## 🎯 Recommendation: Railway

**Why Railway?**
- ✅ Easier setup for Python/FastAPI
- ✅ Better free tier ($5/month is cheap)
- ✅ Auto-deploys from GitHub
- ✅ Simple environment variables
- ✅ Good documentation

**Why not Render?**
- Free tier has cold starts (slow)
- More complex setup

---

## 📝 Step-by-Step Deployment

### Step 1: Deploy Backend to Railway

1. **Sign up**: [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub**
3. **Select your repo**
4. **Root Directory**: Set to `backend/`
5. **Add Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   AI_SERVICE=huggingface
   AI_API_KEY=your_hf_token (if using API)
   PORT=8000
   ```
6. **Railway auto-detects Python** and runs `uvicorn main:app`
7. **Get your URL**: `https://your-app.railway.app`

### Step 2: Update Backend CORS

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app"  # Add your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 3: Update Frontend API Calls

Create `src/config.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend.railway.app';

export { API_URL };
```

Update all API calls:
```javascript
// Instead of: fetch('/api/process-image')
// Use: fetch(`${API_URL}/api/process-image`)
```

### Step 4: Deploy Frontend to Vercel

1. **Sign up**: [vercel.com](https://vercel.com)
2. **New Project** → **Import from GitHub**
3. **Select your repo**
4. **Root Directory**: Leave as root (not `src/`)
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Add Environment Variables**:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=https://your-backend.railway.app
   ```
8. **Deploy!**

---

## 🤔 About Hugging Face API Deprecation

### The Truth:
- ✅ **Old endpoint IS deprecated**: `api-inference.huggingface.co/models/...` returns 410
- ✅ **New endpoints exist**: But require different setup
- ✅ **Transformers library works**: But needs proper server (not Vercel)

### Options:

**Option A: Hugging Face Transformers (Local)**
- Download model to Railway server
- Process images locally
- **Cost**: $0 per image + $5/month Railway
- **Works on**: Railway ✅, Render ✅, Vercel ❌

**Option B: Hugging Face Inference API (New)**
- Use new endpoint format
- Requires API key
- **Cost**: Free tier available
- **Works on**: Anywhere (API call)

**Option C: OpenRouter + GPT-4**
- Simple API calls
- **Cost**: $0.01-0.03 per image
- **Works on**: Anywhere (API call)

---

## 🚀 Quick Start Commands

### Railway Deployment
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## ✅ Final Checklist

- [ ] Backend deployed to Railway
- [ ] Backend URL obtained
- [ ] CORS updated in backend
- [ ] Frontend API calls updated
- [ ] Environment variables set in Vercel
- [ ] Frontend deployed to Vercel
- [ ] Test end-to-end flow

---

## 🆘 Troubleshooting

**Frontend can't reach backend:**
- Check CORS settings
- Verify backend URL is correct
- Check Railway logs

**Backend times out:**
- Railway free tier has limits
- Upgrade to paid plan if needed

**Model too large:**
- Use smaller models
- Or use API instead of local

---

**Need help?** Check Railway docs: [docs.railway.app](https://docs.railway.app)

