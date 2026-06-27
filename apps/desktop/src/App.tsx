import { useMemo, useState } from "react";

type SectionId =
  | "dashboard"
  | "products"
  | "purchases"
  | "sales"
  | "customers"
  | "suppliers"
  | "receivables"
  | "reports";

type SectionConfig = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
  primaryAction: string;
  emptyTitle: string;
  emptyBody: string;
};

const navigationItems: SectionConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Resumen operativo",
    description: "Vista general del negocio",
    primaryAction: "Nueva venta",
    emptyTitle: "Sin movimientos registrados",
    emptyBody: "Las compras, ventas y pagos apareceran aqui."
  },
  {
    id: "products",
    label: "Productos",
    title: "Productos",
    description: "Catalogo de productos",
    primaryAction: "Nuevo producto",
    emptyTitle: "Sin productos registrados",
    emptyBody: "Crea productos para empezar a controlar inventario."
  },
  {
    id: "purchases",
    label: "Compras",
    title: "Compras",
    description: "Entradas de inventario",
    primaryAction: "Nueva compra",
    emptyTitle: "Sin compras registradas",
    emptyBody: "Las compras confirmadas aumentaran el inventario."
  },
  {
    id: "sales",
    label: "Ventas",
    title: "Ventas",
    description: "Salidas de inventario y pagos",
    primaryAction: "Nueva venta",
    emptyTitle: "Sin ventas registradas",
    emptyBody: "Registra ventas para actualizar inventario y cartera."
  },
  {
    id: "customers",
    label: "Clientes",
    title: "Clientes",
    description: "Contactos y saldos de clientes",
    primaryAction: "Nuevo cliente",
    emptyTitle: "Sin clientes registrados",
    emptyBody: "Los clientes quedaran disponibles para ventas y cartera."
  },
  {
    id: "suppliers",
    label: "Proveedores",
    title: "Proveedores",
    description: "Contactos de compra",
    primaryAction: "Nuevo proveedor",
    emptyTitle: "Sin proveedores registrados",
    emptyBody: "Agrega proveedores para asociarlos a tus compras."
  },
  {
    id: "receivables",
    label: "Cartera",
    title: "Cartera",
    description: "Cuentas por cobrar",
    primaryAction: "Registrar abono",
    emptyTitle: "Sin cartera pendiente",
    emptyBody: "Las ventas pendientes de pago apareceran aqui."
  },
  {
    id: "reports",
    label: "Reportes",
    title: "Reportes",
    description: "Resumenes y actividad",
    primaryAction: "Exportar",
    emptyTitle: "Sin reportes disponibles",
    emptyBody: "Los reportes se activaran cuando existan movimientos."
  }
];

const metrics = [
  { label: "Productos activos", value: "0" },
  { label: "Ventas de hoy", value: "$0" },
  { label: "Cartera pendiente", value: "$0" },
  { label: "Alertas de inventario", value: "0" }
];

export function App() {
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("dashboard");
  const activeSection: SectionConfig = useMemo(
    () =>
      navigationItems.find((item) => item.id === activeSectionId) ??
      navigationItems[0]!,
    [activeSectionId]
  );

  function openSection(sectionId: SectionId) {
    setActiveSectionId(sectionId);
  }

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
            <button
              aria-current={item.id === activeSectionId ? "page" : undefined}
              className={item.id === activeSectionId ? "active" : ""}
              key={item.id}
              onClick={() => openSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{activeSection.label}</p>
            <h1>{activeSection.title}</h1>
            <span>{activeSection.description}</span>
          </div>
          <button
            className="primary-action"
            onClick={() =>
              activeSection.id === "dashboard"
                ? openSection("sales")
                : openSection(activeSection.id)
            }
          >
            {activeSection.primaryAction}
          </button>
        </header>

        {activeSection.id === "dashboard" ? (
          <DashboardContent
            onOpenProducts={() => openSection("products")}
            onOpenReports={() => openSection("reports")}
          />
        ) : (
          <SectionContent section={activeSection} />
        )}
      </section>
    </main>
  );
}

type DashboardContentProps = {
  onOpenProducts: () => void;
  onOpenReports: () => void;
};

function DashboardContent({
  onOpenProducts,
  onOpenReports
}: DashboardContentProps) {
  return (
    <>
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
            <button onClick={onOpenReports}>Ver todo</button>
          </div>
          <div className="empty-state">
            <strong>Sin movimientos registrados</strong>
            <span>Las compras, ventas y pagos apareceran aqui.</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Inventario bajo</h2>
            <button onClick={onOpenProducts}>Revisar</button>
          </div>
          <div className="empty-state">
            <strong>Sin alertas</strong>
            <span>Los productos bajo el minimo se mostraran aqui.</span>
          </div>
        </div>
      </section>
    </>
  );
}

type SectionContentProps = {
  section: SectionConfig;
};

function SectionContent({ section }: SectionContentProps) {
  return (
    <section className="section-panel">
      <div className="empty-state section-empty">
        <strong>{section.emptyTitle}</strong>
        <span>{section.emptyBody}</span>
      </div>
    </section>
  );
}
