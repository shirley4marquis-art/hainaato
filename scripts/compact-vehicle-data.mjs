import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const source=path.join(root,"data","vehicles");
const output=path.join(root,"data","vehicle-details.json");
const details={};
for(const file of fs.readdirSync(source)){
  if(!file.endsWith(".json"))continue;
  const vehicle=JSON.parse(fs.readFileSync(path.join(source,file),"utf8"));
  details[vehicle.slug]=vehicle;
}
fs.writeFileSync(output,JSON.stringify(details));
console.log(`Compacted ${Object.keys(details).length} vehicle details into ${path.relative(root,output)}.`);
