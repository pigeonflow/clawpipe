# clawpipe

Talk to your AI agent from the terminal. Pass files as context with `@`. That's it.

[![npm](https://img.shields.io/npm/v/clawpipe)](https://www.npmjs.com/package/clawpipe)

```bash
npm i -g clawpipe
```

## Why

You're in the terminal. You want to ask your agent something about the code you're staring at. You don't want to copy-paste into a chat window, attach files manually, or leave your workflow.

```bash
clawpipe "why is this failing?" @tests/auth.test.ts
```

Done. File contents included. Response in your terminal.

## Examples

```bash
# Ask about a file
clawpipe "explain this" @src/index.ts

# Review a diff
git diff | clawpipe "review this"

# Combine piped input with file context
git diff | clawpipe "review against the spec" @docs/spec.md

# Include a whole directory
clawpipe "what does this project do?" @src/

# Script it
clawpipe --raw "summarize @README.md" | pbcopy
```

## `@` references

`@path` resolves relative to your cwd. Directories include a file listing + contents of text files.

```bash
@file.ts       # file contents
@src/          # directory listing + text files
@../spec.md    # relative paths work
```

Tab completion works out of the box (bash/zsh/fish):

```bash
# Install completions
clawpipe --completions zsh >> ~/.zshrc   # or bash/fish
```

## Options

```
-s, --session <id>    Target a specific agent session (default: main)
-r, --raw             No colors, no spinner — for piping
-m, --model <model>   Override the model
-V, --version         Version
```

## Setup

Requires [OpenClaw](https://github.com/openclaw/openclaw) with the gateway running.

```bash
openclaw gateway start
```

## License

MIT
