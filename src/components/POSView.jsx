import React, { useState } from "react";

export default function POSView({ menu, setMenu, orders, setOrders, currentUserRole }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketItems, setTicketItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState("Mesa 1");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [activeTab, setActiveTab] = useState("sales"); // 'sales' o 'online-orders'
  
  // Estado para modal de selección de variantes
  const [variantModalItem, setVariantModalItem] = useState(null);

  // Estado para editar ítem individual del ticket
  const [editingTicketItem, setEditingTicketItem] = useState(null);
  const [itemEditQty, setItemEditQty] = useState(1);
  const [itemEditDiscount, setItemEditDiscount] = useState(0);

  // Estados de cobro
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);

  const tables = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Para Llevar"];
  const categories = ["All", "Burgers", "Completos", "Almuerzos", "Niños", "Sides", "Drinks", "Desserts"];

  // Filtrado de menú
  const filteredMenu = menu.filter(item => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Agregar al ticket actual
  const addToTicket = (item, chosenVariant = null) => {
    if (item.stock <= 0) {
      alert("¡Este producto no tiene stock disponible!");
      return;
    }

    // Si tiene variantes y no se ha escogido, abrir modal
    if (item.variants && !chosenVariant) {
      setVariantModalItem(item);
      return;
    }

    const finalId = chosenVariant ? `${item.id}_${chosenVariant.name}` : item.id;
    const finalName = chosenVariant ? `${item.name} (${chosenVariant.name})` : item.name;
    const finalPrice = chosenVariant ? chosenVariant.price : item.price;

    const existing = ticketItems.find(i => i.ticketId === finalId);
    
    // Validar contra stock total del producto base
    const totalQtyInTicket = ticketItems
      .filter(i => i.id === item.id)
      .reduce((sum, i) => sum + i.qty, 0);

    if (totalQtyInTicket >= item.stock) {
      alert(`No hay suficiente stock en inventario de ${item.name} (${item.stock} u. máx).`);
      return;
    }

    if (existing) {
      setTicketItems(ticketItems.map(i => i.ticketId === finalId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setTicketItems([...ticketItems, { 
        ...item, 
        ticketId: finalId, 
        name: finalName, 
        price: finalPrice, 
        qty: 1,
        variantName: chosenVariant ? chosenVariant.name : null,
        itemDiscountPercent: 0 // 0% de descuento por defecto
      }]);
    }

    setVariantModalItem(null);
  };

  // Abrir modal de edición de ítem
  const openEditTicketItem = (item) => {
    setEditingTicketItem(item);
    setItemEditQty(item.qty);
    setItemEditDiscount(item.itemDiscountPercent || 0);
  };

  // Guardar edición de ítem individual
  const saveTicketItemEdit = (e) => {
    e.preventDefault();
    const menuItem = menu.find(i => i.id === editingTicketItem.id);
    if (!menuItem) return;

    // Calcular la cantidad de este mismo producto base en otras líneas del ticket
    const otherQtyInTicket = ticketItems
      .filter(i => i.id === editingTicketItem.id && i.ticketId !== editingTicketItem.ticketId)
      .reduce((sum, i) => sum + i.qty, 0);

    if (otherQtyInTicket + itemEditQty > menuItem.stock) {
      alert(`No hay suficiente stock. Disponible: ${menuItem.stock} u. en total.`);
      return;
    }

    setTicketItems(ticketItems.map(i => 
      i.ticketId === editingTicketItem.ticketId 
        ? { ...i, qty: itemEditQty, itemDiscountPercent: itemEditDiscount } 
        : i
    ));

    setEditingTicketItem(null);
  };

  // Modificar cantidades del ticket rápidamente
  const updateTicketQty = (ticketId, change) => {
    const ticketItem = ticketItems.find(i => i.ticketId === ticketId);
    const menuItem = menu.find(i => i.id === ticketItem.id);
    if (!ticketItem || !menuItem) return;

    const newQty = ticketItem.qty + change;
    if (newQty <= 0) {
      setTicketItems(ticketItems.filter(i => i.ticketId !== ticketId));
    } else {
      // Validar contra stock total del producto base
      const otherQtyInTicket = ticketItems
        .filter(i => i.id === ticketItem.id && i.ticketId !== ticketId)
        .reduce((sum, i) => sum + i.qty, 0);

      if (otherQtyInTicket + newQty > menuItem.stock) {
        alert(`Límite de stock alcanzado para ${menuItem.name}.`);
        return;
      }
      setTicketItems(ticketItems.map(i => i.ticketId === ticketId ? { ...i, qty: newQty } : i));
    }
  };

  // Eliminar ítem directo
  const removeTicketItem = (ticketId) => {
    setTicketItems(ticketItems.filter(i => i.ticketId !== ticketId));
  };

  // Detector de Combo Automático
  const detectCombo = () => {
    const hasBurger = ticketItems.some(i => i.category === "Burgers");
    const hasSide = ticketItems.some(i => i.category === "Sides");
    const hasDrink = ticketItems.some(i => i.category === "Drinks");
    return hasBurger && hasSide && hasDrink;
  };

  const applyComboDiscount = () => {
    setDiscountPercent(10);
    alert("Se aplicó 10% de descuento por Combo (Hamburguesa + Acompañamiento + Bebida) 🍔🍟🥤");
  };

  // Cálculos de totales considerando descuentos individuales por línea
  const getLineSubtotal = (item) => {
    const baseTotal = item.price * item.qty;
    const discount = Math.round(baseTotal * ((item.itemDiscountPercent || 0) / 100));
    return baseTotal - discount;
  };

  const subtotal = ticketItems.reduce((sum, item) => sum + getLineSubtotal(item), 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = subtotal - discountAmount;

  // Lógica de Cobro
  const handleOpenCheckout = () => {
    if (ticketItems.length === 0) return;
    setIsCheckoutOpen(true);
    setCashAmount(total.toString());
  };

  const handleCheckoutComplete = () => {
    const cash = parseFloat(cashAmount);
    if (paymentMethod === "Efectivo" && (isNaN(cash) || cash < total)) {
      alert("El monto de efectivo ingresado es insuficiente.");
      return;
    }

    const orderNumber = orders.length + 1;

    // Crear la orden procesada
    const newOrder = {
      id: Date.now(),
      number: orderNumber,
      type: selectedTable === "Para Llevar" ? "Llevar" : "Mesa",
      table: selectedTable === "Para Llevar" ? "" : selectedTable,
      items: ticketItems.map(i => ({
        id: i.id,
        ticketId: i.ticketId,
        name: i.name,
        price: i.price,
        qty: i.qty,
        emoji: i.emoji,
        itemDiscountPercent: i.itemDiscountPercent || 0
      })),
      discount: discountAmount,
      total: total,
      paymentMethod: paymentMethod,
      cashReceived: paymentMethod === "Efectivo" ? cash : null,
      status: "Completado",
      timestamp: Date.now()
    };

    // Descontar del menú el stock de los productos base comprados
    const updatedMenu = menu.map(menuItem => {
      // Sumar toda la cantidad comprada de este producto base en el ticket
      const qtyPurchased = ticketItems
        .filter(i => i.id === menuItem.id)
        .reduce((sum, i) => sum + i.qty, 0);

      if (qtyPurchased > 0) {
        return { ...menuItem, stock: Math.max(0, menuItem.stock - qtyPurchased) };
      }
      return menuItem;
    });

    setMenu(updatedMenu);
    setOrders([...orders, newOrder]);
    setCompletedOrder(newOrder);
    
    // Limpiar estados
    setTicketItems([]);
    setDiscountPercent(0);
    setIsCheckoutOpen(false);
  };

  // Procesar Pedidos Online Pendientes
  const handleAcceptOnlineOrder = (orderId) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: "Preparando" } : order
    ));
  };

  const handleCompleteOnlineOrder = (orderId, method) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const orderComplete = { 
          ...order, 
          status: "Completado",
          paymentMethod: method
        };
        setCompletedOrder(orderComplete);
        return orderComplete;
      }
      return order;
    });
    setOrders(updatedOrders);
  };

  const formatCLP = (value) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0
    }).format(value);
  };

  const onlineOrders = orders.filter(o => o.type === "Para Retirar" && o.status !== "Completado");

  return (
    <div className="pos-layout">
      {/* Columna Izquierda: Ticket */}
      <div className="pos-left-panel">
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
            Pedidos Online {onlineOrders.length > 0 && <span className="online-badge">{onlineOrders.length}</span>}
          </button>
        </div>

        {activeTab === "sales" ? (
          <div className="ticket-container">
            {/* Cabecera de Mesa */}
            <div className="ticket-meta">
              <label htmlFor="table-select" className="sr-only">Seleccionar Mesa</label>
              <select 
                id="table-select"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="select-table"
              >
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button 
                className="btn-clear-ticket" 
                onClick={() => { setTicketItems([]); setDiscountPercent(0); }}
                disabled={ticketItems.length === 0}
              >
                Limpiar
              </button>
            </div>

            {/* Lista de Ticket */}
            <div className="ticket-items">
              {ticketItems.length === 0 ? (
                <div className="ticket-empty">
                  <span>🛒</span>
                  <p>Ticket vacío. Añade productos de la grilla.</p>
                </div>
              ) : (
                ticketItems.map(item => {
                  const lineSub = getLineSubtotal(item);
                  const hasRowDiscount = item.itemDiscountPercent > 0;

                  return (
                    <div key={item.ticketId} className="ticket-item-row">
                      <div 
                        className="ticket-item-info clickable-row" 
                        onClick={() => openEditTicketItem(item)}
                        title="Haz clic para aplicar descuento individual"
                        style={{ cursor: "pointer" }}
                      >
                        <span className="item-emoji">{item.emoji}</span>
                        <div>
                          <span className="item-name">{item.name}</span>
                          <span className="item-unit-price">
                            {formatCLP(item.price)} c/u
                            {hasRowDiscount && <span className="text-warning"> (-{item.itemDiscountPercent}%)</span>}
                          </span>
                        </div>
                      </div>
                      <div className="ticket-item-actions">
                        <button className="btn-qty" onClick={() => updateTicketQty(item.ticketId, -1)}>-</button>
                        <span className="qty-text">{item.qty}</span>
                        <button className="btn-qty" onClick={() => updateTicketQty(item.ticketId, 1)}>+</button>
                        <span className="item-subtotal">{formatCLP(lineSub)}</span>
                        
                        {/* Botón de eliminación directa */}
                        <button 
                          className="btn-delete-row"
                          onClick={() => removeTicketItem(item.ticketId)}
                          title="Eliminar de boleta"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Banner de Combo */}
            {detectCombo() && discountPercent === 0 && (
              <div className="combo-banner pulse">
                <span>🔥 ¡Combo Detectado!</span>
                <button className="btn btn-warning btn-xs" onClick={applyComboDiscount}>
                  Aplicar 10% Desc.
                </button>
              </div>
            )}

            {/* Resumen */}
            <div className="ticket-summary">
              <div className="summary-row">
                <span>Subtotal (con desc. por ítem):</span>
                <span>{formatCLP(subtotal)}</span>
              </div>
              <div className="summary-row discount-row">
                <span>Descuento General (%):</span>
                <div className="discount-input-wrapper">
                  <label htmlFor="discount-select" className="sr-only">Descuento General</label>
                  <select 
                    id="discount-select"
                    value={discountPercent} 
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                    className="select-discount"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                  </select>
                  <span>-{formatCLP(discountAmount)}</span>
                </div>
              </div>
              <div className="summary-row total-row">
                <span>TOTAL (19% IVA Incl.):</span>
                <span>{formatCLP(total)}</span>
              </div>
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
                  <div key={order.id} className={`online-order-card ${order.status === "Preparando" ? "preparing" : "pending"}`}>
                    <div className="online-card-header">
                      <span className="order-number-badge">PEDIDO #{order.number}</span>
                      <span className={`status-badge status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="online-card-client">
                      <p><strong>Cliente:</strong> {order.customerName}</p>
                      <p><strong>Fono:</strong> {order.phone}</p>
                      <p><strong>Retira en:</strong> {order.pickupTime}</p>
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
                          onClick={() => handleAcceptOnlineOrder(order.id)}
                        >
                          Aceptar y Preparar
                        </button>
                      ) : (
                        <div className="split-buttons">
                          <button 
                            className="btn btn-success"
                            onClick={() => handleCompleteOnlineOrder(order.id, "Efectivo")}
                          >
                            Entregar y Cobrar (Efectivo)
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleCompleteOnlineOrder(order.id, "Tarjeta")}
                          >
                            Cobrar (Tarjeta/Trans.)
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

      {/* Columna Derecha: Menú Cuadrícula */}
      <div className="pos-menu-panel">
        <div className="menu-header-controls">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            // Calcular stock disponible considerando lo que hay en ticket de este producto base
            const qtyInTicket = ticketItems
              .filter(i => i.id === item.id)
              .reduce((sum, i) => sum + i.qty, 0);
            
            const availableStock = Math.max(0, item.stock - qtyInTicket);
            const isOutOfStock = availableStock <= 0;
            const hasLowStock = availableStock > 0 && availableStock < 5;

            return (
              <button
                key={item.id}
                className={`pos-product-card ${isOutOfStock ? "out-of-stock" : ""}`}
                onClick={() => addToTicket(item)}
                disabled={isOutOfStock}
              >
                <span className="item-emoji">{item.emoji}</span>
                <span className="item-name">{item.name}</span>
                <span className="item-price">
                  {item.variants ? `${formatCLP(item.price)}+` : formatCLP(item.price)}
                </span>
                
                {isOutOfStock ? (
                  <span className="stock-badge stock-critical">Sin Stock</span>
                ) : hasLowStock ? (
                  <span className="stock-badge stock-warn">Aviso: {availableStock} u.</span>
                ) : (
                  <span className="stock-badge stock-normal">Stock: {availableStock}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal: Selección de Variantes (Tamaños Papas Fritas) */}
      {variantModalItem && (
        <div className="modal-backdrop">
          <div className="modal-content variant-select-modal fade-in">
            <h2>Seleccionar Tamaño</h2>
            <p>Elige el tamaño para <strong>{variantModalItem.name}</strong>:</p>
            <div className="variant-options-list">
              {variantModalItem.variants.map((v, index) => (
                <button 
                  key={index} 
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

      {/* Modal: Editar Ítem del Ticket (Descuento/Cantidad individual) */}
      {editingTicketItem && (
        <div className="modal-backdrop">
          <div className="modal-content ticket-item-edit-modal fade-in">
            <h2>Modificar Ítem en Ticket</h2>
            <form onSubmit={saveTicketItemEdit}>
              <div className="modal-body">
                <p className="edit-item-title"><strong>{editingTicketItem.name}</strong></p>
                
                <div className="form-group">
                  <label htmlFor="edit-item-qty">Cantidad</label>
                  <div className="qty-edit-wrapper">
                    <button 
                      type="button" 
                      className="btn-qty-big" 
                      onClick={() => setItemEditQty(Math.max(1, itemEditQty - 1))}
                    >-</button>
                    <input 
                      id="edit-item-qty"
                      type="number" 
                      value={itemEditQty}
                      onChange={(e) => setItemEditQty(Math.max(1, parseInt(e.target.value) || 1))}
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
                  <label htmlFor="edit-item-discount">Descuento Individual (%)</label>
                  <select 
                    id="edit-item-discount"
                    value={itemEditDiscount}
                    onChange={(e) => setItemEditDiscount(parseInt(e.target.value))}
                    className="select-item-discount"
                  >
                    <option value="0">Sin Descuento (0%)</option>
                    <option value="5">5% de Descuento</option>
                    <option value="10">10% de Descuento</option>
                    <option value="15">15% de Descuento</option>
                    <option value="20">20% de Descuento</option>
                    <option value="25">25% de Descuento</option>
                    <option value="50">50% de Descuento (Mitad de Precio)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingTicketItem(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Aplicar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cobro */}
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
                  <button 
                    className={`method-btn ${paymentMethod === "Efectivo" ? "active" : ""}`}
                    onClick={() => { setPaymentMethod("Efectivo"); setCashAmount(total.toString()); }}
                  >
                    💵 Efectivo
                  </button>
                  <button 
                    className={`method-btn ${paymentMethod === "Tarjeta" ? "active" : ""}`}
                    onClick={() => { setPaymentMethod("Tarjeta"); setCashAmount(""); }}
                  >
                    💳 Tarjeta
                  </button>
                  <button 
                    className={`method-btn ${paymentMethod === "Transferencia" ? "active" : ""}`}
                    onClick={() => { setPaymentMethod("Transferencia"); setCashAmount(""); }}
                  >
                    🏦 Transferencia
                  </button>
                </div>
              </div>

              {paymentMethod === "Efectivo" && (
                <div className="cash-calculator">
                  <div className="form-group">
                    <label htmlFor="cash-input">Efectivo Recibido (CLP)</label>
                    <input 
                      id="cash-input"
                      type="number" 
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Ingrese monto recibido"
                      className="cash-input"
                    />
                  </div>
                  
                  <div className="quick-cash-buttons">
                    {[5000, 10000, 20000].map(val => (
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

      {/* Modal de Impresión de Boleta */}
      {completedOrder && (
        <div className="modal-backdrop">
          <div className="modal-content receipt-modal fade-in">
            <h2>Boleta Registrada</h2>
            <p>Venta exitosa. Formato de impresión oficial:</p>

            <div className="receipt-preview text-receipt">
              PEDIDO #{completedOrder.number} | {completedOrder.type} {completedOrder.table}
              {completedOrder.items.map((i, idx) => {
                const lineDiscount = i.itemDiscountPercent > 0;
                const baseTotal = i.price * i.qty;
                const finalLineTotal = baseTotal - Math.round(baseTotal * (i.itemDiscountPercent / 100));
                
                return (
                  <React.Fragment key={idx}>
                    {"\n"}{i.emoji} {i.name} x{i.qty} ........... {formatCLP(baseTotal)}
                    {lineDiscount && (
                      <>
                        {"\n"}   (Desc. -{i.itemDiscountPercent}%) ............................ -{formatCLP(Math.round(baseTotal * (i.itemDiscountPercent / 100)))}
                        {"\n"}   Subtotal Ítem ........................ {formatCLP(finalLineTotal)}
                      </>
                    )}
                  </React.Fragment>
                );
              })}
              {"\n"}─────────────────────────
              {completedOrder.discount > 0 && (
                <>
                  {"\n"}DESCUENTO GENERAL: -{formatCLP(completedOrder.discount)}
                </>
              )}
              {"\n"}TOTAL: {formatCLP(completedOrder.total)} | Pago: {completedOrder.paymentMethod}
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => window.print()}>
                🖨️ Imprimir Ticket (Simulado)
              </button>
              <button className="btn btn-success" onClick={() => setCompletedOrder(null)}>
                Listo / Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
