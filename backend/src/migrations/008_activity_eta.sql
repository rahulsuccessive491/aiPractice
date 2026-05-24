-- Add ETA field for in-progress activities (expected completion date, may be future)
ALTER TABLE activities ADD COLUMN eta TEXT;
