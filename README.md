# env

Personal configuration for macOS on Apple Silicon: dotfiles linked with [GNU stow](https://www.gnu.org/software/stow/), packages installed from a [Homebrew](https://brew.sh) `brewfile`, and every operation wrapped in a [`just`](https://github.com/casey/just) recipe.

## Install on a new Mac

```sh
git clone https://github.com/jtr860830/env.git ~/.config/env
~/.config/env/bootstrap.sh
```

`bootstrap.sh` installs Homebrew and `just`, then runs `just setup`, which:

1. installs everything in `brewfile`
2. writes `/etc/shells`, `/etc/pam.d/sudo_local` (Touch ID for sudo) and `/etc/homebrew/brew.env`, and makes Homebrew's fish the login shell — asks for sudo
3. links every package under `config/` into `$HOME`
4. installs fish and Neovim plugins and treesitter parsers

Open a new terminal afterwards. The repo can live in any directory; `~/.config/env` is only a convention.

## Everyday use

Files under `config/` are linked into `$HOME`, so editing them takes effect immediately. Run a recipe only when files or packages are added or removed:

| command | when |
|---|---|
| `just update` | upgrade all packages and plugins to their latest versions |
| `just link` | after adding a new file under `config/` |
| `just install` | after adding a package to `brewfile` |
| `just clean` | remove installed packages that are no longer in `brewfile` |
| `just check` | verify packages are installed and up to date, and links are clean |
| `just relink` | after moving the repo to another directory |

Run `just` on its own to list every recipe.

## Layout

| path | holds |
|---|---|
| `config/<package>/` | dotfiles, laid out as they appear under `$HOME` — `config/fish/.config/fish/config.fish` becomes `~/.config/fish/config.fish` |
| `brewfile` | formulae, casks and Mac App Store apps |
| `justfile` | every operation |
| `bootstrap.sh` | first-run setup on a fresh machine |

To add a tool's configuration, create `config/<tool>/` with the file at its path relative to `$HOME`, add `<tool>` to `packages` in `justfile`, and run `just link`.

## Not automated

App licences and preferences — Alfred, macOS system settings — are set by hand; see `AGENTS.md`.
