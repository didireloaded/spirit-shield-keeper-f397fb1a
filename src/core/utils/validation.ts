/**
 * Input Validation Utilities
 * Centralized validation for user inputs
 */

// ============= Geo Validation =============

export function isValidLatitude(lat: number): boolean {
  return typeof lat === "number" && !isNaN(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return typeof lng === "number" && !isNaN(lng) && lng >= -180 && lng <= 180;
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

// ============= String Validation =============

export function isValidUUID(id: string): boolean {
  if (typeof id !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (typeof phone !== "string") return false;
  // Basic phone validation - at least 10 digits
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

// ============= Text Sanitization =============

const MAX_TEXT_LENGTH = 5000;
const MAX_SHORT_TEXT_LENGTH = 500;

/**
 * Sanitize and trim text input
 */
export function sanitizeText(text: string, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}

/**
 * Sanitize short text (names, titles, etc.)
 */
export function sanitizeShortText(text: string): string {
  return sanitizeText(text, MAX_SHORT_TEXT_LENGTH);
}

/**
 * Remove potentially dangerous characters from text
 */
export function sanitizeForDisplay(text: string): string {
  if (typeof text !== "string") return "";
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

// ============= URL Validation =============

export function isValidUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const lowercaseUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}

// ============= Number Validation =============

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && value > 0;
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && value >= 0;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============= Form Validation Helpers =============

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationError | null {
  if (value === null || value === undefined || value === "") {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): ValidationError | null {
  if (typeof value === "string" && value.trim().length < minLength) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be at least ${minLength} characters` 
    };
  }
  return null;
}

export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string
): ValidationError | null {
  if (typeof value === "string" && value.length > maxLength) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be less than ${maxLength} characters` 
    };
  }
  return null;
}
