-- GorillaProof Storage Setup
-- Run this in Supabase SQL Editor or via psql

-- 1. Create the storage bucket for proof files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'proofs',
    'proofs',
    false,  -- Not public, requires auth
    262144000, -- 250MB max file size
    ARRAY[
        -- Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'image/tiff', 'image/vnd.adobe.photoshop',
        -- Video
        'video/mp4', 'video/quicktime', 'video/webm',
        -- Documents
        'application/pdf',
        -- Design files (often uploaded as octet-stream)
        'application/octet-stream',
        'application/postscript',
        'application/illustrator'
    ]
) ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS: Authenticated users can read files from their orgs
CREATE POLICY "Authenticated users can read proof files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'proofs'
    AND (
        -- Extract org_id from path: {org_id}/{project_id}/{proof_id}/...
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
              AND user_id = auth.uid()
        )
    )
);

-- 3. Storage RLS: Authenticated users can upload files to their orgs
CREATE POLICY "Authenticated users can upload proof files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'proofs'
    AND (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
              AND user_id = auth.uid()
        )
    )
);

-- 4. Storage RLS: Authenticated users can update files in their orgs
CREATE POLICY "Authenticated users can update proof files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'proofs'
    AND (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
              AND user_id = auth.uid()
        )
    )
);

-- 5. Storage RLS: Authenticated users can delete files in their orgs
CREATE POLICY "Authenticated users can delete proof files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'proofs'
    AND (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = (string_to_array(name, '/'))[1]::uuid
              AND user_id = auth.uid()
        )
    )
);
