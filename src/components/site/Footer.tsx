import { Mail, MapPin, Phone, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 bg-card/50">
      {/* top orange divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white overflow-hidden shadow-glow">
                <img src="/src/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
              </span>
              <div className="font-[Fraunces] text-xl font-bold">SAM <span className="text-gradient">Foods</span></div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">A single hotel kitchen. Hand-crafted dishes. Delivered with care.</p>
          </div>

          {/* orange divider — vertical on sm+, horizontal on mobile */}
          <div className="hidden sm:block w-px bg-gradient-to-b from-transparent via-primary to-transparent opacity-40 justify-self-center" />
          <div className="block sm:hidden h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-40" />

          {/* Hours + Contact stacked */}
          <div className="sm:col-span-1 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold uppercase tracking-wider">Hours</h4>
              </div>
              {/* orange thin underline */}
              <div className="mb-3 h-px w-12 rounded-full bg-primary opacity-70" />
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Mon – Fri · 11:00 – 23:00</li>
                <li>Sat – Sun · 10:00 – 24:00</li>
                <li>Bulk orders · 24 / 7</li>
              </ul>
            </div>

            {/* inner orange divider */}
            <div className="h-px w-full bg-gradient-to-r from-primary/50 to-transparent" />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold uppercase tracking-wider">Reach Us</h4>
              </div>
              <div className="mb-3 h-px w-12 rounded-full bg-primary opacity-70" />
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-primary/70" /> +91 98765 43210</li>
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-primary/70" /> orders@samfoods.in</li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary/70" /> 12, Spice Lane, Chennai</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* bottom orange divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

      <div className="py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <span>© {new Date().getFullYear()} SAM Foods. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Refunds</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
