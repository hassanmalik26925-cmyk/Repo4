import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, useInView, animate } from "framer-motion";
import { 
  Activity, ArrowRight, CheckCircle2, ArrowUpRight, 
  Menu, X
} from "lucide-react";

// Reusable Counter
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0, duration = 2 }: { value: number, prefix?: string, suffix?: string, decimals?: number, duration?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration,
        ease: "easeOut",
        onUpdate(v) { setDisplayValue(v); }
      });
      return () => controls.stop();
    }
    return undefined;
  }, [isInView, value, duration]);

  const formatted = displayValue.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}} />

      {/* Navigation */}
      <header className="px-6 lg:px-12 py-4 flex items-center justify-between border-b border-border/40 backdrop-blur-xl sticky top-0 z-50 bg-background/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Pulse Commerce</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="text-sm font-bold hover:text-primary transition-colors" data-testid="link-login">
            Sign In
          </Link>
          <Link href="/register" className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-bold transition-all hover:scale-105 hover:shadow-lg active:scale-95" data-testid="link-register">
            Get Started
          </Link>
        </div>

        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="btn-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] bg-background z-40 p-6 flex flex-col gap-4 border-b border-border">
          <Link href="/login" className="w-full py-4 text-center rounded-xl border border-border font-bold text-foreground" data-testid="link-mobile-login">
            Sign In
          </Link>
          <Link href="/register" className="w-full py-4 text-center rounded-xl bg-foreground text-background font-bold" data-testid="link-mobile-register">
            Get Started
          </Link>
        </div>
      )}
      
      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="relative px-6 py-24 md:py-32 lg:px-12 flex flex-col items-center text-center bg-[#0a0a0f] text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none" />
          <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-4xl relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary anim-ring"></span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">The new standard for operators</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-balance leading-[1.05] mb-8">
              See your profitable growth <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-cyan-300">clearly.</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto text-balance font-medium">
              Stop wrestling with disconnected spreadsheets. Pulse Commerce is the confident command center for modern ecommerce brands.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="flex items-center gap-2 rounded-full bg-primary text-white px-8 py-4 text-base font-bold transition-all hover:bg-primary/90 hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] active:scale-95 w-full sm:w-auto justify-center" data-testid="btn-hero-cta">
                Start your free trial <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/login" className="flex items-center gap-2 rounded-full bg-white/10 text-white px-8 py-4 text-base font-bold transition-all hover:bg-white/20 active:scale-95 w-full sm:w-auto justify-center backdrop-blur-md" data-testid="btn-hero-login">
                Sign In
              </Link>
            </div>
          </motion.div>
          
          {/* Animated Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-24 w-full max-w-5xl relative z-10 perspective-[2000px]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent z-20 top-[40%] pointer-events-none" />
            <div className="rounded-2xl border border-white/10 bg-[#111118] shadow-2xl overflow-hidden relative md:rotate-x-[2deg] scale-[1.02]">
              {/* Header */}
              <div className="h-12 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80"></div>
                </div>
              </div>
              
              <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-4 gap-6 opacity-90 text-left">
                {/* KPI Cards */}
                <div className="col-span-1 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Revenue", val: 124500, prefix: "$", trend: "+12.5%" },
                    { label: "Net Profit", val: 32400, prefix: "$", trend: "+8.2%" },
                    { label: "Orders", val: 1240, trend: "+15.1%" },
                    { label: "ROAS", val: 3.2, suffix: "x", decimals: 1, trend: "-2.4%" }
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2 backdrop-blur-sm">
                      <div className="text-sm font-medium text-white/50">{stat.label}</div>
                      <div className="text-2xl lg:text-3xl font-bold text-white">
                        <AnimatedCounter value={stat.val} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} duration={1.5 + (i * 0.2)} />
                      </div>
                      <div className={`text-xs font-bold ${stat.trend.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                        {stat.trend} vs last month
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart Area */}
                <div className="col-span-1 md:col-span-3 h-64 rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-50"></div>
                  <svg className="w-full h-3/4 overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <path d="M0,50 L0,35 C15,35 25,15 40,25 C55,35 65,10 80,15 L100,5 L100,50 Z" fill="url(#hero-gradient)" />
                    <path d="M0,35 C15,35 25,15 40,25 C55,35 65,10 80,15 L100,5" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <defs>
                      <linearGradient id="hero-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Right side list */}
                <div className="col-span-1 h-64 rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                  <div className="text-sm font-bold text-white/70 mb-2">Top Channels</div>
                  <div className="space-y-3">
                    {[
                      { c: "bg-purple-500", w: "w-full" },
                      { c: "bg-blue-500", w: "w-[80%]" },
                      { c: "bg-pink-500", w: "w-[60%]" },
                      { c: "bg-emerald-500", w: "w-[40%]" }
                    ].map((bar, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs text-white/50">
                          <div className="h-2 w-16 bg-white/20 rounded"></div>
                          <div className="h-2 w-8 bg-white/20 rounded"></div>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: bar.w.replace('w-', '').replace('[', '').replace(']', '').replace('full', '100%') }}
                            transition={{ duration: 1.5, delay: 0.5 + (i * 0.1) }}
                            className={`h-full ${bar.c} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* LOGOS / MARQUEE */}
        <section className="py-10 bg-background border-b border-border overflow-hidden">
          <div className="text-center text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">
            Trusted by operators on:
          </div>
          <div className="relative flex max-w-[100vw] overflow-hidden">
            <div className="flex w-max animate-marquee gap-12 sm:gap-24 px-12 items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-12 sm:gap-24 items-center whitespace-nowrap opacity-60 grayscale">
                  <span className="text-xl font-black tracking-tighter text-foreground">SHOPIFY</span>
                  <span className="text-xl font-bold font-serif italic text-foreground">WooCommerce</span>
                  <span className="text-xl font-extrabold tracking-widest text-foreground">AMAZON</span>
                  <span className="text-xl font-bold tracking-tight text-foreground">META ADS</span>
                  <span className="text-xl font-black italic text-foreground">TIKTOK</span>
                  <span className="text-xl font-bold tracking-tight text-foreground">GOOGLE ADS</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE DEEP-DIVES */}
        <section className="py-24 bg-background">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 space-y-32">
            {/* Feature 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="text-sm font-bold text-primary uppercase tracking-widest">Net Margin Analysis</div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance">True Profit, <br/>Not Just Revenue</h2>
                <ul className="space-y-4 text-lg text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Automatically deduct COGS, shipping, and ad fees from every order.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>See real-time net margin across your entire product catalog.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Stop guessing if a high-revenue day was actually profitable.</span>
                  </li>
                </ul>
                <Link href="/register" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all mt-4" data-testid="link-feat-1">
                  Start tracking margins <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl bg-[#0a0a0f] p-8 border border-border shadow-2xl relative"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-white/50 text-sm font-bold border-b border-white/10 pb-4">
                    <span>Revenue Breakdown</span>
                    <span>Today</span>
                  </div>
                  {[
                    { label: "Gross Revenue", val: "$12,450.00", color: "text-white" },
                    { label: "Cost of Goods", val: "-$3,210.00", color: "text-red-400" },
                    { label: "Ad Spend", val: "-$1,840.00", color: "text-red-400" },
                    { label: "Shipping & Fees", val: "-$920.00", color: "text-red-400" }
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <span className="text-white/80 font-medium">{row.label}</span>
                      <span className={`font-bold ${row.color}`}>{row.val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="text-white font-bold text-lg">Net Profit</span>
                    <span className="text-emerald-400 font-extrabold text-2xl">$6,480.00</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Feature 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl bg-[#0a0a0f] p-8 border border-border shadow-2xl order-2 lg:order-1"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-white/50 text-sm font-bold border-b border-white/10 pb-4">
                    <span>Campaign ROAS</span>
                    <span>Last 7 Days</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Retargeting - Meta", roas: "4.2x", spend: "$840", bg: "bg-blue-500", w: "w-full" },
                      { name: "Search Non-Brand - Google", roas: "2.8x", spend: "$1,200", bg: "bg-emerald-500", w: "w-[65%]" },
                      { name: "Broad Prospecting - TikTok", roas: "1.5x", spend: "$450", bg: "bg-pink-500", w: "w-[35%]" }
                    ].map((row, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white font-medium text-sm">{row.name}</span>
                          <span className="text-white font-bold">{row.roas}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${row.bg} ${row.w} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              <div className="space-y-6 order-1 lg:order-2">
                <div className="text-sm font-bold text-primary uppercase tracking-widest">Marketing ROI</div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance">Ad Intelligence <br/>That Pays</h2>
                <ul className="space-y-4 text-lg text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Compare Meta, Google, and TikTok spend side-by-side.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Identify which campaigns drive actual profit, not just clicks.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Cut wasteful spend instantly based on real-time ROAS.</span>
                  </li>
                </ul>
                <Link href="/register" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all mt-4" data-testid="link-feat-2">
                  Optimize your ads <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="text-sm font-bold text-primary uppercase tracking-widest">Customer Lifetime Value</div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-balance">Orders & Customers <br/>in One Place</h2>
                <ul className="space-y-4 text-lg text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Track returning vs new customer revenue perfectly.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>View a unified timeline of every order across all channels.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                    <span>Understand true LTV to bid higher and acquire faster.</span>
                  </li>
                </ul>
                <Link href="/register" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all mt-4" data-testid="link-feat-3">
                  Understand your customers <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl bg-[#0a0a0f] p-8 border border-border shadow-2xl relative"
              >
                <div className="space-y-4">
                   <div className="flex justify-between items-center text-white/50 text-sm font-bold border-b border-white/10 pb-4">
                    <span>Recent Orders</span>
                    <span>Live</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { id: "#14092", cust: "Sarah Jenkins", amt: "$142.50", type: "Returning", status: "Paid" },
                      { id: "#14091", cust: "Michael T.", amt: "$89.00", type: "New", status: "Paid" },
                      { id: "#14090", cust: "Elena R.", amt: "$215.20", type: "Returning", status: "Refunded" }
                    ].map((ord, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                            {ord.cust.charAt(0)}
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm">{ord.cust}</div>
                            <div className="text-white/50 text-xs">{ord.id} &bull; {ord.type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${ord.status === 'Refunded' ? 'text-white/50 line-through' : 'text-white'}`}>{ord.amt}</div>
                          <div className={`text-xs font-bold ${ord.status === 'Refunded' ? 'text-red-400' : 'text-emerald-400'}`}>{ord.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 bg-muted/30 border-y border-border overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-16">Data flowing in minutes, <br className="hidden md:block"/>not months.</h2>
            
            <div className="flex flex-col md:flex-row gap-12 md:gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border border-dashed border-t-2 z-0" />
              
              {[
                { i: 1, title: "Connect your store", desc: "Link Shopify, Amazon, or WooCommerce with one click securely." },
                { i: 2, title: "Your data syncs", desc: "We automatically pull historical orders, costs, and ad spend." },
                { i: 3, title: "Make decisions", desc: "Log in daily to see true profit and allocate budget with clarity." }
              ].map((step, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center relative z-10">
                  <div className="h-24 w-24 rounded-full bg-background border-4 border-border shadow-lg flex items-center justify-center text-3xl font-extrabold text-foreground mb-6">
                    {step.i}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-center px-4 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* METRICS SHOWCASE */}
        <section className="py-24 bg-[#0a0a0f] text-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { val: 2.3, suffix: "M+", label: "Orders tracked" },
              { val: 99.9, suffix: "%", decimals: 1, label: "Platform uptime" },
              { val: 15, suffix: "-min", label: "Data sync frequency" },
              { val: 12, suffix: "+", label: "Integrations supported" }
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-3">
                <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
                  <AnimatedCounter value={stat.val} suffix={stat.suffix} decimals={stat.decimals || 0} />
                </div>
                <div className="text-lg text-white/60 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 bg-background">
          <div className="max-w-6xl mx-auto px-6 lg:px-12">
             <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Trusted by the best.</h2>
              <p className="text-xl text-muted-foreground">Hear from operators who switched to Pulse.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { quote: "Pulse finally gave us a unified view of our ad spend vs actual net profit. We cut 20% of wasteful spend in week one.", name: "David Chen", role: "CMO", co: "Aura Essentials" },
                { quote: "The easiest Shopify integration I've ever used. No code, no spreadsheets, just accurate margins right out of the box.", name: "Sarah Williams", role: "Founder", co: "Lumina Home" },
                { quote: "We were flying blind on Amazon vs DTC profitability. Now we check Pulse every morning before making any decisions.", name: "Marcus Johnson", role: "Director of E-com", co: "Trek Gear" }
              ].map((t, i) => (
                <div key={i} className="bg-[#0a0a0f] text-white p-8 rounded-3xl flex flex-col justify-between shadow-xl">
                  <div className="mb-8">
                    <div className="text-primary mb-4">
                      {[...Array(5)].map((_, j) => (
                         <span key={j} className="text-xl">&starf;</span>
                      ))}
                    </div>
                    <p className="text-lg text-white/90 leading-relaxed font-medium">"{t.quote}"</p>
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{t.name}</div>
                    <div className="text-white/50 text-sm font-semibold">{t.role}, {t.co}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING HINT */}
        <section className="py-24 bg-muted/30 border-t border-border">
          <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Simple, transparent pricing.</h2>
            <p className="text-xl text-muted-foreground mb-16">Pay for what you need. Scale when you're ready.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              {/* Starter */}
              <div className="bg-background rounded-3xl p-10 border border-border shadow-sm flex flex-col">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <p className="text-muted-foreground mb-8">Perfect for growing brands hitting their stride.</p>
                <ul className="space-y-4 mb-10 flex-1 font-medium">
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>Up to 5,000 orders/mo</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>3 Integrations</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>Daily Data Sync</span></li>
                </ul>
                <Link href="/register" className="w-full block py-4 text-center rounded-xl border-2 border-border font-bold hover:border-primary hover:text-primary transition-colors" data-testid="btn-pricing-starter">
                  Talk to us
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-[#0a0a0f] text-white rounded-3xl p-10 border border-border shadow-2xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">Most Popular</div>
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-white/60 mb-8">For established operators who need everything.</p>
                <ul className="space-y-4 mb-10 flex-1 font-medium">
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>Unlimited orders</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>All Integrations</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>15-min Data Sync</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-primary" /> <span>Custom LTV Models</span></li>
                </ul>
                <Link href="/register" className="w-full block py-4 text-center rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20" data-testid="btn-pricing-pro">
                  Talk to us
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA BANNER */}
        <section className="py-32 bg-[#0a0a0f] text-white text-center px-6">
          <div className="max-w-3xl mx-auto space-y-10">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance leading-tight">Your command center is ready.</h2>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-primary text-white px-10 py-5 text-lg font-bold transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] active:scale-95" data-testid="btn-final-cta">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-background border-t border-border py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4 md:col-span-1">
             <div className="flex items-center gap-2 font-bold text-xl">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              Pulse
            </div>
            <p className="text-sm text-muted-foreground">The confident command center for modern ecommerce brands.</p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-features">Features</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-integrations">Integrations</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-pricing">Pricing</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-changelog">Changelog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-about">About</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-blog">Blog</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-careers">Careers</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground mb-6">
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-privacy">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-terms">Terms of Service</Link></li>
            </ul>
            <div>
              <h4 className="font-bold mb-3 text-sm">Subscribe to updates</h4>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-all" data-testid="input-newsletter" />
                <button className="rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 transition-colors" data-testid="btn-newsletter">Join</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Pulse Commerce Inc. All rights reserved.</p>
          <div className="flex gap-4 font-medium">
            <Link href="#" className="hover:text-foreground transition-colors" data-testid="link-social-twitter">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition-colors" data-testid="link-social-linkedin">LinkedIn</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
