/* Eli\'s World AI planner + task notifications. Loads after app.js (shares its globals). */
let swReg=null;try{navigator.serviceWorker&&navigator.serviceWorker.register('sw.js').then(r=>swReg=r).catch(()=>{})}catch(e){}
function notifyUser(title,body){toast(title+': '+body);if(!('Notification' in window)||Notification.permission!='granted')return;
 try{swReg&&swReg.showNotification?swReg.showNotification(title,{body,tag:title+body}):new Notification(title,{body})}catch(e){try{new Notification(title,{body})}catch(x){}}}
/* ---------- task reminders + morning brief ---------- */
function fireDue(){const n=new Date(),today=ds(n),nm=nowM();let ch=false;
 const due=[...S.reminders.map(r=>({r,text:r.text})),...S.tasks.filter(t=>t.time&&!t.done).map(t=>({r:t,text:t.text}))];
 due.forEach(({r,text})=>{if(r.fired||!r.time)return;const t=new Date(r.date+'T'+r.time+':00');if(t<=n){r.fired=true;ch=true;const late=Math.round((n-t)/60000);notifyUser(late>45?'Missed reminder':'Reminder',text+(late>45?' (was due '+fmt(r.time)+')':''))}});
 if(S.brief!==false&&S.briefDate!=today&&nm>=450&&nm<=720){S.briefDate=today;ch=true;const t=S.tasks.filter(x=>x.date==today&&!x.done).length,nc=nextClass();
  notifyUser('Good morning, Eli',(nc?'Next class: '+nc.b.t.replace(/ \(.*/,'')+' ('+nc.when+'). ':'')+(t?t+' task'+(t>1?'s':'')+' today.':'Your day is open.'))}
 if(ch){save();if(!document.activeElement.matches('input,textarea,select'))render()}}
setInterval(fireDue,20000);setTimeout(fireDue,1500);
/* ---------- tools the AI can use to change the dashboard ---------- */
const T=(name,description,props,req)=>({name,description,input_schema:{type:'object',properties:props,required:req||[]}});
const str=d=>({type:'string',description:d}),KINDS=['class','inflip','forex','exercise','work','routine'];
const TOOLS=[
 T('add_block','Add a schedule block. Give "date" for a one-off (a single day) or "weekdays" (0=Sun..6=Sat) for a weekly repeat.',{title:str('Name'),start:str('HH:MM 24h'),end:str('HH:MM 24h'),kind:{type:'string',enum:KINDS},location:str('Optional place'),date:str('YYYY-MM-DD for one-off'),weekdays:{type:'array',items:{type:'integer'}}},['title','start','end','kind']),
 T('update_block','Change a block by id (use ids from the context).',{id:str('Block id'),title:str(''),start:str('HH:MM'),end:str('HH:MM'),location:str('')},['id']),
 T('remove_block','Remove a block. For a weekly block, pass "date" to skip only that day; omit date to delete it everywhere.',{id:str('Block id'),date:str('YYYY-MM-DD')},['id']),
 T('add_task','Add a to-do on the checklist. Give "time" (HH:MM) to get a notification then.',{text:str('Task'),date:str('YYYY-MM-DD, default today'),time:str('HH:MM optional')},['text']),
 T('complete_task','Tick or untick a custom task by id.',{id:str('Task id'),done:{type:'boolean'}},['id','done']),
 T('add_reminder','Send a notification at a set time.',{text:str('What to remind'),date:str('YYYY-MM-DD'),time:str('HH:MM')},['text','date','time']),
 T('add_assignment','Add an assignment, quiz or exam deadline.',{title:str(''),course:str(''),type:{type:'string',enum:['Assignment','Quiz','Exam']},due:str('YYYY-MM-DD')},['title','due']),
 T('add_inflip_task','Add a task to the INFLIP project tracker.',{text:str('')},['text']),
 T('update_inflip','Move an INFLIP task: 0 to do, 1 doing, 2 done.',{id:str(''),status:{type:'integer',enum:[0,1,2]}},['id','status']),
 T('open_tab','Switch the dashboard to a tab.',{tab:{type:'string',enum:NAV.map(n=>n[0])}},['tab'])];
const hh=t=>{const m=String(t).match(/^(\d{1,2}):(\d{2})$/);return m&&+m[1]<24&&+m[2]<60?m[1].padStart(2,'0')+':'+m[2]:null},okd=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'');
function runTool(n,i){try{switch(n){
 case'add_block':{const s=hh(i.start),e=hh(i.end);if(!s||!e)return'Error: bad time';const k=KINDS.includes(i.kind)?i.kind:'work',mk=d=>({id:uid(),d,s,e,t:i.title,k,loc:i.location||'',c:''});
  if(okd(i.date)){S.blocks.push({...mk(new Date(i.date+'T00:00').getDay()),date:i.date});return'Added one-off block on '+i.date}
  const w=(i.weekdays||[]).filter(d=>d>=0&&d<=6);if(!w.length)return'Error: need date or weekdays';w.forEach(d=>S.blocks.push(mk(d)));return'Added weekly block on '+w.map(d=>DAYS[d]).join(', ')}
 case'update_block':{const b=S.blocks.find(x=>x.id==i.id);if(!b)return'Error: block not found';if(i.title)b.t=i.title;if(hh(i.start))b.s=hh(i.start);if(hh(i.end))b.e=hh(i.end);if(i.location!=null)b.loc=i.location;return'Updated '+b.t}
 case'remove_block':{const b=S.blocks.find(x=>x.id==i.id);if(!b)return'Error: block not found';if(okd(i.date)&&!b.date){(S.skips[i.date]=S.skips[i.date]||[]).push(b.id);return'Skipped '+b.t+' on '+i.date}S.blocks=S.blocks.filter(x=>x.id!=i.id);return'Removed '+b.t}
 case'add_task':S.tasks.push({id:uid(),date:okd(i.date)?i.date:ds(new Date()),text:i.text,time:hh(i.time)||'',done:false});return'Added task'+(hh(i.time)?' with a '+hh(i.time)+' notification':'');
 case'complete_task':{const t=S.tasks.find(x=>x.id==i.id);if(!t)return'Error: task not found';t.done=!!i.done;return'Task '+(t.done?'done':'reopened')}
 case'add_reminder':if(!okd(i.date)||!hh(i.time))return'Error: bad date or time';S.reminders.push({id:uid(),date:i.date,time:hh(i.time),text:i.text,fired:false});return'Reminder set for '+i.date+' '+hh(i.time);
 case'add_assignment':if(!okd(i.due))return'Error: bad date';S.work.push({id:uid(),done:false,title:i.title,course:i.course||'',type:i.type||'Assignment',due:i.due});return'Added deadline';
 case'add_inflip_task':S.inflip.push({id:uid(),t:i.text,st:0});return'Added INFLIP task';
 case'update_inflip':{const t=S.inflip.find(x=>x.id==i.id);if(!t)return'Error: not found';t.st=i.status;return'Updated INFLIP task'}
 case'open_tab':if(NAV.some(x=>x[0]==i.tab)){tab=i.tab;return'Opened '+i.tab}return'Error: unknown tab'}}catch(e){return'Error: '+e.message}return'Error: unknown tool'}
/* ---------- context + system prompt ---------- */
function context(){const n=new Date(),today=ds(n),L=blocksFor(n.getDay(),today),line=b=>b.id+' | '+b.s+'-'+b.e+' | '+b.t+' | '+b.k+(b.loc?' | '+b.loc:'')+(b.date?' | one-off':''),W=week(),tom=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1);
 return 'NOW: '+FULL[n.getDay()]+' '+today+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+'\nTODAY BLOCKS (id | time | title | kind):\n'+(L.map(line).join('\n')||'none')+
 '\nTOMORROW ('+FULL[tom.getDay()]+') BLOCKS:\n'+(blocksFor(tom.getDay(),ds(tom)).map(line).join('\n')||'none')+
 '\nWEEKLY CLASSES:\n'+ORDER.map(d=>blocksFor(d).filter(b=>b.k=='class').map(b=>DAYS[d]+' '+b.s+'-'+b.e+' '+b.t).join('; ')).filter(Boolean).join('\n')+
 '\nCUSTOM TASKS (id | date | done | time | text):\n'+(S.tasks.filter(t=>t.date>=today).slice(-15).map(t=>t.id+' | '+t.date+' | '+t.done+' | '+(t.time||'-')+' | '+t.text).join('\n')||'none')+
 '\nDAILY CHECKLIST DONE TODAY: '+Object.keys(S.done[today]||{}).filter(k=>S.done[today][k]).join(', ')+
 '\nOPEN DEADLINES:\n'+(S.work.filter(w=>!w.done).map(w=>w.title+' ('+w.type+', '+w.course+') due '+w.due).join('\n')||'none')+
 '\nINFLIP TASKS (id | status 0/1/2 | text):\n'+(S.inflip.filter(t=>t.st<2).map(t=>t.id+' | '+t.st+' | '+t.t).join('\n')||'none')+
 '\nTHIS WEEK: exercise '+W.ex+'/3, INFLIP days '+W.inf+'/7, forex entries '+W.fx+', avg sleep '+(W.avg?W.avg.toFixed(1)+'h':'n/a')}
const SYS='You are the AI planner inside Eli\'s World, the personal planner of Elijah (Eli), a Computer Science Year 1 student at Lancaster University Ghana in Accra. Eli\'s routine: wakes 7:00, sleeps 11:30 PM, commute under 30 minutes, 1 hour of INFLIP (his app project) daily, learns forex, exercises 3 days a week, longer work sessions on Saturday and Sunday. Your job is to plan his day and keep the dashboard accurate. Use the tools to actually make changes (add or move blocks, add tasks, set reminders), then say briefly what you changed. Rules: never move or delete class blocks unless he asks; keep plans realistic with breaks and meals; respect sleep and the daily INFLIP hour; check the block list for clashes before adding; use one-off blocks (date) for changes to a single day; when he wants a notification, use add_reminder or add_task with a time. Be casual, direct and short. If he asks you to write his assignments, coach him with structure and feedback instead of writing it for him. Only the data in the context is real; do not invent classes or deadlines.';
/* ---------- chat panel ---------- */
const AI={busy:false,open:false};
function el(h){const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild}
document.body.append(el('<button id="aifab" aria-label="Open AI planner">✨ AI Planner</button>'),el('<section id="aip" hidden aria-label="AI planner"><header><b>✨ AI Planner</b><span><button data-ai="clear" aria-label="Clear chat">Clear</button><button data-ai="close" aria-label="Close">×</button></span></header><div id="aim"></div><div id="aichips"></div><form id="aif"><textarea id="ait" rows="1" placeholder="Ask me to plan your day..." aria-label="Message"></textarea><button>Send</button></form></section>'));
const msgs=()=>$('#aim');
function bubble(role,html){const d=el('<div class="m '+role+'">'+html+'</div>');msgs().append(d);msgs().scrollTop=msgs().scrollHeight;return d}
const md=t=>esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
function setup(){msgs().innerHTML='';if(!S.key){bubble('ai','To use the planner, paste your Anthropic API key. It is saved only in this browser.<form id="keyf"><input type="password" id="keyi" placeholder="sk-ant-..." aria-label="API key" required><button>Save</button></form><span class="mut">Get one at console.anthropic.com and set a low monthly spend limit.</span>');return}
 S.chat.forEach(m=>bubble(m.r=='user'?'me':'ai',md(m.t)));if(!S.chat.length)bubble('ai','Hey Eli. Tell me what you need today and I\'ll plan it and update your dashboard.');
 $('#aichips').innerHTML=['Plan my day','What\'s next?','Remind me about my tasks','Plan tomorrow'].map(c=>'<button data-ai="chip">'+c+'</button>').join('')}
function toggle(o){AI.open=o;$('#aip').hidden=!o;$('#aifab').hidden=o;if(o){setup();setTimeout(()=>$('#ait')&&$('#ait').focus(),50)}}
async function send(text){if(AI.busy||!text.trim())return;AI.busy=true;bubble('me',md(text));const wait=bubble('ai','<span class="mut">Thinking…</span>');
 const hist=S.chat.slice(-12).map(m=>({role:m.r,content:m.t})),convo=[...hist,{role:'user',content:text}];let reply='';
 try{for(let i=0;i<6;i++){const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':S.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
   body:JSON.stringify({model:S.model||'claude-sonnet-5-5',max_tokens:1500,system:SYS+'\n\n'+context(),tools:TOOLS,messages:convo})});
  const j=await r.json();if(!r.ok)throw new Error(r.status==401?'That API key was rejected. Check it in Settings.':(j.error&&j.error.message)||'Request failed ('+r.status+')');
  convo.push({role:'assistant',content:j.content});const txt=j.content.filter(b=>b.type=='text').map(b=>b.text).join('\n').trim();if(txt)reply+=(reply?'\n':'')+txt;
  const uses=j.content.filter(b=>b.type=='tool_use');if(j.stop_reason!='tool_use'||!uses.length)break;
  const res=uses.map(u=>{const out=runTool(u.name,u.input||{});wait.insertAdjacentHTML('beforebegin','<div class="m act">'+(out.startsWith('Error')?'⚠️ ':'✓ ')+esc(out)+'</div>');return{type:'tool_result',tool_use_id:u.id,content:out}});
  convo.push({role:'user',content:res});save();render()}
  wait.remove();bubble('ai',md(reply||'Done.'));S.chat.push({r:'user',t:text},{r:'assistant',t:reply||'Done.'});S.chat=S.chat.slice(-20);save();render();fireDue()}
 catch(e){wait.remove();bubble('ai','⚠️ '+esc(e.message||'Could not reach the AI. Check your connection and key.'))}
 AI.busy=false}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai]'),f=e.target.closest('#aifab');if(f)return toggle(true);if(!b)return;const a=b.dataset.ai;
 if(a=='close')toggle(false);else if(a=='clear'){S.chat=[];save();setup()}else if(a=='chip')send(b.textContent);else if(a=='aiopen')toggle(true)});
document.addEventListener('submit',e=>{if(e.target.id=='aif'){e.preventDefault();const t=$('#ait');const v=t.value;t.value='';send(v)}
 if(e.target.id=='keyf'){e.preventDefault();S.key=$('#keyi').value.trim();save();setup()}},true);
document.addEventListener('keydown',e=>{if(e.target.id=='ait'&&e.key=='Enter'&&!e.shiftKey){e.preventDefault();$('#aif').requestSubmit()}});
/* ---------- settings card ---------- */
const baseSettings=views.Settings;
views.Settings=()=>baseSettings()+card('AI planner and notifications','<form data-f="setAI"><input type="password" name="key" placeholder="Anthropic API key" value="'+esc(S.key||'')+'" autocomplete="off"><input type="text" name="model" placeholder="Model" value="'+esc(S.model||'claude-sonnet-5-5')+'"><label class="mut"><input type="checkbox" name="brief" '+(S.brief!==false?'checked':'')+'> Morning briefing at 7:30</label><button>Save</button></form><p class="mut">Your key stays in this browser and is sent only to Anthropic. Use it for personal use only; never put it in files you share.</p><button class="btn" data-a="notify">Turn on notifications</button>','mt');
forms.setAI=f=>{S.key=(f.key||'').trim();S.model=(f.model||'').trim()||'claude-sonnet-5-5';S.brief=f.brief=='on';toast('Saved.')};
