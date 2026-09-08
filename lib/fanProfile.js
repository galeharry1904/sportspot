// Shared between every page that shows the fan avatar badge, so it never
// disagrees on what to show before a name is on file vs after.
export function getFanInitials(fanProfile, fanSession) {
  const first = fanProfile?.first_name?.[0]
  const last = fanProfile?.last_name?.[0]
  if (first && last) return (first + last).toUpperCase()
  return fanSession?.user?.email?.[0]?.toUpperCase() || '?'
}
