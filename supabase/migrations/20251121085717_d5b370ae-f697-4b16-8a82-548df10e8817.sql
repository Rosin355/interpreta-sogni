-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Users can view only their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Gli utenti possono inserire il proprio profilo" ON public.profiles;
DROP POLICY IF EXISTS "Gli utenti possono aggiornare il proprio profilo" ON public.profiles;

-- Create new policies with explicit authentication checks
-- Block all anonymous access
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Allow authenticated users to view only their own profile
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);