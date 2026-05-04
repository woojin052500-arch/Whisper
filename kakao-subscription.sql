-- KakaoTalk Subscription System
-- Run this in Supabase SQL Editor

-- Step 1: Update teachers table for subscription
ALTER TABLE teachers ADD COLUMN subscription_id TEXT;
ALTER TABLE teachers ADD COLUMN subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'cancelled', 'expired'));
ALTER TABLE teachers ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teachers ADD COLUMN subscription_next_billing_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teachers ADD COLUMN subscription_cancelled_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subscription_id TEXT UNIQUE NOT NULL, -- KakaoTalk subscription ID
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  amount INTEGER NOT NULL DEFAULT 990, -- 990원
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  started_at TIMESTAMP WITH TIME ZONE,
  next_billing_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  kakao_order_id TEXT,
  kakao_payment_key TEXT,
  kakao_approved_at TIMESTAMP WITH TIME ZONE
);

-- Step 3: Create subscription_events table for tracking
CREATE TABLE subscription_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'activated', 'cancelled', 'renewed', 'payment_failed', 'expired')),
  event_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_subscriptions_teacher_id ON subscriptions(teacher_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_at);
CREATE INDEX idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);

-- Step 5: Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for subscriptions
CREATE POLICY "Enable insert for all users" ON subscriptions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON subscriptions
FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON subscriptions
FOR UPDATE WITH CHECK (true);

-- Step 7: Create RLS policies for subscription_events
CREATE POLICY "Enable insert for all users" ON subscription_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON subscription_events
FOR SELECT USING (true);

-- Step 8: Update existing payment_requests to support subscription
ALTER TABLE payment_requests ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
ALTER TABLE payment_requests ADD COLUMN is_subscription BOOLEAN DEFAULT false;

-- Step 9: Function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status(teacher_email TEXT)
RETURNS JSONB AS $$
DECLARE
  teacher_record RECORD;
  subscription_record RECORD;
BEGIN
  -- Get teacher info
  SELECT * INTO teacher_record 
  FROM teachers 
  WHERE email = teacher_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  
  -- Get active subscription
  SELECT * INTO subscription_record
  FROM subscriptions
  WHERE teacher_id = teacher_record.id 
    AND status = 'active'
    AND next_billing_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'none',
      'teacher_id', teacher_record.id,
      'subscription_status', teacher_record.subscription_status
    );
  END IF;
  
  RETURN jsonb_build_object(
    'status', 'active',
    'subscription_id', subscription_record.subscription_id,
    'next_billing', subscription_record.next_billing_at,
    'amount', subscription_record.amount
  );
END;
$$ LANGUAGE plpgsql;

-- Step 10: Verify tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'subscription_events')
ORDER BY table_name;
