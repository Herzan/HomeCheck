'use client';
import { useEffect, useState } from 'react';
import { loadAlerts } from '../lib/alerts';
const rd = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const hasNotif = () => typeof Notification !== 'undefined';
const dot = { bad: '#dc2626', warn: '#f59e0b', info: '#2563eb' };

// Bell in the top bar: unread badge, dropdown list, optional browser notifications.
export default function Bell({ onOpen, refreshKey }) {
  const [items, setItems] = useState([]), [open, setOpen] = useState(false), [read, setRead] = useState([]);
  const [push, setPush] = useState(false), [perm, setPerm] = useState('default');

  async function refresh() {
    const it = await loadAlerts(); setItems(it);
    // Browser notification for alerts that are unread and not yet announced
    let on = false; try { on = localStorage.getItem('hc_push') === '1'; } catch {}
    if (on && hasNotif() && Notification.permission === 'granted') {
      const seen = rd('hc_notified'), rr = rd('hc_read');
      const fresh = it.filter(x => !rr.includes(x.key) && !seen.includes(x.key));
      fresh.slice(0, 3).forEach(x => { const n = new Notification('HomeCheck', { body: x.text, tag: x.key }); n.onclick = () => { window.focus(); onOpen(x.tab); n.close(); }; });
      if (fresh.length > 3) new Notification('HomeCheck', { body: `+${fresh.length - 3} more alerts`, tag: 'hc-more' });
      if (fresh.length) wr('hc_notified', [...seen, ...fresh.map(x => x.key)]);
    }
  }
  useEffect(() => {
    setRead(rd('hc_read'));
    try { setPush(localStorage.getItem('hc_push') === '1'); } catch {}
    if (hasNotif()) setPerm(Notification.permission);
    refresh();
    const id = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshKey]);

  const unread = items.filter(x => !read.includes(x.key));
  const mark = keys => { const r = [...new Set([...read, ...keys])]; setRead(r); wr('hc_read', r); };
  async function togglePush() {
    if (push) { setPush(false); try { localStorage.setItem('hc_push', '0'); } catch {} return; }
    if (!hasNotif()) return alert('This browser does not support notifications.');
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === 'granted') { setPush(true); try { localStorage.setItem('hc_push', '1'); } catch {} refresh(); }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginRight: 10 }}>
      <button className="sec" onClick={() => setOpen(!open)} aria-label="Notifications">
        🔔{unread.length > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 99, fontSize: 11, padding: '1px 6px', marginLeft: 4 }}>{unread.length}</span>}
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 340, maxWidth: '90vw', zIndex: 50, color: '#0f172a', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Notifications</b>
            {unread.length > 0 && <button className="sec" onClick={() => mark(items.map(x => x.key))}>Mark all read</button>}
          </div>
          {items.length === 0 && <p><small>You&apos;re all caught up 🎉</small></p>}
          {items.map(x => (
            <div key={x.key} onClick={() => { mark([x.key]); setOpen(false); onOpen(x.tab); }}
              style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', opacity: read.includes(x.key) ? 0.55 : 1 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: dot[x.level], marginTop: 6, flex: 'none' }} />
              <span style={{ fontSize: 14 }}>{x.text}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <label><input type="checkbox" checked={push} onChange={togglePush} disabled={perm === 'denied'} /> Browser notifications</label>
            {perm === 'denied' && <div><small>Blocked in your browser settings. Allow notifications for this site to turn them on.</small></div>}
            {push && <div><small>Shown while HomeCheck is open in a tab. Email reminders cover the rest.</small></div>}
          </div>
        </div>
      )}
    </div>
  );
}

// "Needs attention" card for the Overview tab.
export function AlertsPanel({ onOpen, refreshKey }) {
  const [items, setItems] = useState(null);
  useEffect(() => { loadAlerts().then(setItems); }, [refreshKey]);
  if (!items || !items.length) return null;
  return (
    <div className="card"><h3>Needs attention</h3>
      {items.map(x => (
        <div key={x.key} onClick={() => onOpen(x.tab)} style={{ display: 'flex', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: dot[x.level], marginTop: 6, flex: 'none' }} />
          <span>{x.text}</span>
        </div>
      ))}
    </div>
  );
}
