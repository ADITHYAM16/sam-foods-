import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  is_default: boolean;
}

interface LocationContextValue {
  active: SavedAddress | null;
  saved: SavedAddress[];
  gpsLoading: boolean;
  saveAddress: (label: string, address: string, lat?: number, lng?: number) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  fetchGPS: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);
const GPS_KEY = "sam_gps_address";

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setSaved([]); return; }
    const { data } = await (supabase.from("saved_addresses") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setSaved((data as SavedAddress[]) ?? []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const active: SavedAddress | null =
    saved.find((a) => a.is_default) ?? saved[0] ?? null;

  const saveAddress = async (label: string, address: string, lat?: number, lng?: number) => {
    if (!user) return;
    const isFirst = saved.length === 0;
    const { data } = await (supabase.from("saved_addresses") as any)
      .insert({ user_id: user.id, label, address, lat: lat ?? null, lng: lng ?? null, is_default: isFirst })
      .select()
      .single();
    if (data) setSaved((prev) => [...prev, data as SavedAddress]);
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await (supabase.from("saved_addresses") as any).update({ is_default: false }).eq("user_id", user.id);
    await (supabase.from("saved_addresses") as any).update({ is_default: true }).eq("id", id);
    setSaved((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  const deleteAddress = async (id: string) => {
    await (supabase.from("saved_addresses") as any).delete().eq("id", id);
    setSaved((prev) => prev.filter((a) => a.id !== id));
  };

  const fetchGPS = useCallback(async () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const json = await res.json();
          const address: string =
            json.display_name ??
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          localStorage.setItem(GPS_KEY, JSON.stringify({ address, lat, lng }));
          if (user) {
            // Update existing "Current Location" row if it exists, otherwise insert
            const existing = saved.find((a) => a.label === "Current Location");
            if (existing) {
              await (supabase.from("saved_addresses") as any)
                .update({ address, lat, lng })
                .eq("id", existing.id);
              setSaved((prev) => prev.map((a) => a.id === existing.id ? { ...a, address, lat, lng } : a));
            } else {
              await saveAddress("Current Location", address, lat, lng);
            }
          }
        } catch {
          /* ignore reverse-geocode failure */
        } finally {
          setGpsLoading(false);
        }
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [user, saved]);

  return (
    <LocationContext.Provider value={{ active, saved, gpsLoading, saveAddress, setDefault, deleteAddress, fetchGPS }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
