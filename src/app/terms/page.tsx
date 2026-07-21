import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Sections";

export const metadata = { title: "Terms of Service — TimeSpan" };

export default function TermsPage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <p className="mb-4 inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary-light">
          Legal
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted">Last updated: July 21, 2026</p>

        <div className="prose-sm mt-10 space-y-8 text-sm leading-relaxed text-muted">
          <p className="rounded-xl border border-border bg-surface p-5 text-foreground">
            This is a working template, not final legal advice. Have it reviewed by qualified counsel before
            relying on it for a commercial launch.
          </p>

          <div>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
            <p className="mt-2">
              By creating an account or using TimeSpan, you agree to these Terms of Service and our Privacy
              Policy. If you are using TimeSpan on behalf of an organization, you represent that you have the
              authority to bind that organization to these terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">2. The service</h2>
            <p className="mt-2">
              TimeSpan provides an API and web platform for scheduling optimization, including an Employee
              Shift Scheduling solver, dashboards, and supporting tools (config profiles, webhooks, support and
              roadmap features). We may add, change, or remove features, and additional product verticals
              (routing, task scheduling) may be released over time.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">3. Accounts &amp; organizations</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activity under your account. Organization owners and admins are responsible for managing who has
              access to their organization&apos;s data within TimeSpan.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">4. Acceptable use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Attempt to circumvent rate limits, authentication, or access controls</li>
              <li>Probe, scan, or test the vulnerability of the platform without authorization</li>
              <li>Upload data you do not have the right to process (e.g. employee data without a lawful basis)</li>
              <li>Use the service to build a directly competing scheduling-optimization product</li>
              <li>Interfere with or disrupt the integrity or performance of the service</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">5. Plans &amp; billing</h2>
            <p className="mt-2">
              Paid tiers are billed according to the plan you select. Prices shown on the pricing page are
              current at time of viewing and may change with notice. Downgrades and cancellations take effect
              at the end of the current billing period unless otherwise stated.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">6. Your data</h2>
            <p className="mt-2">
              You retain ownership of the data you submit to TimeSpan (employees, shifts, schedules, and
              related operational data). You grant us a license to process that data solely to provide and
              improve the service to you, as described in our Privacy Policy.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">7. Service availability</h2>
            <p className="mt-2">
              We aim for high availability but do not guarantee uninterrupted access. Scheduled maintenance,
              third-party outages (hosting, database), or force majeure events may affect availability from
              time to time.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">8. Disclaimers &amp; limitation of liability</h2>
            <p className="mt-2">
              TimeSpan is provided &quot;as is&quot; without warranties of any kind. Optimization results are
              generated algorithmically based on the data and constraints you supply; you are responsible for
              validating that a generated schedule meets your legal and operational obligations before acting
              on it. To the maximum extent permitted by law, TimeSpan is not liable for indirect, incidental,
              or consequential damages arising from use of the service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p className="mt-2">
              You may stop using TimeSpan and close your account at any time. We may suspend or terminate
              access for violation of these terms, non-payment, or to protect the security and integrity of
              the platform.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">10. Changes to these terms</h2>
            <p className="mt-2">
              We may update these terms as the platform evolves. Continued use of TimeSpan after an update
              constitutes acceptance of the revised terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="mt-2">Questions about these terms can be raised through the in-app support portal.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
