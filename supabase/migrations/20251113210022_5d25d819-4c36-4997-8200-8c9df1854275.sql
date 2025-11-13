-- Create streaks table to track daily dream recording streaks
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_dream_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Policies for streaks
CREATE POLICY "Users can view their own streak"
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON public.streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON public.streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Create push_subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for push_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate and update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID, p_dream_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_days_diff INT;
BEGIN
  -- Get current streak data
  SELECT last_dream_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM streaks
  WHERE user_id = p_user_id;

  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO streaks (user_id, current_streak, longest_streak, last_dream_date)
    VALUES (p_user_id, 1, 1, p_dream_date);
    RETURN;
  END IF;

  -- If same date, no update needed
  IF v_last_date = p_dream_date THEN
    RETURN;
  END IF;

  -- Calculate days difference
  v_days_diff := p_dream_date - v_last_date;

  -- Update streak based on difference
  IF v_days_diff = 1 THEN
    -- Consecutive day: increment streak
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSIF v_days_diff > 1 THEN
    -- Streak broken: reset to 1
    v_current_streak := 1;
  END IF;

  -- Update streak record
  UPDATE streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_dream_date = p_dream_date,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger to update streak when dream is created
CREATE OR REPLACE FUNCTION public.handle_dream_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_user_streak(NEW.user_id, NEW.dream_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dream_created_update_streak
  AFTER INSERT ON dreams
  FOR EACH ROW
  EXECUTE FUNCTION handle_dream_streak();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);