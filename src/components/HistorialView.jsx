import React, { useState, useMemo } from "react";

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia", "QR / Webpay"];

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v || 0);

const formatDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function HistorialView({ orders, setOrders }) {
  const [search, setSearch]   = useState("");
  const [showVoid, setShowVoid] = useState(false);
  const [editing, setEditing] = useState(null);          // pedido en edición
  const [form, setForm]       = useState({ paymentMethod: "Efectivo", total: "", notes: "" });
  const [confirmVoid, setConfirmVoid] = useState(null);

  // Ventas: presenciales (Mesa/Llevar) y retiros, ya cobradas o anuladas
  const ventas = useMemo(() => {
    return orders
      .filter(o => o.status === "Completado" || o.status === "Anulado")
      .filter(o => showVoid || o.status !== "Anulado")
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return String(o.number).includes(q)
          || (o.customerName && o.customerName.toLowerCase().includes(q))
          || (o.items || []).some(i => i.name.toLowerCase().includes(q));
      })
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [orders, search, showVoid]);

  const totalMostrado = ventas.filter(o => o.status === "Completado").reduce((s, o) => s + o.total, 0);

  const openEdit = (o) => {
    setEditing(o);
    setForm({
      paymentMethod: o.paymentMethod || "Efectivo",
      total: String(o.total ?? ""),
      notes: o.notes || "",
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const total = Math.round(parseFloat(form.total));
    if (!total || total < 0) { alert("Ingresa un total válido."); return; }
    setOrders(orders.map(o => o.id === editing.id
      ? { ...o, paymentMethod: form.paymentMethod, total, notes: form.notes.trim() }
      : o));
    setEditing(null);
  };

  const handleVoid = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "Anulado" } : o));
    setConfirmVoid(null);
  };

  const handleRestore = (id) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: "Completado" } : o));
  };

  const typeLabel = (o) =>
    o.type === "Para Retirar" ? `Retiro · ${o.customerName || ""}`
    : o.type === "Llevar" ? "Para llevar"
    : o.table ? o.table
    : (o.type || "Venta");

  return (
    <div className="egresos-container fade-in">
      <header className="section-header">
        <div>
          <h1>Historial de Ventas 📒</h1>
          <p className="subtitle">Corrige o anula ventas ya cobradas. Las anuladas no cuentan en los reportes.</p>
        </div>
      </header>

      <div className="metrics-grid">
        <div className="metric-card card-success">
          <span className="metric-icon">💰</span>
          <div className="metric-info">
            <h3>Ventas mostradas</h3>
            <p className="metric-value">{formatCLP(totalMostrado)}</p>
            <p className="metric-desc">{ventas.filter(o => o.status === "Completado").length} cobradas</p>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 2 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por N° de pedido, cliente o producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="btn-clear-search" onClick={() => setSearch("")}>×</button>}
        </div>
        <label className="checkbox-label" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={showVoid} onChange={e => setShowVoid(e.target.checked)} />
          Mostrar anuladas
        </label>
      </div>

      {ventas.length === 0 ? (
        <div className="empty-state">
          <span>📒</span>
          <p>No hay ventas que coincidan.</p>
        </div>
      ) : (
        <div className="items-list">
          {ventas.map(o => {
            const anulada = o.status === "Anulado";
            return (
              <div key={o.id} className="list-item" style={anulada ? { opacity: 0.55 } : undefined}>
                <div className="list-item-accent" style={{ background: anulada ? "var(--text-muted)" : "var(--color-success)" }} />
                <div className="list-item-body">
                  <div className="list-item-main-row">
                    <span className="list-item-title">
                      Pedido #{o.number} {anulada && <span className="badge badge-danger" style={{ marginLeft: 6 }}>ANULADA</span>}
                    </span>
                    <span className="list-item-amount" style={anulada ? { textDecoration: "line-through" } : undefined}>
                      {formatCLP(o.total)}
                    </span>
                  </div>
                  <div className="list-item-meta-row">
                    <span className="meta-text">📅 {formatDateTime(o.timestamp)}</span>
                    <span className="meta-text">🪑 {typeLabel(o)}</span>
                    <span className="meta-text">💳 {o.paymentMethod || "—"}</span>
                  </div>
                  <p className="list-item-notes">
                    {(o.items || []).map(i => `${i.qty}× ${i.name}`).join(", ")}
                  </p>
                  {o.notes && <p className="list-item-notes" style={{ fontStyle: "italic" }}>📝 {o.notes}</p>}
                </div>
                <div className="list-item-actions">
                  {!anulada ? (
                    <>
                      <button className="btn-icon" onClick={() => openEdit(o)} title="Corregir cobro">✏️</button>
                      <button className="btn-icon btn-icon-danger" onClick={() => setConfirmVoid(o.id)} title="Anular venta">🚫</button>
                    </>
                  ) : (
                    <button className="btn btn-secondary btn-xs" onClick={() => handleRestore(o.id)} title="Reactivar">↩️ Reactivar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de corrección */}
      {editing && (
        <div className="modal-backdrop">
          <div className="modal-content fade-in">
            <h2>Corregir Venta · Pedido #{editing.number}</h2>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
                  {(editing.items || []).map(i => `${i.qty}× ${i.name}`).join(", ")}
                </p>

                <div className="form-group">
                  <label>Método de pago</label>
                  <div className="payment-method-selector" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PAYMENT_METHODS.map(m => (
                      <button
                        type="button"
                        key={m}
                        className={`btn btn-sm ${form.paymentMethod === m ? "btn-success" : "btn-secondary"}`}
                        onClick={() => setForm(f => ({ ...f, paymentMethod: m }))}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Total cobrado (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.total}
                    onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nota / motivo de la corrección</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Ej: se cobró con tarjeta, no efectivo"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="btn btn-success">💾 Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar anulación */}
      {confirmVoid && (
        <div className="modal-backdrop">
          <div className="modal-content fade-in" style={{ maxWidth: 380 }}>
            <h2>¿Anular esta venta?</h2>
            <p style={{ color: "var(--text-muted)" }}>
              La venta dejará de contar en los reportes y totales. Podrás reactivarla después.
              El stock no se modifica automáticamente.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmVoid(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleVoid(confirmVoid)}>Anular venta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
