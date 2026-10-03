import { useMatches } from 'react-router-dom'
import AdminPageHeader from '../AdminPageHeader.jsx'

// Holds each admin section's place until its screen is built (admin plan,
// phase 3), so the sidebar and dashboard links already land somewhere. The
// title and note come from the route's `handle` in main.jsx.
export default function AdminStub() {
  const { title, note } = useMatches().at(-1).handle

  return <AdminPageHeader title={title}>{note}</AdminPageHeader>
}
