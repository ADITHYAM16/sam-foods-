import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Privacy Policy — SAM Foods" }] }),
});

function PrivacyPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">Legal</div>
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">1. Information We Collect</h2>
            <p>We collect your name, email address, phone number, and delivery address when you register or place an order. We also collect order history and payment references (we do not store full card numbers).</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">2. How We Use Your Information</h2>
            <p>Your information is used solely to process and deliver your orders, send order status updates, and improve our service. We do not sell your data to third parties.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">3. Data Storage</h2>
            <p>All data is securely stored on Supabase infrastructure with row-level security policies. Only authorised staff can access personal data.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">4. Cookies</h2>
            <p>We use session cookies to keep you signed in. No third-party tracking cookies are used.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">5. Your Rights</h2>
            <p>You may request deletion of your account and associated data at any time by contacting us. We will process such requests within 30 days.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">6. Contact</h2>
            <p>For privacy concerns, contact us at <a href="tel:+919876543210" className="text-primary hover:underline">+91 98765 43210</a>.</p>
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">← Back to Home</Link>
          <Link to="/terms" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">Terms & Conditions →</Link>
        </div>
      </section>
    </SiteShell>
  );
}
