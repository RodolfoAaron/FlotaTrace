import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
const origin=Deno.env.get('ALLOWED_ORIGIN')||'https://rodolfoaaron.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
Deno.serve(async(req:Request)=>{
 if(!origin||req.headers.get('origin')!==origin)return response({error:'Origen no permitido'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return response({error:'Método no permitido'},405);
 try{
  const auth=req.headers.get('Authorization');if(!auth)return response({error:'Se requiere sesión'},401);
  const scoped=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error}=await scoped.auth.getUser();if(error||!user)return response({error:'Sesión inválida'},401);
  const {data:profile}=await scoped.from('profiles').select('active').eq('id',user.id).single();if(!profile?.active)return response({error:'Usuario no habilitado'},403);
  const {lat,lng}=await req.json();if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return response({error:'Coordenadas inválidas'},400);
  const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const key=lat.toFixed(5)+','+lng.toFixed(5);
  const {data:slot,error:slotError}=await service.rpc('geocode_slot',{p_key:key});if(slotError)throw slotError;
  if(slot.cached)return response({address:slot.cached,cached:true});
  if(!slot.allowed)return response({error:'Servicio ocupado. Reintenta en dos segundos.'},429);
  const contact=Deno.env.get('NOMINATIM_CONTACT')||'https://github.com/RodolfoAaron/FlotaTrace';if(!contact)return response({error:'Falta configurar contacto de la aplicación'},503);
  const url=new URL(Deno.env.get('NOMINATIM_URL')||'https://nominatim.openstreetmap.org/reverse');
  url.search=new URLSearchParams({format:'jsonv2',lat:String(lat),lon:String(lng),'accept-language':'es',zoom:'18'}).toString();
  const upstream=await fetch(url,{headers:{'User-Agent':`FlotaTrace-Grupo03/1.0 (${contact})`},signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)return response({error:'Nominatim no disponible. Conserva las coordenadas.'},502);
  const result=await upstream.json(),address=result.display_name||'';
  if(!address)return response({error:'No se encontró dirección aproximada'},404);
  const {error:cacheError}=await service.rpc('geocode_store',{p_key:key,p_address:address});if(cacheError)throw cacheError;
  return response({address,cached:false,attribution:'© OpenStreetMap contributors'});
 }catch{return response({error:'No se pudo consultar la dirección. Puedes registrar usando las coordenadas.'},502);}
});
