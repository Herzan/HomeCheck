'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
export default function Login() {
  const [role, setRole] = useState('renter'), [mode, setMode] = useState('login');
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), r = useRouter();
  const owner = role === 'owner';
  async function submit(e) {
    e.preventDefault(); setMsg('');
    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) return setMsg(error.message);
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (p && p.role !== role) { await supabase.auth.signOut(); return setMsg(`This account is registered as a ${p.role}. Switch tabs.`); }
      r.push('/dashboard');
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { role } } });
      if (error) return setMsg(error.message);
      if (data.session) r.push('/dashboard'); else setMsg('Check your email to confirm, then log in.');
    }
  }
  return (<div style={{ maxWidth: 420, margin: '60px auto' }} className="card">
    <div className="tabs">{['renter', 'owner'].map(x => <button key={x} className={role === x ? 'on' : ''} onClick={() => setRole(x)}>{x === 'renter' ? '🔑 RENTER' : '🏠 HOMEOWNER'}</button>)}</div>
    <h2>{owner ? 'Homeowner' : 'Renter'} {mode === 'login' ? 'Login' : 'Registration'}</h2>
    <form onSubmit={submit}>
      <label>Email Address<br /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="user@email.com" style={{ width: '100%' }} /></label><br />
      <label>Password<br /><input type="password" required minLength={6} value={pw} onChange={e => setPw(e.target.value)} style={{ width: '100%' }} /></label><br /><br />
      <button style={{ width: '100%' }}>{mode === 'login' ? 'Login' : `Register as ${owner ? 'Homeowner' : 'Renter'}`}</button>
    </form>
    {msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
    <p style={{ textAlign: 'center' }}>{mode === 'login' ? 'First time using HomeCheck?' : 'Already registered?'}{' '}
      <a href="#" onClick={e => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }}>{mode === 'login' ? `Register as ${owner ? 'Homeowner' : 'Renter'}` : 'Login'}</a></p>
  </div>);
}
