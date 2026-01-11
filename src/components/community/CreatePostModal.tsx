import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUrl?: string, locationLabel?: string) => Promise<{ error: any }>;
}

export const CreatePostModal = ({
  isOpen,
  onClose,
  onSubmit,
}: CreatePostModalProps) => {
  const [content, setContent] = useState("");
  const [shareLocation, setShareLocation] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { latitude, longitude } = useGeolocation();

  const {
    uploading,
    previewUrl,
    photoUrl,
    selectAndUpload,
    clearPhoto,
  } = usePhotoUpload({
    bucket: "post-images",
    onError: () => toast.error("Failed to upload image"),
  });

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }

    setIsSubmitting(true);
    const { error } = await onSubmit(
      content.trim(),
      photoUrl || undefined,
      shareLocation && locationLabel ? locationLabel : undefined
    );

    if (!error) {
      setContent("");
      clearPhoto();
      setShareLocation(false);
      setLocationLabel("");
      onClose();
    }
    setIsSubmitting(false);
  };

  const handleLocationToggle = (checked: boolean) => {
    setShareLocation(checked);
    if (checked && latitude && longitude) {
      // Simple location label - in production, use reverse geocoding
      setLocationLabel("Your current area");
    } else {
      setLocationLabel("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create Post</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <Textarea
                placeholder="What's happening in your community?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32 resize-none bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {content.length}/1000
              </p>

              {/* Image Preview */}
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 py-2">
                <button
                  onClick={selectAndUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Image className="w-5 h-5" />
                  <span>Photo</span>
                </button>
              </div>

              {/* Location Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="share-location" className="text-sm">
                    Share location
                  </Label>
                </div>
                <Switch
                  id="share-location"
                  checked={shareLocation}
                  onCheckedChange={handleLocationToggle}
                />
              </div>
              {shareLocation && locationLabel && (
                <p className="text-xs text-muted-foreground pl-7">
                  Will share: {locationLabel}
                </p>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting || uploading}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
