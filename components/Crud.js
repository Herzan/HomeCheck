'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
// Generic list + add form for a table. fields: [{k,label,type,options:[{v,l}],required}]
export default function Crud({ table, title, fields, cols, base = {}, uid, extra, onChange, order = 'created_at' }) {
  const [rows, setRows] = useState([]), [f, setF] = useState({}), [err, setErr] = useState('');
  const load = async () => { const { data } = await supabase.from(table).select('*').order(order, { ascending: false }); setRows(data || []); onChange && onChange(); };
  useEffect(() => { load(); }, [table]);
  async function add(e) {
    e.preventDefault(); setErr('');
    const row = { ...base, user_id: uid }; fields.forEach(x => { if (f[x.k] !== undefined && f[x.k] !== '') row[x.k] = f[x.k]; });
    const { error } = await supabase.from(table).insert(row);
    if (error) return setErr(error.message); setF({}); load();
  }
  const del = async id => { await supabase.from(table).delete().eq('id', id); load(); };
  return (<div className="card"><h3>{title}</h3>
    <form onSubmit={add}>{fields.map(x => x.options
      ? <select key={x.k} required={x.required} value={f[x.k] || ''} onChange={e => setF({ ...f, [x.k]: e.target.value })}><option value="">{x.label}</option>{x.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      : <input key={x.k} type={x.type || 'text'} step="any" required={x.required} placeholder={x.label} title={x.label} value={f[x.k] || ''} onChange={e => setF({ ...f, [x.k]: e.target.value })} />)}
      <button>Add</button></form>{err && <p style={{ color: 'red' }}>{err}</p>}
    <table><thead><tr>{cols.map(c => <th key={c.k}>{c.l}</th>)}<th></th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}>{cols.map(c => <td key={c.k}>{c.f ? c.f(r) : String(r[c.k] ?? '')}</td>)}
        <td>{extra && extra(r, load)} <button className="del" onClick={() => del(r.id)}>✕</button></td></tr>)}
    </tbody></table></div>);
}
