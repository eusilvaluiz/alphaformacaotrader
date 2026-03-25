-- Create storage bucket for lesson thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);

-- Allow admins to upload thumbnails
CREATE POLICY "Admins can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');