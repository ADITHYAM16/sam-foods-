import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChefHat } from "lucide-react";
import { motion } from "framer-motion";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen md:grid-cols-2">
        <div className="relative hidden overflow-hidden md:block">
          <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-primary/40" />
          <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute bottom-12 left-12 right-12 text-primary-foreground">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur"><ChefHat className="h-5 w-5" /></span>
              <span className="font-[Fraunces] text-2xl font-bold">SAM Foods</span>
            </Link>
            <h2 className="mt-6 max-w-md font-[Fraunces] text-4xl font-black leading-tight">A single hotel kitchen, made for cravings.</h2>
            <p className="mt-3 max-w-md text-white/80">Sign in to track orders, save favourites, and unlock catering for your next event.</p>
          </motion.div>
        </div>
        <div className="flex items-center justify-center px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 md:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary"><ChefHat className="h-5 w-5 text-primary-foreground" /></span>
              <span className="font-[Fraunces] text-xl font-bold">SAM Foods</span>
            </Link>
            <h1 className="font-[Fraunces] text-4xl font-black">{title}</h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
