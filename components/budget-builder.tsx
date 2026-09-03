"use client";

import { useMemo, useState } from "react";
import { createBudget } from "@/app/(app)/presupuestos/actions";
import { formatMoney } from "@/lib/status";

type CatalogItem = { id: string; name: string; price: number | string };
type Row = {
  key: number;
  treatment_id: string;
  name: string;
  qty: number;
  unit_price: number;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

let nextKey = 1;

export function BudgetBuilder({
  patients,
  catalog,
  currency,
  defaultPatientId,
}: {
  patients: { id: string; full_name: string }[];
  catalog: CatalogItem[];
  currency: string;
  defaultPatientId: string;
}) {
  const [patientId, setPatientId] = useState(defaultPatientId);
  const [rows, setRows] = useState<Row[]>([
    { key: nextKey++, treatment_id: "", name: "", qty: 1, unit_price: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => rows.reduce((s, r) => s + r.qty * r.unit_price, 0),
    [rows]
  );

  function pickCatalog(key: number, treatmentId: string) {
    const found = catalog.find((c) => c.id === treatmentId);
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              treatment_id: treatmentId,
              name: found?.name ?? r.name,
              unit_price: found ? Number(found.price) : r.unit_price,
            }
          : r
      )
    );
  }

  function updateRow(key: number, patch: Partial<Row>, resetCatalog = false) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? { ...r, ...patch, treatment_id: resetCatalog ? "" : (patch.treatment_id ?? r.treatment_id) }
          : r
      )
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const valid = rows.filter((r) => r.name.trim() !== "");
    if (!patientId || valid.length === 0) {
      e.preventDefault();
      setError("Elige un paciente y agrega al menos un tratamiento con nombre.");
      return;
    }
    setError(null);
    // El formulario continúa hacia la server action con los ítems serializados.
  }

  return (
    <form
      action={createBudget}
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          rows
            .filter((r) => r.name.trim() !== "")
            .map((r) => ({
              treatment_id: r.treatment_id || null,
              name: r.name.trim(),
              qty: r.qty,
              unit_price: r.unit_price,
            }))
        )}
      />

      <div>
        <label className={labelCls} htmlFor="bb-paciente">
          Paciente *
        </label>
        <select
          id="bb-paciente"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className={`${inputCls} max-w-md`}
        >
          <option value="">Seleccionar…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <p className={labelCls}>Tratamientos</p>
        {rows.map((r) => (
          <div
            key={r.key}
            className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_1fr_80px_130px_auto]"
          >
            <select
              value={r.treatment_id}
              onChange={(e) => pickCatalog(r.key, e.target.value)}
              className={inputCls}
              aria-label="Elegir del tarifario"
            >
              <option value="">Del tarifario…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {formatMoney(Number(c.price), currency)}
                </option>
              ))}
            </select>
            <input
              value={r.name}
              onChange={(e) =>
                updateRow(r.key, { name: e.target.value }, true)
              }
              className={inputCls}
              placeholder="Nombre del tratamiento *"
              aria-label="Nombre del tratamiento"
            />
            <input
              type="number"
              min={1}
              value={r.qty}
              onChange={(e) =>
                updateRow(r.key, { qty: Math.max(1, Number(e.target.value) || 1) })
              }
              className={inputCls}
              aria-label="Cantidad"
            />
            <input
              type="number"
              min={0}
              value={r.unit_price}
              onChange={(e) =>
                updateRow(r.key, { unit_price: Math.max(0, Number(e.target.value) || 0) })
              }
              className={inputCls}
              aria-label="Precio unitario"
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white hover:text-red-600"
              aria-label="Quitar fila"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { key: nextKey++, treatment_id: "", name: "", qty: 1, unit_price: 0 },
            ])
          }
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--primary)] ring-1 ring-slate-200 hover:bg-slate-50"
        >
          + Agregar tratamiento
        </button>
      </div>

      <div>
        <label className={labelCls} htmlFor="bb-notes">
          Notas
        </label>
        <textarea
          id="bb-notes"
          name="notes"
          rows={2}
          className={inputCls}
          placeholder="Ej. Pago en 2 fases, incluye radiografías"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500">
          Total:{" "}
          <span className="text-xl font-semibold text-slate-900 tabular-nums">
            {formatMoney(total, currency)}
          </span>
        </p>
        <button
          type="submit"
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Crear presupuesto
        </button>
      </div>
    </form>
  );
}
