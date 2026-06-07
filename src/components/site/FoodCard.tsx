import { Heart, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { FoodItem } from "@/lib/menu-data";
import { useCart } from "@/lib/cart-context";

const FAV_KEY = "sam_favourites";

function getFavs(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); } catch { return []; }
}
function toggleFavStorage(id: string): boolean {
  const favs = getFavs();
  const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return next.includes(id);
}

export function FoodCard({ item, index = 0 }: { item: FoodItem; index?: number }) {
  const { add } = useCart();
  const [fav, setFav] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    setFav(getFavs().includes(item.id));
  }, [item.id]);

  const handleAdd = () => {
    add(item);
    setBurst(true);
    setTimeout(() => setBurst(false), 600);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: "easeOut" }}
      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-elegant"
    >
      {/* Fixed-ratio image container */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: "66.66%" }}>
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110 ${item.sold_out ? "brightness-50" : ""}`}
        />
        {item.sold_out && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border-2 border-white/80 bg-black/60 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-white backdrop-blur">
              Sold Out
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold backdrop-blur ${item.veg ? "border-emerald-600/50 bg-emerald-50/70 text-emerald-700" : "border-rose-600/50 bg-rose-50/70 text-rose-700"}`}>
            <span className={`h-2 w-2 rounded-full ${item.veg ? "bg-emerald-600" : "bg-rose-600"}`} /> {item.veg ? "VEG" : "NON-VEG"}
          </span>
          <button
            aria-label="Favourite"
            onClick={() => setFav(toggleFavStorage(item.id))}
            className="grid h-9 w-9 place-items-center rounded-full bg-background/80 backdrop-blur transition hover:scale-110"
          >
            <Heart className={`h-4 w-4 transition ${fav ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        </div>
        {item.badge && (
          <span className="absolute bottom-3 left-3 rounded-full gradient-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
            {item.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2 md:p-4">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-[Fraunces] text-sm font-bold leading-snug md:text-lg">{item.name}</h3>
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
            <Star className="h-3 w-3 fill-current" /> {item.rating}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground md:line-clamp-2 md:text-sm">{item.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2 md:pt-4">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Price</div>
            <div className="text-base font-bold md:text-xl">₹{item.price}</div>
          </div>

          {/* Add button */}
          <div className="relative">
            {item.sold_out ? (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground md:px-4 md:py-2">
                Sold Out
              </span>
            ) : (
              <motion.button
                onClick={handleAdd}
                whileTap={{ scale: 0.82 }}
                className="relative inline-flex items-center gap-1 overflow-hidden rounded-full gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-elegant md:gap-1.5 md:px-4 md:py-2 md:text-sm"
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4" /> Add
                {burst && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0.6 }}
                    animate={{ scale: 3.5, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-0 rounded-full bg-white"
                  />
                )}
              </motion.button>
            )}
            {burst && !item.sold_out && (
              <motion.span
                key={Date.now()}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -28, scale: 1.2 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-black text-primary"
              >
                +1
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
