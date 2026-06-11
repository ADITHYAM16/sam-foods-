import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MENU, type FoodItem } from "./menu-data";

export function useMenu() {
  const [menu, setMenu] = useState<FoodItem[]>(MENU);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await (supabase.from("menu_items") as any)
          .select("id,name,description,price,rating,category,veg,image,badge,available,sold_out")
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (!error && Array.isArray(data) && data.length > 0)
          setMenu(data as FoodItem[]);
      } catch {
        // static MENU fallback stays visible
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Fetch immediately — do NOT wait for SUBSCRIBED to avoid race
    load();

    const channel = supabase
      .channel("menu-items-changes")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "menu_items" },
        ({ new: row }) => setMenu(prev =>
          prev.some(m => m.id === (row as any).id) ? prev : [...prev, row as FoodItem]
        )
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "menu_items" },
        ({ new: row }) => setMenu(prev => prev.map(m => m.id === (row as any).id ? row as FoodItem : m))
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "menu_items" },
        ({ old: row }) => setMenu(prev => prev.filter(m => m.id !== (row as any).id))
      )
      .subscribe();

    // Refetch when tab becomes visible (back from track page etc.)
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  return { menu, loading };
}
