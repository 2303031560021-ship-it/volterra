import ScrollReveal from '../ui/ScrollReveal';

export default function ProblemStatementSection() {
  return (
    <section className="py-24 relative z-20">
      <ScrollReveal className="max-w-[1000px] mx-auto px-container-padding text-center">
        <h2 className="font-headline-lg text-4xl md:text-5xl text-primary tracking-tight mb-8">
          Where should the next charger go?
        </h2>
        <p className="font-body-xl text-body-xl text-on-surface-variant mx-auto max-w-3xl leading-relaxed">
          Building EV infrastructure requires more than just capital. Context is key for new investments. Understanding the density of existing networks, localized power availability, and competitor pricing is essential to ensuring a high utilization rate and solid ROI.
        </p>
      </ScrollReveal>
    </section>
  );
}
