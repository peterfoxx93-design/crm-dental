import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";

type PatientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  medical_alerts: string | null;
};

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getSessionContext();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const canWrite = ctx?.user.role === "admin" || ctx?.user.role === "recepcion";

  let patients: PatientRow[] = [];
  if (ctx) {
    const supabase = await createClient();
    let req = supabase
      .from("patients")
      .select("id, full_name, phone, email, medical_alerts")
      .eq("clinic_id", ctx.user.clinic_id)
      .order("full_name");
    if (query) req = req.ilike("full_name", `%${query}%`);
    const { data } = await req.limit(100);
    patients = (data ?? []) as PatientRow[];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {patients.length} paciente(s) en {ctx?.clinic.name ?? "tu clínica"}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/pacientes/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Nuevo paciente
          </Link>
        )}
      </div>

      <form className="max-w-md">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </form>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>{" "}
          para ver los pacientes.
        </p>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-medium">Sin pacientes todavía</p>
          <p className="mt-1 text-sm text-slate-500">
            {query
              ? "Prueba con otro nombre."
              : "Crea el primero con el botón Nuevo paciente."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Teléfono
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Correo
                </th>
                <th className="px-4 py-3 font-medium">Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="font-medium text-slate-900 hover:text-[var(--primary)]"
                    >
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {p.phone ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                    {p.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.medical_alerts ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {p.medical_alerts}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
