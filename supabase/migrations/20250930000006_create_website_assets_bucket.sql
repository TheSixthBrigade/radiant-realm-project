-- Create storage bucket for website assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for website-assets bucket
CREATE POLICY "Anyone can view website assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-assets');

CREATE POLICY "Authenticated users can upload website assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'website-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own website assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'website-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own website assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'website-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
