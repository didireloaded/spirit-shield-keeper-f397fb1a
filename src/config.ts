// Centralized configuration file

// Environment variables
export const config = {
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};

// Feature flags
export const features = {
  ENABLE_THREAT_DETECTION: true,
  ENABLE_NOTIFICATIONS: true,
};

export default { config, features };