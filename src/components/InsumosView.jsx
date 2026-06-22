import React, { useState } from "react";

const UNITS = ["un", "kg", "gr", "lt", "ml", "paquete", "caja", "docena"];

const makeId = () => "ins-" + Date.now().toString(36) + Math.floor(Math.random() * 1000);

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v || 0);

export default function InsumosView({ menu = [], insumos = [], setInsumos, recetas = [], setRecetas }) {
  const [tab, setTab] = useState("insumos"); // 'insumos' | 'recetas'
  const [search, setSearch] = useState("");

  // ── Edición de insumo ──
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "un", stock: 0, minStock: 0, cost: 0 });

  const openNew = () => { setEditing({ id: null }); setForm({ name: "", unit: "un", stock: 0, minStock: 0, cost: 0 }); };
  const openEdit = (i) => { setEditing(i); setForm({ name: i.name, unit: i.unit, stock: i.stock, minStock: i.minStock, cost: i.cost }); };

  const saveInsumo = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Ingresa el nombre del insumo."); return; }
    const data = {
      name: form.name.trim(),
      unit: form.unit,
      stock: parseFloat(form.stock) || 0,
      minStock: parseFloat(form.minStock) || 0,
      cost: parseInt(form.cost) || 0,
    };
    if (editing.id) {
      setInsumos(insumos.map(i => i.id === editing.id ? { ...i, ...data } : i));
    } else {
      setInsumos([...insumos, { id: makeId(), ...data }]);
    }
    setEditing(null);
  };

  const deleteInsumo = (id) => {
    if (window.confirm("¿Eliminar este insumo?")) setInsumos(insumos.filter(i => i.id !== id));
  };

  const addStock = (id, amount) => {
    setInsumos(insumos.map(i => i.id === id ? { ...i, stock: Math.max(0, (Number(i.stock) || 0) + amount) } : i));
  };

  // ── Editor de recetas ──
  const [recipeProduct, setRecipeProduct] = useState(null); // producto del menú
  const [recipeLines, setRecipeLines] = useState([]);       // [{ insumoId, qty }]

  const openRecipe = (product) => {
    const existing = recetas.find(r => String(r.id) === String(product.id));
    setRecipeProduct(product);
    setRecipeLines(existing?.ingredients?.length ? existing.ingredients.map(x => ({ ...x })) : [{ insumoId: "", qty: 1 }]);
  };
  const updateLine = (idx, field, value) => setRecipeLines(recipeLines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const addLine = () => setRecipeLines([...recipeLines, { insumoId: "", qty: 1 }]);
  const removeLine = (idx) => setRecipeLines(recipeLines.filter((_, i) => i !== idx));

  const saveRecipe = (e) => {
    e.preventDefault();
    const ingredients = recipeLines
      .filter(l => l.insumoId && Number(l.qty) > 0)
      .map(l => ({ insumoId: l.insumoId, qty: Number(l.qty) }));

    const record = { id: String(recipeProduct.id), productName: recipeProduct.name, ingredients };
    const exists = recetas.find(r => String(r.id) === String(recipeProduct.id));
    if (exists) {
      setRecetas(recetas.map(r => String(r.id) === String(recipeProduct.id) ? record : r));
    } else {
      setRecetas([...recetas, record]);
    }
    setRecipeProduct(null);
  };

  const insumoName = (id) => insumos.find(i => i.id === id)?.name || "—";
  const recipeCount = (productId) => {
    const r = recetas.find(x => String(x.id) === String(productId));
    return r?.ingredients?.length || 0;
  };

  const lowCount = insumos.filter(i => Number(i.stock) <= Number(i.minStock)).length;
  const filteredInsumos = insumos.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredMenu = menu.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="inventory-container fade-in">
      <div className="inventory-header">
        <div>
          <h1>Insumos & Recetas 🥬</h1>
          <p className="subtitle">Inventario de ingredientes y receta de cada producto (se descuenta al vender)</p>
        </div>
        <div className="critical-summary">
          <span>Bajo mínimo:</span>
          <span className="badge badge-danger">{lowCount}</span>
        </div>
      </div>

      <div className="nav-tabs" style={{ marginBottom: 16 }}>
        <button className={`nav-tab-btn ${tab === "insumos" ? "active" : ""}`} onClick={() => setTab("insumos")}>📦 Insumos</button>
        <button className={`nav-tab-btn ${tab === "recetas" ? "active" : ""}`} onClick={() => setTab("recetas")}>📝 Recetas</button>
      </div>

      <div className="inventory-toolbar">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {tab === "insumos" && <button className="btn btn-primary btn-sm" onClick={openNew}>➕ Nuevo insumo</button>}
      </div>

      {/* ── TAB INSUMOS ── */}
      {tab === "insumos" && (
        <div className="table-responsive">
          <table className="inventory-table">
            <thead>
              <tr><th>Insumo</th><th>Unidad</th><th>Stock</th><th>Mínimo</th><th>Costo</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filteredInsumos.length === 0 ? (
                <tr><td colSpan="7" className="empty-table-cell">No hay insumos.</td></tr>
              ) : filteredInsumos.map(i => {
                const low = Number(i.stock) <= Number(i.minStock);
                return (
                  <tr key={i.id} className={low ? "row-warning" : ""}>
                    <td className="cell-name"><strong>{i.name}</strong></td>
                    <td>{i.unit}</td>
                    <td className={`bold ${low ? "text-danger" : ""}`}>{i.stock}</td>
                    <td>{i.minStock}</td>
                    <td>{formatCLP(i.cost)}</td>
                    <td>{low ? <span className="badge badge-warning pulse">Bajo mínimo</span> : <span className="badge badge-success">OK</span>}</td>
                    <td>
                      <div className="quick-actions-cell">
                        <button className="btn btn-secondary btn-xs" onClick={() => addStock(i.id, 10)}>+10</button>
                        <button className="btn btn-primary btn-xs" onClick={() => openEdit(i)}>Editar</button>
                        <button className="btn btn-secondary btn-xs" onClick={() => deleteInsumo(i.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB RECETAS ── */}
      {tab === "recetas" && (
        <div className="table-responsive">
          <table className="inventory-table">
            <thead>
              <tr><th>Producto</th><th>Categoría</th><th>Ingredientes</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {filteredMenu.length === 0 ? (
                <tr><td colSpan="4" className="empty-table-cell">No hay productos.</td></tr>
              ) : filteredMenu.map(p => {
                const count = recipeCount(p.id);
                return (
                  <tr key={p.id}>
                    <td className="cell-name">{p.emoji} <strong>{p.name}</strong></td>
                    <td><span className="category-tag">{p.category}</span></td>
                    <td>{count > 0 ? <span className="badge badge-success">{count} ingrediente(s)</span> : <span className="badge badge-warning">Sin receta</span>}</td>
                    <td><button className="btn btn-primary btn-xs" onClick={() => openRecipe(p)}>{count > 0 ? "Editar receta" : "Crear receta"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: editar insumo */}
      {editing && (
        <div className="modal-backdrop">
          <div className="modal-content inventory-edit-modal fade-in">
            <h2>{editing.id ? "Editar insumo" : "Nuevo insumo"}</h2>
            <form onSubmit={saveInsumo}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="modal-row-2">
                  <div className="form-group">
                    <label>Unidad</label>
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Costo unitario (CLP)</label>
                    <input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                  </div>
                </div>
                <div className="modal-row-2">
                  <div className="form-group">
                    <label>Stock actual</label>
                    <input type="number" min="0" step="any" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Stock mínimo</label>
                    <input type="number" min="0" step="any" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: editar receta */}
      {recipeProduct && (
        <div className="modal-backdrop">
          <div className="modal-content inventory-edit-modal fade-in">
            <h2>Receta: {recipeProduct.name}</h2>
            <p className="subtitle">Define qué insumos se descuentan por cada unidad vendida.</p>
            <form onSubmit={saveRecipe}>
              <div className="modal-body">
                {insumos.length === 0 && (
                  <p className="text-danger">Primero crea insumos en la pestaña "Insumos".</p>
                )}
                {recipeLines.map((l, idx) => (
                  <div key={idx} className="doc-line-row" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={l.insumoId} onChange={(e) => updateLine(idx, "insumoId", e.target.value)} style={{ flex: 2 }}>
                      <option value="">— Insumo —</option>
                      {insumos.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                    <input type="number" min="0" step="any" value={l.qty} onChange={(e) => updateLine(idx, "qty", e.target.value)} style={{ width: 90 }} placeholder="Cant." />
                    <button type="button" className="btn-delete-row" onClick={() => removeLine(idx)}>🗑️</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>+ Agregar ingrediente</button>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setRecipeProduct(null)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Guardar receta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
