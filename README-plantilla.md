# CRM Dental · Plantilla multi-clínica

Plantilla de CRM operativo para clínicas dentales: **Dashboard, Agenda
semanal con arrastrar-y-soltar, Pacientes, Pipeline Kanban, Presupuestos
con tarifario, e Identidad por clínica** (nombre + logo + color).

Un solo deploy sirve a **N clínicas**: cada fila lleva `clinic_id` y las
políticas RLS de Postgres aíslan los datos por clínica.

---

## 1. Arquitectura

```
Next.js 16 (App Router, TS)  →  Supabase (Auth + Postgres + RLS + Storage)
```

| Pieza | Dónde |
|---|---|
| Esquema + RLS + bucket | `supabase/migrations/0001_core.sql` |
| Datos demo | `supabase/seed.sql` (clínica “Sonrisa Demo”) |
| Sesión + contexto clínica | `lib/clinic.ts` (`getSessionContext`) |
| Auth SSR | `lib/supabase/{client,server}.ts`, `middleware.ts` |
| Rutas app | `app/(app)/{dashboard,agenda,pacientes,pipeline,presupuestos,ajustes}` |
| Acciones de escritura | `actions.ts` junto a cada ruta (solo admin/recepción; lectura: doctor) |
| Branding dinámico | `app/(app)/layout.tsx` lee `clinics` y define `--primary` |

**Roles:** `admin` (todo + identidad), `recepcion` (operación diaria),
`doctor` (solo lectura: agenda, pacientes, pipeline, presupuestos).

**Estados Agenda:** por_confirmar → confirmada → en_sala → atendida
(+ cancelada / no_asistio). **Pipeline:** nuevo → contactado →
valoración → presupuesto → aceptado (+ perdido).
**Presupuestos:** borrador → entregado → aceptado (+ rechazado).

## 2. Puesta en marcha (15 min)

### 2.1 Crear proyecto Supabase
1. Nuevo proyecto en https://supabase.com → anota **Project URL** y
   **anon key** (Settings → API).
2. **SQL Editor → New query**: pega `supabase/migrations/0001_core.sql`
   y ejecútalo (crea tablas, RLS y bucket `clinic-assets`).
3. Misma vía con `supabase/seed.sql` para datos demo (opcional pero
   recomendado: agenda de hoy, pipeline y presupuestos de ejemplo).

### 2.2 Crear usuarios y asignarles clínica
1. **Authentication → Users → Add user → Create new user** (×3):
   admin, recepción y doctor de prueba.
2. Copia sus **UID** (columna UID).
3. En SQL Editor, descompleta el bloque `PROFILES` de `seed.sql`
   sustituyendo `UUID-REAL-*` por los UID y ejecútalo. Esto crea las
   filas `profiles` (rol + `clinic_id` de Sonrisa Demo).

### 2.3 Variables de entorno
```bash
cp .env.example .env.local
```
Completa con tu URL y anon key, luego:
```bash
npm install
npm run dev     # http://localhost:3000 → redirige a /login
```

### 2.4 Verificación
```bash
npx tsc --noEmit   # tipos
npm run lint       # eslint
npm run build      # build producción
```

## 3. Personalizar para una clínica real

**Opción A — desde la UI (recomendado):** entra como admin a
`/ajustes`: cambia nombre, color, moneda, logo, edita el tarifario y
agrega doctores/sillones. Sin tocar código.

**Opción B — nueva clínica hija (mismo deploy, datos aislados):**
```sql
insert into public.clinics (name, primary_color, timezone, currency)
values ('Clínica Norte', '#7c3aed', 'America/Mexico_City', 'MXN')
returning id;
-- crear sus usuarios en Auth y sus profiles con ese clinic_id
```
Cada clínica ve solo sus filas gracias al RLS (`clinic_id = auth → profiles`).

**Logo:** súbelo a **Storage → clinic-assets** (público) y pega la URL
en Ajustes. El layout lo muestra en el sidebar.

## 4. Deploy (Vercel)

1. Sube la plantilla a un repo y conéctalo en Vercel.
2. Define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy. Cada clínica hija = mismo deploy + fila en `clinics`.

## 5. Estructura de archivos

```
app/(app)/dashboard/page.tsx      métricas + agenda del día
app/(app)/agenda/                 FullCalendar + DnD + pop-over
app/(app)/pacientes/              CRUD + timeline + presupuestos del paciente
app/(app)/pipeline/               Kanban DnD (@dnd-kit/core)
app/(app)/presupuestos/           lista / constructor / detalle imprimible
app/(app)/ajustes/                identidad + tarifario + recursos
components/*-client.tsx            islas cliente (DnD, calendario, builder)
lib/{clinic,status}.ts             sesión/marca y etiquetas/estados
```

## 6. Lo que NO incluye (hooks fase 2)

- Odontograma SVG interactivo (`docs/superpowers/plans/2026-09-03-crm-dental-mvp.md`, F6)
- WhatsApp real (plantillas + webhook de confirmación)
- Portal del paciente (PWA) y firma digital de consentimientos
- Pagos y facturación electrónica
- Reportes avanzados y recordatorios automáticos

## 7. Troubleshooting

| Síntoma | Causa probable |
|---|---|
| Login redirige a /login en bucle | `profiles` sin fila para ese UID, o `.env.local` sin las keys |
| Páginas vacías con aviso ámbar | Sin conexión Supabase: revisa URL/key |
| “Sin permiso” al guardar | Usuario con rol `doctor` (lectura) |
| Citas/pipeline no se mueven | Solo admin/recepción pueden escribir |
| `npm install` falla con `allow-scripts`/E403 en Windows | Instala con `npm install --userconfig "<temp>\empty-npmrc"` |
| Aviso middleware deprecado en build | Pendiente migrar `middleware.ts` → convención `proxy` (Next 16) |
