import React, { useState, useMemo } from "react";
import logoUrl from "../assets/logo.js";

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", minimumFractionDigits: 0,
  }).format(v || 0);

/* ── Galería con lightbox ───────────────────────────── */
function CartaGaleria({ images, loading }) {
  const [idx, setIdx] = useState(null);

  if (loading) {
    return (
      <div className="cv-empty-carta">
        <div className="cv-carta-spinner" />
        <p>Cargando carta…</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="cv-empty-carta">
        <span>📷</span>
        <p>La carta se cargará muy pronto.</p>
      </div>
    );
  }

  const img = idx !== null ? images[idx] : null;

  return (
    <>
      <div className="cv-carta-grid">
        {images.map((item, i) => (
          <button
            key={item.id}
            className="cv-carta-thumb"
            onClick={() => setIdx(i)}
            title={item.name}
          >
            <img src={item.image_data} alt={item.name} loading="lazy" />
            <span className="cv-carta-label">{item.name}</span>
          </button>
        ))}
      </div>

      {img && (
        <div className="carta-lightbox-backdrop" onClick={() => setIdx(null)}>
          <div className="carta-lightbox" onClick={(e) => e.stopPropagation()}>
            <button className="carta-lb-close" onClick={() => setIdx(null)}>✕</button>
            {idx > 0 && (
              <button className="carta-lb-arrow carta-lb-prev" onClick={() => setIdx(i => i - 1)}>‹</button>
            )}
            <div className="carta-lb-img-wrap">
              <img src={img.image_data} alt={img.name} className="carta-lb-img" />
              <p className="carta-lb-name">{img.name}</p>
            </div>
            {idx < images.length - 1 && (
              <button className="carta-lb-arrow carta-lb-next" onClick={() => setIdx(i => i + 1)}>›</button>
            )}
            <p className="carta-lb-counter">{idx + 1} / {images.length}</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Vista principal del cliente ────────────────────── */
export default function CustomerView({ menu = [], orders = [], setOrders, cartaImages = [], cartaLoading = false }) {
  const [activeCat, setActiveCat]   = useState("Todos");
  const [cart, setCart]             = useState([]);          // [{ id, name, price, emoji, qty }]
  const [cartOpen, setCartOpen]     = useState(false);
  const [customerName, setName]     = useState("");
  const [phone, setPhone]           = useState("");
  const [pickupMin, setPickupMin]   = useState("30");
  const [placedOrder, setPlaced]    = useState(null);
  const [formError, setFormError]   = useState("");

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(menu.map(i => i.category)))],
    [menu]
  );

  const visibleMenu = activeCat === "Todos"
    ? menu
    : menu.filter(i => i.category === activeCat);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const qtyInCart = (id) => cart.find(i => i.id === id)?.qty || 0;

  const addToCart = (item) => {
    const current = qtyInCart(item.id);
    if (item.stock != null && current >= item.stock) {
      alert(`No hay más stock disponible de ${item.name}.`);
      return;
    }
    setCart(prev => {
      const found = prev.find(i => i.id === item.id);
      if (found) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: item.price, emoji: item.emoji, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) { setFormError("Agrega al menos un producto a tu pedido."); return; }
    if (!customerName.trim()) { setFormError("Ingresa tu nombre."); return; }
    if (!phone.trim()) { setFormError("Ingresa tu número de teléfono."); return; }

    const nextNumber = orders.reduce((max, o) =>
      (typeof o.number === "number" && o.number > max ? o.number : max), 0) + 1;

    const now = Date.now();
    const newOrder = {
      id:            now,
      number:        nextNumber,
      type:          "Para Retirar",
      table:         "",
      items:         cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji })),
      discount:      0,
      total:         cartTotal,
      paymentMethod: "",
      cashReceived:  null,
      notes:         "",
      customerName:  customerName.trim(),
      phone:         phone.trim(),
      pickupTime:    `${pickupMin} min`,
      status:        "Pendiente",
      timestamp:     now,
    };

    setOrders([...orders, newOrder]);
    setPlaced(newOrder);
    setCart([]);
    setName("");
    setPhone("");
    setCartOpen(false);
    setFormError("");
  };

  return (
    <div className="cv-wrapper">
      {/* Header */}
      <header className="cv-header">
        <div className="cv-header-brand">
          <img src={logoUrl} alt="Carbon & Cheddar" className="cv-logo-img" />
        </div>
        <a
          href="https://www.instagram.com/carbonycheddarlota"
          target="_blank"
          rel="noopener noreferrer"
          className="cv-ig-link"
        >
          📸 @carbonycheddarlota
        </a>
      </header>

      {/* Sección de Pedido Online */}
      <section className="cv-section">
        <h2 className="cv-section-title">Haz tu Pedido 🛍️</h2>
        <p className="cv-section-sub">Elige tus productos y retíralos en el local</p>

        {/* Filtro de categorías */}
        <div className="cv-cat-scroll">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cv-cat-pill ${activeCat === cat ? "active" : ""}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grilla de productos */}
        <div className="cv-order-grid">
          {visibleMenu.map(item => {
            const inCart = qtyInCart(item.id);
            const noStock = item.stock != null && item.stock <= 0;
            return (
              <div key={item.id} className="cv-order-card">
                <div className="cv-order-card-emoji">{item.emoji}</div>
                <div className="cv-order-card-body">
                  <h4>{item.name}</h4>
                  {item.description && <p className="cv-order-card-desc">{item.description}</p>}
                </div>
                <div className="cv-order-card-foot">
                  <span className="cv-order-price">{formatCLP(item.price)}</span>
                  {noStock ? (
                    <span className="cv-order-nostock">Sin stock</span>
                  ) : inCart > 0 ? (
                    <div className="cv-order-stepper">
                      <button onClick={() => changeQty(item.id, -1)}>−</button>
                      <span>{inCart}</span>
                      <button onClick={() => addToCart(item)}>+</button>
                    </div>
                  ) : (
                    <button className="cv-order-add" onClick={() => addToCart(item)}>Agregar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Carta de imágenes */}
      <section className="cv-section">
        <h2 className="cv-section-title">Nuestra Carta</h2>
        <p className="cv-section-sub">Toca una imagen para ampliarla</p>
        <CartaGaleria images={cartaImages} loading={cartaLoading} />
      </section>

      {/* Footer */}
      <footer className="cv-footer">
        <p>📞 +56 9 8417 0433 &nbsp;·&nbsp; Lota, Chile</p>
        <p style={{ margin: "4px 0 0", color: "#bbb" }}>📍 Carlos Cousiño 215, Lota Alto</p>
        <p style={{ color: "#555", fontSize: "0.72rem", margin: "12px 0 0" }}>
          Precios incluyen IVA (19%)
        </p>
        <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "#555" }}>
          Hecho con ❤️ por{" "}
          <a
            href="https://github.com/Macaperalta35"
            target="_blank"
            rel="noopener noreferrer"
            className="cv-lilith-link"
          >
            LILITH
          </a>
        </p>
      </footer>

      {/* Barra fija inferior con el carrito */}
      {cartCount > 0 && !placedOrder && (
        <button className="cv-cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cv-cart-bar-count">{cartCount}</span>
          <span className="cv-cart-bar-label">Ver mi pedido</span>
          <span className="cv-cart-bar-total">{formatCLP(cartTotal)}</span>
        </button>
      )}

      {/* Modal del carrito + datos de retiro */}
      {cartOpen && (
        <div className="cv-cart-backdrop" onClick={() => setCartOpen(false)}>
          <div className="cv-cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-cart-head">
              <h3>Tu Pedido 🛒</h3>
              <button className="cv-cart-close" onClick={() => setCartOpen(false)}>✕</button>
            </div>

            <div className="cv-cart-items">
              {cart.map(i => (
                <div key={i.id} className="cv-cart-line">
                  <span className="cv-cart-line-emoji">{i.emoji}</span>
                  <div className="cv-cart-line-info">
                    <span className="cv-cart-line-name">{i.name}</span>
                    <span className="cv-cart-line-price">{formatCLP(i.price)} c/u</span>
                  </div>
                  <div className="cv-order-stepper">
                    <button onClick={() => changeQty(i.id, -1)}>−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => changeQty(i.id, 1)}>+</button>
                  </div>
                  <span className="cv-cart-line-sub">{formatCLP(i.price * i.qty)}</span>
                </div>
              ))}
            </div>

            <form className="cv-cart-form" onSubmit={handleSubmit}>
              <div className="cv-cart-total-row">
                <span>Total</span>
                <strong>{formatCLP(cartTotal)}</strong>
              </div>

              <label className="cv-cart-label">Tu nombre *</label>
              <input
                className="cv-cart-input"
                type="text"
                value={customerName}
                onChange={(e) => { setName(e.target.value); setFormError(""); }}
                placeholder="Ej: María González"
              />

              <label className="cv-cart-label">Teléfono *</label>
              <input
                className="cv-cart-input"
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setFormError(""); }}
                placeholder="Ej: +56 9 1234 5678"
              />

              <label className="cv-cart-label">¿En cuánto tiempo lo retiras?</label>
              <select
                className="cv-cart-input"
                value={pickupMin}
                onChange={(e) => setPickupMin(e.target.value)}
              >
                <option value="15">En 15 minutos</option>
                <option value="30">En 30 minutos</option>
                <option value="45">En 45 minutos</option>
                <option value="60">En 1 hora</option>
              </select>

              {formError && <p className="cv-cart-error">{formError}</p>}

              <button type="submit" className="cv-cart-submit">
                Enviar pedido · {formatCLP(cartTotal)}
              </button>
              <p className="cv-cart-note">El pago se realiza al retirar en el local.</p>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de pedido enviado */}
      {placedOrder && (
        <div className="cv-cart-backdrop">
          <div className="cv-cart-modal cv-success-modal">
            <div className="cv-success-icon">🎉</div>
            <h3>¡Pedido enviado!</h3>
            <p className="cv-success-num">Pedido #{placedOrder.number}</p>
            <p className="cv-success-text">
              Hola <strong>{placedOrder.customerName}</strong>, recibimos tu pedido por{" "}
              <strong>{formatCLP(placedOrder.total)}</strong>. Estará listo en aprox.{" "}
              <strong>{placedOrder.pickupTime}</strong>. Te esperamos en el local 🍔
            </p>
            <button className="cv-cart-submit" onClick={() => setPlaced(null)}>
              Hacer otro pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
