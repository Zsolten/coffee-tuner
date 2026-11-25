import { readFile, writeFile } from "node:fs/promises";

const config = JSON.parse(process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG || "{}");
const projectScript = config.analytics?.scriptSrc;
const site = new URL("https://everything-coffee.vercel.app");
const scriptUrl = new URL(projectScript || "/_vercel/insights/script.js", site);
if (scriptUrl.protocol !== "https:") {
  throw new Error("Vercel Web Analytics requires an HTTPS script URL.");
}
const scriptSrc = (scriptUrl.origin === site.origin
  ? scriptUrl.pathname + scriptUrl.search
  : scriptUrl.href
).replaceAll("&", "&amp;").replaceAll('"', "&quot;");

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
  if (page === "index.html") await writeFile(new URL("./dist/v60.html", import.meta.url), pageWithAnalytics);
}

console.info(`Web Analytics installed using ${config.analytics?.scriptSrc ? "the project endpoint" : "the standard endpoint"}.`);
