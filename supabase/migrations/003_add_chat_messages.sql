create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  diagram_id text not null references diagrams(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  user_name text,
  user_color text,
  created_at timestamptz default now()
);

create index idx_chat_messages_diagram_id on chat_messages(diagram_id);

alter table chat_messages enable row level security;

create policy "Anyone can read chat messages"
  on chat_messages for select using (true);

create policy "Anyone can insert chat messages"
  on chat_messages for insert with check (true);
