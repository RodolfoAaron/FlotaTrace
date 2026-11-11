import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/reverse-geocode/index.ts',import.meta.url),'utf8').replace(/^import .*\n/,'').replace('value:unknown','value').replace('req:Request','req').replace(/Deno\.env\.get\(([^)]*)\)!/g,'Deno.env.get($1)').replace(' as {code?:string;name?:string}','');
function setup({storeFail=false,slotFail=false,upstreamStatus=200}={}){
 let handler,calls=0;const logs=[];
 const context={Request,Response,URL,URLSearchParams,AbortSignal,console:{error:x=>logs.push(JSON.parse(x)),warn:x=>logs.push(JSON.parse(x))},Deno:{env:{get:()=> 'server-value'},serve:fn=>handler=fn},fetch:async()=>new Response(JSON.stringify({display_name:'Huancayo, Junín, Perú'}),{status:upstreamStatus}),createClient:(_url,_key,options)=>options?{auth:{getUser:async()=>({data:{user:{id:'u'}},error:null})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{active:true}})})})})}:{rpc:async name=>{calls++;return name==='geocode_slot'?slotFail?{error:{code:'PGRST202'}}:{data:{allowed:true}}:storeFail?{error:{code:'CACHE_WRITE'}}:{error:null};}}};
 context.Deno.env.get=k=>k==='ALLOWED_ORIGIN'?'https://rodolfoaaron.github.io':k==='NOMINATIM_URL'?'https://nominatim.example.test/reverse':'server-value';
 vm.runInNewContext(source,context);
 return {run:()=>handler(new Request('https://example.test',{method:'POST',headers:{Origin:'https://rodolfoaaron.github.io',Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({lat:-12.0651,lng:-75.2049})})),handler,logs,get calls(){return calls;}};
}
test('una dirección válida se devuelve aunque falle la escritura de caché',async()=>{const s=setup({storeFail:true});const r=await s.run();assert.equal(r.status,200);assert.equal((await r.json()).address,'Huancayo, Junín, Perú');assert.equal(s.logs[0].event,'geocode_cache_write_failed');});
test('el fallo de RPC se identifica sin registrar ubicación o credenciales',async()=>{const s=setup({slotFail:true});const r=await s.run();assert.equal(r.status,502);assert.equal((await r.json()).stage,'cache-slot');assert.deepEqual(s.logs[0],{event:'geocode_failed',stage:'cache-slot',code:'PGRST202'});});
test('respuesta no exitosa de Nominatim conserva el código HTTP de diagnóstico',async()=>{const s=setup({upstreamStatus:503});const r=await s.run();assert.equal(r.status,502);assert.equal((await r.json()).upstream_status,503);assert.equal(s.logs[0].stage,'nominatim-http');});
test('sin sesión se rechaza antes de consultar Nominatim o caché',async()=>{const s=setup();const r=await s.handler(new Request('https://example.test',{method:'POST',headers:{Origin:'https://rodolfoaaron.github.io'}}));assert.equal(r.status,401);assert.equal(s.calls,0);});
