function requireEnvValue(value: string | undefined, key: string, context: string) {
  if (!value) {
    throw new Error(`Missing required environment variable ${key} for ${context}.`);
  }

  return value;
}

export function getPublicEnv() {
  return {
    supabaseUrl: requireEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
      "public Supabase client"
    ),
    supabaseAnonKey: requireEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "public Supabase client"
    ),
  };
}

export function getYoutubeEnv() {
  return {
    youtubeApiKey: requireEnvValue(
      process.env.YOUTUBE_API_KEY,
      "YOUTUBE_API_KEY",
      "YouTube API requests"
    ),
  };
}

export function getSupabaseAdminEnv() {
  const publicEnv = getPublicEnv();

  return {
    ...publicEnv,
    serviceRoleKey: requireEnvValue(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
      "server-side snapshot persistence"
    ),
  };
}

export function getCronEnv() {
  return {
    cronSecret: requireEnvValue(
      process.env.CRON_SECRET,
      "CRON_SECRET",
      "scheduled radar refresh"
    ),
  };
}
