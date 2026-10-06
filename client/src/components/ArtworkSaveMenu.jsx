import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { artworkDownloadUrl, isArtworkImage } from '../lib/publicWork.js'

// Right-clicking (or long-pressing, on Android) a work's picture opens this
// small menu instead of the browser's own. Its "Save image" hands out the
// watermarked download from the API: full size, with a faint diagonal tile
// across it, so a saved copy always says whose it is. Dragging a picture out
// of the page is turned off too, and iPhones' long-press menu is hidden in
// styles.css.
//
// It's one listener for the whole site rather than a prop on every <img>: a
// picture counts as a work's when it comes from /api/img. Stickers, Lucas and
// the portrait aren't, so they behave as normal.

const MENU_WIDTH = 220
const EDGE = 8

// The work's picture under the pointer, even when something sits on top of
// it (a video card's play badge covers its cover picture).
const isArtwork = (element) => element instanceof HTMLImageElement && isArtworkImage(element.currentSrc || element.src)

const artworkImageAt = (event) =>
  isArtwork(event.target) ? event.target : (document.elementsFromPoint(event.clientX, event.clientY).find(isArtwork) ?? null)

export default function ArtworkSaveMenu() {
  const [menu, setMenu] = useState(null) // { x, y, href, container }
  const menuRef = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    const onContextMenu = (event) => {
      const img = artworkImageAt(event)
      if (!img) return
      event.preventDefault()
      setMenu({
        x: event.clientX,
        y: event.clientY,
        href: artworkDownloadUrl(img.currentSrc || img.src),
        // Inside the open Lightbox the menu has to live in its <dialog>:
        // everything outside a modal dialog can't be clicked.
        container: img.closest('dialog[open]') ?? document.body,
      })
    }
    const onDragStart = (event) => {
      if (artworkImageAt(event)) event.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])

  // Closes on a press anywhere else, Escape, scrolling or resizing.
  useEffect(() => {
    if (!menu) return
    // The top layer, above the cards' lifted hover and the Lightbox, whatever
    // their z-index.
    const element = menuRef.current
    element.showPopover?.()
    // Kept on screen: flipped to the pointer's other side near an edge.
    // clientWidth, unlike innerWidth, leaves out the scrollbar.
    const { width, height } = element.getBoundingClientRect()
    const { clientWidth, clientHeight } = document.documentElement
    const left = menu.x + width + EDGE > clientWidth ? menu.x - width : menu.x
    const top = menu.y + height + EDGE > clientHeight ? menu.y - height : menu.y
    element.style.left = `${Math.max(EDGE, left)}px`
    element.style.top = `${Math.max(EDGE, top)}px`
    element.querySelector('a')?.focus()
    const close = () => setMenu(null)
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) close()
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      // Only the menu: without this the Lightbox would close as well.
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  useEffect(() => setMenu(null), [pathname])

  if (!menu) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Picture"
      popover="manual"
      className="fixed inset-auto z-50 m-0 animate-fade-in rounded-sm border-2 border-ink bg-surface p-0.5 text-ink shadow-[0_4px_0_rgb(11_21_51/0.9)]"
      style={{ left: menu.x, top: menu.y, width: MENU_WIDTH }}
    >
      <a
        role="menuitem"
        href={menu.href}
        download
        onClick={() => setMenu(null)}
        className="block rounded-[0.375rem] px-1.5 py-1 font-medium no-underline hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-2 focus-visible:outline-primary"
      >
        Save image
      </a>
      <p className="px-1.5 pb-1 text-small text-ink/65">Saved copies carry Lui&rsquo;s watermark. Please credit @luinsomniac_art.</p>
    </div>,
    menu.container
  )
}
