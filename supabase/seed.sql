-- =============================================================
-- CRM Dental · Seed demo (clínica ficticia "Sonrisa Demo")
-- Uso: tras aplicar 0001_core.sql, correr este script con service_role
-- o como postgres. Las citas usan now() para que el demo siempre
-- muestre la agenda de "hoy".
--
-- Perfiles de usuario: crear primero los 3 usuarios en
-- Authentication → Users y luego descomentar el bloque PROFILES
-- con sus UUID reales (ver README-plantilla.md).
-- =============================================================

-- ---------- clínica demo (id fijo para enlazar el seed) ----------
insert into public.clinics (id, name, primary_color, timezone, currency)
values ('11111111-1111-1111-1111-111111111111', 'Sonrisa Demo', '#0ea5e9', 'America/Mexico_City', 'MXN')
on conflict (id) do nothing;

-- ---------- PROFILES (descomentar con UUID reales de Auth) ----------
-- insert into public.profiles (id, clinic_id, role, full_name) values
--   ('UUID-REAL-ADMIN',  '11111111-1111-1111-1111-111111111111', 'admin',     'Dra. Admin'),
--   ('UUID-REAL-RECEP',  '11111111-1111-1111-1111-111111111111', 'recepcion', 'Recepción Demo'),
--   ('UUID-REAL-DOCTOR', '11111111-1111-1111-1111-111111111111', 'doctor',    'Dr. Demo')
-- on conflict (id) do nothing;

-- ---------- recursos: doctores y sillones ----------
insert into public.resources (clinic_id, name, type, color) values
  ('11111111-1111-1111-1111-111111111111', 'Dra. Valeria Ríos', 'doctor', '#0ea5e9'),
  ('11111111-1111-1111-1111-111111111111', 'Dr. Marco Paz',     'doctor', '#8b5cf6'),
  ('11111111-1111-1111-1111-111111111111', 'Sillón 1',          'sillon', '#10b981'),
  ('11111111-1111-1111-1111-111111111111', 'Sillón 2',          'sillon', '#f59e0b')
on conflict do nothing;

-- ---------- tarifario ----------
insert into public.treatments_catalog (clinic_id, name, price) values
  ('11111111-1111-1111-1111-111111111111', 'Limpieza dental',        800),
  ('11111111-1111-1111-1111-111111111111', 'Resina simple',          1200),
  ('11111111-1111-1111-1111-111111111111', 'Endodoncia',             4500),
  ('11111111-1111-1111-1111-111111111111', 'Corona zirconio',        6800),
  ('11111111-1111-1111-1111-111111111111', 'Implante dental',        15000),
  ('11111111-1111-1111-1111-111111111111', 'Diseño de sonrisa',      25000)
on conflict do nothing;

-- ---------- pacientes demo ----------
insert into public.patients (clinic_id, full_name, phone, email, medical_alerts, notes) values
  ('11111111-1111-1111-1111-111111111111', 'Ana Beltrán',   '+52 55 1234 0001', 'ana@demo.mx',   null,                              'Prefiere citas matutinas.'),
  ('11111111-1111-1111-1111-111111111111', 'Carlos Méndez', '+52 55 1234 0002', 'carlos@demo.mx', 'Alergia a la penicilina',        'Derivado de Instagram.'),
  ('11111111-1111-1111-1111-111111111111', 'Lucía Fernández','+52 55 1234 0003','lucia@demo.mx',  null,                              'Interesada en diseño de sonrisa.'),
  ('11111111-1111-1111-1111-111111111111', 'Jorge Ramírez', '+52 55 1234 0004', 'jorge@demo.mx',  'Hipertensión controlada',         null),
  ('11111111-1111-1111-1111-111111111111', 'María Torres',  '+52 55 1234 0005', 'maria@demo.mx',  null,                              'Reagendó 2 veces: confirmar por WhatsApp.'),
  ('11111111-1111-1111-1111-111111111111', 'Diego López',   '+52 55 1234 0006', 'diego@demo.mx',  null,                              null),
  ('11111111-1111-1111-1111-111111111111', 'Sofía Herrera', '+52 55 1234 0007', 'sofia@demo.mx',  'Asma: traer inhalador',           'Primera visita.'),
  ('11111111-1111-1111-1111-111111111111', 'Pedro Aguilar', '+52 55 1234 0008', 'pedro@demo.mx',  null,                              'Cotización implante pendiente.')
on conflict do nothing;

-- ---------- agenda de hoy (demo) ----------
with c as (
  select '11111111-1111-1111-1111-111111111111'::uuid as clinic
),
p as (
  select full_name, id from public.patients
  where clinic_id = '11111111-1111-1111-1111-111111111111'
),
r as (
  select name, id from public.resources
  where clinic_id = '11111111-1111-1111-1111-111111111111'
)
insert into public.appointments (clinic_id, patient_id, resource_id, starts_at, ends_at, status, reason)
select
  (select clinic from c),
  (select id from p where full_name = v.patient),
  (select id from r where name = v.resource),
  date_trunc('day', now()) + v.hora,
  date_trunc('day', now()) + v.hora + interval '45 minutes',
  v.status,
  v.reason
from (values
  ('Ana Beltrán',    'Dra. Valeria Ríos', interval '9 hours',        'confirmada',     'Limpieza + revisión'),
  ('Carlos Méndez',  'Dr. Marco Paz',     interval '10 hours',       'en_sala',        'Dolor molar inferior'),
  ('Lucía Fernández','Dra. Valeria Ríos', interval '11 hours',       'por_confirmar',  'Valoración diseño de sonrisa'),
  ('Jorge Ramírez',  'Dr. Marco Paz',     interval '12 hours',       'confirmada',     'Endodoncia pieza 36'),
  ('María Torres',   'Dra. Valeria Ríos', interval '13 hours',       'por_confirmar',  'Control ortodoncia'),
  ('Diego López',    'Dr. Marco Paz',     interval '16 hours',       'confirmada',     'Extracción cordal'),
  ('Sofía Herrera',  'Dra. Valeria Ríos', interval '17 hours',       'por_confirmar',  'Primera visita'),
  ('Pedro Aguilar',  'Dr. Marco Paz',     interval '18 hours',       'confirmada',     'Revisión implante')
) as v(patient, resource, hora, status, reason)
on conflict do nothing;

-- ---------- pipeline demo ----------
with p as (
  select full_name, id from public.patients
  where clinic_id = '11111111-1111-1111-1111-111111111111'
)
insert into public.opportunities (clinic_id, patient_id, title, amount, stage, next_step)
select
  '11111111-1111-1111-1111-111111111111',
  (select id from p where full_name = v.patient),
  v.title, v.amount, v.stage, v.next_step
from (values
  ('Lucía Fernández', 'Diseño de sonrisa superior', 25000, 'valoracion',  'Enviar fotos de referencia'),
  ('Pedro Aguilar',   'Implante pieza 11',          15000, 'presupuesto','Llamar jueves para cierre'),
  ('Carlos Méndez',   'Endodoncia + corona',        11300, 'contactado', 'Confirmar cita de valoración'),
  ('Diego López',     'Extracción cordales x2',      6000, 'nuevo',      'Primer contacto por WhatsApp'),
  ('María Torres',    'Ortodoncia invisible',       32000, 'aceptado',   'Firmar plan de pagos')
) as v(patient, title, amount, stage, next_step)
on conflict do nothing;

-- ---------- presupuestos demo ----------
with p as (
  select full_name, id from public.patients
  where clinic_id = '11111111-1111-1111-1111-111111111111'
),
t as (
  select name, id, price from public.treatments_catalog
  where clinic_id = '11111111-1111-1111-1111-111111111111'
),
new_budgets as (
  insert into public.budgets (clinic_id, patient_id, status, notes)
  select '11111111-1111-1111-1111-111111111111', (select id from p where full_name = v.patient), v.status, v.notes
  from (values
    ('Pedro Aguilar',   'entregado', 'Implante + corona, pago en 2 fases'),
    ('Lucía Fernández', 'borrador',  'Borrador: falta foto y modelo')
  ) as v(patient, status, notes)
  returning id, patient_id
)
insert into public.budget_items (budget_id, treatment_id, name, qty, unit_price)
select nb.id, t.id, t.name, 1, t.price
from new_budgets nb
join p on p.id = nb.patient_id
join t on (p.full_name = 'Pedro Aguilar' and t.name in ('Implante dental', 'Corona zirconio'))
      or (p.full_name = 'Lucía Fernández' and t.name in ('Limpieza dental', 'Diseño de sonrisa'))
on conflict do nothing;
