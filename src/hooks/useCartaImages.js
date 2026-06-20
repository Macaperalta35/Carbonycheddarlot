import { useState, useEffect, useCallback } from "react";
import { supabase, isConfigured } from "../lib/supabase";

const TABLE  = "carta_images";
const LS_KEY = "carbon_cheddar_carta_imgs_v1";

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function saveLocal(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
  catch { console.warn("localStorage lleno, imagen no guardada localmente"); }
}

export function useCartaImages() {
  const [images,  setImages]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null); // null | "no_table" | string

  const load = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) {
      setImages(getLocal());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, name, image_data, sort_order")
      .order("sort_order");
    if (error) {
      // 42P01 = relación no existe
      setDbError(error.code === "42P01" ? "no_table" : error.message);
      setImages(getLocal());
    } else {
      setDbError(null);
      setImages(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const useLocal = !isConfigured || dbError === "no_table";

  const upsert = useCallback(async (img) => {
    if (useLocal) {
      setImages(prev => {
        const idx = prev.findIndex(i => i.id === img.id);
        const next = idx >= 0
          ? prev.map((x, i) => i === idx ? img : x)
          : [...prev, img].sort((a, b) => a.sort_order - b.sort_order);
        saveLocal(next);
        return next;
      });
      return null;
    }
    const { error } = await supabase.from(TABLE).upsert(img, { onConflict: "id" });
    if (error) {
      console.error("[CartaImages] Supabase upsert error:", error);
      return error;
    }
    setImages(prev => {
      const idx = prev.findIndex(i => i.id === img.id);
      return idx >= 0
        ? prev.map((x, i) => i === idx ? img : x)
        : [...prev, img].sort((a, b) => a.sort_order - b.sort_order);
    });
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocal]);

  const remove = useCallback(async (id) => {
    if (useLocal) {
      setImages(prev => { const n = prev.filter(i => i.id !== id); saveLocal(n); return n; });
      return;
    }
    await supabase.from(TABLE).delete().eq("id", id);
    setImages(prev => prev.filter(i => i.id !== id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocal]);

  const swap = useCallback(async (id, dir) => {
    setImages(prev => {
      const idx = prev.findIndex(i => i.id === id);
      const j   = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.map((x, i) => {
        if (i === idx) return { ...x, sort_order: prev[j].sort_order };
        if (i === j)   return { ...x, sort_order: prev[idx].sort_order };
        return x;
      }).sort((a, b) => a.sort_order - b.sort_order);
      if (useLocal) saveLocal(next);
      else supabase.from(TABLE).upsert([next[idx], next[j]]);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocal]);

  return { images, loading, dbError, reload: load, upsert, remove, swap };
}
