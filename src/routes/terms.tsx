import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({ meta: [{ title: "Terms & Conditions — SAM Foods" }] }),
});

function TermsPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">Legal</div>
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">Terms & Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="mt-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>By placing an order or using the SAM Foods platform, you agree to these terms. If you do not agree, please do not use our services.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">2. Orders & Payments</h2>
            <p>All orders are subject to availability and confirmation by our kitchen. Prices are inclusive of applicable taxes. Payment must be completed at the time of ordering (UPI/GPay) or at delivery (Cash on Delivery).</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">3. Cancellations & Refunds</h2>
            <p>Orders may be cancelled within 5 minutes of placement. After this window, cancellations are not guaranteed. Refunds for prepaid orders will be processed within 5–7 business days to the original payment method.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">4. Delivery</h2>
            <p>We deliver within our hotel premises and surrounding areas. Estimated delivery times are indicative and may vary based on kitchen load and distance.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">5. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. SAM Foods is not liable for unauthorised use of your account.</p>
          </div>
          <div>
            <h2 className="mb-2 font-[Fraunces] text-xl font-bold text-foreground">6. Contact</h2>
            <p>For queries, contact us at <a href="tel:+919876543210" className="text-primary hover:underline">+91 98765 43210</a>.</p>
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">← Back to Home</Link>
          <Link to="/privacy" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">Privacy Policy →</Link>
        </div>
      </section>
    </SiteShell>
  );
}
