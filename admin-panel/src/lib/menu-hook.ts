import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MENU, type FoodItem } from "./menu-data";

// ─── Singleton store — ONE fetch + ONE channel for the entire app lifetime ────
let _menu: FoodItem[] = MENU;
let _loading = true;
let _listeners: Array<() => void> = [];
let _channelReady = false;

function notify() {
  _listeners.forEach(fn => fn());
}

export async function refetchMenu() {
  _loading = true;
  notify();
  try {
    const { data, error } = await (supabase.from("menu_items") as any)
      .select("id,name,description,price,rating,category,veg,image,badge,available,sold_out")
      .order("created_at", { ascending: true });
    if (!error && Array.isArray(data) && data.length > 0) {
      _menu = data as FoodItem[];
    }
  } catch {
    // keep current menu
  } finally {
    _loading = false;
    notify();
  }
}

function initMenuStore() {
  if (_channelReady) return;
  _channelReady = true;

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
    if (!document.hidden) refetchMenu();
  });
}

export function useMenu() {
  const [menu, setMenu] = useState<FoodItem[]>(_menu);
  const [loading, setLoading] = useState(_loading);

  useEffect(() => {
    const listener = () => {
      setMenu([..._menu]);
      setLoading(_loading);
    };
    _listeners.push(listener);

    // Always trigger a fresh fetch on mount so navigating back shows full menu
    refetchMenu();

    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }, []);

  // Also init the realtime channel once
  useEffect(() => {
    initMenuStore();
  }, []);

  return { menu, loading };
}
