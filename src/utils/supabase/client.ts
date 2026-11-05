// Re-export the existing singleton Supabase client
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const createClient = () => supabase;
export { supabase, isSupabaseConfigured };
export default supabase;

