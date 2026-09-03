import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import {
  PipelineClient,
  type Opportunity,
} from "@/components/pipeline-client";
import type { OpportunityStage } from "@/lib/status";

export default async function PipelinePage() {
  const ctx = await getSessionContext();
  const canWrite = ctx?.user.role === "admin" || ctx?.user.role === "recepcion";

  let opportunities: Opportunity[] = [];
  let patients: { id: string; full_name: string }[] = [];

  if (ctx) {
    const supabase = await createClient();
    const { data: opps } = await supabase
      .from("opportunities")
      .select("id, title, amount, stage, next_step, patients(full_name)")
      .eq("clinic_id", ctx.user.clinic_id)
      .order("created_at", { ascending: false })
      .limit(200);

    opportunities = ((opps ?? []) as unknown as Array<{
      id: string;
      title: string;
      amount: number | string;
      stage: OpportunityStage;
      next_step: string | null;
      patients: { full_name: string } | null;
    }>).map((o) => ({
      id: o.id,
      title: o.title,
      amount: Number(o.amount),
      stage: o.stage,
      next_step: o.next_step,
      patient_name: Array.isArray(o.patients)
        ? o.patients[0]?.full_name ?? "Paciente"
        : o.patients?.full_name ?? "Paciente",
    }));

    const { data: pats } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("clinic_id", ctx.user.clinic_id)
      .order("full_name")
      .limit(200);
    patients = (pats ?? []) as { id: string; full_name: string }[];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="mt-1 text-sm text-slate-500">
          Arrastra las tarjetas entre etapas para dar seguimiento a cada
          tratamiento
        </p>
      </div>

      {!ctx ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
          Configura Supabase en <code className="font-mono">.env.local</code>{" "}
          para ver el pipeline.
        </p>
      ) : (
        <PipelineClient
          initialOpportunities={opportunities}
          patients={patients}
          canWrite={canWrite}
          currency={ctx.clinic.currency}
        />
      )}
    </div>
  );
}
