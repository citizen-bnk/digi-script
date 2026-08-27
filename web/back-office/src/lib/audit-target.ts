/**
 * Where an audit entry's target lives in this portal.
 *
 * The audit log records targetType/targetId for everything, but only some of
 * those have a screen: a Conversation belongs to the mobile app, and an
 * Escalation has no addressable URL of its own — the queue selects one
 * in-page. Returning null for those is what keeps the log from offering a
 * link that lands on a redirect.
 */
export function auditTargetPath(targetType: string | null, targetId: string | null): string | null {
  if (!targetId) return null
  switch (targetType) {
    case 'Document':
      return `/documents/${targetId}`
    case 'Student':
      return `/students/${targetId}`
    case 'User':
      return `/users/${targetId}`
    case 'School':
      return '/schools'
    default:
      return null
  }
}
