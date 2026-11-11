-- HomeCheck schema. Run in Supabase SQL editor.
create table profiles (id uuid primary key references auth.users on delete cascade, role text not null default 'renter' check (role in ('renter','owner')), full_name text);
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into profiles(id, role) values (new.id, coalesce(new.raw_user_meta_data->>'role','renter')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table homes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  address text not null, type text not null check (type in ('own','rent')), move_in_date date, created_at timestamptz default now());
create table appliances (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  home_id uuid references homes on delete cascade, type text not null, brand text, model text, serial text, install_date date,
  climate text default 'moderate', filter_type text default 'standard', replacement_cost numeric, created_at timestamptz default now());
create table task_templates (id serial primary key, appliance_type text not null, title text not null, frequency_months int not null, climate_note text);
create table tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  appliance_id uuid references appliances on delete cascade, title text not null, due_date date not null, frequency_months int,
  status text not null default 'pending' check (status in ('pending','done')), landlord_responsible boolean default false, created_at timestamptz default now());
create table providers (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null, trade text, phone text, email text, notes text, rating numeric, rating_count int default 0, created_at timestamptz default now());
create table service_records (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  appliance_id uuid references appliances on delete set null, task_id uuid references tasks on delete set null, provider_id uuid references providers on delete set null,
  description text not null, service_date date not null, cost numeric default 0, category text default 'Maintenance', rating int check (rating between 1 and 5), notes text, created_at timestamptz default now());
create table documents (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  appliance_id uuid references appliances on delete set null, vendor text, product text, amount numeric, purchase_date date, warranty_months int,
  expiry_date date, file_path text, ocr_text text, created_at timestamptz default now());
create table costs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  service_record_id uuid references service_records on delete cascade, appliance_id uuid, amount numeric not null, category text, date date not null);
create table reminders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  document_id uuid references documents on delete cascade, remind_on date not null, message text, sent boolean default false);

-- Seed templates
insert into task_templates(appliance_type,title,frequency_months,climate_note) values
('HVAC','Change filter',3,'humid=every 2 months'),('HVAC','Seasonal tune-up',6,null),('HVAC','Duct check',60,null),
('Furnace','Change filter',3,'humid=every 2 months'),('Furnace','Annual inspection',12,null),
('Water Heater','Flush tank',12,null),('Water Heater','Inspect anode rod',12,null),
('Refrigerator','Clean condenser coils',6,null),('Refrigerator','Replace water filter',6,null),
('Dishwasher','Clean filter & run cleaner',3,null),('Washer','Clean drum / run cleaning cycle',3,null),('Dryer','Clean lint duct',12,null),
('Smoke Detector','Test & replace batteries',6,null),('Roof/Gutters','Clean gutters',12,null);

-- 1. Auto-generate tasks from templates (adjusted for climate / filter type)
create function generate_tasks() returns trigger language plpgsql security definer as $$
begin
  insert into tasks(user_id, appliance_id, title, due_date, frequency_months)
  select new.user_id, new.id, t.title,
    (coalesce(new.install_date, current_date) + make_interval(months => greatest(1, case
      when t.title ilike '%filter%' and (new.climate='humid' or new.filter_type='HEPA') then 2
      when t.title ilike '%filter%' and new.filter_type='pleated' then 4 else t.frequency_months end)))::date,
    case when t.title ilike '%filter%' and (new.climate='humid' or new.filter_type='HEPA') then 2 else t.frequency_months end
  from task_templates t where lower(t.appliance_type)=lower(new.type);
  return new; end $$;
create trigger trg_gen_tasks after insert on appliances for each row execute function generate_tasks();

-- 2. Warranty expiry + reminders at 60 and 14 days
create function doc_expiry() returns trigger language plpgsql security definer as $$
begin
  if new.expiry_date is null and new.purchase_date is not null and new.warranty_months is not null then
    new.expiry_date := (new.purchase_date + make_interval(months => new.warranty_months))::date; end if;
  return new; end $$;
create trigger trg_doc_expiry before insert or update on documents for each row execute function doc_expiry();
create function doc_reminders() returns trigger language plpgsql security definer as $$
begin
  delete from reminders where document_id=new.id;
  if new.expiry_date is not null then
    insert into reminders(user_id,document_id,remind_on,message) values
    (new.user_id,new.id,new.expiry_date-60,'Warranty for '||coalesce(new.product,'item')||' expires in 60 days'),
    (new.user_id,new.id,new.expiry_date-14,'Warranty for '||coalesce(new.product,'item')||' expires in 14 days'); end if;
  return new; end $$;
create trigger trg_doc_rem after insert or update on documents for each row execute function doc_reminders();

-- 3. Service record: complete task + schedule next, log cost, update provider rating
create function on_service_record() returns trigger language plpgsql security definer as $$
declare t tasks%rowtype;
begin
  if new.task_id is not null then
    select * into t from tasks where id=new.task_id;
    update tasks set status='done' where id=new.task_id;
    if t.frequency_months is not null then
      insert into tasks(user_id,appliance_id,title,due_date,frequency_months,landlord_responsible)
      values (t.user_id,t.appliance_id,t.title,(new.service_date+make_interval(months=>t.frequency_months))::date,t.frequency_months,t.landlord_responsible); end if; end if;
  if coalesce(new.cost,0) > 0 then
    insert into costs(user_id,service_record_id,appliance_id,amount,category,date) values (new.user_id,new.id,new.appliance_id,new.cost,new.category,new.service_date); end if;
  if new.provider_id is not null and new.rating is not null then
    update providers p set rating=(select avg(rating) from service_records where provider_id=p.id and rating is not null),
      rating_count=(select count(rating) from service_records where provider_id=p.id) where p.id=new.provider_id; end if;
  return new; end $$;
create trigger trg_service after insert on service_records for each row execute function on_service_record();

-- 4. Analytics views (security_invoker so RLS applies)
create view v_monthly_costs with (security_invoker=true) as select date_trunc('month',date)::date as month, sum(amount) total from costs group by 1;
create view v_cost_by_category with (security_invoker=true) as select coalesce(category,'Other') category, sum(amount) total from costs group by 1;
create view v_cost_by_appliance with (security_invoker=true) as
  select a.id appliance_id, a.type||' '||coalesce(a.brand,'') name, a.replacement_cost, coalesce(sum(c.amount),0) total
  from appliances a left join costs c on c.appliance_id=a.id group by a.id;

-- RLS: each user sees only their own rows
do $$ declare t text; begin
  foreach t in array array['homes','appliances','tasks','providers','service_records','documents','costs','reminders'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own" on %I for all using (user_id=auth.uid()) with check (user_id=auth.uid())', t); end loop; end $$;
alter table profiles enable row level security; create policy "own" on profiles for select using (id=auth.uid());
alter table task_templates enable row level security; create policy "read" on task_templates for select using (true);

-- Private file bucket for receipts/warranties
insert into storage.buckets(id,name,public) values ('documents','documents',false) on conflict do nothing;
create policy "own files" on storage.objects for all using (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text)
  with check (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
