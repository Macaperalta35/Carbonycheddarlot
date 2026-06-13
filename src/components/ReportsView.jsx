import React, { useState, useMemo } from "react";

// ── Formatters ─────────────────────────────────────────────────
const fCLP = (v) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v || 0);

const fShort = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
  return `$${v || 0}`;
};

// ── Period bounds ───────────────────────────────────────────────
function getBounds(period, customFrom, customTo) {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (period === "today")  return { from: today.getTime(), to: now.getTime() };
  if (period === "week") {
    const d = new Date(today);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return { from: d.getTime(), to: now.getTime() };
  }
  if (period === "month")  return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: now.getTime() };
  if (period === "year")   return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: now.getTime() };
  if (period === "custom") {
    return {
      from: customFrom ? new Date(customFrom).getTime() : 0,
      to:   customTo   ? new Date(customTo + "T23:59:59").getTime() : now.getTime(),
    };
  }
  return { from: 0, to: now.getTime() };
}

function getPrevBounds(period) {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (period === "today") {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    return { from: y.getTime(), to: y.getTime() + 86399999 };
  }
  if (period === "week") {
    const d = new Date(today);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day) - 7);
    return { from: d.getTime(), to: d.getTime() + 7 * 86400000 - 1 };
  }
  if (period === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: d.getTime(), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime() };
  }
  if (period === "year") {
    const d = new Date(now.getFullYear() - 1, 0, 1);
    return { from: d.getTime(), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999).getTime() };
  }
  return { from: 0, to: 0 };
}

// ── Chart data builder ─────────────────────────────────────────
function buildChartData(orders, period, bounds) {
  const now = new Date();
  const DAY_MS = 86400000;

  if (period === "today") {
    return Array.from({ length: 18 }, (_, i) => {
      const h = i + 6; // 06:00 → 23:00
      const val = orders.filter(o => o.timestamp && new Date(o.timestamp).getHours() === h)
                        .reduce((s, o) => s + o.total, 0);
      return { label: `${h}h`, value: val, isNow: h === now.getHours() };
    });
  }
  if (period === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
      const val = orders.filter(o => o.timestamp && o.timestamp >= d.getTime() && o.timestamp < d.getTime() + DAY_MS)
                        .reduce((s, o) => s + o.total, 0);
      const labels = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      return { label: labels[d.getDay()], value: val, isNow: d.toDateString() === now.toDateString() };
    });
  }
  if (period === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      const val = orders.filter(o => o.timestamp && o.timestamp >= d.getTime() && o.timestamp < d.getTime() + DAY_MS)
                        .reduce((s, o) => s + o.total, 0);
      return { label: `${i + 1}`, value: val, isNow: i + 1 === now.getDate() };
    });
  }
  if (period === "year") {
    const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(now.getFullYear(), i, 1).getTime();
      const to   = new Date(now.getFullYear(), i + 1, 1).getTime();
      const val  = orders.filter(o => o.timestamp && o.timestamp >= from && o.timestamp < to)
                         .reduce((s, o) => s + o.total, 0);
      return { label: MONTHS[i], value: val, isNow: i === now.getMonth() };
    });
  }
  // custom → daily breakdown
  if (bounds.from) {
    const days = Math.max(1, Math.ceil((bounds.to - bounds.from) / DAY_MS));
    const count = Math.min(days, 31);
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(bounds.from + i * DAY_MS); d.setHours(0, 0, 0, 0);
      const val = orders.filter(o => o.timestamp && o.timestamp >= d.getTime() && o.timestamp < d.getTime() + DAY_MS)
                        .reduce((s, o) => s + o.total, 0);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: val, isNow: d.toDateString() === now.toDateString() };
    });
  }
  return [];
}

// ── BarChart component ─────────────────────────────────────────
function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const bestVal = Math.max(...data.map(d => d.value));
  return (
    <div className="bc-chart">
      {data.map((d, i) => (
        <div key={i} className={`bc-col${d.isNow ? " bc-col-now" : ""}`}>
          <span className="bc-val">{d.value > 0 ? fShort(d.value) : ""}</span>
          <div className="bc-bar-wrap">
            <div
              className={`bc-bar${d.isNow ? " bc-bar-now" : ""}${d.value === bestVal && bestVal > 0 ? " bc-bar-best" : ""}`}
              style={{ height: `${(d.value / maxVal) * 100}%` }}
              title={fCLP(d.value)}
            />
          </div>
          <span className="bc-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────
const PERIODS = [
  { id: "today",  label: "Hoy" },
  { id: "week",   label: "Semana" },
  { id: "month",  label: "Este Mes" },
  { id: "year",   label: "Este Año" },
  { id: "custom", label: "Personalizado" },
];

const PERIOD_LABEL = {
  today: "del día", week: "de la semana", month: "del mes", year: "del año", custom: "del período",
};

// ── Main component ─────────────────────────────────────────────
export default function ReportsView({ menu, orders, egresos = [], compras = [] }) {
  const [period,     setPeriod]     = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [reportTab,  setReportTab]  = useState("resumen");
  const [copied,     setCopied]     = useState(false);

  const now = new Date();

  const bounds     = useMemo(() => getBounds(period, customFrom, customTo), [period, customFrom, customTo]);
  const prevBounds = useMemo(() => getPrevBounds(period), [period]);

  const allCompleted = useMemo(() => orders.filter(o => o.status === "Completado"), [orders]);

  const filtered = useMemo(() =>
    allCompleted.filter(o => o.timestamp && o.timestamp >= bounds.from && o.timestamp <= bounds.to),
    [allCompleted, bounds]);

  const prevFiltered = useMemo(() =>
    allCompleted.filter(o => o.timestamp && o.timestamp >= prevBounds.from && o.timestamp <= prevBounds.to),
    [allCompleted, prevBounds]);

  // ── Métricas del período ─────────────────────────────────────
  const totalVentas  = filtered.reduce((s, o) => s + o.total, 0);
  const totalCount   = filtered.length;
  const avgTicket    = totalCount > 0 ? Math.round(totalVentas / totalCount) : 0;
  const prevVentas   = prevFiltered.reduce((s, o) => s + o.total, 0);
  const growth       = prevVentas > 0 ? ((totalVentas - prevVentas) / prevVentas) * 100 : null;

  const totalEgresos = egresos.reduce((s, e) => s + e.amount, 0);
  const totalCompras = compras.reduce((s, c) => s + c.total, 0);
  const totalGastos  = totalEgresos + totalCompras;
  const utilidadNeta = totalVentas - totalGastos;

  const payBreakdown = filtered.reduce((acc, o) => {
    const m = o.paymentMethod || "Efectivo";
    acc[m] = (acc[m] || 0) + o.total;
    return acc;
  }, { Efectivo: 0, Tarjeta: 0, Transferencia: 0, "QR / Webpay": 0 });

  const productSales = filtered.reduce((acc, o) => {
    (o.items || []).forEach(i => { acc[i.name] = (acc[i.name] || 0) + i.qty; });
    return acc;
  }, {});
  const topItems = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const egresosByCat = egresos.reduce((acc, e) => {
    const k = e.category?.split("/")[0].trim() || "Otros";
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});
  const topEgresos = Object.entries(egresosByCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const lowStock = menu.filter(i => i.stock < 5);

  // ── Chart data ───────────────────────────────────────────────
  const chartData = useMemo(() => buildChartData(allCompleted, period, bounds), [allCompleted, period, bounds]);

  // ── Proyección ───────────────────────────────────────────────
  const projection = useMemo(() => {
    if (totalVentas === 0) return null;
    if (period === "month") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const elapsed = now.getDate();
      const pace = totalVentas / elapsed;
      const projected = Math.round(pace * daysInMonth);
      return { projected, pace: Math.round(pace), elapsed: `${elapsed} de ${daysInMonth} días`, remaining: projected - totalVentas, paceLabel: "/día" };
    }
    if (period === "year") {
      const elapsed = now.getMonth() + 1;
      const pace = totalVentas / elapsed;
      const projected = Math.round(pace * 12);
      return { projected, pace: Math.round(pace), elapsed: `${elapsed} de 12 meses`, remaining: projected - totalVentas, paceLabel: "/mes" };
    }
    if (period === "week") {
      const elapsed = now.getDay() === 0 ? 7 : now.getDay();
      const pace = totalVentas / elapsed;
      const projected = Math.round(pace * 7);
      return { projected, pace: Math.round(pace), elapsed: `${elapsed} de 7 días`, remaining: projected - totalVentas, paceLabel: "/día" };
    }
    return null;
  }, [totalVentas, period]);

  // ── Estadísticas históricas ──────────────────────────────────
  const historicalStats = useMemo(() => {
    const dayMap = {};
    allCompleted.forEach(o => {
      if (!o.timestamp) return;
      const key = new Date(o.timestamp).toLocaleDateString("es-CL");
      dayMap[key] = (dayMap[key] || 0) + o.total;
    });
    const entries = Object.entries(dayMap).sort((a, b) => b[1] - a[1]);
    const avg = entries.length ? Math.round(entries.reduce((s, [, v]) => s + v, 0) / entries.length) : 0;
    return { best: entries[0] || null, worst: entries[entries.length - 1] || null, avg, days: entries.length };
  }, [allCompleted]);

  const hourPeak = useMemo(() => {
    const map = Array(24).fill(0);
    filtered.forEach(o => { if (o.timestamp) map[new Date(o.timestamp).getHours()] += o.total; });
    const peak = map.indexOf(Math.max(...map));
    return { hour: peak, total: map[peak] };
  }, [filtered]);

  // ── Entrega de turno ─────────────────────────────────────────
  const generateHandover = () => {
    const date = now.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const sep = "=====================================";
    let t = `${sep}\n ENTREGA DE TURNO — CARBON & CHEDDAR\n Fecha: ${date}\n Período: ${PERIOD_LABEL[period]}\n${sep}\n\n`;
    t += `VENTAS ${PERIOD_LABEL[period].toUpperCase()}:\n`;
    t += `  Ingresos Totales: ${fCLP(totalVentas)}\n  Pedidos Cerrados: ${totalCount}\n  Ticket Promedio:  ${fCLP(avgTicket)}\n`;
    if (growth !== null) t += `  vs anterior: ${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%\n`;
    t += `\nDESGLOSE MEDIOS DE PAGO:\n`;
    Object.entries(payBreakdown).forEach(([k, v]) => { if (v > 0) t += `  ${k}: ${fCLP(v)}\n`; });
    t += `\nPRODUCTOS MÁS VENDIDOS:\n`;
    topItems.length === 0 ? (t += `  Sin ventas.\n`) : topItems.forEach(([n, q], i) => { t += `  ${i + 1}. ${n}: ${q} u.\n`; });
    t += `\nSTOCK CRÍTICO (< 5 u.):\n`;
    lowStock.length === 0 ? (t += `  ✓ Inventario normal.\n`) : lowStock.forEach(i => { t += `  ⚠️ ${i.emoji} ${i.name}: ${i.stock} u.\n`; });
    if (projection) {
      t += `\nPROYECCIÓN DEL PERÍODO:\n  Ritmo: ${fCLP(projection.pace)}${projection.paceLabel}\n  Proyección total: ${fCLP(projection.projected)}\n`;
    }
    t += `\n${sep}\n Generado por Carbon & Cheddar POS — Lilith`;
    return t;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateHandover())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); })
      .catch(() => alert("No se pudo copiar."));
  };

  const pLabel = PERIOD_LABEL[period];

  return (
    <div className="reports-container fade-in">
      <header className="reports-header">
        <h1>Informes & Proyecciones 📊</h1>
        <p className="subtitle">Analiza el rendimiento por período y proyecta las ventas</p>
      </header>

      {/* ── Selector de período ── */}
      <div className="period-selector">
        {PERIODS.map(p => (
          <button
            key={p.id}
            className={`period-btn${period === p.id ? " active" : ""}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="custom-range">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="filter-date" />
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className="filter-date" />
          </div>
        )}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="report-subtabs">
        {[
          { id: "resumen",    label: "📊 Resumen" },
          { id: "tendencias", label: "📈 Tendencias & Proyecciones" },
          { id: "turno",      label: "📝 Entrega de Turno" },
        ].map(t => (
          <button
            key={t.id}
            className={`report-subtab-btn${reportTab === t.id ? " active" : ""}`}
            onClick={() => setReportTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ RESUMEN ════════════════ */}
      {reportTab === "resumen" && (
        <>
          <div className="metrics-grid metrics-grid-4">
            <div className="metric-card card-primary">
              <span className="metric-icon">💰</span>
              <div className="metric-info">
                <h3>Ingresos {pLabel}</h3>
                <p className="metric-value">{fCLP(totalVentas)}</p>
                <p className="metric-desc">
                  {growth !== null
                    ? <span style={{ color: growth >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                        {growth >= 0 ? "▲" : "▼"} {Math.abs(growth).toFixed(1)}% vs anterior
                      </span>
                    : "IVA incluido"}
                </p>
              </div>
            </div>
            <div className="metric-card card-danger">
              <span className="metric-icon">💸</span>
              <div className="metric-info">
                <h3>Total Gastos</h3>
                <p className="metric-value">{fCLP(totalGastos)}</p>
                <p className="metric-desc">Egresos + Compras</p>
              </div>
            </div>
            <div className={`metric-card ${utilidadNeta >= 0 ? "card-success" : "card-danger"}`}>
              <span className="metric-icon">{utilidadNeta >= 0 ? "📈" : "📉"}</span>
              <div className="metric-info">
                <h3>{utilidadNeta >= 0 ? "Utilidad Neta" : "Pérdida Neta"}</h3>
                <p className="metric-value" style={{ color: utilidadNeta >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                  {fCLP(Math.abs(utilidadNeta))}
                </p>
                <p className="metric-desc">Ventas − Gastos</p>
              </div>
            </div>
            <div className="metric-card card-info">
              <span className="metric-icon">🧾</span>
              <div className="metric-info">
                <h3>Pedidos Cerrados</h3>
                <p className="metric-value">{totalCount}</p>
                <p className="metric-desc">Ticket promedio: {fCLP(avgTicket)}</p>
              </div>
            </div>
          </div>

          <div className="reports-details-grid">
            <div className="details-col-left">
              <div className="report-card">
                <h2>Métodos de Pago</h2>
                <div className="payment-distribution">
                  <div className="distribution-bar">
                    {totalVentas > 0 ? (
                      <>
                        <div className="bar-segment cash"     style={{ width: `${(payBreakdown.Efectivo / totalVentas) * 100}%` }} />
                        <div className="bar-segment card"     style={{ width: `${(payBreakdown.Tarjeta / totalVentas) * 100}%` }} />
                        <div className="bar-segment transfer" style={{ width: `${(payBreakdown.Transferencia / totalVentas) * 100}%` }} />
                        <div className="bar-segment qr"       style={{ width: `${((payBreakdown["QR / Webpay"] || 0) / totalVentas) * 100}%` }} />
                      </>
                    ) : <div className="bar-segment empty" style={{ width: "100%" }} />}
                  </div>
                  <div className="payment-legend">
                    <div className="legend-item"><span className="color-dot cash" /> Efectivo: {fCLP(payBreakdown.Efectivo)}</div>
                    <div className="legend-item"><span className="color-dot card" /> Tarjeta: {fCLP(payBreakdown.Tarjeta)}</div>
                    <div className="legend-item"><span className="color-dot transfer" /> Transf.: {fCLP(payBreakdown.Transferencia)}</div>
                    {(payBreakdown["QR / Webpay"] || 0) > 0 && (
                      <div className="legend-item"><span className="color-dot qr" /> QR: {fCLP(payBreakdown["QR / Webpay"])}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="report-card">
                <h2>Productos Más Vendidos 🔥</h2>
                {topItems.length === 0
                  ? <p style={{ color: "var(--text-muted)" }}>Sin datos en este período.</p>
                  : <div className="popular-items-list">
                      {topItems.map(([name, qty], i) => (
                        <div key={i} className="popular-item-row">
                          <span className="popular-rank">#{i + 1}</span>
                          <span className="popular-name">{name}</span>
                          <span className="popular-qty badge badge-success">{qty} u.</span>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {topEgresos.length > 0 && (
                <div className="report-card">
                  <h2>Egresos por Categoría 💸</h2>
                  <div className="popular-items-list">
                    {topEgresos.map(([cat, total], i) => (
                      <div key={i} className="popular-item-row">
                        <span className="popular-rank">#{i + 1}</span>
                        <span className="popular-name">{cat}</span>
                        <span className="popular-qty badge badge-warning">{fCLP(total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="details-col-right">
              <div className="report-card">
                <h2>Stock Crítico ⚠️</h2>
                {lowStock.length === 0
                  ? <p style={{ color: "var(--color-success)" }}>✓ Inventario en niveles normales.</p>
                  : <div className="popular-items-list">
                      {lowStock.map(item => (
                        <div key={item.id} className="popular-item-row">
                          <span style={{ fontSize: "1.2rem" }}>{item.emoji}</span>
                          <span className="popular-name">{item.name}</span>
                          <span className="popular-qty badge badge-danger">{item.stock} u.</span>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ TENDENCIAS & PROYECCIONES ════════════════ */}
      {reportTab === "tendencias" && (
        <div className="tendencias-section">

          {/* Gráfico de barras */}
          <div className="report-card">
            <h2>
              {period === "today"  ? "⏱️ Ventas por Hora — Hoy"
               : period === "week"  ? "📅 Últimos 7 Días"
               : period === "month" ? `📅 Días del Mes — ${now.toLocaleString("es-CL", { month: "long", year: "numeric" })}`
               : period === "year"  ? `📅 Ventas Mensuales — ${now.getFullYear()}`
               : "📅 Evolución del Período"}
            </h2>
            {chartData.every(d => d.value === 0)
              ? <p style={{ color: "var(--text-muted)", padding: "24px 0" }}>Sin datos de ventas en este período.</p>
              : <BarChart data={chartData} />
            }
            <div className="bc-legend">
              <span><span className="bc-dot bc-dot-normal" /> Día normal</span>
              <span><span className="bc-dot bc-dot-now" /> Hoy / actual</span>
              <span><span className="bc-dot bc-dot-best" /> Mejor valor</span>
            </div>
          </div>

          {/* Proyección */}
          {projection && (
            <div className="report-card">
              <h2>🔮 Proyección del Período</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 20px" }}>
                Estimación basada en el ritmo actual de ventas para el período completo.
              </p>
              <div className="projection-grid">
                <div className="proj-item proj-highlight">
                  <span className="proj-lbl">Proyección total</span>
                  <span className="proj-val">{fCLP(projection.projected)}</span>
                </div>
                <div className="proj-item">
                  <span className="proj-lbl">Ritmo actual</span>
                  <span className="proj-val">{fCLP(projection.pace)}<small style={{ fontSize: "0.7em", color: "var(--text-muted)" }}>{projection.paceLabel}</small></span>
                </div>
                <div className="proj-item">
                  <span className="proj-lbl">Transcurrido</span>
                  <span className="proj-val" style={{ fontSize: "1rem" }}>{projection.elapsed}</span>
                </div>
                <div className="proj-item">
                  <span className="proj-lbl">Restante esperado</span>
                  <span className="proj-val" style={{ color: "var(--color-success)" }}>{fCLP(projection.remaining)}</span>
                </div>
              </div>
              <div className="proj-progress-wrap">
                <div className="proj-progress-bar">
                  <div className="proj-progress-fill" style={{ width: `${Math.min((totalVentas / projection.projected) * 100, 100)}%` }} />
                </div>
                <div className="proj-progress-labels">
                  <span>Actual: {fCLP(totalVentas)}</span>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                    {Math.round((totalVentas / projection.projected) * 100)}% del objetivo
                  </span>
                  <span>Proyectado: {fCLP(projection.projected)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Explosión de ventas */}
          <div className="report-card">
            <h2>💥 Explosión de Ventas</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 20px" }}>
              Indicadores clave para detectar tendencias y oportunidades.
            </p>
            <div className="explosion-grid">

              {growth !== null && (
                <div className="explosion-card">
                  <span className="explosion-icon">{growth >= 0 ? "📈" : "📉"}</span>
                  <span className="explosion-label">vs Período Anterior</span>
                  <span className={`explosion-value ${growth >= 0 ? "val-up" : "val-down"}`}>
                    {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
                  </span>
                  <span className="explosion-sub">Ant: {fCLP(prevVentas)} → Act: {fCLP(totalVentas)}</span>
                </div>
              )}

              <div className="explosion-card">
                <span className="explosion-icon">🧾</span>
                <span className="explosion-label">Ticket Promedio</span>
                <span className="explosion-value">{fCLP(avgTicket)}</span>
                <span className="explosion-sub">{totalCount} pedidos en el período</span>
              </div>

              {hourPeak.total > 0 && (
                <div className="explosion-card">
                  <span className="explosion-icon">⏰</span>
                  <span className="explosion-label">Hora Pico</span>
                  <span className="explosion-value">{hourPeak.hour}:00 h</span>
                  <span className="explosion-sub">{fCLP(hourPeak.total)} vendidos</span>
                </div>
              )}

              {historicalStats.best && (
                <div className="explosion-card">
                  <span className="explosion-icon">🏆</span>
                  <span className="explosion-label">Mejor Día Histórico</span>
                  <span className="explosion-value" style={{ fontSize: "1rem" }}>{historicalStats.best[0]}</span>
                  <span className="explosion-sub">{fCLP(historicalStats.best[1])}</span>
                </div>
              )}

              {historicalStats.avg > 0 && (
                <div className="explosion-card">
                  <span className="explosion-icon">📐</span>
                  <span className="explosion-label">Promedio Diario</span>
                  <span className="explosion-value">{fCLP(historicalStats.avg)}</span>
                  <span className="explosion-sub">En {historicalStats.days} días con ventas</span>
                </div>
              )}

              {projection && (
                <div className="explosion-card explosion-card-accent">
                  <span className="explosion-icon">🎯</span>
                  <span className="explosion-label">Meta del Período</span>
                  <span className="explosion-value">{fCLP(projection.projected)}</span>
                  <span className="explosion-sub">
                    {Math.round((totalVentas / projection.projected) * 100)}% alcanzado
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ════════════════ ENTREGA DE TURNO ════════════════ */}
      {reportTab === "turno" && (
        <div className="report-card handover-card" style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div className="handover-header">
            <div>
              <h2>Entrega de Turno 📝</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>
                Período: <strong>{PERIODS.find(p => p.id === period)?.label}</strong>
              </p>
            </div>
            <button
              className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
              onClick={handleCopy}
            >
              {copied ? "¡Copiado! ✓" : "Copiar"}
            </button>
          </div>
          <pre className="handover-preview-box">{generateHandover()}</pre>
        </div>
      )}
    </div>
  );
}
