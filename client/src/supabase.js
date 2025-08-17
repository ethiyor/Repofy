import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hckwulwucbvxlslltoxy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3d1bHd1Y2J2eGxzbGx0b3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NTAzNDgsImV4cCI6MjA3MTAyNjM0OH0.KYxlt0cqQb65o8_hYy4vtGtCb9lJwt39aCqRHSifEjk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
