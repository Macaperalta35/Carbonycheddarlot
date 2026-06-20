import React, { useState } from "react";
import logoUrl from "../assets/logo.js";

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
export default function CustomerView({ menu, setMenu, orders, setOrders, cartaImages = [], cartaLoading = false }) {
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

      {/* Carta de imágenes */}
      <section className="cv-section">
        <h2 className="cv-section-title">Nuestra Carta</h2>
        <p className="cv-section-sub">Toca una imagen para ampliarla</p>
        <CartaGaleria images={cartaImages} loading={cartaLoading} />
      </section>

      {/* Banner Próximamente */}
      <section className="cv-coming-soon">
        <div className="cv-coming-inner">
          <span className="cv-coming-icon">🚀</span>
          <div>
            <h3>Pedidos Online</h3>
            <p>Muy pronto podrás hacer tu pedido directamente desde aquí y retirarlo listo.</p>
          </div>
          <span className="cv-coming-badge">Próximamente</span>
        </div>
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
    </div>
  );
}
