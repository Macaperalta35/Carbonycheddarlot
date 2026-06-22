// Lógica de descuento de insumos según las recetas de los productos.
// Es DEFENSIVA: si un producto no tiene receta, simplemente no descuenta nada.
// Nunca lanza errores que puedan interrumpir el cobro de una venta.

/**
 * Calcula el nuevo inventario de insumos tras vender una lista de productos.
 * @param {Array} soldItems  - [{ id: <idProducto>, qty: <cantidad> }]
 * @param {Array} recetas    - [{ id: <idProducto>, ingredients: [{ insumoId, qty }] }]
 * @param {Array} insumos    - inventario actual de insumos
 * @returns {{ insumos: Array, changed: boolean }}
 */
export function deductInsumos(soldItems, recetas, insumos) {
  try {
    if (!Array.isArray(insumos) || insumos.length === 0) return { insumos, changed: false };
    if (!Array.isArray(recetas) || recetas.length === 0) return { insumos, changed: false };

    // Acumular cantidad total a descontar por insumo
    const toDeduct = {}; // { insumoId: cantidad }
    for (const sold of soldItems || []) {
      const receta = recetas.find(r => String(r.id) === String(sold.id));
      if (!receta || !Array.isArray(receta.ingredients)) continue;
      for (const ing of receta.ingredients) {
        if (!ing?.insumoId) continue;
        const amount = (Number(ing.qty) || 0) * (Number(sold.qty) || 0);
        if (amount <= 0) continue;
        toDeduct[ing.insumoId] = (toDeduct[ing.insumoId] || 0) + amount;
      }
    }

    if (Object.keys(toDeduct).length === 0) return { insumos, changed: false };

    const updated = insumos.map(ins =>
      toDeduct[ins.id] != null
        ? { ...ins, stock: Math.max(0, (Number(ins.stock) || 0) - toDeduct[ins.id]) }
        : ins
    );
    return { insumos: updated, changed: true };
  } catch (err) {
    console.error("[recetas] Error descontando insumos (venta no afectada):", err);
    return { insumos, changed: false };
  }
}
