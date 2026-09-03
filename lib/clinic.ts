import { createClient } from "@/lib/supabase/server";

export type ClinicBrand = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  currency: string;
  timezone: string;
};

export type SessionUser = {
  id: string;
  role: "admin" | "recepcion" | "doctor";
  full_name: string | null;
  clinic_id: string;
};

export const DEFAULT_BRAND: ClinicBrand = {
  id: "",
  name: "CRM Dental",
  logo_url: null,
  primary_color: "#0ea5e9",
  currency: "MXN",
  timezone: "America/Mexico_City",
};

type ProfileRow = {
  id: string;
  role: SessionUser["role"];
  full_name: string | null;
  clinic_id: string;
};

type ClinicRow = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  currency: string;
  timezone: string;
};

/** Lee usuario + clínica actual. Devuelve null si no hay sesión o falta config. */
export async function getSessionContext(): Promise<{
  user: SessionUser;
  clinic: ClinicBrand;
} | null> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name, clinic_id")
      .eq("id", user.id)
      .single<ProfileRow>();
    if (!profile) return null;

    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, name, logo_url, primary_color, currency, timezone")
      .eq("id", profile.clinic_id)
      .single<ClinicRow>();
    if (!clinic) return null;

    return {
      user: {
        id: profile.id,
        role: profile.role,
        full_name: profile.full_name,
        clinic_id: profile.clinic_id,
      },
      clinic: {
        id: clinic.id,
        name: clinic.name,
        logo_url: clinic.logo_url,
        primary_color: clinic.primary_color || DEFAULT_BRAND.primary_color,
        currency: clinic.currency,
        timezone: clinic.timezone,
      },
    };
  } catch {
    return null;
  }
}
