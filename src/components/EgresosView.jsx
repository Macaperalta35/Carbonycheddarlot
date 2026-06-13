import React, { useState, useMemo } from "react";
import { btPrinter } from "../services/bluetoothPrinter";

const CATEGORIES = [
  "Insumos / Ingredientes",
  "Servicios Básicos (Luz, Agua, Gas)",
  "Sueldos y Remuneraciones",
  "Arriendo",
  "Mantención / Reparación",
  "Publicidad / Marketing",
  "Transporte / Delivery",
  "Equipamiento / Utensilios",
  "Otros",
];

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia", "Cheque"];

const CAT_COLORS = {
  "Insumos":    "#ff9100",
  "Servicios":  "#00b0ff",
  "Sueldos":    "#00e676",
  "Arriendo":   "#e040fb",
  "Mantención": "#ff5722",
  "Publicidad": "#ffb300",
  "Transporte": "#26c6da",
  "Equipamiento":"#7c4dff",
  "Otros":      "#9e9e9e",
};

function getCatColor(category) {
  const key = Object.keys(CAT_COLORS).find(k => category.startsWith(k));
  return key ? CAT_COLORS[key] : "#9e9e9e";
}

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", minimumFractionDigits: 0,
  }).format(v || 0);

const todayStr = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  date: todayStr(),
  category: CATEGORIES[0],
  description: "",
  amount: "",
  paymentMethod: "Efectivo",
  supplier: "",
  notes: "",
};

export default function EgresosView({ egresos, setEgresos }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ category: "Todas", search: "", dateFrom: "", dateTo: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [btPrinting, setBtPrinting] = useState(false);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || !amount || amount <= 0) return;

    const newEgreso = {
      id: Date.now(),
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: Math.round(amount),
      paymentMethod: form.paymentMethod,
      supplier: form.supplier.trim(),
      notes: form.notes.trim(),
      timestamp: Date.now(),
    };

    setEgresos([newEgreso, ...egresos]);
    setForm({ ...EMPTY_FORM, date: form.date });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setEgresos(egresos.filter(e => e.id !== id));
    setConfirmDelete(null);
  };

  const handleBTPrint = async (egreso) => {
    if (!btPrinter.connected) {
      alert("Impresora no conectada. Conecta la impresora Bluetooth primero desde el módulo de Ventas.");
      return;
    }
    setBtPrinting(egreso.id);
    try {
      await btPrinter.printEgreso(egreso);
    } catch (err) {
      alert(`Error al imprimir: ${err.message}`);
    } finally {
      setBtPrinting(null);
    }
  };

  const filtered = useMemo(() => {
    return egresos.filter(e => {
      if (filter.category !== "Todas" && e.category !== filter.category) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const match = e.description.toLowerCase().includes(q) ||
          (e.supplier && e.supplier.toLowerCase().includes(q)) ||
          e.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filter.dateFrom && e.date < filter.dateFrom) return false;
      if (filter.dateTo   && e.date > filter.dateTo)   return false;
      return true;
    });
  }, [egresos, filter]);

  const totalAll      = egresos.reduce((s, e) => s + e.amount, 0);
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const isFiltering   = filter.category !== "Todas" || filter.search || filter.dateFrom || filter.dateTo;

  // Resumen por categoría
  const byCat = useMemo(() => {
    const acc = {};
    egresos.forEach(e => {
      const key = e.category.split("/")[0].trim();
      acc[key] = (acc[key] || 0) + e.amount;
    });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [egresos]);

  return (
    <div className="egresos-container fade-in">
      {/* Header */}
      <header className="section-header">
        <div>
          <h1>Egresos de Dinero 💸</h1>
          <p className="subtitle">Registra gastos, pagos de servicios y salidas de caja</p>
        </div>
        <button className="btn btn-danger" onClick={() => setShowForm(!showForm)}>
          {showForm ? "× Cancelar" : "+ Nuevo Egreso"}
        </button>
      </header>

      {/* Métricas */}
      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card card-danger">
          <span className="metric-icon">💸</span>
          <div className="metric-info">
            <h3>Total Egresos</h3>
            <p className="metric-value">{formatCLP(totalAll)}</p>
            <p className="metric-desc">{egresos.length} registros</p>
          </div>
        </div>
        {isFiltering && (
          <div className="metric-card card-info">
            <span className="metric-icon">🔍</span>
            <div className="metric-info">
              <h3>Filtro Activo</h3>
              <p className="metric-value">{formatCLP(totalFiltered)}</p>
              <p className="metric-desc">{filtered.length} registros</p>
            </div>
          </div>
        )}
        {byCat.slice(0, isFiltering ? 2 : 3).map(([cat, total]) => (
          <div key={cat} className="metric-card" style={{ borderLeft: `4px solid ${getCatColor(cat)}` }}>
            <span className="metric-icon" style={{ width: 12, height: 12, borderRadius: "50%", background: getCatColor(cat), display: "inline-block", marginRight: 8 }} />
            <div className="metric-info">
              <h3>{cat}</h3>
              <p className="metric-value" style={{ fontSize: "1.1rem" }}>{formatCLP(total)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario de registro */}
      {showForm && (
        <div className="form-card fade-in">
          <h2 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", fontWeight: 700 }}>
            Registrar Nuevo Egreso
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row-3">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={form.date} onChange={e => setField("date", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Categoría *</label>
                <select value={form.category} onChange={e => setField("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Método de Pago</label>
                <select value={form.paymentMethod} onChange={e => setField("paymentMethod", e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción *</label>
              <input
                type="text"
                placeholder="Ej: Compra de carne molida, pago de luz eléctrica..."
                value={form.description}
                onChange={e => setField("description", e.target.value)}
                required
              />
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>Monto (CLP) *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setField("amount", e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label>Proveedor / Beneficiario</label>
                <input
                  type="text"
                  placeholder="Nombre del proveedor u origen del gasto (opcional)"
                  value={form.supplier}
                  onChange={e => setField("supplier", e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notas adicionales</label>
              <textarea
                placeholder="Observaciones, N° de boleta, referencia de pago..."
                value={form.notes}
                onChange={e => setField("notes", e.target.value)}
                rows={2}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-danger">
                💸 Registrar Egreso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 2 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por descripción, proveedor o categoría..."
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
          {filter.search && (
            <button className="btn-clear-search" onClick={() => setFilter(f => ({ ...f, search: "" }))}>×</button>
          )}
        </div>

        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="filter-select"
        >
          <option value="Todas">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          type="date"
          className="filter-date"
          value={filter.dateFrom}
          onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
          title="Desde"
        />
        <input
          type="date"
          className="filter-date"
          value={filter.dateTo}
          onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))}
          title="Hasta"
        />

        {isFiltering && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFilter({ category: "Todas", search: "", dateFrom: "", dateTo: "" })}
          >
            × Limpiar
          </button>
        )}
      </div>

      {/* Lista de egresos */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span>💸</span>
          <p>
            {egresos.length === 0
              ? "No hay egresos registrados. Haz clic en \"+ Nuevo Egreso\" para empezar."
              : "Ningún egreso coincide con el filtro actual."}
          </p>
        </div>
      ) : (
        <div className="items-list">
          {filtered.map(egreso => (
            <div key={egreso.id} className="list-item">
              <div
                className="list-item-accent"
                style={{ background: getCatColor(egreso.category.split("/")[0].trim()) }}
              />
              <div className="list-item-body">
                <div className="list-item-main-row">
                  <span className="list-item-title">{egreso.description}</span>
                  <span className="list-item-amount text-danger">{formatCLP(egreso.amount)}</span>
                </div>
                <div className="list-item-meta-row">
                  <span className="meta-chip" style={{ background: `${getCatColor(egreso.category.split("/")[0].trim())}22`, color: getCatColor(egreso.category.split("/")[0].trim()) }}>
                    {egreso.category.split("/")[0].trim()}
                  </span>
                  <span className="meta-text">📅 {egreso.date}</span>
                  <span className="meta-text">💳 {egreso.paymentMethod}</span>
                  {egreso.supplier && <span className="meta-text">📦 {egreso.supplier}</span>}
                </div>
                {egreso.notes && <p className="list-item-notes">{egreso.notes}</p>}
              </div>
              <div className="list-item-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleBTPrint(egreso)}
                  title="Imprimir comprobante por Bluetooth"
                  disabled={btPrinting === egreso.id}
                >
                  {btPrinting === egreso.id ? "⏳" : "🖨️"}
                </button>
                <button
                  className="btn-icon btn-icon-danger"
                  onClick={() => setConfirmDelete(egreso.id)}
                  title="Eliminar egreso"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-content fade-in" style={{ maxWidth: 380 }}>
            <h2>¿Eliminar Egreso?</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
