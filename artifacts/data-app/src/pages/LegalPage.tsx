import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";

type LegalDocument = "privacy" | "terms" | "cookies" | "security";

const DOCUMENTS: Record<LegalDocument, {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}> = {
  privacy: {
    title: "Privacy Policy",
    intro: "This policy explains how CommercePulse collects, uses, and protects information when you use our website and analytics application.",
    sections: [
      { heading: "Information we collect", body: "We collect account details you provide, usage and device information needed to operate the service, and commerce or advertising data that you explicitly connect. Connected data remains associated with your workspace." },
      { heading: "How we use information", body: "We use information to provide analytics, maintain security, improve reliability, communicate about your account, and provide support. We do not sell customer data or use connected store data to advertise to your customers." },
      { heading: "Connected services", body: "When you connect a commerce or advertising platform, CommercePulse accesses only the permissions required for the selected integration. You can disconnect an integration from Settings, subject to the platform's token and retention behavior." },
      { heading: "Retention and deletion", body: "We retain information while your account is active or as needed to provide the service and meet legal obligations. Contact us to request account data export or deletion." },
      { heading: "Your choices", body: "You may update account settings, disconnect integrations, or contact CommercePulse about privacy questions at any time." },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    intro: "These terms govern your access to and use of the CommercePulse website and application.",
    sections: [
      { heading: "Using CommercePulse", body: "You may use CommercePulse only for lawful business analytics and only with data you are authorized to access. Keep your account credentials secure and notify us if you suspect unauthorized access." },
      { heading: "Your data", body: "You retain ownership of the data you connect or submit. You grant CommercePulse the limited rights necessary to process that data, provide analytics, secure the service, and perform requested integrations." },
      { heading: "Analytics are decision support", body: "CommercePulse reports are informational and depend on the completeness and accuracy of connected sources. You are responsible for reviewing source data and business decisions made using the service." },
      { heading: "Acceptable use", body: "Do not misuse the service, interfere with its operation, attempt unauthorized access, or use it to violate applicable law or another person's rights." },
      { heading: "Changes and termination", body: "We may update the service or these terms. We may suspend access when necessary for security, legal compliance, or material misuse. You may stop using the service at any time." },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro: "CommercePulse uses a small number of cookies and browser storage technologies to keep the application secure and remember your preferences.",
    sections: [
      { heading: "Essential storage", body: "Authentication and session storage help keep you signed in and ensure requests are associated with the correct workspace. These technologies are required for the application to function." },
      { heading: "Preferences", body: "We may store preferences such as theme, currency, date range, and onboarding progress so the experience is consistent between visits." },
      { heading: "Analytics", body: "If analytics technologies are introduced, we will describe their purpose and provide choices where required by applicable law. CommercePulse does not use advertising cookies to sell access to your customers." },
      { heading: "Managing cookies", body: "You can control cookies through your browser settings. Blocking essential storage may prevent sign-in or parts of the application from working." },
    ],
  },
  security: {
    title: "Security",
    intro: "CommercePulse is designed with practical safeguards for account and connected business data.",
    sections: [
      { heading: "Access controls", body: "Workspace data is scoped to the authenticated account, and protected API routes require a valid session. Integration credentials are handled server-side and are not exposed in the browser." },
      { heading: "Data protection", body: "We use encrypted connections for data in transit and apply database and infrastructure controls intended to prevent unauthorized access." },
      { heading: "Integration permissions", body: "Each integration uses its own authorization flow and permissions. Disconnect integrations you no longer use and review access in the provider's account settings." },
      { heading: "Report a concern", body: "If you discover a security issue, contact the CommercePulse team with enough detail for us to reproduce and investigate it. Please do not include secrets or customer personal data in an initial report." },
    ],
  },
};

export function LegalPage({ document }: { document: LegalDocument }) {
  const content = DOCUMENTS[document];
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to CommercePulse
          </Link>
          <Link href="/login" className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted">
            Sign in
          </Link>
        </div>
        <div className="mt-16 max-w-3xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{content.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">{content.intro}</p>
          <p className="mt-3 text-xs text-muted-foreground">Last updated August 3, 2026</p>
        </div>
        <div className="mt-14 space-y-10">
          {content.sections.map((section) => (
            <section key={section.heading} className="border-t border-border pt-7">
              <h2 className="text-xl font-bold">{section.heading}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          <span>© 2026 CommercePulse. All rights reserved.</span>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <span className="mx-2">·</span>
          <Link href="/security" className="hover:text-foreground">Security</Link>
        </footer>
      </div>
    </main>
  );
}