"use server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface SummarizeResult {
    summary: string | null;
    error: string | null;
}

export async function summarizeComments(
    comments: { author: string; content: string; status: string; hasPin: boolean; timestamp?: string | null }[]
): Promise<SummarizeResult> {
    if (!OPENROUTER_API_KEY) {
        return { summary: null, error: "OPENROUTER_API_KEY not configured" };
    }

    if (comments.length === 0) {
        return { summary: null, error: "No comments to summarize" };
    }

    // Build context
    const commentList = comments.map((c, i) => {
        const pin = c.hasPin ? " [📍 pinned]" : "";
        const status = c.status === "resolved" ? " [resolved]" : "";
        const time = c.timestamp ? ` [⏱ ${c.timestamp}]` : "";
        // Strip HTML
        const text = c.content.replace(/<[^>]+>/g, "").trim();
        return `${i + 1}. ${c.author}${pin}${status}${time}: ${text}`;
    }).join("\n");

    const systemPrompt = `You are a professional project reviewer assistant. Summarize feedback from comments on a creative proof (design, video, or document being reviewed).

Rules:
- Write in Portuguese (Brazilian)
- Be concise but comprehensive
- Group by themes (ex: design, copy, técnico, geral)
- Highlight unresolved issues first
- Mention resolved items briefly
- Use bullet points
- Keep it under 200 words
- Include comment numbers for reference`;

    const userPrompt = `Resuma estes ${comments.length} comentários de revisão:\n\n${commentList}`;

    try {
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://gorillaproof.com.br",
                "X-Title": "GorillaProof",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 600,
                temperature: 0.3,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            return { summary: null, error: `API error: ${res.status} - ${err}` };
        }

        const data = await res.json();
        const summary = data.choices?.[0]?.message?.content?.trim();

        if (!summary) {
            return { summary: null, error: "Empty response from AI" };
        }

        return { summary, error: null };
    } catch (err: unknown) {
        return { summary: null, error: `Request failed: ${(err as Error).message}` };
    }
}
