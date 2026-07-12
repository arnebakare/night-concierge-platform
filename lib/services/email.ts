export async function sendStoredEmail(input: { to: string; subject: string; body: string }) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  const from = cleanEnv(process.env.EMAIL_FROM);

  if (!apiKey || !from) {
    return { ok: false as const, error: "Email sending is not configured. Add RESEND_API_KEY and EMAIL_FROM in Vercel." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.body
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false as const, error: typeof payload?.message === "string" ? payload.message : `Email provider returned ${response.status}.` };
    }
    return { ok: true as const, id: typeof payload?.id === "string" ? payload.id : null };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Email could not be sent." };
  }
}

export function getEmailConfigStatus() {
  return {
    ready: Boolean(cleanEnv(process.env.RESEND_API_KEY) && cleanEnv(process.env.EMAIL_FROM)),
    from: maskEmail(cleanEnv(process.env.EMAIL_FROM)),
    apiKeyConfigured: Boolean(cleanEnv(process.env.RESEND_API_KEY))
  };
}

function cleanEnv(value?: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

function maskEmail(value: string) {
  if (!value.includes("@")) return value;
  const [name, domain] = value.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
}
