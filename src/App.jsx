import React, { useState } from "react";
import { initialMenu } from "./data/menu";
import { useSupabaseData } from "./hooks/useSupabaseData";
import { isConfigured } from "./lib/supabase";
import CustomerView   from "./components/CustomerView";
import POSView        from "./components/POSView";
import InventoryView  from "./components/InventoryView";
import ReportsView    from "./components/ReportsView";
import EgresosView    from "./components/EgresosView";
import ComprasView    from "./components/ComprasView";

const TABS = [
  { id: "sales",     label: "Ventas",     icon: "🧾", adminOnly: false },
  { id: "inventory", label: "Inventario", icon: "📦", adminOnly: true  },
  { id: "egresos",   label: "Egresos",    icon: "💸", adminOnly: true  },
  { id: "compras",   label: "Compras",    icon: "🛒", adminOnly: true  },
  { id: "reports",   label: "Reportes",   icon: "📊", adminOnly: true  },
];

export default function App() {
  const [menu,    setMenu,    menuLoading]    = useSupabaseData("menu_items", "carbon_cheddar_menu_v1",    initialMenu, { orderBy: "category" });
  const [orders,  setOrders,  ordersLoading]  = useSupabaseData("orders",     "carbon_cheddar_orders_v1",  [],          { orderBy: "timestamp" });
  const [egresos, setEgresos, egresosLoading] = useSupabaseData("egresos",    "carbon_cheddar_egresos_v1", [],          { orderBy: "timestamp" });
  const [compras, setCompras, comprasLoading] = useSupabaseData("compras",    "carbon_cheddar_compras_v1", [],          { orderBy: "timestamp" });

  const isLoading = isConfigured && (menuLoading || ordersLoading || egresosLoading || comprasLoading);

  const [viewMode,  setViewMode]  = useState("staff");   // 'staff' | 'customer'
  const [staffRole, setStaffRole] = useState("cajero");  // 'cajero' | 'admin'
  const [staffTab,  setStaffTab]  = useState("sales");

  // Modal de PIN
  const [isPinOpen,  setIsPinOpen]  = useState(false);
  const [pinInput,   setPinInput]   = useState("");
  const [pinError,   setPinError]   = useState("");

  const handleRoleChange = (e) => {
    if (e.target.value === "admin") {
      setPinInput(""); setPinError("");
      setIsPinOpen(true);
    } else {
      setStaffRole("cajero");
      setStaffTab("sales");
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setStaffRole("admin");
      setIsPinOpen(false);
      setPinInput("");
    } else {
      setPinError("PIN incorrecto. (Simulación: 1234)");
    }
  };

  const visibleTabs = TABS.filter(t => !t.adminOnly || staffRole === "admin");

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-content">
          <div className="app-loading-logo">🍔</div>
          <h2>Carbon &amp; Cheddar</h2>
          <p>Cargando datos desde la nube…</p>
          <div className="app-loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Banner vista cliente */}
      {viewMode === "customer" && (
        <div className="simulation-banner fallback-print-hide">
          <span>🌐 Vista del Cliente — Pedido online para retirar en Lota</span>
          <button className="btn btn-secondary btn-xs" onClick={() => setViewMode("staff")}>
            💻 Volver al POS del Personal
          </button>
        </div>
      )}

      {viewMode === "customer" && (
        <CustomerView menu={menu} setMenu={setMenu} orders={orders} setOrders={setOrders} />
      )}

      {viewMode === "staff" && (
        <>
          {/* Navbar */}
          <nav className="staff-navbar fallback-print-hide">
            <div className="nav-brand">
              <span className="nav-logo">🍔</span>
              <div>
                <h1>Carbon &amp; Cheddar POS</h1>
                <span
                  className="role-badge"
                  style={{
                    backgroundColor: staffRole === "admin" ? "rgba(0,230,118,0.2)" : "rgba(255,145,0,0.2)",
                    color:           staffRole === "admin" ? "#00e676" : "#ff9100",
                  }}
                >
                  {staffRole === "admin" ? "⚙️ Administrador" : "🧾 Cajero"}
                </span>
              </div>
            </div>

            <div className="nav-tabs">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`nav-tab-btn ${staffTab === tab.id ? "active" : ""}`}
                  onClick={() => setStaffTab(tab.id)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="nav-actions">
              <div className="role-selector-wrapper">
                <label htmlFor="staff-role-select">Modo:</label>
                <select
                  id="staff-role-select"
                  value={staffRole}
                  onChange={handleRoleChange}
                  className="select-role"
                >
                  <option value="cajero">Cajero</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setViewMode("customer")}>
                🌐 Ver Menú Cliente
              </button>
            </div>
          </nav>

          {/* Vistas principales */}
          {staffTab === "sales" && (
            <POSView
              menu={menu} setMenu={setMenu}
              orders={orders} setOrders={setOrders}
              currentUserRole={staffRole}
            />
          )}
          {staffTab === "inventory" && staffRole === "admin" && (
            <InventoryView menu={menu} setMenu={setMenu} />
          )}
          {staffTab === "egresos" && staffRole === "admin" && (
            <EgresosView egresos={egresos} setEgresos={setEgresos} />
          )}
          {staffTab === "compras" && staffRole === "admin" && (
            <ComprasView compras={compras} setCompras={setCompras} />
          )}
          {staffTab === "reports" && staffRole === "admin" && (
            <ReportsView menu={menu} orders={orders} egresos={egresos} compras={compras} />
          )}
        </>
      )}

      {/* Modal PIN Administrador */}
      {isPinOpen && (
        <div className="modal-backdrop">
          <div className="modal-content pin-auth-modal fade-in">
            <h2>🔐 Acceso Administrador</h2>
            <p style={{ color: "var(--text-muted)" }}>Ingresa el PIN de seguridad para acceder al panel administrativo.</p>
            <form onSubmit={handlePinSubmit}>
              <div className="form-group">
                <label htmlFor="pin-input">PIN de Seguridad</label>
                <input
                  id="pin-input"
                  type="password"
                  placeholder="••••"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError(""); }}
                  maxLength={6}
                  required
                  autoFocus
                  style={{ textAlign: "center", fontSize: "1.8rem", letterSpacing: "12px" }}
                />
                {pinError && (
                  <p style={{ color: "var(--color-danger)", fontSize: "0.8rem", margin: "4px 0 0" }}>
                    {pinError}
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPinOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
