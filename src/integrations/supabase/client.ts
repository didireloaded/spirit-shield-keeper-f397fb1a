import { config } from "@/config";

const supabaseUrl = config.SUPABASE_URL;
const supabaseAnonKey = config.SUPABASE_ANON_KEY;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey);

export default supabaseClient;