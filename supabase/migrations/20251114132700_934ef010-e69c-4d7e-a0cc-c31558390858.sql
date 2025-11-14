-- Migration to regenerate TypeScript types
-- This ensures notification_preferences table is properly reflected in types

-- Verify notification_preferences table structure
COMMENT ON TABLE notification_preferences IS 'User notification preferences for dream reminders';
