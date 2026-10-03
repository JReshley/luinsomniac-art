import { createContext, useContext, useEffect, useMemo } from 'react'
import { usePublicData } from '../api/publicData.js'
import { EMAIL, SOCIALS } from '../data/contact.js'
import { DEFAULT_EXPERIENCE, DEFAULT_TEXT, softwareList } from '../data/siteText.js'

// The site-wide content the admin edits (Site text, Links, Brand), loaded once
// for the whole public site and read with useSite().
//
// Until it arrives, or if it fails to, the site uses the copy bundled with it:
// the address and profiles in data/contact.js, the name, and the logo and
// portrait in src/assets. An admin setting left empty means the same. So the
// site never shows a blank footer, and never waits on the API to draw.

const NAME = 'Luinsomniac Art'

const LABELS = { instagram: 'Instagram', tiktok: 'TikTok', vgen: 'VGen' }
const labelFor = (platform) => LABELS[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1)

const BUNDLED_LINKS = SOCIALS.map((social) => ({ platform: social.id, url: social.href }))

function build(data) {
  const email = data?.email || EMAIL
  const links = data?.links ?? BUNDLED_LINKS
  const text = data?.text ?? {}

  return {
    displayName: data?.displayName || NAME,
    email,
    // The logo, icon and portrait, or null to use the bundled picture.
    logo: data?.logo ?? null,
    icon: data?.icon ?? null,
    portrait: data?.portrait ?? null,
    // The Prop Samples video on the home page (YouTube), or null for the placeholder.
    homeReel: data?.homeReel ?? null,
    // A piece of site text: the admin's, else the site's own (data/siteText.js).
    // A field cleared in the admin goes back to the site's own too.
    text: (key, fallback = DEFAULT_TEXT[key]) => (text[key]?.trim() ? text[key] : fallback),
    // The tools listed on the About page and the home page's About section.
    software: softwareList(text['about.software']?.trim() ? text['about.software'] : DEFAULT_TEXT['about.software']),
    // The About page's experience rows, in order. An empty list hides the section.
    experience: data?.experience ?? DEFAULT_EXPERIENCE,
    // Email first, then the profiles. Only the profiles open in a new tab.
    contacts: [
      { id: 'email', label: email, href: `mailto:${email}` },
      ...links.map((link) => ({ id: link.platform, label: labelFor(link.platform), href: link.url, external: true })),
    ],
  }
}

const SiteContext = createContext(build(null))

export function SiteProvider({ children }) {
  const { data } = usePublicData('site')
  const site = useMemo(() => build(data), [data])

  // The browser-tab icon, when the admin has uploaded one.
  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]')
    if (!link || !site.icon) return
    const original = link.href
    link.href = site.icon.url
    return () => { link.href = original }
  }, [site.icon])

  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>
}

export const useSite = () => useContext(SiteContext)
