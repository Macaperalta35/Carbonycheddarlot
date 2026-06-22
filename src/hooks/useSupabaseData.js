import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { useLocalStorage } from './useLocalStorage';

/**
 * Reemplaza useLocalStorage con persistencia en Supabase.
 * Si Supabase no está configurado, vuelve a localStorage automáticamente.
 *
 * mergeSchema: true → para menú. Siempre usa initialData como fuente de verdad
 * para nombre/precio/categoría/etc., conservando solo el stock desde Supabase.
 * Elimina items de Supabase que ya no existen en initialData.
 */
export function useSupabaseData(tableName, localKey, initialData = [], options = {}) {
  const { orderBy = 'created_at', orderAsc = false, mergeSchema = false } = options;

  const [lsData, setLsData] = useLocalStorage(localKey, initialData);
  // Offline-first: arrancamos con la última copia local cacheada (si existe),
  // así la app muestra datos al instante aunque no haya internet.
  const [sbData, setSbData] = useState(lsData);
  // Solo bloqueamos con spinner si NO hay nada cacheado todavía.
  const [loading, setLoading] = useState(isConfigured && (!lsData || lsData.length === 0));

  const prevRef  = useRef(lsData);
  const readyRef = useRef(false);

  // Guarda en estado + caché local (para sobrevivir sin conexión y entre recargas)
  const commit = useCallback((data) => {
    setSbData(data);
    prevRef.current = data;
    setLsData(data);
  }, [setLsData]);

  // Aplica el merge de schema: initialData con stock de DB, descarta items huérfanos
  const applyMerge = useCallback((rows) => {
    const rowMap  = new Map(rows.map(r => [String(r.id), r]));
    return initialData.map(init => ({
      ...init,
      stock: rowMap.has(String(init.id)) ? rowMap.get(String(init.id)).stock : init.stock,
    }));
  }, [initialData]);

  useEffect(() => {
    if (!isConfigured) return;

    const load = async () => {
      setLoading(true);
      const query = supabase.from(tableName).select('*');
      if (orderBy) query.order(orderBy, { ascending: orderAsc });
      const { data: rows, error } = await query;

      if (error) {
        console.error(`[Supabase] Error cargando ${tableName}:`, error.message);
        setLoading(false);
        return;
      }

      if (rows && rows.length > 0) {
        if (mergeSchema && initialData.length > 0) {
          const rowMap      = new Map(rows.map(r => [String(r.id), r]));
          const initIdSet   = new Set(initialData.map(i => String(i.id)));
          const merged      = applyMerge(rows);

          // Eliminar ítems huérfanos (en DB pero no en initialData)
          const toDelete = rows.filter(r => !initIdSet.has(String(r.id)));
          if (toDelete.length > 0) {
            await supabase.from(tableName).delete().in('id', toDelete.map(d => d.id));
          }

          // Upsert ítems nuevos o con metadata cambiada (excluye stock)
          const toUpsert = merged.filter(item => {
            const ex = rowMap.get(String(item.id));
            if (!ex) return true;
            const keys = Object.keys(item).filter(k => k !== 'stock');
            return keys.some(k => JSON.stringify(item[k]) !== JSON.stringify(ex[k]));
          });
          if (toUpsert.length > 0) {
            await supabase.from(tableName).upsert(toUpsert, { onConflict: 'id' });
          }

          commit(merged);
        } else {
          commit(rows);
        }
      } else if (initialData.length > 0) {
        const { error: seedErr } = await supabase.from(tableName).insert(initialData);
        if (!seedErr) {
          commit(initialData);
        } else {
          console.warn(`[Supabase] Error sembrando ${tableName}:`, seedErr.message);
        }
      }

      setLoading(false);
      readyRef.current = true;
    };

    load();

    // Suscripción real-time — respeta mergeSchema para no reintroducir items viejos
    const channel = supabase
      .channel(`rt:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName },
        async () => {
          if (!readyRef.current) return;
          const q = supabase.from(tableName).select('*');
          if (orderBy) q.order(orderBy, { ascending: orderAsc });
          const { data: fresh } = await q;
          if (!fresh) return;

          const result = mergeSchema && initialData.length > 0
            ? applyMerge(fresh)
            : fresh;

          commit(result);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  const setSupabaseData = useCallback(async (newDataOrFn) => {
    const prev    = prevRef.current;
    const newData = typeof newDataOrFn === 'function' ? newDataOrFn(prev) : newDataOrFn;

    // Cachea de inmediato (optimista) para no perder cambios sin conexión
    commit(newData);

    if (!readyRef.current) return;

    const toUpsert = newData.filter(item => {
      const prevItem = prev.find(p => String(p.id) === String(item.id));
      return !prevItem || JSON.stringify(prevItem) !== JSON.stringify(item);
    });

    const newIds   = new Set(newData.map(n => String(n.id)));
    const toDelete = prev.filter(p => !newIds.has(String(p.id)));

    if (toUpsert.length > 0) {
      const { error } = await supabase.from(tableName).upsert(toUpsert, { onConflict: 'id' });
      if (error) console.error(`[Supabase] Error upsert ${tableName}:`, error.message);
    }
    if (toDelete.length > 0) {
      const { error } = await supabase.from(tableName).delete().in('id', toDelete.map(d => d.id));
      if (error) console.error(`[Supabase] Error delete ${tableName}:`, error.message);
    }
  }, [tableName, commit]);

  if (!isConfigured) return [lsData, setLsData, false];
  return [sbData, setSupabaseData, loading];
}
