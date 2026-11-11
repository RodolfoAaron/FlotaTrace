-- Ejecutar en SQL Editor después de 04_self_signup.sql. Todo se revierte.
begin;
insert into auth.users(id,email,raw_user_meta_data) values('55555555-5555-4555-8555-555555555555','signup-check@example.invalid',jsonb_build_object('display_name',repeat('N',120),'role','admin','active',true));
do $$ begin
 assert (select role='operador' and active=false and length(display_name)=100 from public.profiles where id='55555555-5555-4555-8555-555555555555'),'Perfil inicial incorrecto';
 assert not has_function_privilege('authenticated','flota_private.sync_email_profile()','EXECUTE'),'Función invocable por cliente';
end $$;
set local role authenticated;
set local request.jwt.claim.sub='55555555-5555-4555-8555-555555555555';
do $$ begin
 assert flota_private.user_role() is null,'Usuario sin confirmar obtuvo rol';
 assert (select count(*) from public.vehicles)=0,'Usuario sin confirmar accede a flota';
end $$;
reset role;
update auth.users set email_confirmed_at=clock_timestamp() where id='55555555-5555-4555-8555-555555555555';
set local role authenticated;
do $$ declare blocked boolean:=false;begin
 assert flota_private.user_role()='operador','No se activa tras confirmar correo';
 assert (select count(*) from public.vehicles)>0,'Operador confirmado no consulta flota';
 begin update public.profiles set role='admin' where id=auth.uid(); exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Operador se puede promover';
end $$;
reset role;
update public.profiles set active=false where id='55555555-5555-4555-8555-555555555555';
update auth.users set raw_user_meta_data='{"role":"admin","active":true}'::jsonb where id='55555555-5555-4555-8555-555555555555';
do $$ begin
 assert (select role='operador' and active=false from public.profiles where id='55555555-5555-4555-8555-555555555555'),'Metadatos alteran permisos';
 assert (select role='admin' and active=true from public.profiles where id='e41ba380-a5d4-4faf-bc2b-bb9e5f231802'),'Administrador existente modificado';
end $$;
rollback;
select 'APROBADO: perfil operador automático, bloqueo antes de confirmar, activación al confirmar, sin escalamiento por metadatos, sin auto-promoción y administrador preservado. No se conservaron usuarios ni cambios.' as resultado;

