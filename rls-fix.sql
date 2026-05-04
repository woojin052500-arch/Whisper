-- RLS Policy Fix for Room Creation
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily for rooms table
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- Step 2: Enable RLS back
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policy for room creation
CREATE POLICY "Enable insert for all users" ON rooms
FOR INSERT WITH CHECK (true);

-- Step 4: Create policy for reading rooms
CREATE POLICY "Enable select for all users" ON rooms
FOR SELECT USING (true);

-- Step 5: Create policy for updating rooms (only by teacher)
CREATE POLICY "Enable update for teachers" ON rooms
FOR UPDATE USING (auth.uid()::text = teacher_id);

-- Step 6: Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'rooms';
