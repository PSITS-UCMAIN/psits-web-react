const fs = require("fs");
const path = require("path");

// Default reports directory (repo-root/docs/code-review-reports)
const defaultReportsDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "docs",
  "code-review-reports"
);

function readFrontmatter(content) {
  const fmMatch = content.match(/^---([\s\S]*?)---/);
  if (!fmMatch) return "";
  return fmMatch[1];
}

function findDocId(frontmatter) {
  const m = frontmatter.match(/doc_id:\s*(\S+)/);
  return m ? m[1] : null;
}

function pad(n) {
  return String(n).padStart(3, "0");
}

function getNextId(reportsDirOverride) {
  const reportsDir = reportsDirOverride || defaultReportsDir;

  if (!fs.existsSync(reportsDir)) {
    // If directory doesn't exist, assume no reports yet and start at 1
    return `CR-${pad(1)}`;
  }

  const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"));
  let max = 0;

  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(reportsDir, f), "utf8");
      const fm = readFrontmatter(content);
      const docId = findDocId(fm);
      if (docId) {
        // Only accept three-digit sequential IDs (CR-001..CR-999).
        const m = docId.match(/CR-(\d{3})\b/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > max) max = n;
        }
      }
    } catch (err) {
      // ignore individual file errors
    }
  }

  // If no doc_id found in frontmatter, use file count as baseline
  if (max === 0) {
    max = files.length;
  }

  const next = max + 1;
  const nextId = `CR-${pad(next)}`;
  return nextId;
}

if (require.main === module) {
  console.log(getNextId());
}

module.exports = { getNextId };
