# Conexión de direcciones

La instancia pública de Nominatim devolvió HTTP 403 desde el servidor. Su política requiere instancia propia o proveedor autorizado para seguimiento de vehículos. No se intenta eludir el rechazo cambiando IP o encabezados.

## Configurar el proveedor

1. Crear una cuenta gratuita en https://geocode.maps.co/ y obtener una API key. Este proveedor usa Nominatim y datos de OpenStreetMap. Revisar condiciones y límites actuales en su web.
2. En Supabase > Edge Functions > Secrets, guardar GEOCODER_API_KEY con la clave del proveedor. No subirla al repositorio ni escribirla en config.js.
3. Por defecto se utiliza https://geocode.maps.co/reverse; la clave se envía en Authorization solo a ese host.
4. Para una instancia propia o contratada de Nominatim, establecer NOMINATIM_URL con su endpoint HTTPS /reverse. La instancia pública OSMF no está admitida para este proyecto.
5. Iniciar sesión, obtener GPS y pulsar Consultar dirección aproximada. Debe devolver una dirección y conservar el control global de cuota y caché.

## Verificado

- La función interna de cuota/caché se probó con rollback: allowed true.
- Prueba aislada desde Edge Functions: upstream público respondió 403.
- Pruebas locales de rechazo sin sesión, errores HTTP/RPC y fallo no bloqueante de caché.
- La consulta al nuevo proveedor queda pendiente hasta ingresar una API key válida. No se declara resuelta antes de una respuesta real satisfactoria.
