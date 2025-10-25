import { createClient } from "@supabase/supabase-js";

// Prefer environment variables when present (CRA requires REACT_APP_ prefix)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://hckwulwucbvxlslltoxy.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja3d1bHd1Y2J2eGxzbGx0b3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NTAzNDgsImV4cCI6MjA3MTAyNjM0OH0.KYxlt0cqQb65o8_hYy4vtGtCb9lJwt39aCqRHSifEjk";

// Basic sanity warning in dev
if (process.env.NODE_ENV !== 'production') {
	const looksValid = typeof supabaseUrl === 'string' && /^https?:\/\/.*supabase\.co/.test(supabaseUrl);
	if (!looksValid) {
		// eslint-disable-next-line no-console
		console.warn('[Supabase config] REACT_APP_SUPABASE_URL may be invalid:', supabaseUrl);
	}
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const SUPABASE_URL_EFFECTIVE = supabaseUrl;
export default supabase;
