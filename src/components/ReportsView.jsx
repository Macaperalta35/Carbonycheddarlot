import React, { useState } from "react";

export default function ReportsView({ menu, orders, egresos = [], compras = [] }) {
  const [copied, setCopied] = useState(false);

  // Ventas completadas
  const completed   = orders.filter(o => o.status === "Completado");
  const totalVentas = completed.reduce((s, o) => s + o.total, 0);
  const totalCount  = completed.length;
  const avgTicket   = totalCount > 0 ? Math.round(totalVentas / totalCount) : 0;

  // Egresos
  const totalEgresos  = egresos.reduce((s, e) => s + e.amount, 0);
  const totalCompras  = compras.reduce((s, c) => s + c.total, 0);
  const totalGastos   = totalEgresos + totalCompras;
  const utilidadNeta  = totalVentas - totalGastos;

  // Métodos de pago
  const payBreakdown = completed.reduce((acc, o) => {
    const m = o.paymentMethod || "Efectivo";
    acc[m] = (acc[m] || 0) + o.total;
    return acc;
  }, { Efectivo: 0, Tarjeta: 0, Transferencia: 0, "QR / Webpay": 0 });

  // Productos más vendidos
  const productSales = completed.reduce((acc, o) => {
    o.items.forEach(i => { acc[i.name] = (acc[i.name] || 0) + i.qty; });
    return acc;
  }, {});
  const topItems = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Stock crítico
  const lowStock = menu.filter(i => i.stock < 5);

  // Egresos por categoría
  const egresosByCat = egresos.reduce((acc, e) => {
    const k = e.category.split("/")[0].trim();
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});
  const topEgresos = Object.entries(egresosByCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const formatCLP = (v) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency", currency: "CLP", minimumFractionDigits: 0,
    }).format(v || 0);

  const generateHandover = () => {
    const now  = new Date();
    const date = now.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const sep  = "=====================================";
    const line = "-------------------------------------";

    let t = `${sep}\n`;
    t += ` ENTREGA DE TURNO — CARBON & CHEDDAR\n`;
    t += ` Fecha: ${date}\n`;
    t += `${sep}\n\n`;

    t += `VENTAS DEL DÍA:\n`;
    t += `  Ingresos Totales: ${formatCLP(totalVentas)}\n`;
    t += `  Pedidos Cerrados: ${totalCount}\n`;
    t += `  Ticket Promedio:  ${formatCLP(avgTicket)}\n\n`;

    t += `DESGLOSE MEDIOS DE PAGO:\n`;
    Object.entries(payBreakdown).forEach(([k, v]) => {
      if (v > 0) t += `  ${k}: ${formatCLP(v)}\n`;
    });
    t += `\n`;

    if (totalEgresos > 0 || totalCompras > 0) {
      t += `GASTOS DEL DÍA:\n`;
      if (totalEgresos > 0) t += `  Egresos Operacionales: ${formatCLP(totalEgresos)}\n`;
      if (totalCompras > 0) t += `  Compras / Facturas:    ${formatCLP(totalCompras)}\n`;
      t += `  Total Gastos:         ${formatCLP(totalGastos)}\n\n`;

      t += `RESULTADO NETO:\n`;
      t += `  ${utilidadNeta >= 0 ? "UTILIDAD" : "PÉRDIDA"}: ${formatCLP(Math.abs(utilidadNeta))}\n\n`;
    }

    t += `PRODUCTOS MÁS VENDIDOS:\n`;
    if (topItems.length === 0) {
      t += `  Sin ventas registradas.\n`;
    } else {
      topItems.forEach(([name, qty], i) => {
        t += `  ${i + 1}. ${name}: ${qty} u.\n`;
      });
    }
    t += `\n`;

    t += `STOCK CRÍTICO (< 5 u.):\n`;
    if (lowStock.length === 0) {
      t += `  ✓ Inventario en niveles normales.\n`;
    } else {
      lowStock.forEach(i => {
        t += `  ⚠️ ${i.emoji} ${i.name}: ${i.stock} u. restantes\n`;
      });
    }
    t += `\n${sep}\n Generado por Carbon & Cheddar POS`;

    return t;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateHandover())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); })
      .catch(() => alert("No se pudo copiar. Selecciona el texto manualmente."));
  };

  return (
    <div className="reports-container fade-in">
      <header className="reports-header">
        <h1>Informes & Cierre de Caja 📊</h1>
        <p className="subtitle">Visualiza el rendimiento del día y genera la entrega de turno</p>
      </header>

      {/* Métricas principales */}
      <div className="metrics-grid metrics-grid-4">
        <div className="metric-card card-primary">
          <span className="metric-icon">💰</span>
          <div className="metric-info">
            <h3>Ingresos Totales</h3>
            <p className="metric-value">{formatCLP(totalVentas)}</p>
            <p className="metric-desc">19% IVA incluido</p>
          </div>
        </div>

        <div className="metric-card card-danger">
          <span className="metric-icon">💸</span>
          <div className="metric-info">
            <h3>Total Gastos</h3>
            <p className="metric-value">{formatCLP(totalGastos)}</p>
            <p className="metric-desc">Egresos + Compras</p>
          </div>
        </div>

        <div className={`metric-card ${utilidadNeta >= 0 ? "card-success" : "card-danger"}`}>
          <span className="metric-icon">{utilidadNeta >= 0 ? "📈" : "📉"}</span>
          <div className="metric-info">
            <h3>{utilidadNeta >= 0 ? "Utilidad Neta" : "Pérdida Neta"}</h3>
            <p className="metric-value" style={{ color: utilidadNeta >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
              {formatCLP(Math.abs(utilidadNeta))}
            </p>
            <p className="metric-desc">Ventas − Gastos</p>
          </div>
        </div>

        <div className="metric-card card-info">
          <span className="metric-icon">🧾</span>
          <div className="metric-info">
            <h3>Pedidos Cerrados</h3>
            <p className="metric-value">{totalCount}</p>
            <p className="metric-desc">Ticket promedio: {formatCLP(avgTicket)}</p>
          </div>
        </div>
      </div>

      <div className="reports-details-grid">
        {/* Columna izquierda */}
        <div className="details-col-left">
          {/* Métodos de pago */}
          <div className="report-card">
            <h2>Métodos de Pago</h2>
            <div className="payment-distribution">
              <div className="distribution-bar">
                {totalVentas > 0 ? (
                  <>
                    <div className="bar-segment cash"     style={{ width: `${(payBreakdown.Efectivo / totalVentas) * 100}%` }} title={`Efectivo: ${formatCLP(payBreakdown.Efectivo)}`} />
                    <div className="bar-segment card"     style={{ width: `${(payBreakdown.Tarjeta / totalVentas) * 100}%` }} title={`Tarjeta: ${formatCLP(payBreakdown.Tarjeta)}`} />
                    <div className="bar-segment transfer" style={{ width: `${(payBreakdown.Transferencia / totalVentas) * 100}%` }} title={`Transferencia: ${formatCLP(payBreakdown.Transferencia)}`} />
                    <div className="bar-segment qr"       style={{ width: `${((payBreakdown["QR / Webpay"] || 0) / totalVentas) * 100}%` }} title={`QR/Webpay: ${formatCLP(payBreakdown["QR / Webpay"] || 0)}`} />
                  </>
                ) : (
                  <div className="bar-segment empty" style={{ width: "100%" }} />
                )}
              </div>
              <div className="payment-legend">
                <div className="legend-item"><span className="color-dot cash" /> Efectivo: {formatCLP(payBreakdown.Efectivo)}</div>
                <div className="legend-item"><span className="color-dot card" /> Tarjeta: {formatCLP(payBreakdown.Tarjeta)}</div>
                <div className="legend-item"><span className="color-dot transfer" /> Transf.: {formatCLP(payBreakdown.Transferencia)}</div>
                {(payBreakdown["QR / Webpay"] || 0) > 0 && (
                  <div className="legend-item"><span className="color-dot qr" /> QR: {formatCLP(payBreakdown["QR / Webpay"])}</div>
                )}
              </div>
            </div>
          </div>

          {/* Productos más vendidos */}
          <div className="report-card">
            <h2>Productos Más Vendidos 🔥</h2>
            {topItems.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>Sin datos de ventas aún.</p>
            ) : (
              <div className="popular-items-list">
                {topItems.map(([name, qty], i) => (
                  <div key={i} className="popular-item-row">
                    <span className="popular-rank">#{i + 1}</span>
                    <span className="popular-name">{name}</span>
                    <span className="popular-qty badge badge-success">{qty} u.</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desglose de egresos */}
          {topEgresos.length > 0 && (
            <div className="report-card">
              <h2>Egresos por Categoría 💸</h2>
              <div className="popular-items-list">
                {topEgresos.map(([cat, total], i) => (
                  <div key={i} className="popular-item-row">
                    <span className="popular-rank">#{i + 1}</span>
                    <span className="popular-name">{cat}</span>
                    <span className="popular-qty badge badge-warning">{formatCLP(total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Entrega de Turno */}
        <div className="details-col-right">
          <div className="report-card handover-card">
            <div className="handover-header">
              <h2>Entrega de Turno 📝</h2>
              <button
                className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
                onClick={handleCopy}
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 12px 0" }}>
              Copia y envía por WhatsApp o correo al siguiente turno.
            </p>
            <pre className="handover-preview-box">{generateHandover()}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
