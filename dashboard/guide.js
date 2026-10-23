import {$,element,copy} from './helpers.js';
const langs={python:{file:'strategy.py',requires:'Python 3.8+ · standard library only',files:'bot.py\n    ├── strategy.py\n    ├── SUBMISSION.md',build:''},cpp:{file:'strategy.cpp',requires:'Python 3.8+ wrapper · g++ with C++17',files:'bot.py\n    ├── strategy.cpp\n    ├── build.py\n    ├── SUBMISSION.md',build:'\nFor C++, add "build": ["{python}", "build.py"] to your roster entry.'},julia:{file:'strategy.jl',requires:'Python 3.8+ wrapper · Julia 1.6+',files:'bot.py\n    ├── strategy.jl\n    ├── SUBMISSION.md',build:''}};
function code(text){const box=element('div','codeblock'),pre=element('pre','',text),b=element('button','copy-button','Copy');b.onclick=()=>copy(text);box.append(pre,b);return box;}
function step(number,title){const section=element('section','guide-step'),h=element('h2');h.append(element('span','',number),document.createTextNode(title));section.append(h);return section;}
let audience='player', selectedLanguage='python';
export function renderGuide(lang=selectedLanguage){
 selectedLanguage=lang;
 document.querySelector('.guide-layout').classList.toggle('host-guide',audience==='host');
 if(audience==='host'){renderHost(lang);return;}
 const l=langs[lang],root=$('guide-steps');root.replaceChildren();
 const one=step('01','Copy the template');one.append(code(`cp -R bots/templates/${lang} bots/YOUR_NETID`),element('p','',`On Windows, copy the entire folder in File Explorer. ${l.requires}. Keep bot.py and the supplied transport/build code intact; edit ${l.file}.`));
 const two=step('02','Implement both roles'),roles=element('div','role-guide');
 const p=element('div'),m=element('div');p.append(element('h3','','Person (P)'),element('code','','set_preferences(state)'),element('code','','modify_preferences(state)'),element('p','','Set legal weights and ideal / anti-ideal candidates. See each proposal, then optionally change preferences.'));m.append(element('h3','','Matchmaker (M)'),element('code','','propose_candidate(state)'),element('p','','Learn from the initial 20 examples and prior scores. Propose up to 20 candidates to find the ideal match.'));roles.append(p,m);two.append(roles,element('p','','C++ and Julia expose the same operations through function arguments. Send debug output to stderr, not stdout.'));
 const three=step('03','Register and test a full pairing');const roster=element('details','roster-example');roster.append(element('summary','','Show bots.local.json roster example'),code(JSON.stringify([{name:'Sample A',cwd:'bots/templates/python',command:['{python}','bot.py']},{name:'My Bot',cwd:'bots/YOUR_NETID',command:['{python}','bot.py'],...(lang==='cpp'?{build:['{python}','build.py']}:{})}],null,2)));three.append(roster,element('p','','Save the roster as bots.local.json.'+l.build),code('python3 start.py match "My Bot" "Sample A"  --bots bots.local.json --n 200'),element('p','','Check failure is null in both games. Also test n=20 and n=100. A fresh process starts when the roles swap.'));
 const four=step('04','Email the complete ZIP · 提交完整压缩包');four.append(code(`dating-YOUR_NETID.zip\n└── YOUR_NETID/\n    ├── ${l.files}\n    └── resources/  (if needed)`),element('p','','Fill in SUBMISSION.md with your NetID, bot name, runtime/compiler version, dependencies, build and launch commands, source version and test results. Zip the complete folder as dating-YOUR_NETID.zip and email the attachment to zx1946@nyu.edu. Subject: [Dating Game] YOUR_NETID — Bot name. Submit both roles in one program, not just a strategy source file. Deadline: to be announced.'));
 root.append(one,two,three,four);
 for(const b of document.querySelectorAll('[data-lang]')){b.classList.toggle('active',b.dataset.lang===lang);b.setAttribute('aria-pressed',String(b.dataset.lang===lang));}
}


function renderHost(lang){
 const root=$('guide-steps');root.replaceChildren();
 const one=step('01','Unzip into bots/ · 收到后放在哪里');
 one.append(element('p','','解压每人的完整 ZIP，将以 NetID 命名的文件夹放进项目的 bots/。确认 bot.py 直接位于该文件夹内，避免多套一层目录。'),code('dating-game/\n├── start.py\n├── bots.local.json\n└── bots/\n    ├── aa111/\n    │   ├── bot.py\n    │   ├── strategy.py\n    │   └── SUBMISSION.md\n    └── bb222/\n        ├── bot.py\n        └── …'),element('p','','Read each SUBMISSION.md and install its declared runtime and dependencies first. Python / C++ / Julia templates all launch through bot.py. The folder names here are examples: replace them with the actual NetIDs.'));
 const two=step('02','Register two bots · 登记参赛程序');
 const entry=(id)=>({name:id,cwd:'bots/'+id,command:['{python}','bot.py'],...(lang==='cpp'?{build:['{python}','build.py']}:{})});
 two.append(element('p','','在 start.py 同级新建 bots.local.json，复制下面的内容。name 是页面显示名，必须唯一；cwd 是实际文件夹路径。继续添加对象就能加入更多人。'),code(JSON.stringify([entry('aa111'),entry('bb222')],null,2)),element('p','','Choose the language above for the template build configuration. Mixed languages are allowed: only C++ entries need the build field. For a custom entry point, use the author’s declared command as an array of arguments.'));
 const three=step('03','Start the registered roster · 启动比赛页面');
 three.append(element('p','','先停止当前服务器（运行它的终端按 Ctrl+C），在 dating-game 项目目录执行：'),code('python start.py --bots bots.local.json --port 8092'),element('p','','macOS / Linux: use python3 if needed. Open http://127.0.0.1:8092. The --bots argument matters: without it, the server loads the bundled samples.'));
 const four=step('04','Select opponents and run · 选两个人开始');
 const list=element('ol');
 for(const text of ['Arena → Bot 1 选 aa111，Bot 2 选 bb222 → Start pairing。系统自动跑两局并交换角色，无需手动交换。','看顶部胜者、双方最高分和尝试次数；点 Game 1 / Game 2 查看对应曲线。若程序失败，展开 Match details 查看原因。','增加或更新参赛者后：修改同一个 bots.local.json，等比赛结束，在 More settings 点击 Rescan bot roster。刷新页面本身不会重新读取名单。','全部互相比赛：More settings → Every pair。Leaderboard 看累计结果；每场记录自动保存在 results/。'])list.append(element('li','',text));
 four.append(list);
 const verify=element('details','roster-example');verify.append(element('summary','','Before the event · 先做运行检查'),element('p','','先用下面的命令验证双方都能运行，再分别测试 --n 100 与 --n 200。两局 failure 应为 null；失败时先核对目录、依赖、入口和 stdout 的 JSON 格式。'),code('python start.py match aa111 bb222 --bots bots.local.json --n 20'),element('p','','The host runs programs as local subprocesses. Keep participant folders and bots.local.json private; both are excluded from Git by default.'));
 four.append(verify);root.append(one,two,three,four);
 for(const b of document.querySelectorAll('[data-lang]')){b.classList.toggle('active',b.dataset.lang===lang);b.setAttribute('aria-pressed',String(b.dataset.lang===lang));}
}
for(const b of document.querySelectorAll('[data-audience]'))b.onclick=()=>{
 audience=b.dataset.audience;
 for(const x of document.querySelectorAll('[data-audience]')){x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));}
 renderGuide();
};
