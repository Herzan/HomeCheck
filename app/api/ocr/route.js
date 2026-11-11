// Cloud fallback: turns messy OCR text into structured receipt fields.
import { parseReceipt } from '../../../lib/receipt';
export async function POST(req) {
  const { text } = await req.json();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ ...parseReceipt(text), source: 'regex-fallback' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 400, messages: [{ role: 'user',
        content: 'Extract from this receipt text. Reply ONLY JSON: {"vendor":"","purchase_date":"YYYY-MM-DD","amount":0,"product":"","warranty_months":0}\n\n' + text }] }) });
    const j = await r.json();
    const out = JSON.parse(j.content[0].text.replace(/```json|```/g, '').trim());
    return Response.json({ ...out, source: 'cloud' });
  } catch { return Response.json({ ...parseReceipt(text), source: 'regex-fallback' }); }
}
