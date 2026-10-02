import Placeholder from '../Placeholder.jsx'
import PlayIcon from '../PlayIcon.jsx'
import SectionHeader from '../SectionHeader.jsx'

export default function ReelSection() {
  return (
    <section className="px-2 py-6 md:px-3 lg:px-5 lg:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <SectionHeader title="Prop Samples" />

        <Placeholder label="Prop samples video" dark className="aspect-video rounded-lg">
          <PlayIcon size="lg" onDark />
        </Placeholder>
      </div>
    </section>
  )
}
