-- Supabase Storage Bucket Policies for 'images' bucket
-- IMPORTANT: Run this AFTER creating the 'images' bucket in Supabase Storage
-- Go to: Storage > images bucket > Policies

-- These policies allow authenticated users to manage files in their own folders
-- Folder structure: images/{user_id}/filename.jpg

-- Policy 1: Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy 2: Allow authenticated users to read files from their own folder
CREATE POLICY "Users can read own files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy 3: Allow authenticated users to update files in their own folder
CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy 4: Allow authenticated users to delete files from their own folder
CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

