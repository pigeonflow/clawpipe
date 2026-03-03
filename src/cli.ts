#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { resolveRefs } from './resolver.js';
import { sendMessage } from './gateway.js';
import { formatResponse } from './formatter.js';
import { readStdin } from './stdin.js';

program
  .name('clawpipe')
  .description('Talk to your OpenClaw agent from the terminal — with file and folder context.')
  .version('0.1.0')
  .argument('[message...]', 'Message to send (use @path to include file/folder context)')
  .option('-s, --session <id>', 'Target a specific session', 'main')
  .option('-r, --raw', 'Plain output — no colors, no spinner (good for piping)')
  .option('-m, --model <model>', 'Override the model')
  .option('--completions <shell>', 'Output shell completions (bash|zsh|fish)')
  .addHelpText('after', `
${chalk.dim('Examples:')}
  ${chalk.cyan('clawpipe')} "explain this code" ${chalk.yellow('@src/index.ts')}
  ${chalk.cyan('git diff |')} ${chalk.cyan('clawpipe')} "review this"
  ${chalk.cyan('cat error.log |')} ${chalk.cyan('clawpipe')} "what went wrong?" ${chalk.yellow('@config.yml')}
  ${chalk.cyan('clawpipe')} --session mybot "deploy status"
  ${chalk.cyan('clawpipe')} --raw "summarize @README.md" ${chalk.dim('| pbcopy')}

${chalk.dim('File references:')}
  ${chalk.yellow('@file.ts')}        → includes file contents
  ${chalk.yellow('@src/')}           → includes directory listing + text file contents
  ${chalk.yellow('@../spec.md')}     → relative paths work too
`);

program.parse();

async function main() {
  const opts = program.opts();

  // Shell completions
  if (opts.completions) {
    outputCompletions(opts.completions);
    return;
  }

  const args = program.args;
  const raw = opts.raw || !process.stdout.isTTY;

  // Read stdin if piped
  const stdin = await readStdin();

  if (args.length === 0 && !stdin) {
    program.help();
  }

  const rawMessage = args.join(' ');

  // Resolve @references
  let message: string;
  try {
    message = await resolveRefs(rawMessage);
  } catch (err: any) {
    console.error(chalk.red('✗'), err.message);
    process.exit(1);
  }

  // Prepend stdin context
  if (stdin) {
    const label = chalk.dim('(stdin)');
    message = message
      ? `<stdin>\n${stdin}\n</stdin>\n\n${message}`
      : `<stdin>\n${stdin}\n</stdin>`;
    if (!raw) {
      console.error(chalk.dim(`  ╎ piped ${stdin.length.toLocaleString()} chars from stdin`));
    }
  }

  if (!message.trim()) {
    console.error(chalk.red('✗'), 'Empty message. Nothing to send.');
    process.exit(1);
  }

  // Send to gateway
  try {
    const response = await sendMessage(message, {
      session: opts.session,
      model: opts.model,
      raw,
    });

    if (raw) {
      process.stdout.write(response + '\n');
    } else {
      console.log();
      console.log(formatResponse(response));
    }
  } catch (err: any) {
    console.error(chalk.red('✗'), err.message);
    process.exit(1);
  }
}

function outputCompletions(shell: string) {
  switch (shell) {
    case 'bash':
      console.log(`# clawpipe bash completion
_clawpipe() {
  local cur=\${COMP_WORDS[COMP_CWORD]}
  if [[ "$cur" == @* ]]; then
    local prefix=\${cur#@}
    COMPREPLY=($(compgen -f -- "$prefix" | sed 's/^/@/'))
  fi
}
complete -o default -F _clawpipe clawpipe`);
      break;
    case 'zsh':
      console.log(`# clawpipe zsh completion
_clawpipe() {
  local -a args
  if [[ "$PREFIX" == @* ]]; then
    local fileprefix=\${PREFIX#@}
    local files=($(ls -d \${fileprefix}* 2>/dev/null))
    compadd -P @ -- \${files[@]}
  else
    _arguments '*:message:' '--session[Target session]:session:' '--raw[Plain output]' '--model[Override model]:model:'
  fi
}
compdef _clawpipe clawpipe`);
      break;
    case 'fish':
      console.log(`# clawpipe fish completion
complete -c clawpipe -l session -s s -d 'Target session' -x
complete -c clawpipe -l raw -s r -d 'Plain output (no colors)'
complete -c clawpipe -l model -s m -d 'Override model' -x
# @ file completion handled by fish's token-complete`);
      break;
    default:
      console.error(chalk.red('✗'), `Unknown shell: ${shell}. Use bash, zsh, or fish.`);
      process.exit(1);
  }
}

main();
