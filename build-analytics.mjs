import { readFile, writeFile } from "node:fs/promises";

const config = JSON.parse(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG || "{}");
const scriptSrc = config.analytics?.scriptSrc ?? "/_vercel/insights/script.js";
if (!/^\/(?:[\w.-]+\/)*[\w.-]+\.js$/.test(scriptSrc)) {
  throw new Error("Vercel Web Analytics must use a same-origin script path.");
}

const analytics = `<!-- Vercel Web Analytics -->
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="${scriptSrc}"></script>
<!-- /Vercel Web Analytics -->`;

for (const page of ["index.html", "espresso.html", "aeropress.html"]) {
  const file = new URL("./dist/" + page, import.meta.url);
  const html = await readFile(file, "utf8");
  const previous = /<!-- Vercel Web Analytics -->[\s\S]*?<!-- \/Vercel Web Analytics -->\n/;
  const pageWithAnalytics = html.replace(previous, "").replace("</head>", analytics + "\n</head>");
  await writeFile(file, pageWithAnalytics);
}

console.info(`Web Analytics installed using ${config.analytics?.scriptSrc ? "the project endpoint" : "the standard endpoint"}.`);
