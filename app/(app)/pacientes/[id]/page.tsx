import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import {
  deletePatient,
  updatePatient,
} from "@/app/(app)/pacientes/actions";
import { DeleteButton } from "@/components/delete-button";
import {
  APPOINTMENT_STATUS,
  formatDate,
  formatMoney,
  formatTime,
  type AppointmentStatus,
} from "@/lib/status";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birthdate: string | null;
  medical_alerts: string | null;
  notes: string | null;
};

type Appt = {
  id: string;
  starts_at: string;
  status: AppointmentStatus;
  reason: string | null;
  resources: { name: string } | null;
};

type Budget = {
  id: string;
  status: string;
  budget_items: { qty: number; unit_price: number | string }[];
};

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) notFound();
  const { id } = await params;
  const canWrite = ctx.user.role === "admin" || ctx.user.role === "recepcion";

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, birthdate, medical_alerts, notes")
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id)
    .single<Patient>();
  if (!patient) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, starts_at, status, reason, resources(name)")
    .eq("patient_id", id)
    .order("starts_at", { ascending: false })
    .limit(10);

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, status, budget_items(qty, unit_price)")
    .eq("patient_id", id)
    .neq("status", "rechazado");

  const appts = ((appointments ?? []) as unknown as Appt[]).map((a) => ({
    ...a,
    resources: Array.isArray(a.resources) ? a.resources[0] ?? null : a.resources,
  }));
  const pendingBalance = ((budgets ?? []) as unknown as Budget[]).reduce(
    (sum, b) =>
      sum +
      b.budget_items.reduce(
        (s, i) => s + i.qty * Number(i.unit_price),
        0
      ),
    0
  );

  const updateAction = updatePatient.bind(null, id);
  const deleteAction = deletePatient.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/pacientes"
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Pacientes
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {patient.full_name}
          </h1>
          {patient.medical_alerts && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {patient.medical_alerts}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Contacto
          </p>
          <p className="mt-1 text-sm">{patient.phone ?? "—"}</p>
          <p className="text-sm text-slate-500">{patient.email ?? ""}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Nacimiento
          </p>
          <p className="mt-1 text-sm">
            {patient.birthdate
              ? formatDate(patient.birthdate)
              : "Sin registro"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Saldo en presupuestos
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoney(pendingBalance, ctx.clinic.currency)}
          </p>
        </div>
      </div>

      {canWrite ? (
        <form
          action={updateAction}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-base font-semibold">Editar ficha</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full_name" className={labelCls}>
                Nombre completo *
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                defaultValue={patient.full_name}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>
                Teléfono / WhatsApp
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={patient.phone ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={patient.email ?? ""}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="birthdate" className={labelCls}>
                Fecha de nacimiento
              </label>
              <input
                id="birthdate"
                name="birthdate"
                type="date"
                defaultValue={patient.birthdate ?? ""}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label htmlFor="medical_alerts" className={labelCls}>
              Alertas médicas
            </label>
            <input
              id="medical_alerts"
              name="medical_alerts"
              defaultValue={patient.medical_alerts ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="notes" className={labelCls}>
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={patient.notes ?? ""}
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <DeleteButton action={deleteAction} />
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      ) : (
        patient.notes && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold">Notas</h2>
            <p className="mt-1 text-sm text-slate-600">{patient.notes}</p>
          </div>
        )
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Historial de citas</h2>
          {canWrite && (
            <Link
              href="/agenda"
              className="text-sm font-medium text-[var(--primary)] hover:opacity-80"
            >
              Agendar cita →
            </Link>
          )}
        </div>
        {appts.length === 0 ? (
          <p className="text-sm text-slate-500">Sin citas registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {appts.map((a) => {
              const st = APPOINTMENT_STATUS[a.status];
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {formatDate(a.starts_at)} · {formatTime(a.starts_at)}
                      {a.resources ? ` · ${a.resources.name}` : ""}
                    </p>
                    {a.reason && (
                      <p className="truncate text-xs text-slate-500">
                        {a.reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${st.pill}`}
                  >
                    {st.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
