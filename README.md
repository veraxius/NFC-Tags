# Beaurity JourneyPort™ / Earthy Doings™ — MVP

Plataforma web que convierte acciones reales con impacto (Earthy Doings™) en
**Journey Milestones verificados y explicables**, usando brazaletes/tarjetas NFC,
verificación de partners y la capa de confianza AIM.

Implementa el **TRS v1.0** y el documento de **Arquitectura Técnica** de Beaurity.

> **Norte técnico (TRS §63):** cada milestone verificado tiene una cadena de
> evidencia explicable — NFC + confirmación del partner + evaluación AIM.

---

## Cómo ejecutar

```bash
npm install
npm run db:reset   # crea la base de datos SQLite y carga datos demo
npm run dev        # http://localhost:3000
```

## Cuentas demo (contraseña para todas: `Password123!`)

| Rol | Email | Ve |
|---|---|---|
| Super Admin | `superadmin@beaurity.demo` | Operations Dashboard |
| Beaurity Operations Admin | `ops@beaurity.demo` | Operations Dashboard (`/ops`) |
| Partner Administrator | `admin@oceanguardians.demo` | Partner Dashboard (`/partner`) |
| Partner Operator | `operator@oceanguardians.demo` | Partner Dashboard (`/partner`) |
| Miembro (tarjeta activa + milestone) | `ana@member.demo` | Journey (`/journey`) |
| Miembro (tarjeta sin activar) | `luis@member.demo` | Journey (`/journey`) |

## Simular un tap NFC (sin hardware)

El chip NFC solo contiene una URL (`/t/{token}`, TRS §23 — cero datos personales).
Abrir estas URLs en el navegador equivale a acercar la tarjeta a un teléfono:

- Tarjeta de Ana (activa): `http://localhost:3000/t/demo-ana-card-4vN7m2P8xQK1`
- Tarjeta de Luis (flujo de activación): `http://localhost:3000/t/demo-luis-card-9wR3t5Y2bMf7`
- Tarjetas de inventario: `.../t/demo-unassigned-card-6hJ4k8L1cD3z` y `.../t/demo-unassigned-card-2sF7g9H5nB8x`

### Grabar tarjetas NFC físicas

1. Comprar tags **NTAG213/NTAG215** (tarjeta, brazalete o llavero — el MVP usa tarjeta, TRS §9).
2. En `/ops/devices` → "Generate devices & tokens": el sistema crea el dispositivo
   y muestra el token **una sola vez** (la BD guarda solo el hash SHA-256).
3. Con una app como *NFC Tools* (Android/iPhone), escribir un registro **URL**:
   `https://<tu-dominio>/t/<token>` y bloquear el tag contra escritura.
4. El miembro acerca la tarjeta a su teléfono → se abre la página de activación.

## Transacción central (prueba de aceptación TRS §56) ✅

```
HUMANO → EARTHY DOING → TAP NFC → RESOLUCIÓN DE IDENTIDAD → PARTICIPACIÓN
       → VERIFICACIÓN DEL PARTNER → EVALUACIÓN AIM → MILESTONE VERIFICADO → JOURNEY TIMELINE
```

1. Miembro tapea su JourneyPort en el evento (`/t/{token}` → "Tap in — I'm here").
2. El operador del partner marca la participación como completada (`/partner/verifications`).
3. El operador confirma → se adjunta evidencia (`nfc_tap`, `timestamp`, `partner_confirmation`).
4. El **adaptador AIM** evalúa las señales y devuelve `credible` + confianza + explicación.
5. Se crea el **Journey Milestone VERIFICADO**; el miembro puede inspeccionar
   "por qué se confía" en él (VIEW VERIFICATION), y todo queda en el audit trail.

## Arquitectura

- **Next.js 16 + TypeScript** — web-first, mobile-responsive, API-first (Arch. §30)
- **Prisma 6 + SQLite** — esquema 1:1 con TRS §7–22; migrable a PostgreSQL cambiando
  el `datasource` (los tipos ya son compatibles: UUID PKs, JSON serializado)
- **Auth**: bcrypt + JWT en cookie httpOnly (sesiones de 8h), RBAC en servidor
  (TRS §38: Member / Operator / Partner Admin / Beaurity Admin / Super Admin)
- **NFC**: tokens aleatorios de 192 bits, no secuenciales, revocables, hasheados
  server-side, resistentes a enumeración (TRS §23)
- **AIM**: aislado en `src/lib/aim.ts` tras una interfaz interna (TRS §33). El MVP
  incluye un evaluador determinista y explicable; para conectar el AIM real (D09)
  solo se reemplaza `evaluateSignals` por la llamada HTTP al API de producción.
- **Audit**: `audit_events` append-only; cada transición de estado genera evento (TRS §36)

### Pantallas implementadas

| TRS | Pantalla | Ruta |
|---|---|---|
| §40 | Overview operacional | `/ops` |
| §41–42 | Members | `/ops/members` |
| §43 | Partners (approve/suspend) | `/ops/partners` |
| §44 | Earthy Doings | `/ops/doings` |
| §45 | Verification Control Center (colas + anatomía) | `/ops/verifications` |
| §46 | JourneyPort Device Center (inventario/tokens) | `/ops/devices` |
| §47 | AIM Trust | `/ops/aim` |
| §48 | Impact (verificado vs. registrado) | `/ops/impact` |
| §49 | Disputes | `/ops/disputes` |
| §22 | Audit Trail | `/ops/audit` |
| — | Partner Dashboard (verificar, crear Earthy Doings) | `/partner` |
| §50 | Member Journey Timeline + VIEW VERIFICATION | `/journey` |
| — | Dispositivos del miembro (US-006) | `/journey/devices` |
| §53 | Privacidad y consentimiento (historial append-only) | `/journey/privacy` |
| §24 | Resolución de tap NFC | `/t/{token}` |

### API REST (`/api/v1`, envelope TRS §26)

`POST /auth/register · login · logout` — `GET /users/me · /users/me/milestones` —
`POST /devices/activate · /devices/{id}/report-lost` — `POST /participations` —
`POST /verifications/{id}/approve · reject`

## Decisiones técnicas (TRS §61)

| # | Decisión | Elección MVP |
|---|---|---|
| D01 | Chip NFC | NTAG213/215, registro NDEF URL |
| D02 | Seguridad del token | 192-bit aleatorio, SHA-256 server-side, revocable |
| D03 | Autenticación | Email+password (bcrypt), JWT httpOnly, 8h |
| D05/D06 | Framework | Next.js full-stack (API + 3 frontends) |
| D07 | Base de datos | SQLite (dev/pilot) → PostgreSQL (producción) |
| D08 | Evidencia | Tabla `evidence` con metadata JSON + `storage_reference` para objetos |
| D09 | Contrato AIM | Adaptador interno `aim.ts`; contrato §34–35 listo para alinear |
| D10 | Política piloto | NFC + confirmación de partner + AIM (una sola política) |

## Producción — pendientes antes del piloto real

- Migrar a PostgreSQL y almacenar `AUTH_SECRET` en un secrets manager
- HTTPS obligatorio, rate limiting en el gateway, MFA para administradores
- Verificación de email real (flujo stub en MVP) y recuperación de contraseña
- Backups automatizados + procedimiento de restore documentado (TRS §52)
- Alinear el contrato AIM definitivo (D09) y política de retención de datos (D11)
