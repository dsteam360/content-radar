type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "YOUTUBE_API_KEY"
  | "CRON_SECRET";

function readEnvValue(key: EnvKey, context: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable ${key} for ${context}.`);
  }

  return value;
}

export function getPublicEnv() {
  return {
    supabaseUrl: readEnvValue("NEXT_PUBLIC_SUPABASE_URL", "public Supabase client"),
    supabaseAnonKey: readEnvValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "public Supabase client"
    ),
  };
}

export function getYoutubeEnv() {
  return {
    youtubeApiKey: readEnvValue("YOUTUBE_API_KEY", "YouTube API requests"),
  };
}

export function getSupabaseAdminEnv() {
  const publicEnv = getPublicEnv();

  return {
    ...publicEnv,
    serviceRoleKey: readEnvValue(
      "SUPABASE_SERVICE_ROLE_KEY",
      "server-side snapshot persistence"
    ),
  };
}

export function getCronEnv() {
  return {
    cronSecret: readEnvValue("CRON_SECRET", "scheduled radar refresh"),
  };
}
