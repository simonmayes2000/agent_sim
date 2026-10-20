/* Schema guidance is separate from authoritative state validation. */
const object={type:'object',additionalProperties:true};
const array=items=>({type:'array',items});
const intention={type:'object',additionalProperties:false,required:['action','reason','goal','targetEntityIds','destination'],properties:{
 action:{type:'string'},reason:{type:'string'},goal:{type:'object',additionalProperties:false,required:['title','reason','next'],properties:{title:{type:'string'},reason:{type:'string'},next:{type:'string'}}},targetEntityIds:array({type:'string'}),destination:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['x','y'],properties:{x:{type:'integer'},y:{type:'integer'}}}]}
}};
const outcome={type:'object',additionalProperties:false,required:['summary','agents','processes'],properties:{summary:{type:'string'},expand:object,
 entities:array({type:'object',additionalProperties:true,required:['op','id'],properties:{op:{type:'string',enum:['create','update','remove']},id:{type:'string'},tile:{type:'integer'},quantity:{type:'number'}}}),
 agents:array({type:'object',additionalProperties:true,required:['id','delta','conditionReason','experience'],properties:{id:{type:'integer'},conditionReason:{type:'string'},experience:{type:'string'},delta:{type:'object',additionalProperties:false,required:['health','energy','food','water'],properties:{health:{type:'number'},energy:{type:'number'},food:{type:'number'},water:{type:'number'}}}}}),discoveries:array(object),terrain:array(object),laws:array(object),relationships:array(object),speech:array(object),newPeople:array(object),weather:object,visual:object,
 processes:array({type:'object',additionalProperties:true,required:['id','review'],properties:{id:{type:'string'},description:{type:'string'},status:{type:'string',enum:['active','resolved']},review:{type:'string'},nextReviewDay:{type:'integer'},subjects:array({type:'integer'})}})
}};
const vote={type:'object',additionalProperties:false,required:['approve','reason'],properties:{approve:{type:'boolean'},reason:{type:'string'}}};
function format(purpose){const schema=purpose==='world-intention'?intention:purpose==='world-resolution'?outcome:purpose==='council'?vote:null;return schema?{format:{type:'json_schema',name:purpose.replaceAll('-','_'),strict:purpose!=='world-resolution',schema}}:null;}
module.exports={format};
