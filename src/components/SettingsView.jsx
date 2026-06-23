import React, { useState } from "react";

const ROLE_PERMS = [
  { role: "🧾 Cajero",       perms: ["Ventas / POS"],                                                         color: "#ff9100" },
  { role: "🔑 Administrador", perms: ["Ventas / POS", "Inventario", "Egresos", "Compras", "Reportes"],        color: "#00e676" },
  { role: "👑 Super Admin",   perms: ["Ventas / POS", "Inventario", "Egresos", "Compras", "Reportes", "Configuración"], color: "#7c4dff" },
];

function PinChangeCard({ title, roleKey, icon, accentColor, pins, setPins }) {
  const [form,    setForm]    = useState({ current: "", next: "", confirm: "" });
  const [msg,     setMsg]     = useState(null); // { type: 'ok'|'err', text }
  const [visible, setVisible] = useState(false);

  const handle = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setMsg(null);
  };

  const submit = (e) => {
    e.preventDefault();
    if (form.current !== pins[roleKey]) {
      return setMsg({ type: "err", text: "El PIN actual es incorrecto." });
    }
    if (form.next.length < 4) {
      return setMsg({ type: "err", text: "El nuevo PIN debe tener al menos 4 caracteres." });
    }
    if (form.next !== form.confirm) {
      return setMsg({ type: "err", text: "El nuevo PIN y la confirmación no coinciden." });
    }
    setPins(p => ({ ...p, [roleKey]: form.next }));
    setForm({ current: "", next: "", confirm: "" });
    setMsg({ type: "ok", text: "✅ PIN actualizado correctamente." });
  };

  return (
    <div className="settings-card" style={{ borderLeftColor: accentColor }}>
      <div className="settings-card-header">
        <span className="settings-card-icon" style={{ color: accentColor }}>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>PIN actual: <strong style={{ letterSpacing: "4px", color: accentColor }}>
            {visible ? pins[roleKey] : "•".repeat(pins[roleKey]?.length ?? 4)}
          </strong>
            <button className="btn-show-pin" onClick={() => setVisible(v => !v)}>
              {visible ? "🙈" : "👁️"}
            </button>
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="pin-change-form">
        <div className="form-row-3">
          <div className="form-group">
            <label>PIN actual</label>
            <input type="password" value={form.current} onChange={handle("current")}
              placeholder="••••" maxLength={8} required className="form-input" />
          </div>
          <div className="form-group">
            <label>Nuevo PIN</label>
            <input type="password" value={form.next} onChange={handle("next")}
              placeholder="••••" maxLength={8} required className="form-input" />
          </div>
          <div className="form-group">
            <label>Confirmar PIN</label>
            <input type="password" value={form.confirm} onChange={handle("confirm")}
              placeholder="••••" maxLength={8} required className="form-input" />
          </div>
        </div>

        {msg && (
          <p className={msg.type === "ok" ? "pin-msg-ok" : "pin-msg-err"}>{msg.text}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary btn-sm">Cambiar PIN</button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsView({ pins, setPins, onlineOrdersEnabled = false, onToggleOnlineOrders }) {
  return (
    <div className="view-container">
      <div className="section-header">
        <div>
          <h2>⚙️ Configuración del Sistema</h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Acceso exclusivo Super Admin — gestión de PINs y permisos
          </p>
        </div>
      </div>

      {/* Pedidos online del cliente */}
      <div className="settings-perms-section">
        <h3 className="settings-section-title">Pedidos Online del Cliente</h3>
        <div className="settings-card" style={{ borderLeftColor: onlineOrdersEnabled ? "#00e676" : "#9e9e9e" }}>
          <div className="settings-card-header">
            <span className="settings-card-icon" style={{ color: onlineOrdersEnabled ? "#00e676" : "#9e9e9e" }}>
              {onlineOrdersEnabled ? "🟢" : "⚪"}
            </span>
            <div style={{ flex: 1 }}>
              <h3>Pedidos online {onlineOrdersEnabled ? "ACTIVADOS" : "DESACTIVADOS"}</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {onlineOrdersEnabled
                  ? "Los clientes pueden hacer pedidos desde la web para retirar."
                  : "Los clientes solo ven la carta; no pueden hacer pedidos online."}
              </p>
            </div>
            <button
              className={`btn ${onlineOrdersEnabled ? "btn-danger" : "btn-success"}`}
              onClick={onToggleOnlineOrders}
            >
              {onlineOrdersEnabled ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de roles y permisos */}
      <div className="settings-perms-section">
        <h3 className="settings-section-title">Roles y Permisos</h3>
        <div className="perms-grid">
          {ROLE_PERMS.map(r => (
            <div key={r.role} className="perms-card" style={{ borderTopColor: r.color }}>
              <h4 style={{ color: r.color, margin: "0 0 12px" }}>{r.role}</h4>
              <ul className="perms-list">
                {r.perms.map(p => (
                  <li key={p}><span className="perms-check">✓</span> {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Cambio de PINs */}
      <div className="settings-pins-section">
        <h3 className="settings-section-title">Gestión de PINs</h3>
        <div className="settings-pins-info">
          <span>🔒</span>
          <span>Los PINs se guardan de forma local en este dispositivo. Cámbielos regularmente por seguridad.</span>
        </div>

        <PinChangeCard
          title="PIN Administrador"
          roleKey="admin"
          icon="🔑"
          accentColor="#00e676"
          pins={pins}
          setPins={setPins}
        />

        <PinChangeCard
          title="PIN Super Admin"
          roleKey="superadmin"
          icon="👑"
          accentColor="#7c4dff"
          pins={pins}
          setPins={setPins}
        />
      </div>

      {/* Info del sistema */}
      <div className="settings-info-section">
        <h3 className="settings-section-title">Información del Sistema</h3>
        <div className="settings-info-grid">
          <div className="settings-info-item">
            <span className="info-label">Sistema</span>
            <span className="info-value">Carbon &amp; Cheddar POS</span>
          </div>
          <div className="settings-info-item">
            <span className="info-label">Versión</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="settings-info-item">
            <span className="info-label">Desarrollado por</span>
            <span className="info-value">Lilith ❤️</span>
          </div>
          <div className="settings-info-item">
            <span className="info-label">Base de datos</span>
            <span className="info-value" style={{ color: "var(--color-success)" }}>
              {typeof window !== "undefined" && import.meta.env.VITE_SUPABASE_URL?.includes("supabase.co")
                ? "☁️ Supabase (nube)" : "💾 Local Storage"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
