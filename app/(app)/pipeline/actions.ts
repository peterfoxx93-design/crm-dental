"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import type { OpportunityStage } from "@/lib/status";

const STAGES: OpportunityStage[] = [
  "nuevo",
  "contactado",
  "valoracion",
  "presupuesto",
  "aceptado",
  "perdido",
];

async function requireStaff() {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.user.role !== "admin" && ctx.user.role !== "recepcion")) {
    throw new Error("Sin permiso: solo administración y recepción.");
  }
  return ctx;
}

export async function createOpportunity(input: {
  patient_id: string;
  title: string;
  amount: number;
  stage: OpportunityStage;
  next_step: string | null;
}) {
  const ctx = await requireStaff();
  if (!input.patient_id) throw new Error("El paciente es obligatorio.");
  if (!input.title.trim()) throw new Error("El título es obligatorio.");
  if (!STAGES.includes(input.stage)) throw new Error("Etapa inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").insert({
    clinic_id: ctx.user.clinic_id,
    patient_id: input.patient_id,
    title: input.title.trim(),
    amount: Number.isFinite(input.amount) && input.amount >= 0 ? input.amount : 0,
    stage: input.stage,
    next_step: input.next_step,
  });
  if (error) throw new Error("No se pudo crear la oportunidad.");

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function moveOpportunity(id: string, stage: OpportunityStage) {
  const ctx = await requireStaff();
  if (!STAGES.includes(stage)) throw new Error("Etapa inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("opportunities")
    .update({ stage })
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo mover la oportunidad.");

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteOpportunity(id: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo eliminar la oportunidad.");

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}
