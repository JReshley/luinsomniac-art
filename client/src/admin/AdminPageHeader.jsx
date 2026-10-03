// The top of every admin page: its title, an optional line under it, and its
// main actions on the right (below them on phones).
export default function AdminPageHeader({ title, children, actions }) {
  return (
    <header className="mb-3 flex flex-col gap-2 border-b border-ink/10 pb-2 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-heading font-bold">{title}</h1>
        {children && <p className="text-ink/65">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
    </header>
  )
}
