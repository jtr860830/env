import json
import os
import re
import subprocess
from pathlib import Path

os.chdir(Path(__file__).resolve().parent.parent)


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
