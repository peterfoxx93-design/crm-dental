import type { CSSProperties } from "react";
import { DEFAULT_BRAND, getSessionContext } from "@/lib/clinic";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administración",
  recepcion: "Recepción",
  doctor: "Doctor",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  const clinic = ctx?.clinic ?? DEFAULT_BRAND;
  const user = ctx?.user ?? null;

  return (
    <div
      className="flex min-h-full flex-1"
      style={{ "--primary": clinic.primary_color } as CSSProperties}
    >
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-5">
          {clinic.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.logo_url}
              alt={clinic.name}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-base font-bold text-white">
              {clinic.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{clinic.name}</p>
            <p className="text-xs text-slate-500">CRM Dental</p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          <AppNav />
        </div>

        <div className="border-t border-slate-100 px-3 py-3">
          {user && (
            <div className="mb-1 px-3 py-1">
              <p className="truncate text-sm font-medium">
                {user.full_name || "Usuario"}
              </p>
              <p className="text-xs text-slate-500">
                {ROLE_LABEL[user.role] ?? user.role}
              </p>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-6 lg:px-10">{children}</main>
    </div>
  );
}
