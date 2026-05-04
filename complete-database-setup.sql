-- Complete Database Setup for Whisper App
-- Run this in Supabase SQL Editor

-- Step 1: Enable UUID extension (if not enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Drop existing tables (fresh start)
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Step 3: Create rooms table
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Step 4: Create students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

-- Step 5: Create questions table
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  answer_content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered'))
);

-- Step 6: Create indexes for better performance
CREATE INDEX idx_rooms_teacher_id ON rooms(teacher_id);
CREATE INDEX idx_students_room_id ON students(room_id);
CREATE INDEX idx_questions_room_id ON questions(room_id);
CREATE INDEX idx_questions_student_id ON questions(student_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_created_at ON questions(created_at);

-- Step 7: Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for rooms
CREATE POLICY "Enable insert for all users" ON rooms
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON rooms
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON rooms
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON rooms
FOR DELETE USING (true);

-- Step 9: Create RLS policies for students
CREATE POLICY "Enable insert for all users" ON students
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON students
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON students
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON students
FOR DELETE USING (true);

-- Step 10: Create RLS policies for questions
CREATE POLICY "Enable insert for all users" ON questions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON questions
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON questions
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON questions
FOR DELETE USING (true);

-- Step 11: Verify all tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rooms', 'students', 'questions')
ORDER BY table_name;

-- Step 12: Verify all policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('rooms', 'students', 'questions')
ORDER BY tablename, policyname;
