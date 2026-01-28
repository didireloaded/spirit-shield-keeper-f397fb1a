/**
 * Core Utils Barrel Export
 */

export * from "./errors";
export { 
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isValidUUID,
  isValidEmail,
  isValidPhone,
  sanitizeText,
  sanitizeShortText,
  sanitizeForDisplay,
  isValidUrl,
  isValidImageUrl,
  isPositiveNumber,
  isNonNegativeNumber,
  clampNumber,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  type ValidationError as FormValidationError,
} from "./validation";
