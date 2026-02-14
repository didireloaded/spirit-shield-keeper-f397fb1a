/**
 * Image Utilities
 * Validation, compression, and hashing for uploads
 */

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImage(file: File): {
  valid: boolean;
  reason?: string;
} {
  if (file.size > MAX_SIZE) {
    return { valid: false, reason: 'Image is too large. Maximum size is 10MB.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, reason: 'Invalid image type. Please use JPG, PNG, or WebP.' };
  }
  return { valid: true };
}

/**
 * Compress image before upload — reduces data usage (critical for Namibia)
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback to original
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Hash image to detect duplicates (prevent spam)
 */
export async function getImageHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
