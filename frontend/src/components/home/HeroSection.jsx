import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-40 pb-20 px-container-padding max-w-[1440px] mx-auto overflow-hidden">
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-grid-gutter w-full">
        {/* Content (55%) */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-7 flex flex-col justify-center gap-8 pr-0 lg:pr-12">
          <h1 className="font-display-hero text-display-hero text-primary whitespace-pre-line tracking-tight leading-[0.95]">
            Build where the{'\n'}opportunity is.
          </h1>
          <p className="font-body-xl text-body-xl text-on-surface-variant max-w-2xl mt-2 leading-relaxed">
            Site-selection intelligence for EV infrastructure investors and builders. Harness dynamic real-time data to validate your next strategic deployment.
          </p>
          <div className="flex flex-wrap items-center gap-5 mt-6">
            <button onClick={() => navigate('/analysis')} className="bg-secondary-container text-primary px-8 py-4 rounded-full font-label-sm text-label-sm hover:bg-[#b5e05c] transition-colors flex items-center gap-2 shadow-sm font-bold">
              Start Location Analysis <span>→</span>
            </button>
            <button onClick={() => navigate('/explore')} className="px-8 py-4 rounded-full font-label-sm text-label-sm text-primary border border-primary/20 hover:border-primary/50 transition-colors bg-white/50 backdrop-blur-sm">
              Explore Charging Network
            </button>
          </div>
        </div>
        
        {/* Visual (45%) */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-5 relative mt-16 lg:mt-0 flex items-center justify-center">
          <div className="relative w-full aspect-[4/3] max-w-[600px]">
            <div className="absolute inset-0 bg-surface-container rounded-3xl overflow-hidden shadow-2xl">
              <img alt="EV Charging Station" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AEtjO1X6wnw6Bmj6L8JK0dGM5DrU0t2YKkKUIthICdfGQlqYdYAwXmo5giQvpsgCO4-uqGrwVEtLdfnzKJQfx6xUMOsxDzimnhHP5JhGqw78Vm0Z8ETvv5t30ugVz22tgXESBwHe4nBPleI5DCKskqwtLQw1EnSHipufPwlRbyir5juAUh2iIuh5bTpDb_E3yzCqLYvjV9Y2ndv98YQm82dxZdQ51kCSnS1LYiHzXBfGgt_6c2fxjgma_4Felzcl" />
            </div>
            
            {/* Analysis Card Overlay */}
            <div className="absolute -bottom-8 -left-8 md:bottom-8 md:-left-16 glass-panel p-6 rounded-2xl w-72 z-20">
              <div className="mb-6">
                <div className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">LOCATION ANALYSIS</div>
                <div className="font-headline-md text-xl font-bold text-primary">Selected location</div>
                <div className="font-body-md text-xs text-on-surface-variant opacity-60">Analysis area</div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="font-body-md text-sm text-on-surface-variant">Nearby stations</span>
                  <span className="font-headline-md text-lg text-primary">—</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="font-body-md text-sm text-on-surface-variant">Nearest station</span>
                  <span className="font-body-md text-sm text-primary font-semibold">—</span>
                </div>
                <div className="space-y-2 pb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-sm text-on-surface-variant">Charging mix</span>
                    <span className="text-[10px] font-bold text-primary/40 uppercase">AC | DC</span>
                  </div>
                  <div className="h-1.5 w-full bg-primary/5 rounded-full overflow-hidden flex">
                    <div className="h-full w-1/2 bg-primary/10 border-r border-white/20"></div>
                    <div className="h-full w-1/2 bg-primary/10"></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-sm text-primary">hub</span>
                    <h5 className="font-label-sm text-xs font-bold text-primary uppercase tracking-tight">Infrastructure insight</h5>
                  </div>
                  <p className="font-body-md text-[11px] leading-relaxed text-on-surface-variant">
                    Existing charging infrastructure is evaluated around the selected site to identify patterns in proximity, charging type, power, connectors and operators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
