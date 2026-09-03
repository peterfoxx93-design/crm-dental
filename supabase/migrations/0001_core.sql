-- =============================================================
-- CRM Dental · Migración 0001 · Núcleo multi-tenant
-- Un solo deploy sirve a N clínicas: todo dato lleva clinic_id + RLS.
-- Aplicar en Supabase: Database → SQL Editor, o `supabase db push`.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- util: updated_at automático ----------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- clinics ----------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text not null default '#2563eb',
  timezone text not null default 'America/Mexico_City',
  currency text not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- profiles (1 usuario Supabase Auth = 1 fila) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  role text not null check (role in ('admin', 'recepcion', 'doctor')),
  full_name text,
  created_at timestamptz not null default now()
);
create index profiles_clinic_idx on public.profiles (clinic_id);

-- ---------- helpers RLS (SECURITY DEFINER, search_path fijo) ----------
create or replace function public.current_clinic_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select clinic_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- patients ----------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  birthdate date,
  medical_alerts text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_clinic_idx on public.patients (clinic_id);
create index patients_name_idx on public.patients (clinic_id, full_name);

-- ---------- resources (doctores / sillones del calendario) ----------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  type text not null check (type in ('doctor', 'sillon')),
  color text not null default '#2563eb',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index resources_clinic_idx on public.resources (clinic_id);

-- ---------- appointments ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'por_confirmar'
    check (status in ('por_confirmar', 'confirmada', 'en_sala', 'atendido', 'cancelada')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_clinic_idx on public.appointments (clinic_id, starts_at);
create index appointments_patient_idx on public.appointments (patient_id);

-- ---------- opportunities (pipeline kanban) ----------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null default 0,
  stage text not null default 'nuevo'
    check (stage in ('nuevo', 'contactado', 'valoracion', 'presupuesto', 'aceptado', 'perdido')),
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_clinic_idx on public.opportunities (clinic_id, stage);

-- ---------- treatments_catalog (tarifario por clínica) ----------
create table public.treatments_catalog (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index treatments_clinic_idx on public.treatments_catalog (clinic_id);

-- ---------- budgets ----------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  status text not null default 'borrador'
    check (status in ('borrador', 'entregado', 'aceptado', 'rechazado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budgets_clinic_idx on public.budgets (clinic_id, status);

-- ---------- budget_items ----------
create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  treatment_id uuid references public.treatments_catalog (id) on delete set null,
  name text not null,
  qty integer not null default 1 check (qty > 0),
  unit_price numeric(12, 2) not null default 0
);
create index budget_items_budget_idx on public.budget_items (budget_id);

-- ---------- triggers updated_at ----------
create trigger clinics_updated_at before update on public.clinics
  for each row execute function public.handle_updated_at();
create trigger patients_updated_at before update on public.patients
  for each row execute function public.handle_updated_at();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.handle_updated_at();
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.handle_updated_at();
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.handle_updated_at();

-- =============================================================
-- RLS · Patrón plantilla:
-- · SELECT: cualquier miembro de la clínica (cubre rol doctor read-only)
-- · ALL (insert/update/delete): solo admin + recepcion de la clínica
-- =============================================================

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.resources enable row level security;
alter table public.appointments enable row level security;
alter table public.opportunities enable row level security;
alter table public.treatments_catalog enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;

-- clinics: ver la propia; editar solo admin
create policy clinics_member_select on public.clinics
  for select using (id = public.current_clinic_id());
create policy clinics_admin_update on public.clinics
  for update using (id = public.current_clinic_id() and public.current_role() = 'admin')
  with check (id = public.current_clinic_id() and public.current_role() = 'admin');

-- profiles: ver la propia + staff ve las de su clínica; altas solo admin
-- (el primer admin se crea con service_role tras el signup, ver README-plantilla)
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_staff_select on public.profiles
  for select using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );
create policy profiles_admin_write on public.profiles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- patients
create policy patients_member_select on public.patients
  for select using (clinic_id = public.current_clinic_id());
create policy patients_staff_write on public.patients
  for all using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );

-- resources
create policy resources_member_select on public.resources
  for select using (clinic_id = public.current_clinic_id());
create policy resources_staff_write on public.resources
  for all using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );

-- appointments
create policy appointments_member_select on public.appointments
  for select using (clinic_id = public.current_clinic_id());
create policy appointments_staff_write on public.appointments
  for all using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );

-- opportunities
create policy opportunities_member_select on public.opportunities
  for select using (clinic_id = public.current_clinic_id());
create policy opportunities_staff_write on public.opportunities
  for all using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );

-- treatments_catalog
create policy treatments_member_select on public.treatments_catalog
  for select using (clinic_id = public.current_clinic_id());
create policy treatments_staff_write on public.treatments_catalog
  for all using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );

-- budgets
create policy budgets_member_select on public.budgets
  for select using (clinic_id = public.current_clinic_id());
create policy budgets_staff_write on public.budgets
  for all using (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (
    clinic_id = public.current_clinic_id()
    and public.current_role() in ('admin', 'recepcion')
  );

-- budget_items: heredan la clínica del presupuesto padre
create policy budget_items_member_select on public.budget_items
  for select using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and b.clinic_id = public.current_clinic_id()
    )
  );
create policy budget_items_staff_write on public.budget_items
  for all using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id
        and b.clinic_id = public.current_clinic_id()
        and public.current_role() in ('admin', 'recepcion')
    )
  )
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id
        and b.clinic_id = public.current_clinic_id()
        and public.current_role() in ('admin', 'recepcion')
    )
  );

-- =============================================================
-- Storage · bucket público para logos/assets de clínicas
-- =============================================================
insert into storage.buckets (id, name, public)
values ('clinic-assets', 'clinic-assets', true)
on conflict (id) do nothing;

create policy assets_public_read on storage.objects
  for select using (bucket_id = 'clinic-assets');
create policy assets_staff_write on storage.objects
  for insert with check (
    bucket_id = 'clinic-assets'
    and public.current_role() in ('admin', 'recepcion')
  );
create policy assets_staff_update on storage.objects
  for update using (
    bucket_id = 'clinic-assets'
    and public.current_role() in ('admin', 'recepcion')
  )
  with check (bucket_id = 'clinic-assets');
create policy assets_staff_delete on storage.objects
  for delete using (
    bucket_id = 'clinic-assets'
    and public.current_role() in ('admin', 'recepcion')
  );
