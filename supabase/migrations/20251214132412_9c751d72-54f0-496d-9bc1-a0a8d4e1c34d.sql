-- Create storage bucket for admin uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-uploads', 'admin-uploads', true);

-- Allow admins to upload files
CREATE POLICY "Admins can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-uploads' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update files
CREATE POLICY "Admins can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'admin-uploads' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-uploads' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow public read access (images need to be viewable)
CREATE POLICY "Public can read admin uploads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'admin-uploads');