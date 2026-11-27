-- Review and apply manually. This file is intentionally not executed by Codex.
-- Creates customer profiles at Auth signup and permits customers to manage only
-- their own non-privileged profile fields.

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create customer profiles for customer registrations.
  if new.raw_user_meta_data ->> 'account_type' IS DISTINCT FROM 'customer' then
    return new;
  end if;

  insert into public.customer (
    auth_user_id,
    name,
    contact_no,
    email
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Customer'
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer();

drop policy if exists "Customers can update own profile" on public.customer;
create policy "Customers can update own profile"
  on public.customer for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create or replace function public.protect_customer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null
     and not public.is_owner()
     and not public.is_staff() then
    new.customer_id := old.customer_id;
    new.auth_user_id := old.auth_user_id;
    new.created_at := old.created_at;
    new.email := old.email;
    new.username := old.username;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_customer_fields_before_update on public.customer;
create trigger protect_customer_fields_before_update
  before update on public.customer
  for each row execute function public.protect_customer_fields();
