/* Keep model dialogue within the words of an agent's known context. */
(function(root){
  'use strict';
  const common = new Set(('a about after again all am an and are as at be because before but by can careful carry close could curious d different do drink eat enough explore feel find for from gather go have help here hungry i if in is it know learn let like listen ll look m may me more move must my near need no not now observe of on one or our out perhaps protect re remember s safe search see share should so some soon speak stay still survive t talk than that the their them there these they this thirsty tired to together too try us ve very wait walk want was we what when where will with wonder would you your').split(' '));
  const words = value => String(value).toLowerCase().match(/[a-z]+/g) || [];
  function accepts(line, context){
    if(typeof line!=='string'||!line.trim()||line.length>280)return false;
    const allowed=new Set([...common,...words(JSON.stringify(context))]);
    const unknown=words(line).filter(word=>!allowed.has(word)&&!(word.endsWith('s')&&allowed.has(word.slice(0,-1))));
    return unknown.length<=1&&!unknown.some(word=>['map','compass','spring','tower','machine','village'].includes(word));
  }
  root.GroundedSpeech={accepts};
  if(typeof module!=='undefined')module.exports=root.GroundedSpeech;
})(typeof window!=='undefined'?window:globalThis);
