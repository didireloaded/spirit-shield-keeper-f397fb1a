/**
 * Supabase API Helpers
 * Type-safe utilities for database operations
 */

import type { PostgrestError } from "@supabase/supabase-js";

// ============= Query Result Types =============
export interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  loading: boolean;
}

export interface MutationResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

// ============= Error Handling =============
const ERROR_MESSAGES: Record<string, string> = {
  // Postgres errors
  "PGRST116": "No data found",
  "23505": "This record already exists",
  "23503": "Referenced record does not exist",
  "42501": "Permission denied",
  "42P01": "Table does not exist",
  "22P02": "Invalid input format",
  
  // Network/Auth errors
  "401": "Please sign in to continue",
  "403": "You don't have permission to do this",
  "404": "Resource not found",
  "429": "Too many requests. Please wait a moment.",
  "500": "Server error. Please try again.",
  "503": "Service temporarily unavailable",
  
  // RLS errors
  "42703": "Access denied",
  "PGRST301": "You don't have permission to access this data",
};

/**
 * Convert a PostgrestError to a user-friendly message
 */
export function handleQueryError(error: PostgrestError | null): string {
  if (!error) return "";
  
  // Check for specific error codes
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  // Check for HTTP status codes in the message
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.message.includes(code)) {
      return message;
    }
  }
  
  // Fallback to generic message
  return "An unexpected error occurred. Please try again.";
}

/**
 * Log error details for debugging (not shown to users)
 */
export function logQueryError(
  error: PostgrestError | null,
  context?: Record<string, unknown>
): void {
  if (!error) return;
  
  console.error("[Supabase Error]", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    ...context,
  });
}

// ============= Query Defaults =============
export const QUERY_LIMITS = {
  DEFAULT: 50,
  MAX: 100,
  ALERTS: 50,
  MARKERS: 100,
  COMMUNITY_POSTS: 30,
  NOTIFICATIONS: 50,
  MESSAGES: 50,
} as const;

export const STALE_TIMES = {
  SHORT: 10 * 1000, // 10 seconds
  MEDIUM: 30 * 1000, // 30 seconds
  LONG: 5 * 60 * 1000, // 5 minutes
  PROFILE: 10 * 60 * 1000, // 10 minutes
} as const;

// ============= Response Transformers =============

/**
 * Transform snake_case database response to camelCase
 */
export function toCamelCase<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  
  return result;
}

/**
 * Check if a query result is empty
 */
export function isEmpty<T>(data: T[] | null | undefined): boolean {
  return !data || data.length === 0;
}

/**
 * Safe array access with default
 */
export function safeArray<T>(data: T[] | null | undefined): T[] {
  return data ?? [];
}
