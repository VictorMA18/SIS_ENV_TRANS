# API Backend - Rutas

Base URL (desarrollo):
- http://localhost:8000

Prefijo API:
- /api/

## Headers comunes
- Content-Type: application/json
- Authorization: Bearer <access_token>

Notas:
- Las rutas de autenticacion usan AllowAny.
- El resto requiere JWT valido.
- Roles validos: CLIENT, TRANSPORTER, ADMIN.

---

## Autenticacion

### POST /api/auth/register/client/
Crea un usuario cliente y devuelve tokens + perfil.

Request body:
```json
{
  "email": "client@example.com",
  "full_name": "Cliente Demo",
  "password": "Secret123!",
  "confirm_password": "Secret123!",
  "phone": "987654321",
  "avatar_url": "https://example.com/avatar.png",
  "dni": "12345678",
  "address": "Av. Principal 123"
}
```

Response 201:
```json
{
  "tokens": {
    "refresh": "<refresh>",
    "access": "<access>"
  },
  "user": {
    "id": "2f0f7c0e-4a4d-4c8d-9d76-9a6eab2c3d5b",
    "email": "client@example.com",
    "full_name": "Cliente Demo",
    "avatar_url": "https://example.com/avatar.png",
    "phone": "987654321",
    "role": "CLIENT",
    "is_active": true,
    "is_verified": false,
    "created_at": "2026-05-18T12:00:00Z",
    "updated_at": "2026-05-18T12:00:00Z"
  },
  "profile": {
    "id": "2f0f7c0e-4a4d-4c8d-9d76-9a6eab2c3d5b",
    "dni": "12345678",
    "address": "Av. Principal 123",
    "is_active": true,
    "created_at": "2026-05-18T12:00:00Z",
    "updated_at": "2026-05-18T12:00:00Z"
  }
}
```

### POST /api/auth/register/transporter/
Crea un usuario transportista y devuelve tokens + perfil.

Request body:
```json
{
  "email": "transporter@example.com",
  "full_name": "Transportista Demo",
  "password": "Secret123!",
  "confirm_password": "Secret123!",
  "phone": "987654321",
  "avatar_url": "https://example.com/avatar.png",
  "license_number": "A123456789",
  "ruc": "20123456789",
  "vehicle_description": "Furgon blanco",
  "is_available": true
}
```

Response 201:
```json
{
  "tokens": {
    "refresh": "<refresh>",
    "access": "<access>"
  },
  "user": {
    "id": "a9a1f7b6-1d66-4c4b-8f8c-60d9b2e7c234",
    "email": "transporter@example.com",
    "full_name": "Transportista Demo",
    "avatar_url": "https://example.com/avatar.png",
    "phone": "987654321",
    "role": "TRANSPORTER",
    "is_active": true,
    "is_verified": false,
    "created_at": "2026-05-18T12:00:00Z",
    "updated_at": "2026-05-18T12:00:00Z"
  },
  "profile": {
    "id": "a9a1f7b6-1d66-4c4b-8f8c-60d9b2e7c234",
    "license_number": "A123456789",
    "ruc": "20123456789",
    "vehicle_description": "Furgon blanco",
    "is_available": true,
    "is_active": true,
    "completed_shipments": 0,
    "average_rating": null,
    "created_at": "2026-05-18T12:00:00Z",
    "updated_at": "2026-05-18T12:00:00Z"
  }
}
```

### POST /api/auth/login/
Inicia sesion con email y password.

Request body:
```json
{
  "email": "client@example.com",
  "password": "Secret123!"
}
```

Response 200: mismo formato que register.

### POST /api/auth/callback/google/
Login/registro con Google OAuth.

Request body:
```json
{
  "id_token": "<google-id-token>",
  "role": "CLIENT"
}
```

Response 200: mismo formato que register.

---

## Clientes

### GET /api/clients/
Lista clientes (solo ADMIN).

### GET /api/clients/{id}/
Obtiene el perfil del cliente (ADMIN o el mismo usuario).

Response 200:
```json
{
  "id": "2f0f7c0e-4a4d-4c8d-9d76-9a6eab2c3d5b",
  "email": "client@example.com",
  "full_name": "Cliente Demo",
  "phone": "987654321",
  "avatar_url": "https://example.com/avatar.png",
  "dni": "12345678",
  "address": "Av. Principal 123",
  "is_active": true,
  "created_at": "2026-05-18T12:00:00Z",
  "updated_at": "2026-05-18T12:00:00Z"
}
```

### PATCH /api/clients/{id}/
Actualiza datos del cliente (ADMIN o el mismo usuario).

Campos editables:
- full_name
- phone
- avatar_url
- dni
- address

Request body:
```json
{
  "full_name": "Cliente Editado",
  "phone": "987654321",
  "address": "Calle Nueva 456"
}
```

Response 200: mismo formato que GET detalle.

### PUT /api/clients/{id}/
Actualiza datos del cliente (ADMIN o el mismo usuario).

---

## Transportistas

### GET /api/transporters/
Lista transportistas (solo ADMIN).

### GET /api/transporters/{id}/
Obtiene el perfil del transportista (ADMIN o el mismo usuario).

Response 200:
```json
{
  "id": "a9a1f7b6-1d66-4c4b-8f8c-60d9b2e7c234",
  "email": "transporter@example.com",
  "full_name": "Transportista Demo",
  "phone": "987654321",
  "avatar_url": "https://example.com/avatar.png",
  "license_number": "A123456789",
  "ruc": "20123456789",
  "vehicle_description": "Furgon blanco",
  "is_available": true,
  "is_active": true,
  "completed_shipments": 0,
  "average_rating": null,
  "created_at": "2026-05-18T12:00:00Z",
  "updated_at": "2026-05-18T12:00:00Z"
}
```

### PATCH /api/transporters/{id}/
Actualiza datos del transportista (ADMIN o el mismo usuario).

Campos editables:
- full_name
- phone
- avatar_url
- license_number
- ruc
- vehicle_description
- is_available

Request body:
```json
{
  "vehicle_description": "Camion 2T",
  "is_available": false
}
```

Response 200: mismo formato que GET detalle.

### PUT /api/transporters/{id}/
Actualiza datos del transportista (ADMIN o el mismo usuario).
