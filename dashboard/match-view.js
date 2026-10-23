import {$,element,fmt,initial} from './helpers.js';

// The referee owns the outcome. Replay position never changes the pairing result.
export function renderComparison(pair,live){
  const root=$('pairing-summary');root.replaceChildren();
  const finished=!!pair.winner&&!pair.cancelled&&pair.games.length===2&&pair.winner!=='Imported replay';
  const heading=element('div','comparison-heading','MATCH RESULT');
  const row=element('div','comparison-row');
  pair.bots.forEach((name,i)=>{
    const game=pair.games.find(g=>g?.matchmaker===name);
    const block=element('div','competitor competitor-'+i);
    const badge=element('span','competitor-avatar',initial(name));
    const info=element('div');info.append(element('strong','',name),element('small','',game?`Best score · ${game.candidates_used} ${game.candidates_used===1?'proposal':'proposals'}`:'Waiting for this bot’s turn'));
    const score=element('b','comparison-score',game?.history?.length?fmt(game.best_score):'—');
    if(game?.failure)score.textContent=game.failure.role==='M'?'M failed':'P failed';
    block.classList.toggle('winner',finished&&pair.winner===name);
    block.append(badge,info,score);row.append(block);
  });
  const outcome=element('div','pairing-outcome');
  outcome.append(element('strong','',pair.cancelled||pair.winner==='Stopped'?'Pairing stopped':finished?pair.winner==='Tie'?'Pairing tied':`${pair.winner} wins`:live?'Pairing in progress':'Two roles. Two games.'));
  const failed=pair.games.some(g=>g?.failure);
  outcome.append(element('span','',failed?'A role failure takes priority over the numeric score.':'Higher best score wins.'),element('small','',pair.cancelled?'Partial pairings are excluded from standings.':'Equal score → fewer proposals.'));
  row.insertBefore(outcome,row.children[1]);root.append(heading,row);
}

const instructions={
  en:{title:'A game of hidden preferences',intro:'Two programs compete to learn what the other prefers. Each program plays both roles.',p:'Person (P)',pd:'Sets a secret weight for every attribute. Positive means preferred; negative means disliked. P may make small legal adjustments after seeing a proposal.',m:'Matchmaker (M)',md:'Receives 20 scored examples, then proposes up to 20 candidates. Each score helps M learn the hidden preferences.',flow:['M proposes a candidate','P may adjust preferences','Referee returns the score'],win:'How do you win?',wd:'Swap roles for Game 2. Compare each program’s best score as M: higher wins; if equal, fewer proposals wins; if both equal, tie. A role failure overrides numeric scores.',example:'Example: A earns 0.92 as M, B earns 0.85 as M → A wins.',privacy:'Scores are visible during play. Preference values and contribution breakdowns are revealed after the game. A score of exactly 1 against the original weights ends that game early.'},
  zh:{title:'配对猜偏好：两个程序的对战',intro:'一个程序出题，另一个程序根据评分猜偏好。每个程序都会分别扮演两种角色。',p:'Person（P）：设置偏好',pd:'为每个属性设置秘密权重。正数代表喜欢，负数代表不喜欢。看到当前候选人后，P 可以按规则小幅调整偏好。',m:'Matchmaker（M）：猜偏好',md:'先获得 20 个候选人及评分的例子，再提出最多 20 个候选人，尝试得到更高分。',flow:['M 提出候选人','P 可以调整偏好','裁判计算并返回分数'],win:'两个人怎么分胜负？',wd:'第二局交换角色。比较两人各自当 M 时取得的最高分：分数高的赢；同分时使用候选次数少的赢；两者都相同则平局。程序违规或超时按失败规则优先判定。',example:'例如：A 当 M 最高得 0.92，B 当 M 最高得 0.85 → A 获胜。',privacy:'比赛中显示评分，结束后才揭示偏好和各属性的评分贡献。某个候选人按最初偏好恰好得 1 分，该局提前结束。'}
};
function help(lang){
  const t=instructions[lang],root=$('play-guide-body');root.replaceChildren();
  root.append(element('h3','',t.title),element('p','help-intro',t.intro));
  const roles=element('div','help-roles');
  for(const [name,description]of [[t.p,t.pd],[t.m,t.md]]){const r=element('section');r.append(element('h4','',name),element('p','',description));roles.append(r);}root.append(roles);
  const flow=element('ol','help-flow');t.flow.forEach(s=>flow.append(element('li','',s)));root.append(flow,element('h4','',t.win),element('p','',t.wd),element('p','help-example',t.example),element('p','help-privacy',t.privacy));
  document.querySelectorAll('[data-help-lang]').forEach(b=>{b.classList.toggle('active',b.dataset.helpLang===lang);b.setAttribute('aria-pressed',String(b.dataset.helpLang===lang));});
}
export function setupHelp(){
  help('en');$('how-to-play').onclick=()=>$('play-guide').showModal();
  document.querySelectorAll('[data-help-lang]').forEach(b=>b.onclick=()=>help(b.dataset.helpLang));
}
