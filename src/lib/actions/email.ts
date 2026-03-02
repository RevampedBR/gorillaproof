"use server";

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";
const FROM_EMAIL = "noreply@gorillaproof.com.br";
const FROM_NAME = "GorillaProof";

const LOGO_URL =
    "https://static.wixstatic.com/media/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png/v1/fill/w_77,h_60,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1b0281_ef9aa17a06ce4946acda750d99e30419~mv2.png";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gorillaproof.com.br";

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

// ─── Email Template System ───

interface BaseTemplateOptions {
    preheader?: string;
}

function baseTemplate(content: string, options?: BaseTemplateOptions) {
    const preheader = options?.preheader || "";

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
<body style="margin:0;padding:0;background-color:#0a0a16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale">
${preheader ? `<div style="display:none;font-size:1px;color:#0a0a16;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a16">
<tr><td align="center" class="email-wrapper" style="padding:32px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<!-- Header -->
<tr><td align="center" style="padding:0 0 28px">
  <table role="presentation" cellpadding="0" cellspacing="0">
  <tr>
    <td style="vertical-align:middle;padding-right:10px">
      <img src="${LOGO_URL}" alt="GorillaProof" width="32" height="25" style="display:block;border:0">
    </td>
    <td style="vertical-align:middle">
      <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#34d399">gorilla</span><span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#ffffff">proof</span>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Accent line -->
<tr><td style="padding:0 0 24px">
  <div style="height:2px;background:linear-gradient(90deg,transparent,#34d399,transparent);border-radius:2px"></div>
</td></tr>

<!-- Body Card -->
<tr><td class="email-card" style="background-color:#13132a;border:1px solid #1e1e3a;border-radius:16px;padding:28px 24px">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:28px 0 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:0 0 12px">
    <div style="height:1px;background-color:#1e1e3a;width:80%"></div>
  </td></tr>
  <tr><td align="center" style="color:#4a4a6a;font-size:11px;line-height:1.6">
    <p style="margin:0 0 4px">GorillaProof&reg; &mdash; Proofing &amp; Approval Platform</p>
    <p style="margin:0">
      <a href="${SITE_URL}" style="color:#34d399;text-decoration:none">gorillaproof.com.br</a>
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

// ─── Notification Functions ───

export async function notifyNewComment(params: {
    proofTitle: string;
    proofUrl: string;
    authorName: string;
    commentText: string;
    recipients: { email: string; name?: string }[];
}) {
    const content = params.commentText.replace(/<[^>]+>/g, "").slice(0, 200);

    await sendEmail({
        to: params.recipients,
        subject: `Novo comentário em "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px">Novo comentário</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:#34d399">${escapeHtml(params.authorName)}</strong> comentou em <strong style="color:#ffffff">${escapeHtml(params.proofTitle)}</strong></p>
<div style="background:#0e0e20;border-left:3px solid #34d399;padding:14px 18px;border-radius:0 10px 10px 0;margin:0 0 20px">
<p style="color:#d4d4d8;font-size:13px;margin:0;line-height:1.6">${content}${params.commentText.length > 200 ? "..." : ""}</p>
</div>
<div style="text-align:center">
<a href="${params.proofUrl}" class="email-btn" style="display:inline-block;background:#34d399;color:#0a0a16;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px">Ver comentário</a>
</div>
`, { preheader: `${escapeHtml(params.authorName)} comentou em ${escapeHtml(params.proofTitle)}` }),
    });
}

export async function notifyStatusChange(params: {
    proofTitle: string;
    proofUrl: string;
    changedBy: string;
    newStatus: string;
    recipients: { email: string; name?: string }[];
}) {
    const statusLabels: Record<string, { label: string; color: string }> = {
        approved: { label: "Aprovado", color: "#34d399" },
        rejected: { label: "Rejeitado", color: "#ef4444" },
        changes_requested: { label: "Alterações solicitadas", color: "#f59e0b" },
        in_review: { label: "Em revisão", color: "#60a5fa" },
    };

    const st = statusLabels[params.newStatus] || { label: params.newStatus, color: "#a1a1aa" };

    await sendEmail({
        to: params.recipients,
        subject: `"${params.proofTitle}" — ${st.label}`,
        html: baseTemplate(`
<h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px">Status atualizado</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:#34d399">${escapeHtml(params.changedBy)}</strong> alterou o status de <strong style="color:#ffffff">${escapeHtml(params.proofTitle)}</strong></p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:${st.color}15;color:${st.color};padding:10px 24px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid ${st.color}30">${st.label}</span>
</div>
<div style="text-align:center;margin-top:20px">
<a href="${params.proofUrl}" class="email-btn" style="display:inline-block;background:#34d399;color:#0a0a16;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px">Ver proof</a>
</div>
`, { preheader: `${escapeHtml(params.proofTitle)} agora está: ${st.label}` }),
    });
}

export async function notifyMention(params: {
    proofTitle: string;
    proofUrl: string;
    mentionedBy: string;
    commentText: string;
    recipientEmail: string;
    recipientName?: string;
}) {
    const content = params.commentText.replace(/<[^>]+>/g, "").slice(0, 200);

    await sendEmail({
        to: [{ email: params.recipientEmail, name: params.recipientName }],
        subject: `${params.mentionedBy} mencionou você em "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px">Você foi mencionado(a)</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 20px;line-height:1.5"><strong style="color:#34d399">${escapeHtml(params.mentionedBy)}</strong> mencionou você em <strong style="color:#ffffff">${escapeHtml(params.proofTitle)}</strong></p>
<div style="background:#0e0e20;border-left:3px solid #60a5fa;padding:14px 18px;border-radius:0 10px 10px 0;margin:0 0 20px">
<p style="color:#d4d4d8;font-size:13px;margin:0;line-height:1.6">${content}${params.commentText.length > 200 ? "..." : ""}</p>
</div>
<div style="text-align:center">
<a href="${params.proofUrl}" class="email-btn" style="display:inline-block;background:#34d399;color:#0a0a16;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px">Ver menção</a>
</div>
`, { preheader: `${escapeHtml(params.mentionedBy)} mencionou você em ${escapeHtml(params.proofTitle)}` }),
    });
}

export async function notifyDeadlineApproaching(params: {
    proofTitle: string;
    proofUrl: string;
    deadline: string;
    recipients: { email: string; name?: string }[];
}) {
    const d = new Date(params.deadline);
    const formatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    await sendEmail({
        to: params.recipients,
        subject: `Prazo chegando: "${params.proofTitle}" — ${formatted}`,
        html: baseTemplate(`
<h2 style="color:#ffffff;font-size:17px;font-weight:700;margin:0 0 8px">Prazo se aproximando</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 20px;line-height:1.5">O proof <strong style="color:#ffffff">${escapeHtml(params.proofTitle)}</strong> tem prazo para:</p>
<div style="text-align:center;margin:20px 0">
<span style="display:inline-block;background:#f59e0b15;color:#f59e0b;padding:10px 24px;border-radius:10px;font-weight:700;font-size:15px;border:1px solid #f59e0b30">${formatted}</span>
</div>
<div style="text-align:center;margin-top:20px">
<a href="${params.proofUrl}" class="email-btn" style="display:inline-block;background:#34d399;color:#0a0a16;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px">Revisar agora</a>
</div>
`, { preheader: `Prazo para "${params.proofTitle}": ${formatted}` }),
    });
}
