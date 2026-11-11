// Scheduled Edge Function (daily cron): emails reminders as a backup to local push.
// Env: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const today = new Date().toISOString().slice(0, 10);
  const { data: tasks } = await sb.from('tasks').select('title,due_date,user_id').lte('due_date', today).neq('status', 'done');
  const { data: rem } = await sb.from('reminders').select('id,remind_on,user_id,message').lte('remind_on', today).eq('sent', false);
  const items = [...(tasks || []).map(t => ({ user_id: t.user_id, text: `Task due: ${t.title} (${t.due_date})` })), ...(rem || []).map(r => ({ user_id: r.user_id, text: r.message }))];
  for (const it of items) {
    const { data: u } = await sb.auth.admin.getUserById(it.user_id);
    if (u?.user?.email) await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'HomeCheck <reminders@yourdomain.com>', to: u.user.email, subject: 'HomeCheck reminder', text: it.text }) });
  }
  if (rem?.length) await sb.from('reminders').update({ sent: true }).in('id', rem.map(r => r.id));
  return new Response(JSON.stringify({ sent: items.length }));
});
