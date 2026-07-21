import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Sections";

export const metadata = { title: "Privacy Policy — TimeSpan" };

export default function PrivacyPage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <p className="mb-4 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-light">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted">Last updated: July 21, 2026</p>

        <div className="prose-sm mt-10 space-y-8 text-sm leading-relaxed text-muted">
          <p className="rounded-xl border border-border bg-surface p-5 text-foreground">
            This policy is a working template describing how TimeSpan currently handles data. It has not been
            reviewed by outside counsel and should not be treated as a final, jurisdiction-specific legal
            document — have it reviewed against applicable law (e.g. GDPR, CCPA) before relying on it for a
            production launch in any specific region.
          </p>

          <div>
            <h2 className="text-lg font-semibold text-foreground">1. What we collect</h2>
            <p className="mt-2">
              When you create a TimeSpan account, we collect your email address and, if you sign in with
              Google, your name and profile information as provided by Google OAuth. When you use the
              scheduling platform, we store the operational data you submit — employees, shifts, availability,
              organization membership, and the schedules our solver generates — so the platform can display,
              re-solve, and version that data for you.
            </p>
            <p className="mt-2">
              We also collect basic technical data (IP address, browser type, pages visited, timestamps) for
              security, abuse-prevention, and reliability purposes.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">2. How we use it</h2>
            <p className="mt-2">
              We use your data to operate the platform: authenticate you, run the optimization solver against
              your data, display your schedules and dashboards, respond to support tickets you submit, and
              notify configured webhooks when a schedule you requested finishes solving. We do not sell your
              data, and we do not use your operational scheduling data to train models without your explicit
              opt-in.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">3. Where it&apos;s stored</h2>
            <p className="mt-2">
              Application data is stored with Supabase (PostgreSQL) and protected with row-level security
              policies scoped to your account and organization. The application is hosted on Vercel. Both
              providers may process data outside your home region as part of normal cloud hosting; we rely on
              their respective data-processing terms and security certifications.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">4. Who can see your data</h2>
            <p className="mt-2">
              Your operational data is visible to members of your organization according to their role
              (owner, admin, member), and to TimeSpan platform administrators for support and abuse-prevention
              purposes only. We do not share your data with third parties except sub-processors required to
              run the service (hosting, database, email delivery) and never for their independent marketing
              use.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">5. Cookies &amp; similar technologies</h2>
            <p className="mt-2">
              We use strictly necessary cookies to keep you signed in and to protect against cross-site
              request forgery. We do not currently use third-party advertising or tracking cookies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">6. Your rights</h2>
            <p className="mt-2">
              You can request a copy of your data, ask us to correct it, or ask us to delete your account and
              associated data by contacting support through the in-app support portal. Depending on your
              jurisdiction you may have additional rights (access, portability, restriction, objection) under
              laws such as the GDPR or CCPA.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">7. Data retention</h2>
            <p className="mt-2">
              We retain account and scheduling data for as long as your account is active. If you close your
              account, we delete or anonymize your data within a reasonable period, except where retention is
              required for legal, security, or legitimate business record-keeping purposes.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">8. Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy as the platform evolves. Material changes will be reflected by
              updating the date at the top of this page.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p className="mt-2">
              Questions about this policy or your data can be raised through the support portal once signed
              in, or by reaching the TimeSpan team directly.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
