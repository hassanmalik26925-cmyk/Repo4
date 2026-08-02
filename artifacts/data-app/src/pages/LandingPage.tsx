import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, BarChart3, LineChart, PieChart, ArrowRight, Zap, Shield, Globe, Layers, ArrowUpRight } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-border/40 backdrop-blur-xl sticky top-0 z-50 bg-background/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Pulse Commerce</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold hover:text-primary transition-colors hidden sm:block" data-testid="link-login">
            Sign In
          </Link>
          <Link href="/register" className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-bold transition-all hover:scale-105 hover:shadow-lg active:scale-95" data-testid="link-register">
            Get Started
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Hero Section */}
        <section className="relative px-6 py-20 md:py-32 lg:px-12 flex flex-col items-center text-center">
          {/* Background effects */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary anim-ring"></span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">The new standard for operators</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance leading-[1.1] mb-6">
              See your profitable growth <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">clearly.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance">
              Stop wrestling with disconnected spreadsheets. Pulse Commerce is the confident command center for modern ecommerce brands.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 text-base font-bold transition-all hover:bg-primary/90 hover:scale-105 hover:shadow-xl hover:shadow-primary/30 active:scale-95 w-full sm:w-auto justify-center" data-testid="btn-hero-cta">
                Start your free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground px-8 py-4 text-base font-bold transition-all hover:bg-secondary/80 active:scale-95 w-full sm:w-auto justify-center" data-testid="btn-hero-login">
                Sign In
              </Link>
            </div>
          </motion.div>
          
          {/* Hero Image Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-20 w-full max-w-5xl relative anim-float"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10 top-1/2 pointer-events-none" />
            <div className="rounded-2xl md:rounded-[2rem] border border-border bg-card shadow-2xl overflow-hidden relative">
              {/* Fake UI Header */}
              <div className="h-12 border-b border-border bg-muted/30 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80"></div>
                </div>
              </div>
              {/* Fake UI Body */}
              <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-90">
                <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Revenue", value: "$124,500", trend: "+12.5%" },
                    { label: "Net Profit", value: "$32,400", trend: "+8.2%" },
                    { label: "Orders", value: "1,240", trend: "+15.1%" },
                    { label: "ROAS", value: "3.2x", trend: "-2.4%" }
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background p-4 space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className={`text-xs font-semibold ${stat.trend.startsWith("+") ? "text-emerald-500" : "text-red-500"}`}>
                        {stat.trend}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="col-span-1 md:col-span-2 h-64 rounded-xl border border-border bg-background p-4 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>
                  <svg className="w-full h-3/4 overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <path d="M0,50 L0,30 C20,30 30,10 50,20 C70,30 80,5 100,10 L100,50 Z" fill="hsl(var(--primary)/0.1)" />
                    <path d="M0,30 C20,30 30,10 50,20 C70,30 80,5 100,10" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="col-span-1 h-64 rounded-xl border border-border bg-background p-4 space-y-4">
                   <div className="h-4 w-1/2 bg-muted rounded"></div>
                   <div className="space-y-2">
                     <div className="h-10 rounded-lg bg-muted/50 w-full flex items-center px-3 gap-3">
                       <div className="h-6 w-6 rounded-md bg-emerald-500/20"></div>
                       <div className="h-2 w-1/3 bg-muted-foreground/30 rounded"></div>
                     </div>
                     <div className="h-10 rounded-lg bg-muted/50 w-full flex items-center px-3 gap-3">
                       <div className="h-6 w-6 rounded-md bg-blue-500/20"></div>
                       <div className="h-2 w-1/4 bg-muted-foreground/30 rounded"></div>
                     </div>
                     <div className="h-10 rounded-lg bg-muted/50 w-full flex items-center px-3 gap-3">
                       <div className="h-6 w-6 rounded-md bg-purple-500/20"></div>
                       <div className="h-2 w-2/5 bg-muted-foreground/30 rounded"></div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Value Props Section */}
        <section className="px-6 py-24 lg:px-12 bg-muted/30 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need. <br className="hidden md:block"/>Nothing you don't.</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Built for speed, accuracy, and clarity. Stop guessing about your margins and start scaling with confidence.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Real-time Sync", desc: "Connect Shopify and your ad accounts in seconds. See your true profit as it happens." },
                { icon: Layers, title: "True Profitability", desc: "We factor in COGS, shipping, ad spend, and fees to give you your actual net margin." },
                { icon: Shield, title: "Bank-grade Security", desc: "Your data is encrypted and securely stored. We never share your metrics with third parties." }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="px-6 py-24 lg:px-12 text-center">
          <div className="max-w-3xl mx-auto rounded-3xl bg-foreground text-background p-10 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <Activity className="w-64 h-64 text-background" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ready to take command?</h2>
              <p className="text-background/80 text-lg mb-10 max-w-xl mx-auto">Join hundreds of top-tier ecommerce operators who trust Pulse Commerce to run their business.</p>
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-4 text-base font-bold transition-transform hover:scale-105 active:scale-95" data-testid="btn-footer-cta">
                Create your account <ArrowUpRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Pulse Commerce
        </div>
        <p>&copy; {new Date().getFullYear()} Pulse Commerce Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
