let INDEX=null;

async function loadIndex(){
  const r=await fetch('data/index.json');
  if(!r.ok) throw new Error('Missing data/index.json');
  INDEX=await r.json(); 
  return INDEX;
}

function groupByBase(index){
  const map=new Map();
  for(const c of index.combos){
    if(!map.has(c.base)) map.set(c.base,[]);
    map.get(c.base).push(c);
  }
  for(const [b,arr] of map){ arr.sort((a,b)=>a.seat.localeCompare(b.seat)); }
  return map;
}

function fillSelect(el, vals){
  el.innerHTML='';
  for(const v of vals){
    const o=document.createElement('option');
    o.value=v; o.textContent=v;
    el.appendChild(o);
  }
}

async function loadPilots(file){
  const r=await fetch('data/'+file);
  if(!r.ok) throw new Error('Missing data/'+file);
  return r.json();
}

// lowerBound: first index where nums[i] >= target
function lowerBound(nums, target){
  let lo=0, hi=nums.length;
  while(lo<hi){
    const m=(lo+hi)>>1;
    if(nums[m] < target) lo=m+1; else hi=m;
  }
  return lo;
}

function pct(rank,total){
  if(!rank||!total) return '—';
  return Math.round((rank/total)*100)+'%';
}

async function calcOne(combo,sn){
  const data=await loadPilots(combo.file);
  const seniors=data.pilots.map(p=>Number(p.seniority)).filter(n=>!Number.isNaN(n)).sort((a,b)=>a-b);
  const total=seniors.length;
  const eqIndex = seniors.indexOf(sn);
  let rank;
  if (eqIndex !== -1){
    rank = eqIndex + 1;
  } else {
    const insertAt = lowerBound(seniors, sn);
    rank = insertAt + 1; // ensures top case → rank = 1
  }
  return {seat:combo.seat, base:combo.base, rank, total, pct:pct(rank,total)};
}

async function calcAll(sn){
  const rows=[];
  for(const combo of INDEX.combos){
    try{ rows.push(await calcOne(combo,sn)); }catch(e){ console.error(e); }
  }
  rows.sort((a,b)=>(parseInt(a.pct)||999999)-(parseInt(b.pct)||999999));
  return rows;
}

function renderBest(rows){
  const tb=document.querySelector('#best tbody');
  if(!tb) return;
  tb.innerHTML='';
  for(const r of rows){
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.seat}</td>
                  <td>${r.base}</td>
                  <td>${r.rank||'—'}</td>
                  <td>${r.total||'—'}</td>
                  <td>${r.pct}</td>`;
    tb.appendChild(tr);
  }
}

function renderListTitle(base, seat){
  const el=document.getElementById('listTitle');
  if(el) el.textContent=`Pilot List — ${base} ${seat}`;
}

function renderList(base, seat, pilots, sn){
  const tb=document.querySelector('#list tbody');
  if(!tb) return;
  tb.innerHTML='';

  const sorted=[...pilots].sort((a,b)=>Number(a.seniority)-Number(b.seniority));
  const seniors=sorted.map(p=>Number(p.seniority));
  const total=sorted.length;

  const eqIndex = sorted.findIndex(p=>Number(p.seniority)===sn);
  if(eqIndex !== -1){
    for(let i=0;i<sorted.length;i++){
      const p=sorted[i];
      const tr=document.createElement('tr');
      tr.className = (i===eqIndex) ? 'you' : '';
      tr.innerHTML = `<td class="c-snr">${p.seniority??''}</td>
                      <td class="c-name">${p.name??''}</td>
                      <td class="c-rank">${i+1}</td>
                      <td class="c-total">${total}</td>`;
      tb.appendChild(tr);
    }
    tb.querySelector('tr.you')?.scrollIntoView({block:'center'});
    return;
  }

  const insertAt = lowerBound(seniors, sn); // 0..total (top case => 0)
  for(let i=0;i<sorted.length;i++){
    if(i===insertAt){
      const tr=document.createElement('tr');
      tr.className='you';
      tr.innerHTML = `<td class="c-snr">${sn}</td>
                      <td class="c-name">(you — hypothetical)</td>
                      <td class="c-rank">${i+1}</td>
                      <td class="c-total">${total+1}</td>`;
      tb.appendChild(tr);
    }
    const p=sorted[i];
    const tr=document.createElement('tr');
    tr.innerHTML = `<td class="c-snr">${p.seniority??''}</td>
                    <td class="c-name">${p.name??''}</td>
                    <td class="c-rank">${i+1 + (i>=insertAt?1:0)}</td>
                    <td class="c-total">${total+1}</td>`;
    tb.appendChild(tr);
  }
  if(insertAt===sorted.length){
    const tr=document.createElement('tr');
    tr.className='you';
    tr.innerHTML = `<td class="c-snr">${sn}</td>
                    <td class="c-name">(you — hypothetical)</td>
                    <td class="c-rank">${total+1}</td>
                    <td class="c-total">${total+1}</td>`;
    tb.appendChild(tr);
  }
  tb.querySelector('tr.you')?.scrollIntoView({block:'center'});
}

async function main(){
  await loadIndex();
  const byBase=groupByBase(INDEX);

  const baseSel=document.getElementById('base');
  const seatSel=document.getElementById('seat');
  fillSelect(baseSel, Array.from(byBase.keys()).sort());
  function refreshSeats(){
    const base=baseSel.value;
    const seats=(byBase.get(base)||[]).map(c=>c.seat).sort();
    fillSelect(seatSel, seats);
  }
  refreshSeats();
  baseSel.addEventListener('change', refreshSeats);

  document.getElementById('calc').addEventListener('click', async ()=>{
    const sn=parseInt(document.getElementById('sn').value,10);
    if(!sn){ alert('Enter a valid seniority #'); return; }

    renderBest(await calcAll(sn));

    const base=baseSel.value, seat=seatSel.value;
    const combo=INDEX.combos.find(c=>c.base===base && c.seat===seat);
    if(!combo){ alert('No data for that base/seat'); return; }
    const data=await loadPilots(combo.file);
    renderListTitle(base, seat);
    renderList(base, seat, data.pilots, sn);
  });

  document.getElementById('compare').addEventListener('click', async ()=>{
    const sn=parseInt(document.getElementById('sn').value,10);
    if(!sn){ alert('Enter a valid seniority #'); return; }
    renderBest(await calcAll(sn));
  });
}

main().catch(err=>{
  console.error(err);
  alert('Failed to load site data. Check /data files and try again.');
});
