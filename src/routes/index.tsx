import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowRight, Filter, Flame, Search, Sparkles, Star, UtensilsCrossed } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { FoodCard } from "@/components/site/FoodCard";
import { CATEGORIES, MENU, REVIEWS, type Category } from "@/lib/menu-data";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SAM Foods — Order from our hotel kitchen" },
      { name: "description", content: "Order signature biryani, meals, starters and book bulk catering from SAM hotel." },
    ],
  }),
});

type Sort = "popular" | "price-low" | "price-high" | "rating";

function Index() {
  const [cat, setCat] = useState<Category | "All">("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("popular");

  const list = useMemo(() => {
    let arr = MENU.filter((m) => (cat === "All" ? true : m.category === cat));
    if (q) arr = arr.filter((m) => (m.name + m.description).toLowerCase().includes(q.toLowerCase()));
    if (sort === "price-low") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sort === "price-high") arr = [...arr].sort((a, b) => b.price - a.price);
    if (sort === "rating") arr = [...arr].sort((a, b) => b.rating - a.rating);
    return arr;
  }, [cat, q, sort]);

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Hotel-quality. Delivered in 30 min.
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 text-5xl font-black leading-[1.05] md:text-7xl">
              Crave it. <br />
              <span className="text-gradient">Tap it.</span> Devour it.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-5 max-w-md text-lg text-muted-foreground">
              Welcome to SAM — one hotel, a hundred reasons to stay hungry. From slow-dum biryani to event-scale catering, we deliver the moment you call.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#menu" className="inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-elegant transition hover:scale-105">
                <Flame className="h-4 w-4" /> Order Now
              </a>
              <Link to="/bulk-order" className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 font-semibold backdrop-blur transition hover:bg-accent">
                <UtensilsCrossed className="h-4 w-4" /> Bulk Booking <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div><div className="text-2xl font-bold text-foreground">4.8★</div>12k+ ratings</div>
              <div><div className="text-2xl font-bold text-foreground">30 min</div>avg delivery</div>
              <div><div className="text-2xl font-bold text-foreground">120+</div>signature dishes</div>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative">
            <motion.img
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80"
              alt="SAM signature biryani"
              className="aspect-square w-full rounded-[2rem] object-cover shadow-elegant"
            />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="absolute -left-4 bottom-10 hidden rounded-2xl border border-border bg-card p-3 shadow-elegant md:block"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-primary-foreground"><Star className="h-4 w-4 fill-current" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">Bestseller</div>
                  <div className="text-sm font-bold">SAM Special Biryani</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">The Menu</div>
            <h2 className="mt-2 text-4xl font-black md:text-5xl">Today on the pass</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes…" className="w-44 bg-transparent text-sm outline-none" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <span className="grid h-4 w-4 place-items-center rounded-sm border-2 border-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /></span>
              100% Pure Veg
            </span>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm">
              <Filter className="h-4 w-4" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent outline-none">
                <option value="popular">Popular</option>
                <option value="rating">Top rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as any)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${cat === c ? "gradient-primary text-primary-foreground shadow-elegant" : "border border-border bg-card hover:bg-accent"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((m, i) => <FoodCard key={m.id} item={m} index={i} />)}
        </div>
        {list.length === 0 && <p className="py-16 text-center text-muted-foreground">No dishes match your search.</p>}
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Loved by our regulars</div>
          <h2 className="mt-2 text-4xl font-black md:text-5xl">Real reviews. Real plates.</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <motion.blockquote
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: r.rating }).map((_, k) => <Star key={k} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-3 text-foreground/90">“{r.text}”</p>
              <footer className="mt-4 text-sm">
                <span className="font-semibold">{r.name}</span>
                <span className="text-muted-foreground"> · {r.role}</span>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
