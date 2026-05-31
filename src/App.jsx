import React, { useState } from "react";
import { initialMenu } from "./data/menu";
import { useLocalStorage } from "./hooks/useLocalStorage";
import CustomerView from "./components/CustomerView";
import POSView from "./components/POSView";
import InventoryView from "./components/InventoryView";
import ReportsView from "./components/ReportsView";

export default function App() {
  const [menu, setMenu] = useLocalStorage("carbon_cheddar_menu_v1", initialMenu);
  const [orders, setOrders] = useLocalStorage("carbon_cheddar_orders_v1", []);
  
  // Modos de Simulación: 'staff' (POS) | 'customer' (Página de pedidos)
  const [viewMode, setViewMode] = useState("staff");
  
  // Roles de Staff: 'cajero' | 'admin'
  const [staffRole, setStaffRole] = useState("cajero"); // 'cajero' por defecto para forzar login de admin
  
  // Pestañas activas en el panel de Staff: 'sales' | 'inventory' | 'reports'
  const [staffTab, setStaffTab] = useState("sales");

  // Estado para el modal de ingreso de PIN de Admin
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handleRoleSelectChange = (e) => {
    const selectedRole = e.target.value;
    if (selectedRole === "admin") {
      // Abrir modal de PIN para ingresar como administrador
      setPinInput("");
      setPinError("");
      setIsPinModalOpen(true);
    } else {
      // Cambiar directo a cajero (sin seguridad)
      setStaffRole("cajero");
      setStaffTab("sales");
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setStaffRole("admin");
      setIsPinModalOpen(false);
      setPinInput("");
    } else {
      setPinError("PIN incorrecto. Intenta con '1234' (PIN de simulación).");
    }
  };

  return (
    <div className="app-container">
      {/* Banner de Simulación superior cuando se está en la vista del cliente */}
      {viewMode === "customer" && (
        <div className="simulation-banner fallback-print-hide">
          <span>🌐 Vista del Cliente (Pedido online para retirar en Lota)</span>
          <button 
            className="btn btn-secondary btn-xs" 
            onClick={() => setViewMode("staff")}
          >
            💻 Volver al POS del Personal
          </button>
        </div>
      )}

      {/* Renderizado de la Vista del Cliente */}
      {viewMode === "customer" && (
        <CustomerView 
          menu={menu} 
          setMenu={setMenu} 
          orders={orders} 
          setOrders={setOrders} 
        />
      )}

      {/* Renderizado de las Vistas del Personal (Staff POS) */}
      {viewMode === "staff" && (
        <>
          {/* Navbar de Control y Simulación */}
          <nav className="staff-navbar fallback-print-hide">
            <div className="nav-brand">
              <span className="nav-logo">🍔</span>
              <div>
                <h1>Carbon & Cheddar POS</h1>
                <span className="role-badge" style={{ backgroundColor: staffRole === "admin" ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 145, 0, 0.2)", color: staffRole === "admin" ? "#00e676" : "#ff9100" }}>
                  Rol: {staffRole === "admin" ? "Administrador" : "Cajero"}
                </span>
              </div>
            </div>

            {/* Pestañas (Filtradas por Rol) */}
            <div className="nav-tabs">
              <button 
                className={`nav-tab-btn ${staffTab === "sales" ? "active" : ""}`}
                onClick={() => setStaffTab("sales")}
              >
                Ventas
              </button>
              {staffRole === "admin" && (
                <>
                  <button 
                    className={`nav-tab-btn ${staffTab === "inventory" ? "active" : ""}`}
                    onClick={() => setStaffTab("inventory")}
                  >
                    Inventario
                  </button>
                  <button 
                    className={`nav-tab-btn ${staffTab === "reports" ? "active" : ""}`}
                    onClick={() => setStaffTab("reports")}
                  >
                    Reportes
                  </button>
                </>
              )}
            </div>

            {/* Acciones del Simulador */}
            <div className="nav-actions">
              {/* Selector de Rol */}
              <div className="role-selector-wrapper">
                <label htmlFor="staff-role-select">Simular:</label>
                <select 
                  id="staff-role-select"
                  value={staffRole} 
                  onChange={handleRoleSelectChange}
                  className="select-role"
                >
                  <option value="cajero">Cajero</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Botón para ver vista cliente */}
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setViewMode("customer")}
              >
                🌐 Ver Menú Cliente
              </button>
            </div>
          </nav>

          {/* Vistas Principales */}
          {staffTab === "sales" && (
            <POSView 
              menu={menu} 
              setMenu={setMenu} 
              orders={orders} 
              setOrders={setOrders}
              currentUserRole={staffRole}
            />
          )}

          {staffTab === "inventory" && staffRole === "admin" && (
            <InventoryView 
              menu={menu} 
              setMenu={setMenu} 
            />
          )}

          {staffTab === "reports" && staffRole === "admin" && (
            <ReportsView 
              menu={menu} 
              orders={orders} 
            />
          )}
        </>
      )}

      {/* Modal de Ingreso de PIN de Seguridad para Administrador */}
      {isPinModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content pin-auth-modal fade-in">
            <h2>Acceso Administrador</h2>
            <p>Se requiere PIN de seguridad para ingresar al panel administrativo:</p>
            
            <form onSubmit={handlePinSubmit}>
              <div className="form-group">
                <label htmlFor="pin-input">PIN de Seguridad *</label>
                <input 
                  id="pin-input"
                  type="password" 
                  placeholder="Ingrese PIN (Simulación: 1234)"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
                  maxLength="6"
                  required
                  autoFocus
                  style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "8px" }}
                />
                {pinError && <p className="text-danger" style={{ fontSize: "0.8rem", margin: "4px 0 0 0" }}>{pinError}</p>}
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsPinModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Validar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
