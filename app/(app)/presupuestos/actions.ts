"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/clinic";

export type BudgetStatus = "borrador" | "entregado" | "aceptado" | "rechazado";

const BUDGET_STATUSES: BudgetStatus[] = [
  "borrador",
  "entregado",
  "aceptado",
  "rechazado",
];

export type BudgetItemInput = {
  treatment_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
};

async function requireStaff() {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.user.role !== "admin" && ctx.user.role !== "recepcion")) {
    throw new Error("Sin permiso: solo administración y recepción.");
  }
  return ctx;
}

function parseItems(raw: FormDataEntryValue | null): BudgetItemInput[] {
  if (typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw) as Array<{
      treatment_id?: string | null;
      name?: string;
      qty?: number;
      unit_price?: number;
    }>;
    return arr
      .filter((i) => i && typeof i.name === "string" && i.name.trim() !== "")
      .map((i) => ({
        treatment_id: i.treatment_id || null,
        name: i.name!.trim(),
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        unit_price: Math.max(0, Number(i.unit_price) || 0),
      }));
  } catch {
    return [];
  }
}

export async function createBudget(formData: FormData) {
  const ctx = await requireStaff();
  const patient_id = String(formData.get("patient_id") ?? "");
  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim() !== ""
      ? notesRaw.trim()
      : null;
  const items = parseItems(formData.get("items"));

  if (!patient_id) throw new Error("El paciente es obligatorio.");
  if (items.length === 0) throw new Error("Agrega al menos un tratamiento.");

  const supabase = await createClient();
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .insert({
      clinic_id: ctx.user.clinic_id,
      patient_id,
      status: "borrador",
      notes,
    })
    .select("id")
    .single();
  if (budgetError || !budget) throw new Error("No se pudo crear el presupuesto.");

  const { error: itemsError } = await supabase.from("budget_items").insert(
    items.map((i) => ({
      budget_id: (budget as { id: string }).id,
      treatment_id: i.treatment_id,
      name: i.name,
      qty: i.qty,
      unit_price: i.unit_price,
    }))
  );
  if (itemsError) throw new Error("Se creó el presupuesto pero fallaron los ítems.");

  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  redirect(`/presupuestos/${(budget as { id: string }).id}`);
}

export async function updateBudgetStatus(id: string, status: BudgetStatus) {
  const ctx = await requireStaff();
  if (!BUDGET_STATUSES.includes(status)) throw new Error("Estado inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ status })
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo actualizar el estado.");

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${id}`);
  revalidatePath("/dashboard");
}

export async function addBudgetItem(budget_id: string, formData: FormData) {
  const ctx = await requireStaff();
  const catalogRaw = formData.get("catalog");
  const qty = Math.max(1, Math.floor(Number(formData.get("qty")) || 1));
  const customRaw = String(formData.get("custom") ?? "").trim();

  let item: BudgetItemInput | null = null;
  if (typeof catalogRaw === "string" && catalogRaw !== "") {
    try {
      const c = JSON.parse(catalogRaw) as {
        treatment_id?: string | null;
        name?: string;
        unit_price?: number;
      };
      if (c.name) {
        item = {
          treatment_id: c.treatment_id ?? null,
          name: c.name,
          qty,
          unit_price: Math.max(0, Number(c.unit_price) || 0),
        };
      }
    } catch {
      item = null;
    }
  } else if (customRaw !== "") {
    // Formato libre: "Nombre, precio"
    const parts = customRaw.split(",");
    const last = parts.length > 1 ? parts.pop()!.trim() : "";
    const price = Number(last);
    item = {
      treatment_id: null,
      name: (Number.isFinite(price) && parts.length > 0 ? parts.join(",") : customRaw).trim(),
      qty,
      unit_price: Number.isFinite(price) && parts.length > 0 ? Math.max(0, price) : 0,
    };
  }
  if (!item || !item.name) {
    throw new Error("Elige un tratamiento del tarifario o escribe uno libre.");
  }

  const supabase = await createClient();
  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("id", budget_id)
    .eq("clinic_id", ctx.user.clinic_id)
    .single();
  if (!budget) throw new Error("Presupuesto no encontrado.");

  const { error } = await supabase.from("budget_items").insert({
    budget_id,
    treatment_id: item.treatment_id,
    name: item.name,
    qty: item.qty,
    unit_price: item.unit_price,
  });
  if (error) throw new Error("No se pudo agregar el ítem.");

  revalidatePath(`/presupuestos/${budget_id}`);
}

export async function removeBudgetItem(budget_id: string, item_id: string) {
  await requireStaff();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("budget_items")
    .select("id, budgets!inner(clinic_id)")
    .eq("id", item_id)
    .single();
  if (!item) throw new Error("Ítem no encontrado.");

  const { error } = await supabase
    .from("budget_items")
    .delete()
    .eq("id", item_id);
  if (error) throw new Error("No se pudo quitar el ítem.");

  revalidatePath(`/presupuestos/${budget_id}`);
}

export async function deleteBudget(id: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudo eliminar el presupuesto.");

  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  redirect("/presupuestos");
}

export async function updateBudgetNotes(id: string, formData: FormData) {
  const ctx = await requireStaff();
  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" && notesRaw.trim() !== ""
      ? notesRaw.trim()
      : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ notes })
    .eq("id", id)
    .eq("clinic_id", ctx.user.clinic_id);
  if (error) throw new Error("No se pudieron guardar las notas.");

  revalidatePath(`/presupuestos/${id}`);
}
