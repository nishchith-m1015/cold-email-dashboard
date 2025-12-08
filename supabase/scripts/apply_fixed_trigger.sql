-- ============================================
-- FIX WEBHOOK QUEUE TRIGGER
-- Apply this in Supabase SQL Editor
-- ============================================

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Drop the broken trigger and function
DROP TRIGGER IF EXISTS trg_process_webhook_queue ON webhook_queue;
DROP FUNCTION IF EXISTS process_webhook_queue();

-- Step 3: Recreate the corrected function
CREATE OR REPLACE FUNCTION process_webhook_queue()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_workspace_id TEXT;
  v_event_data JSONB;
  v_cost_data JSONB;
  v_event_ts TIMESTAMP WITH TIME ZONE;
  v_step INTEGER;
  v_cost_usd DECIMAL(10, 6);
  v_tokens_in INTEGER;
  v_tokens_out INTEGER;
BEGIN
  -- Skip if already processing/completed/failed
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Update status to processing (for monitoring)
  UPDATE webhook_queue 
  SET status = 'processing' 
  WHERE id = NEW.id;

  BEGIN
    -- ==========================================
    -- PROCESS EMAIL EVENTS
    -- ==========================================
    IF NEW.event_type = 'email_event' THEN
      v_event_data := NEW.raw_payload;
      v_workspace_id := COALESCE(v_event_data->>'workspace_id', '00000000-0000-0000-0000-000000000001');
      
      -- Parse event_ts (handle both string and already-parsed timestamps)
      v_event_ts := COALESCE(
        (v_event_data->>'event_ts')::TIMESTAMP WITH TIME ZONE,
        NOW()
      );

      -- Parse step (handle null gracefully)
      v_step := COALESCE((v_event_data->>'step')::INTEGER, (v_event_data->>'sequence_step')::INTEGER);

      -- Generate contact_id from email (deterministic UUID v5)
      -- Using a namespace UUID for email addresses
      v_contact_id := uuid_generate_v5(
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
        CONCAT(v_workspace_id, ':', v_event_data->>'contact_email')
      );

      -- ==========================================
      -- INSERT EMAIL EVENT (IDEMPOTENT - contacts/emails tables removed)
      -- ==========================================
      INSERT INTO email_events (
        workspace_id,
        contact_id,
        contact_email,
        campaign_name,
        step,
        event_type,
        provider,
        provider_message_id,
        event_ts,
        email_number,
        metadata,
        event_key,
        idempotency_key,
        n8n_execution_id
      )
      VALUES (
        v_workspace_id,
        v_contact_id,
        v_event_data->>'contact_email',
        COALESCE(v_event_data->>'campaign', v_event_data->>'campaign_name', 'Default Campaign'),
        v_step::TEXT,
        v_event_data->>'event_type',
        COALESCE(v_event_data->>'provider', 'gmail'),
        v_event_data->>'provider_message_id',
        v_event_ts,
        COALESCE((v_event_data->>'email_number')::INTEGER, v_step),
        COALESCE(v_event_data->'metadata', '{}'::JSONB),
        COALESCE(
          v_event_data->>'event_key',
          CONCAT(
            COALESCE(v_event_data->>'provider', 'gmail'), ':',
            COALESCE(v_event_data->>'provider_message_id', v_event_data->>'contact_email'), ':',
            v_event_data->>'event_type', ':',
            COALESCE(v_step::TEXT, '0')
          )
        ),
        NEW.idempotency_key,
        v_event_data->>'n8n_execution_id'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

    -- ==========================================
    -- PROCESS COST EVENTS
    -- ==========================================
    ELSIF NEW.event_type = 'cost_event' THEN
      v_cost_data := NEW.raw_payload;
      v_workspace_id := COALESCE(v_cost_data->>'workspace_id', '00000000-0000-0000-0000-000000000001');

      -- Parse numeric values with defaults
      v_tokens_in := COALESCE((v_cost_data->>'tokens_in')::INTEGER, 0);
      v_tokens_out := COALESCE((v_cost_data->>'tokens_out')::INTEGER, 0);
      v_cost_usd := COALESCE((v_cost_data->>'cost_usd')::DECIMAL, 0);

      -- ==========================================
      -- INSERT LLM USAGE (IDEMPOTENT - workflow_id/run_id in metadata)
      -- ==========================================
      INSERT INTO llm_usage (
        workspace_id,
        provider,
        model,
        tokens_in,
        tokens_out,
        cost_usd,
        campaign_name,
        contact_email,
        purpose,
        metadata,
        idempotency_key,
        n8n_execution_id
      )
      VALUES (
        v_workspace_id,
        v_cost_data->>'provider',
        v_cost_data->>'model',
        v_tokens_in,
        v_tokens_out,
        v_cost_usd,
        v_cost_data->>'campaign_name',
        v_cost_data->>'contact_email',
        v_cost_data->>'purpose',
        jsonb_build_object(
          'workflow_id', v_cost_data->>'workflow_id',
          'run_id', v_cost_data->>'run_id'
        ) || COALESCE(v_cost_data->'metadata', '{}'::JSONB),
        NEW.idempotency_key,
        v_cost_data->>'n8n_execution_id'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

    END IF;

    -- ==========================================
    -- MARK AS COMPLETED
    -- ==========================================
    UPDATE webhook_queue 
    SET 
      status = 'completed', 
      processed_at = NOW() 
    WHERE id = NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- ==========================================
    -- ERROR HANDLING
    -- ==========================================
    UPDATE webhook_queue 
    SET 
      status = 'failed',
      error_message = SQLERRM,
      retry_count = retry_count + 1,
      processed_at = NOW()
    WHERE id = NEW.id;
    
    -- Log error for debugging (appears in Supabase logs)
    RAISE WARNING 'Webhook processing failed for queue ID %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER trg_process_webhook_queue
  AFTER INSERT ON webhook_queue
  FOR EACH ROW
  EXECUTE FUNCTION process_webhook_queue();

-- Step 5: Verify trigger was created
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'trg_process_webhook_queue';

-- Expected output: 1 row showing trigger is enabled

-- Step 6: Clear failed events to retry
UPDATE webhook_queue 
SET status = 'pending', retry_count = 0, error_message = NULL
WHERE status = 'failed';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Webhook queue trigger fixed! Ready to process events.';
END $$;
