'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LABEL, getPrefs, setPrefs, seasonList, currentSeason, occurrence, fmt } from '../lib/seasons';

// Seasonal checklists: tick items off per season/year, or push unfinished ones into the Tasks list.
export default function Seasonal({ uid, appliances, onChange }) {
  const [p, setP] = useState({ mode: 'temperate', hemi: 'north' });
  const [season, setSeason] = useState(null), [tpl, setTpl] = useState([]), [done, setDone] = useState(new Set()), [msg, setMsg] = useState('');
  useEffect(() => { const x = getPrefs(); setP(x); setSeason(currentSeason(x)); }, []);
  const occ = season ? occurrence(season, p) : null;

  async function load() {
    if (!season) return;
    const { data: t } = await supabase.from('seasonal_templates').select('*').eq('season', season).order('sort');
    const { data: pr } = await supabase.from('seasonal_progress').select('template_id').eq('year', occ.year);
    setTpl(t || []); setDone(new Set((pr || []).map(x => x.template_id)));
  }
  useEffect(() => { load(); }, [season, p]);

  function change(next) { const n = { ...p, ...next }; setP(n); setPrefs(n); setSeason(currentSeason(n)); setMsg(''); }

  async function toggle(t) {
    const d = new Set(done);
    if (d.has(t.id)) { await supabase.from('seasonal_progress').delete().eq('template_id', t.id).eq('year', occ.year); d.delete(t.id); }
    else {
      await supabase.from('seasonal_progress').insert({ user_id: uid, template_id: t.id, year: occ.year }); d.add(t.id);
      // If this item was already added to the task list, close that task too
      await supabase.from('tasks').update({ status: 'done' }).eq('season', season).eq('title', t.title).neq('status', 'done');
    }
    setDone(d); onChange && onChange();
  }

  async function addToTasks() {
    const due = fmt(occ.end);
    const { data: ex } = await supabase.from('tasks').select('title').eq('season', season).eq('due_date', due);
    const have = new Set((ex || []).map(x => x.title));
    const rows = tpl.filter(t => !done.has(t.id) && !have.has(t.title)).map(t => ({
      user_id: uid, title: t.title, due_date: due, season,
      appliance_id: appliances.find(a => a.type === t.appliance_type)?.id || null,
    }));
    if (!rows.length) return setMsg('Nothing to add: every unfinished item is already in your tasks.');
    const { error } = await supabase.from('tasks').insert(rows);
    setMsg(error ? error.message : `Added ${rows.length} task${rows.length === 1 ? '' : 's'} due ${due}.`);
    onChange && onChange();
  }

  const left = tpl.filter(t => !done.has(t.id)).length, pct = tpl.length ? Math.round(100 * (tpl.length - left) / tpl.length) : 0;
  const cur = currentSeason(p);
  return (
    <div className="card">
      <h3>Seasonal checklists</h3>
      <div style={{ marginBottom: 8 }}>
        <select value={p.mode} onChange={e => change({ mode: e.target.value })}>
          <option value="temperate">Four seasons</option><option value="tropical">Tropical (dry / rainy)</option>
        </select>
        {p.mode === 'temperate' && (
          <select value={p.hemi} onChange={e => change({ hemi: e.target.value })}>
            <option value="north">Northern hemisphere</option><option value="south">Southern hemisphere</option>
          </select>
        )}
      </div>
      <div className="nav">
        {seasonList(p).map(s => <button key={s} className={season === s ? 'on' : ''} onClick={() => { setSeason(s); setMsg(''); }}>{LABEL[s]}{s === cur ? ' • now' : ''}</button>)}
      </div>
      {occ && <p><small>{season === cur ? 'Current season, ends' : 'Next occurrence ends'} {fmt(occ.end)} · {tpl.length - left} of {tpl.length} done ({pct}%)</small></p>}
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, marginBottom: 12 }}><div style={{ width: pct + '%', background: '#16a34a', height: 8, borderRadius: 99 }} /></div>
      {tpl.map(t => (
        <label key={t.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}>
          <input type="checkbox" checked={done.has(t.id)} onChange={() => toggle(t)} style={{ marginTop: 4 }} />
          <span><b style={{ textDecoration: done.has(t.id) ? 'line-through' : 'none' }}>{t.title}</b>
            {t.appliance_type && <span className="pill" style={{ marginLeft: 8 }}>{t.appliance_type}</span>}
            <br /><small>{t.detail}</small></span>
        </label>
      ))}
      {!tpl.length && <p><small>No checklist found. Run supabase/seasonal.sql in the Supabase SQL editor.</small></p>}
      <p><button onClick={addToTasks} disabled={!left}>Add unfinished items to my tasks</button> <small>{msg}</small></p>
    </div>
  );
}
