import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadLabel, downloadModel } from '../src/showroom/download';
afterEach(()=>vi.unstubAllGlobals());
describe('model download',()=>{
 it('never exceeds 99% before model preparation, including wrong sizes',()=>{
  expect(downloadLabel(23000000,22739084)).toContain('99%');
  expect(downloadLabel(1000,10)).toContain('99%');
  expect(downloadLabel(0,100)).toContain('0%');
 });
 it('shows bytes if decoded length is unknown',()=>expect(downloadLabel(1048576)).toContain('1.0 MB'));
 it('rejects HTTP errors',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:404})));
  await expect(downloadModel('/model',new AbortController().signal,()=>{})).rejects.toThrow('404');
 });
 it('ignores compressed Content-Length and reads the complete GLB',async()=>{
  const bytes=new Uint8Array(100);new DataView(bytes.buffer).setUint32(0,0x46546c67,true);new DataView(bytes.buffer).setUint32(4,2,true);new DataView(bytes.buffer).setUint32(8,100,true);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes,{headers:{'Content-Length':'10'}})));
  const progress=vi.fn();const result=await downloadModel('/model',new AbortController().signal,progress,100);
  expect(result.byteLength).toBe(100);expect(progress).toHaveBeenLastCalledWith('DOWNLOADING MODEL · 99%');
 });
 it('rejects HTML fallback responses rather than silently parsing',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('<html>not model</html>')));
  await expect(downloadModel('/model',new AbortController().signal,()=>{})).rejects.toThrow('not a complete GLB');
 });
});
describe('optional browser cache',()=>{
 function glb(){const bytes=new ArrayBuffer(12),view=new DataView(bytes);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,12,true);return bytes;}
 it('loads a hash-versioned model from cache without downloading',async()=>{
  const network=vi.fn();vi.stubGlobal('fetch',network);
  vi.stubGlobal('caches',{open:vi.fn(async()=>({match:async()=>new Response(glb())}))});
  const progress=vi.fn();expect((await downloadModel('/models/m4-lossless-abcdef.glb',new AbortController().signal,progress,12)).byteLength).toBe(12);
  expect(network).not.toHaveBeenCalled();expect(progress).toHaveBeenCalledWith('MODEL CACHED · PREPARING 3D MODEL…');
 });
 it('still loads when private browsing prevents caching',async()=>{
  vi.stubGlobal('caches',{open:vi.fn(async()=>{throw Error('Storage denied')})});
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(glb())));
  expect((await downloadModel('/models/m4-lossless-abcdef.glb',new AbortController().signal,()=>{})).byteLength).toBe(12);
 });
 it('does not trust a corrupt cached file',async()=>{
  vi.stubGlobal('caches',{open:vi.fn(async()=>({match:async()=>new Response('not a GLB'),put:async()=>{},keys:async()=>[]}))});
  const network=vi.fn(async()=>new Response(glb()));vi.stubGlobal('fetch',network);
  await downloadModel('/models/m4-lossless-abcdef.glb',new AbortController().signal,()=>{});
  expect(network).toHaveBeenCalledOnce();
 });
});
