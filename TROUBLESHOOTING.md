# 🔧 Troubleshooting Guide

## Issue: Images Upload But Nothing Works

If you've uploaded images and they don't appear or don't process, follow these steps:

### 1. Check Backend Server is Running

**Problem**: Backend not running on port 8000

**Check**:
```bash
# Windows PowerShell:
netstat -ano | findstr :8000

# Should show: TCP    127.0.0.1:8000  LISTENING
```

**Fix**:
```bash
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

### 2. Check Environment Variables

**Problem**: Missing or incorrect environment variables

**Check**:

**Frontend** (`.env` in root):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AI_SERVICE=replicate
AI_API_KEY=r8_your_token
```

**Fix**: Create/update these files with correct values from Supabase dashboard

### 3. Check Browser Console

**Problem**: Errors in browser console

**Check**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages

**Common Errors**:
- `Failed to fetch` → Backend not running or CORS issue
- `Missing Supabase environment variables` → Check `.env` file
- `Network Error` → Backend server not accessible

### 4. Check Backend Terminal

**Problem**: Errors in backend logs

**Check**: Look at terminal where backend is running

**Common Errors**:
- `Missing SUPABASE_URL` → Check `backend/.env`
- `AI processing error` → Check Replicate API key
- `Failed to upload` → Check Supabase Storage bucket

### 5. Verify Supabase Setup

**Check**:
1. Database schema created? Run `database/schema.sql` in Supabase SQL Editor
2. Storage bucket exists? Go to Storage → Create bucket named `images` (public)
3. **Storage bucket policies created?** ⚠️ **MOST IMPORTANT!** 
   - Go to Storage → `images` bucket → Policies
   - You should see 4 policies (INSERT, SELECT, UPDATE, DELETE)
   - If missing, run `database/storage-policies.sql` in SQL Editor
   - Without these, you'll get "row-level security policy" errors!
4. RLS policies active? Check in Table Editor → RLS policies

### 6. Verify Images Are Actually Uploading

**Check**:
1. Open browser DevTools → Network tab
2. Upload an image
3. Look for:
   - `POST` request to Supabase Storage → Should return 200
   - `POST` request to `/api/process-image` → Should return 200

**If Storage request fails**:
- Bucket doesn't exist
- Bucket not public
- RLS policy blocking

**If API request fails**:
- Backend not running
- CORS issue
- Backend error (check backend terminal)

### 7. Check Image Processing Status

**Problem**: Images uploaded but no tags/description appear

**Check**:
1. Open image modal (click on image)
2. Look at processing status
3. Check backend terminal for AI processing logs

**If stuck on "Processing"**:
- Check Replicate API key in `backend/.env`
- Check backend terminal for errors
- Verify AI_SERVICE=replicate (or mock for testing)

### 8. Verify Gallery Refresh

**Problem**: Images uploaded but don't appear in gallery

**Check**:
1. Upload an image
2. Wait 2-3 seconds
3. Gallery should refresh automatically

**If not refreshing**:
- Check browser console for errors
- Manually refresh page (F5)
- Check `onUploadComplete` callback

## Debug Steps

### Step 1: Test Backend API

Open browser and visit:
```
http://localhost:8000/
```

Should see: `{"message":"AI Image Gallery API"}`

### Step 2: Test Frontend

Open:
```
http://localhost:3000/
```

Should see sign-in page (or gallery if logged in)

### Step 3: Test Upload Flow

1. Sign in/Sign up
2. Go to gallery
3. Upload a test image (JPEG or PNG)
4. Watch browser console and network tab
5. Watch backend terminal

**Expected Flow**:
1. File selected → `handleFileSelect` triggered
2. File uploaded to Supabase Storage → Network shows POST to storage
3. Database record created → No error in console
4. API call to `/api/process-image` → Network shows POST 200
5. Gallery refreshes → New image appears
6. Processing overlay shows → "Processing..."
7. AI completes → Tags, description, colors appear

### Step 4: Check Each Step

**Upload fails at step 2**:
- Check Supabase Storage bucket
- Check `.env` has correct Supabase URL/key

**Upload fails at step 4**:
- Check backend is running
- Check `backend/.env` has correct values
- Check backend terminal for errors

**Processing stuck at step 6**:
- Check Replicate API key
- Check backend terminal for AI errors
- Try with `AI_SERVICE=mock` for testing

## Quick Fixes

### Fix 1: Restart Backend
```bash
# Stop backend (Ctrl+C)
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

### Fix 2: Restart Frontend
```bash
# Stop frontend (Ctrl+C)
npm run dev
```

### Fix 3: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache

### Fix 4: Check All Environment Variables
```bash
# Frontend
cat .env

# Backend
cat backend/.env
```

### Fix 5: Verify Database Schema
- Go to Supabase Dashboard → SQL Editor
- Run `database/schema.sql` again
- Verify tables exist in Table Editor

## Still Not Working?

1. **Check all errors**: Browser console + Backend terminal
2. **Verify setup**: Follow SETUP.md step by step
3. **Test components**: Try uploading a small test image
4. **Check logs**: Look for specific error messages
5. **Verify environment**: All API keys and URLs correct

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch` | Backend not running | Start backend server |
| `Missing Supabase environment variables` | `.env` missing/wrong | Create/update `.env` file |
| `Network Error` | CORS or connection issue | Check backend is running on port 8000 |
| `Bucket not found` | Storage bucket missing | Create `images` bucket in Supabase |
| `new row violates row-level security policy` | Storage bucket policies missing | Run `database/storage-policies.sql` in SQL Editor |
| `RLS policy violation` | Security rules blocking | Check RLS policies in schema.sql and storage-policies.sql |
| `AI processing failed` | Replicate API error | Check Replicate API key |
| `401 Unauthorized` | Supabase auth issue | Check Supabase URL/key |

---

**Need more help?** Check the error messages in:
1. Browser console (F12)
2. Backend terminal
3. Network tab (F12 → Network)

