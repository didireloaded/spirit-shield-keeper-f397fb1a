/**
 * Create Post Bottom Sheet
 * Per PDF: Bottom sheet opens, writes text, optional image, optional location, post
 * No full screen. No complexity.
 */

import { useState, useRef } from "react";
import { X, Image, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGeolocation } from "@/hooks/useGeolocation";

type PostType = "danger" | "warning" | "info";

const postTypes = [
  { type: "danger" as const, label: "Incident", className: "bg-destructive/10 text-destructive border-destructive/20" },
  { type: "warning" as const, label: "Suspicious", className: "bg-warning/10 text-warning border-warning/30" },
  { type: "info" as const, label: "General", className: "bg-primary/10 text-primary border-primary/20" },
];

interface CreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    content: string;
    type: PostType;
    image: File | null;
    isAnonymous: boolean;
    location: { lat: number; lng: number } | null;
  }) => Promise<void>;
  loading?: boolean;
}

export function CreatePostSheet({ 
  open, 
  onOpenChange, 
  onSubmit, 
  loading = false 
}: CreatePostSheetProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<PostType>("info");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachLocation, setAttachLocation] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { latitude, longitude } = useGeolocation();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    await onSubmit({
      content,
      type,
      image,
      isAnonymous,
      location: attachLocation && latitude && longitude 
        ? { lat: latitude, lng: longitude } 
        : null,
    });

    // Reset form
    setContent("");
    setType("info");
    clearImage();
    setIsAnonymous(false);
    setAttachLocation(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Create Post</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Post Type Selection */}
          <div className="flex gap-2 flex-wrap">
            {postTypes.map((item) => (
              <Badge
                key={item.type}
                variant="outline"
                onClick={() => setType(item.type)}
                className={`cursor-pointer py-2 px-3 transition-all ${
                  type === item.type
                    ? item.className
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {item.label}
              </Badge>
            ))}
          </div>

          {/* Content Input */}
          <Textarea
            placeholder="What's happening in your area?"
            className="min-h-[120px] resize-none rounded-xl border-border focus:ring-2 focus:ring-primary/20"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            data-testid="input-post-content"
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-40 object-cover rounded-xl"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 w-8 h-8 rounded-full"
                onClick={clearImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Attach Options */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="w-4 h-4" />
              Photo
            </Button>
            <Button 
              variant={attachLocation ? "default" : "outline"}
              className="rounded-xl gap-2"
              onClick={() => setAttachLocation(!attachLocation)}
            >
              <MapPin className="w-4 h-4" />
              Location {attachLocation && latitude ? "✓" : ""}
            </Button>
          </div>

          {/* Anonymous Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">
              Post anonymously
            </span>
          </label>

          {/* Submit Button */}
          <Button
            className="w-full h-12 rounded-xl mt-4"
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            data-testid="button-submit-post"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Post to Community
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
