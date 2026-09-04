import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-on-background pb-32">
      {/* 1. HERO SECTION (OFF-WHITE) */}
      <section className="pt-32 md:pt-40 pb-16 px-container-padding max-w-[1400px] mx-auto text-center flex flex-col items-center">
        <span className="font-label-sm uppercase tracking-widest text-outline-variant font-bold mb-6 block">About Volterra</span>
        <h1 className="font-headline-lg text-primary max-w-3xl leading-tight mb-6 mx-auto">
          Build where the opportunity is.
        </h1>
        <p className="font-body-xl text-on-surface-variant max-w-2xl mx-auto">
          Volterra helps you understand the EV charging network around a potential site and find areas worth investigating further.
        </p>
      </section>

      {/* 2. WHAT IS VOLTERRA (OFF-WHITE) */}
      <section className="py-20 px-container-padding max-w-[1400px] mx-auto border-t border-outline-variant/20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
          <div className="md:col-span-5">
            <span className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4 block">What is Volterra?</span>
            <h2 className="font-headline-md text-primary leading-snug">
              Volterra turns charging-station data into location intelligence.
            </h2>
          </div>
          <div className="md:col-span-7 flex items-center">
            <p className="font-body-md text-on-surface-variant text-lg">
              Instead of only showing where chargers already exist, Volterra helps you understand what the surrounding network means for a potential site.
            </p>
          </div>
        </div>
      </section>

      {/* 3. WHAT PROBLEM DOES IT SOLVE (DARK GREEN) */}
      <section className="py-20 md:py-28 bg-primary text-white mt-8 rounded-[48px] mx-4 md:mx-8 px-8">
        <div className="max-w-[1200px] mx-auto text-center">
          <span className="font-label-sm text-xs uppercase tracking-widest text-secondary-container font-bold mb-6 block">What problem are we solving?</span>
          <h2 className="font-headline-md md:font-headline-lg text-white leading-tight mb-6 max-w-3xl mx-auto">
            Choosing a charging location is not just about finding an empty space.
          </h2>
          <p className="font-body-md text-white/80 text-lg max-w-2xl mx-auto mb-16">
            Volterra helps you understand nearby chargers, charging types, distance and coverage before you decide which areas are worth investigating.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 text-left max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 md:p-10">
              <span className="font-label-sm text-[11px] uppercase tracking-widest text-white/50 font-bold mb-6 block">Without Volterra</span>
              <div className="flex flex-col gap-4 font-headline-md text-lg text-white/50">
                <div className="flex items-center gap-3">Pick a place</div>
                <div className="h-3 border-l-2 border-white/10 ml-2"></div>
                <div className="flex items-center gap-3">Guess</div>
                <div className="h-3 border-l-2 border-white/10 ml-2"></div>
                <div className="flex items-center gap-3">Investigate</div>
              </div>
            </div>
            <div className="bg-secondary-container/10 border border-secondary-container/20 rounded-[32px] p-8 md:p-10">
              <span className="font-label-sm text-[11px] uppercase tracking-widest text-secondary-container font-bold mb-6 block">With Volterra</span>
              <div className="flex flex-col gap-4 font-headline-md text-lg text-white">
                <div className="flex items-center gap-3">Pick a place</div>
                <div className="h-3 border-l-2 border-secondary-container/30 ml-2"></div>
                <div className="flex items-center gap-3 text-secondary-container">Analyze nearby chargers</div>
                <div className="h-3 border-l-2 border-secondary-container/30 ml-2"></div>
                <div className="flex items-center gap-3 text-secondary-container">Compare areas</div>
                <div className="h-3 border-l-2 border-secondary-container/30 ml-2"></div>
                <div className="flex items-center gap-3">Investigate further</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (OFF-WHITE) */}
      <section className="py-20 md:py-24 px-container-padding max-w-[1400px] mx-auto">
        <h2 className="font-headline-md text-primary mb-12 text-center md:text-left">How it works</h2>
        <div className="flex flex-col lg:flex-row gap-8 relative">
          <div className="hidden lg:block absolute top-4 left-0 right-0 h-px bg-outline-variant/30 -z-10"></div>
          
          {[
            { num: "01", title: "Choose a location", desc: "Pick an area in Surat." },
            { num: "02", title: "Set requirements", desc: "Choose AC, DC or high-power DC." },
            { num: "03", title: "Analyze what's nearby", desc: "We compare nearby chargers, distance, power and coverage." },
            { num: "04", title: "Find areas worth checking", desc: "We highlight charging gaps and other areas worth investigating." }
          ].map((step, idx) => (
            <div key={idx} className="flex-1 flex flex-col gap-3 relative bg-background lg:bg-transparent lg:pt-0">
              <span className="font-label-sm text-[10px] uppercase tracking-widest bg-primary text-secondary-container px-2 py-1 w-fit rounded font-bold">{step.num}</span>
              <h3 className="font-headline-md text-lg text-primary mt-2">{step.title}</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. HOW WE CHOOSE POTENTIAL AREAS (SOFT MINT / LIGHT) */}
      <section className="py-20 md:py-24 bg-surface-container-high rounded-[48px] mx-4 md:mx-8 px-8">
        <div className="max-w-[1000px] mx-auto text-center">
          <span className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-6 block">How do we choose potential areas?</span>
          <h2 className="font-headline-md text-primary leading-tight mb-6">
            We don't simply look for places with no chargers.
          </h2>
          <p className="font-body-md text-on-surface-variant text-lg mb-12">
            We look for real areas inside the city where charging coverage may be limited, while considering nearby chargers, distance, charging type, power and how the network is spread out.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {['NEARBY CHARGERS', 'DISTANCE', 'CHARGING TYPE', 'POWER', 'AREA COVERAGE'].map((factor, idx) => (
              <span key={idx} className="bg-white border border-outline-variant/20 px-4 py-2 rounded-full font-label-sm text-xs text-primary font-bold shadow-sm">
                {factor}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. WHERE DOES THE DATA COME FROM (OFF-WHITE) */}
      <section className="py-20 md:py-24 px-container-padding max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div>
            <span className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4 block">Where does our data come from?</span>
            <p className="font-body-md text-on-surface-variant text-lg mb-6">
              Volterra currently combines charging-station data from multiple sources, including SMC, OCM and EcoGears, into a cleaned dataset for analysis.
            </p>
            <p className="font-body-md text-primary font-medium text-sm">
              We use available mapped information and do not fill missing values with guesses.
            </p>
          </div>
          
          <div className="bg-primary/5 border border-outline-variant/20 rounded-[32px] p-8 md:p-10 flex flex-col gap-3">
             {['SMC + OCM + EcoGears', 'CLEAN', 'COMBINE', 'ANALYZE'].map((step, idx, arr) => (
               <div key={step} className="flex flex-col items-center">
                 <div className="font-label-sm text-xs uppercase tracking-widest font-bold text-primary bg-white border border-outline-variant/20 px-6 py-3 rounded-xl w-full text-center shadow-sm">
                   {step}
                 </div>
                 {idx < arr.length - 1 && (
                   <div className="h-4 w-px bg-outline-variant/40 my-1"></div>
                 )}
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* 7. WHAT IT DOES / DOESN'T CLAIM (DARK GREEN) */}
      <section className="py-20 md:py-28 bg-primary text-white mt-8 rounded-[48px] mx-4 md:mx-8 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-white mb-4">What Volterra does — and doesn't — tell you</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 border-b border-white/10 pb-16 mb-12">
            <div className="bg-white/5 rounded-[32px] p-10 border border-white/10">
              <h3 className="font-headline-md text-xl text-secondary-container mb-8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-secondary-container"></span> We help you understand
              </h3>
              <ul className="flex flex-col gap-4 font-body-md text-white/80">
                <li>Nearby chargers</li>
                <li>Distance</li>
                <li>Charging type</li>
                <li>Power</li>
                <li>Area coverage</li>
                <li>Charging gaps</li>
              </ul>
            </div>
            
            <div className="bg-white/5 rounded-[32px] p-10 border border-white/10">
              <h3 className="font-headline-md text-xl text-white/50 mb-8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white/30"></span> We don't predict
              </h3>
              <ul className="flex flex-col gap-4 font-body-md text-white/50">
                <li>Traffic</li>
                <li>Customer demand</li>
                <li>Utilization</li>
                <li>Revenue</li>
                <li>Profit</li>
                <li>ROI</li>
              </ul>
            </div>
          </div>

          <p className="font-body-md text-white/90 text-lg text-center font-medium max-w-2xl mx-auto">
            Volterra is a decision aid, not a guarantee of business success. Use the result as an early location-screening input, not a final business decision.
          </p>
        </div>
      </section>

      {/* 8. THINGS TO KEEP IN MIND (OFF-WHITE) */}
      <section className="py-20 px-container-padding max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="bg-white border border-outline-variant/20 p-8 rounded-3xl shadow-sm">
            <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold mb-3 block">Data Changes</h3>
            <p className="font-body-md text-sm text-on-surface-variant">Charging infrastructure changes over time.</p>
          </div>
          <div className="bg-white border border-outline-variant/20 p-8 rounded-3xl shadow-sm">
            <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold mb-3 block">Data Coverage</h3>
            <p className="font-body-md text-sm text-on-surface-variant">Results depend on the mapped data available to Volterra.</p>
          </div>
          <div className="bg-white border border-outline-variant/20 p-8 rounded-3xl shadow-sm">
            <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold mb-3 block">Real-World Checks</h3>
            <p className="font-body-md text-sm text-on-surface-variant">Land, roads, permits and financial feasibility still need separate evaluation.</p>
          </div>
        </div>
      </section>

      {/* 9. STARTING WITH SURAT (OFF-WHITE) */}
      <section className="py-16 px-container-padding max-w-[1400px] mx-auto text-center border-t border-outline-variant/20">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-headline-md text-primary mb-6">Starting with Surat. Built to expand.</h2>
          <p className="font-body-md text-on-surface-variant text-lg mb-4">
            Volterra currently focuses on Surat so we can build and validate the location-analysis workflow carefully.
          </p>
          <p className="font-body-md text-on-surface-variant text-lg">
            The same approach can later support more cities and larger datasets.
          </p>
        </div>
      </section>

      {/* 10. FINAL CTA (DARK GREEN) */}
      <section className="px-container-padding max-w-[1400px] mx-auto mt-8">
        <div className="bg-primary rounded-[40px] p-12 md:p-24 text-center border border-primary-container shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-secondary-container/5 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10">
            <h2 className="font-headline-lg text-4xl md:text-5xl text-white mb-4">Have a location in mind?</h2>
            <p className="font-body-xl text-white/70 mb-12">See what surrounds it.</p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link to="/analysis" className="bg-secondary-container text-primary font-label-sm text-sm font-bold px-8 py-4 rounded-full hover:bg-[#b5e05c] transition-colors shadow-lg hover:-translate-y-0.5 transform">
                Start Location Analysis →
              </Link>
              <Link to="/explore" className="text-white font-label-sm text-sm font-bold hover:text-secondary-container transition-colors">
                Explore Stations →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
