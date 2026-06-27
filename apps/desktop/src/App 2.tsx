const navigationItems = [
  "Dashboard",
  "Productos",
  "Compras",
  "Ventas",
  "Clientes",
  "Proveedores",
  "Cartera",
  "Reportes"
];

const metrics = [
  { label: "Productos activos", value: "0" },
  { label: "Ventas de hoy", value: "$0" },
  { label: "Cartera pendiente", value: "$0" },
  { label: "Alertas de inventario", value: "0" }
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>Moneta</strong>
            <small>Inventario y cartera</small>
          </div>
        </div>

        <nav className="navigation" aria-label="Principal">
          {navigationItems.map((item) => (
            <button className={item === "Dashboard" ? "active" : ""} key={item}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Dashboard</p>
            <h1>Resumen operativo</h1>
          </div>
          <button className="primary-action">Nueva venta</button>
        </header>

        <section className="metric-grid" aria-label="Indicadores">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Actividad reciente</h2>
              <button>Ver todo</button>
            </div>
            <div className="empty-state">
              <strong>Sin movimientos registrados</strong>
              <span>Las compras, ventas y pagos apareceran aqui.</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Inventario bajo</h2>
              <button>Revisar</button>
            </div>
            <div className="empty-state">
              <strong>Sin alertas</strong>
              <span>Los productos bajo el minimo se mostraran aqui.</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
