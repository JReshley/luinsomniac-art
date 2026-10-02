import { Fragment } from 'react'
import Button from '../Button.jsx'
import Chip from '../Chip.jsx'
import Placeholder from '../Placeholder.jsx'

const HEADLINE = ['I', 'build', 'worlds', 'in']

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-page items-end gap-3 px-2 pt-3 pb-6 md:gap-5 md:py-6 md:grid-cols-[1.35fr_0.65fr] md:px-3 lg:px-5 lg:py-8">
      {/* The site's opening moment: the words rise in turn, "3D"
          spins once like a model on a turntable, then a marker stroke is drawn
          under "2D" (styles.css: .rise, .turntable, .marker). --i is each
          piece's place in the sequence. */}
      <div className="flex flex-col items-start gap-2.5">
        <span className="rise inline-flex" style={{ '--i': 0 }}>
          <Chip variant="outline">
            {/* A status light: it pings three times, then holds steady. */}
            <span aria-hidden="true" className="relative flex size-0.75">
              <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping motion-safe:[animation-iteration-count:3]" />
              <span className="relative size-0.75 rounded-full bg-primary" />
            </span>
            Open for commissions
          </Chip>
        </span>

        <h1 className="text-display font-bold tracking-tight">
          {HEADLINE.map((word, i) => (
            <Fragment key={word}>
              <span className="rise inline-block" style={{ '--i': i + 1 }}>{word}</span>{' '}
            </Fragment>
          ))}
          <span className="rise inline-block" style={{ '--i': 5 }}>
            <span className="turntable inline-block font-display font-normal text-primary">3D</span>
          </span>{' '}
          <span className="rise inline-block" style={{ '--i': 6 }}>and</span>{' '}
          <span className="rise inline-block" style={{ '--i': 7 }}>
            {/* Navy text on an orange marker stroke: orange text on the light page fails contrast. */}
            <span className="marker font-display font-normal">2D</span>.
          </span>
        </h1>

        <p className="rise max-w-[36rem] text-ink/65" style={{ '--i': 8 }}>
          Multimedia artist working across prop modeling, background design, character creation and
          story-driven animation — from first thumbnail to final render.
        </p>

        <div className="rise flex w-full flex-col gap-1.5 pt-1.5 md:w-auto md:flex-row" style={{ '--i': 9 }}>
          <Button href="/museum" className="py-2 md:py-1.5">Step into the Museum →</Button>
          <Button variant="outline" href="#contact" className="py-2 md:py-1.5">Get in touch</Button>
        </div>
      </div>

      {/* On phones the character sits above the copy. It pops in alongside the
          headline. */}
      <Placeholder
        label="Waving 3D character"
        className="order-first mx-auto aspect-square w-full max-w-[200px] md:max-w-[340px] rounded-lg md:order-none motion-safe:animate-pop-in motion-safe:[animation-delay:300ms]"
      />
    </section>
  )
}
