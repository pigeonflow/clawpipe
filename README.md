# clawpipe

> Talk to your OpenClaw agent from the terminal — with file and folder context.

[![npm version](https://img.shields.io/npm/v/clawpipe)](https://www.npmjs.com/package/clawpipe)
[![license](https://img.shields.io/npm/l/clawpipe)](LICENSE)

## Install

```bash
npm install -g clawpipe
```

## Usage

```bash
# Send a message
clawpipe "what does this project do?"

# Include files as context with @references
clawpipe "explain this" @src/index.ts

# Include a whole directory
clawpipe "review the project structure" @src/

# Pipe stdin
git diff | clawpipe "review this diff"
cat error.log | clawpipe "what went wrong?"

# Combine both
git diff | clawpipe "review against the spec" @spec.md

# Plain output for scripting
clawpipe --raw "summarize @README.md" | pbcopy

# Target a specific session
clawpipe --session mybot "deploy status"

# Override the model
clawpipe --model claude-sonnet-4 "quick question"
```

## How `@` references work

| Reference | What happens |
|-----------|-------------|
| `@file.ts` | Includes the file contents |
| `@src/` | Lists directory + includes text file contents |
| `@../spec.md` | Relative paths resolve from cwd |

References resolve relative to your current working directory. Folders include a file listing and the contents of recognized text files (up to 512KB each, 50 files max).

## Options

```
-s, --session <id>    Target a specific session (default: "main")
-r, --raw             Plain output — no colors, no spinner
-m, --model <model>   Override the model
--completions <shell>  Output shell completions (bash|zsh|fish)
-h, --help            Show help
-V, --version         Show version
```

## Shell Completions

Tab-complete `@` references to files and directories:

### Bash
```bash
clawpipe --completions bash >> ~/.bashrc
source ~/.bashrc
```

### Zsh
```bash
clawpipe --completions zsh >> ~/.zshrc
source ~/.zshrc
```

### Fish
```bash
clawpipe --completions fish > ~/.config/fish/completions/clawpipe.fish
```

## Requirements

- Node.js ≥ 18
- [OpenClaw](https://github.com/openclaw/openclaw) installed and gateway running (`openclaw gateway start`)

## License

MIT
