"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";

async function requireStaff() {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.user.role !== "admin" && ctx.user.role !== "recepcion")) {
    throw new Error("Sin permiso.");
  }
  return ctx;
}

async function requireAdmin() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.user.role !== "admin") {
    throw new Error("Solo la administración puede cambiar estos ajustes.");
  }
  return ctx;
}

function refreshAll() {
  revalidatePath("/", "layout");
  revalidatePath("/ajustes");
  revalidatePath("/dashboard");
}

// ---------- branding (solo admin) ----------

export async function updateBranding(formData: FormData) {
  const ctx = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const primary_color = String(formData.get("primary_color") ?? "").trim();
  const logoRaw = String(formData.get("logo_url") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Mexico_City";
  const currency = String(formData.get("currency") ?? "").trim() || "MXN";

  if (name === "") throw new Error("El nombre de la clínica es obligatorio.");
  if (!/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
    throw new Error("El color debe ser hexadecimal, ej. #0ea5e9.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      name,
      primary_color,
      logo_url: logoRaw === "" ? null : logoRaw,
      timezone,
      currency,
    })
    .eq("id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo guardar la identidad.");

  refreshAll();
}

// ---------- tarifario (admin + recepción) ----------

export async function upsertTreatment(formData: FormData) {
  const ctx = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const price = Math.max(0, Number(formData.get("price")) || 0);

  if (name === "") throw new Error("El nombre del tratamiento es obligatorio.");

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase
      .from("treatments_catalog")
      .update({ name, price })
      .eq("id", id)
      .eq("clinic_id", ctx.user.clinic_id);
    if (error) throw new Error("No se pudo actualizar.");
  } else {
    const { error } = await supabase
      .from("treatments_catalog")
      .insert({ clinic_id: ctx.user.clinic_id, name, price });
    if (error) throw new Error("No se pudo agregar.");
  }
  revalidatePath("/ajustes");
  revalidatePath("/presupuestos/new");
}

export async function deleteTreatment(id: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("treatments_catalog")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo eliminar (puede estar en uso).");
  revalidatePath("/ajustes");
  revalidatePath("/presupuestos/new");
}

// ---------- recursos: doctores y sillones (admin + recepción) ----------

export async function createResource(formData: FormData) {
  const ctx = await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "doctor");
  const color = String(formData.get("color") ?? "#0ea5e9").trim();

  if (name === "") throw new Error("El nombre es obligatorio.");
  if (type !== "doctor" && type !== "sillon") {
    throw new Error("Tipo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("resources").insert({
    clinic_id: ctx.user.clinic_id,
    name,
    type,
    color,
  });
  if (error) throw new Error("No se pudo agregar el recurso.");
  revalidatePath("/ajustes");
  revalidatePath("/agenda");
}

export async function deleteResource(id: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo eliminar (puede tener citas).");
  revalidatePath("/ajustes");
  revalidatePath("/agenda");
}
