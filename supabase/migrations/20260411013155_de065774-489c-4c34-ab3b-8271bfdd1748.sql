UPDATE ic_sync_logs
SET status = 'failed',
    completed_at = now(),
    error_message = 'Sync timed out - manually cleaned up'
WHERE id = '16a426ec-43b0-40b0-994a-ca134a0f7ce0'
  AND status = 'in_progress';