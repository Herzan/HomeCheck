'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseReceipt } from '../lib/receipt';
import Crud from './Crud';
// Hybrid OCR: on-device (Tesseract in browser) first; cloud fallback if confidence < 75.
export default function Documents({ uid, appliances }) {
  const [status, setStatus] = useState(''), [form, setForm] = useState(null), [file, setFile] = useState(null), [k, setK] = useState(0);
  async function scan(e) {
    const fl = e.target.files[0]; if (!fl) return; setFile(fl); setStatus('Scanning on-device…');
    const { createWorker } = await import('tesseract.js');
    const w = await createWorker('eng'); const { data } = await w.recognize(fl); await w.terminate();
    let res = { ...parseReceipt(data.text), ocr_text: data.text }, src = `On-device (confidence ${Math.round(data.confidence)}%)`;
    const missing = !res.vendor || !res.amount || !res.purchase_date;
    if (data.confidence < 75 || missing) {
      setStatus('Low confidence — using cloud fallback…');
      try { const r = await fetch('/api/ocr', { method: 'POST', body: JSON.stringify({ text: data.text }) }); res = { ...res, ...(await r.json()) }; src = `Cloud fallback (${res.source})`; } catch {}
    }
    setForm(res); setStatus(`${src} — please confirm or correct the details below.`);
  }
  async function save(e) {
    e.preventDefault(); let file_path = null;
    if (file) { file_path = `${uid}/${Date.now()}-${file.name}`; await supabase.storage.from('documents').upload(file_path, file); }
    const row = { user_id: uid, vendor: form.vendor, product: form.product, amount: form.amount || null, purchase_date: form.purchase_date || null,
      warranty_months: form.warranty_months || null, appliance_id: form.appliance_id || null, ocr_text: form.ocr_text, file_path };
    const { error } = await supabase.from('documents').insert(row);
    if (error) return setStatus(error.message); setForm(null); setFile(null); setStatus('Saved ✔ Reminders set 60 and 14 days before expiry.'); setK(k + 1);
  }
  const set = (key) => e => setForm({ ...form, [key]: e.target.value });
  const state = d => !d.expiry_date ? '—' : new Date(d.expiry_date) < new Date() ? 'Expired' : (new Date(d.expiry_date) - new Date()) / 864e5 < 60 ? 'Expiring soon' : 'Active';
  return (<>
    <div className="card"><h3>Scan receipt / warranty</h3>
      <input type="file" accept="image/*" capture="environment" onChange={scan} /> <small>{status}</small>
      {form && <form onSubmit={save}>
        <input placeholder="Vendor" value={form.vendor || ''} onChange={set('vendor')} />
        <input placeholder="Product" value={form.product || ''} onChange={set('product')} />
        <input type="date" value={form.purchase_date || ''} onChange={set('purchase_date')} />
        <input type="number" step="any" placeholder="Amount" value={form.amount || ''} onChange={set('amount')} />
        <input type="number" placeholder="Warranty (months)" value={form.warranty_months || ''} onChange={set('warranty_months')} />
        <select value={form.appliance_id || ''} onChange={set('appliance_id')}><option value="">Link appliance</option>{appliances.map(a => <option key={a.id} value={a.id}>{a.type} {a.brand}</option>)}</select>
        <button>Confirm &amp; save</button></form>}
    </div>
    <Crud key={k} table="documents" title="Warranties & Receipts" uid={uid} fields={[]}
      cols={[{ k: 'product', l: 'Item' }, { k: 'vendor', l: 'Vendor' }, { k: 'purchase_date', l: 'Receipt date' }, { k: 'expiry_date', l: 'Warranty expires' }, { k: 'amount', l: 'Amount' },
        { k: 's', l: 'Status', f: d => { const s = state(d); return <span className={'pill ' + (s === 'Expired' ? 'bad' : s === 'Expiring soon' ? 'warn' : '')}>{s}</span>; } },
        { k: 'file_path', l: 'File', f: d => d.file_path ? <a href="#" onClick={async e => { e.preventDefault(); const { data } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 60); window.open(data.signedUrl); }}>View</a> : '' }]} />
  </>);
}
