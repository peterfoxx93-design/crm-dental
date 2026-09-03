import Link from "next/link";
import { createPatient } from "@/app/(app)/pacientes/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

export default function NewPacientePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/pacientes"
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Pacientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Nuevo paciente
        </h1>
      </div>

      <form
        action={createPatient}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <div>
          <label htmlFor="full_name" className={labelCls}>
            Nombre completo *
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className={inputCls}
            placeholder="Ej. Ana Beltrán"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className={labelCls}>
              Teléfono / WhatsApp
            </label>
            <input
              id="phone"
              name="phone"
              className={inputCls}
              placeholder="+52 55 1234 0000"
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
              className={inputCls}
              placeholder="paciente@correo.mx"
            />
          </div>
        </div>
        <div>
          <label htmlFor="birthdate" className={labelCls}>
            Fecha de nacimiento
          </label>
          <input
            id="birthdate"
            name="birthdate"
            type="date"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="medical_alerts" className={labelCls}>
            Alertas médicas (visibles en agenda y ficha)
          </label>
          <input
            id="medical_alerts"
            name="medical_alerts"
            className={inputCls}
            placeholder="Ej. Alergia a la penicilina"
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
            className={inputCls}
            placeholder="Preferencias, origen del lead, etc."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/pacientes"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Guardar paciente
          </button>
        </div>
      </form>
    </div>
  );
}
