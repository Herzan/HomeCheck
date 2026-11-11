'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Crud from '../../components/Crud';
import Documents from '../../components/Documents';
import Analytics from '../../components/Analytics';
import { buildICS, download } from '../../lib/ics';
const TYPES = ['HVAC', 'Water Heater', 'Furnace', 'Refrigerator', 'Dishwasher', 'Washer', 'Dryer', 'Smoke Detector', 'Roof/Gutters'].map(v => ({ v, l: v }));
const TRADES = ['Plumber', 'HVAC', 'Electrician', 'Handyman', 'Appliance Repair'].map(v => ({ v, l: v }));
const CATS = ['Repair', 'Maintenance', 'Service'].map(v => ({ v, l: v }));
export default function Dashboard() {
  const r = useRouter(), [u, setU] = useState(null), [role, setRole] = useState(''), [home, setHome] = useState(undefined), [tab, setTab] = useState('Overview');
  const [apps, setApps] = useState([]), [provs, setProvs] = useState([]), [hf, setHf] = useState({ address: '', move_in_date: '' }), [stats, setStats] = useState({});
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return r.push('/login'); setU(user);
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single(); setRole(p?.role || 'renter');
    const { data: h } = await supabase.from('homes').select('*').limit(1); setHome(h?.[0] || null);
  })(); }, []);
  const refs = async () => {
    setApps((await supabase.from('appliances').select('*')).data || []); setProvs((await supabase.from('providers').select('*')).data || []);
    const t = (await supabase.from('tasks').select('*').neq('status', 'done')).data || [], today = new Date().toISOString().slice(0, 10);
    setStats({ open: t.length, overdue: t.filter(x => x.due_date < today).length, docs: (await supabase.from('documents').select('id', { count: 'exact', head: true })).count });
  };
  useEffect(() => { if (home) refs(); }, [home, tab]);
  async function mkHome(e) { e.preventDefault(); const { data } = await supabase.from('homes').insert({ ...hf, user_id: u.id, type: role === 'owner' ? 'own' : 'rent', move_in_date: hf.move_in_date || null }).select().single(); setHome(data); }
  async function exportICS() {
    const t = (await supabase.from('tasks').select('title,due_date').neq('status', 'done')).data || [];
    const d = (await supabase.from('documents').select('product,expiry_date').not('expiry_date', 'is', null)).data || [];
    download('homecheck.ics', buildICS([...t.map(x => ({ title: x.title, date: x.due_date })), ...d.map(x => ({ title: `Warranty expires: ${x.product}`, date: x.expiry_date }))]));
  }
  if (!u || home === undefined) return <p style={{ padding: 20 }}>Loading…</p>;
  const owner = role === 'owner';
  if (!home) return (<div style={{ maxWidth: 420, margin: '60px auto' }} className="card"><h2>Set up your {owner ? 'home' : 'rental'}</h2>
    <form onSubmit={mkHome}><input required placeholder="Address" value={hf.address} onChange={e => setHf({ ...hf, address: e.target.value })} style={{ width: '100%' }} />
      <input type="date" title="Move-in date" value={hf.move_in_date} onChange={e => setHf({ ...hf, move_in_date: e.target.value })} /><button>Save</button></form></div>);
  const tabs = ['Overview', 'Appliances', 'Tasks', 'Warranties & Receipts', 'Service History', 'Providers', 'Calendar'];
  const ao = apps.map(a => ({ v: a.id, l: `${a.type} ${a.brand || ''}` })), an = id => { const a = apps.find(x => x.id === id); return a ? `${a.type} ${a.brand || ''}` : ''; };
  return (<><div className="top"><b>🏠 HomeCheck — {owner ? 'Homeowner' : 'Renter'}: {home.address}</b>
    <button className="sec" onClick={async () => { await supabase.auth.signOut(); r.push('/login'); }}>Log out</button></div>
    <div className="wrap"><div className="nav">{tabs.map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Overview' && <><div className="card" style={{ display: 'flex', gap: 40 }}>
      <div><small>Open tasks</small><h1>{stats.open ?? 0}</h1></div><div><small>Overdue</small><h1 style={{ color: stats.overdue ? '#dc2626' : 'inherit' }}>{stats.overdue ?? 0}</h1></div><div><small>Documents</small><h1>{stats.docs ?? 0}</h1></div></div><Analytics /></>}
    {tab === 'Appliances' && <Crud table="appliances" title="Appliances (tasks auto-generate from templates)" uid={u.id} base={{ home_id: home.id }} onChange={refs}
      fields={[{ k: 'type', label: 'Type', options: TYPES, required: true }, { k: 'brand', label: 'Brand' }, { k: 'model', label: 'Model' }, { k: 'serial', label: 'Serial' }, { k: 'install_date', label: 'Install date', type: 'date' },
        { k: 'climate', label: 'Climate', options: ['humid', 'moderate', 'dry', 'cold'].map(v => ({ v, l: v })) }, { k: 'filter_type', label: 'Filter', options: ['standard', 'pleated', 'HEPA'].map(v => ({ v, l: v })) }, { k: 'replacement_cost', label: 'Replacement cost', type: 'number' }]}
      cols={[{ k: 'type', l: 'Type' }, { k: 'brand', l: 'Brand' }, { k: 'model', l: 'Model' }, { k: 'serial', l: 'Serial' }, { k: 'install_date', l: 'Installed' }, { k: 'climate', l: 'Climate' }]} />}
    {tab === 'Tasks' && <Crud table="tasks" title="Maintenance tasks" uid={u.id} order="due_date" onChange={refs}
      fields={[{ k: 'title', label: 'Task', required: true }, { k: 'due_date', label: 'Due', type: 'date', required: true }, { k: 'frequency_months', label: 'Every (months)', type: 'number' }, { k: 'appliance_id', label: 'Appliance', options: ao }]}
      cols={[{ k: 'title', l: 'Task' }, { k: 'appliance_id', l: 'Appliance', f: r => an(r.appliance_id) }, { k: 'due_date', l: 'Due' }, { k: 'frequency_months', l: 'Every (mo)' },
        { k: 'status', l: 'Status', f: r => <span className={'pill ' + (r.status !== 'done' && r.due_date < new Date().toISOString().slice(0, 10) ? 'bad' : '')}>{r.status}</span> },
        ...(owner ? [] : [{ k: 'landlord_responsible', l: 'Landlord', f: r => r.landlord_responsible ? 'Yes' : '' }])]}
      extra={(row, load) => <>{!owner && <button className="sec" onClick={async () => { await supabase.from('tasks').update({ landlord_responsible: !row.landlord_responsible }).eq('id', row.id); load(); }}>Landlord?</button>} {row.status !== 'done' && <button onClick={async () => { await supabase.from('service_records').insert({ user_id: u.id, task_id: row.id, appliance_id: row.appliance_id, description: row.title, service_date: new Date().toISOString().slice(0, 10), cost: 0, category: 'Maintenance' }); load(); }}>Done</button>}</>} />}
    {tab === 'Warranties & Receipts' && <Documents uid={u.id} appliances={apps} />}
    {tab === 'Service History' && <Crud table="service_records" title="Service records (cost + rating feed analytics & providers)" uid={u.id} order="service_date"
      fields={[{ k: 'description', label: 'What was done', required: true }, { k: 'service_date', label: 'Date', type: 'date', required: true }, { k: 'appliance_id', label: 'Appliance', options: ao }, { k: 'provider_id', label: 'Provider', options: provs.map(p => ({ v: p.id, l: p.name })) },
        { k: 'cost', label: 'Cost', type: 'number' }, { k: 'category', label: 'Category', options: CATS }, { k: 'rating', label: 'Rating', options: [1, 2, 3, 4, 5].map(v => ({ v, l: '★'.repeat(v) })) }, { k: 'notes', label: 'Notes' }]}
      cols={[{ k: 'service_date', l: 'Date' }, { k: 'description', l: 'Work' }, { k: 'appliance_id', l: 'Appliance', f: r => an(r.appliance_id) }, { k: 'provider_id', l: 'Provider', f: r => provs.find(p => p.id === r.provider_id)?.name || '' }, { k: 'cost', l: 'Cost' }, { k: 'rating', l: 'Rating' }]} />}
    {tab === 'Providers' && <Crud table="providers" title="Service providers (average rating updates automatically)" uid={u.id} onChange={refs}
      fields={[{ k: 'name', label: 'Name', required: true }, { k: 'trade', label: 'Trade', options: TRADES }, { k: 'phone', label: 'Phone' }, { k: 'email', label: 'Email' }, { k: 'notes', label: 'Notes' }]}
      cols={[{ k: 'name', l: 'Name' }, { k: 'trade', l: 'Trade' }, { k: 'rating', l: 'Avg rating', f: r => r.rating ? `★ ${(+r.rating).toFixed(1)} (${r.rating_count})` : '—' }, { k: 'phone', l: 'Phone' }, { k: 'email', l: 'Email' }]}
      extra={r => r.phone && <a href={`tel:${r.phone}`}><button className="sec">Call</button></a>} />}
    {tab === 'Calendar' && <div className="card"><h3>Calendar integration</h3><p>Download an .ics file of all open tasks and warranty expiries (import into Google/Apple/Outlook). For an auto-updating subscribable feed, deploy an Edge Function that returns <code>buildICS()</code> output.</p><button onClick={exportICS}>Export .ics</button></div>}
    </div></>);
}
