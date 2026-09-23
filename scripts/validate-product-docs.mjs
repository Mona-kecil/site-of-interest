import { access, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ticketDocuments = (await readdir("docs/tickets"))
  .filter((name) => name.endsWith(".md"))
  .sort()
  .map((name) => `docs/tickets/${name}`);
const documents = ["docs/product-brief.md", "docs/system-design.md", ...ticketDocuments];
const bannedPatterns = [
  [/\u2014/g, "em dash"],
  [/\u201c|\u201d/g, "curly double quote"],
  [/\u2018|\u2019/g, "curly single quote"],
  [/\b(?:etc\.?|various|something|somehow|soon|eventually)\b/gi, "vague word"],
  [/\b(?:deep|complete)\s+(?:analysis|coverage|data|dataset|fundamentals|support)\b/gi, "undefined scope word"],
  [/\binvestigation signals?\b/gi, "retired product term"],
  [/\binferences?\b/gi, "retired claim state"],
];

const errors = [];

for (const document of documents) {
  const source = await readFile(document, "utf8");
  const lines = source.split("\n");
  const headings = lines
    .map((line, index) => ({ index: index + 1, match: /^(#+)\s+/.exec(line) }))
    .filter(({ match }) => match !== null);

  if (headings.filter(({ match }) => match[1].length === 1).length !== 1) {
    errors.push(`${document}: expected exactly one level-one heading`);
  }

  for (let index = 1; index < headings.length; index += 1) {
    const previousLevel = headings[index - 1].match[1].length;
    const level = headings[index].match[1].length;
    if (level > previousLevel + 1) {
      errors.push(`${document}:${headings[index].index}: skipped a heading level`);
    }
  }

  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) errors.push(`${document}:${index + 1}: trailing whitespace`);
    for (const [pattern, label] of bannedPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) errors.push(`${document}:${index + 1}: ${label}: ${line.trim()}`);
    }
  });

  const localLinks = [...source.matchAll(/\[[^\]]+\]\((?!https?:\/\/)([^)#]+\.md)(?:#[^)]+)?\)/g)];
  for (const link of localLinks) {
    const target = resolve(dirname(document), link[1]);
    try {
      await access(target);
    } catch {
      errors.push(`${document}: missing local document ${link[1]}`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Product documentation validation failed:\n- ${errors.join("\n- ")}`);
}

console.log(`Validated ${documents.length} product documents.`);
