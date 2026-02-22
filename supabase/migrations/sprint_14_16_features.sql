-- Sprint 14: Webhooks + Notification Preferences
-- Sprint 16: Org settings columns

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    secret TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage webhooks" ON webhooks FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_on_comment BOOLEAN DEFAULT true,
    email_on_decision BOOLEAN DEFAULT true,
    email_on_mention BOOLEAN DEFAULT true,
    email_on_deadline BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Org branding
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#34d399';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain TEXT;
