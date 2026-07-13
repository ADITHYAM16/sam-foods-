import { Mail, MapPin, Phone, Clock, Headphones } from "lucide-react";
import { useLanguage } from "@/lib/lang-context";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr_2fr]">

          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white overflow-hidden shadow-lg border-2 border-primary/10">
                <img src="/logo.png.jpeg" alt="SAM Foods" className="h-12 w-12 rounded-full object-cover" />
              </span>
              <div className="font-[Fraunces] text-2xl font-black leading-none">
                SAM <span className="text-gradient">Foods</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-justify">
              {t("Authentic South Indian cuisine delivered fresh to your doorstep. Quality food, every time.")}
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground">
              <Phone className="h-4 w-4 text-primary" />
              {t("CONTACT US")}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5 group">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+918438278584" className="text-muted-foreground group-hover:text-primary transition font-medium">
                  +91 84382 78584
                </a>
              </li>
              <li className="flex items-center gap-2.5 group">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:samfoodsofficial@gmail.com" className="text-muted-foreground group-hover:text-primary transition font-medium break-all">
                  samfoodsofficial@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Location + Hours side by side */}
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Location */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {t("LOCATION")}
              </h4>
              <div className="text-sm text-muted-foreground leading-relaxed text-justify">
                <p>47 G2, Salem to Tiruchengode</p>
                <p>Main Road, Mallasamudram</p>
                <p>District: Namakkal</p>
                <p>Tamil Nadu - 637503</p>
              </div>
            </div>

            {/* Hours */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                {t("HOURS")}
              </h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Mon - Sat : 7:00 AM - 4:00 PM</p>
                <p className="text-destructive font-semibold">Sun : Closed</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-3.5 md:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} SAM Foods. {t("All rights reserved.")}</span>
            <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-5">
              <a href="/terms" className="hover:text-foreground transition font-medium">{t("Terms")}</a>
              <span className="text-border">|</span>
              <a href="/privacy" className="hover:text-foreground transition font-medium">{t("Privacy")}</a>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-primary" />
                <a href="mailto:samsupportsofficial@gmail.com" className="hover:text-primary transition font-medium">
                  samsupportsofficial@gmail.com
                </a>
              </div>
              <span className="text-border">|</span>
              <span className="font-medium">Developed by Code Singularity AI pvt Ltd.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
