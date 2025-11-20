# 🔧 Quick Fix: 500 Internal Server Error

## The Problem
You're getting a 500 error when uploading images. This means the backend is receiving the request but something is failing.

## Step 1: Check Backend Terminal

**Look at the terminal where your backend is running** - you should see error messages there that tell you exactly what's wrong.

Common errors you might see:

### Error 1: Missing Environment Variables
```
ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
```
**Fix**: Check `backend/.env` file exists and has:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AI_SERVICE=replicate
AI_API_KEY=r8_your_token
```

### Error 2: Supabase Connection Failed
```
ERROR: Failed to initialize Supabase client
```
**Fix**: 
- Verify Supabase URL is correct
- Verify service_role_key is correct (not anon key!)
- Check Supabase project is active

### Error 3: AI Processing Error
```
AI processing error: ...
```
**Fix**: 
- If you don't have Replicate API key yet, set `AI_SERVICE=mock` in `backend/.env`
- Or get a Replicate API key from https://replicate.com/account/api-tokens

## Step 2: Quick Test

1. **Check backend is running**:
   - Visit: http://localhost:8000/
   - Should see: `{"message":"AI Image Gallery API"}`

2. **Check backend logs**:
   - Look at terminal where backend is running
   - Upload an image
   - Watch for error messages

## Step 3: Common Fixes

### Fix 1: Missing backend/.env file
Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AI_SERVICE=mock
AI_API_KEY=
```

### Fix 2: Use Mock AI Service (No API Key Needed)
If you don't have Replicate API key yet, use mock service:
```env
AI_SERVICE=mock
AI_API_KEY=
```
This will generate sample tags/descriptions for testing.

### Fix 3: Restart Backend
After changing `.env` file:
1. Stop backend (Ctrl+C)
2. Restart: `cd backend` then `.\venv\Scripts\python.exe -m uvicorn main:app --reload`

## Step 4: Verify Setup

Run this in backend terminal to test:
```python
# Should print Supabase URL (first 30 chars)
# Should print "✓ Supabase client initialized"
```

## Still Not Working?

**Share the error message from backend terminal** - that will tell us exactly what's wrong!

The backend terminal will show something like:
```
ERROR: Missing SUPABASE_URL...
```
or
```
Error in process_image endpoint: ...
```

Copy that error message and we can fix it!

