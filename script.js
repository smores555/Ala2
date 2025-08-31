let INDEX=null;
async function loadIndex(){
  const r=await fetch('data/index.json');
  INDEX=await r.json(); return INDEX;
}
function groupByBase(index){
  const map=new Map();
  for(const c of index.combos){
    if(!map.has(c.base)) map.set(c.base,[]);
    map.get(c.base).push(c);
  }
  return map;
}
function fillSelect(el,vals){ el.innerHTML=''; for(const v of vals){const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o);} }
async function loadPilots(file){ const r=await fetch('data/'+file); return r.json(); }
function countLTE(nums,sn){let lo=0,hi=nums.length;while(lo<hi){const m=(lo+hi)>>1;if(nums[m]<=sn)lo=m+1;else hi=m;}return lo;}
function pct(r,t){if(!r||!t)return'—';return Math.round(r/t*100)+'%';}

async function calcOne(combo,sn){
  const data=await loadPilots(combo.file);
  const seniors=data.pilots.map(p=>p.seniority).sort((a,b)=>a-b);
  const total=seniors.length;
  const rank=countLTE(seniors,sn);
  return {seat:combo.seat,base:combo.base,rank,total,pct:pct(rank,total)};
}

async function calcAll(sn){
  const rows=[];
  for(const c of INDEX.combos){ try{ rows.push(await calcOne(c,sn)); }catch(e){console.error(e);} }
  rows.sort((a,b)=>(parseInt(a.pct)||999999)-(parseInt(b.pct)||999999));
  return rows;
}

function renderBest(rows){
  const tb=document.querySelector('#best tbody'); tb.innerHTML='';
  for(const r of rows){
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.seat}</td><td>${r.base}</td><td>${r.rank||'—'}</td><td>${r.total||'—'}</td><td>${r.pct}</td>`;
    tb.appendChild(tr);
  }
}

function renderList(base,seat,pilots,sn){
  document.getElementById('listTitle').textContent=`Pilot List — ${base} ${seat}`;
  const tb=document.querySelector('#list tbody'); tb.innerHTML='';
  for(let i=0;i<pilots.length;i++){const p=pilots[i];const tr=document.createElement('tr');
    const highlight=(p.seniority==sn);
    tr.className=highlight?'you':'';
    tr.innerHTML=`<td>${p.seniority}</td><td>${p.name}</td><td>${p.rank}</td><td>${p.total}</td>`;
    tb.appendChild(tr);
  }
}

async function main(){
  await loadIndex();
  const byBase=groupByBase(INDEX);
  const baseSel=document.getElementById('base');
  const seatSel=document.getElementById('seat');
  fillSelect(baseSel,Array.from(byBase.keys()));
  function refreshSeats(){const arr=byBase.get(baseSel.value)||[];fillSelect(seatSel,arr.map(c=>c.seat));}
  refreshSeats(); baseSel.addEventListener('change',refreshSeats);

  document.getElementById('calc').addEventListener('click',async()=>{
    const sn=parseInt(document.getElementById('sn').value,10); if(!sn)return;
    const base=baseSel.value, seat=seatSel.value;
    const combo=INDEX.combos.find(c=>c.base===base&&c.seat===seat);
    if(!combo) return;
    const data=await loadPilots(combo.file);
    renderList(base,seat,data.pilots,sn);
    renderBest(await calcAll(sn));
  });
  document.getElementById('compare').addEventListener('click',async()=>{
    const sn=parseInt(document.getElementById('sn').value,10); if(!sn)return;
    renderBest(await calcAll(sn));
  });
}
main();
