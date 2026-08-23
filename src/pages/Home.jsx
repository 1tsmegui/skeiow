import Nav from '../components/Nav';
import Footer from '../components/Footer';
import Hero from '../components/sections/Hero';
import Mission from '../components/sections/Mission';
import About from '../components/sections/About';
import Faq from '../components/sections/Faq';
import FinalCta from '../components/sections/FinalCta';

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Mission />
        <About />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
