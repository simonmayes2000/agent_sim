/* Preserve configured access while recognising both actual publication domains. */
const published=['https://the-first-world-simulator.creamdaisy32.chatgpt.site','https://the-first-world-simulator.simonmayes2000.chatgpt.site'];
function allowedOrigin(origin,configured){if(!configured||configured.trim()==='*')return '*';const allowed=new Set([...published,...configured.split(',').map(v=>v.trim()).filter(Boolean)]);return allowed.has(origin)?origin:null;}
module.exports={allowedOrigin};
