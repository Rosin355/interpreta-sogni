-- Create wonderpush_devices table to map users to WonderPush installation IDs
CREATE TABLE IF NOT EXISTS public.wonderpush_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id TEXT NOT NULL,
  device_platform TEXT CHECK (device_platform IN ('ios', 'android', 'web')),
  device_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, installation_id)
);

-- Enable RLS
ALTER TABLE public.wonderpush_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own devices
CREATE POLICY "Users can view their own devices"
ON public.wonderpush_devices
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
ON public.wonderpush_devices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices
CREATE POLICY "Users can update their own devices"
ON public.wonderpush_devices
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own devices
CREATE POLICY "Users can delete their own devices"
ON public.wonderpush_devices
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_wonderpush_devices_updated_at
BEFORE UPDATE ON public.wonderpush_devices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_wonderpush_devices_user_id ON public.wonderpush_devices(user_id);
CREATE INDEX idx_wonderpush_devices_installation_id ON public.wonderpush_devices(installation_id);