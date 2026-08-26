import ScrollReveal from '../ui/ScrollReveal';

export default function ContextualDataSection() {
  return (
    <section className="py-section-gap px-container-padding max-w-[1440px] mx-auto relative z-10">
      <ScrollReveal className="mb-16 text-center">
        <h2 className="font-headline-lg text-4xl md:text-5xl text-primary tracking-tight mb-4">Deep Contextual Data.</h2>
        <p className="font-body-xl text-body-xl text-on-surface-variant max-w-2xl mx-auto">
          Comprehensive dynamic data points to inform your site selection strategy.
        </p>
      </ScrollReveal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Data Point 1 */}
        <ScrollReveal delay={0} className="h-full">
        <div className="glass-panel p-8 rounded-3xl transition-transform hover:-translate-y-1 duration-300 h-full flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary text-secondary-container flex items-center justify-center font-bold text-xs">01</span>
            <h3 className="font-label-sm text-sm uppercase tracking-wider text-primary">01 — CHOOSE YOUR SITE</h3>
          </div>
          <div className="space-y-3 flex-1 mt-4">
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

        {/* Data Point 2 */}
        <ScrollReveal delay={100} className="h-full">
        <div className="glass-panel p-8 rounded-3xl transition-transform hover:-translate-y-1 duration-300 h-full flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary text-secondary-container flex items-center justify-center font-bold text-xs">02</span>
            <h3 className="font-label-sm text-sm uppercase tracking-wider text-primary">02 — ANALYZE THE AREA</h3>
          </div>
          <div className="space-y-3 flex-1 mt-4">
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

        {/* Data Point 3 */}
        <ScrollReveal delay={200} className="h-full">
        <div className="glass-panel p-8 rounded-3xl transition-transform hover:-translate-y-1 duration-300 h-full flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary text-secondary-container flex items-center justify-center font-bold text-xs">03</span>
            <h3 className="font-label-sm text-sm uppercase tracking-wider text-primary">03 — DECISION VIEW</h3>
          </div>
          <div className="space-y-3 flex-1 mt-4">
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

        {/* Data Point 4 */}
        <ScrollReveal delay={0} className="h-full">
        <div className="glass-panel p-8 rounded-3xl transition-transform hover:-translate-y-1 duration-300 h-full">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-primary/10">
            <span className="material-symbols-outlined text-primary">settings_input_hdmi</span>
          </div>
          <h3 className="font-headline-md text-2xl text-primary mb-3">Connectors</h3>
          <p className="font-body-md text-on-surface-variant">Breakdown of [count] connector types to match regional vehicle demographics.</p>
        </div>
        </ScrollReveal>

        {/* Data Point 5 */}
        <ScrollReveal delay={100} className="h-full">
        <div className="glass-panel p-8 rounded-3xl transition-transform hover:-translate-y-1 duration-300 h-full">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-primary/10">
            <span className="material-symbols-outlined text-primary">business</span>
          </div>
          <h3 className="font-headline-md text-2xl text-primary mb-3">Operators</h3>
          <p className="font-body-md text-on-surface-variant">Identify the top [count] dominant network operators in the vicinity.</p>
        </div>
        </ScrollReveal>

        {/* Data Point 6 */}
        <ScrollReveal delay={200} className="h-full">
        <div className="glass-panel p-8 rounded-3xl transition-transform hover:-translate-y-1 duration-300 bg-gradient-to-br from-white/60 to-secondary-container/20 h-full">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-primary/10">
            <span className="material-symbols-outlined text-primary">payments</span>
          </div>
          <h3 className="font-headline-md text-2xl text-primary mb-3">Price Landscape</h3>
          <p className="font-body-md text-on-surface-variant">Review historical and real-time pricing data (avg [price]/kWh) to optimize models.</p>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
