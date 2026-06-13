import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export const SAM_FOODS_LAT = 11.494775161299012;
export const SAM_FOODS_LNG = 78.02874317260576;
export const DELIVERY_RADIUS_KM = 10;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinDeliveryRadius(lat: number, lng: number): boolean {
  return haversineKm(SAM_FOODS_LAT, SAM_FOODS_LNG, lat, lng) <= DELIVERY_RADIUS_KM;
}
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
  fetchGPS: () => Promise<{ address: string; lat: number; lng: number } | null>;
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

  const fetchGPS = useCallback((): Promise<{ address: string; lat: number; lng: number } | null> => {
    if (!navigator.geolocation) return Promise.resolve(null);
    setGpsLoading(true);
    return new Promise((resolve) => {
      // Use low accuracy first for fast response on mobile, then high accuracy
      const tryGet = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            try {
              const ctrl = new AbortController();
              setTimeout(() => ctrl.abort(), 5000);
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { signal: ctrl.signal }
              );
              const json = await res.json();
              if (json.display_name) address = json.display_name;
            } catch { /* use coordinate fallback */ }
            localStorage.setItem(GPS_KEY, JSON.stringify({ address, lat, lng }));
            if (user) {
              const existing = saved.find((a) => a.label === "Current Location");
              if (existing) {
                (supabase.from("saved_addresses") as any)
                  .update({ address, lat, lng }).eq("id", existing.id)
                  .then(() => setSaved((prev) => prev.map((a) => a.id === existing.id ? { ...a, address, lat, lng } : a)));
              } else {
                saveAddress("Current Location", address, lat, lng);
              }
            }
            setGpsLoading(false);
            resolve({ address, lat, lng });
          },
          (err) => {
            // If high accuracy fails, retry with low accuracy
            if (highAccuracy) {
              tryGet(false);
            } else {
              setGpsLoading(false);
              resolve(null);
            }
          },
          { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 5000, maximumAge: 30000 }
        );
      };
      tryGet(true);
    });
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
