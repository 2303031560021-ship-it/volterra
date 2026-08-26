import ScrollReveal from '../ui/ScrollReveal';

export default function AnalysisPreviewSection() {
  return (
    <section className="py-section-gap px-container-padding max-w-[1440px] mx-auto relative z-10">
      <ScrollReveal className="bg-primary rounded-[40px] p-10 md:p-16 flex flex-col lg:flex-row items-center gap-16 overflow-hidden relative">
        {/* Decorative bg */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-secondary-container/10 to-transparent pointer-events-none"></div>
        <div className="flex-1 z-10">
          <h2 className="font-headline-lg text-4xl md:text-5xl text-white tracking-tight mb-6">
            Turn infrastructure data into insight.
          </h2>
          <p className="font-body-xl text-white/80 mb-10 max-w-lg">
            Understand the charging landscape surrounding a potential site — from nearby stations and distance to charging type, power, connectors, and operators.
          </p>
          <button className="bg-white text-primary px-8 py-4 rounded-full font-label-sm text-label-sm hover:bg-surface-container transition-colors font-bold">
            Explore the Analysis
          </button>
        </div>
        <div className="flex-1 w-full max-w-md z-10">
          {/* Empty block matching original HTML structure for this section */}
        </div>
      </ScrollReveal>
    </section>
  );
}
