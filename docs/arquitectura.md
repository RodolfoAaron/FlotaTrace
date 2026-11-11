# Arquitectura y modelo · Grupo 03

## Arquitectura

```mermaid
flowchart TD
    U["Administrador / Operador"] --> WEB["GitHub Pages · HTML / CSS / JS"]
    WEB --> AUTH["Supabase Auth"]
    WEB --> DB["PostgreSQL · RLS / validación / historial"]
    WEB --> DEVICE["Cámara QR / Geolocation API"]
    WEB --> MAP["Leaflet / mapas OpenStreetMap"]
    WEB --> EDGE["Edge Function · sesión validada"]
    EDGE --> DB
    EDGE --> NOM["Nominatim · dirección aproximada"]
```

El navegador solo recibe URL y clave publicable. La clave privilegiada solo existe en Edge Functions. Auth identifica al usuario; los roles activos se consultan en perfiles. PostgreSQL verifica las reglas incluso si se omite la interfaz. La función de Nominatim valida usuario, origen y cuota global. Leaflet dibuja almacenes y últimos registros, sin rastreo continuo.

## Entidades y relaciones

```mermaid
erDiagram
    AUTH_USERS ||--o| PROFILES : tiene
    PROFILES ||--o{ MOVEMENTS : registra
    VEHICLES ||--o{ MOVEMENTS : acumula
    WAREHOUSES ||--o{ MOVEMENTS : recibe
    PROFILES {
        uuid id PK,FK
        text display_name
        text role
        boolean active
    }
    VEHICLES {
        uuid id PK
        text plate UK
        text brand
        text model
        integer year
        text status
    }
    WAREHOUSES {
        uuid id PK
        text name
        text address
        float lat
        float lng
        float radius_m
        float max_accuracy_m
    }
    MOVEMENTS {
        uuid id PK
        uuid request_id UK
        uuid vehicle_id FK
        uuid warehouse_id FK
        uuid operator_id FK
        text type
        float lat
        float lng
        float accuracy_m
        float distance_m
        timestamptz captured_at
        timestamptz created_at
        text address
    }
```

`movements` además guarda `warehouse_lat`, `warehouse_lng`, `radius_m`, `max_accuracy_m`, `warehouse_name` y `vehicle_plate`: son la configuración y etiquetas históricas del momento de registro. `request_id` es clave única para idempotencia. Un vehículo tiene muchos movimientos; cada movimiento corresponde a un único almacén y operador. Profiles no se edita desde el cliente.

Tablas internas: `flota_private.geocode_cache` (key PK, address, created_at) y `flota_private.api_gate` (singleton, last_request). No forman parte del catálogo visible al usuario y solo el servidor accede a ellas.

## Secuencia de operación

```mermaid
flowchart TD
    A["Sesión y perfil activo"] --> B["Escanear QR / identificar vehículo"]
    B --> C["Elegir almacén y entrada o salida"]
    C --> D["Obtener GPS y precisión"]
    D --> E{"¿Lectura reciente y precisa?"}
    E -- No --> D
    E -- Sí --> F["Consultar dirección con Nominatim"]
    F --> G{"¿Distancia + precisión dentro del radio?"}
    G -- No --> X["Rechazar / mostrar motivo"]
    G -- Sí --> H["Servidor: sesión, geocerca y secuencia"]
    H --> I{"¿Operación válida y no duplicada?"}
    I -- No --> X
    I -- Sí --> J["Guardar operador y hora del servidor"]
    J --> K["Actualizar historial y último punto"]
```

Si Nominatim falla, se puede conservar un movimiento válido con coordenadas y sin dirección. La falta de cámara permite pegar el contenido de un QR válido como alternativa de accesibilidad; para demostrar RF05 debe usarse la cámara.
