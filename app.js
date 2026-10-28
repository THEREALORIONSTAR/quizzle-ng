(function(){
const KEY_HIST="quizzle_history_v1", KEY_RUN="quizzle_inprogress_v1", KEY_EXAM="quizzle_exam_date_v1", KEY_MOCK="quizzle_mock_run_v1";
const DEPTS={
  science:{name:"Science",subjects:["maths","english","physics","chemistry","biology"]},
  arts:{name:"Arts",subjects:["english","literature","government","crs","economics"]},
  commercial:{name:"Commercial",subjects:["english","maths","economics","commerce","government"]}
};
const SUBJECTS=["english","maths","biology","government","physics","chemistry","economics","literature","crs","commerce"];
const ENTRY_HIST_LIMIT=40;
const COURSES={
  "medicine":{label:"Medicine and Surgery",dept:"science",subjects:["english","biology","chemistry","physics"]},
  "pharmacy":{label:"Pharmacy",dept:"science",subjects:["english","chemistry","biology","maths"]},
  "nursing":{label:"Nursing",dept:"science",subjects:["english","biology","chemistry","maths"]},
  "engineering":{label:"Engineering",dept:"science",subjects:["english","maths","physics","chemistry"]},
  "computer science":{label:"Computer Science",dept:"science",subjects:["english","maths","physics","chemistry"]},
  "agriculture":{label:"Agriculture",dept:"science",subjects:["english","biology","chemistry","maths"]},
  "architecture":{label:"Architecture",dept:"science",subjects:["english","maths","physics","chemistry"]},
  "law":{label:"Law",dept:"arts",subjects:["english","literature","government","crs"]},
  "english":{label:"English / Literature",dept:"arts",subjects:["english","literature","government","crs"]},
  "history":{label:"History",dept:"arts",subjects:["english","government","literature","crs"]},
  "mass communication":{label:"Mass Communication",dept:"arts",subjects:["english","literature","government","economics"]},
  "political science":{label:"Political Science",dept:"arts",subjects:["english","government","economics","literature"]},
  "theology":{label:"Theology / Religious Studies",dept:"arts",subjects:["english","crs","literature","government"]},
  "accounting":{label:"Accounting",dept:"commercial",subjects:["english","maths","economics","commerce"]},
  "economics":{label:"Economics",dept:"commercial",subjects:["english","maths","economics","government"]},
  "business administration":{label:"Business Administration",dept:"commercial",subjects:["english","maths","economics","commerce"]},
  "banking and finance":{label:"Banking and Finance",dept:"commercial",subjects:["english","maths","economics","commerce"]},
  "marketing":{label:"Marketing",dept:"commercial",subjects:["english","maths","economics","commerce"]},
  "insurance":{label:"Insurance",dept:"commercial",subjects:["english","maths","economics","commerce"]},
  "mathematics":{label:"Mathematics / Statistics",dept:"science",subjects:["english","maths","physics","economics"]}
};
const app=document.getElementById("app");
const $=(s)=>document.querySelector(s);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const L=["A","B","C","D"];
const fmtT=(s)=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
let timerId=null;
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null}}
function getBank(sub){return window.BANK&&window.BANK[sub]}
function setsOf(sub){const b=getBank(sub);return b?b.sets:[]}
function bestFor(sub,set){const h=load(KEY_HIST,[]);let best=null;h.forEach(a=>{if(a.subject===sub&&a.set===set&&(best===null||a.percent>best))best=a.percent});return best}
function gradeOf(p){return p>=70?"Excellent":p>=50?"Fair":"Needs work"}
function go(h){location.hash=h}
function nameOf(sub){const b=getBank(sub);return b?b.name:sub}

// ---------- dark mode ----------
const KEY_THEME="quizzle_theme_v1";
function currentTheme(){return localStorage.getItem(KEY_THEME)==="dark"?"dark":"light"}
function applyTheme(t){
  document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");
  const b=document.getElementById("theme");
  if(b){b.textContent=t==="dark"?"Light mode":"Dark mode";b.setAttribute("aria-pressed",t==="dark"?"true":"false")}
}
function toggleTheme(){const t=currentTheme()==="dark"?"light":"dark";try{localStorage.setItem(KEY_THEME,t)}catch(e){}applyTheme(t)}

// ---------- daily streak: a day counts when 20+ questions are answered ----------
const KEY_STREAK="quizzle_streak_v1", STREAK_GOAL=20;
function localDay(d){const x=d||new Date();return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")}
function dayBefore(key,n){const p=key.split("-").map(Number);return localDay(new Date(p[0],p[1]-1,p[2]-n))}
function answeredToday(){const s=load(KEY_STREAK,{days:{}});return (s.days&&s.days[localDay()])||0}
function recordAnswer(){
  const s=load(KEY_STREAK,{days:{}});const days=s.days||{};const k=localDay();
  days[k]=(days[k]||0)+1;
  const keep=Object.keys(days).sort().slice(-90), nd={};
  keep.forEach(x=>nd[x]=days[x]);
  save(KEY_STREAK,{days:nd});
}
function streakCount(){
  const days=(load(KEY_STREAK,{days:{}}).days)||{};
  const today=localDay();
  let k=(days[today]||0)>=STREAK_GOAL?today:dayBefore(today,1);
  let n=0;
  while(n<90&&(days[k]||0)>=STREAK_GOAL){n++;k=dayBefore(k,1)}
  return n;
}
function streakCard(){
  const n=streakCount(), today=answeredToday(), left=Math.max(0,STREAK_GOAL-today);
  const pct=Math.min(100,Math.round(today/STREAK_GOAL*100));
  const nudge=left>0
    ? `Answer ${left} more question${left===1?"":"s"} today to ${n>0?`keep your ${n}-day streak alive`:"start your streak"}.`
    : `Target hit for today. Come back tomorrow to keep the streak going.`;
  return `<div class="card"><b>Daily streak</b><div class="score" style="font-size:1.8rem">${n} day${n===1?"":"s"}</div>
  <div class="muted" style="text-align:center">${today} of ${STREAK_GOAL} questions answered today</div>
  <div class="bar"><div style="width:${pct}%"></div></div><div class="muted" style="text-align:center">${esc(nudge)}</div></div>`;
}

// ---------- share score ----------
const SITE_URL="https://quizzle-ng-a4xk.folkapps.com";
function shareText(score,total){return `I scored ${score}/${total} on Quizzle NG — can u beat me? ${SITE_URL}`}
function shareButton(score,total){return `<button class="btn small alt" id="share" type="button" data-msg="${esc(shareText(score,total))}">Share score</button>`}
function bindShare(){
  const b=$("#share"); if(!b)return;
  b.onclick=async()=>{
    const msg=b.dataset.msg; let ok=false;
    try{ if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(msg);ok=true} }catch(e){}
    if(!ok){
      const ta=document.createElement("textarea"); ta.value=msg; ta.setAttribute("readonly",""); ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select(); try{ok=document.execCommand("copy")}catch(e){} ta.remove();
    }
    b.textContent=ok?"Copied!":"Copy failed";
    setTimeout(()=>{b.textContent="Share score"},2000);
  };
}

// ---------- shuffling with no-repeat preference ----------
function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// question key: subject + question text. Tracks questions already served recently.
const KEY_SEEN="quizzle_seen_v1";
function seenMap(){return load(KEY_SEEN,{})}
function markSeen(keys){const m=seenMap();keys.forEach(k=>m[k]=(m[k]||0)+1);save(KEY_SEEN,m)}
// every unique question in the subject (across all its sets), so a retry can draw questions the student has not seen yet
function subjectPool(sub){
  const seenKeys=new Set(), pool=[];
  ((getBank(sub)||{}).sets||[]).forEach(st=>st.qs.forEach(q=>{
    const k=sub+"|"+q[0];
    if(!seenKeys.has(k)){seenKeys.add(k);pool.push({k,q})}
  }));
  return pool;
}
// unseen questions are served first; once every question in the subject has been seen,
// that subject's seen tracking is reset and the attempt starts fresh
function drawQuestions(sub,set,count){
  const n=count||set.qs.length;
  const seen=seenMap();
  const pool=subjectPool(sub);
  let unseen=pool.filter(x=>!seen[x.k]);
  if(unseen.length===0){
    const m=seenMap();
    Object.keys(m).forEach(k=>{if(k.startsWith(sub+"|"))delete m[k]});
    save(KEY_SEEN,m);
    unseen=pool;
  }
  const picked=shuffle(unseen).slice(0,n);
  if(picked.length<n){
    const taken=new Set(picked.map(x=>x.k));
    shuffle(pool.filter(x=>!taken.has(x.k))).slice(0,n-picked.length).forEach(x=>picked.push(x));
  }
  return shuffle(picked).map(x=>x.q);
}
// shuffle the options of one question, returning a new question array with the answer index remapped
function shuffleOptions(q){
  const order=shuffle([0,1,2,3]);
  return {q:q[0],o:order.map(i=>q[1][i]),a:order.indexOf(q[2]),e:q[3]};
}
function buildRun(sub,set,mode){
  const picked=drawQuestions(sub,set,set.qs.length);
  return picked.map(q=>shuffleOptions(q));
}

// ---------- departments and course finder ----------
function deptPage(key){
  const d=DEPTS[key];
  if(!d){app.innerHTML=`<a href="#/">&larr; Back</a><div class="empty">Department not found.</div>`;return}
  const btns=d.subjects.map(s=>`<a class="card set" href="#/subject/${s}" style="text-decoration:none;color:inherit"><div><b>${esc(nameOf(s))}</b></div><span class="btn small">Practice</span></a>`).join("");
  app.innerHTML=`<a href="#/">&larr; Back</a><h1>${esc(d.name)} subjects</h1><p class="muted">The JAMB subject set for ${esc(d.name)} students.</p>${btns}`;
}
function courseFinder(query){
  const q=(query||"").trim().toLowerCase();
  const hits=Object.keys(COURSES).filter(k=>q&&(k.includes(q)||COURSES[k].label.toLowerCase().includes(q)));
  let res="";
  if(!q)res=`<div class="muted">Type a course, e.g. medicine, law, accounting.</div>`;
  else if(!hits.length)res=`<div class="empty">No course matched "${esc(query)}". Try medicine, law, accounting, engineering or nursing.</div>`;
  else res=hits.slice(0,6).map(k=>{const c=COURSES[k];return `<div class="card"><b>${esc(c.label)}</b><div class="muted">JAMB subject combination: ${c.subjects.map(s=>esc(nameOf(s))).join(", ")}</div><div class="row" style="margin-top:8px">${c.subjects.map(s=>`<a class="btn small alt" href="#/subject/${s}">${esc(nameOf(s))}</a>`).join("")}</div></div>`}).join("");
  return res;
}
function coursePage(){
  app.innerHTML=`<a href="#/">&larr; Back</a><h1>Course combo finder</h1><p class="muted">Type your course. You get the JAMB subject combination and a link into each subject's practice.</p>
  <input id="cq" class="cinput" placeholder="e.g. medicine, law, accounting" autocomplete="off"><div id="cres" style="margin-top:12px">${courseFinder("")}</div>`;
  const inp=$("#cq");
  inp.oninput=()=>{$("#cres").innerHTML=courseFinder(inp.value)};
}

// ---------- countdown ----------
function countdownCard(){
  const d=load(KEY_EXAM,null);
  if(!d)return `<div class="card"><b>Exam-day countdown</b><p class="muted" style="margin:6px 0">Set your JAMB or WAEC exam date.</p>
    <div class="row"><input type="date" id="exd" class="cinput" style="max-width:220px"><button class="btn small" id="exsave">Save date</button></div></div>`;
  const days=Math.ceil((new Date(d.date+"T00:00:00")-new Date(new Date().toDateString()))/86400000);
  const label=days>0?`${days} day${days===1?"":"s"} to go`:days===0?"Exam day is today. Good luck.":"Exam date has passed. Set a new one.";
  return `<div class="card"><b>${esc(d.label||"Exam")}</b><div class="score" style="font-size:1.8rem">${esc(label)}</div><div class="muted" style="text-align:center">${esc(d.date)}</div>
    <div class="row" style="justify-content:center;margin-top:8px"><button class="btn small alt" id="exedit">Change date</button><button class="btn small danger" id="exclear">Remove</button></div></div>`;
}
function bindCountdown(){
  const s=$("#exsave");if(s)s.onclick=()=>{const v=$("#exd").value;if(!v){alert("Pick a date first.");return}save(KEY_EXAM,{date:v,label:"JAMB 2027"});home()};
  const e=$("#exedit");if(e)e.onclick=()=>{localStorage.removeItem(KEY_EXAM);home()};
  const c=$("#exclear");if(c)c.onclick=()=>{localStorage.removeItem(KEY_EXAM);home()};
}

// ---------- progress dashboard ----------
function weakTopics(){
  const h=load(KEY_HIST,[]);
  const bySub={};
  h.forEach(a=>{const s=a.subject;if(!bySub[s])bySub[s]={n:0,sum:0,last:0};bySub[s].n++;bySub[s].sum+=a.percent;});
  const out=Object.keys(bySub).map(s=>({subject:s,avg:Math.round(bySub[s].sum/bySub[s].n),n:bySub[s].n})).filter(x=>x.n>0);
  out.sort((a,b)=>a.avg-b.avg);
  return out;
}
function dashboard(){
  const h=load(KEY_HIST,[]);
  if(!h.length)return `<div class="card"><b>Progress</b><div class="muted">Take a set to see your progress and weak topics here.</div></div>`;
  const subsTaken=new Set(h.map(a=>a.subject));
  const covered=SUBJECTS.filter(s=>subsTaken.has(s)).length;
  const avg=Math.round(h.reduce((s,a)=>s+a.percent,0)/h.length);
  const w=weakTopics().filter(x=>x.avg<60);
  const nudge=w.length?`<div class="card"><b>Revise nudge</b><div class="muted" style="margin-top:6px">Your average in ${w.slice(0,3).map(x=>esc(nameOf(x.subject))).join(", ")} is below 60%. Revise these first.</div>
    <div class="row" style="margin-top:8px">${w.slice(0,3).map(x=>`<a class="btn small alt" href="#/subject/${x.subject}">Revise ${esc(nameOf(x.subject))}</a>`).join("")}</div></div>`
    :`<div class="card"><b>Good progress</b><div class="muted">All your subjects average 60% or above. Keep the streak with a timed set.</div></div>`;
  const rows=SUBJECTS.filter(s=>subsTaken.has(s)).map(s=>{const x=weakTopics().find(y=>y.subject===s);return `<div class="hist"><div><b>${esc(nameOf(s))}</b><div class="muted">${x.n} attempt${x.n===1?"":"s"}</div></div><div class="score" style="font-size:1.2rem">${x.avg}%</div></div>`}).join("");
  return `<div class="card grid"><div class="stat"><b>${h.length}</b><span class="muted">attempts</span></div><div class="stat"><b>${avg}%</b><span class="muted">average</span></div><div class="stat"><b>${covered}/${SUBJECTS.length}</b><span class="muted">subjects tried</span></div></div>${nudge}<div class="card"><b>By subject</b>${rows}</div>`;
}

// ---------- home ----------
function home(){
  const h=load(KEY_HIST,[]);
  const subs=SUBJECTS.map(s=>{const b=getBank(s);const n=b?b.sets.length:0;return `<a class="card set" href="#/subject/${s}" style="text-decoration:none;color:inherit"><div><b>${esc(b?b.name:s)}</b><div class="muted">${n} set${n===1?"":"s"}</div></div><span class="btn small">Open</span></a>`}).join("");
  app.innerHTML=`<h1>Practice for WAEC and JAMB</h1>
  <p class="muted">Pick a subject. Practice mode shows answers straight away. Timed mode tests you under a clock.</p>
  ${streakCard()}
  ${countdownCard()}
  <div class="row" style="margin:10px 0">
    <a class="btn small" href="#/mock">Mock exam (4 subjects)</a>
    <a class="btn small alt" href="#/course">Course combo finder</a>
  </div>
  <h2>Departments</h2>
  <div class="row" style="margin-bottom:12px">
    <a class="btn small alt" href="#/dept/science">Science</a>
    <a class="btn small alt" href="#/dept/arts">Arts</a>
    <a class="btn small alt" href="#/dept/commercial">Commercial</a>
  </div>
  ${dashboard()}
  <h2>All subjects</h2>
  ${subs}
  <a class="card set" href="#/learn" style="text-decoration:none;color:inherit"><div><b>Learn the tricks</b><div class="muted">Short lessons with methods for WAEC and JAMB</div></div><span class="btn small alt">Learn</span></a>
  ${h.length?"":`<div class="empty muted">No attempts yet. Start a set to see your scores here.</div>`}`;
  bindCountdown();
}

function subject(sub){
  const b=getBank(sub);
  if(!b){app.innerHTML=`<p>Subject not found.</p><a class="btn" href="#/">Home</a>`;return}
  const list=b.sets.map((s,i)=>{const best=bestFor(sub,s.name);return `<div class="card set">
    <div><b>${esc(s.name)}</b><div class="muted">${s.qs.length} questions${best!==null?` · best ${best}%`:" · not attempted"}</div></div>
    <div class="row"><button class="btn small alt" data-start="${sub}|${i}|practice">Practice</button><button class="btn small" data-start="${sub}|${i}|timed">Timed</button></div></div>`}).join("");
  app.innerHTML=`<a href="#/">&larr; Back</a><h1>${esc(b.name)}</h1>${list}`;
  app.querySelectorAll("[data-start]").forEach(el=>el.onclick=()=>{const [s,i,m]=el.dataset.start.split("|");startQuiz(s,+i,m)});
}

function startQuiz(sub,idx,mode){
  const set=setsOf(sub)[idx];
  const qs=buildRun(sub,set,mode);
  const run={subject:sub,idx,set:set.name,mode,qs:qs.map(q=>({q:q.q,o:q.o,a:q.a,e:q.e})),answers:[],cur:0,started:Date.now(),limit:mode==="timed"?set.qs.length*60:0,remaining:set.qs.length*60,finished:false};
  save(KEY_RUN,run);
  location.hash="#/quiz";
  runQuiz(run);
}

function runQuiz(run){
  stopTimer();
  if(run.mode==="timed"||run.mock){
    const tick=()=>{
      const elapsedSecs=(Date.now()-run.started)/1000;
      const left=run.limit-elapsedSecs;
      run.remaining=left;
      const t=$("#tm");
      if(t){t.textContent=fmtT(left);t.classList.toggle("low",left<60)}
      if(left<=0){stopTimer();finish(run,true)}
    };
    timerId=setInterval(tick,500);
  }
  draw(run);
}


// ---------- teaching feedback ----------
// which set (topic) a question belongs to, looked up by its text in the subject bank
function topicOf(sub,qText){
  const b=getBank(sub); if(!b)return null;
  for(const st of b.sets){ if(st.qs.some(q=>q[0]===qText)) return st.name; }
  return null;
}
const TOPIC_STOP=new Set(["set","practice","review","mixed","jamb","topics","topic","and","the","of","in","with","for","test","part","english","language","literature","government","economics","maths","physics","chemistry","biology","crs","commerce","general"]);
function topicWords(s){return String(s).toLowerCase().replace(/[^a-z\s]/g," ").split(/\s+/).filter(w=>w.length>2&&!TOPIC_STOP.has(w))}
// the lesson in Learn whose title/summary shares the most words with the set name (null if none)
function lessonFor(sub,setName){
  const s=findSubj(sub); if(!s||!setName)return null;
  const words=new Set(topicWords(setName)); if(!words.size)return null;
  let best=null,bs=0;
  s.topics.forEach(t=>{let sc=0;topicWords(t.title+" "+t.summary).forEach(w=>{if(words.has(w))sc++});if(sc>bs){bs=sc;best=t}});
  return best?{slug:s.slug,topic:best}:null;
}
// teacher-style feedback for one question: plain idea first, then the correct answer
function teachBlock(sub,q,ans){
  if(ans===q.a)return `<div class="expl"><b>Correct.</b> ${esc(q.e)}</div>`;
  const topic=topicOf(sub,q.q), les=topic?lessonFor(sub,topic):null;
  const picked=ans==null?`<p class="muted">You did not answer this one. No stress, here is the idea.</p>`:`<p class="muted">You picked ${L[ans]}. ${esc(q.o[ans])}. Close, but not the one.</p>`;
  return `<div class="expl teach"><b>Not quite, and that is okay. Let's learn it together.</b>
  <p class="teach-idea"><b>The idea:</b> ${esc(q.e)}</p>
  ${picked}
  <p><b>The correct answer is ${L[q.a]}. ${esc(q.o[q.a])}.</b></p>
  ${les?`<p class="muted">Want to go deeper? <a href="#/learn/${les.slug}/${les.topic.id}">Read the lesson: ${esc(les.topic.title)}</a></p>`:""}</div>`;
}
// "What to work on": topics behind the missed questions, with links into Learn
function workCard(items){
  const g={};
  items.forEach(it=>{const set=topicOf(it.sub,it.q)||"General";const k=it.sub+"|"+set;g[k]=g[k]||{sub:it.sub,set,n:0,of:0};g[k].of++;if(!it.ok)g[k].n++});
  const rows=Object.values(g).filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,8);
  if(!rows.length)return "";
  const body=rows.map(x=>{
    const les=x.set!=="General"?lessonFor(x.sub,x.set):null;
    const label=x.set.replace(/^Set \d+:\s*/,"");
    const btn=les?`<a class="btn small alt" href="#/learn/${les.slug}/${les.topic.id}">Revise: ${esc(les.topic.title)}</a>`:(findSubj(x.sub)?`<a class="btn small alt" href="#/learn/${x.sub}">Revise: ${esc(nameOf(x.sub))} lessons</a>`:"");
    return `<div class="work-row"><div><b>${esc(label)}</b><div class="muted">${esc(nameOf(x.sub))} · missed ${x.n} of ${x.of}</div></div>${btn}</div>`;
  }).join("");
  return `<div class="card work"><h2>What to work on</h2><p class="muted">These topics cost you marks. Revise them in Learn, then try again. Going over the lesson once makes the next set easier.</p>${body}<a class="btn wide" href="#/learn" style="margin-top:12px">Revise in Learn</a></div>`;
}

function draw(run){
  if(run.mock&&run._m){ run._m.answers=run.answers; run._m.cur=run.cur; save(KEY_MOCK,run._m); }
  const total=run.qs.length;
  const q=run.qs[run.cur];
  const ans=run.answers[run.cur];
  const answered=run.answers.filter(x=>x!==undefined&&x!==null).length;
  const practiceReveal=run.mode==="practice"&&ans!==undefined&&ans!==null;
  const timed=run.mode==="timed"||run.mock;
  const timerHtml=timed?`<span class="timer" id="tm">${fmtT(run.limit-(Date.now()-run.started)/1000)}</span>`:`<span class="muted">Practice</span>`;
  const opts=q.o.map((o,i)=>{
    let cls="opt";
    if(practiceReveal){if(i===q.a)cls+=" correct";else if(i===ans)cls+=" wrong"}
    else if(timed&&ans===i)cls+=" chosen";
    return `<button class="${cls}" data-o="${i}" ${practiceReveal?"disabled":""}><span class="L">${L[i]}</span><span>${esc(o)}</span></button>`;
  }).join("");
  const expl=practiceReveal?teachBlock(run.subject,q,ans):"";
  const palette=timed?`<div class="palette">${run.qs.map((_,i)=>`<button class="pal ${run.answers[i]!=null?"done":""} ${i===run.cur?"cur":""}" data-j="${i}">${i+1}</button>`).join("")}</div>`:"";
  const nav=timed?`<div class="row" style="margin-top:14px"><button class="btn alt" id="prev" ${run.cur===0?"disabled":""}>Previous</button>${run.cur<total-1?`<button class="btn" id="next">Next</button>`:""}<button class="btn" id="submit">Submit</button></div>`
    :`<div class="row" style="margin-top:14px">${run.cur<total-1?`<button class="btn" id="next" ${practiceReveal||ans!=null?"":"disabled"}>Next</button>`:`<button class="btn" id="submit" ${practiceReveal?"":"disabled"}>See results</button>`}</div>`;
  const label=run.mock?`Mock: ${esc(nameOf(run.qs.subject||run.subject))} (${run.mockIdx+1} of 4)`:"";
  app.innerHTML=`<div class="row" style="justify-content:space-between"><b>${run.mock?label:`Question ${run.cur+1} of ${total}`}</b>${timerHtml}</div>
  <div class="bar"><div style="width:${(answered/total)*100}%"></div></div>
  <div class="card"><p style="font-size:1.05rem;line-height:1.5;margin:4px 0 8px;white-space:pre-wrap">${esc(q.q)}</p>${opts}${expl}</div>
  ${palette}${nav}
  <div style="margin-top:14px"><button class="btn small alt" id="quit">Quit</button></div>`;
  app.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{
    const fresh=run.answers[run.cur]==null;
    if(run.mode==="practice"&&!run.mock){ if(!fresh)return; run.answers[run.cur]=+b.dataset.o; save(KEY_RUN,run); recordAnswer(); draw(run); }
    else { run.answers[run.cur]=+b.dataset.o; save(KEY_RUN,run); if(fresh)recordAnswer(); if(run._m){run._m.answers=run.answers;save(KEY_MOCK,run._m)} draw(run); }
  });
  const go2=(j)=>{run.cur=j;save(KEY_RUN,run);if(run._m){run._m.cur=j;save(KEY_MOCK,run._m)}draw(run)};
  const nx=$("#next"); if(nx)nx.onclick=()=>go2(run.cur+1);
  const pv=$("#prev"); if(pv)pv.onclick=()=>go2(run.cur-1);
  const sb=$("#submit"); if(sb)sb.onclick=()=>{ if(timed){ const un=run.answers.filter(x=>x==null).length; if(un>0&&!confirm(`${un} question(s) unanswered. Submit anyway?`))return; } if(run.mock){finishMockSubject(run,false)} else finish(run,false) };
  app.querySelectorAll("[data-j]").forEach(b=>b.onclick=()=>go2(+b.dataset.j));
  const qb=$("#quit"); if(qb)qb.onclick=()=>{ if(confirm("Quit this attempt? It will not be saved.")){stopTimer();localStorage.removeItem(KEY_RUN);localStorage.removeItem(KEY_MOCK);go(run.mock?"#/mock":"#/subject/"+run.subject)} };
}

function finish(run,timeout){
  stopTimer();
  if(run.finished)return;
  run.finished=true;
  const total=run.qs.length;
  let score=0; run.qs.forEach((q,i)=>{if(run.answers[i]===q.a)score++});
  const secs=Math.min(run.limit||Infinity,Math.round((Date.now()-run.started)/1000));
  const percent=Math.round(score/total*100);
  const rec={id:String(Date.now()),subject:run.subject,set:run.set,mode:run.mode,score,total,percent,seconds:secs,date:new Date().toISOString(),timedOut:!!timeout};
  const h=load(KEY_HIST,[]); h.unshift(rec); save(KEY_HIST,h);
  // remember served questions so the next draw prefers fresh ones
  markSeen(run.qs.map(q=>run.subject+"|"+q.q));
  localStorage.removeItem(KEY_RUN);
  results(run,rec);
}

function results(run,rec){
  const rows=run.qs.map((q,i)=>{const a=run.answers[i];const ok=a===q.a;
    return `<div class="review"><b>Q${i+1}. ${esc(q.q)}</b>
    <div class="ans">Your answer: ${a==null?"<i>none</i>":(ok?"<span style='color:var(--ok)'>":"<span style='color:var(--bad)'>")+L[a]+". "+esc(q.o[a])+"</span>"}</div>
    ${ok?`<div class="muted">${esc(q.e)}</div>`:teachBlock(run.subject,q,a)}</div>`}).join("");
  app.innerHTML=`<h1>Results</h1>${rec.timedOut?`<p class="muted">Time ran out. Your answers were submitted automatically.</p>`:""}
  <div class="card"><div class="score">${rec.score}/${rec.total}</div><div class="score" style="font-size:1.4rem">${rec.percent}%</div>
  <div class="grade">${gradeOf(rec.percent)}</div>
  <p class="muted" style="text-align:center">${esc(run.set)} · ${rec.mode==="timed"?"Timed":"Practice"} · time ${fmtT(rec.seconds)}</p>
  <div class="row" style="justify-content:center"><a class="btn" href="#/quiz/retry">Retry</a><a class="btn alt" href="#/subject/${run.subject}">Back to subject</a>${shareButton(rec.score,rec.total)}</div></div>
  ${workCard(run.qs.map((q,i)=>({sub:run.subject,q:q.q,ok:run.answers[i]===q.a})))}
  <div class="card"><h2>Review</h2>${rows}</div>`;
  const rt=$("a[href='#/quiz/retry']"); if(rt)rt.onclick=(e)=>{e.preventDefault();startQuiz(run.subject,run.idx,run.mode)};
  bindShare();
}

// ---------- mock exam: 4 subjects, one sitting, timed ----------
function mockStart(){
  app.innerHTML=`<a href="#/">&larr; Back</a><h1>Mock exam</h1>
  <p class="muted">Like JAMB: 4 subjects in one sitting. Pick English plus three subjects from your department. Each subject gets 15 questions, 60 seconds each, 15 minutes per subject.</p>
  <div class="card"><b>Pick your 4 subjects</b><div id="mpick" style="margin-top:8px">${SUBJECTS.map(s=>`<label style="display:block;padding:6px 0"><input type="checkbox" value="${s}" ${s==="english"?"checked":""}> ${esc(nameOf(s))}</label>`).join("")}</div>
  <div class="row" style="margin-top:10px"><button class="btn" id="mgo">Start mock</button></div><div id="merr" class="muted"></div></div>`;
  $("#mgo").onclick=()=>{
    const pick=[...app.querySelectorAll("#mpick input:checked")].map(i=>i.value);
    if(pick.length!==4){$("#merr").textContent="Pick exactly 4 subjects. You picked "+pick.length+".";return}
    if(!pick.includes("english")){$("#merr").textContent="English must be one of the 4 subjects, as in JAMB.";return}
    const subjects=pick.map(sub=>{const set=setsOf(sub)[0];const qs=buildRun(sub,set,"timed");return {subject:sub,set:set.name,qs:qs.map(q=>({q:q.q,o:q.o,a:q.a,e:q.e}))}});
    const run={mock:true,mockIdx:0,subjects,results:[],cur:0,answers:[],started:Date.now(),limit:15*60,mode:"timed",finished:false,subject:"mock",set:"Mock exam",qs:subjects[0].qs,idx:0};
    save(KEY_MOCK,run);
    // the route is the single entry point; it loads KEY_MOCK and starts the run once
    if(location.hash==="#/mock/run") route(); else location.hash="#/mock/run";
  };
}
function runMock(m){
  stopTimer();
  const cur=m.subjects[m.mockIdx];
  if(!Array.isArray(m.answers))m.answers=[];
  if(typeof m.cur!=="number")m.cur=0;
  const run={mock:true,mockIdx:m.mockIdx,subject:cur.subject,set:cur.set,mode:"timed",qs:cur.qs,answers:m.answers,cur:m.cur,started:m.started,limit:m.limit,finished:false,idx:0,_m:m};
  const tick=()=>{
    const left=m.limit-(Date.now()-m.started)/1000;
    const t=$("#tm"); if(t){t.textContent=fmtT(left);t.classList.toggle("low",left<60)}
    if(left<=0){stopTimer();finishMockSubject(run,true)}
  };
  timerId=setInterval(tick,500);
  draw(run);
  // keep a copy of answers in the mock record for resume
  const origSave=save;
}
function finishMockSubject(run,timeout){
  stopTimer();
  const m=load(KEY_MOCK,null);
  if(!m)return;
  const cur=m.subjects[m.mockIdx];
  let score=0; cur.qs.forEach((q,i)=>{if(run.answers[i]===q.a)score++});
  m.results.push({subject:cur.subject,set:cur.set,answers:run.answers.slice(),score,total:cur.qs.length,timedOut:!!timeout,qs:cur.qs});
  m.mockIdx++;
  if(m.mockIdx<m.subjects.length){
    m.started=Date.now(); m.limit=15*60; m.answers=[]; m.cur=0;
    save(KEY_MOCK,m);
    runMock(m);
  } else {
    save(KEY_MOCK,m);
    mockSheet(m);
  }
}
function mockSheet(m){
  const total=m.results.reduce((s,r)=>s+r.total,0);
  const got=m.results.reduce((s,r)=>s+r.score,0);
  const pct=Math.round(got/total*100);
  const rec={id:String(Date.now()),subject:"mock",set:"Mock exam",mode:"mock",score:got,total,percent:pct,seconds:0,date:new Date().toISOString(),timedOut:false,parts:m.results.map(r=>({subject:r.subject,score:r.score,total:r.total}))};
  const h=load(KEY_HIST,[]); h.unshift(rec); save(KEY_HIST,h);
  m.results.forEach(r=>markSeen(r.qs.map(q=>r.subject+"|"+q.q)));
  localStorage.removeItem(KEY_MOCK); localStorage.removeItem(KEY_RUN);
  const rows=m.results.map(r=>`<div class="hist"><div><b>${esc(nameOf(r.subject))}</b><div class="muted">${r.score}/${r.total}${r.timedOut?" · timed out":""}</div></div><div class="score" style="font-size:1.2rem">${Math.round(r.score/r.total*100)}%</div></div>`).join("");
  app.innerHTML=`<h1>Mock exam score sheet</h1>
  <div class="card"><div class="score">${got}/${total}</div><div class="score" style="font-size:1.4rem">${pct}%</div><div class="grade">${gradeOf(pct)}</div>
  <p class="muted" style="text-align:center">Total across 4 subjects. Score sheet saved to History.</p></div>
  <div class="card">${rows}</div>
  ${workCard(m.results.flatMap(r=>r.qs.map((q,i)=>({sub:r.subject,q:q.q,ok:r.answers[i]===q.a}))))}
  <div class="row" style="justify-content:center"><a class="btn" href="#/mock">Another mock</a><a class="btn alt" href="#/">Home</a>${shareButton(got,total)}</div>`;
  bindShare();
}

function history(){
  const h=load(KEY_HIST,[]);
  if(!h.length){app.innerHTML=`<h1>Score history</h1><div class="empty">No attempts saved yet.</div><a class="btn" href="#/">Start practising</a>`;return}
  const pts=h.slice().reverse();
  const W=600,H=160,pad=24;
  const xs=pts.map((_,i)=>pad+(pts.length===1?(W-2*pad)/2:i*(W-2*pad)/(pts.length-1)));
  const ys=pts.map(a=>H-pad-(a.percent/100)*(H-2*pad));
  const path=pts.length>1?"M"+xs.map((x,i)=>x.toFixed(1)+" "+ys[i].toFixed(1)).join(" L"):"";
  const dots=xs.map((x,i)=>`<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="4" fill="#0f766e"/>`).join("");
  const svg=`<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#ccd" /><path d="${path}" fill="none" stroke="#0f766e" stroke-width="2"/>${dots}</svg>`;
  const list=h.map(a=>`<div class="hist"><div><b>${a.mode==="mock"?"Mock exam":esc(nameOf(a.subject))}</b> · ${esc(a.set)}<div class="muted">${a.mode==="timed"?"Timed":a.mode==="mock"?"4 subjects":"Practice"} · ${a.score}/${a.total} (${a.percent}%) · ${fmtT(a.seconds)} · ${new Date(a.date).toLocaleString()}</div></div><button class="btn small danger" data-del="${a.id}">Delete</button></div>`).join("");
  app.innerHTML=`<a href="#/">&larr; Home</a><h1>Score history</h1><div class="card"><div class="muted">Percent over time (oldest left, newest right)</div>${svg}</div>
  <div class="card">${list}</div><div class="row"><button class="btn danger" id="clear">Clear all history</button></div>`;
  app.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{if(confirm("Delete this attempt?")){save(KEY_HIST,load(KEY_HIST,[]).filter(a=>a.id!==b.dataset.del));history()}});
  $("#clear").onclick=()=>{if(confirm("Clear all saved attempts?")){localStorage.removeItem(KEY_HIST);history()}};
}

// ---------- learn ----------
const LESSON_SUBJECTS=()=>window.LESSONS||[];
function findSubj(slug){return LESSON_SUBJECTS().find(s=>s.slug===slug)}
function learnIndex(){
  const cards=LESSON_SUBJECTS().map(s=>`<a class="card set" href="#/learn/${s.slug}" style="text-decoration:none;color:inherit"><div><b>${esc(s.name)}</b><div class="muted">${s.topics.length} lesson${s.topics.length===1?"":"s"}: ${s.topics.slice(0,4).map(t=>esc(t.title.split(" (")[0])).join(", ")}</div></div><span class="btn small">Open</span></a>`).join("");
  app.innerHTML=`<a href="#/">&larr; Back</a><h1>Learn the tricks</h1><p class="muted">Short lessons with tricks and methods for solving WAEC and JAMB questions. Read one, then try it.</p>${cards||`<div class="empty muted">No lessons yet.</div>`}`;
}
function learnSubject(slug){
  const s=findSubj(slug);
  if(!s){app.innerHTML=`<a href="#/learn">&larr; Learn</a><div class="empty">Lessons not found.</div>`;return}
  const rows=s.topics.map(t=>`<a class="card set lesson-row" href="#/learn/${s.slug}/${t.id}" style="text-decoration:none;color:inherit"><div><b>${esc(t.title)}</b><div class="muted">${esc(t.summary)}</div></div><span class="muted">&rsaquo;</span></a>`).join("");
  app.innerHTML=`<a href="#/learn">&larr; Learn</a><h1>${esc(s.name)}</h1><p class="muted">Pick a topic to read.</p>${rows}`;
}
function learnLesson(slug,id){
  const s=findSubj(slug);
  const i=s?s.topics.findIndex(t=>t.id===id):-1;
  if(i<0){app.innerHTML=`<a href="#/learn">&larr; Learn</a><div class="empty">Lesson not found.</div>`;return}
  const t=s.topics[i], prev=s.topics[i-1], next=s.topics[i+1];
  const pts=t.points.map(p=>`<li>${esc(p)}</li>`).join("");
  const tip=t.tip?`<p class="muted"><b>Tip:</b> ${esc(t.tip)}</p>`:"";
  const ex=t.example?`<div class="expl"><b>Quick example</b><div>${esc(t.example)}</div></div>`:"";
  const pn=`<div class="row lesson-nav" style="justify-content:space-between;margin-top:16px">${prev?`<a class="btn small alt" href="#/learn/${s.slug}/${prev.id}">&larr; Previous lesson</a>`:`<span></span>`}${next?`<a class="btn small alt" href="#/learn/${s.slug}/${next.id}">Next lesson &rarr;</a>`:`<span></span>`}</div>`;
  app.innerHTML=`<a href="#/learn/${s.slug}">&larr; ${esc(s.name)}</a><h1>${esc(t.title)}</h1><div class="card"><ul class="lesson-points">${pts}</ul>${tip}${ex}</div>
  <a class="btn wide" href="${s.tryHash}">Try it</a>${pn}`;
}

function route(){
  stopTimer();
  const hsh=location.hash||"#/";
  const parts=hsh.replace(/^#\//,"").split("/");
  if(parts[0]==="subject")return subject(parts[1]);
  if(parts[0]==="dept")return deptPage(parts[1]);
  if(parts[0]==="course")return coursePage();
  if(parts[0]==="mock"){
    if(parts[1]==="run"){const m=load(KEY_MOCK,null); if(m&&m.subjects&&m.mockIdx<m.subjects.length)return runMock(m); return mockStart()}
    return mockStart();
  }
  if(parts[0]==="history")return history();
  if(parts[0]==="account"){ if(window.renderAccount)return window.renderAccount(); return home() }
  if(parts[0]==="learn"){
    if(!parts[1])return learnIndex();
    if(!parts[2])return learnSubject(parts[1]);
    return learnLesson(parts[1],parts[2]);
  }
  if(parts[0]==="quiz"){ const r=load(KEY_RUN,null); if(r&&!r.finished){ if(r.mode==="timed"&&r.limit-(Date.now()-r.started)/1000<=0){finish(r,true);return} return runQuiz(r) } return home() }
  return home();
}
window.addEventListener("hashchange",route);
(function ensureThemeButton(){
  let b=document.getElementById("theme");
  if(!b){
    const nav=document.querySelector("header.top nav")||document.querySelector("header.top");
    if(!nav)return;
    b=document.createElement("button");
    b.id="theme"; b.type="button"; b.className="theme-btn";
    nav.appendChild(b);
  }
  b.onclick=toggleTheme;
})();
applyTheme(currentTheme());
window.addEventListener("load",()=>{
  const r=load(KEY_RUN,null);
  if(r&&!r.finished&&!location.hash.startsWith("#/quiz")&&confirm("You have an unfinished "+r.mode+" attempt ("+r.set+"). Resume it?")){location.hash="#/quiz";return}
  if(r&&!r.finished&&!location.hash.startsWith("#/quiz")){localStorage.removeItem(KEY_RUN)}
  route();
});
if(document.readyState!=="loading")route();
})();
