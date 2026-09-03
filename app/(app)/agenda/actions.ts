"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";
import type { AppointmentStatus } from "@/lib/status";

const STATUSES: AppointmentStatus[] = [
  "por_confirmar",
  "confirmada",
  "en_sala",
  "atendido",
  "cancelada",
];

async function requireStaff() {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.user.role !== "admin" && ctx.user.role !== "recepcion")) {
    throw new Error("Sin permiso: solo administración y recepción.");
  }
  return ctx;
}

export async function createAppointment(input: {
  patient_id: string;
  resource_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}) {
  const ctx = await requireStaff();
  if (!input.patient_id) throw new Error("El paciente es obligatorio.");
  if (new Date(input.ends_at) <= new Date(input.starts_at)) {
    throw new Error("La hora de fin debe ser posterior al inicio.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    clinic_id: ctx.user.clinic_id,
    patient_id: input.patient_id,
    resource_id: input.resource_id,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    reason: input.reason,
    status: "por_confirmar",
  });
  if (error) throw new Error("No se pudo crear la cita.");

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function moveAppointment(
  id: string,
  starts_at: string,
  ends_at: string
) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ starts_at, ends_at })
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo mover la cita.");

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
) {
  const ctx = await requireStaff();
  if (!STATUSES.includes(status)) throw new Error("Estado inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo actualizar el estado.");

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function deleteAppointment(id: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo eliminar la cita.");

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
