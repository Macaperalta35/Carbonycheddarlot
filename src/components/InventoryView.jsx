import React, { useState } from "react";

export default function InventoryView({ menu, setMenu, insumos = [], recetas = [], setRecetas }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCritical, setFilterCritical] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Campos del formulario de edición
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");

  // Receta del producto: líneas { insumoId, qty } (qty en la unidad del insumo)
  const [recipeLines, setRecipeLines] = useState([]);
  const canEditRecipe = typeof setRecetas === "function";

  const insumoUnit = (id) => insumos.find(i => i.id === id)?.unit || "";
  const recipeCount = (productId) => {
    const r = recetas.find(x => String(x.id) === String(productId));
    return r?.ingredients?.length || 0;
  };

  // Categorías reales tomadas del menú (evita forzar valores que no existen)
  const categories = Array.from(new Set(menu.map(i => i.category))).filter(Boolean);

  // Filtrado de ítems
  const filteredItems = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCritical = !filterCritical || item.stock < 5;
    return matchesSearch && matchesCritical;
  });

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditStock(item.stock);
    setEditDesc(item.description || "");
    setEditCategory(item.category);
    const existing = recetas.find(r => String(r.id) === String(item.id));
    setRecipeLines(existing?.ingredients?.length ? existing.ingredients.map(x => ({ ...x })) : []);
  };

  // Helpers de la receta
  const addRecipeLine    = () => setRecipeLines([...recipeLines, { insumoId: "", qty: 1 }]);
  const updateRecipeLine = (idx, field, value) => setRecipeLines(recipeLines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const removeRecipeLine = (idx) => setRecipeLines(recipeLines.filter((_, i) => i !== idx));

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editName.trim() || editPrice <= 0 || editStock < 0) {
      alert("Por favor ingresa datos válidos.");
      return;
    }

    const updatedMenu = menu.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: editName.trim(),
          price: parseInt(editPrice),
          stock: parseInt(editStock),
          description: editDesc.trim(),
          category: editCategory
        };
      }
      return item;
    });

    setMenu(updatedMenu);

    // Guardar la receta del producto (materias primas que se descuentan al vender)
    if (canEditRecipe) {
      const ingredients = recipeLines
        .filter(l => l.insumoId && Number(l.qty) > 0)
        .map(l => ({ insumoId: l.insumoId, qty: Number(l.qty) }));
      const record = { id: String(editingItem.id), productName: editName.trim(), ingredients };
      const exists = recetas.find(r => String(r.id) === String(editingItem.id));
      if (exists) {
        setRecetas(recetas.map(r => String(r.id) === String(editingItem.id) ? record : r));
      } else if (ingredients.length > 0) {
        setRecetas([...recetas, record]);
      }
    }

    setEditingItem(null);
  };

  const handleAddStockQuickly = (itemId, amount) => {
    const updatedMenu = menu.map(item => {
      if (item.id === itemId) {
        const newStock = Math.max(0, item.stock + amount);
        return { ...item, stock: newStock };
      }
      return item;
    });
    setMenu(updatedMenu);
  };

  const formatCLP = (value) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="inventory-container fade-in">
      <div className="inventory-header">
        <div>
          <h1>Gestión de Inventario 📦</h1>
          <p className="subtitle">Monitorea y actualiza el stock y los precios de Carbon & Cheddar</p>
        </div>

        {/* Indicador rápido de productos críticos */}
        <div className="critical-summary">
          <span>Críticos (&lt; 5 unidades):</span>
          <span className="badge badge-danger">
            {menu.filter(i => i.stock < 5).length} productos
          </span>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="inventory-toolbar">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-checkbox-wrapper">
          <label className="checkbox-label" htmlFor="critical-filter">
            <input 
              id="critical-filter"
              type="checkbox" 
              checked={filterCritical}
              onChange={(e) => setFilterCritical(e.target.checked)}
            />
            <span>Mostrar sólo stock crítico (&lt; 5 unidades)</span>
          </label>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="table-responsive">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Prod.</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio (IVA Inc.)</th>
              <th>Stock Actual</th>
              <th>Estado Stock</th>
              <th>Acciones Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-table-cell">No se encontraron productos.</td>
              </tr>
            ) : (
              filteredItems.map(item => {
                const isCritical = item.stock < 5;
                const isOutOfStock = item.stock === 0;

                return (
                  <tr key={item.id} className={isCritical ? "row-warning" : ""}>
                    <td>{item.id}</td>
                    <td className="cell-emoji">{item.emoji}</td>
                    <td className="cell-name">
                      <strong>{item.name}</strong>
                      <p className="cell-desc-preview">{item.description}</p>
                      {canEditRecipe && (
                        recipeCount(item.id) > 0
                          ? <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>🧾 Receta: {recipeCount(item.id)}</span>
                          : <span className="badge badge-warning" style={{ fontSize: "0.65rem" }}>Sin receta</span>
                      )}
                    </td>
                    <td><span className="category-tag">{item.category}</span></td>
                    <td className="bold">{formatCLP(item.price)}</td>
                    <td className={`cell-stock bold ${isCritical ? "text-danger" : ""}`}>
                      {item.stock} u.
                    </td>
                    <td>
                      {isOutOfStock ? (
                        <span className="badge badge-danger">Sin Stock</span>
                      ) : isCritical ? (
                        <span className="badge badge-warning pulse">¡Stock Crítico!</span>
                      ) : (
                        <span className="badge badge-success">OK</span>
                      )}
                    </td>
                    <td>
                      <div className="quick-actions-cell">
                        <button 
                          className="btn btn-secondary btn-xs" 
                          onClick={() => handleAddStockQuickly(item.id, 5)}
                        >
                          +5 Stock
                        </button>
                        <button 
                          className="btn btn-primary btn-xs" 
                          onClick={() => handleOpenEdit(item)}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición de Producto */}
      {editingItem && (
        <div className="modal-backdrop">
          <div className="modal-content inventory-edit-modal fade-in">
            <h2>Editar Producto</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-prod-name">Nombre del Producto</label>
                  <input 
                    id="edit-prod-name"
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-row-2">
                  <div className="form-group">
                    <label htmlFor="edit-prod-price">Precio (CLP, IVA Incl.)</label>
                    <input 
                      id="edit-prod-price"
                      type="number" 
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-prod-stock">Stock en Inventario</label>
                    <input 
                      id="edit-prod-stock"
                      type="number" 
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-prod-category">Categoría</label>
                  <select 
                    id="edit-prod-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-prod-desc">Descripción</label>
                  <textarea
                    id="edit-prod-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows="3"
                  />
                </div>

                {/* Receta: materias primas que se descuentan al vender este producto */}
                {canEditRecipe && (
                  <div className="form-group recipe-editor">
                    <label>Receta · materias primas (se descuentan al vender)</label>
                    {insumos.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: "0.82rem" }}>
                        Aún no hay insumos. Créalos en la pestaña <strong>Insumos</strong> (puedes usar unidades kg, gr o unidad).
                      </p>
                    ) : (
                      <>
                        {recipeLines.map((l, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                            <select
                              value={l.insumoId}
                              onChange={(e) => updateRecipeLine(idx, "insumoId", e.target.value)}
                              style={{ flex: 2 }}
                            >
                              <option value="">— Materia prima —</option>
                              {insumos.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={l.qty}
                              onChange={(e) => updateRecipeLine(idx, "qty", e.target.value)}
                              placeholder="Cant."
                              style={{ width: 90 }}
                            />
                            <span style={{ minWidth: 30, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                              {insumoUnit(l.insumoId)}
                            </span>
                            <button type="button" className="btn-delete-row" onClick={() => removeRecipeLine(idx)}>🗑️</button>
                          </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-xs" onClick={addRecipeLine}>
                          + Agregar materia prima
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
