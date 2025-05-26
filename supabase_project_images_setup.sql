-- Create project_images table to store image metadata
CREATE TABLE IF NOT EXISTS project_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL,
  src TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Add index for faster lookups
  CONSTRAINT unique_image_per_project UNIQUE(project_id, image_id)
);

-- Create index for faster project lookups
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage their own project images
CREATE POLICY "Users can manage their own project images" ON project_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_images.project_id 
      AND p.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON project_images TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
