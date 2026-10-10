import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const zipPath = path.resolve(__dirname, "../trustlens-v1.0.0.zip");

console.log("[TrustLens] Packaging unpacked extension into production ZIP bundle...");

if (!fs.existsSync(distDir)) {
  console.error("Error: dist/ does not exist. Run 'npm run build' first.");
  process.exit(1);
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  // Use PowerShell Compress-Archive on Windows
  if (process.platform === "win32") {
    execSync(`powershell.exe -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`);
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" ./*`);
  }
  const stats = fs.statSync(zipPath);
  console.log(`[SUCCESS] Created ${zipPath} (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error("Packaging failed:", err);
  process.exit(1);
}
