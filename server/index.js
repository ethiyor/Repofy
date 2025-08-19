import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 4000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create a separate client for server operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  console.log('Auth token received:', token ? 'Yes' : 'No');
  
  if (!token) return res.status(403).json({ error: "No token provided" });

  const { data, error } = await supabase.auth.getUser(token);
  console.log('Auth check result:', { userId: data?.user?.id, error: error?.message });
  
  if (error || !data?.user) return res.status(403).json({ error: "Unauthorized" });

  req.user = data.user;
  next();
}

app.post("/signup", async (req, res) => {
  const { email, password, username } = req.body;
  
  // Validate username if provided
  if (username) {
    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, and hyphens" });
    }
    
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("user_profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .single();
      
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }
  }

  // Email signup
  const signUpData = { 
    email, 
    password,
    options: {
      data: {
        username: username ? username.trim() : null,
        display_name: username ? username.trim() : null
      }
    }
  };

  const { data, error } = await supabase.auth.signUp(signUpData);
  
  if (error) return res.status(400).json({ error: error.message });
  
  res.json(data);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Check username availability
app.get("/check-username/:username", async (req, res) => {
  const { username } = req.params;
  
  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long" });
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, and hyphens" });
  }
  
  const { data: existingUser, error } = await supabaseAdmin
    .from("user_profiles")
    .select("username")
    .eq("username", username.toLowerCase())
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    return res.status(500).json({ error: "Database error" });
  }
  
  const available = !existingUser;
  res.json({ available, username: username.toLowerCase() });
});

// Get user profile
app.get("/profile", checkAuth, async (req, res) => {
  // Ensure user has a profile
  await ensureUserProfile(req.user);

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", req.user.id)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data || { user_id: req.user.id, email: req.user.email });
});

// Get public user profile by user ID
app.get("/profile/:userId", checkAuth, async (req, res) => {
  const { userId } = req.params;
  console.log("Getting public profile for userId:", userId);
  
  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, username, display_name, bio, website, location, created_at, avatar_url")
      .eq("user_id", userId)
      .single();
      
    console.log("Database query result:", { data, error });
      
    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    
    if (!data) {
      // If no profile exists, try to get basic info from repos and create a fallback profile
      console.log("No profile found, checking repos for user info");
      
      const { data: repos, error: reposError } = await supabaseAdmin
        .from("repos")
        .select("user_id")
        .eq("user_id", userId)
        .limit(1);
        
      if (reposError) {
        console.error("Error checking repos:", reposError);
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!repos || repos.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create a basic fallback profile
      const fallbackProfile = {
        user_id: userId,
        username: 'user_' + userId.substring(0, 8),
        display_name: 'User ' + userId.substring(0, 8),
        bio: null,
        website: null,
        location: null,
        avatar_url: null,
        created_at: new Date().toISOString()
      };
      
      console.log("Sending fallback profile data:", fallbackProfile);
      return res.json(fallbackProfile);
    }
    
    // Don't include email in public profile for privacy
    console.log("Sending profile data:", data);
    console.log("Profile bio in backend:", data.bio);
    console.log("Profile location in backend:", data.location);
    console.log("Profile website in backend:", data.website);
    res.json(data);
  } catch (err) {
    console.error("Error in public profile endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update user profile
app.post("/profile", checkAuth, async (req, res) => {
  const { username, display_name, bio, website, location, avatar_url } = req.body;
  
  // Validate username if provided
  if (username) {
    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, and hyphens" });
    }
    
    // Check if username is taken by another user
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("username", username.toLowerCase())
      .neq("user_id", req.user.id)
      .single();
      
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }
  }

  try {
    // Try to update first
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        username: username?.toLowerCase(),
        display_name: display_name,
        bio: bio,
        website: website,
        location: location,
        avatar_url: avatar_url
      })
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      // Handle email and GitHub users
      let fallbackUsername;
      if (req.user.user_metadata?.user_name) {
        // GitHub user - use GitHub username
        fallbackUsername = req.user.user_metadata.user_name;
      } else if (req.user.email) {
        fallbackUsername = req.user.email.split('@')[0];
      } else {
        fallbackUsername = 'user';
      }
        
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from("user_profiles")
        .insert([{
          user_id: req.user.id,
          username: username?.toLowerCase() || fallbackUsername.toLowerCase(),
          display_name: display_name || username || fallbackUsername,
          email: req.user.email || null,
          bio: bio,
          website: website,
          location: location,
          avatar_url: avatar_url
        }])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      return res.json(insertData);
    } else if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json(updateData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload profile picture
app.post("/profile/avatar", checkAuth, async (req, res) => {
  const { avatar_data } = req.body;
  
  if (!avatar_data) {
    return res.status(400).json({ error: "No avatar data provided" });
  }
  
  // Validate that it's a base64 image
  if (!avatar_data.startsWith('data:image/')) {
    return res.status(400).json({ error: "Invalid image format" });
  }
  
  // Check base64 data size (roughly 4/3 of original file size)
  const sizeInBytes = (avatar_data.length * 3) / 4;
  if (sizeInBytes > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({ error: "Image too large. Please use an image smaller than 10MB." });
  }
  
  try {
    // Update the user's avatar_url in the database
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        avatar_url: avatar_data
      })
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // Profile doesn't exist, create it with avatar
      let fallbackUsername;
      if (req.user.user_metadata?.user_name) {
        // GitHub user - use GitHub username
        fallbackUsername = req.user.user_metadata.user_name;
      } else if (req.user.email) {
        fallbackUsername = req.user.email.split('@')[0];
      } else {
        fallbackUsername = 'user';
      }
        
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from("user_profiles")
        .insert([{
          user_id: req.user.id,
          username: fallbackUsername.toLowerCase(),
          display_name: fallbackUsername,
          email: req.user.email || null,
          avatar_url: avatar_data
        }])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      return res.json(insertData);
    } else if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json(updateData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user profile and account
app.delete("/profile", checkAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user's repositories first (this will cascade delete files)
    const { error: reposError } = await supabaseAdmin
      .from("repos")
      .delete()
      .eq("user_id", userId);

    if (reposError) {
      console.error("Error deleting user repos:", reposError);
      // Continue with profile deletion even if repos deletion fails
    }

    // Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
      // Continue with user deletion even if profile deletion fails
    }

    // Delete the actual user account from auth.users
    const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (userError) {
      return res.status(500).json({ error: "Failed to delete user account: " + userError.message });
    }

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/repos", checkAuth, async (req, res) => {
  try {
    // First, ensure the current user has a profile
    await ensureUserProfile(req.user);

    // Get all public repos, plus the user's own private repos
    const { data: repos, error: reposError } = await supabaseAdmin
      .from("repos")
      .select("*")
      .or(`is_public.eq.true,user_id.eq.${req.user.id}`);

    if (reposError) throw reposError;

    // Get all user profiles to match with repos
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, username, display_name, avatar_url");

    // If user_profiles table doesn't exist yet, just return repos with fallback names
    if (profilesError && profilesError.code === '42P01') {
      // Table doesn't exist, return repos with email-based usernames
      const enrichedData = repos.map(repo => ({
        ...repo,
        username: 'user_' + repo.user_id.substring(0, 8),
        display_name: 'User ' + repo.user_id.substring(0, 8),
        avatar_url: null
      }));
      return res.json(enrichedData);
    }

    if (profilesError) throw profilesError;

    // Create a map of user_id to profile for quick lookup
    const profileMap = {};
    if (profiles) {
      profiles.forEach(profile => {
        profileMap[profile.user_id] = profile;
      });
    }

    // Enrich repos with user profile data
    const enrichedData = repos.map(repo => {
      const profile = profileMap[repo.user_id];
      return {
        ...repo,
        username: profile?.username || 'user_' + repo.user_id.substring(0, 8),
        display_name: profile?.display_name || profile?.username || 'User ' + repo.user_id.substring(0, 8),
        avatar_url: profile?.avatar_url || null
      };
    });
    
    res.json(enrichedData);
  } catch (err) {
    console.error('Error fetching repos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to ensure user has a profile
async function ensureUserProfile(user) {
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // If table doesn't exist, just return (user will see fallback usernames)
    if (checkError && checkError.code === '42P01') {
      console.log('user_profiles table does not exist yet');
      return;
    }

    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create one
      let fallbackUsername;
      if (user.user_metadata?.user_name) {
        // GitHub user - use GitHub username
        fallbackUsername = user.user_metadata.user_name;
      } else if (user.email) {
        fallbackUsername = user.email.split('@')[0];
      } else {
        fallbackUsername = 'user';
      }
      
      const username = user.user_metadata?.username || fallbackUsername;
      const display_name = user.user_metadata?.display_name || user.user_metadata?.full_name || username;

      const { error: insertError } = await supabaseAdmin
        .from("user_profiles")
        .insert([{
          user_id: user.id,
          username: username.toLowerCase(),
          display_name: display_name,
          email: user.email || null
        }]);

      if (insertError) {
        console.error('Error creating user profile:', insertError);
      } else {
        console.log(`Created profile for user: ${user.email}`);
      }
    }
  } catch (err) {
    console.error('Error in ensureUserProfile:', err);
  }
}

app.post("/repos", checkAuth, async (req, res) => {
  const { name, description, is_public = false, tags = [] } = req.body;

  // Ensure user has a profile
  await ensureUserProfile(req.user);

  // Ensure is_public is a boolean
  const publicValue = typeof is_public === "string" ? is_public === "true" : !!is_public;
  console.log('Creating repo with is_public:', publicValue);

  const { data, error } = await supabaseAdmin
    .from("repos")
    .insert([{ name, description, user_id: req.user.id, is_public: publicValue, tags }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/upload", checkAuth, async (req, res) => {
  const { name, content, repo_id } = req.body;
  if (!repo_id) return res.status(400).json({ error: "Missing repo_id" });

  // Verify ownership
  const { data: repo, error: repoError } = await supabaseAdmin
    .from("repos")
    .select("user_id")
    .eq("id", repo_id)
    .single();

  if (repoError) return res.status(500).json({ error: repoError.message });
  if (!repo || repo.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabaseAdmin
    .from("files")
    .insert([{ name, content, repo_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, file: data });
});

app.get("/repos/:id/files", checkAuth, async (req, res) => {
  const { id } = req.params;

  // Check if repo is public or owned by user
  const { data: repo, error: repoError } = await supabaseAdmin
    .from("repos")
    .select("is_public, user_id")
    .eq("id", id)
    .single();

  if (repoError) return res.status(500).json({ error: repoError.message });
  if (!repo) return res.status(404).json({ error: "Repo not found" });

  if (!repo.is_public && repo.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("repo_id", id);

  if (error) return res.status(500).send(error.message);
  res.json(data);
});

// Delete a repository
app.delete("/repos/:id", checkAuth, async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { data: repo, error: repoError } = await supabaseAdmin
    .from("repos")
    .select("user_id")
    .eq("id", id)
    .single();

  if (repoError) return res.status(500).json({ error: repoError.message });
  if (!repo || repo.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Delete the repository (files will be deleted automatically due to cascade)
  const { error } = await supabaseAdmin
    .from("repos")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Star a repository (simplified version)
app.post("/repos/:id/star", checkAuth, async (req, res) => {
  const { id } = req.params;

  // For now, just return success (implement proper starring logic later)
  res.json({ success: true, message: "Starred successfully" });
});

// Admin endpoint to create profiles for existing users (temporary)
app.post("/admin/create-missing-profiles", async (req, res) => {
  try {
    // Get all users from auth.users who don't have profiles
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    let created = 0;
    let errors = 0;

    for (const user of users.users) {
      try {
        // Check if profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!existingProfile) {
          // Create profile
          let fallbackUsername;
          if (user.user_metadata?.user_name) {
            // GitHub user - use GitHub username
            fallbackUsername = user.user_metadata.user_name;
          } else if (user.email) {
            fallbackUsername = user.email.split('@')[0];
          } else {
            fallbackUsername = 'user';
          }
          
          const username = user.user_metadata?.username || fallbackUsername;
          const display_name = user.user_metadata?.display_name || user.user_metadata?.full_name || username;

          const { error: insertError } = await supabaseAdmin
            .from("user_profiles")
            .insert([{
              user_id: user.id,
              username: username.toLowerCase(),
              display_name: display_name,
              email: user.email || null
            }]);

          if (!insertError) {
            created++;
            console.log(`Created profile for: ${user.email}`);
          } else {
            errors++;
            console.error(`Failed to create profile for ${user.email}:`, insertError);
          }
        }
      } catch (err) {
        errors++;
        console.error(`Error processing user ${user.email}:`, err);
      }
    }

    res.json({ 
      message: `Created ${created} profiles, ${errors} errors`,
      created,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === COMMENT ENDPOINTS ===

// Get comments for a repository
app.get("/repos/:id/comments", checkAuth, async (req, res) => {
  const { id } = req.params;

  console.log("GET /repos/:id/comments called with id:", id);

  try {
    const { data, error } = await supabaseAdmin
      .from("comments")
      .select(`
        *,
        user_profiles (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("repo_id", parseInt(id)) // Convert to integer since repo_id is BIGINT
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }

    console.log("Comments fetched successfully:", data?.length || 0, "comments found");

    // Format comments with user information
    const formattedComments = data.map(comment => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user_id: comment.user_id,
      username: comment.user_profiles?.username || 'unknown',
      display_name: comment.user_profiles?.display_name || comment.user_profiles?.username || 'Unknown User',
      avatar_url: comment.user_profiles?.avatar_url
    }));

    res.json(formattedComments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments", details: err.message });
  }
});

// Add a comment to a repository
app.post("/repos/:id/comments", checkAuth, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  console.log("POST /repos/:id/comments called with:", { id, content, userId: req.user.id });

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  try {
    // First verify the repository exists
    const { data: repo, error: repoError } = await supabaseAdmin
      .from("repos")
      .select("id")
      .eq("id", id)
      .single();

    if (repoError || !repo) {
      console.error("Repository not found:", repoError);
      return res.status(404).json({ error: "Repository not found" });
    }

    console.log("Repository found, inserting comment...");

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert([{
        repo_id: parseInt(id), // Convert to integer since repo_id is BIGINT
        user_id: req.user.id,
        content: content.trim()
      }])
      .select()
      .single();

    if (error) {
      console.error("Error inserting comment:", error);
      throw error;
    }

    console.log("Comment inserted successfully:", data);
    res.json({ message: "Comment added successfully", comment: data });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment", details: err.message });
  }
});

// Delete a comment
app.delete("/repos/:repoId/comments/:commentId", checkAuth, async (req, res) => {
  const { commentId } = req.params;

  console.log("DELETE /repos/:repoId/comments/:commentId called with:", { commentId, userId: req.user.id });

  try {
    // First check if the comment belongs to the user
    const { data: comment, error: fetchError } = await supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .single();

    if (fetchError) {
      console.error("Error fetching comment for deletion:", fetchError);
      throw fetchError;
    }

    if (comment.user_id !== req.user.id) {
      console.log("User not authorized to delete comment");
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }

    console.log("Comment deleted successfully");
    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Failed to delete comment", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
