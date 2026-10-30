export function eventKey(r){const c=r.match_configuration||{};return (r.id?.startsWith('import-')?'Imported / ':'')+`${c.mode||'practice'} / ${c.event||'Legacy practice'}`;}
export function standings(results){
 const policy=results[0]?.match_configuration||{ranking:'wins'},rows=new Map();
 for(const r of results){
  if(r.excluded||r.cancelled||r.winner==='Stopped'||r.games.length!==2)continue;
  for(const name of r.bots){
   if(!rows.has(name))rows.set(name,{name,played:0,wins:0,ties:0,losses:0,best:-1,points:0,total:0,scores:0});
   const row=rows.get(name);row.played++;
   if(r.winner===name){row.wins++;row.points+=Number(policy.win_points??3);}
   else if(r.winner==='Tie'){row.ties++;row.points+=Number(policy.tie_points??1);}
   else {row.losses++;row.points+=Number(policy.loss_points??0);}
   for(const g of r.games)if(g.matchmaker===name){
    const score=g.failure?(g.failure.role==='P'?1:-1):Number(g.best_score);
    row.total+=score;row.scores++;if(!g.failure)row.best=Math.max(row.best,score);
   }
  }
 }
 return [...rows.values()].sort((a,b)=>(policy.ranking==='score'?b.total/b.scores-a.total/a.scores:policy.ranking==='wins'?0:b.points-a.points)||b.wins-a.wins||b.ties-a.ties||b.best-a.best||a.name.localeCompare(b.name));
}
