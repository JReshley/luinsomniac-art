import { Fragment } from 'react'

// A heading set in the display face, split into letters so each one can move:
// they hop when the pointer runs over them, and with `entrance` they drop in
// one after another when the page opens (styles.css, .toy-letter).
//
// Screen readers get the plain text once; the letter boxes are hidden from
// them, otherwise some would spell the title out letter by letter. Words stay
// whole so a title only ever wraps between words.

export default function DisplayTitle({ as: Tag = 'h1', text, entrance = false, className = '' }) {
  let index = 0

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, w) => (
          <Fragment key={w}>
            {w > 0 && ' '}
            <span className="inline-block whitespace-nowrap">
              {[...word].map((letter) => {
                const i = index++
                return (
                  <span key={i} className={`toy-letter ${entrance ? 'toy-letter--drop' : ''}`} style={{ '--i': i }}>
                    {letter}
                  </span>
                )
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  )
}
