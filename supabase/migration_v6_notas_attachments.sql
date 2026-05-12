-- Add attachment columns to notas table
ALTER TABLE notas ADD COLUMN IF NOT EXISTS archivo_url TEXT;
ALTER TABLE notas ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;

-- Create the storage bucket for notes attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-attachments', 'notas-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket
-- Allow public access to view/download files
CREATE POLICY "Public Access" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'notas-attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Auth Insert" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'notas-attachments' 
        AND auth.role() = 'authenticated'
    );

-- Allow authenticated users to update their files
CREATE POLICY "Auth Update" 
    ON storage.objects FOR UPDATE 
    WITH CHECK (
        bucket_id = 'notas-attachments' 
        AND auth.role() = 'authenticated'
    );

-- Allow authenticated users to delete files
CREATE POLICY "Auth Delete" 
    ON storage.objects FOR DELETE 
    USING (
        bucket_id = 'notas-attachments' 
        AND auth.role() = 'authenticated'
    );
