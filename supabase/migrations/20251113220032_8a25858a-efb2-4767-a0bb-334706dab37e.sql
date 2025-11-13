-- Drop the existing public SELECT policy that allows anyone to see all profiles
DROP POLICY IF EXISTS "Gli utenti possono vedere tutti i profili" ON public.profiles;

-- Create a secure policy that allows users to view only their own profile
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Optional: Allow viewing profiles of users whose dreams are public (if needed in the future)
-- This is commented out for now but can be enabled if you want users to see profiles of dream authors
/*
CREATE POLICY "Users can view profiles of public dream authors"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT DISTINCT user_id 
    FROM public.dreams 
    WHERE visibility = 'public' OR is_private = false
  )
);
*/