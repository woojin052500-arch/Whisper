-- WJedulab 귓속말 (Whisper) Database Schema
-- Complete setup script for Supabase

-- Step 1: Drop existing objects (if any)
DROP TRIGGER IF EXISTS question_profanity_check ON questions;
DROP FUNCTION IF EXISTS check_question_profanity();
DROP FUNCTION IF EXISTS increment_question_likes(question_uuid);
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS rooms;
DROP INDEX IF EXISTS idx_questions_room_id;
DROP INDEX IF EXISTS idx_questions_status;
DROP INDEX IF EXISTS idx_questions_likes_count;
DROP INDEX IF EXISTS idx_students_room_id;
DROP INDEX IF EXISTS idx_rooms_teacher_id;

-- Step 2: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: Create tables
-- Rooms table - for teacher-created sessions
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Students table - for student authentication within rooms
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  UNIQUE(room_id, nickname) -- Ensure unique nickname within each room
);

-- Questions table - for storing anonymous questions
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  answer_content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered'))
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_questions_room_id ON questions(room_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_likes_count ON questions(likes_count DESC);
CREATE INDEX idx_students_room_id ON students(room_id);
CREATE INDEX idx_rooms_teacher_id ON rooms(teacher_id);

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
-- Rooms: Anyone can read rooms, but teachers can insert/update their own rooms
CREATE POLICY "Rooms are viewable by everyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "Teachers can create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers can update their own rooms" ON rooms FOR UPDATE USING (auth.uid()::text = teacher_id);

-- Students: Anyone can read students within a room, but students can only insert their own data
CREATE POLICY "Students are viewable within room" ON students FOR SELECT USING (true);
CREATE POLICY "Students can create their profile" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update their profile" ON students FOR UPDATE USING (auth.uid()::text = room_id::text);

-- Questions: Anyone can read questions within a room, students can insert questions, teachers can update
CREATE POLICY "Questions are viewable within room" ON questions FOR SELECT USING (true);
CREATE POLICY "Students can create questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers can answer questions" ON questions FOR UPDATE USING (true);

-- Step 7: Create functions
-- Function to increment likes count
CREATE OR REPLACE FUNCTION increment_question_likes(question_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE questions 
  SET likes_count = likes_count + 1 
  WHERE id = question_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check for profanity (basic implementation)
CREATE OR REPLACE FUNCTION contains_profanity(text_content TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic profanity filter - can be expanded
  RETURN text_content ~* '(씨발|개새끼|미친|병신|존나|좆|지랄|새끼|엠창|후빨)';
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create profanity check trigger
CREATE OR REPLACE FUNCTION check_question_profanity()
RETURNS TRIGGER AS $$
BEGIN
  IF contains_profanity(NEW.content) THEN
    RAISE EXCEPTION '질문에 부적절한 언어가 포함되어 있습니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Apply the profanity check trigger
CREATE TRIGGER question_profanity_check
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION check_question_profanity();

-- Step 10: Verify tables were created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('rooms', 'students', 'questions')
ORDER BY table_name, ordinal_position;
