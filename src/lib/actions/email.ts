"use server";

const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN;
const MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send";
const FROM_EMAIL = "noreply@gorillaproof.com.br";
const FROM_NAME = "GorillaProof";

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

// ─── Email Templates ───

function baseTemplate(content: string) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<div style="text-align:center;margin-bottom:24px">
<span style="font-size:20px;font-weight:800;color:#34d399;letter-spacing:-0.5px">gorilla</span><span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px">proof</span>
</div>
<div style="background:#1a1a2e;border:1px solid #2a2a40;border-radius:12px;padding:24px">
${content}
</div>
<div style="text-align:center;margin-top:20px;color:#666;font-size:11px">
GorillaProof® — Proofing & Approval Platform
</div>
</div>
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
        subject: `💬 Novo comentário em "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:#fff;font-size:16px;margin:0 0 8px">Novo comentário</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 16px"><strong style="color:#34d399">${params.authorName}</strong> comentou em <strong style="color:#fff">${params.proofTitle}</strong></p>
<div style="background:#15152a;border-left:3px solid #34d399;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 16px">
<p style="color:#d4d4d8;font-size:13px;margin:0;line-height:1.5">${content}${params.commentText.length > 200 ? "..." : ""}</p>
</div>
<a href="${params.proofUrl}" style="display:inline-block;background:#34d399;color:#0f0f1e;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Ver comentário →</a>
`),
    });
}

export async function notifyStatusChange(params: {
    proofTitle: string;
    proofUrl: string;
    changedBy: string;
    newStatus: string;
    recipients: { email: string; name?: string }[];
}) {
    const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
        approved: { label: "Aprovado", color: "#34d399", emoji: "✅" },
        rejected: { label: "Rejeitado", color: "#ef4444", emoji: "❌" },
        changes_requested: { label: "Alterações solicitadas", color: "#f59e0b", emoji: "🔄" },
        in_review: { label: "Em revisão", color: "#60a5fa", emoji: "👀" },
    };

    const st = statusLabels[params.newStatus] || { label: params.newStatus, color: "#a1a1aa", emoji: "📋" };

    await sendEmail({
        to: params.recipients,
        subject: `${st.emoji} "${params.proofTitle}" — ${st.label}`,
        html: baseTemplate(`
<h2 style="color:#fff;font-size:16px;margin:0 0 8px">Status atualizado</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 16px"><strong style="color:#34d399">${params.changedBy}</strong> alterou o status de <strong style="color:#fff">${params.proofTitle}</strong></p>
<div style="text-align:center;margin:16px 0">
<span style="display:inline-block;background:${st.color}20;color:${st.color};padding:8px 20px;border-radius:8px;font-weight:700;font-size:15px;border:1px solid ${st.color}40">${st.emoji} ${st.label}</span>
</div>
<div style="text-align:center;margin-top:16px">
<a href="${params.proofUrl}" style="display:inline-block;background:#34d399;color:#0f0f1e;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Ver proof →</a>
</div>
`),
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
        subject: `🔔 ${params.mentionedBy} mencionou você em "${params.proofTitle}"`,
        html: baseTemplate(`
<h2 style="color:#fff;font-size:16px;margin:0 0 8px">Você foi mencionado(a)</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 16px"><strong style="color:#34d399">${params.mentionedBy}</strong> mencionou você em <strong style="color:#fff">${params.proofTitle}</strong></p>
<div style="background:#15152a;border-left:3px solid #a78bfa;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 16px">
<p style="color:#d4d4d8;font-size:13px;margin:0;line-height:1.5">${content}${params.commentText.length > 200 ? "..." : ""}</p>
</div>
<a href="${params.proofUrl}" style="display:inline-block;background:#34d399;color:#0f0f1e;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Ver menção →</a>
`),
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
        subject: `⏰ Prazo chegando: "${params.proofTitle}" — ${formatted}`,
        html: baseTemplate(`
<h2 style="color:#fff;font-size:16px;margin:0 0 8px">Prazo se aproximando</h2>
<p style="color:#a1a1aa;font-size:13px;margin:0 0 16px">O proof <strong style="color:#fff">${params.proofTitle}</strong> tem prazo para:</p>
<div style="text-align:center;margin:16px 0">
<span style="display:inline-block;background:#f59e0b20;color:#f59e0b;padding:8px 20px;border-radius:8px;font-weight:700;font-size:15px;border:1px solid #f59e0b40">📅 ${formatted}</span>
</div>
<div style="text-align:center;margin-top:16px">
<a href="${params.proofUrl}" style="display:inline-block;background:#34d399;color:#0f0f1e;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Revisar agora →</a>
</div>
`),
    });
}
