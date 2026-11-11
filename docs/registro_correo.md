# Registro por correo en FlotaTrace

## Flujo para una cuenta nueva

1. Abrir https://rodolfoaaron.github.io/FlotaTrace/ y pulsar Crear cuenta.
2. Completar nombre, correo, contraseña de al menos 8 caracteres y repetición de contraseña.
3. Abrir el mensaje de confirmación y seguir su enlace.
4. Volver a FlotaTrace e iniciar sesión. La cuenta confirmada ingresa como operador.
5. Si el enlace venció, usar Reenviar confirmación. La interfaz evita reenvíos durante 60 segundos y respeta los errores de límite del servidor.

Las nuevas cuentas operadoras pueden consultar la flota compartida y su historial y registrar entradas/salidas. No pueden editar vehículos, almacenes, perfiles ni roles. Las cuentas existentes conservan su rol. La confirmación no añade miembros a la organización de Supabase ni colaboradores de GitHub.

## Configuración aplicada

- Supabase Auth: registro por correo habilitado y Confirm email activado.
- Site URL: https://rodolfoaaron.github.io/FlotaTrace/ .
- Trigger privado de perfil: crea siempre operador, sin aceptar roles de los metadatos del usuario.
- Antes de confirmar, el perfil queda inactivo. La confirmación del proveedor lo activa.
- La función de trigger no se puede ejecutar desde clientes anónimos o autenticados.
- El frontend nunca conserva contraseñas de registro en localStorage.

Ejecutar supabase/04_self_signup.sql una sola vez después de 01_schema.sql para reproducir la configuración en otro proyecto. Ya se aplicó al proyecto FlotaTrace.

## Pendiente para enviar a correos externos

El proyecto todavía usa el correo de prueba de Supabase. Este servicio solo entrega a direcciones de miembros de la organización y tiene una cuota muy baja. Para confirmar correos de personas externas, se debe configurar un proveedor SMTP en Authentication > Emails > SMTP Settings.

Se necesitan remitente verificado, host, puerto, usuario y contraseña SMTP. La contraseña debe introducirse directamente en Supabase; nunca en el chat, el repositorio o config.js. Mantener Confirm email activado. No se ha comprobado la entrega real a un correo externo porque no hay SMTP configurado.

## Verificaciones realizadas

- 6 pruebas unitarias de validación y traducción de errores de acceso.
- Sintaxis de los módulos JavaScript.
- Formulario y navegación a Crear cuenta y Reenviar confirmación revisados en navegador.
- Pruebas transaccionales en PostgreSQL: perfil operador, bloqueo antes de confirmar, activación tras confirmar, metadatos incapaces de conceder admin, rechazo de autopromoción y administrador preservado. Todo el usuario de ensayo se revirtió.
- Security Advisor revisado: cero errores. Avisos anteriores de la función del sistema rls_auto_enable y protección de contraseñas filtradas no forman parte de esta modificación.

Fuentes oficiales:
- https://supabase.com/docs/reference/javascript/auth-signup
- https://supabase.com/docs/reference/javascript/auth-resend
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/auth/auth-smtp
