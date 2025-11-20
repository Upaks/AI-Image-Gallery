# ✅ Pre-Deployment Checklist

Use this checklist before deploying or submitting the project.

## Environment Setup
- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] Supabase project created
- [ ] Replicate API account created

## Configuration
- [ ] `.env` file created in root with Supabase keys
- [ ] `backend/.env` file created with all required keys
- [ ] Supabase database schema executed (`database/schema.sql`)
- [ ] Supabase Storage bucket `images` created and set to public
- [ ] RLS policies verified in Supabase dashboard

## Installation
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Virtual environment activated (if using)

## Testing
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can sign up with new account
- [ ] Can sign in with existing account
- [ ] Can upload single image
- [ ] Can upload multiple images
- [ ] Images appear in gallery
- [ ] Thumbnails are generated correctly
- [ ] AI processing completes (tags, description, colors appear)
- [ ] Can search by text query
- [ ] Can filter by color
- [ ] Can find similar images
- [ ] Image modal displays correctly
- [ ] Can download images
- [ ] Logout works
- [ ] After logout, cannot access gallery
- [ ] Mobile responsive design works

## Code Quality
- [ ] No console errors in browser
- [ ] No errors in backend terminal
- [ ] All environment variables set correctly
- [ ] API keys are not committed to git
- [ ] `.gitignore` includes `.env` files

## Documentation
- [ ] README.md reviewed and accurate
- [ ] SETUP.md reviewed and accurate
- [ ] AI_SERVICE_COMPARISON.md complete
- [ ] All instructions are clear

## Optional Enhancements
- [ ] Dark mode (if implemented)
- [ ] Tag editing (if implemented)
- [ ] Export search results (if implemented)
- [ ] Unit tests (if implemented)

## Deployment (if applicable)
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Backend deployed to Railway/Render
- [ ] Environment variables set in hosting platform
- [ ] CORS origins updated in backend
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate active

## Final Verification
- [ ] All core features working
- [ ] No critical bugs
- [ ] Performance is acceptable
- [ ] Security measures in place (RLS, env variables)
- [ ] Ready for submission/demo

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

