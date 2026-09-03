"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";

async function requireStaff() {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.user.role !== "admin" && ctx.user.role !== "recepcion")) {
    throw new Error("Sin permiso: solo administración y recepción.");
  }
  return ctx;
}

function formToPatient(formData: FormData) {
  const text = (key: string) => {
    const v = formData.get(key);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };
  return {
    full_name: text("full_name") ?? "",
    phone: text("phone"),
    email: text("email"),
    birthdate: text("birthdate"),
    medical_alerts: text("medical_alerts"),
    notes: text("notes"),
  };
}

export async function createPatient(formData: FormData) {
  const ctx = await requireStaff();
  const data = formToPatient(formData);
  if (!data.full_name) throw new Error("El nombre es obligatorio.");

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("patients")
    .insert({ ...data, clinic_id: ctx.user.clinic_id })
    .select("id")
    .single();
  if (error || !created) throw new Error("No se pudo crear el paciente.");

  revalidatePath("/pacientes");
  redirect(`/pacientes/${created.id}`);
}

export async function updatePatient(id: string, formData: FormData) {
  const ctx = await requireStaff();
  const data = formToPatient(formData);
  if (!data.full_name) throw new Error("El nombre es obligatorio.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update(data)
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo actualizar el paciente.");

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
}

export async function deletePatient(id: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo eliminar el paciente.");

  revalidatePath("/pacientes");
  redirect("/pacientes");
}
