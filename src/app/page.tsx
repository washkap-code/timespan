import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { Products, HowItWorks, Platform, Stats, CTA, Footer } from "@/components/marketing/Sections";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Products />
      <HowItWorks />
      <Platform />
      <Stats />
      <CTA />
      <Footer />
    </main>
  );
}
