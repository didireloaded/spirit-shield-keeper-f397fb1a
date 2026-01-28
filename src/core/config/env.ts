/**
 * Environment Configuration
 * Validates and exports environment variables
 */

const REQUIRED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

const OPTIONAL_ENV_VARS = [
  "VITE_SUPABASE_PROJECT_ID",
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];
type OptionalEnvVar = typeof OPTIONAL_ENV_VARS[number];

/**
 * Validate that all required environment variables are set
 * Call this early in the app lifecycle (main.tsx)
 */
export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    const value = import.meta.env[key];
    if (!value || value === "") {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.error(
      `[Config] Missing required environment variables: ${missing.join(", ")}. ` +
      `The app may not function correctly.`
    );
  }
}

/**
 * Get a required environment variable (throws if missing)
 */
export function getRequiredEnv(key: RequiredEnvVar): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default
 */
export function getOptionalEnv(key: OptionalEnvVar | RequiredEnvVar, defaultValue = ""): string {
  return import.meta.env[key] || defaultValue;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Exported environment configuration
 */
export const env = {
  supabaseUrl: getOptionalEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: getOptionalEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  supabaseProjectId: getOptionalEnv("VITE_SUPABASE_PROJECT_ID"),
  isDev: isDevelopment(),
  isProd: isProduction(),
} as const;
