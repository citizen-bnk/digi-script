/**
 * Removes database credentials from text that is about to leave the server.
 *
 * Prisma prints the datasource URL verbatim in several of its error
 * messages, and that URL carries the password. Any path that returns an
 * error message to a browser has to go through this first.
 */
export function redactConnectionStrings(message: string, maxLength = 600): string {
  return message
    .replace(/\b[a-z]+(?:ql)?:\/\/[^\s"']+/gi, "[connection string removed]")
    .slice(0, maxLength);
}
