/**
 * Error Message Components
 * Consistent error display across the app
 */

import { AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
  variant?: "inline" | "card" | "full";
}

/**
 * Standard error message component
 */
export function ErrorMessage({
  message = "Something went wrong. Please try again.",
  title = "Error",
  onRetry,
  className,
  variant = "card",
}: ErrorMessageProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-destructive text-sm", className)}>
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="underline hover:no-underline ml-1"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("min-h-[60vh] flex items-center justify-center p-4", className)}>
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div
      className={cn(
        "bg-destructive/10 border border-destructive/20 rounded-xl p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="mt-2 -ml-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Network error message
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      title="Connection Error"
      message="Unable to connect. Please check your internet connection."
      onRetry={onRetry}
    />
  );
}

/**
 * Permission error message
 */
export function PermissionError() {
  return (
    <ErrorMessage
      title="Access Denied"
      message="You don't have permission to view this content."
    />
  );
}

/**
 * Empty state with error styling
 */
export function NotFoundError({ 
  message = "The requested content could not be found.",
}: { 
  message?: string;
}) {
  return (
    <ErrorMessage
      title="Not Found"
      message={message}
      variant="full"
    />
  );
}

export default ErrorMessage;
