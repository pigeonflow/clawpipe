import chalk from 'chalk';
import ora from 'ora';
import { execFile } from 'node:child_process';

interface SendOptions {
  session?: string;
  model?: string;
  raw?: boolean;
}

export async function sendMessage(message: string, opts: SendOptions): Promise<string> {
  const spinner = opts.raw ? null : ora({
    text: chalk.dim('thinking…'),
    color: 'cyan',
    spinner: 'dots',
    stream: process.stderr,
  }).start();

  try {
    const args = ['agent', '--message', message, '--json'];
    if (opts.session) args.push('--session-id', opts.session);
    if (opts.model) args.push('--model', opts.model);

    const result = await new Promise<string>((resolve, reject) => {
      execFile('openclaw', args, {
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      }, (err, stdout, stderr) => {
        if (err) {
          // Check if openclaw is not installed
          if ((err as any).code === 'ENOENT') {
            reject(new Error(
              `${chalk.yellow('openclaw')} not found in PATH.\n` +
              `  ${chalk.dim('Install:')} npm install -g openclaw`
            ));
            return;
          }
          reject(new Error(stderr?.trim() || err.message));
          return;
        }
        resolve(stdout);
      });
    });

    spinner?.stop();

    // Parse JSON output from `openclaw agent --json`
    try {
      const data = JSON.parse(result);
      // openclaw agent --json returns { result: { payloads: [{ text }] } }
      if (data.result?.payloads?.[0]?.text) {
        return data.result.payloads[0].text;
      }
      return data.response || data.text || data.message || result.trim();
    } catch {
      return result.trim();
    }
  } catch (err: any) {
    spinner?.stop();

    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('gateway')) {
      throw new Error(
        `Cannot connect to OpenClaw gateway.\n` +
        `  ${chalk.dim('Is it running? Try:')} openclaw gateway start`
      );
    }

    throw err;
  }
}
