import { Fragment } from 'react'
import PeekButton from '../PeekButton.jsx'
import Chip from '../Chip.jsx'
import WavingLucas from './WavingLucas.jsx'
import { BUNNIES } from '../../data/stickers.js'

const HEADLINE = ['I', 'build', 'worlds', 'in']

// Hovering a piece of the hero plays its move again: "3D" re-spins, the marker
// redraws under "2D", the status light pings. It restarts the CSS animations
// that already ran, skipping the fade-in entrances (replaying those would
// blink the text out). With reduced motion on, none of them ran, so there is
// nothing to replay.
function replay(event) {
  for (const animation of event.currentTarget.getAnimations({ subtree: true })) {
    if (animation.animationName === 'rise' || animation.animationName === 'pop-in') continue
    if (animation.playState !== 'finished') continue
    animation.currentTime = animation.effect.getComputedTiming().delay
    animation.play()
  }
}

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-page items-end gap-3 px-2 pt-3 pb-6 md:gap-5 md:py-6 md:grid-cols-[1.35fr_0.65fr] md:px-3 lg:px-5 lg:py-8">
      {/* The site's opening moment: the words rise in turn, "3D"
          spins once like a model on a turntable, then a marker stroke is drawn
          under "2D" (styles.css: .rise, .turntable, .marker). --i is each
          piece's place in the sequence. */}
      <div className="flex flex-col items-start gap-2.5">
        <span className="rise inline-flex" style={{ '--i': 0 }} onMouseEnter={replay}>
          <Chip variant="outline">
            {/* A status light: it pings three times, then holds steady. The fill
                mode keeps the finished ping around (its last frame is invisible)
                so hovering the chip can replay it. */}
            <span aria-hidden="true" className="relative flex size-0.75">
              <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping motion-safe:[animation-iteration-count:3] motion-safe:[animation-fill-mode:both]" />
              <span className="relative size-0.75 rounded-full bg-primary" />
            </span>
            Open for commissions
          </Chip>
        </span>

        <h1 className="text-display font-bold tracking-tight">
          {HEADLINE.map((word, i) => (
            <Fragment key={word}>
              <span className="rise inline-block" style={{ '--i': i + 1 }}>
                <span className="toy-letter">{word}</span>
              </span>{' '}
            </Fragment>
          ))}
          <span className="rise inline-block" style={{ '--i': 5 }}>
            <span className="turntable inline-block font-display font-normal text-primary" onMouseEnter={replay}>
              3D
            </span>
          </span>{' '}
          <span className="rise inline-block" style={{ '--i': 6 }}>
            <span className="toy-letter">and</span>
          </span>{' '}
          <span className="rise inline-block" style={{ '--i': 7 }}>
            {/* Navy text on an orange marker stroke: orange text on the light page fails contrast. */}
            <span className="marker font-display font-normal" onMouseEnter={replay}>2D</span>.
          </span>
        </h1>

        <p className="rise max-w-[36rem] text-ink/65" style={{ '--i': 8 }}>
          Multimedia artist working across prop modeling, background design, character creation and
          story-driven animation — from first thumbnail to final render.
        </p>

        <div className="rise flex w-full flex-col gap-1.5 pt-1.5 md:w-auto md:flex-row" style={{ '--i': 9 }}>
          {/* The museum is on fire (it rises from behind the button); the
              cool bunny peeks over "Get in touch", somewhere new each time. */}
          <PeekButton sticker={BUNNIES.fire} size="5.5rem" href="/museum" className="w-full py-2 md:w-auto md:py-1.5">
            Step into the Museum →
          </PeekButton>
          <PeekButton
            sticker={BUNNIES.cool}
            align="random"
            show={0.7}
            size="5rem"
            variant="outline"
            href="#contact"
            className="w-full py-2 md:w-auto md:py-1.5"
          >
            Get in touch
          </PeekButton>
        </div>
      </div>

      {/* On phones the character sits above the copy. It pops in alongside the
          headline, then waves once whenever it's hovered or pressed. */}
      <div className="order-first mx-auto w-full max-w-[120px] md:order-none md:max-w-[150px] lg:max-w-[130px]">
        <WavingLucas className="w-full motion-safe:animate-pop-in motion-safe:[animation-delay:300ms]" />
      </div>
    </section>
  )
}
