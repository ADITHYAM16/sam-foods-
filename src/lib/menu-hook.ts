import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MENU, type FoodItem } from "./menu-data";

// ─── Singleton store — ONE fetch + ONE channel for the entire app lifetime ────
// This prevents duplicate channels and stale-menu bugs when navigating between
// bulk-order / track / home pages, which each mount/unmount their own components.

let _menu: FoodItem[] = MENU;
let _loading = true;
let _listeners: Array<() => void> = [];
let _initialised = false;

function notify() {
  _listeners.forEach(fn => fn());
}

function initMenuStore() {
  if (_initialised) return;
  _initialised = true;

  const load = async () => {
    try {
      const { data, error } = await (supabase.from("menu_items") as any)
        .select("id,name,description,price,rating,category,veg,image,badge,available,sold_out")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        _menu = data as FoodItem[];
      }
    } catch {
      // keep static MENU fallback
    } finally {
      _loading = false;
      notify();
    }
  };

  load();

  // Single realtime channel — never removed while app is alive
  supabase
    .channel("menu-store-singleton")
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "menu_items" },
      ({ new: row }) => {
        if (_menu.some(m => m.id === (row as any).id)) return;
        _menu = [..._menu, row as FoodItem];
        notify();
      }
    )
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "menu_items" },
      ({ new: row }) => {
        _menu = _menu.map(m => m.id === (row as any).id ? (row as FoodItem) : m);
        notify();
      }
    )
    .on("postgres_changes",
      { event: "DELETE", schema: "public", table: "menu_items" },
      ({ old: row }) => {
        _menu = _menu.filter(m => m.id !== (row as any).id);
        notify();
      }
    )
    .subscribe();

  // Refetch when tab regains focus — handles stale data after long idle
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
}

export function useMenu() {
  const [menu, setMenu] = useState<FoodItem[]>(_menu);
  const [loading, setLoading] = useState(_loading);

  useEffect(() => {
    // Initialise singleton on first use
    initMenuStore();

    // Sync local state from singleton immediately (in case it already loaded)
    setMenu(_menu);
    setLoading(_loading);

    // Subscribe to future updates
    const listener = () => {
      setMenu([..._menu]);
      setLoading(_loading);
    };
    _listeners.push(listener);

    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }, []);

  return { menu, loading };
}
