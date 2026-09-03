"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  EventClickArg,
  EventDropArg,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";

import {
  createAppointment,
  deleteAppointment,
  moveAppointment,
  updateAppointmentStatus,
} from "@/app/(app)/agenda/actions";
import {
  APPOINTMENT_STATUS,
  formatTime,
  type AppointmentStatus,
} from "@/lib/status";

export type AgendaEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  reason: string | null;
  resourceName: string | null;
  resourceId: string | null;
  medicalAlerts: string | null;
};

type Resource = { id: string; name: string; type: string };
type PatientOpt = { id: string; full_name: string };

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  por_confirmar: "#64748b",
  confirmada: "#2563eb",
  en_sala: "#f59e0b",
  atendido: "#10b981",
  cancelada: "#ef4444",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function AgendaClient({
  initialEvents,
  resources,
  patients,
  canWrite,
  rangeStart,
  rangeEnd,
}: {
  initialEvents: AgendaEvent[];
  resources: Resource[];
  patients: PatientOpt[];
  canWrite: boolean;
  rangeStart: string;
  rangeEnd: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: "",
    resource_id: "",
    date: todayInput(),
    time: "09:00",
    duration: "45",
    reason: "",
  });
  const initialRange = useRef({ start: rangeStart, end: rangeEnd });

  const events = useMemo(
    () =>
      initialEvents
        .filter((e) => filter === "all" || e.resourceId === filter)
        .map((e) => ({
          id: e.id,
          title: `${e.title}${e.medicalAlerts ? " ⚠" : ""}`,
          start: e.start,
          end: e.end,
          backgroundColor: STATUS_COLOR[e.status],
          borderColor: STATUS_COLOR[e.status],
          extendedProps: { status: e.status },
        })),
    [initialEvents, filter]
  );

  const byId = useMemo(
    () => new Map(initialEvents.map((e) => [e.id, e])),
    [initialEvents]
  );
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  function refresh() {
    startTransition(() => router.refresh());
  }

  function onDatesSet(arg: DatesSetArg) {
    const s = arg.start.toISOString();
    const e = arg.end.toISOString();
    // Solo refetch si el rango visible cambió respecto al cargado.
    if (
      Math.abs(new Date(s).getTime() - new Date(initialRange.current.start).getTime()) > 60_000 ||
      Math.abs(new Date(e).getTime() - new Date(initialRange.current.end).getTime()) > 60_000
    ) {
      router.replace(`/agenda?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`);
    }
  }

  async function onDrop(arg: EventDropArg) {
    const { event } = arg;
    if (!event.start || !event.end) return;
    setError(null);
    try {
      await moveAppointment(
        event.id,
        event.start.toISOString(),
        event.end.toISOString()
      );
      refresh();
    } catch (err) {
      arg.revert();
      setError(err instanceof Error ? err.message : "No se pudo mover la cita.");
    }
  }

  function onClick(arg: EventClickArg) {
    setSelectedId(arg.event.id);
  }

  async function changeStatus(status: AppointmentStatus) {
    if (!selected) return;
    setError(null);
    try {
      await updateAppointmentStatus(selected.id, status);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  async function removeSelected() {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar la cita de ${selected.title}?`)) return;
    try {
      await deleteAppointment(selected.id);
      setSelectedId(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    }
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const start = new Date(`${form.date}T${form.time}:00`);
      const end = new Date(start.getTime() + Number(form.duration) * 60_000);
      await createAppointment({
        patient_id: form.patient_id,
        resource_id: form.resource_id || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        reason: form.reason.trim() || null,
      });
      setShowNew(false);
      setForm({ ...form, patient_id: "", reason: "" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            aria-label="Filtrar por doctor o sillón"
          >
            <option value="all">Todos</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {canWrite && (
            <button
              onClick={() => setShowNew((v) => !v)}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Agendar cita
            </button>
          )}
          {pending && (
            <span className="text-xs text-slate-400">Actualizando…</span>
          )}
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        {showNew && canWrite && (
          <form
            onSubmit={submitNew}
            className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ag-paciente">
                Paciente *
              </label>
              <select
                id="ag-paciente"
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
              <label className={labelCls} htmlFor="ag-recurso">
                Doctor / Sillón
              </label>
              <select
                id="ag-recurso"
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Sin asignar</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="ag-motivo">
                Motivo
              </label>
              <input
                id="ag-motivo"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={inputCls}
                placeholder="Ej. Limpieza"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ag-fecha">
                Fecha
              </label>
              <input
                id="ag-fecha"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="ag-hora">
                  Hora
                </label>
                <input
                  id="ag-hora"
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ag-dur">
                  Minutos
                </label>
                <input
                  id="ag-dur"
                  type="number"
                  min={15}
                  step={15}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Guardar cita
              </button>
            </div>
          </form>
        )}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek",
          }}
          buttonText={{ today: "Hoy", day: "Día", week: "Semana" }}
          locale={esLocale}
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          editable={canWrite}
          eventDrop={onDrop}
          eventClick={onClick}
          datesSet={onDatesSet}
          events={events}
          height="auto"
        />

        <div className="mt-3 flex flex-wrap gap-3">
          {(
            Object.entries(APPOINTMENT_STATUS) as Array<
              [AppointmentStatus, { label: string }]
            >
          ).map(([key, s]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[key] }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold">Detalle de cita</h2>
        {!selected ? (
          <p className="mt-2 text-sm text-slate-500">
            Haz clic en una cita del calendario para verla aquí: alertas
            médicas, motivo y cambio de estado.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-lg font-semibold">{selected.title}</p>
              <p className="text-sm text-slate-500">
                {formatTime(selected.start)}
                {" — "}
                {formatTime(selected.end)}
                {selected.resourceName ? ` · ${selected.resourceName}` : ""}
              </p>
              {selected.reason && (
                <p className="mt-1 text-sm text-slate-600">{selected.reason}</p>
              )}
              {selected.medicalAlerts && (
                <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200">
                  Alerta médica: {selected.medicalAlerts}
                </p>
              )}
            </div>

            {canWrite && (
              <>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Cambiar estado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      Object.entries(APPOINTMENT_STATUS) as Array<
                        [AppointmentStatus, { label: string; pill: string }]
                      >
                    ).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => changeStatus(key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                          selected.status === key
                            ? s.pill
                            : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    onClick={removeSelected}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-sm font-medium text-slate-400 hover:text-slate-600"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
