/* One active request per lane, with latest pending evidence and world cancellation. */
(function(root){
  'use strict';
  function create(onChange=()=>{}){
    let generation=0,controller=new AbortController(),lanes=new Map();
    function scope(){const id=generation,signal=controller.signal;return {signal,current:()=>generation===id&&!signal.aborted};}
    function status(){return [...lanes].filter(([,v])=>v.active||v.pending).map(([kind,v])=>({kind,pending:!!v.pending}));}
    function schedule(kind,work){
      let lane=lanes.get(kind);if(!lane){lane={active:false,pending:null};lanes.set(kind,lane);}
      lane.pending=work;onChange(status());if(lane.active)return;
      const token=scope();lane.active=true;
      void (async()=>{try{while(token.current()&&lane.pending){const task=lane.pending;lane.pending=null;onChange(status());try{await task(token);}catch(error){if(token.current())console.warn(kind+' background task failed:',error.message);}}}finally{if(token.current()){lane.active=false;onChange(status());}}})();
    }
    function reset(){generation++;controller.abort();controller=new AbortController();lanes=new Map();onChange(status());}
    return {scope,schedule,reset,status};
  }
  root.BackgroundJobs={create};
  if(typeof module!=='undefined')module.exports=root.BackgroundJobs;
})(typeof window!=='undefined'?window:globalThis);
