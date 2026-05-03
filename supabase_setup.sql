-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR --

-- 1. Create table for Spend Logs
create table spend_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  amount float8 not null,
  product_name text not null,
  timestamp timestamp with time zone default now()
);

-- 2. Create table for Activity Logs
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  content text not null,
  is_starred boolean default false,
  timestamp timestamp with time zone default now()
);

-- 3. Enable Row Level Security (RLS)
alter table spend_logs enable row level security;
alter table activity_logs enable row level security;

-- 4. Create Security Policies
create policy "Users can see own spend logs" on spend_logs for select using (auth.uid() = user_id);
create policy "Users can insert own spend logs" on spend_logs for insert with check (auth.uid() = user_id);
create policy "Users can see own activity logs" on activity_logs for select using (auth.uid() = user_id);
create policy "Users can insert own activity logs" on activity_logs for insert with check (auth.uid() = user_id);
