-- SQL script to create user_profiles table in Supabase
-- Execute this in your Supabase SQL editor

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON user_profiles(username);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow users to read all profiles (for public profile viewing)
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username, display_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a comment to the table
COMMENT ON TABLE user_profiles IS 'Extended user profile information';

-- Create comments table for repository comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repo_id BIGINT REFERENCES repos(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for comments table
CREATE INDEX IF NOT EXISTS comments_repo_id_idx ON comments(repo_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);

-- Enable Row Level Security (RLS) for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
-- Allow everyone to read comments
CREATE POLICY "Comments are viewable by everyone" ON comments
    FOR SELECT USING (true);

-- Allow authenticated users to insert comments
CREATE POLICY "Authenticated users can insert comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at for comments
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to the comments table
COMMENT ON TABLE comments IS 'Repository comments from users';

-- Ensure repos table exists (core repository metadata)
CREATE TABLE IF NOT EXISTS repos (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    star_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for repos
CREATE INDEX IF NOT EXISTS repos_user_id_idx ON repos(user_id);
CREATE INDEX IF NOT EXISTS repos_public_idx ON repos(is_public);
CREATE INDEX IF NOT EXISTS repos_created_at_idx ON repos(created_at);

-- Update trigger for repos.updated_at
CREATE OR REPLACE FUNCTION update_repos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_repos_updated_at ON repos;
CREATE TRIGGER update_repos_updated_at
    BEFORE UPDATE ON repos
    FOR EACH ROW EXECUTE FUNCTION update_repos_updated_at();

-- Ensure files table exists with path support for folder structures
CREATE TABLE IF NOT EXISTS files (
    id BIGSERIAL PRIMARY KEY,
    repo_id BIGINT REFERENCES repos(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    path TEXT, -- directory path like 'src/components'
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add path column if table already exists but lacks it
ALTER TABLE IF EXISTS files ADD COLUMN IF NOT EXISTS path TEXT;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS files_repo_id_idx ON files(repo_id);
CREATE INDEX IF NOT EXISTS files_repo_path_idx ON files(repo_id, path);
CREATE INDEX IF NOT EXISTS files_created_at_idx ON files(created_at);

-- Enable RLS on files and add policies
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow reading files for public repos or owners via RPC context (simplified: open read; app enforces access)
DO $$ BEGIN
    CREATE POLICY files_read_all ON files FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only allow inserts/updates/deletes by the owner via app-side checks; keep DB permissive but audited
-- If stricter DB policies are desired, implement with joins to repos and auth.uid()

-- Update trigger for files.updated_at
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_files_updated_at();
