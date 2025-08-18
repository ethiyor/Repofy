// Test script to add sample profile data for debugging
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addSampleProfileData() {
  try {
    console.log("Fetching existing profiles...");
    
    // Get all existing user profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("*");
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }
    
    console.log("Found profiles:", profiles);
    
    if (profiles && profiles.length > 0) {
      // Update the first profile with sample data
      const profileToUpdate = profiles[0];
      console.log("Updating profile:", profileToUpdate.user_id);
      
      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .update({
          bio: "I'm a passionate developer who loves building amazing web applications with React and Node.js! 🚀",
          location: "San Francisco, CA",
          website: "https://myawesome-portfolio.com"
        })
        .eq("user_id", profileToUpdate.user_id)
        .select();
        
      if (error) {
        console.error("Error updating profile:", error);
      } else {
        console.log("Successfully updated profile:", data);
      }
    }
    
    // If there are multiple profiles, update the second one too
    if (profiles && profiles.length > 1) {
      const secondProfile = profiles[1];
      console.log("Updating second profile:", secondProfile.user_id);
      
      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .update({
          bio: "Full-stack developer specializing in modern JavaScript frameworks. Always learning something new! 📚",
          location: "New York, NY",
          website: "https://github.com/myusername"
        })
        .eq("user_id", secondProfile.user_id)
        .select();
        
      if (error) {
        console.error("Error updating second profile:", error);
      } else {
        console.log("Successfully updated second profile:", data);
      }
    }
    
  } catch (err) {
    console.error("Error in script:", err);
  }
}

addSampleProfileData();
