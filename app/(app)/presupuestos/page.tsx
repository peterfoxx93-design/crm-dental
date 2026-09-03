import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import { formatDate, formatMoney } from "@/lib/status";
import type { BudgetStatus } from "@/app/(app)/presupuestos/actions";

export const BUDGET_STATUS: Record<BudgetStatus, { label: string; pill: string }> = {
  borrador: {
    label: "Borrador",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  entregado: {
    label: "Entregado",
    pill: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  aceptado: {
    label: "Aceptado",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  rechazado: {
    label: "Rechazado",
    pill: "bg-red-50 text-red-600 ring-red-200",
  },
};

type BudgetRow = {
  id: string;
  status: BudgetStatus;
  created_at: string;
  patients: { full_name: string } | null;
  budget_items: { qty: number; unit_price: number | string }[];
};

export default async function PresupuestosPage() {
  const ctx = await getSessionContext();
  const canWrite = ctx?.user.role === "admin" || ctx?.user.role === "recepcion";

  let budgets: (BudgetRow & { total: number; patient_name: string })[] = [];
  if (ctx) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("budgets")
      .select("id, status, created_at, patients(full_name), budget_items(qty, unit_price)")
      .eq("clinic_id", ctx.user.clinic_id)
      .order("created_at", { ascending: false })
      .limit(100);

    budgets = ((data ?? []) as unknown as BudgetRow[]).map((b) => ({
      ...b,
      patient_name: Array.isArray(b.patients)
        ? b.patients[0]?.full_name ?? "Paciente"
        : b.patients?.full_name ?? "Paciente",
      total: b.budget_items.reduce(
        (s, i) => s + i.qty * Number(i.unit_price),
        0
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="mt-1 text-sm text-slate-500">
            {budgets.length} presupuesto(s)
          </p>
        </div>
        {canWrite && (
          <Link
            href="/presupuestos/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Nuevo presupuesto
          </Link>
        )}
      </div>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>{" "}
          para ver los presupuestos.
        </p>
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-medium">Sin presupuestos todavía</p>
          <p className="mt-1 text-sm text-slate-500">
            Crea el primero con el botón Nuevo presupuesto.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Fecha
                </th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgets.map((b) => {
                const st = BUDGET_STATUS[b.status];
                return (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/presupuestos/${b.id}`}
                        className="font-medium text-slate-900 hover:text-[var(--primary)]"
                      >
                        {b.patient_name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {b.budget_items.length} ítem(s)
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {formatDate(b.created_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatMoney(b.total, ctx.clinic.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${st.pill}`}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
