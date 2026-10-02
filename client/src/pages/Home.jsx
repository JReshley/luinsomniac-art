import Hero from '../components/home/Hero.jsx'
import ReelSection from '../components/home/ReelSection.jsx'
import FeaturedWorks from '../components/home/FeaturedWorks.jsx'
import Services from '../components/home/Services.jsx'
import AboutSummary from '../components/home/AboutSummary.jsx'

export default function Home() {
  return (
    <main id="main">
      <Hero />

      <FeaturedWorks />
      
      <AboutSummary />
      
      <Services />

      <ReelSection />
    </main>
  )
}
