-- Run ONCE in Supabase > SQL Editor, AFTER schema.sql. Safe to run on a live shop (it keeps your data).
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('unpaid','pending','confirmed','rejected'));
alter table orders add column if not exists email text;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists paystack_channel text;

-- The old "manual reference" checkout is removed so nobody can place an order without paying.
drop function if exists place_order(text,text,text,text,jsonb);

-- Creates an UNPAID order with a server-side total and a unique reference. Paystack then charges exactly that amount.
create or replace function start_checkout(p_name text, p_email text, p_phone text, p_address text, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_min int; v_pieces int; v_total numeric; v_items jsonb; v_ref text; v_id uuid;
begin
  select min_order into v_min from settings where id = 1;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Your cart is empty.'; end if;
  if exists (select 1 from jsonb_array_elements(p_lines) as l(v) where (l.v->>'qty')::int < 1 or (l.v->>'qty')::int > 500) then
    raise exception 'Invalid quantity.'; end if;
  select sum((l.v->>'qty')::int) into v_pieces from jsonb_array_elements(p_lines) as l(v);
  if v_pieces < v_min then raise exception 'The minimum order is % pieces.', v_min; end if;
  if length(trim(p_name))<2 or length(trim(p_phone))<7 or length(trim(p_address))<3 then raise exception 'Please fill in all details.'; end if;
  if position('@' in coalesce(p_email,'')) < 2 then raise exception 'Please enter a valid email address.'; end if;
  select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'price',i.price,'size',l.v->>'size','qty',(l.v->>'qty')::int)),
         sum(i.price * (l.v->>'qty')::int)
    into v_items, v_total
    from jsonb_array_elements(p_lines) as l(v) join items i on i.id = (l.v->>'id')::uuid and i.in_stock;
  if v_items is null or jsonb_array_length(v_items) <> jsonb_array_length(p_lines) then
    raise exception 'Some items are no longer available. Please review your cart.'; end if;
  v_ref := 'JC' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
  insert into orders (user_id, customer_name, email, phone, address, reference, items, pieces, total, status)
  values (auth.uid(), trim(p_name), trim(p_email), trim(p_phone), trim(p_address), v_ref, v_items, v_pieces, v_total, 'unpaid')
  returning id into v_id;
  return jsonb_build_object('order_id', v_id, 'reference', v_ref, 'total', v_total);
end $$;
grant execute on function start_checkout(text,text,text,text,jsonb) to anon, authenticated;
