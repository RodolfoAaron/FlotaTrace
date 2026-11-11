-- Ejecutar UNA vez en SQL Editor de un proyecto dedicado a FlotaTrace.
begin;
create schema if not exists flota_private;
revoke all on schema flota_private from public;
grant usage on schema flota_private to authenticated, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(trim(display_name)) between 1 and 100),
 role text not null default 'operador' check(role in ('admin','operador')),
 active boolean not null default true
);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(),
 plate text unique not null check(plate=upper(plate) and plate ~ '^[A-Z0-9-]{5,12}$'),
 brand text not null check(length(trim(brand)) between 1 and 60),
 model text not null check(length(trim(model)) between 1 and 60),
 year integer not null check(year between 1950 and 2100),
 status text not null default 'activo' check(status in ('activo','mantenimiento','inactivo')),
 created_at timestamptz not null default now()
);
create table public.warehouses (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 100),
 address text not null check(length(trim(address)) between 1 and 500),
 lat double precision not null check(lat between -90 and 90),
 lng double precision not null check(lng between -180 and 180),
 radius_m double precision not null check(radius_m between 20 and 5000),
 max_accuracy_m double precision not null default 50 check(max_accuracy_m between 1 and 100 and max_accuracy_m<=radius_m/2),
 created_at timestamptz not null default now()
);
create table public.movements (
 id uuid primary key default gen_random_uuid(),
 request_id uuid unique not null,
 vehicle_id uuid not null references public.vehicles(id) on delete restrict,
 warehouse_id uuid not null references public.warehouses(id) on delete restrict,
 operator_id uuid not null references public.profiles(id) on delete restrict,
 type text not null check(type in ('entrada','salida')),
 lat double precision not null check(lat between -90 and 90),
 lng double precision not null check(lng between -180 and 180),
 accuracy_m double precision not null check(accuracy_m>0 and accuracy_m<=100),
 distance_m double precision not null check(distance_m>=0),
 captured_at timestamptz not null,
 created_at timestamptz not null default now(),
 address text not null default '' check(length(address)<=1000),
 -- Geocerca al momento de registrar: las ediciones posteriores no cambian la evidencia.
 warehouse_lat double precision not null,
 warehouse_lng double precision not null,
 radius_m double precision not null,
 max_accuracy_m double precision not null,
 warehouse_name text not null,
 vehicle_plate text not null
);
create index movements_vehicle_latest on public.movements(vehicle_id,created_at desc,id desc);
create index movements_warehouse_time on public.movements(warehouse_id,created_at desc);
create index movements_operator on public.movements(operator_id);
create index movements_time on public.movements(created_at desc,id desc);

-- Único acceso privilegiado al perfil: evita recursión de RLS y no usa user_metadata.
create function flota_private.user_role() returns text
language sql stable security definer set search_path=''
as $$ select role from public.profiles where id=(select auth.uid()) and active $$;
revoke all on function flota_private.user_role() from public;
grant execute on function flota_private.user_role() to authenticated;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.warehouses enable row level security;
alter table public.movements enable row level security;
revoke all on public.profiles,public.vehicles,public.warehouses,public.movements from anon,authenticated;
grant select on public.profiles,public.vehicles,public.warehouses,public.movements to authenticated;
grant insert,update,delete on public.vehicles,public.warehouses to authenticated;
grant insert on public.movements to authenticated;
create policy profiles_read on public.profiles for select to authenticated
 using(id=(select auth.uid()) or (select flota_private.user_role())='admin');
create policy vehicles_read on public.vehicles for select to authenticated
 using((select flota_private.user_role()) in ('admin','operador'));
create policy vehicles_admin on public.vehicles for all to authenticated
 using((select flota_private.user_role())='admin') with check((select flota_private.user_role())='admin');
create policy warehouses_read on public.warehouses for select to authenticated
 using((select flota_private.user_role()) in ('admin','operador'));
create policy warehouses_admin on public.warehouses for all to authenticated
 using((select flota_private.user_role())='admin') with check((select flota_private.user_role())='admin');
create policy movements_read on public.movements for select to authenticated
 using((select flota_private.user_role()) in ('admin','operador'));
create policy movements_insert on public.movements for insert to authenticated
 with check(operator_id=(select auth.uid()) and (select flota_private.user_role()) in ('admin','operador'));

create function public.distance_m(p_lat1 double precision,p_lng1 double precision,p_lat2 double precision,p_lng2 double precision)
returns double precision language sql immutable strict parallel safe set search_path=''
as $$ select 6371000.0*2*asin(sqrt(least(1.0,greatest(0.0,
 power(sin(radians(p_lat2-p_lat1)/2),2)+cos(radians(p_lat1))*cos(radians(p_lat2))*power(sin(radians(p_lng2-p_lng1)/2),2))))) $$;
revoke all on function public.distance_m(double precision,double precision,double precision,double precision) from public;
grant execute on function public.distance_m(double precision,double precision,double precision,double precision) to authenticated;

-- El trigger protege también inserciones directas por REST. Los valores sensibles se recalculan.
create function flota_private.validate_movement() returns trigger
language plpgsql security definer set search_path='' as $$
declare w public.warehouses; v public.vehicles; last_m public.movements; d double precision;
begin
 if auth.uid() is null or flota_private.user_role() is null then raise exception 'Usuario no habilitado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.vehicle_id::text,0));
 select * into v from public.vehicles where id=new.vehicle_id for share;
 if not found or v.status<>'activo' then raise exception 'Vehículo inexistente o no activo'; end if;
 select * into w from public.warehouses where id=new.warehouse_id for share;
 if not found then raise exception 'Almacén inexistente'; end if;
 if new.lat is null or new.lng is null or new.accuracy_m is null or
    not(new.lat between -90 and 90) or not(new.lng between -180 and 180) or
    not(new.accuracy_m>0 and new.accuracy_m<=least(w.max_accuracy_m,w.radius_m/2)) then
   raise exception 'Coordenadas o precisión inválidas';
 end if;
 if new.captured_at is null or new.captured_at<clock_timestamp()-interval '60 seconds' or new.captured_at>clock_timestamp()+interval '10 seconds' then
   raise exception 'Ubicación vencida. Obtén GPS nuevamente';
 end if;
 d:=public.distance_m(new.lat,new.lng,w.lat,w.lng);
 if d+new.accuracy_m>w.radius_m then raise exception 'Fuera de geocerca considerando precisión'; end if;
 select * into last_m from public.movements where vehicle_id=new.vehicle_id order by created_at desc,id desc limit 1;
 if new.type='entrada' and last_m.type='entrada' then raise exception 'Entrada duplicada: el vehículo debe registrar salida primero'; end if;
 if new.type='salida' and (last_m.id is null or last_m.type<>'entrada' or last_m.warehouse_id<>new.warehouse_id) then
   raise exception 'Salida sin entrada previa en este almacén';
 end if;
 new.operator_id:=auth.uid();new.created_at:=clock_timestamp();new.distance_m:=d;
 new.warehouse_lat:=w.lat;new.warehouse_lng:=w.lng;new.radius_m:=w.radius_m;new.max_accuracy_m:=w.max_accuracy_m;
 new.warehouse_name:=w.name;new.vehicle_plate:=v.plate;
 return new;
end $$;
revoke all on function flota_private.validate_movement() from public;
create trigger validate_movement before insert on public.movements for each row execute function flota_private.validate_movement();

create function public.record_movement(p_request_id uuid,p_vehicle_id uuid,p_warehouse_id uuid,p_type text,p_lat double precision,p_lng double precision,p_accuracy_m double precision,p_captured_at timestamptz,p_address text default '')
returns public.movements language plpgsql security invoker set search_path='' as $$
declare result public.movements;
begin
 if auth.uid() is null then raise exception 'Se requiere sesión';end if;
 -- Serializa reintentos del mismo request_id; el trigger serializa movimientos del vehículo.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,1));
 select * into result from public.movements where request_id=p_request_id and operator_id=auth.uid();
 if found then return result;end if;
 insert into public.movements(request_id,vehicle_id,warehouse_id,operator_id,type,lat,lng,accuracy_m,distance_m,captured_at,address,warehouse_lat,warehouse_lng,radius_m,max_accuracy_m,warehouse_name,vehicle_plate)
 values(p_request_id,p_vehicle_id,p_warehouse_id,auth.uid(),p_type,p_lat,p_lng,p_accuracy_m,0,p_captured_at,coalesce(p_address,''),0,0,0,0,'','') returning * into result;
 return result;
end $$;
revoke all on function public.record_movement(uuid,uuid,uuid,text,double precision,double precision,double precision,timestamptz,text) from public;
grant execute on function public.record_movement(uuid,uuid,uuid,text,double precision,double precision,double precision,timestamptz,text) to authenticated;
create function public.latest_checkpoints() returns setof public.movements
language sql stable security invoker set search_path=''
as $$ select distinct on (vehicle_id) * from public.movements order by vehicle_id,created_at desc,id desc $$;
revoke all on function public.latest_checkpoints() from public;
grant execute on function public.latest_checkpoints() to authenticated;

-- Nominatim: caché y cuota GLOBAL, no por pestaña. Solo la Edge Function usa estos RPC.
create table flota_private.geocode_cache(key text primary key,address text not null,created_at timestamptz not null default now());
create table flota_private.api_gate(id boolean primary key default true check(id),last_request timestamptz not null);
insert into flota_private.api_gate values(true,'2000-01-01');
alter table flota_private.geocode_cache enable row level security;
alter table flota_private.api_gate enable row level security;
grant all on flota_private.geocode_cache,flota_private.api_gate to service_role;
create function public.geocode_slot(p_key text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare cached text; last_at timestamptz;
begin
 select address into cached from flota_private.geocode_cache where key=p_key and created_at>now()-interval '30 days';
 if found then return jsonb_build_object('cached',cached);end if;
 select last_request into last_at from flota_private.api_gate where id=true for update;
 if clock_timestamp()-last_at<interval '1.1 seconds' then return jsonb_build_object('allowed',false);end if;
 update flota_private.api_gate set last_request=clock_timestamp() where id=true;
 return jsonb_build_object('allowed',true);
end $$;
create function public.geocode_store(p_key text,p_address text) returns void language sql security invoker set search_path='' as $$
 insert into flota_private.geocode_cache(key,address) values(p_key,p_address)
 on conflict(key) do update set address=excluded.address,created_at=now()
$$;
revoke all on function public.geocode_slot(text),public.geocode_store(text,text) from public,anon,authenticated;
grant execute on function public.geocode_slot(text),public.geocode_store(text,text) to service_role;
commit;
