/* Schema guidance is separate from authoritative state validation. */
const object={type:'object',additionalProperties:true};
const array=items=>({type:'array',items});
const intention={type:'object',additionalProperties:true,required:['action','execution','speech'],properties:{
 execution:{type:'object',additionalProperties:false,required:['kind'],properties:{kind:{type:'string',enum:['move','rest','inspect','consume','wait','attempt']},entity:{type:'string'},amount:{type:'number'}}},speech:{anyOf:[{type:'string'},{type:'null'}]},action:{type:'string'},reason:{type:'string'},goal:{type:'object',additionalProperties:false,required:['title','reason','next'],properties:{title:{type:'string'},reason:{type:'string'},next:{type:'string'}}},targetEntityIds:array({type:'string'}),destination:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'integer'},y:{type:'integer'}}}]}
}};
// Extensible world changes stay JSON data. The stable process envelope is fully strict.
const outcome={type:'object',additionalProperties:false,required:['summary','processes','changesJson'],properties:{
 summary:{type:'string'},
 processes:array(require('../dist/process-clock.js').schema),
 changesJson:{type:'string',description:'A JSON object containing ONLY actual world changes using the supplied outcome contract. Omit unused fields. Do not include summary or processes here. Use {} when no additional changes occur.'}
}};
const speech={type:'object',additionalProperties:false,required:['text'],properties:{text:{type:'string'}}};
const scopedVote={type:'object',additionalProperties:false,required:['approve','reason','scope','target','evidence'],properties:{approve:{type:'boolean'},reason:{type:'string'},scope:{type:'string',enum:['none','proposal','engine','narrative']},target:{type:'string'},evidence:{type:'string'}}};
const vote={type:'object',additionalProperties:false,required:['approve','reason'],properties:{approve:{type:'boolean'},reason:{type:'string'}}};
function format(purpose,view){let schema=purpose==='world-intention'?intention:purpose==='world-resolution'?outcome:purpose==='council-scoped'?scopedVote:purpose==='council'?vote:purpose==='speech'?speech:null;if(purpose==='world-intention'&&view){schema=JSON.parse(JSON.stringify(schema));const ids=view.entities.map(e=>e.id);schema.properties.targetEntityIds=ids.length?{type:'array',maxItems:100,items:{type:'string',enum:ids}}:{type:'array',maxItems:0,items:{type:'string'}};}return schema?{format:{type:'json_schema',name:purpose.replaceAll('-','_'),strict:['world-resolution','council','council-scoped','speech'].includes(purpose),schema}}:null;}
function unpackOutcome(raw,corrections=[]){
 const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Outcome must be a JSON object.');
 if(!Object.hasOwn(value,'changesJson'))return raw; // Previously recorded plain outcomes remain compatible.
 if(typeof value.summary!=='string'||!Array.isArray(value.processes)||typeof value.changesJson!=='string'||Object.keys(value).some(k=>!['summary','processes','changesJson'].includes(k)))throw Error('Malformed structured outcome envelope.');
 const empty=!value.changesJson.trim();if(empty)corrections.push('An empty change payload was treated as an empty object; no changes were inferred.');const changes=empty?{}:JSON.parse(value.changesJson);if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('changesJson must be an object of world changes.');
 for(const key of ['summary','processes'])if(Object.hasOwn(changes,key)){if(JSON.stringify(changes[key])!==JSON.stringify(value[key]))throw Error('changesJson conflicts with the envelope '+key+'.');delete changes[key];corrections.push('An identical duplicate '+key+' was removed from the change payload.');}
 return JSON.stringify({...changes,summary:value.summary,processes:value.processes});
}
module.exports={format,unpackOutcome};
