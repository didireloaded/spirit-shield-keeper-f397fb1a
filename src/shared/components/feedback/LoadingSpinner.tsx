/**
 * Loading Spinner Component
 * Consistent loading indicator across the app
 */

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
  xl: "w-12 h-12 border-4",
};

export function LoadingSpinner({ 
  size = "md", 
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-muted-foreground/30 border-t-primary",
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || "Loading"}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

/**
 * Full page loading state
 */
export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

/**
 * Inline loading indicator for buttons/text
 */
export function InlineLoading({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export default LoadingSpinner;
