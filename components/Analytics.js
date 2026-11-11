'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
const C = ['#2563eb', '#f59e0b', '#16a34a', '#a855f7', '#ef4444'];
export default function Analytics() {
  const [m, setM] = useState([]), [a, setA] = useState([]), [c, setC] = useState([]);
  useEffect(() => { (async () => {
    setM((await supabase.from('v_monthly_costs').select('*').order('month')).data || []);
    setA((await supabase.from('v_cost_by_appliance').select('*')).data || []);
    setC((await supabase.from('v_cost_by_category').select('*')).data || []);
  })(); }, []);
  const total = m.reduce((s, x) => s + +x.total, 0);
  return (<>
    <div className="card"><h3>Total spending</h3><h1>${total.toFixed(2)}</h1></div>
    <div className="card"><h3>Monthly spending</h3><ResponsiveContainer height={220}><BarChart data={m.map(x => ({ ...x, total: +x.total, month: x.month.slice(0, 7) }))}><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#2563eb" /></BarChart></ResponsiveContainer></div>
    <div className="card"><h3>By category</h3><ResponsiveContainer height={220}><PieChart><Pie data={c.map(x => ({ name: x.category, value: +x.total }))} dataKey="value" nameKey="name" outerRadius={80}>{c.map((_, i) => <Cell key={i} fill={C[i % 5]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></div>
    <div className="card"><h3>Cost per appliance</h3><table><thead><tr><th>Appliance</th><th>Spent</th><th>Replacement cost</th><th></th></tr></thead><tbody>
      {a.map(x => <tr key={x.appliance_id}><td>{x.name}</td><td>${(+x.total).toFixed(2)}</td><td>{x.replacement_cost ? '$' + x.replacement_cost : '—'}</td>
        <td>{x.replacement_cost && x.total >= 0.5 * x.replacement_cost && <span className="pill bad">⚠ Costs more to repair than replace</span>}</td></tr>)}</tbody></table></div></>);
}
