-- Apply this migration in Supabase SQL Editor after reviewing existing customer rows.
-- It is intentionally not executed by the frontend or by Codex.

-- Fail safely if existing data already has duplicate Auth links. Resolve those
-- rows before creating the uniqueness guarantee.
do $$
begin
  if exists (
    select 1
    from public.customer
    where auth_user_id is not null
    group by auth_user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate non-null auth_user_id values exist in public.customer';
  end if;
end;
$$;

create unique index if not exists customer_auth_user_id_unique
  on public.customer (auth_user_id)
  where auth_user_id is not null;

alter table public.customer enable row level security;

drop policy if exists "Customers can view own profile" on public.customer;
create policy "Customers can view own profile"
  on public.customer for select to authenticated
  using (auth_user_id = (select auth.uid()));

drop policy if exists "Customers can update own profile" on public.customer;
create policy "Customers can update own profile"
  on public.customer for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_customer_id public.customer.customer_id%type;
begin
  if new.raw_user_meta_data ->> 'account_type' is distinct from 'customer' then
    return new;
  end if;

  -- Link an existing imported/unlinked row before considering an insert.
  select customer_id
    into matched_customer_id
    from public.customer
   where auth_user_id is null
     and email is not null
     and lower(trim(email)) = lower(trim(new.email))
   order by customer_id
   limit 1
   for update;

  if matched_customer_id is not null then
    update public.customer
       set auth_user_id = new.id,
           name = coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), name),
           contact_no = coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), contact_no)
     where customer_id = matched_customer_id;
  else
    insert into public.customer (auth_user_id, name, contact_no, email)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Customer'),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      new.email
    )
    on conflict (auth_user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer();

-- Customer sessions may not alter identifiers, email, username, or timestamps.
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
