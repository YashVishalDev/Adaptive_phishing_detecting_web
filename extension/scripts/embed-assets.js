import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const outDir = path.resolve(__dirname, "../src/ui/assets");

const logoB64 = fs.readFileSync(path.join(publicDir, "logo.png")).toString("base64");
const yashB64 = fs.readFileSync(path.join(publicDir, "yash_vishal.jpg")).toString("base64");
const dipanshuB64 = fs.readFileSync(path.join(publicDir, "dipanshu_kumar.jpg")).toString("base64");

const content = `// Instant Zero-Latency Embedded Image Assets for TrustLens
// Pre-embedded directly in client bundle memory so presentation loads in 0ms without network roundtrips.

export const LOGO_IMAGE_DATA = "data:image/png;base64,${logoB64}";
export const YASH_IMAGE_DATA = "data:image/jpeg;base64,${yashB64}";
export const DIPANSHU_IMAGE_DATA = "data:image/jpeg;base64,${dipanshuB64}";
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "embedded-images.ts"), content, "utf8");
console.log("[SUCCESS] Generated embedded-images.ts for instant zero-latency loading.");
