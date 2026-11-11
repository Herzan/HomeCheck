// Pull vendor, date, amount, product, warranty length out of raw OCR text.
export function parseReceipt(text) {
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  const date = (text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/) || [])[0];
  let iso = '';
  if (date) { const d = new Date(date); if (!isNaN(d)) iso = d.toISOString().slice(0, 10); }
  const amounts = [...text.matchAll(/\$?\s?(\d{1,6}[.,]\d{2})\b/g)].map(m => parseFloat(m[1].replace(',', '.')));
  const totalLine = lines.find(l => /total/i.test(l) && /\d+[.,]\d{2}/.test(l));
  const amount = totalLine ? parseFloat(totalLine.match(/(\d+[.,]\d{2})/)[1].replace(',', '.')) : (amounts.length ? Math.max(...amounts) : '');
  const w = text.match(/(\d+)\s*[- ]?\s*(year|yr|month|mo)/i);
  const warranty_months = w ? (/y/i.test(w[2]) ? +w[1] * 12 : +w[1]) : '';
  return { vendor: lines[0] || '', purchase_date: iso, amount, product: lines.find(l => /[A-Za-z]{3,}.*\d{2,}/.test(l) && !/total|tax/i.test(l)) || '', warranty_months };
}
