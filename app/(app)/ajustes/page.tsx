import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import { formatMoney } from "@/lib/status";
import {
  createResource,
  deleteResource,
  deleteTreatment,
  updateBranding,
  upsertTreatment,
} from "@/app/(app)/ajustes/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";
const cardCls = "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200";

const CURRENCIES = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN", "GTQ"];

export default async function AjustesPage() {
  const ctx = await getSessionContext();
  const isAdmin = ctx?.user.role === "admin";
  const canWrite = isAdmin || ctx?.user.role === "recepcion";

  let catalog: { id: string; name: string; price: number | string }[] = [];
  let resources: { id: string; name: string; type: string; color: string }[] = [];

  if (ctx) {
    const supabase = await createClient();
    const [{ data: cat }, { data: res }] = await Promise.all([
      supabase
        .from("treatments_catalog")
        .select("id, name, price")
        .eq("clinic_id", ctx.user.clinic_id)
        .order("name")
        .limit(200),
      supabase
        .from("resources")
        .select("id, name, type, color")
        .eq("clinic_id", ctx.user.clinic_id)
        .order("name")
        .limit(100),
    ]);
    catalog = (cat ?? []) as {
      id: string;
      name: string;
      price: number | string;
    }[];
    resources = (res ?? []) as {
      id: string;
      name: string;
      type: string;
      color: string;
    }[];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Identidad de la clínica, tarifario y recursos de agenda
        </p>
      </div>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>.
        </p>
      ) : (
        <>
          {/* Identidad */}
          <section className={cardCls}>
            <h2 className="font-semibold">Identidad de la clínica</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isAdmin
                ? "Se aplica al instante en toda la app (logo, nombre y color)."
                : "Solo la administración puede editar la identidad."}
            </p>
            <form action={updateBranding} className="mt-4 space-y-3">
              <div>
                <label className={labelCls} htmlFor="aj-name">
                  Nombre *
                </label>
                <input
                  id="aj-name"
                  name="name"
                  required
                  disabled={!isAdmin}
                  defaultValue={ctx.clinic.name}
                  className={`${inputCls} max-w-md disabled:opacity-60`}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="aj-color">
                    Color primario
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="aj-color"
                      name="primary_color"
                      type="color"
                      disabled={!isAdmin}
                      defaultValue={ctx.clinic.primary_color}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 disabled:opacity-60"
                    />
                    <span className="font-mono text-sm text-slate-500">
                      {ctx.clinic.primary_color}
                    </span>
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="aj-currency">
                    Moneda
                  </label>
                  <select
                    id="aj-currency"
                    name="currency"
                    disabled={!isAdmin}
                    defaultValue={ctx.clinic.currency}
                    className={`${inputCls} disabled:opacity-60`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="aj-logo">
                  URL del logo
                </label>
                <input
                  id="aj-logo"
                  name="logo_url"
                  type="url"
                  disabled={!isAdmin}
                  defaultValue={ctx.clinic.logo_url ?? ""}
                  placeholder="https://… (opcional, se sube a Storage)"
                  className={`${inputCls} disabled:opacity-60`}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="aj-tz">
                  Zona horaria
                </label>
                <input
                  id="aj-tz"
                  name="timezone"
                  disabled={!isAdmin}
                  defaultValue={ctx.clinic.timezone}
                  className={`${inputCls} max-w-md disabled:opacity-60`}
                />
              </div>
              {isAdmin && (
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Guardar identidad
                </button>
              )}
            </form>
          </section>

          {/* Tarifario */}
          <section className={cardCls}>
            <h2 className="font-semibold">Tarifario</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Aparece como sugerencias al crear presupuestos.
            </p>
            <ul className="mt-4 divide-y divide-slate-100">
              {catalog.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  {canWrite ? (
                    <form
                      action={upsertTreatment}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        name="name"
                        defaultValue={t.name}
                        className="flex-1 rounded-lg border border-transparent px-2 py-1 font-medium outline-none focus:border-[var(--primary)]"
                        aria-label="Nombre"
                      />
                      <input
                        name="price"
                        type="number"
                        min={0}
                        defaultValue={Number(t.price)}
                        className="w-28 rounded-lg border border-transparent px-2 py-1 text-right tabular-nums outline-none focus:border-[var(--primary)]"
                        aria-label="Precio"
                      />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-slate-50"
                      >
                        Guardar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{t.name}</span>
                      <span className="tabular-nums text-slate-600">
                        {formatMoney(Number(t.price), ctx.clinic.currency)}
                      </span>
                    </>
                  )}
                  {canWrite && (
                    <form action={deleteTreatment.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </form>
                  )}
                </li>
              ))}
              {catalog.length === 0 && (
                <li className="py-2 text-sm text-slate-400">
                  Vacío: agrega el primer tratamiento abajo.
                </li>
              )}
            </ul>
            {canWrite && (
              <form action={upsertTreatment} className="mt-3 flex gap-2">
                <input
                  name="name"
                  required
                  placeholder="Nuevo tratamiento"
                  className={inputCls}
                />
                <input
                  name="price"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className={`${inputCls} w-32`}
                  aria-label="Precio"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Agregar
                </button>
              </form>
            )}
          </section>

          {/* Recursos */}
          <section className={cardCls}>
            <h2 className="font-semibold">Doctores y sillones</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Columnas y filtros disponibles en la agenda.
            </p>
            <ul className="mt-4 divide-y divide-slate-100">
              {resources.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-xs text-slate-400">
                    {r.type === "doctor" ? "Doctor" : "Sillón"}
                  </span>
                  {canWrite && (
                    <form action={deleteResource.bind(null, r.id)}>
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </form>
                  )}
                </li>
              ))}
              {resources.length === 0 && (
                <li className="py-2 text-sm text-slate-400">
                  Sin recursos: la agenda necesita al menos uno.
                </li>
              )}
            </ul>
            {canWrite && (
              <form
                action={createResource}
                className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_130px_60px_auto]"
              >
                <input
                  name="name"
                  required
                  placeholder="Ej. Dra. Ana / Sillón 3"
                  className={inputCls}
                />
                <select name="type" className={inputCls} defaultValue="doctor">
                  <option value="doctor">Doctor</option>
                  <option value="sillon">Sillón</option>
                </select>
                <input
                  name="color"
                  type="color"
                  defaultValue="#0ea5e9"
                  className="h-10 w-full cursor-pointer rounded-lg border border-slate-300"
                  aria-label="Color"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Agregar
                </button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
