import React, { useState } from "react";

export default function CustomerView({ menu, setMenu, orders, setOrders }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("30"); // minutos por defecto
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);

  // Estado para modal de selección de variantes
  const [variantModalItem, setVariantModalItem] = useState(null);

  const categories = ["All", "Burgers", "Completos", "Almuerzos", "Niños", "Sides", "Drinks", "Desserts"];

  const getCategoryEmoji = (cat) => {
    switch (cat) {
      case "Burgers": return "🍔";
      case "Completos": return "🥖";
      case "Almuerzos": return "🍽️";
      case "Niños": return "👶";
      case "Sides": return "🍟";
      case "Drinks": return "🥤";
      case "Desserts": return "🍰";
      default: return "🍴";
    }
  };

  const filteredMenu = activeCategory === "All" 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  const addToCart = (item, chosenVariant = null) => {
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

    const cartItem = cart.find(i => i.cartId === finalId);
    
    // Validar contra stock total del producto base
    const totalQtyInCart = cart
      .filter(i => i.id === item.id)
      .reduce((sum, i) => sum + i.qty, 0);

    if (totalQtyInCart >= item.stock) {
      alert(`Lo sentimos, no hay más stock disponible de ${item.name}.`);
      return;
    }

    if (cartItem) {
      setCart(cart.map(i => i.cartId === finalId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { 
        ...item, 
        cartId: finalId, 
        name: finalName, 
        price: finalPrice, 
        qty: 1,
        variantName: chosenVariant ? chosenVariant.name : null
      }]);
    }

    setVariantModalItem(null);
  };

  const updateCartQty = (cartId, change) => {
    const item = cart.find(i => i.cartId === cartId);
    const menuItem = menu.find(i => i.id === item.id);
    if (!item || !menuItem) return;

    const newQty = item.qty + change;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.cartId !== cartId));
    } else {
      // Validar contra stock total del producto base
      const otherQtyInCart = cart
        .filter(i => i.id === item.id && i.cartId !== cartId)
        .reduce((sum, i) => sum + i.qty, 0);

      if (otherQtyInCart + newQty > menuItem.stock) {
        alert(`Límite de stock alcanzado para ${menuItem.name}.`);
        return;
      }
      setCart(cart.map(i => i.cartId === cartId ? { ...i, qty: newQty } : i));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim() || !phone.trim()) {
      alert("Por favor ingresa tu nombre y teléfono.");
      return;
    }

    // Validar stock de todos los productos del carro antes de confirmar
    for (const cartItem of cart) {
      const menuItem = menu.find(i => i.id === cartItem.id);
      
      // Sumar total pedido de este producto base en el carrito
      const totalRequested = cart
        .filter(i => i.id === cartItem.id)
        .reduce((sum, i) => sum + i.qty, 0);

      if (!menuItem || menuItem.stock < totalRequested) {
        alert(`¡Lo sentimos! El stock de ${cartItem.name} ha cambiado y ya no está disponible la cantidad solicitada.`);
        return;
      }
    }

    // Crear el nuevo pedido
    const orderNumber = orders.length + 1;
    const newOrder = {
      id: Date.now(),
      number: orderNumber,
      type: "Para Retirar",
      table: `(${customerName})`,
      customerName: customerName.trim(),
      phone: phone.trim(),
      pickupTime: `${pickupTime} min`,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        emoji: item.emoji
      })),
      total: cartTotal,
      paymentMethod: "Por pagar",
      status: "Pendiente",
      timestamp: Date.now()
    };

    // Actualizar pedidos e inventario (descontar stock al pedir por producto base)
    const updatedMenu = menu.map(menuItem => {
      const qtyOrdered = cart
        .filter(i => i.id === menuItem.id)
        .reduce((sum, i) => sum + i.qty, 0);

      if (qtyOrdered > 0) {
        return { ...menuItem, stock: Math.max(0, menuItem.stock - qtyOrdered) };
      }
      return menuItem;
    });

    setMenu(updatedMenu);
    setOrders([...orders, newOrder]);
    setLastPlacedOrder(newOrder);
    setCart([]);
    setCustomerName("");
    setPhone("");
  };

  const formatCLP = (value) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleDownloadMenuPDF = () => {
    // Al gatillar window.print(), el CSS optimizado en @media print
    // formateará la lista del menú a tamaño carta.
    window.print();
  };

  if (lastPlacedOrder) {
    return (
      <div className="customer-success-container fallback-print-hide fade-in">
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h2>¡Pedido Enviado Exitosamente!</h2>
          <p>Tu pedido ha sido recibido por el mesón de Carbon & Cheddar.</p>
          
          <div className="receipt-preview">
            <div className="receipt-header">
              <h3>CARBON & CHEDDAR</h3>
              <p>Lota, Chile | Boleta Electrónica</p>
              <p>---------------------------------</p>
              <p className="bold">PEDIDO #{lastPlacedOrder.number} | Retiro</p>
              <p>Cliente: {lastPlacedOrder.customerName}</p>
              <p>Fono: {lastPlacedOrder.phone}</p>
              <p>Listo en aprox: {lastPlacedOrder.pickupTime}</p>
              <p>---------------------------------</p>
            </div>
            <div className="receipt-items">
              {lastPlacedOrder.items.map((item, idx) => (
                <div key={idx} className="receipt-item-row">
                  <span>{item.emoji} {item.name} x{item.qty}</span>
                  <span>{formatCLP(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="receipt-footer">
              <p>---------------------------------</p>
              <p className="receipt-total bold">
                <span>TOTAL (IVA Incl.):</span>
                <span>{formatCLP(lastPlacedOrder.total)}</span>
              </p>
              <p>Pago: Por pagar al retirar ({lastPlacedOrder.paymentMethod})</p>
              <p>---------------------------------</p>
              <p>¡Gracias por tu compra! ¡Te esperamos!</p>
            </div>
          </div>
          
          <button 
            className="btn btn-primary btn-block" 
            onClick={() => setLastPlacedOrder(null)}
          >
            Hacer Otro Pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-view-grid">
      {/* Menú de Clientes (Se imprimirá limpio al descargar PDF) */}
      <div className="customer-menu-section printable-menu-section">
        {/* Cabecera solo visible en impresión PDF */}
        <div className="print-only-header">
          <img src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220%22 width=%22100%22 height=%22100%22><text y=%2280%22 font-size=%2280%22>🍔</text></svg>" alt="Logo" className="print-logo" />
          <h1>CARBON & CHEDDAR LOTA</h1>
          <p>Brasa & Queso - Lota Alto, Chile | Teléfono: +56 9 8417 0433</p>
          <hr />
          <h2>CARTA DE PRODUCTOS</h2>
        </div>

        <header className="customer-header fallback-print-hide">
          <div className="customer-header-title-row">
            <div>
              <h1>Carbon & Cheddar Lota</h1>
              <p className="subtitle">Realiza tu pedido online y retíralo calentito</p>
            </div>
            
            {/* Botón para descargar menú en PDF */}
            <button 
              className="btn btn-secondary btn-sm btn-download-pdf"
              onClick={handleDownloadMenuPDF}
              title="Descargar carta del restaurant en PDF"
            >
              📄 Descargar Carta PDF
            </button>
          </div>
        </header>

        {/* Categorías (ocultas en impresión) */}
        <div className="category-scroll fallback-print-hide">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              <span>{getCategoryEmoji(cat)}</span> {cat === "All" ? "Todos" : cat}
            </button>
          ))}
        </div>

        {/* Grilla de productos (formateada especialmente para impresión si se activa) */}
        <div className="products-grid printable-grid">
          {filteredMenu.map(item => {
            // Calcular stock disponible considerando lo que hay en el carro
            const qtyInCart = cart
              .filter(i => i.id === item.id)
              .reduce((sum, i) => sum + i.qty, 0);

            const availableStock = Math.max(0, item.stock - qtyInCart);
            const isLowStock = availableStock > 0 && availableStock < 5;

            return (
              <div key={item.id} className="product-card printable-card fade-in">
                <div className="product-card-header">
                  <span className="product-emoji">{item.emoji}</span>
                  <span className="product-category printable-print-hide">{item.category}</span>
                </div>
                <div className="product-card-body">
                  <h3>{item.name}</h3>
                  <p className="product-desc">{item.description}</p>
                  
                  {/* Variantes de tamaño impresas en el PDF */}
                  {item.variants && (
                    <div className="print-variants-list print-only">
                      {item.variants.map((v, i) => (
                        <span key={i} className="print-variant-tag">{v.name}: {formatCLP(v.price)}</span>
                      ))}
                    </div>
                  )}

                  <div className="product-stock-status fallback-print-hide">
                    {availableStock === 0 ? (
                      <span className="badge badge-danger">Sin Stock</span>
                    ) : isLowStock ? (
                      <span className="badge badge-warning">¡Solo {availableStock} disponibles!</span>
                    ) : (
                      <span className="badge badge-success">{availableStock} disponibles</span>
                    )}
                  </div>
                </div>
                <div className="product-card-footer">
                  <span className="product-price">
                    {item.variants ? `${formatCLP(item.price)}+` : formatCLP(item.price)}
                  </span>
                  <button
                    className={`btn-add fallback-print-hide ${availableStock === 0 ? "disabled" : ""}`}
                    disabled={availableStock === 0}
                    onClick={() => addToCart(item)}
                  >
                    {qtyInCart > 0 ? `Añadido (${qtyInCart})` : "Agregar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carro de Compras Lateral (oculto en impresión PDF) */}
      <div className="customer-cart-section fallback-print-hide">
        <div className="cart-container">
          <div className="cart-header">
            <h2>Tu Carrito de Pedido 🛒</h2>
            {cart.length > 0 && (
              <button className="btn-clear" onClick={() => setCart([])}>Vaciar</button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <span className="empty-cart-emoji">🍔</span>
              <p>Tu carrito está vacío.</p>
              <p className="light-text">Elige delicias del menú a la izquierda para armar tu pedido.</p>
            </div>
          ) : (
            <>
              <div className="cart-items-list">
                {cart.map(item => (
                  <div key={item.cartId} className="cart-item-row">
                    <div className="cart-item-info">
                      <span className="cart-item-emoji">{item.emoji}</span>
                      <div>
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-subtotal">{formatCLP(item.price)} c/u</div>
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <button 
                        className="btn-qty" 
                        onClick={() => updateCartQty(item.cartId, -1)}
                      >-</button>
                      <span className="cart-qty-text">{item.qty}</span>
                      <button 
                        className="btn-qty" 
                        onClick={() => updateCartQty(item.cartId, 1)}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-totals">
                <div className="total-row">
                  <span>Subtotal (IVA Incl.):</span>
                  <span className="bold">{formatCLP(cartTotal)}</span>
                </div>
              </div>

              <form className="cart-checkout-form" onSubmit={handlePlaceOrder}>
                <h3>Datos de Retiro</h3>
                
                <div className="form-group">
                  <label htmlFor="client-name">Tu Nombre *</label>
                  <input
                    id="client-name"
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="client-phone">Número de Celular *</label>
                  <input
                    id="client-phone"
                    type="tel"
                    placeholder="Ej. +56 9 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pickup-select">¿En cuántos minutos retiras?</label>
                  <select
                    id="pickup-select"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  >
                    <option value="15">En 15 minutos</option>
                    <option value="30">En 30 minutos</option>
                    <option value="45">En 45 minutos</option>
                    <option value="60">En 1 hora</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-checkout">
                  Enviar Pedido para Retirar ({formatCLP(cartTotal)})
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal: Selección de Variantes en Vista Cliente (Tamaños de Papas Fritas) */}
      {variantModalItem && (
        <div className="modal-backdrop fallback-print-hide">
          <div className="modal-content variant-select-modal fade-in">
            <h2>Seleccionar Tamaño</h2>
            <p>Elige el tamaño para tu porción de <strong>{variantModalItem.name}</strong>:</p>
            <div className="variant-options-list">
              {variantModalItem.variants.map((v, index) => (
                <button 
                  key={index} 
                  className="variant-option-card"
                  onClick={() => addToCart(variantModalItem, v)}
                >
                  <div className="variant-option-details">
                    <span className="variant-option-name">{v.name}</span>
                    <span className="variant-option-desc">Porción servida al instante</span>
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
    </div>
  );
}
