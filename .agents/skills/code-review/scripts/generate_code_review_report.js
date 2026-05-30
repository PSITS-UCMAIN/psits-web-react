const fs = require("fs");
const path = require("path");
const { getNextId } = require("./next_code_review_doc_id");

function pad(n) {
  return String(n).padStart(3, "0");
}

function usage() {
  console.log(
    'Usage: node generate_code_review_report.js --author "Name" [--summary "One-line summary"]'
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--author" && args[i + 1]) {
      out.author = args[++i];
    } else if (a === "--summary" && args[i + 1]) {
      out.summary = args[++i];
    } else if (a === "--title" && args[i + 1]) {
      out.title = args[++i];
    } else if (a === "--help") {
      out.help = true;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    usage();
    return;
  }

  const repoRoot = path.join(__dirname, "..", "..", "..", "..");
  const templatePath = path.join(
    repoRoot,
    "docs",
    "templates",
    "code-review-report-template.md"
  );
  const reportsDir = path.join(repoRoot, "docs", "code-review-reports");

  if (!fs.existsSync(templatePath)) {
    console.error("Template not found at", templatePath);
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const nextId = getNextId(reportsDir);
  const m = nextId.match(/CR-(\d+)/i);
  const numeric = m ? parseInt(m[1], 10) : null;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  const author = args.author || "[author name]";
  const title = args.title || "Code Review Report";
  const summary = args.summary || "";

  function slugify(input) {
    return String(input || "code-review-report")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  let content = template;
  content = content.replace(/doc_id:\s*.*\r?\n/, `doc_id: ${nextId}\n`);
  // Build a doc_title in the form `cr-###-slug` and use it for filename and frontmatter
  const index =
    numeric != null ? numeric : fs.readdirSync(reportsDir).length + 1;
  const idxPad = pad(index);
  const slug = slugify(args.title || "code-review-report");
  const docTitle = `cr-${idxPad}-${slug}`;
  content = content.replace(/doc_title:\s*.*\r?\n/, `doc_title: ${docTitle}\n`);
  // Ensure human-readable title in frontmatter matches provided title (or default)
  content = content.replace(/title:\s*.*\r?\n/, `title: ${title}\n`);
  content = content.replace(/created:\s*.*\r?\n/, `created: ${date}\n`);
  content = content.replace(/updated:\s*.*\r?\n/, `updated: ${date}\n`);
  content = content.replace(/author:\s*.*\r?\n/, `author: ${author}\n`);

  // Update changelog first entry if present
  content = content.replace(
    /- version: 1.0.0[\s\S]*?note: .*\r?\n/,
    `- version: 1.0.0\n  date: ${date}\n  author: ${author}\n  note: Generated from template\n`
  );

  // Insert summary near top of body
  if (summary) {
    content = content.replace(
      "# Code Review Report",
      `# Code Review Report\n\n> ${summary}`
    );
  }

  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const fileName = `${docTitle}.md`;
  const outPath = path.join(reportsDir, fileName);

  if (fs.existsSync(outPath)) {
    console.error("Output file already exists:", outPath);
    process.exit(1);
  }

  fs.writeFileSync(outPath, content, "utf8");
  console.log("Generated report:", outPath);
}

if (require.main === module) main();
