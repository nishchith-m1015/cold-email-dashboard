-- ============================================
-- FIXED: Notifications and Research Logs Migration
-- Fixed workspace_id type mismatch (UUID not TEXT)
-- ============================================
-- ============================================
-- PHASE 16: RESEARCH LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS research_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES workspaces(id),
    contact_email TEXT NOT NULL,
    campaign_name TEXT,
    -- Research data
    search_query TEXT,
    raw_results JSONB,
    -- Full CSE response
    summary TEXT,
    -- O3-mini summary
    quality_score INTEGER,
    -- 1-10 (computed by AI)
    sources_count INTEGER,
    -- Linking
    email_event_id UUID REFERENCES email_events(id),
    lead_id INTEGER,
    -- Reference to leads_ohio.id
    -- Metadata
    workflow_run_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_research_logs_workspace ON research_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_research_logs_contact ON research_logs(contact_email);
CREATE INDEX IF NOT EXISTS idx_research_logs_created ON research_logs(created_at DESC);
-- ============================================
-- PHASE 18: NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES workspaces(id),
    user_id TEXT,
    -- Clerk user ID (NULL = all workspace users)
    -- Content
    type TEXT NOT NULL CHECK (
        type IN (
            'reply',
            'opt_out',
            'budget_alert',
            'campaign_complete',
            'system'
        )
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    -- Linking
    related_email_event_id UUID REFERENCES email_events(id),
    related_campaign TEXT,
    -- Status
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    -- Metadata
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user ON notifications(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(workspace_id)
WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
-- ============================================
-- PHASE 18: AUTO-NOTIFICATION TRIGGERS
-- ============================================
-- Trigger: Create notification on reply
CREATE OR REPLACE FUNCTION notify_on_reply() RETURNS TRIGGER AS $$ BEGIN IF NEW.event_type = 'replied' THEN
INSERT INTO notifications (
        workspace_id,
        type,
        title,
        message,
        related_email_event_id,
        related_campaign,
        payload
    )
VALUES (
        NEW.workspace_id,
        'reply',
        'New Reply Received',
        format(
            'Reply from %s on campaign "%s"',
            NEW.contact_email,
            NEW.campaign_name
        ),
        NEW.id,
        NEW.campaign_name,
        jsonb_build_object(
            'contact_email',
            NEW.contact_email,
            'email_number',
            NEW.email_number
        )
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_notify_reply ON email_events;
CREATE TRIGGER trigger_notify_reply
AFTER
INSERT ON email_events FOR EACH ROW
    WHEN (NEW.event_type = 'replied') EXECUTE FUNCTION notify_on_reply();
-- Trigger: Create notification on opt-out
CREATE OR REPLACE FUNCTION notify_on_opt_out() RETURNS TRIGGER AS $$ BEGIN IF NEW.event_type = 'opt_out' THEN
INSERT INTO notifications (
        workspace_id,
        type,
        title,
        message,
        related_email_event_id,
        related_campaign,
        payload
    )
VALUES (
        NEW.workspace_id,
        'opt_out',
        'Contact Opted Out',
        format(
            '%s opted out from campaign "%s"',
            NEW.contact_email,
            NEW.campaign_name
        ),
        NEW.id,
        NEW.campaign_name,
        jsonb_build_object('contact_email', NEW.contact_email)
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_notify_opt_out ON email_events;
CREATE TRIGGER trigger_notify_opt_out
AFTER
INSERT ON email_events FOR EACH ROW
    WHEN (NEW.event_type = 'opt_out') EXECUTE FUNCTION notify_on_opt_out();
-- Enable RLS
ALTER TABLE research_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Drop old policies if they exist
DROP POLICY IF EXISTS research_logs_workspace_isolation ON research_logs;
DROP POLICY IF EXISTS notifications_workspace_isolation ON notifications;
-- RLS Policies (updated to use proper JWT claims)
CREATE POLICY research_logs_workspace_isolation ON research_logs FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM user_workspaces
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
);
CREATE POLICY notifications_workspace_isolation ON notifications FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM user_workspaces
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR user_id = current_setting('request.jwt.claims', true)::json->>'sub'
);
COMMENT ON TABLE notifications IS 'In-app notifications for replies, opt-outs, and system events';
COMMENT ON TABLE research_logs IS 'Research data collected from Google CSE and AI summaries';