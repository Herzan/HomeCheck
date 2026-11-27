-- HomeCheck: seasonal checklists. Run once in the Supabase SQL editor (safe to re-run).
create table if not exists seasonal_templates (
  id serial primary key,
  season text not null check (season in ('spring','summer','fall','winter','dry','wet')),
  title text not null, detail text, appliance_type text, sort int default 0);
alter table seasonal_templates enable row level security;
drop policy if exists "read" on seasonal_templates;
create policy "read" on seasonal_templates for select using (true);

create table if not exists seasonal_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  template_id int not null references seasonal_templates on delete cascade,
  year int not null, done_at timestamptz default now(),
  unique (user_id, template_id, year));
alter table seasonal_progress enable row level security;
drop policy if exists "own" on seasonal_progress;
create policy "own" on seasonal_progress for all using (user_id=auth.uid()) with check (user_id=auth.uid());

alter table tasks add column if not exists season text;

-- Seed (only if empty)
insert into seasonal_templates(season,title,detail,appliance_type,sort)
select * from (values
('spring','Service the air conditioner','Replace filter, clear debris around the outdoor unit, test cooling before the heat arrives.','HVAC',1),
('spring','Clean gutters and downspouts','Remove winter debris and make sure water drains away from the foundation.','Roof/Gutters',2),
('spring','Inspect the roof','Look for missing, cracked or lifted shingles and damaged flashing.','Roof/Gutters',3),
('spring','Test smoke and CO detectors','Test each unit and replace batteries.','Smoke Detector',4),
('spring','Check for leaks and water damage','Look under sinks, around the water heater and on ceilings.',null,5),
('spring','Clean refrigerator coils','Vacuum the condenser coils so the fridge runs efficiently.','Refrigerator',6),
('summer','Replace HVAC filter','Heavy use in summer clogs filters faster.','HVAC',1),
('summer','Clear the AC condensate drain','Flush the drain line to prevent clogs and water damage.','HVAC',2),
('summer','Clean the dryer vent','Remove lint from the duct to reduce fire risk.','Dryer',3),
('summer','Inspect windows, doors and seals','Re-caulk gaps to keep cool air in.',null,4),
('summer','Check outdoor drainage and grading','Make sure water flows away from the house before storm season.',null,5),
('fall','Service the furnace / heating','Schedule an inspection and replace the filter before first use.','Furnace',1),
('fall','Clean gutters after leaves drop','Prevents ice dams and overflow.','Roof/Gutters',2),
('fall','Flush the water heater','Drain sediment from the tank.','Water Heater',3),
('fall','Test smoke and CO detectors','Test each unit and replace batteries.','Smoke Detector',4),
('fall','Seal drafts','Check weatherstripping around doors and windows.',null,5),
('fall','Disconnect outdoor hoses','Drain and store hoses, shut off exterior faucets.',null,6),
('winter','Protect pipes from freezing','Insulate exposed pipes and let faucets drip in extreme cold.',null,1),
('winter','Replace furnace filter','Check monthly during heavy use.','Furnace',2),
('winter','Check for ice dams and roof snow load','Clear snow from the roof edge if safe.','Roof/Gutters',3),
('winter','Know where the main water shutoff is','Test it so it works in an emergency.',null,4),
('winter','Clean dishwasher and washer','Run a cleaning cycle to remove buildup.','Dishwasher',5),
('dry','Replace A/C and HVAC filters','Dust and heat shorten filter life in the dry season.','HVAC',1),
('dry','Clean the A/C coils and outdoor unit','Hose off dust and clear vegetation around the unit.','HVAC',2),
('dry','Inspect the roof before the rains','Fix cracked tiles or sheets, reseal flashing and vents.','Roof/Gutters',3),
('dry','Clean gutters and drains','Clear dust and debris so water flows when the rains start.','Roof/Gutters',4),
('dry','Check electrical surge protection','Test surge protectors, since storms bring outages and spikes.',null,5),
('dry','Test smoke detectors','Test each unit and replace batteries.','Smoke Detector',6),
('wet','Check for leaks and damp spots','Look at ceilings, walls and under sinks after heavy rain.',null,1),
('wet','Clean gutters and clear drains','Clear leaves and debris after storms.','Roof/Gutters',2),
('wet','Check for mold and humidity','Use a dehumidifier or ventilate bathrooms and closets.',null,3),
('wet','Clean the A/C drain line and filter','High humidity means more condensate and mold in the system.','HVAC',4),
('wet','Inspect appliances for moisture damage','Check the washer, dryer and refrigerator seals and cords.',null,5),
('wet','Check electrical outlets near water','Test GFCI outlets and unplug devices during storms.',null,6)
) as v(season,title,detail,appliance_type,sort)
where not exists (select 1 from seasonal_templates);
