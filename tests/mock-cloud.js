/* Loaded ONLY in browser tests. No real credentials or external database writes. */
(()=>{'use strict';
const owner='test-owner',other='test-other',start=Date.parse('2026-09-20T00:00:00Z');
const state={profiles:[{id:owner,role:'owner'}],tasks:[],academy_blocks:[],academy_sessions:[],academy_reading:[],writes:[]};
for(let i=1;i<=84;i++){
  state.tasks.push({id:`task-${i}`,user_id:owner,title:`IT · День ${String(i).padStart(2,'0')}/84: mock lesson`,scheduled_for:new Date(start+(i-1)*86400000).toISOString().slice(0,10),completed:false,completed_at:null,deleted_at:null,updated_at:new Date(start).toISOString(),sync_versions:{v:1,fields:{completion:[start,'initial']},life:{stamp:[start,'initial']}}});
}
state.tasks.push({id:'stranger',user_id:other,title:'IT · День 01/84: another user',completed:false});
window.__academyMock=state;
function query(table){
  let kind='select',payload,filters=[],order=null,limit=null;
  const api={
    select(){return api;},insert(value){kind='insert';payload=value;return api;},update(value){kind='update';payload=value;return api;},delete(){kind='delete';return api;},
    eq(key,value){filters.push(row=>row[key]===value);return api;},
    like(key,pattern){const regex=new RegExp('^'+pattern.split('%').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');filters.push(row=>regex.test(String(row[key]||'')));return api;},
    is(key,value){filters.push(row=>value===null?row[key]==null:row[key]===value);return api;},
    order(key,{ascending=false}={}){order={key,ascending};return api;},
    limit(n){limit=n;return api;},
    single(){return Promise.resolve(run(true,false));},maybeSingle(){return Promise.resolve(run(false,true));},
    then(resolve,reject){return Promise.resolve(run(false,false)).then(resolve,reject);}
  };
  function run(single=false,maybe=false){
    const source=state[table];if(!source)return {data:null,error:{message:'Unknown mock table'}};
    const match=row=>filters.every(check=>check(row));
    let rows=source.filter(match);
    if(kind==='insert'){
      const inserted={...payload,id:payload.id||crypto.randomUUID(),updated_at:payload.updated_at||new Date().toISOString()};
      source.push(inserted);state.writes.push({table,kind,id:inserted.id});rows=[inserted];
    }else if(kind==='update'){
      rows.forEach(row=>Object.assign(row,payload));
      rows.forEach(row=>state.writes.push({table,kind,id:row.id,fields:Object.keys(payload)}));
    }else if(kind==='delete'){
      state[table]=source.filter(row=>!match(row));
    }
    if(order)rows.sort((a,b)=>{const cmp=String(a[order.key]||'').localeCompare(String(b[order.key]||''));return order.ascending?cmp:-cmp;});
    if(limit!==null)rows=rows.slice(0,limit);
    if(single)return rows.length===1?{data:{...rows[0]},error:null}:{data:null,error:{code:'PGRST116',message:'Expected single row'}};
    if(maybe)return {data:rows[0]?{...rows[0]}:null,error:null};
    return {data:rows.map(row=>({...row})),error:null};
  }
  return api;
}
const auth={getUser:async()=>({data:{user:{id:owner}},error:null}),signOut:async()=>({error:null}),signInWithPassword:async()=>({data:{user:{id:owner}},error:null})};
window.supabase={createClient:()=>({auth,from:query})};
class TestWorker{
  constructor(){setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),5);}
  postMessage(data){setTimeout(()=>this.onmessage?.({data:{type:'result',id:data.id,ok:true,output:'3'}}),5);}
  terminate(){}
}
window.Worker=TestWorker;
})();
