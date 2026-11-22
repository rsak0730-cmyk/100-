/** Content-Length can describe compressed bytes; never use it as decoded size. */
export function downloadLabel(loaded: number, expectedBytes?: number): string {
  if (!expectedBytes || expectedBytes <= 0) return `DOWNLOADING MODEL · ${(loaded / 1048576).toFixed(1)} MB`;
  const percent = Math.min(99, Math.max(0, Math.floor(loaded / expectedBytes * 100)));
  return `DOWNLOADING MODEL · ${percent}%`;
}
export async function downloadModel(url: string, signal: AbortSignal, progress: (label: string) => void, expectedBytes?: number): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Model request failed: HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) return response.arrayBuffer();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    chunks.push(value);
    progress(downloadLabel(length, expectedBytes));
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (length < 12 || new DataView(bytes.buffer).getUint32(0, true) !== 0x46546c67) throw new Error('Response is not a GLB model');
  return bytes.buffer;
}
