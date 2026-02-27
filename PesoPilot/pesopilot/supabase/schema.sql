-- PesoPilot Database Schema
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_type TEXT DEFAULT 'free' CHECK (premium_type IN ('free', 'lifetime')),
  premium_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create index on id
CREATE INDEX idx_profiles_id ON profiles(id);

-- ============================================
-- 2. BUDGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_period ON budgets(period);

-- ============================================
-- 3. EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);

-- ============================================
-- 4. TRIGGER: Create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_premium, premium_type)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', FALSE, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. USEFUL VIEWS
-- ============================================

-- View: Monthly expense summary by category
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', date) AS month,
  category,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM expenses
GROUP BY user_id, DATE_TRUNC('month', date), category;

-- View: Budget vs Actual spending
CREATE OR REPLACE VIEW budget_vs_actual AS
SELECT 
  b.user_id,
  b.id AS budget_id,
  b.amount AS budget_amount,
  b.period,
  COALESCE(SUM(e.amount), 0) AS actual_spent,
  b.amount - COALESCE(SUM(e.amount), 0) AS remaining,
  CASE 
    WHEN b.period = 'monthly' THEN DATE_TRUNC('month', CURRENT_DATE)
    WHEN b.period = 'weekly' THEN DATE_TRUNC('week', CURRENT_DATE)
  END AS period_start
FROM budgets b
LEFT JOIN expenses e ON b.user_id = e.user_id 
  AND (
    (b.period = 'monthly' AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', CURRENT_DATE))
    OR 
    (b.period = 'weekly' AND DATE_TRUNC('week', e.date) = DATE_TRUNC('week', CURRENT_DATE))
  )
GROUP BY b.user_id, b.id, b.amount, b.period;

-- ============================================
-- 6. PREMIUM REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS premium_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_proof_url TEXT NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 199,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE premium_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for premium_requests
CREATE POLICY "Users can view own premium requests"
  ON premium_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own premium requests"
  ON premium_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all premium requests
CREATE POLICY "Admins can view all premium requests"
  ON premium_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_premium = TRUE
  ));

CREATE POLICY "Admins can update premium requests"
  ON premium_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_premium = TRUE
  ));

CREATE INDEX idx_premium_requests_user_id ON premium_requests(user_id);
CREATE INDEX idx_premium_requests_status ON premium_requests(status);

-- ============================================
-- 7. MIGRATIONS (Run these for existing databases)
-- ============================================

-- Migration: Add premium columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_type TEXT DEFAULT 'free' CHECK (premium_type IN ('free', 'lifetime'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_since TIMESTAMPTZ;
