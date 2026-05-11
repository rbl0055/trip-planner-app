import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const port = Number(process.env.PORT || 5173);
const root = process.cwd();
const localEnv = loadLocalEnv();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);

  if (url.pathname === "/api/config") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || localEnv.SUPABASE_URL || "",
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || "",
    }));
    return;
  }

  const cleanPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const requested = cleanPath.replace(/^[/\\]+/, "") || "index.html";
  let filePath = join(root, requested);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(root, "index.html");
  }

  response.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Trip planner preview: http://localhost:${port}`);
});

function loadLocalEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((env, line) => {
      const index = line.indexOf("=");
      env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      return env;
    }, {});
}
