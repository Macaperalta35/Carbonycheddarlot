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

  // Merge de schema: para los productos del código, los datos de la base mandan
  // (nombre, precio, stock…), así las ediciones persisten. Además se incluyen los
  // productos creados desde el panel que NO están en el código (DB-only), para que
  // los productos agregados manualmente también persistan.
  const applyMerge = useCallback((rows) => {
    const rowMap  = new Map(rows.map(r => [String(r.id), r]));
    const codeIds = new Set(initialData.map(i => String(i.id)));
    const fromCode = initialData.map(init => {
      const dbRow = rowMap.get(String(init.id));
      return dbRow ? { ...init, ...dbRow } : init;
    });
    const fromDbOnly = rows.filter(r => !codeIds.has(String(r.id)));
    return [...fromCode, ...fromDbOnly];
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
          const merged      = applyMerge(rows);

          // Sembrar en la base solo los productos del código que aún no existen
          // (NO se borran huérfanos: los productos creados desde el panel se conservan)
          const toUpsert = initialData.filter(item => !rowMap.has(String(item.id)));
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
