export async function readRequestBytes(request: Request, maxBytes: number): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error("Request body is too large.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
export async function readJsonObject(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const body: unknown = JSON.parse((await readRequestBytes(request, maxBytes)).toString("utf8"));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Expected an object.");
  return body as Record<string, unknown>;
}
