set shell := ["bash", "-euo", "pipefail", "-c"]

packages := "claude codex fish ghostty git npm nvim omniwm pi ssh tealdeer tmux"

default:
    @just --list

setup: install etc link plugins

install:
    brew bundle install --file brewfile

update:
    brew bundle install --upgrade --file brewfile
    just plugins

plugins:
    nvim --headless '+lua vim.pack.update(nil, { force = true })' +qa
    @echo >&2
    nvim --headless '+lua require("nvim-treesitter").update():wait(600000)' +qa
    @echo >&2
    nvim --headless +qa

link:
    stow --no-folding -d config -t ~ {{packages}}

relink:
    cd config && find . -mindepth 2 \( -type f -o -type l \) -print0 | while IFS= read -r -d '' f; do t="$HOME/${f#./*/}"; if [ -L "$t" ] && [ ! -e "$t" ]; then rm "$t"; fi; done
    just link

etc:
    grep -qx /opt/homebrew/bin/fish /etc/shells || echo /opt/homebrew/bin/fish | sudo tee -a /etc/shells >/dev/null
    sudo mkdir -p /etc/homebrew
    printf 'HOMEBREW_CACHE=%s/.cache/homebrew\nHOMEBREW_XDG_CONFIG_HOME=%s/.config\n' "$HOME" "$HOME" | sudo tee /etc/homebrew/brew.env >/dev/null
    printf 'auth       optional       /opt/homebrew/lib/pam/pam_reattach.so\nauth       sufficient     pam_tid.so\n' | sudo tee /etc/pam.d/sudo_local >/dev/null
    sudo chmod 444 /etc/pam.d/sudo_local
    [ "$(dscl . -read ~ UserShell | cut -d' ' -f2)" = /opt/homebrew/bin/fish ] || chsh -s /opt/homebrew/bin/fish

check: check-docs
    brew bundle check --file brewfile
    ! grep -rlF "{{justfile_directory()}}" config/
    stow --no-folding -n -d config -t ~ {{packages}}

check-docs:
    #!/usr/bin/env python3
    import json
    import re
    import subprocess
    from pathlib import Path

    def glob_regex(glob):
        result, i = "", 0
        while i < len(glob):
            if glob[i:i + 3] == "**/":
                result += "(?:.*/)?"
                i += 3
            elif glob[i:i + 2] == "**":
                result += ".*"
                i += 2
            else:
                result += {"*": "[^/]*", "?": "[^/]"}.get(glob[i], re.escape(glob[i]))
                i += 1
        return re.compile("^" + result + "$")

    docs = sorted(Path("docs").glob("*.md"))
    sources = [Path("AGENTS.md"), Path("README.md"), *docs, *Path(".pi/skills").rglob("*.md")]
    errors = []
    references = re.compile(r"(?<![\w./-])docs/[\w.-]+\.md\b")
    for source in sources:
        for number, line in enumerate(source.read_text().splitlines(), 1):
            for match in references.finditer(line):
                if not Path(match[0]).is_file():
                    errors.append(f"{source}:{number}: missing documentation: {match[0]}")
    index = set(references.findall(Path("AGENTS.md").read_text()))
    files = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"]).decode().split("\0")
    for doc in docs:
        if str(doc) not in index:
            errors.append(f"{doc}: missing from AGENTS.md index")
        try:
            frontmatter = doc.read_text().split("---", 2)[1]
            globs = json.loads(re.search(r"^paths:\s*(\[.*\])\s*$", frontmatter, re.M)[1])
            for glob in globs:
                if not any(glob_regex(glob).fullmatch(file) for file in files if file):
                    errors.append(f"{doc}: paths glob matches no repository file: {glob}")
        except (IndexError, TypeError, ValueError) as error:
            errors.append(f"{doc}: invalid paths frontmatter (expected a JSON-style array): {error}")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Documentation references, index and paths globs OK")

clean:
    brew bundle cleanup --force --file brewfile
