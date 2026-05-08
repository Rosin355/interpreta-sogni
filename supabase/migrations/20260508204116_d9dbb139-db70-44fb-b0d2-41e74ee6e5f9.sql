
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('b54f9e25-381c-4029-a096-8cb1c44c94b7', 'super_admin'),
  ('c4547d62-ee36-463d-8ce3-077310e2c6ac', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
