import React, { useState, useMemo } from "react";

const DOC_TYPES    = ["Factura", "Boleta", "Nota de Débito", "Nota de Crédito", "Boleta de Honorarios", "Contrato de Servicio"];
const PAY_METHODS  = ["Efectivo", "Tarjeta", "Transferencia", "Cheque", "Crédito 30 días", "Crédito 60 días", "Crédito 90 días"];
const STATUSES     = ["Pagado", "Pendiente", "Parcialmente Pagado"];
const CATEGORIES   = ["Ingredientes / Alimentos", "Bebidas", "Insumos de Cocina", "Servicios Externos", "Equipamiento", "Publicidad", "Otros"];

const STATUS_STYLE = {
  "Pagado":              { cls: "badge-success",  icon: "✅" },
  "Pendiente":           { cls: "badge-danger",   icon: "⏳" },
  "Parcialmente Pagado": { cls: "badge-warning",  icon: "⚠️" },
};

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", minimumFractionDigits: 0,
  }).format(v || 0);

const todayStr = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  docType:       "Factura",
  docNumber:     "",
  supplier:      "",
  date:          todayStr(),
  category:      CATEGORIES[0],
  description:   "",
  net:           "",
  iva:           "",
  total:         "",
  paymentMethod: "Transferencia",
  status:        "Pagado",
  notes:         "",
  useIva:        true,
};

export default function ComprasView({ compras, setCompras }) {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [detail, setDetail]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter]         = useState({ status: "Todos", search: "", dateFrom: "", dateTo: "" });

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false); };

  const handleEdit = (compra) => {
    setForm({
      docType:       compra.docType || "Factura",
      docNumber:     compra.docNumber || "",
      supplier:      compra.supplier || "",
      date:          compra.date,
      category:      compra.category || CATEGORIES[0],
      description:   compra.description || "",
      net:           compra.net ? String(compra.net) : "",
      iva:           compra.iva ? String(compra.iva) : "",
      total:         compra.total ? String(compra.total) : "",
      paymentMethod: compra.paymentMethod || "Transferencia",
      status:        compra.status || "Pagado",
      notes:         compra.notes || "",
      useIva:        (compra.iva || 0) > 0,
    });
    setEditingId(compra.id);
    setDetail(null);
    setShowForm(true);
  };

  // Recalcula neto e IVA cuando cambia el total (método más común)
  const handleTotalChange = (val) => {
    const tot = parseFloat(val) || 0;
    if (form.useIva && tot > 0) {
      const net = Math.round(tot / 1.19);
      const iva = tot - net;
      setForm(f => ({ ...f, total: val, net: net || "", iva: iva || "" }));
    } else {
      setForm(f => ({ ...f, total: val, net: val, iva: "" }));
    }
  };

  // Recalcula total cuando cambia el neto
  const handleNetChange = (val) => {
    const net = parseFloat(val) || 0;
    if (form.useIva && net > 0) {
      const iva   = Math.round(net * 0.19);
      const total = net + iva;
      setForm(f => ({ ...f, net: val, iva: iva || "", total: total || "" }));
    } else {
      setForm(f => ({ ...f, net: val, iva: "", total: val }));
    }
  };

  const handleUseIvaChange = (checked) => {
    const net = parseFloat(form.net) || 0;
    if (checked && net > 0) {
      const iva   = Math.round(net * 0.19);
      const total = net + iva;
      setForm(f => ({ ...f, useIva: true, iva: iva || "", total: total || "" }));
    } else {
      setForm(f => ({ ...f, useIva: false, iva: "", total: form.net }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = parseFloat(form.total);
    if (!form.supplier.trim() || !total || total <= 0) return;

    const net = parseFloat(form.net) || (form.useIva ? Math.round(total / 1.19) : total);
    const iva = form.useIva ? (total - net) : 0;

    const data = {
      docType:       form.docType,
      docNumber:     form.docNumber.trim(),
      supplier:      form.supplier.trim(),
      date:          form.date,
      category:      form.category,
      description:   form.description.trim(),
      net:           Math.round(net),
      iva:           Math.round(iva),
      total:         Math.round(total),
      paymentMethod: form.paymentMethod,
      status:        form.status,
      notes:         form.notes.trim(),
    };

    if (editingId) {
      setCompras(compras.map(c => c.id === editingId ? { ...c, ...data } : c));
    } else {
      setCompras([{ id: Date.now(), ...data, timestamp: Date.now() }, ...compras]);
    }
    resetForm();
  };

  const handleDelete = (id) => {
    setCompras(compras.filter(c => c.id !== id));
    setConfirmDelete(null);
    if (detail?.id === id) setDetail(null);
  };

  const updateStatus = (id, status) => {
    setCompras(compras.map(c => c.id === id ? { ...c, status } : c));
    if (detail?.id === id) setDetail(d => ({ ...d, status }));
  };

  const filtered = useMemo(() => {
    return compras.filter(c => {
      if (filter.status !== "Todos" && c.status !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const match = c.supplier.toLowerCase().includes(q) ||
          (c.docNumber && c.docNumber.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          c.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filter.dateFrom && c.date < filter.dateFrom) return false;
      if (filter.dateTo   && c.date > filter.dateTo)   return false;
      return true;
    });
  }, [compras, filter]);

  const totalPendiente = compras.filter(c => c.status !== "Pagado").reduce((s, c) => s + c.total, 0);
  const totalPagado    = compras.filter(c => c.status === "Pagado").reduce((s, c) => s + c.total, 0);
  const isFiltering    = filter.status !== "Todos" || filter.search || filter.dateFrom || filter.dateTo;

  const docIcon = (type) => {
    if (type === "Factura")   return "📄";
    if (type === "Boleta")    return "🧾";
    if (type.includes("Nota"))return "📑";
    return "📋";
  };

  return (
    <div className="egresos-container fade-in">
      {/* Header */}
      <header className="section-header">
        <div>
          <h1>Compras & Facturas 🧾</h1>
          <p className="subtitle">Registra facturas, boletas y documentos de proveedores</p>
        </div>
        <button className="btn btn-primary" onClick={() => showForm ? resetForm() : (setForm(EMPTY_FORM), setEditingId(null), setShowForm(true))}>
          {showForm ? "× Cancelar" : "+ Nueva Compra / Factura"}
        </button>
      </header>

      {/* Métricas */}
      <div className="metrics-grid">
        <div className="metric-card card-danger">
          <span className="metric-icon">⏳</span>
          <div className="metric-info">
            <h3>Por Pagar</h3>
            <p className="metric-value">{formatCLP(totalPendiente)}</p>
            <p className="metric-desc">Facturas pendientes</p>
          </div>
        </div>
        <div className="metric-card card-success">
          <span className="metric-icon">✅</span>
          <div className="metric-info">
            <h3>Total Pagado</h3>
            <p className="metric-value">{formatCLP(totalPagado)}</p>
            <p className="metric-desc">Compras completadas</p>
          </div>
        </div>
        <div className="metric-card card-info">
          <span className="metric-icon">📋</span>
          <div className="metric-info">
            <h3>Documentos</h3>
            <p className="metric-value">{compras.length}</p>
            <p className="metric-desc">Registros totales</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="form-card fade-in">
          <h2 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", fontWeight: 700 }}>
            {editingId ? "Editar Compra / Factura" : "Registrar Compra / Factura"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row-3">
              <div className="form-group">
                <label>Tipo de Documento *</label>
                <select value={form.docType} onChange={e => setField("docType", e.target.value)}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>N° Documento</label>
                <input
                  type="text"
                  placeholder="Ej: 000456"
                  value={form.docNumber}
                  onChange={e => setField("docNumber", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Fecha *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setField("date", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Proveedor *</label>
                <input
                  type="text"
                  placeholder="Nombre empresa o persona"
                  value={form.supplier}
                  onChange={e => setField("supplier", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select value={form.category} onChange={e => setField("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción / Detalle</label>
              <input
                type="text"
                placeholder="Ej: 10kg carne molida + 50 unidades pan de hamburguesa..."
                value={form.description}
                onChange={e => setField("description", e.target.value)}
              />
            </div>

            {/* Montos */}
            <div className="amounts-section">
              <div className="amounts-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Neto (sin IVA)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.net}
                    onChange={e => handleNetChange(e.target.value)}
                    min="0"
                  />
                </div>

                <div className="iva-toggle-group">
                  <label className="checkbox-label" style={{ cursor: "pointer", marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={form.useIva}
                      onChange={e => handleUseIvaChange(e.target.checked)}
                    />
                    IVA 19%
                  </label>
                  <span className="iva-amount-display">
                    {formatCLP(parseFloat(form.iva) || 0)}
                  </span>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Total (con IVA) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.total}
                    onChange={e => handleTotalChange(e.target.value)}
                    min="1"
                    required
                    style={{ fontWeight: 700, fontSize: "1.1rem" }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>Método de Pago</label>
                <select value={form.paymentMethod} onChange={e => setField("paymentMethod", e.target.value)}>
                  {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado de Pago</label>
                <select value={form.status} onChange={e => setField("status", e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea
                placeholder="Observaciones, condiciones de pago, referencia..."
                value={form.notes}
                onChange={e => setField("notes", e.target.value)}
                rows={2}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingId ? "💾 Guardar Cambios" : "🧾 Registrar Compra"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 2 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por proveedor, N° documento o descripción..."
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          />
          {filter.search && (
            <button className="btn-clear-search" onClick={() => setFilter(f => ({ ...f, search: "" }))}>×</button>
          )}
        </div>

        <select
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="filter-select"
        >
          <option value="Todos">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
            onClick={() => setFilter({ status: "Todos", search: "", dateFrom: "", dateTo: "" })}
          >
            × Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span>🧾</span>
          <p>
            {compras.length === 0
              ? "No hay compras registradas. Haz clic en \"+ Nueva Compra / Factura\" para empezar."
              : "Ningún documento coincide con el filtro actual."}
          </p>
        </div>
      ) : (
        <div className="items-list">
          {filtered.map(compra => {
            const st = STATUS_STYLE[compra.status] || STATUS_STYLE["Pendiente"];
            return (
              <div
                key={compra.id}
                className="list-item list-item-clickable"
                onClick={() => setDetail(compra)}
              >
                <div className="list-item-accent" style={{ background: compra.status === "Pagado" ? "var(--color-success)" : compra.status === "Pendiente" ? "var(--color-danger)" : "var(--color-warning)" }} />
                <span className="compra-doc-icon">{docIcon(compra.docType)}</span>
                <div className="list-item-body">
                  <div className="list-item-main-row">
                    <span className="list-item-title">{compra.supplier}</span>
                    <span className="list-item-amount">{formatCLP(compra.total)}</span>
                  </div>
                  <div className="list-item-meta-row">
                    <span className={`badge ${st.cls}`}>{st.icon} {compra.status}</span>
                    <span className="meta-text">{compra.docType}{compra.docNumber ? ` #${compra.docNumber}` : ""}</span>
                    <span className="meta-text">📅 {compra.date}</span>
                    <span className="meta-text">💳 {compra.paymentMethod}</span>
                  </div>
                  {compra.description && <p className="list-item-notes">{compra.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle */}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div
            className="modal-content compra-detail-modal fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0" }}>
                  {docIcon(detail.docType)} {detail.docType}
                  {detail.docNumber && ` #${detail.docNumber}`}
                </h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>{detail.supplier}</p>
              </div>
              <span className={`badge ${(STATUS_STYLE[detail.status] || STATUS_STYLE["Pendiente"]).cls}`} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                {detail.status}
              </span>
            </div>

            <div className="detail-table">
              <div className="detail-row"><span>Fecha</span><strong>{detail.date}</strong></div>
              <div className="detail-row"><span>Categoría</span><strong>{detail.category}</strong></div>
              {detail.description && (
                <div className="detail-row"><span>Detalle</span><span>{detail.description}</span></div>
              )}
              <div className="detail-row"><span>Método de Pago</span><strong>{detail.paymentMethod}</strong></div>
              <div className="detail-separator" />
              {detail.net > 0 && <div className="detail-row"><span>Neto</span><span>{formatCLP(detail.net)}</span></div>}
              {detail.iva > 0 && <div className="detail-row"><span>IVA (19%)</span><span>{formatCLP(detail.iva)}</span></div>}
              <div className="detail-row detail-total-row">
                <span>TOTAL</span><strong style={{ fontSize: "1.3rem" }}>{formatCLP(detail.total)}</strong>
              </div>
              {detail.notes && (
                <>
                  <div className="detail-separator" />
                  <div className="detail-row"><span>Notas</span><span>{detail.notes}</span></div>
                </>
              )}
            </div>

            {/* Cambio de estado rápido */}
            <div style={{ marginTop: 20 }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Cambiar Estado
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {STATUSES.map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${detail.status === s ? "btn-success" : "btn-secondary"}`}
                    onClick={() => updateStatus(detail.id, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { setConfirmDelete(detail.id); setDetail(null); }}
              >
                🗑️ Eliminar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleEdit(detail)}>
                ✏️ Editar
              </button>
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-content fade-in" style={{ maxWidth: 380 }}>
            <h2>¿Eliminar Documento?</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
