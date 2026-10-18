const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
module.exports=function(file,existing){
const source=fs.readFileSync(file,'utf8');
function section(name){const a=source.indexOf('  const '+name+' ='),b=source.indexOf('\n  const ',a+1);assert(a>=0&&b>a,name);return source.slice(a,b)}
const els=existing?.els||{}; for(const key of ['bulkCsvText','bulkSummary','bulkStatus','bulkDownloadBtn','bulkZipBtn'])els[key]={value:'',textContent:'',disabled:false};
els.bulkPreviewList={innerHTML:'',children:[],appendChild(x){this.children.push(x)}};
const scope=existing?.scope||vm.createContext({console});
Object.assign(scope,{els,MAX_CHARS:1000,BULK_PREVIEW_LIMIT:5,t:k=>k,isProPlan:()=>false});
scope.state ||= {currentLang:'en'};scope.state.bulkLoadId ??= 0;scope.document ||= {};const original=scope.document.createElement;scope.document.createElement=t=>t==='li'?{textContent:''}:original(t);
const names=['sanitizeTemplateValue','sanitizeFileNamePart',source.includes('const parseCsvRecords =')?'parseCsvRecords':'parseCsvLine','normalizeCsvRows','clearBulkPreview','setBulkDownloadButtonsDisabled','previewBulkRows','parseBulkCsv',...(source.includes('const invalidateBulkRead =')?['invalidateBulkRead']:[]),'readBulkCsvFile'];
vm.runInContext(names.map(section).join('\n')+'\nglobalThis.csvApi={parseBulkCsv,readBulkCsvFile};',scope);
return {scope,els,parse(text){els.bulkCsvText.value=text;scope.csvApi.parseBulkCsv();return JSON.parse(JSON.stringify(scope.state.bulkRows))}};
};
