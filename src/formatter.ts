import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

const marked = new Marked();
marked.use(markedTerminal() as any);

export function formatResponse(text: string): string {
  try {
    const rendered = marked.parse(text) as string;
    // Trim trailing whitespace but keep structure
    return rendered.replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    // Fallback to plain text with a subtle border
    return chalk.dim('─'.repeat(40)) + '\n' + text + '\n' + chalk.dim('─'.repeat(40));
  }
}
