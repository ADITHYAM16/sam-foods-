import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  user_id: string | null;
  name: string;
  role: string;
  rating: number;
  text: string;
  created_at: string;
}

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await (supabase.from("reviews") as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setReviews((data as Review[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel("reviews-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const submitReview = async (userId: string, name: string, role: string, rating: number, text: string) => {
    const { error } = await (supabase.from("reviews") as any).upsert(
      { user_id: userId, name, role, rating, text },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);
  };

  return { reviews, loading, submitReview };
}
