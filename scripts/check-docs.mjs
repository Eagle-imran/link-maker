import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", "node_modules"]);

function markdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (extname(entry.name) === ".md") files.push(path);
  }
  return files;
}

const failures = [];
const linkPattern = /!?(?:\[[^\]]*\])\(([^)]+)\)/g;

for (const file of markdownFiles(root)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    if (
      !target ||
      target.startsWith("#") ||
      /^(https?:|mailto:)/i.test(target)
    ) {
      continue;
    }
    const relative = target.split("#", 1)[0].split("?", 1)[0];
    let decoded;
    try {
      decoded = decodeURIComponent(relative);
    } catch {
      failures.push(`${file}: invalid URL encoding in ${target}`);
      continue;
    }
    const destination = resolve(dirname(file), decoded);
    if (!existsSync(destination)) {
      failures.push(`${file}: missing link target ${target}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Documentation links are valid.");
}
