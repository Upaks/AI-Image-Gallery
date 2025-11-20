# 🚀 Setup Guide

This guide will walk you through setting up the AI Image Gallery from scratch.

## Step 1: Prerequisites

Install the following if you don't have them:
- **Node.js** 18+ ([download](https://nodejs.org/))
- **Python** 3.9+ ([download](https://www.python.org/downloads/))
- **Git** ([download](https://git-scm.com/downloads))

Verify installations:
```bash
node --version  # Should be v18+
python --version  # Should be 3.9+
git --version
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: AI Image Gallery (or any name)
   - **Database Password**: Save this password securely
   - **Region**: Choose closest to you
5. Wait for project to be created (~2 minutes)

### 2.2 Set Up Database
1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Verify tables were created:
   - Go to **Table Editor**
   - You should see `images` and `image_metadata` tables

### 2.3 Create Storage Bucket
1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `images`
4. **Make it public**: Toggle "Public bucket" ON
5. Click **Create bucket**

### 2.4 Set Up Storage Bucket Policies (IMPORTANT!)
1. After creating the bucket, click on the `images` bucket
2. Go to **Policies** tab
3. Click **New Policy** → **Create policy from scratch**
4. Run this SQL in **SQL Editor** (recommended):
   ```sql
   -- Copy contents from database/storage-policies.sql
   ```
   
   OR manually create these 4 policies:
   
   **Policy 1: Upload**
   - Policy name: `Users can upload to own folder`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'images'`
   - WITH CHECK expression: `(storage.foldername(name))[1] = auth.uid()::text`
   
   **Policy 2: Read**
   - Policy name: `Users can read own files`
   - Allowed operation: `SELECT`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text`
   
   **Policy 3: Update**
   - Policy name: `Users can update own files`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text`
   
   **Policy 4: Delete**
   - Policy name: `Users can delete own files`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text`
   
   ⚠️ **CRITICAL**: Without these policies, you'll get "row-level security policy" errors when uploading!

### 2.5 Get API Keys
1. Go to **Settings** > **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Step 3: Replicate API Setup

### 3.1 Create Account
1. Go to [replicate.com](https://replicate.com)
2. Sign up (free account works)
3. Verify your email if required

### 3.2 Get API Token
1. Go to [Account Settings](https://replicate.com/account/api-tokens)
2. Click **Create token**
3. Name it: "AI Image Gallery"
4. Copy the token (starts with `r8_...`)

## Step 4: Project Setup

### 4.1 Install Frontend Dependencies
```bash
npm install
```

### 4.2 Install Backend Dependencies
```bash
# Create virtual environment
cd backend

# On Windows (use 'py' command):
py -m venv venv
# On Mac/Linux:
python3 -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
venv\Scripts\activate.bat
# On Mac/Linux:
source venv/bin/activate

# Install packages
# On Windows:
.\venv\Scripts\python.exe -m pip install -r requirements.txt
# On Mac/Linux:
pip install -r requirements.txt
cd ..
```

### 4.3 Configure Environment Variables

**Create `.env` in project root:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Create `backend/.env`:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
AI_SERVICE=replicate
AI_API_KEY=r8_your_replicate_token_here
```

⚠️ **Important**: Never commit these files! They're already in `.gitignore`

## Step 5: Run the Application

### 5.1 Start Backend Server
```bash
cd backend

# On Windows:
.\venv\Scripts\python.exe -m uvicorn main:app --reload

# On Mac/Linux (with venv activated):
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 5.2 Start Frontend Server
Open a new terminal:
```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

### 5.3 Open in Browser
Visit: `http://localhost:3000`

## Step 6: Test the Application

1. **Sign Up**: Create a new account
2. **Sign In**: Log in with your credentials
3. **Upload Image**: Drag & drop or click to upload a JPEG/PNG
4. **Wait for Processing**: Image will show "Processing..." overlay
5. **View Results**: After ~5-10 seconds, tags, description, and colors should appear
6. **Search**: Try searching by tags or description
7. **Find Similar**: Click "Find Similar" on an image
8. **Filter by Color**: Click a color dot to filter

## Troubleshooting

### Backend won't start
- ✅ Check Python version: `py --version` (Windows) or `python3 --version` (Mac/Linux) (need 3.9+)
- ✅ On Windows, use `py` instead of `python` command
- ✅ Verify virtual environment is activated
- ✅ Check `backend/.env` exists and has all variables
- ✅ Try: `.\venv\Scripts\python.exe -m pip install --upgrade -r requirements.txt` (Windows)

### Frontend won't start
- ✅ Check Node version: `node --version` (need 18+)
- ✅ Delete `node_modules` and run `npm install` again
- ✅ Check `.env` exists in root directory

### Images not uploading
- ✅ Verify Supabase Storage bucket `images` exists and is public
- ✅ Check browser console for errors
- ✅ Verify RLS policies were created (run schema.sql again)

### AI processing not working
- ✅ Check Replicate API key is correct in `backend/.env`
- ✅ Verify backend server is running
- ✅ Check backend terminal for error messages
- ✅ Test Replicate API key: Visit [replicate.com/account](https://replicate.com/account)

### Can't sign up/sign in
- ✅ Check Supabase project is active (not paused)
- ✅ Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- ✅ Check browser console for errors

## Next Steps

- Read the [README.md](./README.md) for feature documentation
- Check [AI_SERVICE_COMPARISON.md](./AI_SERVICE_COMPARISON.md) for AI service details
- Customize the UI in `src/components/`
- Modify AI processing in `backend/main.py`

## Need Help?

- Check Supabase docs: [supabase.com/docs](https://supabase.com/docs)
- Check Replicate docs: [replicate.com/docs](https://replicate.com/docs)
- Review error messages in browser console and backend terminal

Happy coding! 🎉

