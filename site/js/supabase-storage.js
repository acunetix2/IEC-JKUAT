// IEC JKUAT — Supabase Storage Utilities
// Handles file uploads to Supabase Storage buckets
// Buckets: project-media, event-media, blog-media, product-images

const STORAGE_BUCKETS = {
  project: 'project-media',
  event: 'event-media',
  blog: 'blog-media',
  product: 'product-images'
};

// Upload a file to a storage bucket
// Returns the public URL of the uploaded file
const ALLOWED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

async function uploadMedia(file, bucket, folder = '') {
  const sb = initSupabase();
  if (!sb) throw new Error('Supabase not loaded');

  // Validate MIME type first (SVG/HTML/etc. are never valid uploads —
  // they can carry executable script when served from storage).
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Upload JPG, PNG, GIF, WebP, MP4 or WebM.`);
  }

  // Validate file size (50MB max for media, 10MB for images)
  const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Max ${file.type.startsWith('video/') ? '50MB' : '10MB'} for ${file.type.split('/')[0]}s.`);
  }
  
  // Generate unique filename (extension sanitized: no path separators,
  // no whitespace — prevents path games via crafted filenames)
  const ext = (file.name.split('.').pop() || '').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileName = `${folder ? folder + '/' : ''}${timestamp}_${random}.${ext}`;
  
  const { data, error } = await sb.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = sb.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return publicUrl;
}

// Upload multiple files and return array of URLs
async function uploadMultipleMedia(files, bucket, folder = '') {
  const urls = [];
  for (const file of files) {
    const url = await uploadMedia(file, bucket, folder);
    urls.push(url);
  }
  return urls;
}

// Delete a file from storage by its URL
async function deleteMediaByUrl(publicUrl, bucket) {
  const sb = initSupabase();
  if (!sb) return;
  
  // Extract the file path from the public URL
  const url = new URL(publicUrl);
  const pathMatch = url.pathname.match(new RegExp(`/${bucket}/(.+)$`));
  if (!pathMatch) return;
  
  const filePath = pathMatch[1];
  const { error } = await sb.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) console.error('Failed to delete file:', error.message);
}

// Upload a single image from a file input and return the URL
async function uploadImageFromInput(fileInput, bucket, folder = '') {
  const file = fileInput.files[0];
  if (!file) return null;
  return await uploadMedia(file, bucket, folder);
}

// Generate a thumbnail/preview URL for videos (uses the video itself as preview)
function getMediaPreviewUrl(url) {
  if (!url) return null;
  // For Supabase storage URLs, return as-is
  return url;
}

// Check if a URL is a video
function isVideoUrl(url) {
  if (!url) return false;
  const ext = url.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
}

// Check if a URL is an image
function isImageUrl(url) {
  if (!url) return false;
  const ext = url.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}
