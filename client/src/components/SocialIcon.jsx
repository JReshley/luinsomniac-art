// Line icons drawn in currentColor so they follow the link's hover colour.
export default function SocialIcon({ id }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {id === 'email' && (
        <>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </>
      )}
      {id === 'instagram' && (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </>
      )}
      {id === 'linkedin' && (
        <>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </>
      )}
      {/* A stand-in V mark; swap in VGen's official logo if you have the SVG. */}
      {id === 'vgen' && (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M7.5 7.5 12 17l4.5-9.5" />
        </>
      )}
    </svg>
  )
}
