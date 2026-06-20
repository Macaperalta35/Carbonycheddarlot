import React, { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MENU_URL = "https://carbon-cheddar-pos.vercel.app";

const SQL_CREATE = `-- Ejecuta este SQL en Supabase Dashboard → SQL Editor
create table if not exists carta_images (
  id          text primary key,
  name        text not null,
  image_data  text not null,
  sort_order  integer default 0,
  updated_at  timestamptz default now()
);
alter table carta_images enable row level security;
create policy "anon read"   on carta_images for select to anon using (true);
create policy "anon insert" on carta_images for insert to anon with check (true);
create policy "anon update" on carta_images for update to anon using (true);
create policy "anon delete" on carta_images for delete to anon using (true);`;

const CATEGORY_META = {
  "Hamburguesas":        { desc: "Carne 120 gr · incluye porción de papas pequeñas" },
  "Milanesas":           { desc: "Res premium rebozada en panko · sandwich con papas, al plato con ensalada o sopa" },
  "Almuerzos":           { desc: "Platos del día con acompañamiento incluido" },
  "Conos":               { desc: "$6.500 c/u · tortilla de maíz rellena" },
  "Bebidas & Cafetería": { desc: "Bebidas frías y calientes" },
  "Quesadillas":         { desc: "Tortilla de maíz con queso fundido · acompañadas de guacamole" },
  "Niños":               { desc: "$5.000 c/u · incluye Refreskid en sobre" },
  "Papas Fritas":        { desc: "Individual / Mediana / Grande" },
  "Extras Hamburguesas": { desc: "Ingredientes sueltos para hamburguesas y milanesas" },
  "Extras Papas":        { desc: "Adicionales para papas fritas · Carnes & Premium o Vegetales & Salsas" },
};

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v);

function compressImage(file, maxWidth = 1080, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pdfToImages(file, scale = 1.5) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page     = await pdf.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    pages.push(canvas.toDataURL("image/jpeg", 0.82));
  }
  return pages;
}

/* ── Lightbox ─────────────────────────────────────────── */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(images.length - 1, i + 1));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const img = images[idx];
  return (
    <div className="carta-lightbox-backdrop" onClick={onClose}>
      <div className="carta-lightbox" onClick={(e) => e.stopPropagation()}>
        <button className="carta-lb-close" onClick={onClose}>✕</button>
        {idx > 0 && (
          <button className="carta-lb-arrow carta-lb-prev" onClick={prev}>‹</button>
        )}
        <div className="carta-lb-img-wrap">
          <img src={img.image_data} alt={img.name} className="carta-lb-img" />
          <p className="carta-lb-name">{img.name}</p>
        </div>
        {idx < images.length - 1 && (
          <button className="carta-lb-arrow carta-lb-next" onClick={next}>›</button>
        )}
        <p className="carta-lb-counter">{idx + 1} / {images.length}</p>
      </div>
    </div>
  );
}

/* ── Galería de imágenes ─────────────────────────────── */
function ImageGallery({ images }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (images.length === 0) {
    return (
      <div className="carta-gallery-empty">
        <span>📷</span>
        <p>No hay imágenes de carta cargadas aún.</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Un administrador puede subirlas desde la pestaña <strong>Gestionar</strong>.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="carta-image-grid">
        {images.map((img, i) => (
          <button
            key={img.id}
            className="carta-img-thumb"
            onClick={() => setLightboxIdx(i)}
            title={img.name}
          >
            <img src={img.image_data} alt={img.name} loading="lazy" />
            <span className="carta-img-label">{img.name}</span>
          </button>
        ))}
      </div>
      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}

/* ── Panel gestión de imágenes (admin) ───────────────── */
function GestionarTab({ images, dbError, onUpsert, onRemove, onSwap, onReload }) {
  const [uploading,  setUploading]  = useState(false);
  const [migrating,  setMigrating]  = useState(false);
  const [imgName,    setImgName]    = useState("");
  const [preview,    setPreview]    = useState(null);
  const [fileData,   setFileData]   = useState(null);
  const [sqlCopied,  setSqlCopied]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [pdfPages,   setPdfPages]   = useState([]);   // páginas de PDF convertidas
  const [pdfBase,    setPdfBase]    = useState("");   // nombre base del PDF
  const fileRef = useRef();

  const isCloud = !dbError;

  const handleMigrate = async () => {
    const local = JSON.parse(localStorage.getItem("carbon_cheddar_carta_imgs_v1") || "[]");
    if (!local.length) { alert("No hay imágenes locales para migrar."); return; }
    setMigrating(true);
    let ok = 0, fail = 0;
    for (const img of local) {
      const err = await onUpsert(img);
      if (err) { console.error("Migración fallo en:", img.name, err); fail++; }
      else ok++;
    }
    setMigrating(false);
    alert(`Migración completada: ${ok} subidas, ${fail} errores.`);
    if (ok > 0) localStorage.removeItem("carbon_cheddar_carta_imgs_v1");
    onReload();
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      if (file.type === "application/pdf") {
        const baseName = file.name.replace(/\.pdf$/i, "");
        setPdfBase(baseName);
        setPdfPages([]);
        setPreview(null);
        setFileData(null);
        const pages = await pdfToImages(file, 2);
        setPdfPages(pages);
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("Formato no soportado. Usá JPG, PNG, WEBP o PDF.");
        return;
      }
      const compressed = await compressImage(file, 1080, 0.82);
      setFileData(compressed);
      setPreview(compressed);
      setPdfPages([]);
      if (!imgName) setImgName(file.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      alert("Error al procesar el archivo: " + e.message);
    } finally {
      setUploading(false);
    }
  }, [imgName]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!fileData || !imgName.trim()) { alert("Elegí una imagen y escribí un nombre."); return; }
    setUploading(true);
    const id        = Date.now().toString();
    const maxOrder  = images.reduce((m, i) => Math.max(m, i.sort_order), -1);
    const err       = await onUpsert({ id, name: imgName.trim(), image_data: fileData, sort_order: maxOrder + 1 });
    setUploading(false);
    if (err) { alert("Error al guardar: " + err.message); return; }
    setFileData(null);
    setPreview(null);
    setImgName("");
  };

  const handleUploadPdf = async () => {
    if (!pdfPages.length) return;
    setUploading(true);
    let maxOrder = images.reduce((m, i) => Math.max(m, i.sort_order), -1);
    let ok = 0, fail = 0;
    for (let i = 0; i < pdfPages.length; i++) {
      const name = pdfPages.length === 1 ? pdfBase : `${pdfBase} - pág ${i + 1}`;
      const err  = await onUpsert({ id: (Date.now() + i).toString(), name, image_data: pdfPages[i], sort_order: ++maxOrder });
      if (err) fail++; else ok++;
    }
    setUploading(false);
    if (fail) alert(`${ok} páginas guardadas, ${fail} errores.`);
    setPdfPages([]);
    setPdfBase("");
    onReload();
  };

  const handleRename = async (img, newName) => {
    if (!newName.trim() || newName === img.name) return;
    await onUpsert({ ...img, name: newName.trim() });
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_CREATE).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    });
  };

  return (
    <div className="gestion-tab">
      {/* Estado de conexión — siempre visible */}
      <div className={`gestion-status-bar ${isCloud ? "status-cloud" : "status-local"}`}>
        {isCloud ? (
          <>
            <span>☁️ <strong>Supabase conectado</strong> — las imágenes se guardan en la nube y se ven en todos los dispositivos.</span>
            {JSON.parse(localStorage.getItem("carbon_cheddar_carta_imgs_v1") || "[]").length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleMigrate} disabled={migrating}>
                {migrating ? "⏳ Migrando…" : "📤 Migrar imágenes locales a Supabase"}
              </button>
            )}
          </>
        ) : (
          <>
            <span>⚠️ <strong>Modo local</strong> — las imágenes solo se ven en este dispositivo.</span>
            <button className="btn btn-primary btn-sm" onClick={onReload}>🔄 Reintentar Supabase</button>
          </>
        )}
      </div>

      {/* Aviso SQL si tabla no existe */}
      {dbError === "no_table" && (
        <div className="gestion-sql-notice">
          <h4>Tabla no creada en Supabase</h4>
          <p>Ejecuta este SQL en <strong>Supabase Dashboard → SQL Editor</strong>:</p>
          <pre className="sql-block">{SQL_CREATE}</pre>
          <button className="btn btn-secondary btn-sm" onClick={copySql}>
            {sqlCopied ? "✅ Copiado" : "📋 Copiar SQL"}
          </button>
        </div>
      )}

      {/* Zona de subida */}
      <div className="gestion-upload-section">
        <h3>Subir nueva imagen</h3>
        <div
          className={`carta-dropzone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          {preview
            ? <img src={preview} alt="Vista previa" className="carta-dropzone-preview" />
            : uploading
            ? <><span className="carta-dropzone-icon">⏳</span><p>Procesando…</p></>
            : (
              <>
                <span className="carta-dropzone-icon">📸</span>
                <p>Arrastrá una imagen o PDF, o <u>tocá para seleccionar</u></p>
                <p className="small-muted">JPG, PNG, WEBP o PDF · se comprime automáticamente</p>
              </>
            )
          }
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        {preview && (
          <div className="carta-upload-form">
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de la sección (ej. Hamburguesas)"
              value={imgName}
              onChange={(e) => setImgName(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading || !imgName.trim()}
              >
                {uploading ? "⏳ Subiendo…" : "⬆️ Guardar imagen"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setPreview(null); setFileData(null); setImgName(""); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {pdfPages.length > 0 && (
          <div className="carta-upload-form">
            <p style={{ margin: "0 0 8px", color: "var(--color-success)" }}>
              ✅ PDF convertido — <strong>{pdfPages.length} página{pdfPages.length > 1 ? "s" : ""}</strong> listas para guardar
            </p>
            <div className="pdf-pages-preview">
              {pdfPages.map((src, i) => (
                <img key={i} src={src} alt={`pág ${i + 1}`} className="pdf-page-thumb" title={`Página ${i + 1}`} />
              ))}
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre base (ej. Menú)"
              value={pdfBase}
              onChange={(e) => setPdfBase(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleUploadPdf}
                disabled={uploading || !pdfBase.trim()}
              >
                {uploading ? "⏳ Guardando…" : `⬆️ Guardar ${pdfPages.length} página${pdfPages.length > 1 ? "s" : ""}`}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setPdfPages([]); setPdfBase(""); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de imágenes */}
      {images.length > 0 && (
        <div className="gestion-images-list">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Imágenes cargadas ({images.length})</h3>
            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                if (!confirm(`¿Eliminar las ${images.length} imágenes?`)) return;
                for (const img of [...images]) await onRemove(img.id);
              }}
            >
              🗑️ Eliminar todas
            </button>
          </div>
          {images.map((img, i) => (
            <div key={img.id} className="gestion-img-row">
              <img src={img.image_data} alt={img.name} className="gestion-thumb" />
              <div className="gestion-img-info">
                <EditableName
                  value={img.name}
                  onSave={(n) => handleRename(img, n)}
                />
                <span className="small-muted">Orden: {i + 1}</span>
              </div>
              <div className="gestion-img-actions">
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => onSwap(img.id, "up")}
                  disabled={i === 0}
                  title="Subir"
                >▲</button>
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => onSwap(img.id, "down")}
                  disabled={i === images.length - 1}
                  title="Bajar"
                >▼</button>
                <button
                  className="btn btn-danger btn-xs"
                  onClick={() => { if (confirm(`¿Eliminar "${img.name}"?`)) onRemove(img.id); }}
                  title="Eliminar"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableName({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(value);
  useEffect(() => setVal(value), [value]);
  if (editing) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); onSave(val); setEditing(false); }} style={{ display: "flex", gap: 4 }}>
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="form-input"
          autoFocus
          style={{ padding: "4px 8px", fontSize: "0.85rem" }}
        />
        <button type="submit" className="btn btn-success btn-xs">✓</button>
        <button type="button" className="btn btn-secondary btn-xs" onClick={() => { setVal(value); setEditing(false); }}>✕</button>
      </form>
    );
  }
  return (
    <span
      className="gestion-img-name"
      onClick={() => setEditing(true)}
      title="Clic para editar nombre"
    >
      {value} ✏️
    </span>
  );
}

/* ── Menú en Texto (para impresión) ─────────────────── */
function TextMenuTab({ menu, qrUrl }) {
  const categories = [...new Set(menu.map((i) => i.category).filter(Boolean))];
  return (
    <>
      <div className="carta-screen-only">
        <div className="carta-text-controls">
          <div className="carta-qr-preview">
            {qrUrl && <img src={qrUrl} alt="QR" />}
            <div>
              <h3 style={{ margin: "0 0 6px" }}>QR del Menú Online</h3>
              <p style={{ color: "var(--text-muted)", margin: "0 0 8px", fontSize: "0.9rem" }}>
                Los clientes escanean este código para ver el menú en tiempo real.
              </p>
              <a href={MENU_URL} target="_blank" rel="noopener noreferrer" className="carta-menu-url">
                {MENU_URL}
              </a>
            </div>
          </div>
          <div className="carta-hint-box">
            <span style={{ fontSize: "1.4rem" }}>💡</span>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              Haz clic en <strong>"Imprimir / Guardar PDF"</strong> y elige <strong>"Guardar como PDF"</strong> en el diálogo del navegador.
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: "1rem", padding: "10px 28px" }}
            onClick={() => window.print()}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Carta imprimible */}
      <div className="carta-print-area">
        <div className="carta-print-header">
          <div className="carta-print-brand">
            <h1 className="carta-print-title">CARBON &amp; CHEDDAR</h1>
            <div className="carta-print-tagline">
              <span>Lota, Chile</span>
              <span className="carta-dot">&bull;</span>
              <span>Hamburguesas &bull; Milanesas &bull; Almuerzos &bull; Conos</span>
            </div>
          </div>
          <div className="carta-print-qr-box">
            {qrUrl && <img src={qrUrl} alt="QR Menú" className="carta-qr-img" />}
            <p className="carta-qr-label">Escanea para ver<br />el menú online</p>
          </div>
        </div>
        <div className="carta-print-body">
          {categories.map((cat) => {
            const items = menu.filter((i) => i.category === cat);
            const meta  = CATEGORY_META[cat] || {};
            return (
              <div key={cat} className="carta-cat-block">
                <div className="carta-cat-header">
                  <span className="carta-cat-name">{cat.toUpperCase()}</span>
                  {meta.desc && <span className="carta-cat-desc">{meta.desc}</span>}
                </div>
                <div className="carta-items-list">
                  {items.map((item) => (
                    <div key={item.id} className="carta-item-row">
                      <span className="carta-item-name">{item.name}</span>
                      <span className="carta-item-dots" aria-hidden="true" />
                      <span className="carta-item-price">
                        {item.variants?.length > 0 ? `desde ${formatCLP(item.price)}` : formatCLP(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="carta-print-footer">
          Precios incluyen IVA (19%) &nbsp;|&nbsp; Carbon &amp; Cheddar &nbsp;|&nbsp; Lota, Chile &nbsp;|&nbsp;
          <span style={{ fontFamily: "monospace" }}>{MENU_URL}</span>
        </div>
      </div>
    </>
  );
}

/* ── Componente principal ────────────────────────────── */
export default function CartaView({
  menu,
  currentUserRole,
  cartaImages,
  cartaError,
  onUpsert,
  onRemove,
  onSwap,
  onReload,
}) {
  const [activeTab, setActiveTab] = useState("galeria");
  const [qrUrl,     setQrUrl]     = useState("");
  const isAdmin = ["admin", "superadmin"].includes(currentUserRole);

  useEffect(() => {
    QRCode.toDataURL(MENU_URL, { width: 220, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" }, errorCorrectionLevel: "M" })
      .then(setQrUrl).catch(console.error);
  }, []);

  const tabs = [
    { id: "galeria",  label: "🖼️ Carta",       visible: true },
    { id: "texto",    label: "📝 Menú en texto", visible: true },
    { id: "gestionar",label: "⚙️ Gestionar",     visible: isAdmin },
  ].filter(t => t.visible);

  return (
    <div className="view-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2>📄 Carta del Restaurante</h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {isAdmin
              ? "Visualiza o gestiona las imágenes de la carta digital."
              : "Carta oficial Carbon & Cheddar · Lota"}
          </p>
        </div>
        {activeTab === "texto" && (
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => window.print()}>
            🖨️ Imprimir / Guardar PDF
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="carta-tabs carta-screen-only">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`carta-tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === "galeria" && (
        <div className="carta-screen-only">
          <ImageGallery images={cartaImages} />
        </div>
      )}

      {activeTab === "gestionar" && isAdmin && (
        <div className="carta-screen-only">
          <GestionarTab
            images={cartaImages}
            dbError={cartaError}
            onUpsert={onUpsert}
            onRemove={onRemove}
            onSwap={onSwap}
            onReload={onReload}
          />
        </div>
      )}

      {activeTab === "texto" && (
        <TextMenuTab menu={menu} qrUrl={qrUrl} />
      )}
    </div>
  );
}
