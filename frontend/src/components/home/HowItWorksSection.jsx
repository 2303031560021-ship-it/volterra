import ScrollReveal from '../ui/ScrollReveal';

export default function HowItWorksSection() {
  return (
    <section className="py-section-gap bg-white/40 border-y border-outline-variant/20 relative z-10 backdrop-blur-md">
      <ScrollReveal className="bg-primary rounded-[40px] p-10 md:p-20 flex flex-col lg:flex-row items-center gap-16 overflow-hidden relative max-w-7xl mx-auto">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-secondary-container/10 to-transparent pointer-events-none"></div>
        
        <div className="flex-1 z-10">
          <h2 className="font-display-hero text-4xl md:text-5xl lg:text-6xl text-white tracking-tight mb-6 leading-tight">
            Turn infrastructure data into insight.
          </h2>
          <p className="font-body-xl text-white/80 mb-10 max-w-lg leading-relaxed">
            Understand the charging landscape surrounding a potential site — from nearby stations and distance to charging type, power, connectors, and operators.
          </p>
          <button className="bg-secondary-container text-primary px-10 py-5 rounded-full font-label-sm text-label-sm hover:bg-[#b5e05c] transition-colors font-bold flex items-center gap-2 shadow-lg shadow-secondary-container/20">
            Start Location Analysis <span className="text-xl">→</span>
          </button>
        </div>

        <div className="flex-1 w-full z-10">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlRxpizNGQ85VvHOGqZYeUOm69tTR42iDXKErbM5jZ9243aTXCF2m9hs0W2mMfLKsclxHQitVnFyQuGvx6Fu_UQY2rm-GjuaE75Itcy-XJhN1MebvhxxC1h-aYFNQeH_I-RnnG0oFm0EGyO9b3cZdOTu5cP0-i5wSLx9eXvakjdvRT4nixuV1R4yolWiT9n6KRMpk2mJ1ARBB9wjMgLnxRW39hURLboy9aC-ADt0yjXJ7ZrVAPBxsZF831jrOuWloz874" alt="Location Analysis Map" className="w-full h-full object-cover rounded-3xl shadow-2xl border border-white/20" />
        </div>
      </ScrollReveal>
    </section>
  );
}
