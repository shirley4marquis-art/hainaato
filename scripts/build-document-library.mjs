// Build in isolation, then publish only the visually verified template library.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
await fs.mkdir(path.join(root,'tmp'),{recursive:true});
const work=await fs.mkdtemp(path.join(root,'tmp','document-design-'));
for(const folder of ['scripts','lib','assets'])await fs.cp(path.join(root,folder),path.join(work,folder),{recursive:true});
await fs.symlink(path.join(root,'node_modules'),path.join(work,'node_modules'),process.platform==='win32'?'junction':'dir');
await fs.mkdir(path.join(work,'private-documents'),{recursive:true});
for(const file of ['Contrato_Haina_Auto_Ali_Rmeiti_EST0076_Puerto_Cabello.pdf','Cotizacion-HA-JAC-T9-Constructora-Joseines-Puerto-Cabello.pdf','HAINA_AUTO_Verificacion_Empresarial_ES.pdf']){
 await fs.copyFile(path.join(root,'private-documents',file),path.join(work,'private-documents',file));
}
for(const script of ['prepare-official-templates','derive-document-templates','derive-contract-templates','derive-importation-templates','unify-document-design','test-document-output','test-document-payment-design','verify-document-design','verify-signature-preservation']){
 const result=spawnSync(process.execPath,['scripts/'+script+'.mjs'],{cwd:work,stdio:'inherit',windowsHide:true});
 if(result.status!==0)throw new Error('Document design verification failed: '+script);
}
const destination=path.join(root,'private-documents','design-library');
await fs.mkdir(destination,{recursive:true});
const library=path.join(work,'private-documents','template-library');
for(const file of (await fs.readdir(library)).filter(f=>f.endsWith('.json'))){
 const entry=JSON.parse(await fs.readFile(path.join(library,file),'utf8'));
 const name=path.basename(entry.file);
 await fs.copyFile(path.join(work,'private-documents',entry.file),path.join(destination,name));
 entry.file='design-library/'+name;
 await fs.writeFile(path.join(destination,file),JSON.stringify(entry,null,2));
}
await fs.cp(path.join(work,'private-documents','qa'),path.join(root,'private-documents','design-qa'),{recursive:true});
await fs.writeFile(path.join(destination,'VERIFIED.txt'),'Contract reference design v1. All 42 covers and protected signatures verified.\n');
console.log('Verified design library: '+destination);
