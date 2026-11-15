// Gives the running system a temporary secure https address (free Cloudflare quick tunnel), so a phone
// can open it with Bluetooth laser, camera measuring and photos working (browsers only allow those over https).
// The address is saved to data/phone-url.txt; measurement pages show it as a QR code.
// Usage: node scripts/phone-link.mjs [port]   (started by "Start HOGR with phone link.bat")
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const port = process.argv[2] || process.env.PORT || "3000";
const root = process.cwd();
const dataDir = process.env.HOGR_DATA_DIR || path.join(root, "data");
const urlFile = path.join(dataDir, "phone-url.txt");
const exe = path.join(root, "tools", process.platform === "win32" ? "cloudflared.exe" : "cloudflared");

if (!fs.existsSync(exe)) {
  console.error(`\n  Missing ${exe}\n  Download it from https://github.com/cloudflare/cloudflared/releases/latest\n`);
  process.exit(1);
}
fs.mkdirSync(dataDir, { recursive: true });
fs.rmSync(urlFile, { force: true });

const child = spawn(exe, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`], { stdio: ["ignore", "pipe", "pipe"] });
let found = false;

const onData = async (buf) => {
  const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (!m || found) return;
  found = true;
  const url = m[0];
  fs.writeFileSync(urlFile, url);
  const admin = `${url}/admin`;
  console.log("\n  Phone link is ready:\n");
  console.log(`  ${admin}\n`);
  console.log(await QRCode.toString(admin, { type: "terminal", small: true }));
  console.log("  Scan this with the phone camera, or use the QR code on any measurement sheet.");
  console.log("  The link stops working when you close this window.\n");
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);

const cleanup = () => {
  fs.rmSync(urlFile, { force: true });
  child.kill();
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
child.on("exit", (code) => {
  fs.rmSync(urlFile, { force: true });
  if (!found) console.error(`\n  Could not create the phone link (cloudflared exited with ${code}). Check the internet connection.\n`);
  process.exit(code ?? 0);
});
