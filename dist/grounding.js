/* Keep model dialogue within the words of an agent's known context. */
(function(root){
  'use strict';
  const common = new Set(('a about after again all am an and are as at be because before but by can could do feel find for from have here i if in is it let like look may me more must my need no not now of on one or our out perhaps see should so some stay still than that the their them there these they this to together too try us very want was we what when where will with would you your safe soon help careful close near enough').split(' '));
  const words = value => String(value).toLowerCase().match(/[a-z]+/g) || [];
  function accepts(line, context){
    if(typeof line!=='string'||!line.trim()||line.length>280)return false;
    const allowed=new Set([...common,...words(JSON.stringify(context))]);
    return words(line).every(word=>allowed.has(word)||word.endsWith('s')&&allowed.has(word.slice(0,-1)));
  }
  root.GroundedSpeech={accepts};
  if(typeof module!=='undefined')module.exports=root.GroundedSpeech;
})(typeof window!=='undefined'?window:globalThis);
