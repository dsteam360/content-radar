import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/app/lib/env";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
