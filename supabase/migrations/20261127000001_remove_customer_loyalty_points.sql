-- Review and apply manually. This migration is intentionally not executed by Codex.

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

alter table public.customer
  drop column if exists loyalty_points;
