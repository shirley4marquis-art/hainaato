// Run TypeScript unit tests without changing the application's module system.
const ts = require('typescript');
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(require('node:fs').readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
require('../lib/quote-document.test.ts');
require('../lib/quote-totals.test.ts');
require('../lib/documents/documents.test.ts');
