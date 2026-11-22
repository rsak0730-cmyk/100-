// Lossless buffer compression only: deliberately no quantize, simplify or texture transforms.
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions([EXTMeshoptCompression]).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const source='public/models/m4.glb';
const original=await io.read(source);
original.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
// The option above disables lossy filters; no quantization transform is invoked.
const bytes=await io.writeBinary(original);
const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
const filename=`m4-lossless-${hash}.glb`;
writeFileSync(`public/models/${filename}`,bytes);
const decoded=await io.read(`public/models/${filename}`);
const reference=await io.read(source);
const a=reference.getRoot(),b=decoded.getRoot();
assert.equal(b.listMeshes().length,a.listMeshes().length);
assert.equal(b.listNodes().length,a.listNodes().length);
assert.equal(b.listMaterials().length,a.listMaterials().length);
// Compare primitive data by semantic, rather than accessor order changed by serialization.
let values=0;
for(let i=0;i<a.listMeshes().length;i++){
 const pa=a.listMeshes()[i].listPrimitives(),pb=b.listMeshes()[i].listPrimitives();
 assert.equal(pb.length,pa.length);
 for(let j=0;j<pa.length;j++){
  for(const semantic of pa[j].listSemantics()){
   const x=pa[j].getAttribute(semantic),y=pb[j].getAttribute(semantic);
   assert.equal(y.getComponentType(),x.getComponentType());
   assert.deepEqual(y.getArray(),x.getArray(),`Mesh ${i}: ${semantic} changed`); values+=x.getArray().length;
  }
  const x=pa[j].getIndices()?.getArray(),y=pb[j].getIndices()?.getArray();
  // Meshopt triangle mode may cyclically rotate triangle vertices, preserving winding and geometry.
  assert.equal(y?.length,x?.length);
  if(x)for(let k=0;k<x.length;k+=3){const u=[x[k],x[k+1],x[k+2]],v=[y[k],y[k+1],y[k+2]];assert.ok([0,1,2].some(r=>u.every((n,t)=>n===v[(t+r)%3])),'Triangle geometry changed');}
 }
}
assert.equal(b.listTextures().length,a.listTextures().length);
for(let i=0;i<a.listTextures().length;i++)assert.deepEqual(b.listTextures()[i].getImage(),a.listTextures()[i].getImage(),'Texture bytes changed');
// Compare material definitions, transforms, mesh assignments and non-buffer glTF data.
const j1=await io.writeJSON(reference),j2=await io.writeJSON(decoded);
assert.deepEqual(j2.json.materials,j1.json.materials,'Materials changed');
assert.deepEqual(j2.json.nodes,j1.json.nodes,'Node transforms changed');
const report={sourceBytes:statSync(source).size,optimizedBytes:bytes.length,reductionPercent:+((1-bytes.length/statSync(source).size)*100).toFixed(1),filename,attributeValuesVerified:values,textureBytesIdentical:true,materialsIdentical:true,nodeTransformsIdentical:true,triangleGeometryIdentical:true,method:'EXT_meshopt_compression without quantization or filters; no texture changes'};
writeFileSync('docs/showroom/optimization.json',JSON.stringify(report,null,2)+'\n');
writeFileSync('src/showroom/model-asset.json',JSON.stringify({path:`models/${filename}`,bytes:bytes.length},null,2)+'\n');
const manifest=JSON.parse(readFileSync('public/models/manifest.json','utf8'));manifest.vehicles[0].glb=`models/${filename}`;manifest.vehicles[0].modifications+='; lossless Meshopt buffer encoding, verified exact attributes, texture bytes, materials and node transforms';writeFileSync('public/models/manifest.json',JSON.stringify(manifest,null,2)+'\n');
let html=readFileSync('app/index.html','utf8');html=html.replace(/models\/m4-lossless-[a-f0-9]+\.glb/g,`models/${filename}`);writeFileSync('app/index.html',html);
console.log(report);
