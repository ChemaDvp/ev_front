export default function StockPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-3xl font-semibold tracking-tight">Stock</h1>
      <section className="form-card">
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-olive">Módulo futuro</span>
        <p className="mt-4 font-medium">Control de consumibles</p>
        <p className="mt-2 text-sm text-muted">
          Aquí se podrá gestionar el inventario de botellas, cítricos, azúcar y otros consumibles.
          La tabla de stock ya está preparada en Supabase; esta pantalla permanece deshabilitada.
        </p>
      </section>
    </div>
  );
}
