/**
 * Accessibility utility components
 * Skip-to-main, IconButton, FormField, LiveRegion
 */

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

/** Skip to main content link (rendered at top of app) */
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold"
    >
      Skip to main content
    </a>
  );
}

/** Accessible icon button with aria-label */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = "ghost",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: "ghost" | "primary" | "destructive";
  className?: string;
}) {
  const variants = {
    ghost: "hover:bg-muted",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn("p-3 rounded-xl transition-colors", variants[variant], className)}
    >
      <Icon className="w-5 h-5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Accessible form field with error & help text */
export function FormField({
  id,
  label,
  type = "text",
  required = false,
  error,
  helpText,
  className,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  helpText?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      <input
        id={id}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        className={cn(
          "w-full px-4 py-3 bg-muted rounded-xl focus:outline-none focus:ring-2",
          error ? "focus:ring-destructive border-2 border-destructive" : "focus:ring-primary"
        )}
        {...props}
      />

      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {helpText && !error && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
}

/** Screen reader live announcements */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
