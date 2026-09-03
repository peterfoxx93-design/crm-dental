export type AppointmentStatus =
  | "por_confirmar"
  | "confirmada"
  | "en_sala"
  | "atendido"
  | "cancelada";

export const APPOINTMENT_STATUS: Record<
  AppointmentStatus,
  { label: string; pill: string; dot: string }
> = {
  por_confirmar: {
    label: "Por confirmar",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  confirmada: {
    label: "Confirmada",
    pill: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  en_sala: {
    label: "En sala",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  atendido: {
    label: "Atendido",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    pill: "bg-red-50 text-red-600 ring-red-200",
    dot: "bg-red-400",
  },
};

export type OpportunityStage =
  | "nuevo"
  | "contactado"
  | "valoracion"
  | "presupuesto"
  | "aceptado"
  | "perdido";

export const OPPORTUNITY_STAGE: Record<OpportunityStage, { label: string }> = {
  nuevo: { label: "Nuevo lead" },
  contactado: { label: "Contactado" },
  valoracion: { label: "Valoración" },
  presupuesto: { label: "Presupuesto entregado" },
  aceptado: { label: "Aceptado" },
  perdido: { label: "Perdido" },
};

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatMoney(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
