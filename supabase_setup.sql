-- ===== สร้างตาราง rooms =====
create table if not exists rooms (
  id          text primary key,
  number      text not null,
  zone        text not null,
  type        text not null,
  floor       int,
  building    text,
  status      text not null default 'available',
  bookings    jsonb not null default '[]'::jsonb,
  updated_at  timestamptz default now()
);

-- ===== อัพเดท updated_at อัตโนมัติ =====
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rooms_updated_at
  before update on rooms
  for each row execute function update_updated_at();

-- ===== เปิด Real-time =====
alter publication supabase_realtime add table rooms;

-- ===== Row Level Security (ให้ทุกคน read ได้, write ต้องมี key) =====
alter table rooms enable row level security;

create policy "allow read" on rooms for select using (true);
create policy "allow write" on rooms for all using (true);
