import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://iuokwsairrwedmivrtyz.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1b2t3c2FpcnJ3ZWRtaXZydHl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkzMjMzMywiZXhwIjoyMDY2NTA4MzMzfQ.jN1x15VcUNIP82ihwPH6mBd0JCAX4pRyiDklwmIrvAk");
export default supabase;
