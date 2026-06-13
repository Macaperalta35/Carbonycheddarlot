import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { useLocalStorage } from './useLocalStorage';

/**
 * Reemplaza useLocalStorage con persistencia en Supabase.
 * Si Supabase no está configurado, vuelve a localStorage automáticamente.
 *
 * Uso:  const [data, setData, loading] = useSupabaseData('orders', [], { orderBy: 'timestamp' })
 * Igual que useLocalStorage:  setData(newArray)  o  setData(prev => [...prev, item])
 */
export function useSupabaseData(tableName, localKey, initialData = [], options = {}) {
  const { orderBy = 'created_at', orderAsc = false } = options;

  // ─── Fallback a localStorage si Supabase no está configurado ──
  const [lsData, setLsData] = useLocalStorage(localKey, initialData);
  const [sbData, setSbData] = useState(initialData);
  const [loading, setLoading] = useState(isConfigured);

  const prevRef  = useRef(initialData);
  const readyRef = useRef(false);

  // ─── Carga inicial desde Supabase ─────────────────────────────
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
        // Tabla tiene datos → usar los de Supabase
        setSbData(rows);
        prevRef.current = rows;
      } else if (initialData.length > 0) {
        // Tabla vacía + hay datos iniciales → sembrar (seed)
        const { error: seedErr } = await supabase
          .from(tableName)
          .insert(initialData);
        if (!seedErr) {
          setSbData(initialData);
          prevRef.current = initialData;
        } else {
          console.warn(`[Supabase] Error sembrando ${tableName}:`, seedErr.message);
        }
      }

      setLoading(false);
      readyRef.current = true;
    };

    load();

    // Suscripción en tiempo real para sincronizar con otros dispositivos
    const channel = supabase
      .channel(`rt:${tableName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName },
        async () => {
          if (!readyRef.current) return;
          const q = supabase.from(tableName).select('*');
          if (orderBy) q.order(orderBy, { ascending: orderAsc });
          const { data: fresh } = await q;
          if (fresh) {
            setSbData(fresh);
            prevRef.current = fresh;
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tableName]);

  // ─── setData: actualiza estado local Y sincroniza con Supabase ─
  const setSupabaseData = useCallback(async (newDataOrFn) => {
    const prev      = prevRef.current;
    const newData   = typeof newDataOrFn === 'function' ? newDataOrFn(prev) : newDataOrFn;

    // Actualización optimista (inmediata en UI)
    setSbData(newData);
    prevRef.current = newData;

    if (!readyRef.current) return;

    // Detectar inserciones y modificaciones
    const toUpsert = newData.filter(item => {
      const prevItem = prev.find(p => String(p.id) === String(item.id));
      return !prevItem || JSON.stringify(prevItem) !== JSON.stringify(item);
    });

    // Detectar eliminaciones
    const newIds  = new Set(newData.map(n => String(n.id)));
    const toDelete = prev.filter(p => !newIds.has(String(p.id)));

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .upsert(toUpsert, { onConflict: 'id' });
      if (error) console.error(`[Supabase] Error upsert ${tableName}:`, error.message);
    }

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', toDelete.map(d => d.id));
      if (error) console.error(`[Supabase] Error delete ${tableName}:`, error.message);
    }
  }, [tableName]);

  // ─── Retorno ──────────────────────────────────────────────────
  if (!isConfigured) {
    // Sin Supabase → funciona igual que antes con localStorage
    return [lsData, setLsData, false];
  }

  return [sbData, setSupabaseData, loading];
}
