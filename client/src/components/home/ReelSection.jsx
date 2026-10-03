import { youtubeId } from '../../lib/publicWork.js'
import Placeholder from '../Placeholder.jsx'
import PlayIcon from '../PlayIcon.jsx'
import SectionHeader from '../SectionHeader.jsx'
import { useSite } from '../SiteContent.jsx'

// The Prop Samples reel: the YouTube video chosen in the admin (Site settings ->
// Home page), or a placeholder until there is one. It only plays when the
// visitor presses play, and uses YouTube's no-cookie player.
export default function ReelSection() {
  const { homeReel } = useSite()
  const videoId = youtubeId(homeReel?.url)

  return (
    <section className="px-2 py-6 md:px-3 lg:px-5 lg:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <SectionHeader title="Prop Samples" />

        {videoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={homeReel.altText || 'Prop samples video'}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full rounded-lg border-0 bg-ink"
          />
        ) : (
          <Placeholder label="Prop samples video" dark className="aspect-video rounded-lg">
            <PlayIcon size="lg" onDark />
          </Placeholder>
        )}
      </div>
    </section>
  )
}
