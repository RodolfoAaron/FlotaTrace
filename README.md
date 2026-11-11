# FlotaTrace · Grupo 03

Sistema Web de Gestión y Trazabilidad de Flotas Logísticas. Desarrollo correspondiente a la hoja «Grupo 3 - Flotas», requisitos comunes y rúbrica del Excel entregado por el docente.

## Estado de la entrega

Se entrega código de frontend, esquema PostgreSQL con RLS y validación segura, Edge Function para Nominatim, workflow de GitHub Pages, modelo de datos, arquitectura y guía de demostración.

**Configurado:** proyecto Supabase FlotaTrace conectado, tablas y catálogo de ejemplo verificados, RLS activo y función reverse-geocode desplegada. Web publicada: https://rodolfoaaron.github.io/FlotaTrace/ . Repositorio: https://github.com/RodolfoAaron/FlotaTrace .

Las pruebas transaccionales en PostgreSQL comprobaron permisos del operador, hora del servidor, idempotencia, rechazo de duplicados, geocerca, precisión, caducidad, salida, último punto e historial inmutable. Los datos de prueba se revirtieron. La cuenta administradora está activa. El sitio incluye registro público por correo, confirmación obligatoria y perfiles de operador automáticos. Falta configurar SMTP para entregar confirmaciones a correos externos. La cámara/GPS físicos y Nominatim con una sesión de usuario requieren una prueba posterior. La verificación JWT heredada permanece activada.

## Registro de otras cuentas

En la web, pulsa **Crear cuenta**, completa los datos y confirma el correo. La cuenta ingresa como operador. Usa **Reenviar confirmación** si necesitas un enlace nuevo.

**Pendiente de envío externo:** el proyecto usa todavía el correo de prueba de Supabase, limitado a miembros del equipo. Hace falta SMTP para confirmar otros correos. No se ha verificado entrega a correos externos.

Consulta [la configuración y las pruebas del registro](docs/registro_correo.md). El script `supabase/04_self_signup.sql` ya fue aplicado a este proyecto.

## 1. Abrir la aplicación

Web: https://rodolfoaaron.github.io/FlotaTrace/ . El modo conectado usa Supabase; el ensayo mantiene sus datos ficticios separados en este navegador.

### Probar el ensayo local

Requiere Python 3 y navegador con internet para las bibliotecas y mapa.

1. Extraer el ZIP.
2. Abrir una terminal dentro de la carpeta `Grupo03_FlotaTrace`.
3. Ejecutar `python -m http.server 8080 --directory web` (en Windows también puede ser `py -m http.server 8080 --directory web`).
4. Abrir `http://localhost:8080` y pulsar **Explorar ensayo local**.
5. En Punto de control: Cargar QR de ABC-123 → Usar ubicación ficticia de Huancayo → Consultar dirección aproximada → Validar y registrar movimiento.
6. Revisar Historial y Resumen. Cambiar a Salida y repetir la ubicación para cerrar la entrada.

No abrir `index.html` con doble clic: los módulos JavaScript requieren servidor HTTP. El ensayo guarda únicamente en localStorage y usa el reloj del navegador. La autenticación, hora del servidor y RLS solo corresponden al modo conectado. Los datos ficticios nunca se sincronizan con Supabase.

## 2. Activar Supabase

1. Crear o elegir un proyecto **dedicado a flotas**. No ejecutar el esquema en CompraSmart-AI ni en otro proyecto sin revisar sus tablas. El esquema usa tablas públicas con nombres genéricos.
2. En SQL Editor ejecutar **una sola vez** `supabase/01_schema.sql`. Si ocurre un error, la transacción revierte. No es un script de actualización ni elimina tablas existentes.
3. Ejecutar `supabase/02_demo_catalog.sql` para cargar ABC-123 y el punto de ejemplo de Huancayo. Sustituir coordenadas/dirección del almacén antes de una operación real.
4. En Authentication > Users crear dos cuentas: administrador y operador. Configurar contraseña y confirmación desde el Dashboard. No enviar contraseñas al repositorio.
5. Copiar los UUID de esas cuentas y adaptar los ejemplos comentados de `supabase/03_profiles.sql`. Insertar los perfiles en SQL Editor como propietario. Los roles se almacenan en `profiles`, nunca en metadatos editables por el usuario.
6. En `web/config.js`, colocar la URL de proyecto y la clave **publicable** (`sb_publishable_...` o anon legado). No poner `service_role`, `sb_secret` ni contraseña de base de datos.
7. Mantener RLS activado en todas las tablas. Los perfiles solo los administra el propietario desde Dashboard. Deshabilitar registro público si no se usará: una cuenta sin perfil activo no obtiene acceso a los datos del sistema.

El proyecto representa una sola empresa. Todos los perfiles activos pertenecen a esa flota y pueden consultar su trazabilidad. Para múltiples empresas se necesitaría un `organization_id` y políticas de pertenencia adicionales.

## 3. Activar Nominatim

1. En Supabase > Edge Functions crear `reverse-geocode`, usando el contenido de `supabase/functions/reverse-geocode/index.ts`.
2. Configurar los secretos del servidor:
   - `ALLOWED_ORIGIN`: opcional. Por defecto usa `https://rodolfoaaron.github.io` (sin ruta del repositorio ni barra final).
   - `NOMINATIM_CONTACT`: opcional. Por defecto usa la URL pública del repositorio como contacto de la aplicación.
   - `NOMINATIM_URL` es opcional; permite cambiar el proveedor compatible sin publicar otra web. Predeterminado: `https://nominatim.openstreetmap.org/reverse`.
3. Las variables de proyecto `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` pertenecen al entorno de la función, nunca al frontend. Comprobar que están disponibles allí.
4. Desplegar con comprobación de JWT habilitada. La función además llama a `getUser()` y comprueba perfil activo. Probar desde una sesión real.
5. Para probar Nominatim localmente, usar temporalmente `ALLOWED_ORIGIN=http://localhost:8080`; volver a poner el origen publicado después.

Las consultas son manuales, con caché de 30 días y un límite global de una petición por cada 1,1 segundos. Un segundo usuario recibe 429 si el servicio está ocupado. No se realiza geocodificación masiva ni seguimiento. No compartir el origen permitido entre webs ajenas a este proyecto sin compartir también la cuota. Mantener atribución a OpenStreetMap visible. La dirección aproximada no determina la validez de la geocerca.

## 4. Publicar en GitHub Pages (HTTPS)

1. Crear un repositorio para Grupo 03 y subir **el contenido** de la carpeta del proyecto, conservando `.github/workflows/pages.yml` y la carpeta `web`.
2. Usar la rama `main`.
3. En Settings > Pages elegir **GitHub Actions** como Source.
4. Ejecutar el workflow «Publicar FlotaTrace en GitHub Pages» o hacer un push a `main`.
5. Abrir la URL que entrega GitHub Actions. No hay una URL real hasta que el workflow finalice correctamente.
6. En Supabase Auth > URL Configuration configurar Site URL con la URL completa y redirects del sitio si se agregan otros métodos de acceso. El acceso incluido usa correo y contraseña, sin OAuth.
7. Comprobar `ALLOWED_ORIGIN` y probar desde un teléfono por HTTPS con permiso para cámara y ubicación.

La carpeta `.openai` sirve únicamente para la revisión local y no es necesaria para GitHub Pages. El workflow publica solo `web`, no los scripts SQL ni documentos.

## 5. Roles y reglas

| Operación | Administrador | Operador |
|---|---|---|
| Consultar vehículos, almacenes, historial y dashboard | Sí | Sí |
| Generar y descargar QR | Sí | Sí |
| Registrar entradas y salidas | Sí | Sí |
| Crear/editar/eliminar vehículos y almacenes | Sí | No |
| Asignar roles o editar perfiles desde la web | No | No |
| Modificar/eliminar movimientos históricos | No | No |

No se eliminan vehículos/almacenes que ya tienen movimientos. Para retirarlos de servicio, cambiar el estado del vehículo. Las correcciones de historial requerirían un procedimiento de auditoría adicional.

El GPS es del **dispositivo del operador**, no del camión. Puede ser manipulado por el cliente: no es una prueba antifraude. El QR identifica un UUID, no concede acceso. Toda operación requiere una sesión y perfil activo.

El servidor calcula Haversine, exige `distancia + precisión <= radio`, precisión `<= min(máximo configurado, radio/2)` y lectura de menos de 60 s (tolerancia futura de 10 s). Usa reloj del servidor para `created_at`, y `auth.uid()` para operador. El servidor serializa por vehículo, impide una segunda entrada abierta y exige que la salida corresponda al almacén de la entrada. Un `request_id` único permite reintentar sin duplicar. Se conserva una copia de la geocerca, nombre de almacén y placa al registrar.

El frontend presenta las últimas 200 operaciones y permite cargar páginas adicionales. Los filtros y CSV operan sobre los registros cargados, indicado en pantalla. El último punto de cada vehículo se consulta por un RPC independiente para no perder vehículos con historial antiguo. La métrica de movimientos de hoy se refiere a los registros cargados.

## 6. Demostración obligatoria

**Real:** desde un operador ubicado en el almacén definido en Huancayo: iniciar sesión → escanear QR impreso de ABC-123 → elegir almacén y Entrada → GPS → consultar dirección → validar/guardar → comprobar hora del servidor, operador y registro en historial. Intentar otra Entrada y mostrar el rechazo. Registrar Salida y verificar el nuevo último punto.

**Si exponen fuera de Huancayo:** explicar que el GPS real rechazará ese almacén por distancia. Usar el ensayo local, rotulado como simulación, para explicar el caso de Huancayo, y crear otro almacén real en la ubicación de exposición para demostrar GPS y persistencia. No cambiar la ubicación del navegador ni presentar coordenadas ficticias como lectura real. Consultar al docente si acepta ese procedimiento para el caso obligatorio.

## 7. Archivos

| Ruta | Contenido |
|---|---|
| `web/` | Frontend responsive, modo conectado y ensayo separado |
| `supabase/01_schema.sql` | Tablas, restricciones, RLS, triggers, RPC, caché y cuota |
| `supabase/02_demo_catalog.sql` | Catálogo de ejemplo ABC-123 / Huancayo |
| `supabase/03_profiles.sql` | Instrucciones para crear perfiles con UUID reales |
| `supabase/functions/reverse-geocode/index.ts` | Nominatim con sesión validada, caché y cuota global |
| `.github/workflows/pages.yml` | Despliegue de la carpeta web |
| `docs/arquitectura.md` | Diagramas de arquitectura, entidades y operación |
| `docs/requisitos_y_pruebas.md` | Cobertura RF01-RF11, aceptación y rúbrica |
| `tests/core.test.mjs` | Pruebas unitarias de geocerca, QR, secuencia y CSV |
| `tests/database_rollback.sql` | Pruebas de seguridad y reglas de negocio, con rollback final |

## 8. Verificaciones

Ejecutar desde la carpeta raíz: `node --test tests/core.test.mjs` y `node --check web/app.js`.

Verificado durante la elaboración: 10 pruebas unitarias aprobadas, sintaxis JS, apertura del ensayo en navegador, QR visible de ABC-123, llegada de ensayo, rechazo de entrada duplicada, salida e historial con dos registros, dashboard con último punto. La vista de escritorio fue revisada visualmente. Las reglas CSS incluyen adaptación móvil; la prueba en teléfono físico queda pendiente junto con cámara, GPS y backend reales.

## 9. Reparto entre tres integrantes

1. **Interfaz:** HTML/CSS, vehículos, almacenes, dashboard, accesibilidad y móvil.
2. **Datos y seguridad:** Supabase Auth, SQL, perfiles, RLS, secuencia, pruebas de permisos y concurrencia.
3. **Integraciones:** QR, cámara, GPS, Nominatim, Leaflet, publicación y caso obligatorio.

Todos deben explicar el flujo completo y las limitaciones de GPS. Completar nombres reales del equipo y URL/repositorio después de publicar.

## Referencias oficiales

- Enunciado docente: Excel adjunto, hojas Grupo 3 - Flotas, Requisitos comunes y Evaluación.
- Supabase Auth: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Functions: https://supabase.com/docs/guides/functions
- QRCode.js: https://github.com/davidshimjs/qrcodejs
- html5-qrcode: https://github.com/mebjas/html5-qrcode
- Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- Nominatim: https://nominatim.org/ y https://operations.osmfoundation.org/policies/nominatim/
- Leaflet: https://leafletjs.com/
- Mapas OSM: https://operations.osmfoundation.org/policies/tiles/
- GitHub Pages: https://docs.github.com/en/pages

Las bibliotecas CDN están fijadas a versiones concretas. Se necesita conexión a internet para descargarlas. Para una entrega sin internet, descargar y auditar previamente esas mismas versiones y servirlas desde `web/vendor`; no está incluida esa variante.
