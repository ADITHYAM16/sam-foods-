import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MENU, type FoodItem } from "./menu-data";

export function useMenu() {
  const [menu, setMenu] = useState<FoodItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("menu_items") as any)
        .select("id,name,description,price,rating,category,veg,image,badge,available,sold_out")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[Menu] fetch error:", error.code, error.message);
        setMenu(prev => prev ?? MENU);
        return;
      }

      setMenu(Array.isArray(data) ? (data as FoodItem[]) : []);
    } catch (e) {
      console.error("[Menu] exception:", e);
      setMenu(prev => prev ?? MENU);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("menu-items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { menu: menu ?? MENU, loading };
}
