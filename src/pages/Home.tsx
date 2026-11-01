import { Hero } from '../components/Hero';
import { Mirror } from '../components/Mirror';
import { Pod } from '../components/Pod';
import { EndCta, HowItWorks } from '../components/Sections';
import { useAtParam, useReveal } from '../hooks/useReveal';

export default function Home() {
  useReveal();
  useAtParam();
  return (
    <>
      <Hero />
      <Pod />
      <Mirror />
      <HowItWorks />
      <EndCta />
    </>
  );
}
