import {$,element,fmt,short} from './helpers.js';
let curveArgs,curveMotionKey='';
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!=null)e.textContent=text;return e;}
export function renderCurve(history,index,onSelect){
  curveArgs=[history,index,onSelect];const root=$('chart');root.replaceChildren();
  const width=Math.max(320,root.clientWidth||1000),height=Math.max(100,root.clientHeight||175),left=42,right=width-20,top=12,bottom=height-30;
  root.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const x=i=>left+i*(right-left)/19, y=v=>top+(1-Number(v))*(bottom-top)/2;
  for(const v of [-1,-.5,0,.5,1]){
    root.append(svg('line',{x1:42,x2:right,y1:y(v),y2:y(v),stroke:v===1?'#91a1b5':'#26394d','stroke-dasharray':v===1?'5 5':'none'}));
    root.append(svg('text',{x:32,y:y(v)+3,'text-anchor':'end'},v.toFixed(1)));
  }
  for(let i=0;i<20;i++){
    root.append(svg('line',{x1:x(i),x2:x(i),y1:top,y2:bottom,stroke:'#26394d','stroke-opacity':'.45'}));
    if(i===0||i%2===1)root.append(svg('text',{x:x(i),y:height-15,'text-anchor':'middle'},i+1));
  }
  root.append(svg('text',{x:width/2,y:height-2,'text-anchor':'middle'},'Proposal'));
  if(!history.length){root.append(svg('text',{x:width/2,y:height/2,'text-anchor':'middle'},'Run a pairing to see how the matchmaker learns.'));return;}
  const points=history.map((h,i)=>`${x(i)},${y(h.score)}`).join(' ');
  root.append(svg('polyline',{points,fill:'none',stroke:'#63dfb3','stroke-width':'2.3','stroke-linejoin':'round'}));
  let best=-1;
  root.append(svg('polyline',{points:history.map((h,i)=>{best=Math.max(best,Number(h.score));return `${x(i)},${y(best)}`;}).join(' '),fill:'none',stroke:'#63dfb344','stroke-width':1,'stroke-dasharray':'3 4'}));
  root.append(svg('line',{x1:x(index),x2:x(index),y1:top,y2:bottom,stroke:'#f48b9d','stroke-opacity':'.7','stroke-dasharray':'3 4'}));
  history.forEach((h,i)=>{
    const c=svg('circle',{cx:x(i),cy:y(h.score),r:i===index?4.5:3,fill:i===index?'#f48b9d':'#63dfb3'});root.append(c);
    const markerKey=index+'|'+JSON.stringify(history);
    if(i===index&&curveMotionKey!==markerKey&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      c.style.transformBox='fill-box';c.style.transformOrigin='center';
      c.animate([{transform:'scale(1.8)',opacity:.5},{transform:'scale(1)',opacity:1}],{duration:500,easing:'cubic-bezier(.2,0,0,1)'});curveMotionKey=markerKey;
    }
    const hit=svg('rect',{x:x(i)-15,y:top-5,width:30,height:bottom-top+10,fill:'transparent',tabindex:0,role:'button','aria-label':`Select proposal ${i+1}, score ${h.score}`});
    hit.style.cursor='pointer';hit.addEventListener('click',()=>onSelect(i));hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(i);}});root.append(hit);
  });
}

export function renderAttributes(game,row,mode,selected,onSelect){
  const root=$('attributes'),n=game?.n||20;
  const previous=game?.history?.find(h=>h.round===row?.round-1);
  const priorWeights=previous?.weights||(row?.round===1?game?.original_weights:null);
  const animationKey=[game?.person,game?.matchmaker,mode,row?.round,JSON.stringify(row?.candidate),JSON.stringify(row?.weights)].join('|');
  const animate=root.dataset.motionKey!==animationKey&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.dataset.motionKey=animationKey;
  const weights=row?.weights||(row?.round===game?.history?.at(-1)?.round?game?.final_weights:null);
  const candidate=row?.candidate||game?.pending_candidate;
  $('attributes-title').textContent='Attributes × preferences = contributions';
  $('reveal-note').hidden=true;root.hidden=false;
  root.className='grouped-attributes';root.replaceChildren();
  const plot=element('div','grouped-plot');plot.style.setProperty('--count',n);root.append(plot);
  const axis=element('div','grouped-axis');for(const t of ['+1','0','−1'])axis.append(element('span','',t));plot.append(axis);
  const groups=element('div','attribute-groups');plot.append(groups);
  const metrics=[
    {name:'Attributes',color:'#75dfbd',values:candidate,prior:previous?.candidate},
    {name:'Preferences',color:'#b9a1f4',values:weights,prior:priorWeights},
    {name:'Contributions',color:'#efc276',values:weights&&candidate?weights.map((w,i)=>w*candidate[i]):null,prior:previous?.weights?.map((w,i)=>w*previous.candidate[i])}
  ];
  for(let i=0;i<n;i++){
    const group=element('div','attribute-group'+(i===selected?' selected':''));
    const bars=element('div','grouped-bars');group.append(bars);
    metrics.forEach(metric=>{
      const v=metric.values?.[i],prior=metric.prior?.[i],known=Number.isFinite(v),moved=known&&Number.isFinite(prior)&&v!==prior;
      const bar=element('button','metric-bar'+(!known?' unavailable':''));bar.type='button';
      const description=known?fmt(v):metric.name==='Attributes'?'Waiting for a candidate':'Hidden until the game ends';
      bar.setAttribute('aria-label',`${metric.name}, attribute ${i+1}: ${description}`);
      bar.title=`${metric.name} ${i+1}: ${moved?fmt(prior)+' → ':''}${description}`;
      const fill=element('span','metric-fill');fill.style.background=metric.color;
      fill.style.height=known?`${Math.abs(v)*50}%`:'0%';fill.style.top=known&&v<0?'50%':'auto';fill.style.bottom=known&&v>=0?'50%':'auto';
      bar.append(fill);
      if(!known)bar.append(element('span','unknown-value','?'));
      else if(v===0){const zero=element('span','zero-value');zero.style.background=metric.color;bar.append(zero);}
      if(moved){const ghost=element('span','metric-before');ghost.style.height=`${Math.abs(prior)*50}%`;ghost.style.top=prior<0?'50%':'auto';ghost.style.bottom=prior>=0?'50%':'auto';bar.append(ghost);}
      bar.onclick=()=>onSelect(i);bars.append(bar);
      if(animate&&moved)fill.animate([{height:`${Math.abs(prior)*50}%`},{height:fill.style.height}],{duration:480,easing:'cubic-bezier(.2,0,0,1)'});
    });
    const index=element('button','group-index',String(i+1).padStart(2,'0'));index.setAttribute('aria-label',`Inspect attribute ${i+1}`);index.onclick=()=>onSelect(i);group.append(index);groups.append(group);
  }
  const legend=$('attribute-legend');legend.replaceChildren();
  metrics.forEach(metric=>{const item=element('span'),swatch=element('i','swatch');swatch.style.background=metric.color;item.append(swatch,document.createTextNode(metric.name));legend.append(item);});
  legend.append(element('span','','Shared scale −1 to +1 · dashed = previous · click for values'));
  if(!weights)legend.append(element('span','','? Weights and contributions are hidden until revealed.'));
  const detail=$('attribute-detail');detail.replaceChildren();
  if(!row?.candidate){detail.textContent='Select an attribute to see how the score is calculated.';}
  else if(weights){const i=Math.min(selected,n-1),c=row.candidate[i],w=weights[i];detail.append(element('strong','',`Attribute ${String(i+1).padStart(2,'0')}`),document.createTextNode(`  ·  ${fmt(c)} × ${fmt(w)} = ${fmt(c*w)} contribution${row.changed?.includes(i)?'  ·  P changed this weight':''}`));}
  else{detail.textContent=`Attribute ${selected+1}  ·  value ${fmt(row.candidate[selected])}  ·  Weight and contribution revealed after the game.`;}
  $('contribution-summary').hidden=!weights||!row?.candidate;
  if(weights&&row?.candidate){let positive=0,negative=0;weights.forEach((w,i)=>{const c=w*row.candidate[i];if(c>=0)positive+=c;else negative+=c;});$('positive-sum').textContent='+'+fmt(positive);$('negative-sum').textContent=fmt(negative);$('positive-meter').style.width=Math.min(100,positive*100)+'%';$('negative-meter').style.width=Math.min(100,-negative*100)+'%';$('score-equation').textContent=`${fmt(positive)} − ${fmt(-negative)} = ${fmt(positive+negative)}`;}
}

let chartTimer;window.addEventListener('resize',()=>{clearTimeout(chartTimer);chartTimer=setTimeout(()=>{if(curveArgs)renderCurve(...curveArgs);},150);});
