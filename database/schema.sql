-- AI Image Gallery Database Schema

-- Images table
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Image metadata table (AI analysis results)
CREATE TABLE IF NOT EXISTS image_metadata (
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

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for images table
CREATE POLICY "Users can only see own images"
    ON images FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own images"
    ON images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own images"
    ON images FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own images"
    ON images FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for image_metadata table
CREATE POLICY "Users can only see own metadata"
    ON image_metadata FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own metadata"
    ON image_metadata FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own metadata"
    ON image_metadata FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own metadata"
    ON image_metadata FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metadata_image_id ON image_metadata(image_id);
CREATE INDEX IF NOT EXISTS idx_metadata_user_id ON image_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_metadata_tags ON image_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_metadata_colors ON image_metadata USING GIN(colors);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_image_metadata_updated_at
    BEFORE UPDATE ON image_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Storage Bucket Policies for 'images' bucket
-- Note: These policies must be created AFTER the bucket exists in Supabase Storage
-- Go to Storage > images bucket > Policies > New Policy to verify they exist

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to read files from their own folder
CREATE POLICY "Users can read own files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update files in their own folder
CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete files from their own folder
CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

