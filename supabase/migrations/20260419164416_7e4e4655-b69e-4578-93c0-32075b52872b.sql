-- Remove overly broad realtime.messages policies.
-- The app only uses postgres_changes, which is secured by the source tables' RLS,
-- not by realtime.messages. Broadcast/presence are now deny-by-default.

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;