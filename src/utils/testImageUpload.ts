// Test utility to debug image upload issues
import { supabase } from '../lib/supabase';

export const testSupabaseStorage = async () => {
  console.log('Testing Supabase storage configuration...');
  
  try {
    // 1. Test if we can list buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return { success: false, error: 'Cannot list buckets: ' + bucketsError.message };
    }
    
    console.log('Available buckets:', buckets);
    
    // 2. Check if project-images bucket exists
    const projectImagesBucket = buckets?.find(bucket => bucket.name === 'project-images');
    
    if (!projectImagesBucket) {
      console.error('project-images bucket not found');
      return { success: false, error: 'project-images bucket does not exist' };
    }
    
    console.log('project-images bucket found:', projectImagesBucket);
    
    // 3. Test creating a signed upload URL
    const testFileName = `test/${Date.now()}_test.txt`;
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('project-images')
      .createSignedUploadUrl(testFileName);
    
    if (signedUrlError) {
      console.error('Error creating signed upload URL:', signedUrlError);
      return { success: false, error: 'Cannot create signed upload URL: ' + signedUrlError.message };
    }
    
    console.log('Signed upload URL created successfully:', signedUrlData);
    
    // 4. Test uploading a simple text file
    const testContent = 'This is a test file';
    const uploadRes = await fetch(signedUrlData.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: testContent
    });
    
    if (!uploadRes.ok) {
      console.error('Upload test failed:', uploadRes.statusText);
      return { success: false, error: 'Upload test failed: ' + uploadRes.statusText };
    }
    
    console.log('Upload test successful');
    
    // 5. Test getting public URL
    const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(testFileName);
    console.log('Public URL:', urlData.publicUrl);
    
    // 6. Clean up test file
    const { error: deleteError } = await supabase.storage.from('project-images').remove([testFileName]);
    if (deleteError) {
      console.warn('Could not delete test file:', deleteError);
    }
    
    return { success: true, message: 'All storage tests passed' };
    
  } catch (error) {
    console.error('Exception during storage test:', error);
    return { success: false, error: 'Exception: ' + (error as Error).message };
  }
};

export const testImageUploadStep = async (file: File, projectId: string) => {
  console.log('Testing image upload with file:', file.name, 'size:', file.size);
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
    
    console.log('Generated file name:', fileName);
    
    // Step 1: Create signed upload URL
    console.log('Step 1: Creating signed upload URL...');
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('project-images')
      .createSignedUploadUrl(fileName);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Failed to get signed upload URL:', signedUrlError);
      return { success: false, error: 'Failed to get signed upload URL: ' + (signedUrlError?.message || 'No URL returned') };
    }
    
    console.log('Signed URL created:', signedUrlData.signedUrl);

    // Step 2: Upload the file
    console.log('Step 2: Uploading file...');
    const uploadRes = await fetch(signedUrlData.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file
    });

    if (!uploadRes.ok) {
      console.error('Direct upload failed:', uploadRes.status, uploadRes.statusText);
      const responseText = await uploadRes.text();
      console.error('Response body:', responseText);
      return { success: false, error: `Upload failed: ${uploadRes.status} ${uploadRes.statusText}` };
    }
    
    console.log('Upload successful');

    // Step 3: Get public URL
    console.log('Step 3: Getting public URL...');
    const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(fileName);
    const publicUrl = urlData?.publicUrl;
    
    if (!publicUrl) {
      console.error('Failed to get public URL');
      return { success: false, error: 'Failed to get public URL' };
    }
    
    console.log('Public URL:', publicUrl);
    
    return { success: true, publicUrl, message: 'Image upload successful' };
    
  } catch (error) {
    console.error('Exception during image upload test:', error);
    return { success: false, error: 'Exception: ' + (error as Error).message };
  }
};
