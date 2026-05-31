import React, { useState } from "react";

export default function ReportsView({ menu, orders }) {
  const [copied, setCopied] = useState(false);

  // Filtrar solo órdenes completadas
  const completedOrders = orders.filter(o => o.status === "Completado");

  // Métricas Generales
  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCount = completedOrders.length;
  const avgTicket = totalCount > 0 ? Math.round(totalSales / totalCount) : 0;

  // Desglose de Métodos de Pago
  const paymentBreakdown = completedOrders.reduce((acc, o) => {
    const method = o.paymentMethod || "Efectivo";
    acc[method] = (acc[method] || 0) + o.total;
    return acc;
  }, { Efectivo: 0, Tarjeta: 0, Transferencia: 0 });

  // Productos más vendidos
  const productSales = completedOrders.reduce((acc, o) => {
    o.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + item.qty;
    });
    return acc;
  }, {});

  const sortedPopularItems = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Alertas de Stock Bajo (< 5 unidades)
  const lowStockItems = menu.filter(item => item.stock < 5);

  const formatCLP = (value) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0
    }).format(value);
  };

  // Generar nota de entrega de turno
  const generateHandoverText = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    let text = `====================================\n`;
    text += `ENTREGA DE TURNO - CARBON & CHEDDAR LOTA\n`;
    text += `Fecha/Hora: ${formattedDate}\n`;
    text += `====================================\n\n`;
    
    text += `RESUMEN DE VENTAS DEL DÍA:\n`;
    text += `- Ventas Totales (IVA Inc.): ${formatCLP(totalSales)}\n`;
    text += `- Total de Pedidos: ${totalCount}\n`;
    text += `- Ticket Promedio: ${formatCLP(avgTicket)}\n\n`;

    text += `DESGLOSE POR MEDIO DE PAGO:\n`;
    text += `- Efectivo: ${formatCLP(paymentBreakdown.Efectivo)}\n`;
    text += `- Tarjeta: ${formatCLP(paymentBreakdown.Tarjeta)}\n`;
    text += `- Transferencia: ${formatCLP(paymentBreakdown.Transferencia)}\n\n`;

    text += `PRODUCTOS MÁS VENDIDOS:\n`;
    if (sortedPopularItems.length === 0) {
      text += `- Sin ventas registradas aún.\n`;
    } else {
      sortedPopularItems.forEach(([name, qty]) => {
        text += `- ${name}: ${qty} unidades\n`;
      });
    }
    text += `\n`;

    text += `ALERTAS DE STOCK CRÍTICO (< 5 unidades):\n`;
    if (lowStockItems.length === 0) {
      text += `- Todo el inventario se encuentra en niveles normales. ¡Excelente!\n`;
    } else {
      lowStockItems.forEach(item => {
        text += `- [${item.emoji}] ${item.name}: ¡Solo quedan ${item.stock} unidades!\n`;
      });
    }
    text += `\n====================================\n`;
    text += `Generado por AntiGravity POS`;

    return text;
  };

  const handleCopyHandover = () => {
    const text = generateHandoverText();
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => {
        console.error("Error al copiar texto: ", err);
        alert("No se pudo copiar el texto. Copia el borrador del cuadro de vista previa.");
      });
  };

  return (
    <div className="reports-container fade-in">
      <header className="reports-header">
        <h1>Informes & Cierre de Caja 📊</h1>
        <p className="subtitle">Visualiza el rendimiento de hoy y genera notas para la entrega de turno</p>
      </header>

      {/* Tarjetas de Métricas Principales */}
      <div className="metrics-grid">
        <div className="metric-card card-primary">
          <span className="metric-icon">💰</span>
          <div className="metric-info">
            <h3>Ingresos Totales</h3>
            <p className="metric-value">{formatCLP(totalSales)}</p>
            <p className="metric-desc">19% IVA incluido</p>
          </div>
        </div>

        <div className="metric-card card-success">
          <span className="metric-icon">🧾</span>
          <div className="metric-info">
            <h3>Pedidos Cerrados</h3>
            <p className="metric-value">{totalCount}</p>
            <p className="metric-desc">Presenciales + Retiros en línea</p>
          </div>
        </div>

        <div className="metric-card card-info">
          <span className="metric-icon">📈</span>
          <div className="metric-info">
            <h3>Ticket Promedio</h3>
            <p className="metric-value">{formatCLP(avgTicket)}</p>
            <p className="metric-desc">Monto promedio por compra</p>
          </div>
        </div>
      </div>

      <div className="reports-details-grid">
        {/* Desglose de Métodos de Pago y Productos Más Vendidos */}
        <div className="details-col-left">
          <div className="report-card">
            <h2>Métodos de Pago</h2>
            <div className="payment-distribution">
              <div className="distribution-bar">
                {totalSales > 0 ? (
                  <>
                    <div 
                      className="bar-segment cash" 
                      style={{ width: `${(paymentBreakdown.Efectivo / totalSales) * 100}%` }}
                      title={`Efectivo: ${formatCLP(paymentBreakdown.Efectivo)}`}
                    />
                    <div 
                      className="bar-segment card" 
                      style={{ width: `${(paymentBreakdown.Tarjeta / totalSales) * 100}%` }}
                      title={`Tarjeta: ${formatCLP(paymentBreakdown.Tarjeta)}`}
                    />
                    <div 
                      className="bar-segment transfer" 
                      style={{ width: `${(paymentBreakdown.Transferencia / totalSales) * 100}%` }}
                      title={`Transferencia: ${formatCLP(paymentBreakdown.Transferencia)}`}
                    />
                  </>
                ) : (
                  <div className="bar-segment empty" style={{ width: "100%" }} />
                )}
              </div>
              <div className="payment-legend">
                <div className="legend-item"><span className="color-dot cash" /> Efectivo: {formatCLP(paymentBreakdown.Efectivo)}</div>
                <div className="legend-item"><span className="color-dot card" /> Tarjeta: {formatCLP(paymentBreakdown.Tarjeta)}</div>
                <div className="legend-item"><span className="color-dot transfer" /> Transferencia: {formatCLP(paymentBreakdown.Transferencia)}</div>
              </div>
            </div>
          </div>

          <div className="report-card">
            <h2>Productos Más Vendidos 🔥</h2>
            {sortedPopularItems.length === 0 ? (
              <p className="light-text">Sin datos de ventas para hoy.</p>
            ) : (
              <div className="popular-items-list">
                {sortedPopularItems.map(([name, qty], idx) => (
                  <div key={idx} className="popular-item-row">
                    <span className="popular-rank">#{idx + 1}</span>
                    <span className="popular-name">{name}</span>
                    <span className="popular-qty badge badge-success">{qty} u.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Borrador Entrega de Turno */}
        <div className="details-col-right">
          <div className="report-card handover-card">
            <div className="handover-header">
              <h2>Borrador de Entrega de Turno 📝</h2>
              <button 
                className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
                onClick={handleCopyHandover}
              >
                {copied ? "¡Copiado!" : "Copiar Borrador"}
              </button>
            </div>
            <p className="light-text">Copia esta minuta rápida para enviar por WhatsApp o correo al siguiente turno.</p>
            
            <pre className="handover-preview-box">
              {generateHandoverText()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
