ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT FALSE;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS grace_end_time TIMESTAMP;

/*node migration/run_add_task_overdue_fields.js*/