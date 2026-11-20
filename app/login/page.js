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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🏠</div>
        <h2>{owner ? 'Homeowner' : 'Renter'} {mode === 'login' ? 'Login' : 'Registration'}</h2>
        <p className="login-subtitle">
          {mode === 'login'
            ? 'Welcome back to HomeCheck — Manage. Maintain. Relax.'
            : 'Create your HomeCheck account to start tracking your home.'}
        </p>

        {/* Renter / Homeowner - now spaced properly */}
        <div className="tabs">
          {['renter', 'owner'].map(x => (
            <button
              key={x}
              type="button"
              className={role === x ? 'on' : ''}
              onClick={() => setRole(x)}
            >
              {x === 'renter' ? '🔑 RENTER' : '🏠 HOMEOWNER'}
            </button>
          ))}
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            Email Address
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@email.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button>{mode === 'login' ? 'Login' : `Register as ${owner ? 'Homeowner' : 'Renter'}`}</button>
        </form>

        {msg && <p className="login-error">{msg}</p>}

        <p className="login-switch">
          {mode === 'login' ? 'First time using HomeCheck?' : 'Already registered?'}{' '}
          <a href="#" onClick={e => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }}>
            {mode === 'login' ? `Register as ${owner ? 'Homeowner' : 'Renter'}` : 'Login'}
          </a>
        </p>
      </div>
    </div>
  );
}
