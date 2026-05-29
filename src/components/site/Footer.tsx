import { Link } from "@tanstack/react-router";
import { ChefHat, Facebook, Instagram, Mail, MapPin, Phone, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary"><ChefHat className="h-5 w-5 text-primary-foreground" /></span>
            <div className="font-[Fraunces] text-xl font-bold">SAM <span className="text-gradient">Foods</span></div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">A single hotel kitchen. Hand-crafted dishes. Delivered with care across the city.</p>
          <div className="mt-4 flex gap-2">
            {[Instagram, Facebook, Twitter].map((I, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent"><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Menu</Link></li>
            <li><Link to="/bulk-order" className="hover:text-foreground">Bulk Booking</Link></li>
            <li><Link to="/track" className="hover:text-foreground">Track Order</Link></li>
            <li><Link to="/cart" className="hover:text-foreground">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider">Hours</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Mon – Fri · 11:00 – 23:00</li>
            <li>Sat – Sun · 10:00 – 24:00</li>
            <li>Bulk orders · 24/7</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider">Reach Us</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +91 98765 43210</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> orders@samfoods.in</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> 12, Spice Lane, Chennai</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4">
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
