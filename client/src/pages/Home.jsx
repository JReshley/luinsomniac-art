import Hero from '../components/home/Hero.jsx'
import ReelSection from '../components/home/ReelSection.jsx'
import FeaturedWorks from '../components/home/FeaturedWorks.jsx'
import Services from '../components/home/Services.jsx'
import AboutSummary from '../components/home/AboutSummary.jsx'

// The work comes first (stills, then the reel), then who made it and what they
// offer. The reel sits on a light band between two coloured ones; at the end
// of the page its dark video ran straight into the dark footer.
export default function Home() {
  return (
    <main id="main">
      <Hero />

      <FeaturedWorks />

      <ReelSection />

      <AboutSummary />

      <Services />
    </main>
  )
}
