import Hero from '../components/home/Hero.jsx'
import ReelSection from '../components/home/ReelSection.jsx'
import FeaturedWorks from '../components/home/FeaturedWorks.jsx'
import StickerSection from '../components/home/StickerSection.jsx'
import Services from '../components/home/Services.jsx'
import AboutSummary from '../components/home/AboutSummary.jsx'
import { StickerLayer, useStickerBoard } from '../components/home/StickerBoard.jsx'

// The work comes first (stills, then the reel), then who made it and what they
// offer. The reel sits on a light band between two coloured ones; at the end
// of the page its dark video ran straight into the dark footer.
//
// The sticker sheet gets its own band after the reel, a break before "About".
// The whole <main> is its board, so stickers can be stuck on any section;
// it is positioned so the sticker layer can cover it.
export default function Home() {
  const board = useStickerBoard()

  return (
    <main id="main" ref={board.boardRef} className="relative">
      <Hero />

      <FeaturedWorks />

      <ReelSection />

      <StickerSection board={board} />

      <AboutSummary />

      <Services />

      <StickerLayer board={board} />
    </main>
  )
}
