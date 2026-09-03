import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import { BudgetBuilder } from "@/components/budget-builder";

export default async function NewBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const ctx = await getSessionContext();
  const canWrite = ctx?.user.role === "admin" || ctx?.user.role === "recepcion";
  const { patient } = await searchParams;

  let patients: { id: string; full_name: string }[] = [];
  let catalog: { id: string; name: string; price: number | string }[] = [];

  if (ctx) {
    const supabase = await createClient();
    const [{ data: pats }, { data: cat }] = await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("clinic_id", ctx.user.clinic_id)
        .order("full_name")
        .limit(200),
      supabase
        .from("treatments_catalog")
        .select("id, name, price")
        .eq("clinic_id", ctx.user.clinic_id)
        .order("name")
        .limit(200),
    ]);
    patients = (pats ?? []) as { id: string; full_name: string }[];
    catalog = (cat ?? []) as {
      id: string;
      name: string;
      price: number | string;
    }[];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/presupuestos"
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-white"
        >
          ← Volver
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Nuevo presupuesto
          </h1>
          <p className="text-sm text-slate-500">
            Arma la cotización con el tarifario de la clínica
          </p>
        </div>
      </div>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>.
        </p>
      ) : !canWrite ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Solo administración y recepción pueden crear presupuestos.
        </p>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-medium">Primero registra un paciente</p>
          <Link
            href="/pacientes/new"
            className="mt-3 inline-block rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Nuevo paciente
          </Link>
        </div>
      ) : (
        <BudgetBuilder
          patients={patients}
          catalog={catalog}
          currency={ctx.clinic.currency}
          defaultPatientId={patient ?? ""}
        />
      )}
    </div>
  );
}
