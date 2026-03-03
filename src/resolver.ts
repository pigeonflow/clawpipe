import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.jsonl', '.yaml', '.yml', '.toml',
  '.md', '.mdx', '.txt', '.csv', '.xml', '.html', '.css', '.scss',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.h', '.cpp', '.hpp',
  '.sh', '.bash', '.zsh', '.fish', '.env', '.ini', '.cfg', '.conf',
  '.sql', '.graphql', '.prisma', '.proto',
  '.dockerfile', '.gitignore', '.editorconfig',
  '.svelte', '.vue',
]);

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  // Dotfiles that are usually text
  if (['makefile', 'dockerfile', 'gemfile', 'rakefile', '.gitignore', '.env'].includes(base)) return true;
  return false;
}

const MAX_FILE_SIZE = 512 * 1024; // 512KB per file
const MAX_DIR_FILES = 50;

async function resolveFile(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  const stat = await fs.stat(resolved).catch(() => null);

  if (!stat) {
    throw new Error(`File not found: ${chalk.yellow(filePath)}`);
  }

  if (stat.isDirectory()) {
    return await resolveDir(resolved, filePath);
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(stat.size / 1024).toFixed(0)}KB > 512KB limit): ${chalk.yellow(filePath)}`);
  }

  const content = await fs.readFile(resolved, 'utf-8');
  return `<file path="${filePath}">\n${content}\n</file>`;
}

async function resolveDir(resolved: string, label: string): Promise<string> {
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const lines: string[] = [`<directory path="${label}">`];
  const listing = entries.map(e => `  ${e.isDirectory() ? e.name + '/' : e.name}`);
  lines.push(listing.join('\n'));

  // Include contents of small text files (up to limit)
  let included = 0;
  for (const entry of entries) {
    if (included >= MAX_DIR_FILES) break;
    if (entry.isFile() && isTextFile(entry.name)) {
      const fp = path.join(resolved, entry.name);
      const stat = await fs.stat(fp).catch(() => null);
      if (stat && stat.size < MAX_FILE_SIZE) {
        const content = await fs.readFile(fp, 'utf-8');
        lines.push(`\n<file path="${label}/${entry.name}">\n${content}\n</file>`);
        included++;
      }
    }
  }

  lines.push('</directory>');
  return lines.join('\n');
}

/**
 * Resolve all @path references in a message string.
 * Returns the message with @refs replaced by file/folder contents.
 */
export async function resolveRefs(message: string): Promise<string> {
  // Match @path references (not inside quotes, not email-like)
  const refPattern = /@((?:\.\.?\/)?[\w./_-][\w./_\-]*)/g;
  const refs: { match: string; refPath: string; start: number; end: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = refPattern.exec(message)) !== null) {
    refs.push({
      match: m[0],
      refPath: m[1],
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  if (refs.length === 0) return message;

  // Resolve all refs
  const resolved = await Promise.all(
    refs.map(async (ref) => {
      const content = await resolveFile(ref.refPath);
      return { ...ref, content };
    })
  );

  // Rebuild message: replace refs with placeholders, append context
  let cleanMessage = message;
  const contexts: string[] = [];

  // Replace from end to preserve indices
  for (const ref of resolved.reverse()) {
    cleanMessage = cleanMessage.slice(0, ref.start) + ref.refPath + cleanMessage.slice(ref.end);
    contexts.unshift(ref.content);
  }

  if (!process.env.CLAWPIPE_RAW) {
    const count = resolved.length;
    const label = count === 1 ? '1 reference' : `${count} references`;
    process.stderr.write(chalk.dim(`  ╎ resolved ${label}\n`));
  }

  return contexts.join('\n\n') + '\n\n' + cleanMessage;
}
