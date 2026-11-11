// Límites del día de Perú, independientes de la zona horaria del dispositivo.
export function peruDayBounds(now=Date.now()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const get=key=>parts.find(p=>p.type===key).value;
  const start=Date.parse(`${get('year')}-${get('month')}-${get('day')}T00:00:00-05:00`);
  return {from:new Date(start).toISOString(),to:new Date(start+86400000).toISOString()};
}
// Los nombres capturados por el servidor prevalecen sobre catálogos editados.
export function movementLabels(m,vehicles=[],warehouses=[]){return {
  vehicle:m.vehicle_plate||vehicles.find(v=>v.id===m.vehicle_id)?.plate||m.vehicle_id,
  warehouse:m.warehouse_name||warehouses.find(w=>w.id===m.warehouse_id)?.name||m.warehouse_id
};}
