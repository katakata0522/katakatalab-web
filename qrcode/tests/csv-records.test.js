const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const harness=require('./helpers/csv-harness.cjs'),file=process.env.CSV_SOURCE||path.join(__dirname,'../script.js');
function h(){return harness(file)}
const cases=[
['quoted LF','value,name\n"一行目\n二行目",greeting',[{value:'一行目\n二行目',name:'greeting'}]],
['quoted CRLF','value,name\r\n"一行目\r\n二行目",greeting\r\n',[{value:'一行目\n二行目',name:'greeting'}]],
['quoted blank line','value,name\n"一行目\n\n二行目",greeting',[{value:'一行目\n\n二行目',name:'greeting'}]],
['escaped quotes commas BOM','\uFEFFvalue,name\r\n"日本語, ""😀""",name',[{value:'日本語, "😀"',name:'name'}]],
['bare CR records','value,name\rhello,one\rworld,two',[{value:'hello',name:'one'},{value:'world',name:'two'}]],
['empty cells preserve numbering',',\nhello,\n"",\nworld,',[{value:'hello',name:'bulk_2'},{value:'world',name:'bulk_4'}]],
['blank lines ignored','\n \nhello,first\n\nworld,two\n',[{value:'hello',name:'first'},{value:'world',name:'two'}]],
['aliases reorder extra cols','filename,ignored,URL\nx,z,https://example.com/a?x=1&y=2',[{value:'https://example.com/a?x=1&y=2',name:'x'}]],
['no header extra cols','hello,file,ignored',[{value:'hello',name:'file'}]],
['whitespace compatibility',' value , name \n  " hello "  ,  " filename "  ',[{value:'hello',name:'filename'}]],
['name sanitization','value,name\nhello,"../../a:b*c?d<>| /e"',[{value:'hello',name:'..-..-a-b-c-d-e'}]],
['trailing empty field','hello,',[{value:'hello',name:'bulk_1'}]],
['empty input',' \r\n ',[]]
];
for(const [label,input,expected] of cases)test(label,()=>assert.deepEqual(h().parse(input),expected));
for(const input of ['value,name\n"unclosed,name','good,name\n"unclosed','value,name\n"a"x,name','ab"cd",name','"a" "b",name'])test('invalid quote rejects entire CSV '+JSON.stringify(input),()=>{const x=h();x.parse('old,name');assert.deepEqual(x.parse(input),[]);assert.equal(x.els.bulkSummary.textContent,'bulk.invalidCsv');assert(x.els.bulkDownloadBtn.disabled);assert(x.els.bulkZipBtn.disabled);assert.equal(x.els.bulkPreviewList.innerHTML,'');assert.equal(x.els.bulkStatus.textContent,'')});
test('1000 character accepted and 1001 rejected',()=>{const x=h();assert.deepEqual(x.parse('a'.repeat(1000)+',ok\n'+'b'.repeat(1001)+',bad'),[{value:'a'.repeat(1000),name:'ok'}])});
test('existing unlimited row count, 5 row preview',()=>{const x=h();assert.equal(x.parse(Array.from({length:10000},(_,i)=>'entry'+i+',n'+i).join('\n')).length,10000);assert.equal(x.els.bulkPreviewList.children.length,6)});
test('existing no CSV total size limit, discard overlong values',()=>{const x=h();assert.equal(x.parse('x'.repeat(2*1024*1024)+',huge\nhello,ok').length,1)});
test('file.text entry is parsed identically',async()=>{const x=h();await x.scope.csvApi.readBulkCsvFile({text:async()=>'value,name\n"一行目\n二行目",greeting'});assert.equal(x.scope.state.bulkRows.length,1);assert.equal(x.scope.state.bulkRows[0].value,'一行目\n二行目')});
test('deterministic quoted-record corpus preserves field boundaries',()=>{
const x=h(),atoms=['あ','😀',',','"','\n','\r\n',' ','\t','x'];let seed=17;
function next(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
for(let batch=0;batch<100;batch++){
const rows=Array.from({length:10},(_,i)=>({value:'start'+Array.from({length:12},()=>atoms[next()%atoms.length]).join('')+'end',name:'row_'+i}));
const input='value,name,extra\r\n'+rows.map(r=>'"'+r.value.replace(/"/g,'""')+'",'+r.name+',ignored').join('\r\n');
assert.deepEqual(x.parse(input),rows.map(r=>({...r,value:r.value.replace(/\r/g,'').trim()})));
}
});
