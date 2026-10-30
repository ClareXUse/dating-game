import {emphasize} from './motion.js?v=grouped-1';
import {$,element,fmt,initial} from './helpers.js';

// The referee owns the outcome. Replay position never changes the pairing result.
export function renderComparison(pair,live){
  const root=$('pairing-summary'),oldOutcome=root.querySelector('.pairing-outcome strong')?.textContent;
  const oldScores=[...root.querySelectorAll('.comparison-score')].map(e=>e.textContent);root.replaceChildren();
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
    block.append(badge,info,score);row.append(block);if(oldScores[i]!==score.textContent)emphasize(score);
  });
  const outcome=element('div','pairing-outcome');
  outcome.append(element('strong','',pair.cancelled||pair.winner==='Stopped'?'Pairing stopped':finished?pair.winner==='Tie'?'Pairing tied':`${pair.winner} wins`:live?'Pairing in progress':'Two roles. Two games.'));
  const failed=pair.games.some(g=>g?.failure);
  outcome.append(element('span','',failed?'A role failure takes priority over the numeric score.':'Higher best score wins.'),element('small','',pair.cancelled?'Partial pairings are excluded from standings.':'Equal score → fewer proposals.'));
  row.insertBefore(outcome,row.children[1]);root.append(heading,row);if(oldOutcome!==outcome.firstChild.textContent)emphasize(outcome);
}

const instructions={
  en:{title:'A game of hidden preferences',intro:'Two programs compete to learn what the other prefers. Each program plays both roles.',p:'Person (P)',pd:'Sets a secret weight for every attribute. Positive means preferred; negative means disliked. P may make small legal adjustments after seeing a proposal.',m:'Matchmaker (M)',md:'Receives 20 scored examples, then proposes up to 20 candidates. Each score helps M learn the hidden preferences.',flow:['M proposes a candidate','P may adjust preferences','Referee returns the score'],win:'How do you win?',wd:'Swap roles for Game 2. Compare each program’s best score as M: higher wins; if equal, fewer proposals wins; if both equal, tie. A role failure overrides numeric scores.',example:'Example: A earns 0.92 as M, B earns 0.85 as M → A wins.',privacy:'Scores are visible during play. Preference values and contribution breakdowns are revealed after the game. A score of exactly 1 against the original weights ends that game early.'},
};
function help(lang){
  const t=instructions[lang],root=$('play-guide-body');root.replaceChildren();
  root.append(element('h3','',t.title),element('p','help-intro',t.intro));
  const roles=element('div','help-roles');
  for(const [name,description]of [[t.p,t.pd],[t.m,t.md]]){const r=element('section');r.append(element('h4','',name),element('p','',description));roles.append(r);}root.append(roles);
  const flow=element('ol','help-flow');t.flow.forEach(s=>flow.append(element('li','',s)));root.append(flow,element('h4','',t.win),element('p','',t.wd),element('p','help-example',t.example),element('p','help-privacy',t.privacy));

}
export function setupHelp(){
  help('en');$('how-to-play').onclick=()=>$('play-guide').showModal();

}
