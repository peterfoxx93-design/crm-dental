import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import {
  APPOINTMENT_STATUS,
  formatTime,
  type AppointmentStatus,
} from "@/lib/status";

type TodayAppt = {
  id: string;
  starts_at: string;
  status: AppointmentStatus;
  reason: string | null;
  patients: { full_name: string; medical_alerts: string | null } | null;
  resources: { name: string } | null;
};

function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function DashboardPage() {
  const ctx = await getSessionContext();

  let citasHoy = 0;
  let enSala = 0;
  let presupuestosPendientes = 0;
  let leadsNuevos = 0;
  let agenda: TodayAppt[] = [];

  if (ctx) {
    const supabase = await createClient();
    const { start, end } = dayBounds();

    const { data: appts } = await supabase
      .from("appointments")
      .select(
        "id, starts_at, status, reason, patients(full_name, medical_alerts), resources(name)"
      )
      .eq("clinic_id", ctx.user.clinic_id)
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at");

    const rows = ((appts ?? []) as unknown as TodayAppt[]).map((a) => ({
      ...a,
      patients: Array.isArray(a.patients) ? a.patients[0] ?? null : a.patients,
      resources: Array.isArray(a.resources)
        ? a.resources[0] ?? null
        : a.resources,
    }));
    agenda = rows;
    citasHoy = rows.filter((a) => a.status !== "cancelada").length;
    enSala = rows.filter((a) => a.status === "en_sala").length;

    const { count: budgetsCount } = await supabase
      .from("budgets")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", ctx.user.clinic_id)
      .in("status", ["borrador", "entregado"]);
    presupuestosPendientes = budgetsCount ?? 0;

    const { count: leadsCount } = await supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", ctx.user.clinic_id)
      .eq("stage", "nuevo");
    leadsNuevos = leadsCount ?? 0;
  }

  const cards = [
    { label: "Citas hoy", value: String(citasHoy), href: "/agenda" },
    { label: "En sala de espera", value: String(enSala), href: "/agenda" },
    {
      label: "Presupuestos pendientes",
      value: String(presupuestosPendientes),
      href: "/presupuestos",
    },
    { label: "Leads nuevos", value: String(leadsNuevos), href: "/pipeline" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen operativo del día
          {ctx ? ` · ${ctx.clinic.name}` : ""}
        </p>
      </div>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>{" "}
          para ver los datos en vivo.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow"
              >
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {card.value}
                </p>
              </Link>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Agenda del día</h2>
              <Link
                href="/agenda"
                className="text-sm font-medium text-[var(--primary)] hover:opacity-80"
              >
                Ver agenda →
              </Link>
            </div>
            {agenda.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay citas programadas para hoy.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {agenda.map((a) => {
                  const st = APPOINTMENT_STATUS[a.status];
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                      <p className="w-14 shrink-0 text-sm font-medium tabular-nums">
                        {formatTime(a.starts_at)}
                      </p>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {a.patients?.full_name ?? "Paciente"}
                          {a.patients?.medical_alerts && (
                            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                              {a.patients.medical_alerts}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {[a.reason, a.resources?.name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
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

          <p className="text-xs text-slate-400">
            Moneda de la clínica: {ctx.clinic.currency} · Zona horaria:{" "}
            {ctx.clinic.timezone}
          </p>
        </>
      )}
    </div>
  );
}
