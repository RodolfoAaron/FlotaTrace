export function distanceMeters(a,b) {
  const r=Math.PI/180, dlat=(b.lat-a.lat)*r, dlng=(b.lng-a.lng)*r;
  const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function validateFix(fix,warehouse,now=Date.now()) {
  if(!fix || ![fix.lat,fix.lng,fix.accuracy,fix.timestamp].every(Number.isFinite)) return {ok:false,message:'Obtén una ubicación válida.'};
  if(Math.abs(fix.lat)>90 || Math.abs(fix.lng)>180 || fix.accuracy<=0) return {ok:false,message:'Coordenadas o precisión inválidas.'};
  const age=now-fix.timestamp;
  if(age>60000 || age < -10000) return {ok:false,message:'Ubicación vencida. Obtén GPS nuevamente.'};
  const distance=distanceMeters(fix,warehouse);
  if(fix.accuracy>Math.min(warehouse.max_accuracy_m,warehouse.radius_m/2)) return {ok:false,distance,message:'Precisión insuficiente. Acércate a una zona abierta y vuelve a obtener GPS.'};
  if(distance+fix.accuracy>warehouse.radius_m) return {ok:false,distance,message:'La ubicación y su margen de error no caben dentro de la geocerca.'};
  return {ok:true,distance,message:'Ubicación válida dentro de la geocerca.'};
}
export function validateSequence(last,type,warehouseId) {
  if(type==='entrada' && last?.type==='entrada') throw Error('El vehículo ya tiene una entrada abierta. Registra su salida primero.');
  if(type==='salida' && (!last || last.type!=='entrada' || last.warehouse_id!==warehouseId)) throw Error('La salida requiere una entrada previa en este almacén.');
}
export function parseQR(value) {
  if(!/^FLOTA3:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())) throw Error('QR ajeno al sistema o identificador inválido.');
  return value.trim().slice(7).toLowerCase();
}
export function csvCell(value) {
  let v=String(value??'');
  if(/^[=+\-@\t\r]/.test(v)) v="'"+v;
  return '"'+v.replaceAll('"','""')+'"';
}
