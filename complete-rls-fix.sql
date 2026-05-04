-- Complete RLS Policy Fix for All Tables
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS for all tables temporarily
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- Step 2: Re-enable RLS for all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Enable insert for all users" ON rooms;
DROP POLICY IF EXISTS "Enable select for all users" ON rooms;
DROP POLICY IF EXISTS "Enable update for teachers" ON rooms;

-- Step 4: Create policies for rooms table
CREATE POLICY "Enable insert for all users" ON rooms
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON rooms
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON rooms
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON rooms
FOR DELETE USING (true);

-- Step 5: Create policies for students table
CREATE POLICY "Enable insert for all users" ON students
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON students
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON students
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON students
FOR DELETE USING (true);

-- Step 6: Create policies for questions table
CREATE POLICY "Enable insert for all users" ON questions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON questions
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON questions
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON questions
FOR DELETE USING (true);

-- Step 7: Verify all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('rooms', 'students', 'questions')
ORDER BY tablename, policyname;
