-- Run this whole file in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table admins (user_id uuid primary key references auth.users on delete cascade);
create table items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  price numeric(10,2) not null check (price >= 0),
  image_url text, image_path text,
  created_at timestamptz default now());
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null, phone text not null, address text not null,
  reference text not null, items jsonb not null, total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz default now());
create unique index orders_reference_uq on orders (lower(reference));
create table settings (
  id int primary key default 1 check (id = 1),
  account_name text not null default 'Jozzy''s Closet',
  method text not null default 'MTN Mobile Money',
  account_number text not null default '024 000 0000',
  delivery_note text not null default 'Delivery within Sunyani is GH₵30 to GH₵50, depending on distance.');
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
create policy "admin updates orders" on orders for update using (is_admin());

-- Customers never touch the orders table directly; they use these functions.
create function place_order(p_name text, p_phone text, p_address text, p_reference text, p_item_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_total numeric; v_id uuid;
begin
  if coalesce(array_length(p_item_ids,1),0) not between 1 and 10 then raise exception 'Choose between 1 and 10 items.'; end if;
  if length(trim(p_name))<2 or length(trim(p_phone))<7 or length(trim(p_address))<3 or length(trim(p_reference))<3 then
    raise exception 'Please fill in all details.'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price)), sum(price) into v_items, v_total
    from items where id = any(p_item_ids);
  if v_items is null or jsonb_array_length(v_items) <> array_length(p_item_ids,1) then
    raise exception 'Some items are no longer available. Please review your cart.'; end if;
  begin
    insert into orders (customer_name, phone, address, reference, items, total)
    values (trim(p_name), trim(p_phone), trim(p_address), trim(p_reference), v_items, v_total) returning id into v_id;
  exception when unique_violation then raise exception 'That payment reference was already used.'; end;
  return v_id;
end $$;

create function track_order(p_reference text, p_phone text) returns text
language sql security definer stable set search_path = public as $$
  select status from orders where lower(reference)=lower(trim(p_reference)) and phone=trim(p_phone) limit 1 $$;
grant execute on function place_order(text,text,text,text,uuid[]), track_order(text,text) to anon, authenticated;

-- Image storage
insert into storage.buckets (id, name, public) values ('item-images','item-images',true) on conflict do nothing;
create policy "public reads images" on storage.objects for select using (bucket_id = 'item-images');
create policy "admin uploads images" on storage.objects for insert with check (bucket_id = 'item-images' and is_admin());
create policy "admin deletes images" on storage.objects for delete using (bucket_id = 'item-images' and is_admin());

-- AFTER creating your admin user in Authentication > Users, run:
-- insert into admins (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL';
