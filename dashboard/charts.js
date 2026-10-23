import {$,element,fmt,short} from './helpers.js';
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!=null)e.textContent=text;return e;}
export function renderCurve(history,index,onSelect){
  const root=$('chart');root.replaceChildren();
  const x=i=>42+i*49.1, y=v=>74-Number(v)*57;
  for(const v of [-1,-.5,0,.5,1]){
    root.append(svg('line',{x1:42,x2:978,y1:y(v),y2:y(v),stroke:v===1?'#91a1b5':'#26394d','stroke-dasharray':v===1?'5 5':'none'}));
    root.append(svg('text',{x:32,y:y(v)+3,'text-anchor':'end'},v.toFixed(1)));
  }
  for(let i=0;i<20;i++){
    root.append(svg('line',{x1:x(i),x2:x(i),y1:17,y2:131,stroke:'#26394d','stroke-opacity':'.45'}));
    if(i===0||i%2===1)root.append(svg('text',{x:x(i),y:149,'text-anchor':'middle'},i+1));
  }
  root.append(svg('text',{x:510,y:163,'text-anchor':'middle'},'Proposal'));
  if(!history.length){root.append(svg('text',{x:510,y:72,'text-anchor':'middle'},'Run a pairing to see how the matchmaker learns.'));return;}
  const points=history.map((h,i)=>`${x(i)},${y(h.score)}`).join(' ');
  root.append(svg('polyline',{points,fill:'none',stroke:'#63dfb3','stroke-width':'2.3','stroke-linejoin':'round'}));
  let best=-1;
  root.append(svg('polyline',{points:history.map((h,i)=>{best=Math.max(best,Number(h.score));return `${x(i)},${y(best)}`;}).join(' '),fill:'none',stroke:'#63dfb344','stroke-width':1,'stroke-dasharray':'3 4'}));
  root.append(svg('line',{x1:x(index),x2:x(index),y1:17,y2:131,stroke:'#f48b9d','stroke-opacity':'.7','stroke-dasharray':'3 4'}));
  history.forEach((h,i)=>{
    const c=svg('circle',{cx:x(i),cy:y(h.score),r:i===index?4.5:3,fill:i===index?'#f48b9d':'#63dfb3'});root.append(c);
    const hit=svg('rect',{x:x(i)-15,y:10,width:30,height:128,fill:'transparent',tabindex:0,role:'button','aria-label':`Select proposal ${i+1}, score ${h.score}`});
    hit.style.cursor='pointer';hit.addEventListener('click',()=>onSelect(i));hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}});root.append(hit);
  });
}

export function renderAttributes(game,row,mode,selected,onSelect){
  const root=$('attributes'),n=game?.n||20;
  const weights=row?.weights||(row?.round===game?.history?.at(-1)?.round?game?.final_weights:null);
  const values=mode==='weights'?weights:row?.candidate||game?.pending_candidate;
  $('attributes-title').textContent=mode==='weights'?"P's preferences":'Candidate attributes';
  const locked=mode==='weights'&&!weights;
  $('reveal-note').hidden=!locked;root.hidden=locked;
  $('reveal-note').textContent=game?.original_weights?'This older replay does not contain preference weights for this proposal. Run a new pairing to capture every change.':'Preference values stay hidden while a game is running. After the game, replay any proposal to see the weights and each attribute’s contribution.';
  root.classList.toggle('dense',n>40);root.replaceChildren();
  const max=mode==='weights'?Math.max(.01,...(weights||[]).map(Math.abs)):1;
  if(!locked)for(let i=0;i<n;i++){
    const v=values?.[i],changed=row?.changed?.includes(i);
    const b=element('button','attribute'+(i===selected?' selected':'')+(changed?' changed':''));b.type='button';
    b.setAttribute('aria-label',`Attribute ${i+1}: ${v==null?'not proposed':v}${changed?', preference changed':''}`);
    b.append(element('span','index',String(i+1).padStart(2,'0')));
    const track=element('span','bar-track'),fill=element('span','bar-fill');
    fill.style.height=v==null?'0%':`${Math.max(1,Math.abs(v)/max*100)}%`;
    fill.style.background=mode==='weights'&&v<0?'var(--coral)':'var(--mint)';
    track.append(fill);b.append(track,element('span','value',v==null?'—':short(v)));
    b.addEventListener('click',()=>onSelect(i));root.append(b);
  }
  const legend=$('attribute-legend');legend.replaceChildren();
  const a=element('span');a.append(element('i','swatch'),document.createTextNode(mode==='weights'?'Positive weight':'Attribute value (0 → 1)'));
  const b=element('span');b.append(element('i','swatch coral'),document.createTextNode(mode==='weights'?'Negative weight':'P changed this preference'));
  legend.append(a,b,element('span','',mode==='weights'?`Scale: ±${short(max)}`:'Click an attribute to inspect'));
  const detail=$('attribute-detail');detail.replaceChildren();
  if(!row?.candidate){detail.textContent='Select an attribute to see how the score is calculated.';}
  else if(weights){const i=Math.min(selected,n-1),c=row.candidate[i],w=weights[i];detail.append(element('strong','',`Attribute ${String(i+1).padStart(2,'0')}`),document.createTextNode(`  ·  ${fmt(c)} × ${fmt(w)} = ${fmt(c*w)} contribution${row.changed?.includes(i)?'  ·  P changed this weight':''}`));}
  else{detail.textContent=`Attribute ${selected+1}  ·  value ${fmt(row.candidate[selected])}  ·  Weight and contribution revealed after the game.`;}
  $('contribution-summary').hidden=!weights||!row?.candidate;
  if(weights&&row?.candidate){let positive=0,negative=0;weights.forEach((w,i)=>{const c=w*row.candidate[i];if(c>=0)positive+=c;else negative+=c;});$('positive-sum').textContent='+'+fmt(positive);$('negative-sum').textContent=fmt(negative);const total=positive-negative||1;$('positive-meter').style.width=positive/total*100+'%';$('negative-meter').style.width=-negative/total*100+'%';}
}
