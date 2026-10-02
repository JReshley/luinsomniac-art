import PageStub from '../components/PageStub.jsx'
import { BUNNIES } from '../data/stickers.js'

// The bunny's "I might be the problem" owns up to the broken link.
export default function NotFound() {
  return (
    <PageStub title="Page not found" sticker={BUNNIES.problem.src}>
      There&rsquo;s nothing at this address. It may have moved, or the link has a typo.
    </PageStub>
  )
}
