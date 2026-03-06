"use server";

import { createClient } from "@/utils/supabase/server";

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";
const FROM_EMAIL = "noreply@gorillaproof.com.br";
const FROM_NAME = "GorillaProof";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gorillaproof.com.br";
const LOGO_URL = `${SITE_URL}/logo-white.png`;

// ─── Brand Colors ───
const BRAND = {
    primary: "#34d399",       // Emerald accent
    bgDark: "#0d1a14",        // Deep jungle dark
    bgCard: "#142520",        // Card surface
    bgInset: "#0e1b15",       // Inset/quote background
    borderCard: "#1e3a2e",    // Card border
    borderSubtle: "#1e3a2e",  // Dividers
    textMuted: "#6b8a7a",     // Secondary text
    textDim: "#4a6a5a",       // Footer text
    textBody: "#d4d4d8",      // Body text
    white: "#ffffff",
} as const;

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface SendEmailParams {
    to: { email: string; name?: string }[];
    subject: string;
    html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams) {
    if (!MAILTRAP_API_TOKEN) {
        console.error("[Email] MAILTRAP_API_TOKEN not configured");
        return;
    }

    try {
        await fetch(MAILTRAP_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Api-Token": MAILTRAP_API_TOKEN,
            },
            body: JSON.stringify({
                from: { email: FROM_EMAIL, name: FROM_NAME },
                to,
                subject,
                html,
            }),
        });
    } catch (err) {
        console.error("[Email] Failed to send:", err);
    }
}

// ─── Org Branding Resolver ───

interface OrgBranding {
    name: string;
    logoUrl: string | null;
    brandColor: string;
}

async function getOrgBranding(orgId?: string): Promise<OrgBranding | null> {
    if (!orgId) return null;

    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from("organizations")
            .select("name, logo_url, brand_color")
            .eq("id", orgId)
            .single();

        if (!data) return null;

        return {
            name: data.name,
            logoUrl: data.logo_url,
            brandColor: data.brand_color || BRAND.primary,
        };
    } catch {
        return null;
    }
}

async function getOrgBrandingForUser(userId: string): Promise<OrgBranding | null> {
    try {
        const supabase = await createClient();
        const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", userId)
            .limit(1)
            .single();

        if (!membership) return null;
        return getOrgBranding(membership.organization_id);
    } catch {
        return null;
    }
}

// ─── Email Template System ───

interface BaseTemplateOptions {
    preheader?: string;
    org?: OrgBranding | null;
}

function baseTemplate(content: string, options?: BaseTemplateOptions) {
    const preheader = options?.preheader || "";
    const org = options?.org;
    const accentColor = org?.brandColor || BRAND.primary;

    // Optional org branding block (appears inside card, before content)
    const orgBlock = org
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
<tr><td align="center" style="padding:0 0 16px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    ${org.logoUrl ? `<td style="vertical-align:middle;padding-right:10px"><img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" width="36" height="36" style="display:block;border:0;border-radius:8px;object-fit:cover"></td>` : ""}
    <td style="vertical-align:middle"><span style="font-size:15px;font-weight:700;color:${BRAND.white};letter-spacing:-0.3px">${escapeHtml(org.name)}</span></td>
  </tr></table>
</td></tr>
<tr><td><div style="height:1px;background-color:${BRAND.borderSubtle};width:100%"></div></td></tr>
</table>`
        : "";

    return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>GorillaProof</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  * { box-sizing: border-box; }
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  @media only screen and (max-width: 600px) {
    .email-wrapper { padding: 16px 12px !important; }
    .email-card { padding: 20px 16px !important; }
    .email-btn { padding: 12px 20px !important; font-size: 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgDark};font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale">
${preheader ? `<div style="display:none;font-size:1px;color:${BRAND.bgDark};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgDark}">
<tr><td align="center" class="email-wrapper" style="padding:32px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<!-- Header: GorillaProof -->
<tr><td align="center" style="padding:0 0 28px">
  <table role="presentation" cellpadding="0" cellspacing="0">
  <tr>
    <td style="vertical-align:middle;padding-right:10px">
      <img src="${LOGO_URL}" alt="GorillaProof" width="32" height="25" style="display:block;border:0;filter:invert(1);-webkit-filter:invert(1)">
    </td>
    <td style="vertical-align:middle">
      <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:${accentColor}">gorilla</span><span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:${BRAND.white}">proof</span>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Accent line -->
<tr><td style="padding:0 0 24px">
  <div style="height:2px;background:linear-gradient(90deg,transparent,${accentColor},transparent);border-radius:2px"></div>
</td></tr>

<!-- Body Card -->
<tr><td class="email-card" style="background-color:${BRAND.bgCard};border:1px solid ${BRAND.borderCard};border-radius:16px;padding:28px 24px">
${orgBlock}
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:28px 0 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:0 0 12px">
    <div style="height:1px;background-color:${BRAND.borderSubtle};width:80%"></div>
  </td></tr>
  <tr><td align="center" style="color:${BRAND.textDim};font-size:11px;line-height:1.6">
    <p style="margin:0 0 4px">GorillaProof&reg; &mdash; Proofing &amp; Approval Platform</p>
    ${org ? `<p style="margin:0 0 4px;color:${BRAND.textMuted}">Enviado em nome de <strong>${escapeHtml(org.name)}</strong></p>` : ""}
    <p style="margin:0">
      <a href="${SITE_URL}" style="color:${accentColor};text-decoration:none">gorillaproof.com.br</a>
    </p>
  </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Helper: CTA Button ───
function ctaButton(href: string, label: string, color?: string) {
    const bg = color || BRAND.primary;
    return `<div style="text-align:center">
<a href="${href}" class="email-btn" style="display:inline-block;background:${bg};color:${BRAND.bgDark};padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px">${label}</a>
</div>`;
}

// ─── Notification Functions ───

export async function notifyNewComment(params: {
    proofTitle: string;
    proofUrl: string;
    authorName: string;
    commentText: string;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const content = params.commentText.replace(/<[^>]+>/g, "").slice(0, 200);
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: params.recipients,
        subject: `Novo comentário em "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Novo comentário</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:${accent}">${escapeHtml(params.authorName)}</strong> comentou em <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong></p>
<div style="background:${BRAND.bgInset};border-left:3px solid ${accent};padding:14px 18px;border-radius:0 10px 10px 0;margin:0 0 20px">
<p style="color:${BRAND.textBody};font-size:13px;margin:0;line-height:1.6">${content}${params.commentText.length > 200 ? "..." : ""}</p>
</div>
${ctaButton(params.proofUrl, "Ver comentário", accent)}
`, { preheader: `${escapeHtml(params.authorName)} comentou em ${escapeHtml(params.proofTitle)}`, org }),
    });
}

export async function notifyStatusChange(params: {
    proofTitle: string;
    proofUrl: string;
    changedBy: string;
    newStatus: string;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const statusLabels: Record<string, { label: string; color: string }> = {
        approved: { label: "Aprovado", color: "#34d399" },
        rejected: { label: "Rejeitado", color: "#ef4444" },
        changes_requested: { label: "Alterações solicitadas", color: "#f59e0b" },
        in_review: { label: "Em revisão", color: "#60a5fa" },
    };

    const st = statusLabels[params.newStatus] || { label: params.newStatus, color: BRAND.textMuted };
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: params.recipients,
        subject: `"${params.proofTitle}" — ${st.label}`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Status atualizado</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:${accent}">${escapeHtml(params.changedBy)}</strong> alterou o status de <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong></p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:${st.color}15;color:${st.color};padding:10px 24px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid ${st.color}30">${st.label}</span>
</div>
${ctaButton(params.proofUrl, "Ver proof", accent)}
`, { preheader: `${escapeHtml(params.proofTitle)} agora está: ${st.label}`, org }),
    });
}

export async function notifyMention(params: {
    proofTitle: string;
    proofUrl: string;
    mentionedBy: string;
    commentText: string;
    recipientEmail: string;
    recipientName?: string;
    orgId?: string;
}) {
    const content = params.commentText.replace(/<[^>]+>/g, "").slice(0, 200);
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: [{ email: params.recipientEmail, name: params.recipientName }],
        subject: `${params.mentionedBy} mencionou você em "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Você foi mencionado(a)</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:${accent}">${escapeHtml(params.mentionedBy)}</strong> mencionou você em <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong></p>
<div style="background:${BRAND.bgInset};border-left:3px solid #60a5fa;padding:14px 18px;border-radius:0 10px 10px 0;margin:0 0 20px">
<p style="color:${BRAND.textBody};font-size:13px;margin:0;line-height:1.6">${content}${params.commentText.length > 200 ? "..." : ""}</p>
</div>
${ctaButton(params.proofUrl, "Ver menção", accent)}
`, { preheader: `${escapeHtml(params.mentionedBy)} mencionou você em ${escapeHtml(params.proofTitle)}`, org }),
    });
}

export async function notifyDeadlineApproaching(params: {
    proofTitle: string;
    proofUrl: string;
    deadline: string;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const d = new Date(params.deadline);
    const formatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: params.recipients,
        subject: `Prazo chegando: "${params.proofTitle}" — ${formatted}`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Prazo se aproximando</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5">O proof <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong> tem prazo para:</p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:#f59e0b15;color:#f59e0b;padding:10px 24px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid #f59e0b30">${formatted}</span>
</div>
${ctaButton(params.proofUrl, "Revisar agora", accent)}
`, { preheader: `Prazo para "${params.proofTitle}": ${formatted}`, org }),
    });
}

// ─── New: Access Granted Notification ───

export async function notifyAccessGranted(params: {
    resourceType: "proof" | "project";
    resourceTitle: string;
    resourceUrl: string;
    grantedBy: string;
    recipientEmail: string;
    recipientName?: string;
    orgId?: string;
}) {
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;
    const typeLabel = params.resourceType === "proof" ? "proof" : "projeto";

    await sendEmail({
        to: [{ email: params.recipientEmail, name: params.recipientName }],
        subject: `Acesso concedido: "${params.resourceTitle}"`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Acesso concedido</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:${accent}">${escapeHtml(params.grantedBy)}</strong> concedeu acesso ao ${typeLabel} <strong style="color:${BRAND.white}">${escapeHtml(params.resourceTitle)}</strong></p>
${ctaButton(params.resourceUrl, `Ver ${typeLabel}`, accent)}
`, { preheader: `Você ganhou acesso ao ${typeLabel} "${params.resourceTitle}"`, org }),
    });
}

// ─── New: New Version Uploaded ───

export async function notifyNewVersion(params: {
    proofTitle: string;
    proofUrl: string;
    uploadedBy: string;
    versionNumber: number;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: params.recipients,
        subject: `Nova versão: "${params.proofTitle}" — v${params.versionNumber}`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Nova versão enviada</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:${accent}">${escapeHtml(params.uploadedBy)}</strong> enviou a <strong style="color:${BRAND.white}">versão ${params.versionNumber}</strong> de <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong></p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:${accent}15;color:${accent};padding:10px 24px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid ${accent}30">v${params.versionNumber}</span>
</div>
${ctaButton(params.proofUrl, "Ver nova versão", accent)}
`, { preheader: `Nova versão v${params.versionNumber} de "${params.proofTitle}"`, org }),
    });
}

// ─── New: Member Invitation ───

export async function notifyMemberInvite(params: {
    invitedBy: string;
    orgName: string;
    inviteUrl: string;
    recipientEmail: string;
    recipientName?: string;
    orgId?: string;
}) {
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: [{ email: params.recipientEmail, name: params.recipientName }],
        subject: `Convite para ${params.orgName} no GorillaProof`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Você foi convidado!</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:${accent}">${escapeHtml(params.invitedBy)}</strong> convidou você para colaborar em <strong style="color:${BRAND.white}">${escapeHtml(params.orgName)}</strong> no GorillaProof.</p>
${ctaButton(params.inviteUrl, "Aceitar convite", accent)}
<p style="color:${BRAND.textDim};font-size:11px;margin:16px 0 0;text-align:center">Se você não esperava este convite, pode ignorar este e-mail.</p>
`, { preheader: `${escapeHtml(params.invitedBy)} convidou você para ${escapeHtml(params.orgName)}`, org }),
    });
}

// ─── Workflow Stage Notifications ───

export async function notifyStageStart(params: {
    proofTitle: string;
    proofUrl: string;
    stageName: string;
    stageIndex: number;
    totalStages: number;
    stageDescription?: string;
    deadline?: string;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    const deadlineHtml = params.deadline
        ? `<p style="color:${BRAND.textMuted};font-size:12px;margin:8px 0 0;line-height:1.5">📅 Prazo: <strong style="color:#fbbf24">${new Date(params.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</strong></p>`
        : "";

    const descriptionHtml = params.stageDescription
        ? `<p style="color:${BRAND.textDim};font-size:12px;margin:8px 0 0;line-height:1.5;font-style:italic">"${escapeHtml(params.stageDescription)}"</p>`
        : "";

    await sendEmail({
        to: params.recipients,
        subject: `🔔 Sua revisão é necessária: "${params.proofTitle}" — ${params.stageName}`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Sua revisão é necessária</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 16px;line-height:1.5">Você foi designado como revisor na etapa <strong style="color:${accent}">${escapeHtml(params.stageName)}</strong> da prova <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong></p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:${accent}15;color:${accent};padding:10px 24px;border-radius:10px;font-weight:700;font-size:14px;border:1px solid ${accent}30">Etapa ${params.stageIndex + 1} de ${params.totalStages}</span>
</div>
${descriptionHtml}
${deadlineHtml}
${ctaButton(params.proofUrl, "Revisar agora", accent)}
`, { preheader: `Sua revisão é necessária na etapa "${params.stageName}" de "${params.proofTitle}"`, org }),
    });
}

export async function notifyStageComplete(params: {
    proofTitle: string;
    proofUrl: string;
    stageName: string;
    stageResult: "approved" | "rejected";
    stageIndex: number;
    totalStages: number;
    nextStageName?: string;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;
    const isApproved = params.stageResult === "approved";
    const resultColor = isApproved ? "#34d399" : "#ef4444";
    const resultLabel = isApproved ? "✅ Aprovada" : "❌ Rejeitada";
    const resultMessage = isApproved
        ? params.nextStageName
            ? `A prova avançou para a próxima etapa: <strong style="color:${accent}">${escapeHtml(params.nextStageName)}</strong>`
            : "Todas as etapas foram concluídas!"
        : "O workflow foi pausado. Você pode reiniciar esta etapa ou cancelar o workflow.";

    await sendEmail({
        to: params.recipients,
        subject: `${isApproved ? "✅" : "❌"} Etapa ${params.stageName}: ${isApproved ? "Aprovada" : "Rejeitada"} — "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Etapa ${isApproved ? "concluída" : "rejeitada"}</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 16px;line-height:1.5">A etapa <strong style="color:${resultColor}">${escapeHtml(params.stageName)}</strong> da prova <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong> foi finalizada.</p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:${resultColor}15;color:${resultColor};padding:10px 24px;border-radius:10px;font-weight:700;font-size:14px;border:1px solid ${resultColor}30">${resultLabel} — Etapa ${params.stageIndex + 1}/${params.totalStages}</span>
</div>
<p style="color:${BRAND.textMuted};font-size:12px;margin:8px 0 16px;text-align:center;line-height:1.5">${resultMessage}</p>
${ctaButton(params.proofUrl, "Ver prova", accent)}
`, { preheader: `Etapa "${params.stageName}" ${isApproved ? "aprovada" : "rejeitada"} em "${params.proofTitle}"`, org }),
    });
}

export async function notifyWorkflowComplete(params: {
    proofTitle: string;
    proofUrl: string;
    totalStages: number;
    recipients: { email: string; name?: string }[];
    orgId?: string;
}) {
    const org = await getOrgBranding(params.orgId);
    const accent = org?.brandColor || BRAND.primary;

    await sendEmail({
        to: params.recipients,
        subject: `🎉 Workflow concluído: "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:${BRAND.white};font-size:17px;font-weight:700;margin:0 0 8px">Workflow concluído!</h2>
<p style="color:${BRAND.textMuted};font-size:13px;margin:0 0 16px;line-height:1.5">Todas as <strong style="color:${accent}">${params.totalStages} etapas</strong> de revisão da prova <strong style="color:${BRAND.white}">${escapeHtml(params.proofTitle)}</strong> foram aprovadas.</p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:#34d39915;color:#34d399;padding:12px 32px;border-radius:12px;font-weight:700;font-size:15px;border:1px solid #34d39930">🎉 Todas as etapas aprovadas</span>
</div>
${ctaButton(params.proofUrl, "Ver prova final", accent)}
`, { preheader: `Todas as ${params.totalStages} etapas de "${params.proofTitle}" foram aprovadas`, org }),
    });
}

// ─── Utility: Resolve org for current user ───
export { getOrgBrandingForUser, getOrgBranding };
