import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rkisrejhoeizxephrily.supabase.co";
const supabaseAnonKey = "sb_publishable_JCRWdbZqa9q3BJMtCLZbOQ_DgQXRuIg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);