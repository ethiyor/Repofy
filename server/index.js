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

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ error: "No token provided" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(403).json({ error: "Unauthorized" });

  req.user = data.user;
  next();
}

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.get("/repos", checkAuth, async (req, res) => {
  // Get all public repos, plus the user's own private repos
  const { data, error } = await supabase
    .from("repos")
    .select("*")
    .or(`is_public.eq.true,user_id.eq.${req.user.id}`);

  if (error) return res.status(500).send(error.message);
  res.json(data);
});

app.post("/repos", checkAuth, async (req, res) => {
  const { name, description, is_public = false, tags = [] } = req.body;

  // Ensure is_public is a boolean
  const publicValue = typeof is_public === "string" ? is_public === "true" : !!is_public;
  console.log('Creating repo with is_public:', publicValue);

  const { data, error } = await supabase
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
  const { data: repo, error: repoError } = await supabase
    .from("repos")
    .select("user_id")
    .eq("id", repo_id)
    .single();

  if (repoError) return res.status(500).json({ error: repoError.message });
  if (!repo || repo.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabase
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
  const { data: repo, error: repoError } = await supabase
    .from("repos")
    .select("is_public, user_id")
    .eq("id", id)
    .single();

  if (repoError) return res.status(500).json({ error: repoError.message });
  if (!repo) return res.status(404).json({ error: "Repo not found" });

  if (!repo.is_public && repo.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("repo_id", id);

  if (error) return res.status(500).send(error.message);
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
