-- Phase 31: Link n8n Workflows to Campaigns
-- Creates campaign records linked to Email 1, 2, and 3 workflows
-- Email 1 Campaign
INSERT INTO campaigns (
        workspace_id,
        name,
        description,
        status,
        n8n_workflow_id,
        n8n_status
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Ohio Email 1',
        'First touchpoint in Ohio outreach sequence - sends initial personalized email',
        'active',
        'gRvMu0xqoUvcCJDt',
        'active'
    );
-- Email 2 Campaign
INSERT INTO campaigns (
        workspace_id,
        name,
        description,
        status,
        n8n_workflow_id,
        n8n_status
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Ohio Email 2',
        'Follow-up email in Ohio sequence - sent to non-responders',
        'active',
        'd1uFgJoCWPLDhZnP',
        'active'
    );
-- Email 3 Campaign
INSERT INTO campaigns (
        workspace_id,
        name,
        description,
        status,
        n8n_workflow_id,
        n8n_status
    )
VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Ohio Email 3',
        'Final touchpoint in Ohio sequence - last attempt to engage',
        'active',
        'KO7c5QsCwEcxQoAH',
        'active'
    );