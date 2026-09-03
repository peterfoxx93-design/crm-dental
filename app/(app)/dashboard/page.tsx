const CARDS = [
  { label: "Citas hoy", value: "—", hint: "Se conecta en F2" },
  { label: "En sala de espera", value: "—", hint: "Se conecta en F2" },
  { label: "Presupuestos pendientes", value: "—", hint: "Se conecta en F2" },
  { label: "Leads nuevos", value: "—", hint: "Se conecta en F2" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen operativo del día de la clínica
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold">Agenda del día</h2>
        <p className="mt-1 text-sm text-slate-500">
          El widget de próximas citas se conecta en F2 (Pacientes + Dashboard).
        </p>
      </div>
    </div>
  );
}
