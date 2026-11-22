/** Content-Length can describe compressed bytes; never use it as decoded size. */
export function downloadLabel(loaded: number, expectedBytes?: number): string {
  if (!expectedBytes || expectedBytes <= 0) return `DOWNLOADING MODEL · ${(loaded / 1048576).toFixed(1)} MB`;
  const percent = Math.min(99, Math.max(0, Math.floor(loaded / expectedBytes * 100)));
  return `DOWNLOADING MODEL · ${percent}%`;
}
const CACHE_NAME = 'm-atelier-models-v1';
function validate(bytes: ArrayBuffer) {
  const data=new DataView(bytes);
  if (bytes.byteLength < 12 || data.getUint32(0,true)!==0x46546c67 || data.getUint32(4,true)!==2 || data.getUint32(8,true)!==bytes.byteLength) throw new Error('Response is not a complete GLB model');
  return bytes;
}
export async function downloadModel(url: string, signal: AbortSignal, progress: (label: string) => void, expectedBytes?: number): Promise<ArrayBuffer> {
  // Hash-named assets make persistent reuse safe. Storage is optional, never required.
  let cache: Cache | undefined;
  if (/m4-lossless-[a-f0-9]+\.glb$/.test(url)) {
    try {
      cache=await globalThis.caches?.open(CACHE_NAME);
      const stored=await cache?.match(url);
      if(stored) {
        const bytes=validate(await stored.arrayBuffer());
        if(signal.aborted)throw new DOMException('Aborted','AbortError');
        progress('MODEL CACHED · PREPARING 3D MODEL…');
        return bytes;
      }
    } catch { /* Private browsing, quota or corrupt cache: use network instead. */ }
  }
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Model request failed: HTTP ${response.status}`);
  const reader = response.body?.getReader();
  let bytes: ArrayBuffer;
  if (!reader) bytes=validate(await response.arrayBuffer());
  else {
    const chunks: Uint8Array[] = [];
    let length = 0, lastLabel='';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      chunks.push(value);
      const label=downloadLabel(length, expectedBytes);
      if(label!==lastLabel){progress(label);lastLabel=label;}
    }
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
    bytes=validate(output.buffer);
  }
  if (cache && !signal.aborted) {
    // Do not block rendering on disk writes. Keep a single version of this model.
    const store=cache;
    void store.put(url,new Response(bytes,{headers:{'Content-Type':'model/gltf-binary'}})).then(async()=>{
      for(const key of await store.keys())if(new URL(key.url).href!==new URL(url,location.href).href)await store.delete(key);
    }).catch(()=>{});
  }
  return bytes;
}
