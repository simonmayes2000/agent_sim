const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../dist/app.js'), 'utf8');
const conversation = source.slice(source.indexOf('async function agentConversation(){'), source.indexOf('// Model exchanges run once per day'));
function setup(agents, nearby) {
  const calls = [], button = {disabled:false};
  const context = vm.createContext({
    modelConversationPending:false,
    state:{day:4,events:[{day:1,type:'speech',who:'Adam',text:'Old opening.'},{day:4,type:'speech',who:'Adam',text:'I found water.'}]},
    living:()=>agents, peopleNear:nearby, $:()=>button,
    requestModelVoice:async(a,text)=>{calls.push({name:a.name,text});return 'I see trees.';},
  });
  vm.runInContext(conversation,context);
  return {context,calls,button};
}
test('daily conversation includes a nearby reply and current-day context',async()=>{
  const a={id:1,name:'Adam',alive:true,lastAction:'Drinking'},b={id:2,name:'Eve',alive:true,lastAction:'Exploring'};
  const {context,calls,button}=setup([a,b],person=>person===a?[b]:[a]);
  await context.agentConversation();
  assert.deepEqual(calls.map(c=>c.name),['Adam','Eve']);
  assert.match(calls[0].text,/drinking.*I found water/);
  assert.doesNotMatch(calls[0].text,/Old opening/);
  assert.match(calls[1].text,/I heard Adam say: I see trees/);
  assert.equal(button.disabled,false);
  assert.equal(context.modelConversationPending,false);
});
test('a solitary inhabitant can reflect without a nearby partner',async()=>{
  const {context,calls}=setup([{name:'Eve',lastAction:'Resting'}],()=>[]);
  await context.agentConversation();
  assert.equal(calls.length,1);
  assert.equal(calls[0].text,'I am resting.');
});
test('an empty world makes no model request',async()=>{
  const {context,calls}=setup([],()=>[]);
  await context.agentConversation();
  assert.equal(calls.length,0);
});
test('a reply is skipped when the listener moves away during the opening request',async()=>{
  const a={id:1,name:'Adam',alive:true,lastAction:'Drinking'},b={id:2,name:'Eve',alive:true};
  let nearby=true;
  const {context,calls}=setup([a,b],person=>nearby?(person===a?[b]:[a]):[]);
  context.requestModelVoice=async person=>{calls.push({name:person.name});nearby=false;return 'I see trees.';};
  await context.agentConversation();
  assert.deepEqual(calls.map(c=>c.name),['Adam']);
});
test('an ongoing exchange prevents duplicate conversations',async()=>{
  const a={name:'Adam',lastAction:'Drinking'},b={name:'Eve'};
  const {context,calls}=setup([a,b],()=>[b]);
  context.modelConversationPending=true;
  await context.agentConversation();
  assert.equal(calls.length,0);
});
