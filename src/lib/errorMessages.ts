/**
 * User-Friendly Error Messages
 * Namibian-context aware, clear and actionable
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  NetworkError: 'No internet connection. Please check your data or WiFi.',
  TimeoutError: 'Request timed out. Please try again.',

  // Permission errors
  GeolocationPermissionDenied:
    'Location permission denied. Enable location in your device settings to use this feature.',
  NotificationPermissionDenied:
    "Notification permission denied. You won't receive alerts.",
  CameraPermissionDenied: 'Camera permission needed to take photos.',

  // Validation errors
  InvalidCoordinates: 'Invalid location. Please try moving to a different spot.',
  RateLimitExceeded: 'Too many requests. Please wait a moment and try again.',

  // Auth errors
  InvalidCredentials: 'Email or password is incorrect.',
  EmailAlreadyExists: 'An account with this email already exists.',
  WeakPassword: 'Password must be at least 8 characters long.',

  // Generic
  Unknown: 'Something went wrong. Please try again or contact support.',
};

export function getUserFriendlyError(error: any): string {
  // Check for specific error codes
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // Check error message patterns
  if (error?.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch'))
      return ERROR_MESSAGES.NetworkError;
    if (msg.includes('timeout')) return ERROR_MESSAGES.TimeoutError;
    if (msg.includes('permission')) return ERROR_MESSAGES.GeolocationPermissionDenied;
    if (msg.includes('rate limit')) return ERROR_MESSAGES.RateLimitExceeded;
    if (msg.includes('invalid login') || msg.includes('invalid credentials'))
      return ERROR_MESSAGES.InvalidCredentials;
    if (msg.includes('already registered') || msg.includes('already exists'))
      return ERROR_MESSAGES.EmailAlreadyExists;
  }

  return ERROR_MESSAGES.Unknown;
}
