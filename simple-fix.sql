-- Simple fix for missing teacher_id column
-- Run this step by step in Supabase SQL Editor

-- Step 1: Drop and recreate rooms table
DROP TABLE IF EXISTS rooms CASCADE;

-- Step 2: Create rooms table with teacher_id
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Step 3: Verify the table was created correctly
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
AND table_schema = 'public'
ORDER BY ordinal_position;
