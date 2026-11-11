-- Operadores registrados por correo: sin privilegios de administrador.
-- El perfil se activa cuando Supabase confirma el correo.
begin;
create or replace function flota_private.sync_email_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
   insert into public.profiles(id,display_name,role,active)
   values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Operador'),100),'operador',new.email_confirmed_at is not null)
   on conflict(id) do nothing;
 elsif old.email_confirmed_at is null and new.email_confirmed_at is not null then
   update public.profiles set active=true where id=new.id and role='operador';
 end if;
 return new;
end $$;
revoke all on function flota_private.sync_email_profile() from public,anon,authenticated;
create trigger flota_profile_on_signup after insert on auth.users for each row execute function flota_private.sync_email_profile();
create trigger flota_profile_on_confirmation after update of email_confirmed_at on auth.users for each row execute function flota_private.sync_email_profile();
-- Cubre cuentas anteriores sin sobrescribir al administrador ni perfiles deshabilitados.
insert into public.profiles(id,display_name,role,active)
select id,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Operador'),100),'operador',email_confirmed_at is not null
from auth.users on conflict(id) do nothing;
commit;
