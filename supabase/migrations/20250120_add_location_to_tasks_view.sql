SET search_path TO public, extensions;

-- Migration: Add location_name to tasks_with_associations view
-- This adds location name to the tasks view for better display in UI

DROP VIEW IF EXISTS tasks_with_associations CASCADE;
CREATE VIEW tasks_with_associations AS
SELECT 
  t.*,
  c.full_name as contact_name,
  d.title as deal_title,
  u.full_name as assignee_name,
  loc.name as location_name,
  COALESCE(
    (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id), 0
  ) as subtask_count,
  COALESCE(
    (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id), 0
  ) as comment_count
FROM tasks t
LEFT JOIN contacts c ON t.contact_id = c.id
LEFT JOIN deals d ON t.deal_id = d.id
LEFT JOIN app_users u ON t.assignee_user_id = u.id
LEFT JOIN locations loc ON t.location_id = loc.id;





