-- Create storage buckets for the dental CRM
-- Run this in your Supabase SQL Editor

-- Create the audio bucket for call recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg']
);

-- Create the attachments bucket for general file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false, -- Private bucket
  104857600, -- 100MB limit
  NULL -- Allow all file types
);

-- Create RLS policies for the audio bucket
CREATE POLICY "Authenticated users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view their audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio' AND 
  auth.role() = 'authenticated'
);

-- Create RLS policies for the attachments bucket
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view their attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

