# 🔍 Diagnose 500 Error - Step by Step

## The Problem
You're getting `500 Internal Server Error` when calling `/api/process-image`. This means the backend is crashing.

## Step 1: Check Backend is Running

**Open the terminal where you started the backend** (where you ran `uvicorn main:app --reload`)

**Look for:**
- ✅ `INFO:     Uvicorn running on http://127.0.0.1:8000`
- ✅ `✓ Supabase client initialized with URL: ...`

**If you see errors instead:**
- ❌ `ERROR: Missing SUPABASE_URL` → Create `backend/.env` file
- ❌ `ERROR: Failed to initialize Supabase client` → Check Supabase credentials

## Step 2: Test Backend Health

Open in browser: **http://localhost:8000/api/health**

**Should see:**
```json
{
  "status": "healthy",
  "supabase_configured": true,
  "ai_service": "replicate",
  "ai_key_configured": false
}
```

**If you get an error:**
- Backend is not running → Start it
- Connection refused → Backend crashed on startup

## Step 3: Check Backend Terminal When Uploading

**When you upload an image, watch the backend terminal.** You should see:

```
Received process-image request for image_id: X, user_id: Y
Updated metadata status to processing: ...
Started async AI processing task for image_id: X
```

**If you see an error instead, that's the problem!** Common errors:

### Error 1: `'NoneType' object has no attribute 'table'`
**Cause:** Supabase client not initialized
**Fix:** Check `backend/.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Error 2: `ValidationError` or `value_error`
**Cause:** Request data format wrong
**Fix:** Check frontend is sending correct data format

### Error 3: `Database error` or `RLS policy violation`
**Cause:** Database/Supabase issue
**Fix:** Check database schema is created, RLS policies exist

### Error 4: `AI processing error`
**Cause:** Replicate API issue
**Fix:** Use `AI_SERVICE=mock` in `backend/.env` for testing

## Step 4: Verify Environment Variables

**Check `backend/.env` exists and has:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
AI_SERVICE=mock
AI_API_KEY=
```

**Important:**
- Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key!)
- Get it from: Supabase Dashboard → Settings → API → service_role key
- For testing without Replicate: `AI_SERVICE=mock`

## Step 5: Restart Backend After Changes

**After changing `backend/.env`:**
1. Stop backend: Press `Ctrl+C` in backend terminal
2. Restart: `cd backend` then `.\venv\Scripts\python.exe -m uvicorn main:app --reload`
3. Check for startup errors

## Step 6: Check Request Format

**The frontend sends:**
```json
{
  "image_id": 123,
  "user_id": "uuid-here",
  "image_url": "https://..."
}
```

**Verify in browser console (Network tab):**
- Request URL: `http://localhost:3000/api/process-image`
- Request method: `POST`
- Request payload: Should match format above

## Step 7: Common Fixes

### Fix 1: Backend Not Running
```bash
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

### Fix 2: Missing .env File
Create `backend/.env`:
```env
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
AI_SERVICE=mock
```

### Fix 3: Wrong Supabase Key
- Must use **service_role** key (not anon key)
- Found in: Supabase Dashboard → Settings → API

### Fix 4: Backend Crashed
- Check backend terminal for startup errors
- Look for Python traceback/error messages
- Fix the error, then restart

## Step 8: Get Exact Error Message

**The backend terminal will show the exact error.** Look for:

```
Error in process_image endpoint: ...
Traceback (most recent call last):
  File "..."
    ...
```

**Copy that entire error message** - it tells us exactly what's wrong!

## Still Not Working?

1. **Check backend terminal** - What error do you see?
2. **Test health endpoint** - Does http://localhost:8000/api/health work?
3. **Verify .env file** - Does `backend/.env` exist with correct values?
4. **Restart backend** - Did you restart after changing .env?

**Share the error message from backend terminal** and we can fix it!

