import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage, validateImage } from "@/lib/imageUtils";
import { trackPerformance } from "@/lib/monitoring";
import { toast } from "sonner";

interface UsePhotoUploadOptions {
  bucket: "outfit-photos" | "post-images" | "profile-photos";
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export const usePhotoUpload = ({ bucket, onSuccess, onError }: UsePhotoUploadOptions) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadPhoto = async (file: File) => {
    if (!user) {
      onError?.(new Error("Not authenticated"));
      return null;
    }

    // Validate first
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.reason || "Invalid image");
      onError?.(new Error(validation.reason));
      return null;
    }

    setUploading(true);

    try {
      // Compress image before upload
      const compressed = await trackPerformance("image-compression", () =>
        compressImage(file)
      );

      console.log(
        `Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`
      );

      // Create preview
      const preview = URL.createObjectURL(compressed);
      setPreviewUrl(preview);

      // Generate unique filename
      const fileName = `${user.id}/${Date.now()}.jpeg`;

      // Upload compressed image
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressed, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const url = urlData.publicUrl;
      setPhotoUrl(url);
      onSuccess?.(url);
      return url;
    } catch (error) {
      console.error("Upload error:", error);
      onError?.(error as Error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const selectAndUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await uploadPhoto(file);
      }
    };
    
    input.click();
  };

  const clearPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPhotoUrl(null);
    setPreviewUrl(null);
  };

  return {
    uploading,
    photoUrl,
    previewUrl,
    uploadPhoto,
    selectAndUpload,
    clearPhoto,
  };
};
