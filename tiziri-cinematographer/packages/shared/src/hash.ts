import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/** SHA-256 of a string/buffer, hex. Used for content-addressed caching and the fidelity manifest. */
export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** SHA-256 of a file streamed from disk — for hashing immutable source photographs. */
export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash("sha256");
    const s = createReadStream(path);
    s.on("error", reject);
    s.on("data", (chunk) => h.update(chunk));
    s.on("end", () => resolve(h.digest("hex")));
  });
}
