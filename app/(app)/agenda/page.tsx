import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import { AgendaClient, type AgendaEvent } from "@/components/agenda-client";
import type { AppointmentStatus } from "@/lib/status";

type Resource = { id: string; name: string; type: string };
type PatientOpt = { id: string; full_name: string };

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const ctx = await getSessionContext();
  const params = await searchParams;
  const fallback = monthBounds();
  const start = params.start ?? fallback.start;
  const end = params.end ?? fallback.end;
  const canWrite = ctx?.user.role === "admin" || ctx?.user.role === "recepcion";

  let events: AgendaEvent[] = [];
  let resources: Resource[] = [];
  let patients: PatientOpt[] = [];

  if (ctx) {
    const supabase = await createClient();

    const { data: appts } = await supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, reason, patient_id, resource_id, patients(id, full_name, medical_alerts), resources(id, name)"
      )
      .eq("clinic_id", ctx.user.clinic_id)
      .lt("starts_at", end)
      .gt("ends_at", start)
      .order("starts_at")
      .limit(500);

    events = ((appts ?? []) as unknown as Array<{
      id: string;
      starts_at: string;
      ends_at: string;
      status: AppointmentStatus;
      reason: string | null;
      resource_id: string | null;
      patients: { full_name: string; medical_alerts: string | null } | null;
      resources: { name: string } | null;
    }>).map((a) => ({
      id: a.id,
      title: Array.isArray(a.patients)
        ? a.patients[0]?.full_name ?? "Paciente"
        : a.patients?.full_name ?? "Paciente",
      start: a.starts_at,
      end: a.ends_at,
      status: a.status,
      reason: a.reason,
      resourceName:
        (Array.isArray(a.resources) ? a.resources[0]?.name : a.resources?.name) ??
        null,
      resourceId: a.resource_id,
      medicalAlerts:
        (Array.isArray(a.patients)
          ? a.patients[0]?.medical_alerts
          : a.patients?.medical_alerts) ?? null,
    }));

    const { data: res } = await supabase
      .from("resources")
      .select("id, name, type")
      .eq("clinic_id", ctx.user.clinic_id)
      .eq("active", true)
      .order("name");
    resources = (res ?? []) as Resource[];

    const { data: pats } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", ctx.user.clinic_id)
      .order("full_name")
      .limit(200);
    patients = (pats ?? []) as PatientOpt[];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-slate-500">
          Arrastra una cita para reagendar · clic para ver detalle y cambiar
          estado
        </p>
      </div>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>{" "}
          para ver la agenda.
        </p>
      ) : (
        <AgendaClient
          initialEvents={events}
          resources={resources}
          patients={patients}
          canWrite={canWrite}
          rangeStart={start}
          rangeEnd={end}
        />
      )}
    </div>
  );
}
