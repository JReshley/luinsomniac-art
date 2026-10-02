// Lui's stickers. The originals in assets/stickers/ are 200–600 KB PNGs, so the
// site uses the copies in assets/stickers/web/: cropped to the sticker's edge,
// at most 480px across, as WebP (15–35 KB each).
//
// The cats are one matching set (each in a box), so they live on the sticker
// sheet on the home page for visitors to peel off. The bunnies each have a
// mood, so each one turns up at the moment that fits it.

import catCalc from '../assets/stickers/web/cat-calc.webp'
import catJiji from '../assets/stickers/web/cat-jiji.webp'
import catOrinds from '../assets/stickers/web/cat-orinds.webp'
import catTilapia from '../assets/stickers/web/cat-tilapia.webp'
import catTost from '../assets/stickers/web/cat-tost.webp'
import catWaiter from '../assets/stickers/web/cat-waiter.webp'
import catWhite from '../assets/stickers/web/cat-white.webp'

import bunnyCool from '../assets/stickers/web/bunny-cool.webp'
import bunnyCryFirst from '../assets/stickers/web/bunny-cry-first.webp'
import bunnyFire from '../assets/stickers/web/bunny-fire.webp'
import bunnyProblem from '../assets/stickers/web/bunny-problem.webp'
import bunnySurprised from '../assets/stickers/web/bunny-surprised.webp'
import bunnyViolence from '../assets/stickers/web/bunny-violence.webp'
import bunnyWorkingHardly from '../assets/stickers/web/bunny-working-hardly.webp'

// Every cat sticker is the same 400 × 312 box shot, so they share one ratio.
export const CAT_RATIO = 400 / 312

export const CATS = [
  { id: 'calc', src: catCalc },
  { id: 'jiji', src: catJiji },
  { id: 'orinds', src: catOrinds },
  { id: 'tilapia', src: catTilapia },
  { id: 'tost', src: catTost },
  { id: 'waiter', src: catWaiter },
  { id: 'white', src: catWhite },
]

// Each with its width / height, for boxes that have to match its shape.
export const BUNNIES = {
  cool: { src: bunnyCool, ratio: 417 / 480 }, // finger guns, sunglasses: peeks at "Get in touch" and "Let's collaborate"
  cryFirst: { src: bunnyCryFirst, ratio: 480 / 286 }, // "I will handle it but I will cry first": flopped on the edge of "What I do"
  fire: { src: bunnyFire, ratio: 480 / 432 }, // arms up in flames: rises behind the Museum buttons
  problem: { src: bunnyProblem, ratio: 363 / 480 }, // "I might be the problem": the 404 page
  surprised: { src: bunnySurprised, ratio: 427 / 480 }, // phone in hand, "!!": slides out from "Read the full story"
  violence: { src: bunnyViolence, ratio: 323 / 480 }, // "Violence is an option": slapped on the corner of the About portrait
  workingHardly: { src: bunnyWorkingHardly, ratio: 480 / 337 }, // asleep on the laptop: 3D models still in progress
}
