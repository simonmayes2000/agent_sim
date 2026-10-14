/* Keep model dialogue within the words of an agent's known context. */
(function(root){
  'use strict';
  const common = new Set(('a about after again all am an and are as at be because before but by can careful close could curious d different do enough explore feel find for from go have help here hungry i if in is it know learn let like listen ll look m may me more move must my near need no not now of on one or our out perhaps re remember s safe see share should so some soon speak stay still t talk than that the their them there these they this thirsty tired to together too try us ve very wait walk want was we what when where will with wonder would you your').split(' '));
  const words = value => String(value).toLowerCase().match(/[a-z]+/g) || [];
  function accepts(line, context){
    if(typeof line!=='string'||!line.trim()||line.length>280)return false;
    const allowed=new Set([...common,...words(JSON.stringify(context))]);
    return words(line).every(word=>allowed.has(word)||word.endsWith('s')&&allowed.has(word.slice(0,-1)));
  }
  root.GroundedSpeech={accepts};
  if(typeof module!=='undefined')module.exports=root.GroundedSpeech;
})(typeof window!=='undefined'?window:globalThis);
