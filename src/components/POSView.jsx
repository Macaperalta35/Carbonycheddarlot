import React, { useState, useEffect } from "react";
import { btPrinter } from "../services/bluetoothPrinter";

export default function POSView({ menu, setMenu, orders, setOrders, currentUserRole }) {
  const [activeCategory, setActiveCategory]   = useState("All");
  const [searchQuery,    setSearchQuery]       = useState("");
  const [ticketItems,    setTicketItems]       = useState([]);
  const [selectedTable,  setSelectedTable]     = useState("Mesa 1");
  const [discountPercent,setDiscountPercent]   = useState(0);
  const [orderNotes,     setOrderNotes]        = useState("");
  const [activeTab,      setActiveTab]         = useState("sales");

  // Variantes
  const [variantModalItem, setVariantModalItem] = useState(null);

  // Edición de ítem del ticket
  const [editingItem,   setEditingItem]   = useState(null);
  const [itemEditQty,   setItemEditQty]   = useState(1);
  const [itemEditDisc,  setItemEditDisc]  = useState(0);

  // Cobro
  const [isCheckoutOpen,  setIsCheckoutOpen]  = useState(false);
  const [paymentMethod,   setPaymentMethod]   = useState("Efectivo");
  const [cashAmount,      setCashAmount]      = useState("");
  const [completedOrder,  setCompletedOrder]  = useState(null);
  const [btPrinting,      setBtPrinting]      = useState(false);

  // Estado de impresora Bluetooth
  const [printerState, setPrinterState] = useState({
    connected: btPrinter.connected,
    name: btPrinter.name,
    profile: btPrinter.profile,
  });

  useEffect(() => {
    const unsub = btPrinter.subscribe(setPrinterState);
    return unsub;
  }, []);

  const tables     = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6", "Para Llevar"];
  const categories = ["All", ...new Set(menu.map(item => item.category).filter(Boolean))];
  const QUICK_CASH = [1000, 2000, 5000, 10000, 20000, 50000];

  const filteredMenu = menu.filter(item => {
    const matchCat    = activeCategory === "All" || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  /* ─── Ticket ─────────────────────────────────────────────── */
  const addToTicket = (item, chosenVariant = null) => {
    if (item.stock <= 0) { alert("Sin stock disponible."); return; }

    if (item.variants && item.variants.length > 0 && !chosenVariant) {
      setVariantModalItem(item);
      return;
    }

    const finalId    = chosenVariant ? `${item.id}_${chosenVariant.name}` : item.id;
    const finalName  = chosenVariant ? `${item.name} (${chosenVariant.name})` : item.name;
    const finalPrice = chosenVariant ? chosenVariant.price : item.price;

    const totalQtyInTicket = ticketItems
      .filter(i => i.id === item.id)
      .reduce((s, i) => s + i.qty, 0);

    if (totalQtyInTicket >= item.stock) {
      alert(`Stock máximo alcanzado para ${item.name} (${item.stock} u.)`);
      return;
    }

    const existing = ticketItems.find(i => i.ticketId === finalId);
    if (existing) {
      setTicketItems(ticketItems.map(i =>
        i.ticketId === finalId ? { ...i, qty: i.qty + 1 } : i
      ));
    } else {
      setTicketItems([...ticketItems, {
        ...item,
        ticketId: finalId,
        name:     finalName,
        price:    finalPrice,
        qty:      1,
        itemDiscountPercent: 0,
      }]);
    }
    setVariantModalItem(null);
  };

  const updateTicketQty = (ticketId, change) => {
    const ticketItem = ticketItems.find(i => i.ticketId === ticketId);
    const menuItem   = menu.find(i => i.id === ticketItem.id);
    if (!ticketItem || !menuItem) return;

    const newQty = ticketItem.qty + change;
    if (newQty <= 0) {
      setTicketItems(ticketItems.filter(i => i.ticketId !== ticketId));
      return;
    }

    const otherQty = ticketItems
      .filter(i => i.id === ticketItem.id && i.ticketId !== ticketId)
      .reduce((s, i) => s + i.qty, 0);

    if (otherQty + newQty > menuItem.stock) {
      alert(`Límite de stock: ${menuItem.name} (${menuItem.stock} u.)`);
      return;
    }
    setTicketItems(ticketItems.map(i => i.ticketId === ticketId ? { ...i, qty: newQty } : i));
  };

  const removeTicketItem = (ticketId) =>
    setTicketItems(ticketItems.filter(i => i.ticketId !== ticketId));

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemEditQty(item.qty);
    setItemEditDisc(item.itemDiscountPercent || 0);
  };

  const saveItemEdit = (e) => {
    e.preventDefault();
    const menuItem = menu.find(i => i.id === editingItem.id);
    if (!menuItem) return;

    const otherQty = ticketItems
      .filter(i => i.id === editingItem.id && i.ticketId !== editingItem.ticketId)
      .reduce((s, i) => s + i.qty, 0);

    if (otherQty + itemEditQty > menuItem.stock) {
      alert(`Stock insuficiente. Disponible: ${menuItem.stock} u.`);
      return;
    }

    setTicketItems(ticketItems.map(i =>
      i.ticketId === editingItem.ticketId
        ? { ...i, qty: itemEditQty, itemDiscountPercent: itemEditDisc }
        : i
    ));
    setEditingItem(null);
  };

  /* ─── Combo ──────────────────────────────────────────────── */
  const detectCombo = () =>
    ticketItems.some(i => i.category === "Hamburguesas" || i.category === "Milanesas") &&
    ticketItems.some(i => i.category === "Papas Fritas") &&
    ticketItems.some(i => i.category === "Bebidas & Café");

  /* ─── Totales ─────────────────────────────────────────────── */
  const getLineSubtotal = (item) => {
    const base = item.price * item.qty;
    return base - Math.round(base * ((item.itemDiscountPercent || 0) / 100));
  };

  const subtotal       = ticketItems.reduce((s, i) => s + getLineSubtotal(i), 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total          = subtotal - discountAmount;

  /* ─── Cobro ───────────────────────────────────────────────── */
  const handleOpenCheckout = () => {
    if (ticketItems.length === 0) return;
    setIsCheckoutOpen(true);
    setCashAmount(total.toString());
  };

  const handleCheckoutComplete = () => {
    const cash = parseFloat(cashAmount);
    if (paymentMethod === "Efectivo" && (isNaN(cash) || cash < total)) {
      alert("El monto de efectivo es insuficiente.");
      return;
    }

    const orderNumber = orders.length + 1;
    const newOrder = {
      id:            Date.now(),
      number:        orderNumber,
      type:          selectedTable === "Para Llevar" ? "Llevar" : "Mesa",
      table:         selectedTable === "Para Llevar" ? "" : selectedTable,
      items:         ticketItems.map(i => ({
        id:   i.id, ticketId: i.ticketId, name: i.name,
        price: i.price, qty: i.qty, emoji: i.emoji,
        itemDiscountPercent: i.itemDiscountPercent || 0,
      })),
      discount:      discountAmount,
      total:         total,
      paymentMethod: paymentMethod,
      cashReceived:  paymentMethod === "Efectivo" ? cash : null,
      notes:         orderNotes.trim(),
      status:        "Completado",
      timestamp:     Date.now(),
    };

    // Descontar stock
    const updatedMenu = menu.map(menuItem => {
      const qty = ticketItems
        .filter(i => i.id === menuItem.id)
        .reduce((s, i) => s + i.qty, 0);
      return qty > 0 ? { ...menuItem, stock: Math.max(0, menuItem.stock - qty) } : menuItem;
    });

    setMenu(updatedMenu);
    setOrders([...orders, newOrder]);
    setCompletedOrder(newOrder);
    setTicketItems([]);
    setDiscountPercent(0);
    setOrderNotes("");
    setIsCheckoutOpen(false);
  };

  /* ─── Pedidos Online ─────────────────────────────────────── */
  const handleAcceptOnline = (id) =>
    setOrders(orders.map(o => o.id === id ? { ...o, status: "Preparando" } : o));

  const handleCompleteOnline = (id, method) => {
    setOrders(orders.map(o => {
      if (o.id === id) {
        const done = { ...o, status: "Completado", paymentMethod: method };
        setCompletedOrder(done);
        return done;
      }
      return o;
    }));
  };

  /* ─── Impresión Bluetooth ───────────────────────────────── */
  const handleBTConnect = async () => {
    try {
      await btPrinter.connect();
      alert(`Impresora conectada: ${btPrinter.name}`);
    } catch (err) {
      alert(`Error al conectar impresora:\n${err.message}`);
    }
  };

  const handleBTPrint = async (order) => {
    if (!printerState.connected) {
      alert("Impresora no conectada. Usa el botón \"Conectar Impresora\" primero.");
      return;
    }
    setBtPrinting(true);
    try {
      await btPrinter.printReceipt(order);
    } catch (err) {
      alert(`Error al imprimir:\n${err.message}`);
    } finally {
      setBtPrinting(false);
    }
  };

  /* ─── Formato ──────────────────────────────────────────── */
  const formatCLP = (v) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency", currency: "CLP", minimumFractionDigits: 0,
    }).format(v);

  const onlineOrders = orders.filter(o => o.type === "Para Retirar" && o.status !== "Completado");

  return (
    <div className="pos-layout">
      {/* ── Panel Izquierdo: Ticket ─────────────────────────── */}
      <div className="pos-left-panel">
        {/* Barra Bluetooth */}
        <div className="printer-bar">
          {printerState.connected ? (
            <div className="printer-connected-pill">
              🖨️ <span>{printerState.name}</span>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => btPrinter.disconnect()}
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button className="btn-printer-connect" onClick={handleBTConnect}>
              {btPrinter.isSupported() ? "🖨️ Conectar Impresora BT" : "⚠️ BT no disponible en este navegador"}
            </button>
          )}
        </div>

        {/* Pestañas del panel izquierdo */}
        <div className="pos-tab-headers">
          <button
            className={`tab-btn ${activeTab === "sales" ? "active" : ""}`}
            onClick={() => setActiveTab("sales")}
          >
            Ticket Actual
          </button>
          <button
            className={`tab-btn ${activeTab === "online-orders" ? "active" : ""}`}
            onClick={() => setActiveTab("online-orders")}
          >
            Pedidos Online{onlineOrders.length > 0 && (
              <span className="online-badge">{onlineOrders.length}</span>
            )}
          </button>
        </div>

        {activeTab === "sales" ? (
          <div className="ticket-container">
            {/* Mesa / Tipo */}
            <div className="ticket-meta">
              <label htmlFor="table-select" className="sr-only">Mesa</label>
              <select
                id="table-select"
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="select-table"
              >
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                className="btn-clear-ticket"
                onClick={() => { setTicketItems([]); setDiscountPercent(0); setOrderNotes(""); }}
                disabled={ticketItems.length === 0}
              >
                Limpiar
              </button>
            </div>

            {/* Ítems del ticket */}
            <div className="ticket-items">
              {ticketItems.length === 0 ? (
                <div className="ticket-empty">
                  <span>🛒</span>
                  <p>Ticket vacío. Agrega productos desde la grilla.</p>
                </div>
              ) : (
                ticketItems.map(item => {
                  const lineSub   = getLineSubtotal(item);
                  const hasDisc   = item.itemDiscountPercent > 0;
                  return (
                    <div key={item.ticketId} className="ticket-item-row">
                      <div
                        className="ticket-item-info clickable-row"
                        onClick={() => openEditItem(item)}
                        title="Clic para editar descuento o cantidad"
                        style={{ cursor: "pointer" }}
                      >
                        <span className="item-emoji">{item.emoji}</span>
                        <div>
                          <span className="item-name">{item.name}</span>
                          <span className="item-unit-price">
                            {formatCLP(item.price)} c/u
                            {hasDisc && (
                              <span className="text-warning"> (-{item.itemDiscountPercent}%)</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="ticket-item-actions">
                        <button className="btn-qty" onClick={() => updateTicketQty(item.ticketId, -1)}>-</button>
                        <span className="qty-text">{item.qty}</span>
                        <button className="btn-qty" onClick={() => updateTicketQty(item.ticketId, 1)}>+</button>
                        <span className="item-subtotal">{formatCLP(lineSub)}</span>
                        <button
                          className="btn-delete-row"
                          onClick={() => removeTicketItem(item.ticketId)}
                          title="Eliminar"
                        >🗑️</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Banner Combo */}
            {detectCombo() && discountPercent === 0 && (
              <div className="combo-banner pulse">
                <span>🔥 ¡Combo Detectado!</span>
                <button
                  className="btn btn-warning btn-xs"
                  onClick={() => { setDiscountPercent(10); alert("10% de descuento aplicado por Combo 🍔🍟🥤"); }}
                >
                  Aplicar 10% Desc.
                </button>
              </div>
            )}

            {/* Resumen */}
            <div className="ticket-summary">
              <div className="summary-row">
                <span>Subtotal (con desc. ítem):</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              <div className="summary-row discount-row">
                <span>Desc. general:</span>
                <div className="discount-input-wrapper">
                  <label htmlFor="disc-select" className="sr-only">Descuento General</label>
                  <select
                    id="disc-select"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(parseInt(e.target.value))}
                    className="select-discount"
                  >
                    {[0,5,10,15,20,25,30].map(v => (
                      <option key={v} value={v}>{v}%</option>
                    ))}
                  </select>
                  <span>-{formatCLP(discountAmount)}</span>
                </div>
              </div>
              <div className="summary-row total-row">
                <span>TOTAL (IVA inc.):</span>
                <span>{formatCLP(total)}</span>
              </div>

              {/* Notas de la orden */}
              <input
                type="text"
                className="ticket-notes-input"
                placeholder="Notas para cocina (opcional)..."
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
              />
            </div>

            <button
              className="btn btn-success btn-block btn-pay"
              onClick={handleOpenCheckout}
              disabled={ticketItems.length === 0}
            >
              Cobrar {formatCLP(total)}
            </button>
          </div>
        ) : (
          /* Pedidos Online */
          <div className="online-orders-container">
            {onlineOrders.length === 0 ? (
              <div className="ticket-empty">
                <span>🔔</span>
                <p>No hay pedidos online pendientes.</p>
              </div>
            ) : (
              <div className="online-orders-list">
                {onlineOrders.map(order => (
                  <div
                    key={order.id}
                    className={`online-order-card ${order.status === "Preparando" ? "preparing" : "pending"}`}
                  >
                    <div className="online-card-header">
                      <span className="order-number-badge">PEDIDO #{order.number}</span>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="online-card-client">
                      <p><strong>Cliente:</strong> {order.customerName}</p>
                      <p><strong>Fono:</strong> {order.phone}</p>
                      <p><strong>Retira:</strong> {order.pickupTime}</p>
                    </div>
                    <div className="online-card-items">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="online-item-line">
                          <span>{i.emoji} {i.name} x{i.qty}</span>
                          <span>{formatCLP(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="online-card-total">
                      <span>Total:</span>
                      <strong>{formatCLP(order.total)}</strong>
                    </div>
                    <div className="online-card-actions">
                      {order.status === "Pendiente" ? (
                        <button
                          className="btn btn-warning btn-block"
                          onClick={() => handleAcceptOnline(order.id)}
                        >
                          Aceptar y Preparar
                        </button>
                      ) : (
                        <div className="split-buttons">
                          <button className="btn btn-success" onClick={() => handleCompleteOnline(order.id, "Efectivo")}>
                            Entregar (Efectivo)
                          </button>
                          <button className="btn btn-primary" onClick={() => handleCompleteOnline(order.id, "Tarjeta")}>
                            Cobrar (Tarjeta)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel Derecho: Grilla de Menú ──────────────────── */}
      <div className="pos-menu-panel">
        <div className="menu-header-controls">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="btn-clear-search" onClick={() => setSearchQuery("")}>×</button>
            )}
          </div>
        </div>

        <div className="category-scroll">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === "All" ? "Todos" : cat}
            </button>
          ))}
        </div>

        <div className="pos-products-grid">
          {filteredMenu.map(item => {
            const qtyInTicket   = ticketItems.filter(i => i.id === item.id).reduce((s, i) => s + i.qty, 0);
            const available     = Math.max(0, item.stock - qtyInTicket);
            const isOut         = available <= 0;
            const isLow         = !isOut && available < 5;

            return (
              <button
                key={item.id}
                className={`pos-product-card ${isOut ? "out-of-stock" : ""}`}
                onClick={() => addToTicket(item)}
                disabled={isOut}
              >
                <span className="item-emoji">{item.emoji}</span>
                <span className="item-name">{item.name}</span>
                <span className="item-price">
                  {item.variants ? `Desde ${formatCLP(item.price)}` : formatCLP(item.price)}
                </span>
                {isOut ? (
                  <span className="stock-badge stock-critical">Sin Stock</span>
                ) : isLow ? (
                  <span className="stock-badge stock-warn">¡Solo {available}!</span>
                ) : (
                  <span className="stock-badge stock-normal">{available} u.</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Modal: Variantes ──────────────────────────────── */}
      {variantModalItem && (
        <div className="modal-backdrop">
          <div className="modal-content variant-select-modal fade-in">
            <h2>Seleccionar Tamaño</h2>
            <p>Elige el tamaño para <strong>{variantModalItem.name}</strong>:</p>
            <div className="variant-options-list">
              {variantModalItem.variants.map((v, i) => (
                <button
                  key={i}
                  className="variant-option-card"
                  onClick={() => addToTicket(variantModalItem, v)}
                >
                  <div className="variant-option-details">
                    <span className="variant-option-name">{v.name}</span>
                    <span className="variant-option-desc">Porción de papas fritas</span>
                  </div>
                  <span className="variant-option-price">{formatCLP(v.price)}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-block" onClick={() => setVariantModalItem(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar ítem ────────────────────────────── */}
      {editingItem && (
        <div className="modal-backdrop">
          <div className="modal-content ticket-item-edit-modal fade-in">
            <h2>Modificar Ítem</h2>
            <form onSubmit={saveItemEdit}>
              <div className="modal-body">
                <p style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 16px 0" }}>
                  {editingItem.emoji} {editingItem.name}
                </p>
                <div className="form-group">
                  <label>Cantidad</label>
                  <div className="qty-edit-wrapper">
                    <button
                      type="button"
                      className="btn-qty-big"
                      onClick={() => setItemEditQty(Math.max(1, itemEditQty - 1))}
                    >-</button>
                    <input
                      type="number"
                      value={itemEditQty}
                      onChange={e => setItemEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="edit-qty-input"
                    />
                    <button
                      type="button"
                      className="btn-qty-big"
                      onClick={() => setItemEditQty(itemEditQty + 1)}
                    >+</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descuento Individual</label>
                  <select
                    value={itemEditDisc}
                    onChange={e => setItemEditDisc(parseInt(e.target.value))}
                    className="select-item-discount"
                  >
                    <option value={0}>Sin descuento</option>
                    {[5,10,15,20,25,30,50].map(v => (
                      <option key={v} value={v}>{v}% de descuento</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Cobro ──────────────────────────────────── */}
      {isCheckoutOpen && (
        <div className="modal-backdrop">
          <div className="modal-content checkout-modal fade-in">
            <h2>Pagar Ticket</h2>
            <div className="modal-body">
              <div className="checkout-summary-box">
                <span className="label">Total a Pagar:</span>
                <span className="value">{formatCLP(total)}</span>
              </div>

              <div className="form-group">
                <label>Método de Pago</label>
                <div className="payment-method-selector">
                  {[
                    { key: "Efectivo",      icon: "💵" },
                    { key: "Tarjeta",       icon: "💳" },
                    { key: "Transferencia", icon: "🏦" },
                    { key: "QR / Webpay",   icon: "📲" },
                  ].map(({ key, icon }) => (
                    <button
                      key={key}
                      className={`method-btn ${paymentMethod === key ? "active" : ""}`}
                      onClick={() => {
                        setPaymentMethod(key);
                        setCashAmount(key === "Efectivo" ? total.toString() : "");
                      }}
                    >
                      {icon} {key}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "Efectivo" && (
                <div className="cash-calculator">
                  <div className="form-group">
                    <label>Efectivo Recibido (CLP)</label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={e => setCashAmount(e.target.value)}
                      placeholder="Monto recibido"
                      className="cash-input"
                      autoFocus
                    />
                  </div>
                  <div className="quick-cash-buttons">
                    {QUICK_CASH.map(val => (
                      <button
                        key={val}
                        className="btn-quick-cash"
                        onClick={() => setCashAmount(val.toString())}
                      >
                        {formatCLP(val)}
                      </button>
                    ))}
                  </div>
                  {parseFloat(cashAmount) >= total && (
                    <div className="change-result success-box">
                      <span>Vuelto a entregar:</span>
                      <strong>{formatCLP(parseFloat(cashAmount) - total)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsCheckoutOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={handleCheckoutComplete}
                disabled={paymentMethod === "Efectivo" && parseFloat(cashAmount) < total}
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Boleta / Recibo ────────────────────────── */}
      {completedOrder && (
        <div className="modal-backdrop">
          <div className="modal-content receipt-modal fade-in">
            <h2>✅ Venta Registrada</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
              Pedido #{completedOrder.number} — {completedOrder.type} {completedOrder.table}
            </p>

            {/* Vista previa boleta */}
            <div className="receipt-preview text-receipt">
              {"═══════════════════════════\n"}
              {"  CARBON & CHEDDAR - LOTA  \n"}
              {"═══════════════════════════\n"}
              {`Pedido #${completedOrder.number} | ${completedOrder.type} ${completedOrder.table}\n`}
              {new Date().toLocaleDateString("es-CL")} {new Date().toLocaleTimeString("es-CL", {hour:"2-digit",minute:"2-digit"})}
              {"\n───────────────────────────\n"}
              {completedOrder.items.map((i, idx) => {
                const base  = i.price * i.qty;
                const disc  = Math.round(base * ((i.itemDiscountPercent || 0) / 100));
                const final = base - disc;
                return (
                  <React.Fragment key={idx}>
                    {`${i.emoji} ${i.name} x${i.qty}  ${formatCLP(final)}\n`}
                    {disc > 0 && `   Desc.-${i.itemDiscountPercent}%  -${formatCLP(disc)}\n`}
                  </React.Fragment>
                );
              })}
              {"───────────────────────────\n"}
              {completedOrder.discount > 0 && `Desc. Gral: -${formatCLP(completedOrder.discount)}\n`}
              {`TOTAL: ${formatCLP(completedOrder.total)}\n`}
              {`Pago: ${completedOrder.paymentMethod}\n`}
              {completedOrder.cashReceived && `Vuelto: ${formatCLP(completedOrder.cashReceived - completedOrder.total)}\n`}
              {completedOrder.notes && `Notas: ${completedOrder.notes}\n`}
              {"═══════════════════════════\n"}
              {"  Precios incluyen 19% IVA \n"}
              {"  ¡Gracias por su visita!  \n"}
            </div>

            <div className="modal-actions" style={{ flexWrap: "wrap" }}>
              {/* Imprimir por ventana (browser) */}
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ Imprimir (Browser)
              </button>

              {/* Imprimir por Bluetooth */}
              {printerState.connected ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleBTPrint(completedOrder)}
                  disabled={btPrinting}
                >
                  {btPrinting ? "⏳ Imprimiendo..." : `🖨️ Imprimir BT (${printerState.name})`}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={handleBTConnect}>
                  🖨️ Conectar Impresora BT
                </button>
              )}

              <button className="btn btn-success" onClick={() => setCompletedOrder(null)}>
                ✓ Listo / Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
