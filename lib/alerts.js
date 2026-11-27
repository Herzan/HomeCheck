import { supabase } from './supabase';
import { getPrefs, currentSeason, occurrence, fmt, LABEL } from './seasons';
// Builds the list of things that need attention: overdue/due-soon tasks, expiring warranties, unfinished seasonal checklist.
export async function loadAlerts() {
  const now = new Date(), today = fmt(now), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7 = fmt(new Date(t0.getTime() + 7 * 864e5)), in60 = fmt(new Date(t0.getTime() + 60 * 864e5));
  const items = [];
  const { data: tasks } = await supabase.from('tasks').select('id,title,due_date').neq('status', 'done').lte('due_date', in7);
  (tasks || []).forEach(t => {
    const over = t.due_date < today;
    items.push({ key: `t:${t.id}:${over ? 'over' : 'soon'}`, level: over ? 'bad' : 'warn', tab: 'Tasks',
      text: over ? `Overdue: ${t.title} (was due ${t.due_date})` : `Due soon: ${t.title} (${t.due_date})` });
  });
  const { data: docs } = await supabase.from('documents').select('id,product,expiry_date').gte('expiry_date', today).lte('expiry_date', in60);
  (docs || []).forEach(d => {
    const days = Math.round((new Date(d.expiry_date + 'T00:00:00') - t0) / 864e5);
    items.push({ key: `d:${d.id}:${days <= 14 ? 14 : 60}`, level: days <= 14 ? 'bad' : 'warn', tab: 'Warranties & Receipts',
      text: `Warranty for ${d.product || 'item'} expires in ${days} day${days === 1 ? '' : 's'}` });
  });
  try {
    const p = getPrefs(), s = currentSeason(p), occ = occurrence(s, p);
    const { data: tpl } = await supabase.from('seasonal_templates').select('id').eq('season', s);
    if (tpl?.length) {
      const { data: pr } = await supabase.from('seasonal_progress').select('template_id').eq('year', occ.year);
      const done = new Set((pr || []).map(x => x.template_id));
      const left = tpl.filter(x => !done.has(x.id)).length;
      if (left) items.push({ key: `s:${s}:${occ.year}`, level: 'info', tab: 'Seasonal', text: `${LABEL[s]} checklist: ${left} item${left === 1 ? '' : 's'} left` });
    }
  } catch {}
  const order = { bad: 0, warn: 1, info: 2 };
  return items.sort((a, b) => order[a.level] - order[b.level]);
}
