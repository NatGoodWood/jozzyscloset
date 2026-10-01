-- JOZZYS CLOSET: run this whole file in Supabase > SQL Editor.
-- It RESETS the shop tables (items, orders, settings, admins). Safe on a new project.
drop function if exists is_admin() cascade;
drop policy if exists "public reads images" on storage.objects;
drop table if exists orders, items, settings, admins cascade;
drop function if exists place_order(text,text,text,text,uuid[]);
drop function if exists place_order(text,text,text,text,jsonb);
drop function if exists track_order(text,text);
create extension if not exists pgcrypto;

create table admins (user_id uuid primary key references auth.users on delete cascade);
create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  price numeric(10,2) not null check (price >= 0),
  category text not null default 'Dresses',
  sizes text[] not null default '{}',
  description text default '',
  image_url text, image_path text,
  in_stock boolean not null default true,
  created_at timestamptz default now());
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  customer_name text not null, phone text not null, address text not null,
  reference text not null, items jsonb not null, pieces int not null, total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz default now());
create unique index orders_reference_uq on orders (lower(reference));
create table settings (
  id int primary key default 1 check (id = 1),
  account_name text not null default 'Jozzys Closet',
  method text not null default 'MTN Mobile Money',
  account_number text not null default '024 000 0000',
  delivery_note text not null default 'Delivery within Sunyani is GH₵30 to GH₵50, depending on distance.',
  min_order int not null default 10 check (min_order >= 1),
  about text not null default 'We are a fashion wholesale store committed to trendy, high-quality clothing, bags and accessories at the best prices. Our goal is to help resellers and business owners grow their brands with confidence.',
  phone text not null default '024 000 0000',
  whatsapp text not null default '233240000000',
  email text not null default 'hello@jozzyscloset.com',
  hero_url text);
insert into settings default values;

create function is_admin() returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

alter table admins enable row level security;
alter table items enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;
create policy "own admin row" on admins for select using (user_id = auth.uid());
create policy "public reads items" on items for select using (true);
create policy "admin writes items" on items for all using (is_admin()) with check (is_admin());
create policy "public reads settings" on settings for select using (true);
create policy "admin updates settings" on settings for update using (is_admin());
create policy "admin reads orders" on orders for select using (is_admin());
create policy "customer reads own orders" on orders for select using (user_id = auth.uid());
create policy "admin updates orders" on orders for update using (is_admin());

-- Customers never write to orders directly. This function checks everything on the server.
-- p_lines looks like: [{"id":"<item uuid>","size":"M","qty":3}]
create function place_order(p_name text, p_phone text, p_address text, p_reference text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_min int; v_pieces int; v_total numeric; v_items jsonb; v_id uuid;
begin
  select min_order into v_min from settings where id = 1;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Your cart is empty.'; end if;
  if exists (select 1 from jsonb_array_elements(p_lines) as l(v) where (l.v->>'qty')::int < 1 or (l.v->>'qty')::int > 500) then
    raise exception 'Invalid quantity.'; end if;
  select sum((l.v->>'qty')::int) into v_pieces from jsonb_array_elements(p_lines) as l(v);
  if v_pieces < v_min then raise exception 'The minimum order is % pieces.', v_min; end if;
  if length(trim(p_name))<2 or length(trim(p_phone))<7 or length(trim(p_address))<3 or length(trim(p_reference))<3 then
    raise exception 'Please fill in all details.'; end if;
  select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'price',i.price,'size',l.v->>'size','qty',(l.v->>'qty')::int)),
         sum(i.price * (l.v->>'qty')::int)
    into v_items, v_total
    from jsonb_array_elements(p_lines) as l(v) join items i on i.id = (l.v->>'id')::uuid and i.in_stock;
  if v_items is null or jsonb_array_length(v_items) <> jsonb_array_length(p_lines) then
    raise exception 'Some items are no longer available. Please review your cart.'; end if;
  begin
    insert into orders (user_id, customer_name, phone, address, reference, items, pieces, total)
    values (auth.uid(), trim(p_name), trim(p_phone), trim(p_address), trim(p_reference), v_items, v_pieces, v_total)
    returning id into v_id;
  exception when unique_violation then raise exception 'That payment reference was already used.'; end;
  return v_id;
end $$;

create function track_order(p_reference text, p_phone text) returns text
language sql security definer stable set search_path = public as $$
  select status from orders where lower(reference)=lower(trim(p_reference)) and phone=trim(p_phone) limit 1 $$;
grant execute on function place_order(text,text,text,text,jsonb), track_order(text,text) to anon, authenticated;

-- Image storage (product photos and the homepage banner)
insert into storage.buckets (id, name, public) values ('item-images','item-images',true) on conflict do nothing;
create policy "public reads images" on storage.objects for select using (bucket_id = 'item-images');
create policy "admin uploads images" on storage.objects for insert with check (bucket_id = 'item-images' and is_admin());
create policy "admin deletes images" on storage.objects for delete using (bucket_id = 'item-images' and is_admin());

-- AFTER creating your admin user in Authentication > Users, run:
-- insert into admins (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL';
