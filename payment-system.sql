-- Payment System Database Setup
-- Run this in Supabase SQL Editor

-- Step 1: Create teachers table for payment tracking
CREATE TABLE teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  payment_requests_count INTEGER DEFAULT 0,
  total_rooms_created INTEGER DEFAULT 0
);

-- Step 2: Create payment_requests table
CREATE TABLE payment_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 10000, -- 10,000 원
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  deposit_name TEXT, -- 입금자명
  deposit_amount INTEGER, -- 입금액
  deposit_date TIMESTAMP WITH TIME ZONE, -- 입금일시
  approved_by UUID REFERENCES teachers(id), -- 승인자
  approved_at TIMESTAMP WITH TIME ZONE, -- 승인일시
  notes TEXT -- 비고
);

-- Step 3: Create indexes
CREATE INDEX idx_teachers_email ON teachers(email);
CREATE INDEX idx_teachers_is_admin ON teachers(is_admin);
CREATE INDEX idx_teachers_is_premium ON teachers(is_premium);
CREATE INDEX idx_payment_requests_teacher_id ON payment_requests(teacher_id);
CREATE INDEX idx_payment_requests_status ON payment_requests(status);

-- Step 4: Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for teachers
CREATE POLICY "Enable insert for all users" ON teachers
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON teachers
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON teachers
FOR UPDATE WITH CHECK (true);

-- Step 6: Create RLS policies for payment_requests
CREATE POLICY "Enable insert for all users" ON payment_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON payment_requests
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON payment_requests
FOR UPDATE WITH CHECK (true);

-- Step 7: Insert admin user
INSERT INTO teachers (email, name, is_admin, is_premium, premium_expires_at)
VALUES ('woojin052501@gmail.com', '관리자', true, true, '2030-12-31 23:59:59')
ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  is_premium = true,
  premium_expires_at = '2030-12-31 23:59:59';

-- Step 8: Verify tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teachers', 'payment_requests')
ORDER BY table_name;
