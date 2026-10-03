// The top of every admin page: its title, an optional line under it, and its
// main actions on the right (below them on phones). `status` sits beside the
// title: whether the data on the page is reloading or failed to (RefreshStatus).
export default function AdminPageHeader({ title, children, actions, status }) {
  return (
    <header className="mb-3 flex flex-col gap-2 border-b border-ink/10 pb-2 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1 className="text-heading font-bold">{title}</h1>
          {status}
        </div>
        {children && <p className="text-ink/65">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
    </header>
  )
}
