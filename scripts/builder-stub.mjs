/**
 * Minimal path-B builder stub for local/dev.
 * Run: node scripts/builder-stub.mjs
 * Then set BUILDER_API_URL=http://127.0.0.1:8787/build
 */

import http from "http";

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "baiolo-builder-stub" }));
    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/build")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let prompt = "Tiny demo";
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      prompt = String(body.prompt || prompt).slice(0, 80);
    } catch {
      /* ignore */
    }

    const title = prompt.split(/\s+/).slice(0, 3).join(" ") || "Stub Game";
    const payload = {
      title,
      description: "Built by the local Baiolo builder stub.",
      category: "experiment",
      files: {
        "index.html": `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title><link rel="stylesheet" href="style.css"/></head><body><main><h1>${title}</h1><p>Stub build from path B.</p><button id="go">Tap me</button><p id="out">0</p></main><script src="script.js"></script></body></html>`,
        "style.css": `body{margin:0;font-family:system-ui;background:linear-gradient(160deg,#c4b5fd,#99f6e4);min-height:100vh;display:grid;place-items:center}main{text-align:center;padding:24px}button{min-height:48px;padding:0 20px;border:0;border-radius:999px;font-weight:800;background:#7c3aed;color:#fff}`,
        "script.js": `let n=0;const out=document.getElementById("out");document.getElementById("go").onclick=()=>{n+=1;out.textContent=String(n)};`,
      },
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Baiolo builder stub on http://127.0.0.1:${PORT}/build`);
});
