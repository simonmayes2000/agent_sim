/* Schema guidance is separate from authoritative state validation. */
const object={type:'object',additionalProperties:true};
const array=items=>({type:'array',items});
const intention={type:'object',additionalProperties:true,required:['action'],properties:{
 action:{type:'string'},reason:{type:'string'},goal:{type:'object',additionalProperties:false,required:['title','reason','next'],properties:{title:{type:'string'},reason:{type:'string'},next:{type:'string'}}},targetEntityIds:array({type:'string'}),destination:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'integer'},y:{type:'integer'}}}]}
}};
// Extensible world changes stay JSON data. The stable process envelope is fully strict.
const outcome={type:'object',additionalProperties:false,required:['summary','processes','changesJson'],properties:{
 summary:{type:'string'},
 processes:array(require('../dist/process-clock.js').schema),
 changesJson:{type:'string',description:'A JSON object containing ONLY actual world changes using the supplied outcome contract. Omit unused fields. Do not include summary or processes here. Use {} when no additional changes occur.'}
}};
const speech={type:'object',additionalProperties:false,required:['text'],properties:{text:{type:'string'}}};
const vote={type:'object',additionalProperties:false,required:['approve','reason'],properties:{approve:{type:'boolean'},reason:{type:'string'}}};
function format(purpose,view){let schema=purpose==='world-intention'?intention:purpose==='world-resolution'?outcome:purpose==='council'?vote:purpose==='speech'?speech:null;if(purpose==='world-intention'&&view){schema=JSON.parse(JSON.stringify(schema));const ids=view.entities.map(e=>e.id);schema.properties.targetEntityIds=ids.length?{type:'array',maxItems:100,items:{type:'string',enum:ids}}:{type:'array',maxItems:0,items:{type:'string'}};}return schema?{format:{type:'json_schema',name:purpose.replaceAll('-','_'),strict:['world-resolution','council','speech'].includes(purpose),schema}}:null;}
function unpackOutcome(raw){
 const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Outcome must be a JSON object.');
 if(!Object.hasOwn(value,'changesJson'))return raw; // Previously recorded plain outcomes remain compatible.
 if(typeof value.summary!=='string'||!Array.isArray(value.processes)||typeof value.changesJson!=='string'||Object.keys(value).some(k=>!['summary','processes','changesJson'].includes(k)))throw Error('Malformed structured outcome envelope.');
 const changes=JSON.parse(value.changesJson);if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.hasOwn(changes,'summary')||Object.hasOwn(changes,'processes'))throw Error('changesJson must be an object of world changes, without summary or processes.');
 return JSON.stringify({...changes,summary:value.summary,processes:value.processes});
}
module.exports={format,unpackOutcome};
