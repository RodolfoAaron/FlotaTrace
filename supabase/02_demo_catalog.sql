-- Catálogo de ejemplo. No crea usuarios, no simula movimientos de producción.
-- Estas coordenadas NO son la ubicación de un almacén real verificado.
insert into public.vehicles(id,plate,brand,model,year,status)
values('11111111-1111-4111-8111-111111111111','ABC-123','Volvo','FM',2022,'activo')
on conflict(id) do nothing;
insert into public.warehouses(id,name,address,lat,lng,radius_m,max_accuracy_m)
values('22222222-2222-4222-8222-222222222222','Huancayo - punto de ejemplo','Huancayo, Junín. Reemplazar por coordenadas del punto real.',-12.0651,-75.2049,150,50)
on conflict(id) do nothing;
