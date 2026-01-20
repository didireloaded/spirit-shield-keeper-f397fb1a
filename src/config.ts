// Centralized configuration file

// Environment variables - using Vite's import.meta.env
export const config = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID ?? '',
};

// Feature flags
export const features = {
  ENABLE_THREAT_DETECTION: true,
  ENABLE_NOTIFICATIONS: true,
};

export default { config, features };
