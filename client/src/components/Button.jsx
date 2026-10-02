// The Button atom from the design system (Figma node 23:1984). It replaces the
// old .btn / .btn--primary / .btn--outline classes from the pre-Tailwind styles.css.
//
// With Tailwind the styles live in the className strings, so the way to keep
// every button looking the same is to keep those strings in one component,
// not to copy them into each page.
//
//   primary — blue, the default
//   outline — 2px ink border; pass onDark on navy bands, where ink is invisible
//   accent  — orange pill, navy text. One per page.
//
// Give it `href` and it renders a link; otherwise a <button>. An internal path
// like "/museum" becomes a router <Link>, so the page changes without a full
// reload. Anything else ("#contact", "mailto:", "https://") stays a plain <a>.

import { Link } from 'react-router-dom'

// Hovering lifts a button a hair; pressing squashes it flat (wider and shorter,
// like a ball hitting the floor) and letting go springs it back.
const BASE =
  'inline-flex items-center justify-center gap-1 whitespace-nowrap px-3 py-1.5 font-medium leading-[1.4] no-underline ' +
  'transition-[color,background-color,border-color,translate,scale] duration-200 ease-spring ' +
  'motion-safe:hover:-translate-y-0.25 motion-safe:active:translate-y-0 motion-safe:active:scale-x-105 motion-safe:active:scale-y-90'

const VARIANTS = {
  primary: 'rounded-sm bg-primary text-surface hover:bg-primary/90',
  outline: 'rounded-sm border-2 border-ink text-ink hover:bg-ink/5',
  accent: 'rounded-full bg-accent text-ink hover:bg-accent/90',
}

// Blue never sits on navy (2.7 : 1), so on a dark band the outline turns
// off-white instead.
const OUTLINE_ON_DARK = 'rounded-sm border-2 border-bg/65 text-bg hover:border-bg'

export default function Button({ variant = 'primary', onDark = false, href, className = '', children, ...rest }) {
  const look = variant === 'outline' && onDark ? OUTLINE_ON_DARK : VARIANTS[variant]
  const classes = `${BASE} ${look} ${className}`

  if (href?.startsWith('/')) {
    return (
      <Link to={href} viewTransition className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className={`${classes} cursor-pointer disabled:cursor-default disabled:opacity-60`} {...rest}>
      {children}
    </button>
  )
}
