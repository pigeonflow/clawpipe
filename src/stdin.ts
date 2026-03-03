/**
 * Read stdin if it's being piped (non-TTY).
 * Returns null if stdin is a terminal.
 */
export async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf-8').trim();
  return text || null;
}
