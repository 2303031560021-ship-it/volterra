import HeroSection from '../components/home/HeroSection';
import ProblemStatementSection from '../components/home/ProblemStatementSection';
import ProductJourneySection from '../components/home/ProductJourneySection';
import ContextualDataSection from '../components/home/ContextualDataSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import AnalysisPreviewSection from '../components/home/AnalysisPreviewSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ProblemStatementSection />
      <ProductJourneySection />
      <ContextualDataSection />
      <HowItWorksSection />
      <AnalysisPreviewSection />
    </main>
  );
}
