-- Instructions for creating the filter_keywords table in Supabase
-- Go to the Supabase dashboard for your project
-- Navigate to the SQL Editor
-- Copy and paste this entire script and run it

-- First, drop the table if it exists to ensure a clean slate
DROP TABLE IF EXISTS public.filter_keywords;

-- Now create the table with proper constraints
CREATE TABLE public.filter_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add explicit unique index on keyword column
CREATE UNIQUE INDEX filter_keywords_keyword_idx ON public.filter_keywords (keyword);

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.filter_keywords ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access to the keywords
-- The application is using anonymous access so we need to enable this

-- Allow anyone to view keywords
CREATE POLICY "Allow public read access to filter_keywords" 
  ON public.filter_keywords 
  FOR SELECT 
  USING (true);

-- Allow anyone to insert keywords (needed for anonymous users)
CREATE POLICY "Allow public insert access to filter_keywords" 
  ON public.filter_keywords 
  FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to update keywords (needed for anonymous users)
CREATE POLICY "Allow public update access to filter_keywords" 
  ON public.filter_keywords 
  FOR UPDATE
  USING (true);

-- Allow anyone to delete keywords (needed for anonymous users)
CREATE POLICY "Allow public delete access to filter_keywords" 
  ON public.filter_keywords 
  FOR DELETE
  USING (true);

-- Grant permissions to the service role and anon role
GRANT ALL ON public.filter_keywords TO service_role;
GRANT ALL ON public.filter_keywords TO anon;

-- First let's check if our table was created properly
DO $$
BEGIN
  RAISE NOTICE 'Table filter_keywords exists: %', EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'filter_keywords'
  );
END $$;

-- Add some test data to verify the table works properly
-- We'll split this into separate insert statements to see which one might fail
BEGIN;
  -- First test keyword
  INSERT INTO public.filter_keywords (keyword) 
  VALUES ('test keyword 1');
  
  -- Second test keyword - with separate insert
  INSERT INTO public.filter_keywords (keyword) 
  VALUES ('test keyword 2');
  
  -- Third with conflict handling
  INSERT INTO public.filter_keywords (keyword) 
  VALUES ('test keyword 1') -- This is a duplicate
  ON CONFLICT (keyword) DO NOTHING;
COMMIT;

-- You should now be able to query the table to verify it exists
SELECT * FROM public.filter_keywords;

-- Instructions for testing the table:
-- 1. Run this script in the Supabase SQL Editor
-- 2. Verify that the table was created and contains the test data
-- 3. Go back to your application and try adding/removing keywords
--    through the settings page
