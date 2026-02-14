/**
 * Optimized image component with lazy loading and fallback
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

export function OptimizedImage({
  src,
  alt,
  className,
  fallback = "/placeholder.svg",
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgSrc(fallback);
          setIsLoading(false);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}

export default OptimizedImage;
