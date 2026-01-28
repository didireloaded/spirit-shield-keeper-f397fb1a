/**
 * Centralized Error Handling Utilities
 * User-friendly error messages and logging
 */

// ============= Error Types =============
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public isUserFacing: boolean = true
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NetworkError extends AppError {
  constructor(message = "Unable to connect. Please check your internet.") {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

// ============= Error Formatting =============
const USER_ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  "Failed to fetch": "Unable to connect. Please check your internet.",
  "NetworkError": "Network connection lost",
  "TypeError: Failed to fetch": "Unable to connect. Please check your internet.",
  "Load failed": "Unable to connect. Please check your internet.",
  
  // Auth errors
  "Invalid login credentials": "Incorrect email or password",
  "Email not confirmed": "Please verify your email address",
  "User already registered": "An account with this email already exists",
  "Password should be at least 6 characters": "Password must be at least 6 characters",
  
  // RLS/Permission errors
  "PGRST301": "You don't have permission to do this",
  "new row violates row-level security": "Permission denied",
  
  // Rate limiting
  "rate limit": "Too many requests. Please wait a moment.",
  "Too many requests": "Too many requests. Please wait a moment.",
  
  // Generic
  "PGRST116": "No data found",
  "23505": "This record already exists",
};

/**
 * Convert any error to a user-friendly message
 */
export function formatUserError(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";
  
  if (error instanceof AppError && error.isUserFacing) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Check against known error patterns
    for (const [pattern, message] of Object.entries(USER_ERROR_MESSAGES)) {
      if (error.message.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    }
    
    // If it looks like a technical error, hide it
    if (error.message.includes("undefined") || 
        error.message.includes("null") ||
        error.message.includes("TypeError") ||
        error.message.includes("ReferenceError")) {
      return "Something went wrong. Please try again.";
    }
  }
  
  // String errors
  if (typeof error === "string") {
    for (const [pattern, message] of Object.entries(USER_ERROR_MESSAGES)) {
      if (error.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    }
  }
  
  return "Something went wrong. Please try again.";
}

// ============= Error Logging =============

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Log errors consistently for debugging
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const timestamp = new Date().toISOString();
  
  if (error instanceof Error) {
    console.error(`[Error ${timestamp}]`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
      ...context,
    });
  } else {
    console.error(`[Error ${timestamp}]`, { error, ...context });
  }
  
  // Future: Send to monitoring service (Sentry, etc.)
}

/**
 * Wrap an async function with error logging
 */
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error, context);
    throw error;
  }
}

// ============= Retry Logic =============

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
  shouldRetry?: (error: unknown) => boolean;
}

const RETRYABLE_PATTERNS = [
  "Failed to fetch",
  "NetworkError",
  "Load failed",
  "503",
  "504",
  "timeout",
];

function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  
  if (error instanceof Error) {
    return RETRYABLE_PATTERNS.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    shouldRetry = isRetryableError,
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
