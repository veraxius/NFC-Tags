// Generic outbound event dispatcher for n8n automations. One webhook URL,
// one payload shape ({ event, data, occurredAt }) — n8n routes internally
// with a Switch node on `event` instead of us maintaining a URL per
// automation. Never allowed to break the caller: a missing N8N_WEBHOOK_URL,
// a network failure, or a slow n8n instance must not fail (or even delay)
// the request that triggered it.
export async function notifyN8n(event: string, data: Record<string, unknown>) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data, occurredAt: new Date().toISOString() }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[n8n] "${event}" delivered but n8n responded ${res.status}`, await res.text().catch(() => ""));
    } else {
      console.log(`[n8n] "${event}" delivered (${res.status})`);
    }
  } catch (err) {
    console.error(`[n8n] failed to deliver "${event}"`, err);
  } finally {
    clearTimeout(timeout);
  }
}
