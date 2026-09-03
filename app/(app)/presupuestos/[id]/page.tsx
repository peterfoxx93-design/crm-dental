import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import {
  addBudgetItem,
  removeBudgetItem,
  deleteBudget,
  updateBudgetNotes,
  updateBudgetStatus,
  type BudgetStatus,
} from "@/app/(app)/presupuestos/actions";
import { BUDGET_STATUS } from "@/app/(app)/presupuestos/page";
import { formatDate, formatMoney } from "@/lib/status";
import { DeleteButton } from "@/components/delete-button";
import { PrintButton } from "@/components/print-button";

const STATUS_ACTIONS: BudgetStatus[] = [
  "borrador",
  "entregado",
  "aceptado",
  "rechazado",
];

type BudgetDetail = {
  id: string;
  status: BudgetStatus;
  notes: string | null;
  created_at: string;
  patients: { id: string; full_name: string } | null;
  budget_items: {
    id: string;
    name: string;
    qty: number;
    unit_price: number | string;
  }[];
};

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSessionContext();
  const canWrite = ctx?.user.role === "admin" || ctx?.user.role === "recepcion";

  let budget: (BudgetDetail & { patient_name: string; patient_id: string; total: number }) | null = null;
  let catalog: { id: string; name: string; price: number | string }[] = [];

  if (ctx) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("budgets")
      .select(
        "id, status, notes, created_at, patients(id, full_name), budget_items(id, name, qty, unit_price)"
      )
      .eq("id", id)
      .eq("clinic_id", ctx.user.clinic_id)
      .single();

    if (data) {
      const b = data as unknown as BudgetDetail;
      const patient = Array.isArray(b.patients) ? b.patients[0] : b.patients;
      budget = {
        ...b,
        patient_name: patient?.full_name ?? "Paciente",
        patient_id: patient?.id ?? "",
        total: b.budget_items.reduce(
          (s, i) => s + i.qty * Number(i.unit_price),
          0
        ),
      };
    }

    const { data: cat } = await supabase
      .from("treatments_catalog")
      .select("id, name, price")
      .eq("clinic_id", ctx.user.clinic_id)
      .order("name")
      .limit(200);
    catalog = (cat ?? []) as {
      id: string;
      name: string;
      price: number | string;
    }[];
  }

  if (ctx && !budget) notFound();

  const st = budget ? BUDGET_STATUS[budget.status] : null;
  const addItem = canWrite && budget ? addBudgetItem.bind(null, budget.id) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3 print:hidden">
        <Link
          href="/presupuestos"
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-white"
        >
          ← Volver
        </Link>
      </div>

      {!ctx || !budget || !st ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>.
        </p>
      ) : (
        <>
          {/* Encabezado imprimible */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--primary)]">
                  {ctx.clinic.name}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  Presupuesto · {budget.patient_name}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(budget.created_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${st.pill}`}
              >
                {st.label}
              </span>
            </div>

            <table className="mt-6 w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Tratamiento</th>
                  <th className="w-16 py-2 text-right font-medium">Cant.</th>
                  <th className="w-32 py-2 text-right font-medium">Unitario</th>
                  <th className="w-32 py-2 text-right font-medium">Subtotal</th>
                  {canWrite && <th className="w-16 print:hidden" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budget.budget_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 font-medium">{item.name}</td>
                    <td className="py-2.5 text-right tabular-nums">{item.qty}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-600">
                      {formatMoney(Number(item.unit_price), ctx.clinic.currency)}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {formatMoney(
                        item.qty * Number(item.unit_price),
                        ctx.clinic.currency
                      )}
                    </td>
                    {canWrite && (
                      <td className="py-2.5 text-right print:hidden">
                        <form
                          action={removeBudgetItem.bind(null, budget.id, item.id)}
                        >
                          <button
                            type="submit"
                            className="text-xs font-medium text-slate-400 hover:text-red-600"
                          >
                            Quitar
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 text-right text-sm font-medium">
                    Total
                  </td>
                  <td className="py-3 text-right text-lg font-bold tabular-nums text-[var(--primary)]">
                    {formatMoney(budget.total, ctx.clinic.currency)}
                  </td>
                  {canWrite && <td className="print:hidden" />}
                </tr>
              </tfoot>
            </table>

            {budget.notes && (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {budget.notes}
              </p>
            )}
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-sm font-medium text-slate-600">
                Marcar como:
              </span>
              {STATUS_ACTIONS.filter((s) => s !== budget.status).map((s) => (
                <form
                  key={s}
                  action={updateBudgetStatus.bind(null, budget.id, s)}
                >
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--primary)] ring-1 ring-slate-200 hover:bg-white"
                  >
                    {BUDGET_STATUS[s].label}
                  </button>
                </form>
              ))}
              <span className="flex-1" />
              <PrintButton />
              <DeleteButton
                action={deleteBudget.bind(null, budget.id)}
                label="Eliminar"
              />
            </div>
          )}

          {canWrite && (
            <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 print:hidden">
              <summary className="cursor-pointer text-sm font-medium">
                Agregar ítem
              </summary>
              <form action={addItem} className="mt-3">
                <AddItemFields catalog={catalog} currency={ctx.clinic.currency} />
              </form>
            </details>
          )}

          {canWrite && (
            <form
              action={updateBudgetNotes.bind(null, budget.id)}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 print:hidden"
            >
              <label
                htmlFor="budget-notes"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Notas
              </label>
              <div className="flex gap-2">
                <input
                  id="budget-notes"
                  name="notes"
                  defaultValue={budget.notes ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Condiciones, formas de pago…"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function AddItemFields({
  catalog,
  currency,
}: {
  catalog: { id: string; name: string; price: number | string }[];
  currency: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_130px_auto]">
        <select
          name="catalog"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          defaultValue=""
        >
          <option value="">Del tarifario…</option>
          {catalog.map((c) => (
            <option
              key={c.id}
              value={JSON.stringify({
                treatment_id: c.id,
                name: c.name,
                unit_price: Number(c.price),
              })}
            >
              {c.name} · {formatMoney(Number(c.price), currency)}
            </option>
          ))}
        </select>
        <input
          name="qty"
          type="number"
          min={1}
          defaultValue={1}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          aria-label="Cantidad"
        />
        <input
          name="custom"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          placeholder="O escribe un ítem libre: Nombre, precio"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Agregar
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Si eliges del tarifario se ignora el texto libre. Formato libre:
        &quot;Nombre, precio&quot; (ej. Limpieza profunda, 1200).
      </p>
    </>
  );
}
