"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  createOpportunity,
  deleteOpportunity,
  moveOpportunity,
} from "@/app/(app)/pipeline/actions";
import {
  OPPORTUNITY_STAGE,
  formatMoney,
  type OpportunityStage,
} from "@/lib/status";

export type Opportunity = {
  id: string;
  title: string;
  amount: number;
  stage: OpportunityStage;
  next_step: string | null;
  patient_name: string;
};

const STAGES: OpportunityStage[] = [
  "nuevo",
  "contactado",
  "valoracion",
  "presupuesto",
  "aceptado",
  "perdido",
];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function OppCard({
  opp,
  currency,
  canWrite,
  onDelete,
}: {
  opp: Opportunity;
  currency: string;
  canWrite: boolean;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({ id: opp.id, disabled: !canWrite });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-xl bg-white p-3 ring-1 ring-slate-200 ${
        canWrite ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"}`}
    >
      <p className="text-sm font-semibold">{opp.patient_name}</p>
      <p className="truncate text-xs text-slate-500">{opp.title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {formatMoney(opp.amount, currency)}
      </p>
      {opp.next_step && (
        <p className="mt-1 truncate text-xs text-slate-500">
          Siguiente: {opp.next_step}
        </p>
      )}
      {canWrite && (
        <button
          onClick={() => onDelete(opp.id)}
          className="mt-2 text-xs font-medium text-slate-400 hover:text-red-600"
        >
          Eliminar
        </button>
      )}
    </div>
  );
}

function Column({
  stage,
  opps,
  currency,
  canWrite,
  onDelete,
}: {
  stage: OpportunityStage;
  opps: Opportunity[];
  currency: string;
  canWrite: boolean;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = opps.reduce((s, o) => s + o.amount, 0);
  const won = stage === "aceptado";
  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-2xl p-3 ring-1 transition-colors ${
        isOver
          ? "bg-[var(--primary)]/10 ring-[var(--primary)]/40"
          : won
            ? "bg-emerald-50/60 ring-emerald-200"
            : "bg-slate-100/70 ring-slate-200"
      }`}
    >
      <div className="mb-2 px-1">
        <p className="text-sm font-semibold">{OPPORTUNITY_STAGE[stage].label}</p>
        <p className="text-xs text-slate-500">
          {opps.length} · {formatMoney(total, currency)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {opps.map((o) => (
          <OppCard
            key={o.id}
            opp={o}
            currency={currency}
            canWrite={canWrite}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export function PipelineClient({
  initialOpportunities,
  patients,
  canWrite,
  currency,
}: {
  initialOpportunities: Opportunity[];
  patients: { id: string; full_name: string }[];
  canWrite: boolean;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialOpportunities);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: "",
    title: "",
    amount: "",
    next_step: "",
  });

  const byStage = useMemo(() => {
    const map = new Map<OpportunityStage, Opportunity[]>(
      STAGES.map((s) => [s, []])
    );
    items.forEach((o) => map.get(o.stage)?.push(o));
    return map;
  }, [items]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !canWrite) return;
    const stage = over.id as OpportunityStage;
    const opp = items.find((o) => o.id === active.id);
    if (!opp || opp.stage === stage) return;
    // Optimista
    setItems((prev) =>
      prev.map((o) => (o.id === opp.id ? { ...o, stage } : o))
    );
    try {
      await moveOpportunity(opp.id, stage);
      refresh();
    } catch (err) {
      setItems((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...o, stage: opp.stage } : o))
      );
      setError(err instanceof Error ? err.message : "No se pudo mover.");
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("¿Eliminar esta oportunidad?")) return;
    try {
      await deleteOpportunity(id);
      setItems((prev) => prev.filter((o) => o.id !== id));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createOpportunity({
        patient_id: form.patient_id,
        title: form.title,
        amount: Number(form.amount) || 0,
        stage: "nuevo",
        next_step: form.next_step.trim() || null,
      });
      setForm({ patient_id: "", title: "", amount: "", next_step: "" });
      setShowNew(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {canWrite && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Nueva oportunidad
          </button>
        )}
        {pending && <span className="text-xs text-slate-400">Actualizando…</span>}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {showNew && canWrite && (
        <form
          onSubmit={submitNew}
          className="grid max-w-2xl grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2"
        >
          <div>
            <label className={labelCls} htmlFor="pp-paciente">
              Paciente *
            </label>
            <select
              id="pp-paciente"
              required
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccionar…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="pp-titulo">
              Tratamiento *
            </label>
            <input
              id="pp-titulo"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
              placeholder="Ej. Implante pieza 11"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="pp-monto">
              Monto estimado
            </label>
            <input
              id="pp-monto"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputCls}
              placeholder="15000"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="pp-next">
              Siguiente paso
            </label>
            <input
              id="pp-next"
              value={form.next_step}
              onChange={(e) => setForm({ ...form, next_step: e.target.value })}
              className={inputCls}
              placeholder="Ej. Llamar el jueves"
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Crear
            </button>
          </div>
        </form>
      )}

      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              opps={byStage.get(stage) ?? []}
              currency={currency}
              canWrite={canWrite}
              onDelete={onDelete}
            />
          ))}
        </div>
      </DndContext>

      {canWrite && (
        <p className="text-xs text-slate-400">
          Para cotizar una oportunidad, crea el presupuesto desde{" "}
          <Link
            href="/presupuestos/new"
            className="font-medium text-[var(--primary)] hover:opacity-80"
          >
            Presupuestos →
          </Link>
        </p>
      )}
    </div>
  );
}
