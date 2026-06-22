import React, { useState } from "react";
import logoUrl from "./assets/logo.js";
import { initialMenu } from "./data/menu";
import { initialInsumos } from "./data/insumos";
import { useSupabaseData } from "./hooks/useSupabaseData";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { isConfigured } from "./lib/supabase";
import CustomerView  from "./components/CustomerView";
import POSView       from "./components/POSView";
import InventoryView from "./components/InventoryView";
import ReportsView   from "./components/ReportsView";
import EgresosView   from "./components/EgresosView";
import ComprasView   from "./components/ComprasView";
import SettingsView           from "./components/SettingsView";
import InsumosView            from "./components/InsumosView";
import CartaView             from "./components/CartaView";
import AccessibilityWidget   from "./components/AccessibilityWidget";
import { useCartaImages }    from "./hooks/useCartaImages";
import InstallButton        from "./components/InstallButton";

// Tabs y los roles que pueden verlos
const TABS = [
  { id: "sales",     label: "Ventas",        icon: "🧾", roles: ["cajero", "admin", "superadmin"] },
  { id: "inventory", label: "Inventario",    icon: "📦", roles: ["admin", "superadmin"] },
  { id: "insumos",   label: "Insumos",       icon: "🥬", roles: ["admin", "superadmin"] },
  { id: "egresos",   label: "Egresos",       icon: "💸", roles: ["admin", "superadmin"] },
  { id: "compras",   label: "Compras",       icon: "🛒", roles: ["admin", "superadmin"] },
  { id: "reports",   label: "Reportes",      icon: "📊", roles: ["admin", "superadmin"] },
  { id: "carta",     label: "Carta PDF",     icon: "📄", roles: ["cajero", "admin", "superadmin"] },
  { id: "settings",  label: "Configuración", icon: "⚙️", roles: ["superadmin"] },
];

const ROLE_META = {
  cajero:     { label: "Cajero",       icon: "🧾", bg: "rgba(255,145,0,0.15)",  color: "#ff9100" },
  admin:      { label: "Administrador",icon: "🔑", bg: "rgba(0,230,118,0.15)",  color: "#00e676" },
  superadmin: { label: "Super Admin",  icon: "👑", bg: "rgba(124,77,255,0.15)", color: "#7c4dff" },
};

const DEFAULT_PINS = { admin: "1234", superadmin: "9999" };

export default function App() {
  const [menu,    setMenu,    menuLoading]    = useSupabaseData("menu_items", "carbon_cheddar_menu_v1",    initialMenu, { orderBy: "category", mergeSchema: true });
  const [orders,  setOrders,  ordersLoading]  = useSupabaseData("orders",     "carbon_cheddar_orders_v1",  [],          { orderBy: "timestamp" });
  const [egresos, setEgresos, egresosLoading] = useSupabaseData("egresos",    "carbon_cheddar_egresos_v1", [],          { orderBy: "timestamp" });
  const [compras, setCompras, comprasLoading] = useSupabaseData("compras",    "carbon_cheddar_compras_v1", [],          { orderBy: "timestamp" });
  const [insumos, setInsumos] = useSupabaseData("insumos", "carbon_cheddar_insumos_v1", initialInsumos, { orderBy: "name", orderAsc: true });
  const [recetas, setRecetas] = useSupabaseData("recetas", "carbon_cheddar_recetas_v1", []);

  // PINs configurables, guardados en localStorage
  const [pins, setPins] = useLocalStorage("carbon_cheddar_pins_v1", DEFAULT_PINS);

  // Imágenes de la carta digital
  const {
    images:   cartaImages,
    loading:  cartaLoading,
    dbError:  cartaError,
    upsert:   cartaUpsert,
    remove:   cartaRemove,
    swap:     cartaSwap,
    reload:   cartaReload,
  } = useCartaImages();

  const isLoading = isConfigured && (menuLoading || ordersLoading || egresosLoading || comprasLoading);

  // Si la URL NO tiene ?pos=1, el cliente ve solo la carta (sin acceso al sistema)
  const isStaffUrl = new URLSearchParams(window.location.search).has("pos");
  const [viewMode,  setViewMode]  = useState(isStaffUrl ? "staff" : "customer");
  // La sesión del personal se persiste: se mantiene aunque se recargue o se caiga internet
  const [staffRole, setStaffRole] = useLocalStorage("carbon_cheddar_staff_role_v1", "cajero");
  const [staffTab,  setStaffTab]  = useState("sales");

  // Modal de PIN
  const [pinTarget, setPinTarget] = useState(null); // 'admin' | 'superadmin'
  const [pinInput,  setPinInput]  = useState("");
  const [pinError,  setPinError]  = useState("");

  const handleRoleChange = (e) => {
    const next = e.target.value;
    if (next === "cajero") {
      setStaffRole("cajero");
      setStaffTab("sales");
    } else {
      setPinInput("");
      setPinError("");
      setPinTarget(next);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === pins[pinTarget]) {
      setStaffRole(pinTarget);
      setPinTarget(null);
      setPinInput("");
      // Si la tab actual no es visible para el nuevo rol, ir a la primera visible
      const nextTabs = TABS.filter(t => t.roles.includes(pinTarget));
      if (!nextTabs.find(t => t.id === staffTab)) setStaffTab(nextTabs[0]?.id ?? "sales");
    } else {
      setPinError("PIN incorrecto. Intenta de nuevo.");
    }
  };

  const visibleTabs = TABS.filter(t => t.roles.includes(staffRole));
  const meta = ROLE_META[staffRole];

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
      {viewMode === "customer" && isStaffUrl && (
        <div className="simulation-banner fallback-print-hide">
          <span>🌐 Vista del Cliente</span>
          <button className="btn btn-secondary btn-xs" onClick={() => setViewMode("staff")}>
            💻 Volver al POS del Personal
          </button>
        </div>
      )}

      {viewMode === "customer" && (
        <CustomerView
          menu={menu} setMenu={setMenu}
          orders={orders} setOrders={setOrders}
          cartaImages={cartaImages}
          cartaLoading={cartaLoading}
        />
      )}

      {viewMode === "staff" && (
        <>
          <nav className="staff-navbar fallback-print-hide">
            <div className="nav-brand">
              <img src={logoUrl} alt="C&C" className="nav-logo-img" />
              <div>
                <h1>Carbon &amp; Cheddar POS</h1>
                <span className="role-badge" style={{ backgroundColor: meta.bg, color: meta.color }}>
                  {meta.icon} {meta.label}
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
                  <option value="cajero">🧾 Cajero</option>
                  <option value="admin">🔑 Administrador</option>
                  <option value="superadmin">👑 Super Admin</option>
                </select>
              </div>
              <InstallButton />
              <button className="btn btn-primary btn-sm" onClick={() => setViewMode("customer")}>
                🌐 Ver Menú Cliente
              </button>
            </div>
          </nav>

          {staffTab === "sales" && (
            <POSView
              menu={menu} setMenu={setMenu}
              orders={orders} setOrders={setOrders}
              insumos={insumos} setInsumos={setInsumos} recetas={recetas}
              currentUserRole={staffRole}
            />
          )}
          {staffTab === "inventory" && ["admin","superadmin"].includes(staffRole) && (
            <InventoryView
              menu={menu} setMenu={setMenu}
              insumos={insumos} recetas={recetas} setRecetas={setRecetas}
            />
          )}
          {staffTab === "insumos" && ["admin","superadmin"].includes(staffRole) && (
            <InsumosView menu={menu} insumos={insumos} setInsumos={setInsumos} recetas={recetas} setRecetas={setRecetas} />
          )}
          {staffTab === "egresos" && ["admin","superadmin"].includes(staffRole) && (
            <EgresosView egresos={egresos} setEgresos={setEgresos} />
          )}
          {staffTab === "compras" && ["admin","superadmin"].includes(staffRole) && (
            <ComprasView compras={compras} setCompras={setCompras} />
          )}
          {staffTab === "reports" && ["admin","superadmin"].includes(staffRole) && (
            <ReportsView menu={menu} orders={orders} egresos={egresos} compras={compras} />
          )}
          {staffTab === "carta" && (
            <CartaView
              menu={menu}
              currentUserRole={staffRole}
              cartaImages={cartaImages}
              cartaError={cartaError}
              onUpsert={cartaUpsert}
              onRemove={cartaRemove}
              onSwap={cartaSwap}
              onReload={cartaReload}
            />
          )}
          {staffTab === "settings" && staffRole === "superadmin" && (
            <SettingsView pins={pins} setPins={setPins} />
          )}
        </>
      )}

      {/* Widget de Accesibilidad — siempre visible */}
      <AccessibilityWidget />

      {/* Modal PIN */}
      {pinTarget && (
        <div className="modal-backdrop">
          <div className="modal-content pin-auth-modal fade-in">
            <div className="pin-modal-header">
              <span className="pin-modal-icon">
                {pinTarget === "superadmin" ? "👑" : "🔑"}
              </span>
              <div>
                <h2>{pinTarget === "superadmin" ? "Acceso Super Admin" : "Acceso Administrador"}</h2>
                <p>Ingresa el PIN de seguridad para continuar.</p>
              </div>
            </div>
            <form onSubmit={handlePinSubmit}>
              <div className="form-group">
                <label htmlFor="pin-input">PIN</label>
                <input
                  id="pin-input"
                  type="password"
                  placeholder="••••"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError(""); }}
                  maxLength={8}
                  required
                  autoFocus
                  className="pin-input-field"
                />
                {pinError && (
                  <p className="pin-error">{pinError}</p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPinTarget(null)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ background: pinTarget === "superadmin" ? "#7c4dff" : "var(--color-success)", color: "#fff" }}
                >
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
