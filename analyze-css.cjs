const fs = require("fs");

// Accurate used-set: scan ALL string literals in tsx/ts/cjs for class-like tokens.
const used = new Set();
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|cjs)$/.test(e.name)) {
      const t = fs.readFileSync(p, "utf8");
      // capture any lowercase dashed token inside a string literal / class context
      const re = /([`"'])([^`"']*)\1/g;
      let m;
      while ((m = re.exec(t)) !== null) {
        const inner = m[2];
        const tok = inner.match(/[a-z][a-z0-9-]{2,}/g);
        if (tok) for (const c of tok) used.add(c);
      }
    }
  }
}
walk("src");

const css = fs.readFileSync("src/app/styles.css", "utf8");
const lines = css.split("\n");
const definedByLine = [];
lines.forEach((l, i) => {
  for (const m of l.matchAll(/\.([a-zA-Z][\w-]*)/g)) definedByLine.push({ line: i + 1, cls: m[1] });
});
const unusedDefs = definedByLine.filter((d) => !used.has(d.cls));
console.log("total class defs:", definedByLine.length, "unused lines:", unusedDefs.length);

unusedDefs.sort((a, b) => a.line - b.line);
let groups = [];
let cur = [];
for (const d of unusedDefs) {
  if (cur.length && d.line - cur[cur.length - 1].line <= 3) cur.push(d);
  else { if (cur.length) groups.push(cur); cur = [d]; }
}
if (cur.length) groups.push(cur);
groups.sort((a, b) => b.length - a.length);
console.log("\nBiggest unused blocks (by class-ref count):");
for (const g of groups.slice(0, 20)) {
  const names = [...new Set(g.map((x) => x.cls))];
  console.log("L" + g[0].line + "-" + g[g.length - 1].line + " (" + g.length + " refs, " + names.length + " cls): " + names.slice(0, 7).join(", "));
}
