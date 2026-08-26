import ScrollReveal from '../ui/ScrollReveal';

export default function ProductJourneySection() {
  return (
    <section className="py-section-gap px-container-padding max-w-[1440px] mx-auto relative z-10">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal className="mb-12 text-center">
          <h2 className="font-headline-lg text-4xl md:text-5xl text-primary tracking-tight mb-4">
            See how a location becomes a decision.
          </h2>
          <p className="font-body-xl text-body-xl text-on-surface-variant max-w-3xl mx-auto">
            Choose a potential site, understand the charging infrastructure around it, and turn the analysis into a clear decision view.
          </p>
        </ScrollReveal>

        <div className="relative">
          {/* Connecting Electric Line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary/5 -translate-y-1/2 hidden lg:block z-0"></div>
          <div className="absolute top-1/2 left-0 w-2/3 h-[2px] bg-gradient-to-r from-secondary-container to-transparent -translate-y-1/2 hidden lg:block z-0 shadow-[0_0_15px_rgba(199,243,107,0.4)]"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {/* Stage 01: Location */}
            <ScrollReveal delay={0} className="h-full">
            <div className="glass-panel rounded-[40px] p-6 flex flex-col gap-4 border border-white/40 h-full">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-secondary-container flex items-center justify-center font-bold text-xs">01</span>
                <h3 className="font-label-sm text-sm uppercase tracking-wider text-primary">01 — CHOOSE YOUR SITE</h3>
              </div>
              <div className="space-y-3 flex-1">
                <h4 className="font-headline-md text-lg text-primary leading-tight">Where are you considering building?</h4>
                <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/10 h-48 flex flex-col gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-primary/40 text-sm">search</span>
                    <div className="w-full bg-white border border-outline-variant/20 rounded-lg pl-8 pr-2 py-1.5 text-[10px] text-primary/40">Search an area...</div>
                  </div>
                  <div className="flex-1 bg-white/50 rounded-lg relative overflow-hidden border border-outline-variant/5">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 bg-secondary-container/20 rounded-full animate-pulse flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary-container text-lg">location_on</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Stage 02: Analyze */}
            <ScrollReveal delay={100} className="h-full">
            <div className="glass-panel rounded-[40px] p-6 flex flex-col gap-4 border border-white/40 bg-white/40 h-full">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-secondary-container flex items-center justify-center font-bold text-xs">02</span>
                <h3 className="font-label-sm text-sm uppercase tracking-wider text-primary">02 — ANALYZE THE AREA</h3>
              </div>
              <div className="space-y-3 flex-1">
                <h4 className="font-headline-md text-lg text-primary leading-tight">What's already around it?</h4>
                <div className="bg-surface-container-low rounded-2xl p-2 border border-outline-variant/10 h-48 flex flex-col">
                  <div className="flex-1 bg-white/50 rounded-lg relative overflow-hidden border border-outline-variant/5">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-secondary-container/30 rounded-full bg-secondary-container/5"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className="material-symbols-outlined text-secondary-container text-sm">location_on</span>
                    </div>
                    <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-secondary-container rounded-full"></div>
                        <span className="text-[8px] font-bold uppercase">Potential site</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span className="text-[8px] font-bold uppercase">Existing station</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Stage 03: Intelligence */}
            <ScrollReveal delay={200} className="h-full">
            <div className="glass-panel rounded-[40px] p-6 flex flex-col gap-4 border border-secondary-container/30 bg-gradient-to-br from-white/80 to-secondary-container/5 h-full">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-secondary-container flex items-center justify-center font-bold text-xs">03</span>
                <h3 className="font-label-sm text-sm uppercase tracking-wider text-primary">03 — DECISION VIEW</h3>
              </div>
              <div className="space-y-3 flex-1">
                <h4 className="font-headline-md text-lg text-primary leading-tight">Understand the opportunity.</h4>
                <div className="bg-white/60 rounded-2xl p-3 border border-secondary-container/20 h-48 flex flex-col gap-2">
                  <div className="flex gap-2 h-1/2">
                    <div className="w-1/2 bg-surface-container-low rounded-lg relative overflow-hidden">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-50">
                        <span className="material-symbols-outlined text-secondary-container">location_on</span>
                      </div>
                    </div>
                    <div className="w-1/2 flex flex-col gap-1">
                      <div className="h-1/3 bg-surface-container-low rounded flex items-center px-1 gap-1">
                        <span className="material-symbols-outlined text-[10px]">ev_station</span>
                        <div className="h-1 w-full bg-primary/10 rounded-full">
                          <div className="h-full bg-primary w-2/3 rounded-full"></div>
                        </div>
                      </div>
                      <div className="h-1/3 bg-surface-container-low rounded flex items-center px-1 gap-1">
                        <span className="material-symbols-outlined text-[10px]">bolt</span>
                        <div className="h-1 w-full bg-primary/10 rounded-full">
                          <div className="h-full bg-secondary-container w-1/2 rounded-full"></div>
                        </div>
                      </div>
                      <div className="h-1/3 bg-surface-container-low rounded flex items-center px-1 gap-1">
                        <span className="material-symbols-outlined text-[10px]">bar_chart</span>
                        <div className="h-1 w-full bg-primary/10 rounded-full">
                          <div className="h-full bg-primary w-3/4 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-secondary-container/10 rounded-lg border border-secondary-container/20 p-1.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-container text-sm">auto_awesome</span>
                    <div className="h-1.5 w-full bg-secondary-container/20 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>
            
            <ScrollReveal delay={300} className="hidden lg:flex absolute top-1/2 left-[31%] -translate-y-1/2 z-20 flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-primary/40 uppercase bg-white px-2 py-0.5 rounded-full border border-outline-variant/10">Analyze</span>
              <span className="material-symbols-outlined text-secondary-container">arrow_forward</span>
            </ScrollReveal>
            
            <ScrollReveal delay={400} className="hidden lg:flex absolute top-1/2 left-[64%] -translate-y-1/2 z-20 flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-primary/40 uppercase bg-white px-2 py-0.5 rounded-full border border-outline-variant/10">Generate insights</span>
              <span className="material-symbols-outlined text-secondary-container">arrow_forward</span>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
