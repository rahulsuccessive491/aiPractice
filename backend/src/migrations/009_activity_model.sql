-- Add model_used field to track specific AI model version (e.g. claude-3.5-sonnet, gpt-4o)
ALTER TABLE activities ADD COLUMN model_used TEXT;
