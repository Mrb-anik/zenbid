DROP POLICY IF EXISTS "Allow public reads of individual files" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_select" ON storage.objects;

-- Allow EVERYONE (both logged in and public) to read the logos
CREATE POLICY "company_logos_select" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
