-- Beta Feedback System
-- Collects bug reports and feedback from beta testers
-- Controlled by NEXT_PUBLIC_BETA_MODE env var

CREATE TABLE beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,

    -- Feedback content
    type TEXT CHECK (type IN ('bug', 'suggestion', 'confusion')) DEFAULT 'bug',
    severity TEXT CHECK (severity IN ('blocker', 'annoying', 'cosmetic')) DEFAULT 'annoying',
    description TEXT NOT NULL,
    expected_behavior TEXT,
    screenshot_url TEXT,

    -- Admin tracking
    status TEXT CHECK (status IN ('new', 'triaging', 'in_progress', 'resolved', 'wont_fix')) DEFAULT 'new',
    admin_notes TEXT,

    -- Auto-captured metadata
    page_url TEXT,
    browser_info TEXT,
    screen_resolution TEXT,
    console_errors JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can submit feedback
CREATE POLICY "beta_feedback_insert" ON beta_feedback
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Only @gorillaproof.com.br admins can read all feedback
CREATE POLICY "beta_feedback_select_admin" ON beta_feedback
    FOR SELECT TO authenticated
    USING (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@gorillaproof.com.br'
    );

-- Users can see their own submissions
CREATE POLICY "beta_feedback_select_own" ON beta_feedback
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Only @gorillaproof.com.br admins can update (status, notes)
CREATE POLICY "beta_feedback_update_admin" ON beta_feedback
    FOR UPDATE TO authenticated
    USING (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@gorillaproof.com.br'
    )
    WITH CHECK (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@gorillaproof.com.br'
    );

-- Index for admin queries
CREATE INDEX idx_beta_feedback_status ON beta_feedback(status);
CREATE INDEX idx_beta_feedback_created ON beta_feedback(created_at DESC);
