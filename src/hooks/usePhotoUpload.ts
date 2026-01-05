import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

    setUploading(true);

    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
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
