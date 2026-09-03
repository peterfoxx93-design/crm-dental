# CRM Dental MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la plantilla multi-clínica del CRM dental (núcleo operativo) en Next.js + Supabase.

**Architecture:** Un solo deploy Next.js App Router + una DB Supabase multi-tenant (`clinic_id` + RLS). Server Components + Server Actions, shadcn/ui con branding dinámico por clínica.

**Tech Stack:** Next.js 14+ (App Router, TS), Tailwind + shadcn/ui, Supabase (Auth, Postgres, Storage), FullCalendar + dnd-kit para Agenda/Kanban.

## Global Constraints

- Node >= 20, npm >= 10.
- Todo dato clínico lleva `clinic_id` + policy RLS.
- Español UI, moneda configurable por clínica, timezone por clínica.
- Commits frecuentes, TDD donde aplique, sin secretos en repo.
- Remote: https://github.com/peterfoxx93-design/crm-dental, rama `main`.

---

### Task 1: Scaffold Next.js + git init

**Files:**
- Create: `package.json`, `app/layout.tsx`, `app/page.tsx`, `.env.example`, `.gitignore`
- Test: `npm run typecheck` / `npm run build` humo

- [ ] **Step 1: Scaffold app en dir actual**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Verificar arranque**

Run: `npm run dev` humo + `npm run build`
Expected: PASS build sin errores

- [ ] **Step 3: Git init + remote**

```bash
git init -b main
git add -A
git commit -m "feat: scaffold next.js plantilla crm-dental"
git remote add origin https://github.com/peterfoxx93-design/crm-dental.git
```

### Task 2: Base multi-tenant Supabase

**Files:**
- Create: `supabase/migrations/0001_core.sql`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `supabase/seed.sql`
- Modify: `.env.example`

Tablas: `clinics, profiles, patients, resources, appointments, opportunities, treatments_catalog, budgets, budget_items` — todas con `clinic_id` salvo `clinics`. RLS por `clinic_id` vía `profiles`.

- [ ] **Step 1: Migración SQL + policies**
- [ ] **Step 2: Seed demo (1 clínica, 3 usuarios, 12 pacientes, citas, pipeline)**
- [ ] **Step 3: Commit** `feat: base multi-tenant supabase`

### Task 3: Auth + roles + branding dinámico

Layout lee `clinics` y aplica logo/color (`--primary`). Middleware protege rutas por rol Admin/Recepción/Doctor.

- [ ] **Step 1: Login Supabase Auth + middleware**
- [ ] **Step 2: ClinicsProvider + CSS vars**
- [ ] **Step 3: Commit** `feat: auth roles y branding`

### Task 4: Pacientes + Dashboard

CRUD pacientes, widget agenda del día, cards métricas.

- [ ] **Step 1: CRUD + búsqueda**
- [ ] **Step 2: Dashboard cards + widget**
- [ ] **Step 3: Commit** `feat: pacientes y dashboard`

### Task 5: Agenda

Vista diaria/semanal por doctor/sillón, drag & drop, colores Gris→Azul→Amarillo→Verde, pop-over con alerta médica.

- [ ] **Step 1: Calendario + DnD**
- [ ] **Step 2: Estados y pop-over**
- [ ] **Step 3: Commit** `feat: agenda`

### Task 6: Kanban + Presupuestos

Columnas Nuevo→Contactado→Valoración→Entregado→Aceptado con DnD; tarifario + PDF básico.

- [ ] **Step 1: Kanban DnD**
- [ ] **Step 2: Presupuestos + total + PDF**
- [ ] **Step 3: Commit** `feat: kanban y presupuestos`

### Task 7: Pulido plantilla + push

`README-plantilla.md`, `.env.example` completo, typecheck/lint/build verde, push a `main`.

- [ ] **Step 1: Docs + env example**
- [ ] **Step 2: Verificación final**
- [ ] **Step 3: Push**

```bash
git push -u origin main
```
