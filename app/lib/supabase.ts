import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://amnzimvyykspxheuznin.supabase.co";
const supabaseAnonKey = "sb_publishable_RVEn6-p7D09UIg4D58KuXQ_1g9nvK37";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);