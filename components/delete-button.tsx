"use client";

import { useState } from "react";

export function DeleteButton({
  action,
  label = "Eliminar",
}: {
  action: (formData: FormData) => void;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <span className="text-sm text-slate-500">¿Confirmar?</span>
      <button
        type="submit"
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        Sí, eliminar
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        Cancelar
      </button>
    </form>
  );
}
