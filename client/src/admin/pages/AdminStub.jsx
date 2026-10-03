import { useMatches } from 'react-router-dom'
import AdminPageHeader from '../AdminPageHeader.jsx'

// The page for an /admin address nothing matches. The title and note come from
// the route's `handle` in main.jsx.
export default function AdminStub() {
  const { title, note } = useMatches().at(-1).handle

  return <AdminPageHeader title={title}>{note}</AdminPageHeader>
}
