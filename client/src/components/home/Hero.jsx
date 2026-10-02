import Button from '../Button.jsx'
import Chip from '../Chip.jsx'
import Placeholder from '../Placeholder.jsx'

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-page items-end gap-5 px-2 py-6 md:grid-cols-[1.35fr_0.65fr] md:px-3 lg:px-5 lg:py-8">
      <div className="flex flex-col items-start gap-2.5">
        <Chip variant="outline">
          <span aria-hidden="true" className="size-0.75 rounded-full bg-primary" />
          Open for commissions
        </Chip>

        <h1 className="text-display font-bold tracking-tight">
          I build worlds in <span className="font-display font-normal text-primary">3D</span> and{' '}
          {/* Navy text on an orange marker stroke: orange text on the light page fails contrast. */}
          <span className="bg-[linear-gradient(transparent_50%,var(--color-accent)_50%,var(--color-accent)_88%,transparent_88%)] font-display font-normal">
            2D
          </span>
          .
        </h1>

        <p className="max-w-[36rem] text-ink/65">
          Multimedia artist working across prop modeling, background design, character creation and
          story-driven animation — from first thumbnail to final render.
        </p>

        <div className="flex w-full flex-col gap-1.5 pt-1.5 md:w-auto md:flex-row">
          <Button href="/museum">Step into the Museum →</Button>
          <Button variant="outline" href="#contact">Get in touch</Button>
        </div>
      </div>

      {/* On phones the character sits above the copy. */}
      <Placeholder
        label="Waving 3D character"
        className="order-first mx-auto aspect-square w-full max-w-[340px] rounded-lg md:order-none"
      />
    </section>
  )
}
