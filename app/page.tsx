import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Hero — Exaggerated Minimalism: massive whitespace, oversized type */}
      <section className="flex w-full max-w-5xl flex-col items-center px-5 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
        {/* Badge */}
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
            <span className="dot-pulse" />
            Built on Stellar &middot; Sentinel-2 Verified
          </span>
        </div>

        {/* Headline — oversized, tight tracking per style */}
        <h1 className="animate-fade-up delay-1 mt-10 text-5xl font-extrabold tracking-[-0.04em] text-[var(--color-foreground)] sm:text-7xl lg:text-[5.5rem] lg:leading-[0.95]">
          Carbon Credits,
          <br />
          <span className="gradient-text">On Chain.</span>
        </h1>

        <p className="animate-fade-up delay-2 mt-6 max-w-xl text-base leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
          Trade satellite-verified carbon credits with instant settlement.
          Transparent. Auditable. Immutable.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-3 mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/marketplace"
            className="press group inline-flex items-center justify-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-accent)] px-7 py-3 text-sm font-semibold text-[var(--color-on-accent)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:brightness-110 hover:shadow-[var(--shadow-md)]"
          >
            Browse Marketplace
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
          <Link
            href="/dashboard"
            className="press inline-flex items-center justify-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-transparent px-7 py-3 text-sm font-semibold text-[var(--color-foreground)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--color-muted)] hover:border-[var(--color-muted-foreground)]/30"
          >
            View Dashboard
          </Link>
        </div>

        {/* Stats — clean, high contrast numbers */}
        <div className="animate-fade-up delay-4 mt-16 flex items-center gap-10 sm:gap-16">
          <Stat value="100%" label="On-Chain" />
          <div className="h-8 w-px bg-[var(--color-border)]" />
          <Stat value="<5s" label="Settlement" />
          <div className="h-8 w-px bg-[var(--color-border)]" />
          <Stat value="10m+" label="Pixels Analyzed" />
        </div>
      </section>

      {/* Features — 3-column cards */}
      <section className="w-full max-w-5xl px-5 py-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            delay="delay-1"
            title="On-Chain Verified"
            description="Every credit is a Soroban smart contract entry. Fully transparent provenance."
            icon={<IconShield />}
          />
          <FeatureCard
            delay="delay-2"
            title="Satellite NDVI"
            description="Sentinel-2 imagery validates vegetation health before credit eligibility."
            icon={<IconGlobe />}
          />
          <FeatureCard
            delay="delay-3"
            title="Instant Settlement"
            description="5-second finality on Stellar. No intermediaries, no delays."
            icon={<IconClock />}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-4xl px-5 py-16">
        <h2 className="animate-fade-up text-center text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
          How It Works
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Step num={1} title="Verify" desc="NDVI satellite check on project area" />
          <Step num={2} title="Issue" desc="Mint credit on Stellar with metadata" />
          <Step num={3} title="Trade" desc="Buy and sell on the marketplace" />
          <Step num={4} title="Retire" desc="Permanently offset, recorded on-chain" />
        </div>
      </section>

      {/* CTA footer */}
      <section className="w-full max-w-4xl px-5 pb-20">
        <div className="animate-fade-up rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
          <h3 className="text-xl font-bold text-[var(--color-foreground)]">Ready to start?</h3>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Issue credits, run satellite verification, or browse the marketplace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/issue" className="press rounded-[var(--radius-full)] border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-foreground)] transition-all duration-[var(--duration-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              Issue Credit
            </Link>
            <Link href="/verification" className="press rounded-[var(--radius-full)] border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-foreground)] transition-all duration-[var(--duration-fast)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              Run Verification
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-[var(--color-muted-foreground)]">{label}</p>
    </div>
  );
}

function FeatureCard({ title, description, icon, delay }: { title: string; description: string; icon: React.ReactNode; delay: string }) {
  return (
    <div className={`animate-fade-up ${delay} card-hover rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6`}>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">{description}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="animate-fade-up flex flex-col items-center gap-3 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-bold text-[var(--color-on-accent)]">
        {num}
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
      <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">{desc}</p>
    </div>
  );
}

/* ─── Icons (SVG, no emoji per checklist) ─── */
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  );
}
