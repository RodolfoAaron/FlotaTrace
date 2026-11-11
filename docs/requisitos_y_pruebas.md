# Requisitos, aceptación y evaluación

## Cobertura del enunciado

| Código | Implementación | Prueba de aceptación conectada |
|---|---|---|
| RF01 | Supabase Auth y perfiles admin/operador | Entrar con ambos roles; operador recibe rechazo al intentar CRUD por REST |
| RF02 | CRUD de placa, marca, modelo, año, estado | Registrar, editar y eliminar un vehículo sin movimientos; rechazar placa repetida |
| RF03 | QRCode.js, prefijo FLOTA3 y UUID estable | Generar y descargar QR de ABC-123; editar marca y comprobar mismo UUID |
| RF04 | CRUD almacén, dirección, coordenadas, radio y precisión | Rechazar latitud fuera de rango y precisión superior a radio/2 |
| RF05 | html5-qrcode, cámara trasera | Escanear QR impreso; rechazar QR ajeno y vehículo no activo |
| RF06 | Geolocation API, permiso, timeout y precisión | Aceptar permiso y obtener coordenadas; denegarlo y mostrar error |
| RF07 | Edge Function, Nominatim, caché y cuota global | Obtener dirección; consultar desde dos sesiones y comprobar cuota/caché |
| RF08 | Haversine en cliente y PostgreSQL | Rechazar fuera del radio, margen que cruza borde, mala precisión y lectura vieja |
| RF09 | Movimientos inmutables, operador y hora del servidor | Registrar entrada/salida, reintentar request_id, ejecutar dos entradas concurrentes |
| RF10 | latest_checkpoints y mapa por último registro | Vehículo conserva su último punto aunque tenga un registro anterior a las primeras 200 filas |
| RF11 | Métricas, filtros, tablas, CSV y mapa | Consultar placa, fecha y tipo; exportar lo filtrado; cargar otra página |

## Seguridad que debe probarse en Supabase

1. Sin sesión: SELECT/INSERT/UPDATE/DELETE rechazados para catálogos e historial.
2. Cuenta sin perfil o perfil inactivo: no puede leer flota ni registrar movimientos.
3. Operador: puede leer y registrar; no modificar vehículos, almacenes, roles o historial.
4. Administrador: puede gestionar catálogos, pero no editar perfiles ni movimientos desde REST.
5. Inserción directa con `operator_id`, `created_at` o distancia falsos: el trigger los reemplaza con valores seguros, y valida GPS/secuencia.
6. Mismo request_id repetido por el mismo usuario: devuelve el movimiento existente sin crear otro.
7. Dos solicitudes concurrentes con IDs distintos para una misma entrada: solo se acepta una; la otra encuentra entrada abierta.
8. Salida sin entrada o en otro almacén: se rechaza.
9. Eliminar catálogo con movimientos: FK restrict impide pérdida de trazabilidad.
10. Cache y cuota: no accesibles a anon/authenticated; solo service_role en el servidor.
11. Edge Function sin JWT, con perfil inactivo u origen distinto: rechazada.
12. Revisar Database > Advisors antes de la entrega. Estas comprobaciones no se ejecutaron contra un backend activo durante la elaboración.

## Evidencia ejecutada

| Verificación | Resultado |
|---|---|
| Pruebas unitarias core.test.mjs | 10 aprobadas |
| Sintaxis app.js | Aprobada |
| Ensayo en navegador, carga de dashboard y mapas | Aprobado |
| Generación visible del QR de ABC-123 | Aprobada |
| Entrada local, rechazo duplicado, salida e historial | Aprobados |
| Móvil físico, permisos de cámara y GPS real | Pendientes |
| SQL, RLS, Auth, Edge Function y concurrencia contra servidor | Pendientes de configurar Supabase |
| GitHub Pages y URL | Pendientes de publicación |

## Matriz de evaluación del docente

| Criterio | Peso | Evidencia que el grupo debe presentar |
|---|---:|---|
| Autenticación y seguridad | 15% | Dos roles, RLS, permisos y rechazo de cuenta no habilitada |
| Gestión de datos y CRUD | 20% | Vehículos y almacenes con validación de campos |
| APIs y bibliotecas | 25% | QRCode.js, html5-qrcode, Geolocation, Nominatim y Leaflet |
| Reglas de negocio | 20% | Geocerca con precisión, no duplicados y secuencia correcta |
| Interfaz y experiencia | 10% | Navegación clara, filtros, mensajes y revisión móvil |
| Despliegue y demostración | 10% | URL HTTPS, repositorio y caso ABC-123 / Huancayo |
| Total | 100% | Los porcentajes son los del Excel, no una nota obtenida |

## Guion de exposición (6 minutos)

1. 0:00-0:45. Problema: llamadas y registros manuales; falta de historial confiable.
2. 0:45-1:30. Arquitectura y modelo: frontend, Auth, PostgreSQL, QR/GPS y geocercas.
3. 1:30-2:15. Administrador registra ABC-123, almacén y muestra su QR.
4. 2:15-3:45. Operador escanea, obtiene GPS, consulta dirección y registra llegada válida.
5. 3:45-4:45. Mostrar historial, hora del servidor, operador y último punto en mapa.
6. 4:45-5:30. Repetir entrada para mostrar rechazo; explicar salida y RLS.
7. 5:30-6:00. Mostrar URL/repositorio y explicar que es trazabilidad por puntos, sin GPS continuo ni prueba física del camión.

La demostración real depende de estar dentro del almacén configurado. Fuera de Huancayo, explicar la simulación y acordar con el docente una prueba GPS real en la sede.
