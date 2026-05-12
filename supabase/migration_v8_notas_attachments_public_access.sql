-- Drop the previous restrictive policies that required authentication
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Create public policies for the notas-attachments bucket
-- since the application does not use Supabase Authentication

CREATE POLICY "Public Insert" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'notas-attachments');

CREATE POLICY "Public Update" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'notas-attachments');

CREATE POLICY "Public Delete" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'notas-attachments');
