import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, Filter, Flame, Loader2, Search, Send, Sparkles, Star, UtensilsCrossed, Coffee, Utensils, Soup, Leaf, IceCream, ChefHat } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { FoodCard } from "@/components/site/FoodCard";
import { CATEGORIES, type Category } from "@/lib/menu-data";
import { useMenu } from "@/lib/menu-hook";
import { useReviews } from "@/lib/reviews-hook";
import { useAuth } from "@/lib/auth-context";

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

// Icon and label for each category section
const CATEGORY_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  Breakfast:  { icon: Coffee,    label: "Breakfast",      color: "text-amber-600" },
  Briyani:    { icon: ChefHat,   label: "Rice & Biryani", color: "text-primary" },
  Meals:      { icon: Utensils,  label: "Meals",          color: "text-emerald-600" },
  Starters:   { icon: Leaf,      label: "Starters",       color: "text-orange-500" },
  Desserts:   { icon: IceCream,  label: "Desserts",       color: "text-pink-500" },
};

function HeroSection({ reviewCount, avgRating }: { reviewCount: number; avgRating: string | null }) {
  const scrollY = useMotionValue(0);
  const heroY = useSpring(useTransform(scrollY, [0, 400], [0, 40]), { stiffness: 80, damping: 20 });
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.96]);

  useEffect(() => {
    // Only attach scroll parallax on desktop — causes jank on mobile
    if (window.innerWidth < 768) return;
    const onScroll = () => scrollY.set(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollY]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero" aria-hidden />
      <motion.div
        style={isMobile ? {} : { y: heroY, scale: heroScale }}
        className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:px-6 md:py-24"
      >
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Hotel-quality. Delivered in 30 min.
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 text-4xl font-black leading-[1.05] md:text-7xl">
            Crave it. <br />
            <span className="text-gradient">Tap it.</span> Devour it.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-5 max-w-md text-lg text-muted-foreground">
            Welcome to SAM — one hotel, a hundred reasons to stay hungry. From fresh dosas to event-scale catering, we deliver the moment you call.
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
            <div>
              <div className="text-2xl font-bold text-foreground">{avgRating ? `${avgRating}★` : "4.8★"}</div>
              <div>{reviewCount > 0 ? `${reviewCount} ratings` : "12k+ ratings"}</div>
            </div>
            <div><div className="text-2xl font-bold text-foreground">30 min</div>avg delivery</div>
            <div><div className="text-2xl font-bold text-foreground">120+</div>signature dishes</div>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="relative">
          <motion.img
            animate={isMobile ? {} : { y: [0, -10, 0] }}
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
              <span className="grid h-9 w-9 place-items-center rounded-full gradient-primary text-primary-foreground">
                <Star className="h-4 w-4 fill-current" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">Bestseller</div>
                <div className="text-sm font-bold">Masala Dosa</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Index() {
  const { menu } = useMenu();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

  const { reviews, loading: reviewsLoading, submitReview } = useReviews();
  const { user } = useAuth();

  const [hoverStar, setHoverStar] = useState(0);
  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState("");
  const [formRole, setFormRole] = useState("Customer");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const myReview = reviews.find(r => r.user_id === user?.id);

  useEffect(() => {
    if (myReview) {
      setFormRating(myReview.rating);
      setFormRole(myReview.role);
      setFormText(myReview.text);
    }
  }, [myReview?.id]);

  // Filter + sort the full menu
  const filtered = useMemo(() => {
    let arr = [...menu];
    if (q) arr = arr.filter(m => (m.name + " " + m.description).toLowerCase().includes(q.toLowerCase()));
    if (sort === "price-low") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") arr.sort((a, b) => b.price - a.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    return arr;
  }, [menu, q, sort]);

  // Group filtered items by category, preserving CATEGORIES order
  const grouped = useMemo(() => {
    return CATEGORIES.map(cat => ({
      cat,
      items: filtered.filter(m => m.category === cat),
    })).filter(g => g.items.length > 0);
  }, [filtered]);

  // When a category tab is clicked, scroll to that section
  const scrollToCategory = (cat: Category | "All") => {
    setActiveCategory(cat);
    if (cat === "All") {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    } else {
      document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (formRating === 0) return setSubmitMsg("Please select a star rating.");
    if (!formText.trim()) return setSubmitMsg("Please write something.");
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      await submitReview(user.id, user.name, formRole, formRating, formText.trim());
      setSubmitMsg("Review submitted! Thank you ❤️");
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteShell>
      <HeroSection avgRating={avgRating} reviewCount={reviews.length} />

      {/* ── MENU ── */}
      <section id="menu" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 md:px-6">

        {/* Header + search + sort */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">The Menu</div>
            <h2 className="mt-2 text-4xl font-black md:text-5xl">Today on the pass</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search dishes…"
                className="w-32 bg-transparent text-sm outline-none md:w-44"
              />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="grid h-4 w-4 place-items-center rounded-sm border-2 border-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /></span>
              100% Pure Veg
            </span>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm">
              <Filter className="h-4 w-4" />
              <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="bg-transparent outline-none">
                <option value="popular">Popular</option>
                <option value="rating">Top rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Category sticky nav tabs ── */}
        <div className="sticky top-16 z-30 -mx-4 mt-6 bg-background/90 px-4 pb-2 pt-3 backdrop-blur md:-mx-6 md:px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => scrollToCategory("All")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === "All"
                  ? "gradient-primary text-primary-foreground shadow-elegant"
                  : "border border-border bg-card hover:bg-accent"
              }`}
            >
              All
            </button>
            {CATEGORIES.map(c => {
              const meta = CATEGORY_META[c];
              const Icon = meta?.icon;
              return (
                <button
                  key={c}
                  onClick={() => scrollToCategory(c)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeCategory === c
                      ? "gradient-primary text-primary-foreground shadow-elegant"
                      : "border border-border bg-card hover:bg-accent"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {meta?.label ?? c}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Category sections ── */}
        {q || sort !== "popular" ? (
          // When searching or sorting — show flat grid with all results
          <div className="mt-8">
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">No dishes match your search.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((m, i) => (
                  <motion.div key={m.id} className="flex w-full"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                    <FoodCard item={m} index={i} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Default — grouped by category with section headers
          <div className="mt-8 space-y-14">
            {grouped.map(({ cat, items }) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta?.icon;
              return (
                <div key={cat} id={`cat-${cat}`} className="scroll-mt-32">
                  {/* Section header */}
                  <div className="mb-5 flex items-center gap-3">
                    {Icon && (
                      <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-card border border-border shadow-sm`}>
                        <Icon className={`h-5 w-5 ${meta.color}`} />
                      </span>
                    )}
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-widest ${meta?.color ?? "text-primary"}`}>
                        {meta?.label ?? cat}
                      </div>
                      <h3 className="font-[Fraunces] text-2xl font-black md:text-3xl">
                        {cat === "Breakfast" && "Rise & Shine"}
                        {cat === "Briyani" && "Rice & Biryani Varieties"}
                        {cat === "Meals" && "Full & Half Meals"}
                        {cat === "Starters" && "Snacks & Starters"}
                        {cat === "Desserts" && "Sweet Endings"}
                      </h3>
                    </div>
                    <span className="ml-auto rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Thin gradient divider */}
                  <div className="mb-6 h-px w-full bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

                  {/* Items grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((m, i) => (
                      <motion.div key={m.id} className="flex w-full"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease: "easeOut" }}
                      >
                        <FoodCard item={m} index={i} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
            {grouped.length === 0 && (
              <p className="py-16 text-center text-muted-foreground">No dishes available right now.</p>
            )}
          </div>
        )}
      </section>

      {/* REVIEWS */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Loved by our regulars</div>
          <motion.h2
            initial={{ opacity: 0, y: 30, rotateX: 10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ transformPerspective: 800 }}
            className="mt-2 text-4xl font-black md:text-5xl"
          >
            Real reviews. Real plates.
          </motion.h2>
          {avgRating && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${parseFloat(avgRating) >= s ? "fill-primary text-primary" : "text-border"}`} />
                ))}
              </div>
              <span className="text-sm font-bold">{avgRating}</span>
              <span className="text-xs text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-10 max-w-xl rounded-3xl border border-border bg-card p-6 shadow-elegant"
        >
          <div className="mb-4 font-[Fraunces] text-lg font-bold">
            {myReview ? "Update your review" : "Write a review"}
          </div>
          {user ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your rating</div>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button"
                      onMouseEnter={() => setHoverStar(s)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setFormRating(s)}
                      className="transition hover:scale-125"
                    >
                      <Star className={`h-7 w-7 transition ${(hoverStar || formRating) >= s ? "fill-primary text-primary" : "text-border"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">You are a</div>
                <div className="flex flex-wrap gap-2">
                  {["Customer", "Regular", "Event Host", "Office Order"].map(r => (
                    <button key={r} type="button" onClick={() => setFormRole(r)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        formRole === r ? "gradient-primary border-transparent text-primary-foreground" : "border-border bg-background hover:bg-accent"
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={formText}
                onChange={e => setFormText(e.target.value)}
                placeholder={myReview ? `Your current: "${myReview.text}"` : "Share your experience…"}
                rows={3}
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
              {submitMsg && (
                <p className={`text-xs ${submitMsg.includes("Thank") ? "text-emerald-600" : "text-destructive"}`}>{submitMsg}</p>
              )}
              <button disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting…" : myReview ? "Update review" : "Submit review"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link to="/login" search={{ redirect: "/" } as any} className="font-semibold text-primary underline">Sign in</Link> to leave a review.
            </p>
          )}
        </motion.div>

        <div className="mt-10">
          {reviewsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : reviews.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No reviews yet. Be the first!</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {reviews.map((r, i) => (
                  <motion.blockquote
                    key={r.id}
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                    whileHover={{ rotateY: 2, scale: 1.02, transition: { duration: 0.2 } }}
                    style={{ transformPerspective: 800 }}
                    className="rounded-3xl border border-border bg-card p-6 shadow-sm cursor-default"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${r.rating >= s ? "fill-primary text-primary" : "text-border"}`} />
                        ))}
                      </div>
                      {r.user_id === user?.id && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Your review</span>
                      )}
                    </div>
                    <p className="mt-3 text-foreground/90">"{r.text}"</p>
                    <footer className="mt-4 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-muted-foreground"> · {r.role}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </footer>
                  </motion.blockquote>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
