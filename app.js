(() => {
'use strict';

const STORAGE_KEY='egowheel.save.v3';
const AUDIO_KEY='egowheel.audio.v1';
const VERSION=3;
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>Math.random()*(b-a)+a;
const int=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const RARITY_ORDER=['common','uncommon','rare','epic','legendary','mythic'];
const RARITY_CHANCES={common:52,uncommon:28,rare:13,epic:5,legendary:1.5,mythic:.5};
const RARITY_LABELS={common:'Common',uncommon:'Uncommon',rare:'Rare',epic:'Epic',legendary:'Legendary',mythic:'Mythic'};
const RARITY_COLORS={common:'#77879b',uncommon:'#47b86a',rare:'#288fdb',epic:'#8659c7',legendary:'#d9a92d',mythic:'#dc405b'};

const ATTRS=[
 ['finishing','FINISHING'],['shotPower','SHOT POWER'],['dribbling','DRIBBLING'],['control','CONTROL'],
 ['speed','SPEED'],['acceleration','ACCELERATION'],['vision','VISION'],['passing','PASSING'],
 ['offBall','OFF BALL'],['physical','PHYSICAL'],['stamina','STAMINA'],['defense','DEFENCE'],
 ['reactions','REACTIONS'],['technique','TECHNIQUE'],['weakFoot','WEAK FOOT'],['ego','EGO']
];
const ATTR_KEYS=ATTRS.map(x=>x[0]);

function option(name,desc,rarity='common',effects={},short=null,meta={}){return{name,desc,rarity,effects,short:short||name,meta};}
function weighted(name,desc,weight,effects={},short=null,meta={}){return{name,desc,weight,effects,short:short||name,rarity:'common',meta};}

const MAIN_CHARACTERS=[
 'Yoichi Isagi','Rin Itoshi','Meguru Bachira','Seishiro Nagi','Reo Mikage','Shoei Barou','Hyoma Chigiri','Rensuke Kunigami',
 'Ryusei Shidou','Sae Itoshi','Oliver Aiku','Gin Gagamaru','Ikki Niko','Jyubei Aryu','Aoshi Tokimitsu','Tabito Karasu',
 'Eita Otoya','Yo Hiori','Kenyu Yukimiya','Ranze Kurona','Zantetsu Tsurugi','Jingo Raichi','Kiyora Jin','Nijiro Nanase',
 'Gurimu Igarashi','Asahi Naruhaya','Wataru Kuon','Junichi Wanima','Keisuke Wanima','Shuto Sendou','Miroku Darai',
 'Teppei Neru','Kazuma Niou','Gen Fukaku','Michael Kaiser','Alexis Ness','Don Lorenzo','Charles Chevalier','Agi'
];

const TEAM_DATA={
 'Team Z':{strength:61,stars:['Yoichi Isagi','Meguru Bachira','Hyoma Chigiri','Rensuke Kunigami','Gin Gagamaru','Jingo Raichi','Gurimu Igarashi']},
 'Team X':{strength:64,stars:['Shoei Barou']},
 'Team Y':{strength:59,stars:['Ikki Niko']},
 'Team W':{strength:61,stars:['Junichi Wanima','Keisuke Wanima']},
 'Team V':{strength:72,stars:['Seishiro Nagi','Reo Mikage','Zantetsu Tsurugi']}
};
const NEL_DATA={
 'Bastard München':{strength:91,master:'Noel Noa',stars:['Yoichi Isagi','Michael Kaiser','Alexis Ness','Rensuke Kunigami','Yo Hiori','Kenyu Yukimiya','Ranze Kurona','Kiyora Jin']},
 'Manshine City':{strength:87,master:'Chris Prince',stars:['Seishiro Nagi','Reo Mikage','Hyoma Chigiri','Agi']},
 'FC Barcha':{strength:82,master:'Lavinho',stars:['Meguru Bachira','Eita Otoya']},
 'Ubers':{strength:90,master:'Marc Snuffy',stars:['Shoei Barou','Oliver Aiku','Ikki Niko','Jyubei Aryu','Don Lorenzo']},
 'Paris X Gen':{strength:92,master:'Julian Loki',stars:['Rin Itoshi','Ryusei Shidou','Tabito Karasu','Aoshi Tokimitsu','Zantetsu Tsurugi','Nijiro Nanase','Charles Chevalier']}
};

const BUILD_STAGES=[
 {key:'position',chapter:'PLAYER CREATION',name:'Starting Position',prompt:'Where do you begin on the pitch?',mode:'equal',options:[
  option('Centre Forward','You begin closest to goal and live off finishing windows.','common',{finishing:5,shotPower:3,offBall:4,ego:2},'CF'),
  option('Second Striker','You attack between midfield and the centre-forward line.','common',{vision:4,passing:3,finishing:3,offBall:3},'SS'),
  option('Left Wing','You attack from the left before driving toward goal.','common',{speed:4,acceleration:4,dribbling:4},'LW'),
  option('Right Wing','You attack from the right before driving toward goal.','common',{speed:4,acceleration:4,dribbling:4},'RW'),
  option('False Nine','You leave the front line to manipulate space and create.','common',{vision:5,passing:4,control:3,offBall:2},'F9'),
  option('Attacking Midfielder','You begin as a creator with striker ambitions.','common',{vision:5,passing:5,technique:3},'AM'),
  option('Target Forward','You make strength, reach and finishing the basis of your game.','common',{physical:6,shotPower:4,finishing:2},'TARGET'),
  option('Pressing Forward','You create chances by hunting the ball as aggressively as the goal.','common',{stamina:5,defense:4,acceleration:3,ego:2},'PRESS')
 ]},
 {key:'foot',chapter:'PLAYER CREATION',name:'Dominant Foot',prompt:'Which side shapes your natural mechanics?',mode:'weights',options:[
  weighted('Right Foot','Your right side is the natural striking and passing platform.',55,{weakFoot:1},'RIGHT'),
  weighted('Left Foot','Your left-sided angles are less common and awkward to defend.',30,{technique:2,weakFoot:1},'LEFT'),
  weighted('Two-Footed','Neither side is merely a fallback; both are credible attacking tools.',15,{weakFoot:9,technique:3},'BOTH')
 ]},
 {key:'physique',chapter:'PLAYER CREATION',name:'Physical Profile',prompt:'What physical foundation do you bring into Blue Lock?',mode:'rarity',options:[
  option('Balanced Athlete','No dramatic edge, but no major physical weakness either.','common',{speed:2,physical:2,stamina:2}),
  option('Lean Runner','Repeated high-intensity movement comes naturally.','common',{speed:3,stamina:5,physical:-1}),
  option('Compact Build','A low centre of gravity supports turns and close control.','common',{dribbling:4,control:4,physical:1}),
  option('Tall Striker','Reach and leverage give you natural aerial presence.','common',{physical:4,shotPower:2,finishing:2}),
  option('Explosive Sprinter','The first five metres can separate you from a marker instantly.','uncommon',{acceleration:8,speed:5}),
  option('Power Frame','Contact rarely removes you from the action.','uncommon',{physical:9,shotPower:4}),
  option('Spring-Loaded Body','Elasticity helps with volleys, leaps and sudden direction changes.','rare',{acceleration:5,physical:5,technique:4}),
  option('Hyper-Flexible','Awkward body positions become usable football actions.','rare',{control:6,dribbling:5,technique:5}),
  option('Elite Genetic Specimen','Most athletic categories begin well above the project baseline.','epic',{speed:6,acceleration:6,physical:7,stamina:5}),
  option('Perfect Football Frame','Your body seems absurdly compatible with elite attacking football.','legendary',{speed:8,acceleration:8,physical:8,stamina:7,technique:3})
 ]},
 {key:'potential',chapter:'PLAYER CREATION',name:'Potential',prompt:'How quickly can your ability grow when Blue Lock starts applying pressure?',mode:'rarity',options:[
  option('Late Bloomer','Your current level is modest, but growth can arrive later.','common',{},null,{growth:.88,ceiling:84}),
  option('Solid Prospect','You have enough ceiling to become a professional with the right development.','common',{},null,{growth:1,ceiling:87}),
  option('High Potential','You respond unusually well to intense competition.','uncommon',{},null,{growth:1.12,ceiling:90}),
  option('National Prospect','Your growth rate and ceiling are already exceptional for your age.','rare',{},null,{growth:1.22,ceiling:93}),
  option('Prodigy','You learn advanced solutions much faster than most players.','epic',{},null,{growth:1.38,ceiling:96}),
  option('Genius','At least one part of your talent ignores ordinary development curves.','legendary',{},null,{growth:1.52,ceiling:98}),
  option('Generational Talent','Your career ceiling is realistically discussed in world-class terms.','mythic',{},null,{growth:1.7,ceiling:99})
 ]},
 {key:'primaryWeapon',chapter:'WEAPON',name:'Primary Weapon',prompt:'What first makes you dangerous enough to survive?',mode:'rarity',options:[
  option('Direct Shot','You strike before defenders can reset.','common',{finishing:7,reactions:3},'DIRECT SHOT'),
  option('Off-Ball Movement','You disappear from defensive attention and reappear in scoring space.','common',{offBall:8,vision:3},'OFF BALL'),
  option('Ball Control','Your first touch consistently creates the next action.','common',{control:8,technique:3},'CONTROL'),
  option('Long Shot','You force defenders to respect your range.','common',{shotPower:8,finishing:3},'LONG SHOT'),
  option('Acceleration','Your first burst creates separation before the race properly starts.','uncommon',{acceleration:10,speed:5},'BURST'),
  option('Creative Dribbling','You beat defenders through rhythm, feints and invention.','uncommon',{dribbling:10,control:5},'DRIBBLING'),
  option('Spatial Awareness','You constantly read the changing geometry of the field.','uncommon',{vision:10,offBall:5},'SPATIAL'),
  option('Trapping','Difficult passes become attacking opportunities through your first contact.','rare',{control:11,technique:6,finishing:3},'TRAP'),
  option('Predator Finishing','You read the keeper rather than merely aiming for the goal.','rare',{finishing:12,reactions:5,vision:3},'PREDATOR'),
  option('Puppet Passing','You manipulate teammate movement through delivery and timing.','rare',{passing:11,vision:7},'PUPPET'),
  option('Metavision Seed','Your scanning already hints at full-field predictive vision.','epic',{vision:14,offBall:7,reactions:5},'META SEED'),
  option('Chameleon Technique','You can reproduce useful fragments of techniques after understanding them.','epic',{technique:9,control:7,vision:6},'CHAMELEON'),
  option('Destroyer Instinct','Pressure makes your play more violent, direct and fearless.','legendary',{ego:13,finishing:8,physical:5},'DESTROYER'),
  option('Complete Ambidexterity','Both sides of your body function as real primary weapons.','mythic',{weakFoot:16,finishing:10,technique:8},'AMBIDEXTROUS')
 ]},
 {key:'secondaryWeapon',chapter:'WEAPON',name:'Secondary Weapon',prompt:'What keeps your main weapon useful when opponents adapt?',mode:'rarity',options:[
  option('One-Touch Passing','You keep combinations alive before pressure arrives.','common',{passing:6,vision:2}),
  option('Weak-Foot Training','Your weaker side becomes reliable enough to prevent easy defensive traps.','common',{weakFoot:6,technique:2}),
  option('Pressing Sense','You recognise pressing triggers before teammates do.','common',{defense:5,stamina:4,vision:2}),
  option('Ball Keeping','You protect possession until the next route opens.','common',{control:6,physical:3}),
  option('Stealth Movement','You attack blind spots instead of racing directly against defenders.','uncommon',{offBall:7,acceleration:3}),
  option('Kick Accuracy','Your passes and strikes repeatedly arrive in the intended zone.','uncommon',{passing:6,finishing:5,technique:3}),
  option('Vertical Leap','Your jumping reach changes which deliveries are playable.','uncommon',{physical:5,finishing:4}),
  option('Finesse Finish','Placement, disguise and timing matter more than raw force.','rare',{finishing:8,technique:5}),
  option('Counter-Pressing','Losing possession immediately triggers your best defensive work.','rare',{defense:8,stamina:5,ego:2}),
  option('Adaptive Dribbling','Your 1v1 choice changes according to the defender rather than a fixed move.','epic',{dribbling:9,vision:5,control:4}),
  option('Reflex Finishing','In chaotic box situations your body shoots before conscious planning catches up.','epic',{finishing:10,reactions:7}),
  option('Weapon Fusion','Your secondary tool naturally combines with your primary weapon.','legendary',{finishing:4,dribbling:4,vision:4,technique:5,ego:3})
 ]},
 {key:'egoStyle',chapter:'EGO',name:'Ego Style',prompt:'What kind of selfishness actually drives you?',mode:'equal',options:[
  option('Adaptation Addict','You enjoy being forced to become a different player.', 'common',{vision:3,ego:4}),
  option('The King','You want the field to orbit your scoring.', 'common',{finishing:3,ego:5}),
  option('Freedom Seeker','Rigid instructions suffocate you; improvisation unlocks your best football.', 'common',{dribbling:3,ego:4}),
  option('Puzzle Solver','Every match becomes a chain of information problems.', 'common',{vision:5,reactions:3}),
  option('Hunter','You wait for vulnerability and attack it without sentiment.', 'common',{finishing:3,offBall:4}),
  option('Showman','Flair, humiliation and spectacle are part of winning.', 'common',{dribbling:4,technique:3,ego:2}),
  option('Challenger','The stronger the opponent, the more alive you become.', 'common',{ego:5,physical:2}),
  option('Controller','You want to dictate which choices everyone else is allowed to make.', 'common',{vision:4,passing:4,ego:2})
 ]},
 {key:'firstTeam',chapter:'FIRST SELECTION',name:'First Selection Team',prompt:'Which stratum team receives you?',mode:'equal',options:[
  option('Team Z','The chaotic underdogs containing Isagi, Bachira, Chigiri, Kunigami and Gagamaru.','common',{},'TEAM Z'),
  option('Team X','A group rapidly pulled into Barou’s orbit.','common',{},'TEAM X'),
  option('Team Y','A more analytical side shaped by Niko’s reading of the field.','common',{},'TEAM Y'),
  option('Team W','A coordinated group led by the Wanima twins.','common',{},'TEAM W'),
  option('Team V','The strongest opening trio: Nagi, Reo and Zantetsu.','common',{},'TEAM V')
 ]}
];

const NEL_STAGE={key:'nelClub',chapter:'NEO EGOIST LEAGUE',name:'Choose Your NEL Club',prompt:'Which European philosophy will reshape your final stage?',mode:'equal',options:Object.keys(NEL_DATA).map(n=>option(n,NEL_DATA[n].master+' leads a squad built around a distinct football philosophy.','common',{},n.replace('Bastard München','Bastard').replace('Manshine City','Manshine').replace('FC Barcha','Barcha').replace('Paris X Gen','PXG')))};

const TRAINING_ACTIONS=[
 {key:'finishing',name:'Finishing Lab',desc:'Repeated box entries, first-time shots and pressure finishing.',cost:12,effects:{finishing:2,shotPower:1,reactions:1},risk:.08},
 {key:'duels',name:'1v1 Duels',desc:'Take defenders on repeatedly and sharpen close control.',cost:13,effects:{dribbling:2,control:2,technique:1},risk:.1},
 {key:'speed',name:'Sprint Work',desc:'Acceleration and top-speed work. High reward, higher physical load.',cost:17,effects:{speed:2,acceleration:2,stamina:1},risk:.18},
 {key:'gym',name:'Strength Session',desc:'Build contact resistance and striking power.',cost:15,effects:{physical:2,shotPower:2},risk:.14},
 {key:'film',name:'Film Study',desc:'Study opponents, scanning patterns and off-ball triggers.',cost:5,effects:{vision:2,offBall:2,reactions:1},risk:.03},
 {key:'passing',name:'Combination Work',desc:'One-touch patterns, timing and progressive passing.',cost:9,effects:{passing:2,vision:1,control:1},risk:.05},
 {key:'press',name:'Pressing Drills',desc:'Defensive timing, stamina and transition pressure.',cost:13,effects:{defense:2,stamina:2,reactions:1},risk:.1},
 {key:'rest',name:'Rest & Recover',desc:'Restore the body and clear accumulated fatigue.',cost:-24,effects:{},risk:0},
 {key:'ego',name:'Ego Challenge',desc:'High-pressure self-imposed test. Can create a breakthrough or a collapse.',cost:14,effects:{ego:2},risk:.22}
];

const MATCH_PLANS=[
 {key:'balanced',name:'Balanced',desc:'Read the game and take what appears.',mods:{}},
 {key:'poacher',name:'Goal Hunter',desc:'Sacrifice some creation to attack scoring positions constantly.',mods:{finishing:6,offBall:6,ego:3,passing:-3}},
 {key:'creator',name:'Creator',desc:'Drop into pockets and prioritise chances for others.',mods:{vision:7,passing:7,offBall:2,finishing:-2}},
 {key:'dribbler',name:'Isolation',desc:'Seek 1v1s and destabilise the defensive line yourself.',mods:{dribbling:8,control:5,ego:2,stamina:-2}},
 {key:'pressing',name:'Predatory Press',desc:'Hunt turnovers and accept the energy cost.',mods:{defense:8,stamina:5,reactions:4},extraEnergy:7}
];

const POSITION_WEIGHTS={
 'Centre Forward':{finishing:2,shotPower:1.2,offBall:1.5,reactions:1.1,ego:1},
 'Second Striker':{finishing:1.4,vision:1.4,passing:1.2,offBall:1.3,control:1},
 'Left Wing':{speed:1.4,acceleration:1.4,dribbling:1.5,control:1,finishing:1},
 'Right Wing':{speed:1.4,acceleration:1.4,dribbling:1.5,control:1,finishing:1},
 'False Nine':{vision:1.7,passing:1.5,control:1.3,offBall:1.2,finishing:1},
 'Attacking Midfielder':{vision:1.8,passing:1.7,technique:1.3,control:1.2},
 'Target Forward':{physical:1.7,shotPower:1.4,finishing:1.4,control:1},
 'Pressing Forward':{stamina:1.5,defense:1.3,acceleration:1.2,offBall:1.2,finishing:1}
};

function randomName(){
 const first=['Haruto','Ren','Sora','Kaito','Riku','Yuto','Minato','Akira','Hayate','Shun','Taiga','Itsuki','Rei','Kou','Haru','Toma','Kei','Nao','Ryota','Seiya'];
 const last=['Amano','Kisaragi','Mizuno','Takeda','Shirakawa','Kanzaki','Aoyama','Kuroda','Fujimoto','Asakura','Naruse','Ishida','Sakurai','Hayashi','Morita','Tsukino','Endo','Kagawa','Matsuda','Kirishima'];
 return pick(first)+' '+pick(last);
}
function baseStats(){const s={};ATTR_KEYS.forEach(k=>s[k]=int(43,56));s.weakFoot=int(35,52);s.ego=int(48,60);return s;}
function blankDevelopment(){const d={};ATTR_KEYS.forEach(k=>d[k]=0);return d;}
function defaultRun(){return{id:uid(),name:randomName(),mode:'build',buildIndex:0,selections:{},baseStats:baseStats(),development:blankDevelopment(),energy:100,confidence:52,form:0,fitness:100,injury:null,lastChanges:{},career:null,createdAt:Date.now()};}
function defaultState(){return{version:VERSION,run:defaultRun(),archive:[],ui:{view:'runView'}};}
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(!raw||raw.version!==VERSION)return defaultState();
  raw.archive=raw.archive||[];raw.ui=raw.ui||{view:'runView'};raw.run=raw.run||defaultRun();
  return raw;
 }catch(_){return defaultState();}
}

let state=load(),wheelRotation=0,spinning=false,toastTimer=null;
let audioEnabled=localStorage.getItem(AUDIO_KEY)!=='off',audioCtx=null,masterGain=null,sfxGain=null,musicGain=null,musicLoop=null,musicRunning=false;

function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));const d=$('#saveDot'),t=$('#saveText');if(d)d.classList.add('busy');if(t)t.textContent='Saving';setTimeout(()=>{if(d)d.classList.remove('busy');if(t)t.textContent='Saved';},120);}catch(_){if($('#saveText'))$('#saveText').textContent='Save failed';}}
function toast(m){const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);}

function ensureAudio(){if(!audioEnabled)return null;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!audioCtx){audioCtx=new C();masterGain=audioCtx.createGain();sfxGain=audioCtx.createGain();musicGain=audioCtx.createGain();masterGain.gain.value=.82;sfxGain.gain.value=.82;musicGain.gain.value=.0001;sfxGain.connect(masterGain);musicGain.connect(masterGain);masterGain.connect(audioCtx.destination);}if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx;}
function envTone(target,f,d=0,dur=.05,g=.03,type='triangle',slide=null){const c=ensureAudio();if(!c||!target)return;const n=c.currentTime+d,o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.setValueAtTime(f,n);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,slide),n+dur);a.gain.setValueAtTime(.0001,n);a.gain.exponentialRampToValueAtTime(g,n+.004);a.gain.exponentialRampToValueAtTime(.0001,n+dur);o.connect(a);a.connect(target);o.start(n);o.stop(n+dur+.03);}
function tone(f,d=0,dur=.05,g=.03,type='triangle',slide=null){envTone(sfxGain,f,d,dur,g,type,slide);}
function musicTone(f,d=0,dur=.12,g=.035,type='triangle'){envTone(musicGain,f,d,dur,g,type);}
function spinSound(){let t=.03,g=.035,i=0;while(t<1.55&&i<38){tone(870+(i%3)*90,t,.014,.018,'square',520);t+=g;g*=1.07;i++;}}
function landSound(r){const rank=Math.max(0,RARITY_ORDER.indexOf(r));tone(150+rank*22,0,.13,.07,'triangle',90);tone(520+rank*80,.05,.18,.035,'sine');if(rank>=3)tone(900+rank*70,.13,.25,.028,'sine');}
function clickSound(){tone(420,0,.03,.018,'square',300);}
function whistleSound(){tone(1200,0,.1,.022,'sine',1500);tone(1350,.12,.1,.018,'sine',1050);}
function goalSound(){tone(160,0,.12,.05,'sawtooth',90);tone(640,.05,.22,.035,'triangle');tone(960,.14,.28,.025,'sine');}
function scheduleMusic(){if(!audioEnabled||!musicRunning)return;const bass=[98,110,123.47,110],arp=[659.25,783.99,987.77,783.99,587.33,659.25,880,659.25];for(let b=0;b<4;b++){musicTone(bass[b],b*.42,.25,.04,'triangle');musicTone(bass[b]*2,b*.42+.02,.08,.018,'square');}arp.forEach((f,i)=>musicTone(f,.03+i*.21,.08,.016,'triangle'));}
function startMusic(){const c=ensureAudio();if(!c||musicRunning)return;musicRunning=true;musicGain.gain.cancelScheduledValues(c.currentTime);musicGain.gain.setValueAtTime(Math.max(.0001,musicGain.gain.value),c.currentTime);musicGain.gain.linearRampToValueAtTime(.34,c.currentTime+.3);scheduleMusic();musicLoop=setInterval(scheduleMusic,1680);}
function stopMusic(){if(musicLoop){clearInterval(musicLoop);musicLoop=null;}if(audioCtx&&musicGain){musicGain.gain.cancelScheduledValues(audioCtx.currentTime);musicGain.gain.setValueAtTime(Math.max(.0001,musicGain.gain.value),audioCtx.currentTime);musicGain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.2);}musicRunning=false;}
function syncAudio(){const b=$('#soundBtn');if(b){b.textContent=audioEnabled?'🎵':'🔇';b.classList.toggle('active-audio',audioEnabled);}if(audioEnabled)startMusic();else stopMusic();}

function currentWheelStage(){return state.run.mode==='nelSpin'?NEL_STAGE:BUILD_STAGES[state.run.buildIndex];}
function layoutFor(stage){
 const opts=stage.options;
 if(stage.mode==='equal'){const sh=1/opts.length;return opts.map((o,i)=>({opt:o,start:i*sh*360,end:(i+1)*sh*360,mid:(i+.5)*sh*360,share:sh}));}
 if(stage.mode==='weights'){const total=opts.reduce((s,o)=>s+(o.weight||1),0);let c=0;return opts.map(o=>{const sh=(o.weight||1)/total,st=c*360;c+=sh;return{opt:o,start:st,end:c*360,mid:(st+c*360)/2,share:sh};});}
 const present=RARITY_ORDER.filter(r=>opts.some(o=>o.rarity===r)),tierTotal=present.reduce((s,r)=>s+RARITY_CHANCES[r],0);let cursor=0,rows=[];
 present.forEach(r=>{const group=opts.filter(o=>o.rarity===r),tier=RARITY_CHANCES[r]/tierTotal,each=tier/group.length;group.forEach(o=>{const st=cursor*360;cursor+=each;rows.push({opt:o,start:st,end:cursor*360,mid:(st+cursor*360)/2,share:each});});});
 return rows;
}
function choose(stage){let roll=Math.random(),chosen=layoutFor(stage).slice(-1)[0];for(const row of layoutFor(stage)){roll-=row.share;if(roll<=0){chosen=row;break;}}return chosen;}
function probability(stage,opt){const x=layoutFor(stage).find(r=>r.opt.name===opt.name);return x?x.share*100:0;}
function fmtPct(n){return n<1?n.toFixed(1)+'%':Math.round(n)+'%';}
function polar(cx,cy,r,a){const rad=(a-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}
function annularPath(start,end,inner=73,outer=203){const span=end-start,g=Math.min(.55,span*.06),a=start+g/2,b=end-g/2,o1=polar(260,260,outer,a),o2=polar(260,260,outer,b),i1=polar(260,260,inner,b),i2=polar(260,260,inner,a),lg=b-a>180?1:0;return'M'+o1.x+' '+o1.y+' A'+outer+' '+outer+' 0 '+lg+' 1 '+o2.x+' '+o2.y+' L'+i1.x+' '+i1.y+' A'+inner+' '+inner+' 0 '+lg+' 0 '+i2.x+' '+i2.y+' Z';}
function sliceColor(opt,i,mode){if(mode==='equal'||mode==='weights'){const a=['#0d5ba6','#0a73c9','#17518d','#11406e','#23699f','#135b91','#0b4d80','#1c77ad'];return a[i%a.length];}const base={common:['#526175','#65748a'],uncommon:['#287e46','#36975a'],rare:['#17699f','#2286c6'],epic:['#5e3c91','#754bb3'],legendary:['#9f761b','#c29831'],mythic:['#a72d43','#cf3b55']},a=base[opt.rarity]||base.common;return a[i%a.length];}
function shortLabel(o){const r={'Centre Forward':'CF','Second Striker':'SS','Left Wing':'LW','Right Wing':'RW','False Nine':'F9','Attacking Midfielder':'AM','Bastard München':'Bastard','Manshine City':'Manshine','FC Barcha':'Barcha','Paris X Gen':'PXG'};const s=r[o.short]||r[o.name]||o.short||o.name;return s.length>17?s.slice(0,16)+'…':s;}
function wheelLabelText(o,span){
  const compact={
    'Centre Forward':'CF','Second Striker':'SS','Left Wing':'LW','Right Wing':'RW','False Nine':'F9',
    'Attacking Midfielder':'AM','Target Forward':'TARGET','Pressing Forward':'PRESS',
    'Right Foot':'RIGHT','Left Foot':'LEFT','Two-Footed':'BOTH',
    'Bastard München':'BASTARD','Manshine City':'MANSHINE','FC Barcha':'BARCHA','Paris X Gen':'PXG'
  };
  return compact[o.name]||compact[o.short]||shortLabel(o);
}
function wheelLabelLines(label,span){
  const max=span>=70?14:span>=35?11:span>=18?9:7;
  if(label.length<=max)return[label];
  const words=label.split(/\s+/);if(words.length===1)return[label.slice(0,max-1)+'…'];
  let a='',b='';
  for(const w of words){if(((a?a+' ':'')+w).length<=max||!a)a+=(a?' ':'')+w;else b+=(b?' ':'')+w;}
  if(b.length>max)b=b.slice(0,max-1)+'…';
  return[a,b].filter(Boolean).slice(0,2);
}
function wheelLabelSize(span){return span>=100?22:span>=55?18:span>=32?15:span>=20?12:span>=12?9:7;}
function renderWheel(){
 const stage=currentWheelStage(),layout=layoutFor(stage),g=$('#wheelGroup'),labels=$('#wheelLabels');
 $('#stageChapter').textContent=stage.chapter;$('#stageName').textContent=stage.name;$('#stagePrompt').textContent=stage.prompt;
 $('#stageCount').textContent=state.run.mode==='nelSpin'?'NEL':' '+(state.run.buildIndex+1)+' / '+BUILD_STAGES.length;
 $('#stageMode').textContent=stage.mode==='equal'?layout.length+' equal outcomes':'Weighted outcomes';
 g.innerHTML='';labels.innerHTML='';
 const selected=state.run.selections[stage.key]?.name;
 const normalized=((wheelRotation%360)+360)%360;

 layout.forEach((row,i)=>{
   const p=document.createElementNS('http://www.w3.org/2000/svg','path');
   p.setAttribute('d',annularPath(row.start,row.end));
   p.setAttribute('fill',sliceColor(row.opt,i,stage.mode));
   p.setAttribute('class','wheel-slice');
   if(row.opt.name===selected)p.style.filter='brightness(1.35) saturate(1.25) drop-shadow(0 0 5px #62d7ff)';
   g.appendChild(p);

   const span=row.end-row.start;
   if(span>=4.5){
     const screenAngle=(row.mid+normalized)%360;
     const a=(screenAngle-90)*Math.PI/180;
     const radius=span>=70?148:span>=35?151:span>=18?154:158;
     const x=260+radius*Math.cos(a), y=260+radius*Math.sin(a);

     const badge=document.createElementNS('http://www.w3.org/2000/svg','g');
     badge.setAttribute('class','wheel-badge');

     const label=wheelLabelText(row.opt,span).toUpperCase();
     const fs=span>=55?18:span>=30?16:span>=18?13:10;
     const boxW=Math.max(48,Math.min(span>=55?112:94,label.length*(fs*.66)+22));
     const boxH=fs+18;

     const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
     rect.setAttribute('x',x-boxW/2);rect.setAttribute('y',y-boxH/2);
     rect.setAttribute('width',boxW);rect.setAttribute('height',boxH);
     rect.setAttribute('rx',Math.min(12,boxH/2));
     rect.setAttribute('class','wheel-label-badge-bg');
     badge.appendChild(rect);

     const t=document.createElementNS('http://www.w3.org/2000/svg','text');
     t.setAttribute('x',x);t.setAttribute('y',y+.5);
     t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');
     t.setAttribute('class','wheel-label overlay-label');
     t.setAttribute('font-size',fs);
     t.textContent=label;
     badge.appendChild(t);
     labels.appendChild(badge);
   }
 });

 g.style.transformOrigin='260px 260px';
 g.style.transform='rotate('+wheelRotation+'deg)';
 labels.style.transformOrigin='260px 260px';
 labels.style.transition='none';
 labels.style.transform='rotate(0deg)';
 labels.style.opacity='1';

 const picked=state.run.selections[stage.key];
 $('#nextBtn').disabled=!picked;
 $('#nextBtn').textContent=state.run.mode==='nelSpin'?'Enter Neo Egoist League':(state.run.buildIndex===BUILD_STAGES.length-1?'Enter Blue Lock':'Next Build Stage');
 renderBuildStrip();
}
function renderBuildStrip(){if(state.run.mode==='nelSpin'){$('#stageStrip').innerHTML='<span class="stage-pill current">NEL Club Selection</span>';return;}$('#stageStrip').innerHTML=BUILD_STAGES.map((s,i)=>'<button class="stage-pill '+(state.run.selections[s.key]?'done ':'')+(i===state.run.buildIndex?'current':'')+'" data-build="'+i+'" type="button">'+(i+1)+'. '+esc(s.name)+'</button>').join('');}
function renderSpinResult(){const stage=currentWheelStage(),v=state.run.selections[stage.key];if(!v){$('#spinResult').innerHTML='<span class="result-eyebrow">PLAYER CREATION</span><strong>Spin the current wheel.</strong><p>These choices directly alter the attributes used by the match engine.</p>';return;}const rare=stage.mode==='rarity'?'<span class="result-rarity r-'+v.rarity+'">'+RARITY_LABELS[v.rarity]+' · '+fmtPct(probability(stage,v))+'</span>':'<span class="result-rarity r-rare">'+fmtPct(probability(stage,v))+'</span>';$('#spinResult').innerHTML='<span class="result-eyebrow">'+esc(stage.chapter)+'</span><strong>'+esc(v.name)+'</strong><p>'+esc(v.desc)+'</p>'+rare;}

function setupDerived(){
 const effects={};ATTR_KEYS.forEach(k=>effects[k]=0);
 Object.values(state.run.selections).forEach(v=>{if(!v||!v.effects)return;Object.entries(v.effects).forEach(([k,n])=>{if(k in effects)effects[k]+=n;});});
 return effects;
}
function potentialMeta(){return state.run.selections.potential?.meta||{growth:1,ceiling:87};}
function currentStats(){
 const setup=setupDerived(),stats={};const ceil=potentialMeta().ceiling||87;
 ATTR_KEYS.forEach(k=>stats[k]=clamp(Math.round((state.run.baseStats[k]||50)+(setup[k]||0)+(state.run.development[k]||0)),20,Math.max(ceil,k==='ego'?99:ceil)));
 return stats;
}
function overall(stats=currentStats()){
 const pos=state.run.selections.position?.name||'Centre Forward',w=POSITION_WEIGHTS[pos]||POSITION_WEIGHTS['Centre Forward'];let num=0,den=0;
 ATTR_KEYS.forEach(k=>{const wt=w[k]||.35;num+=stats[k]*wt;den+=wt;});return Math.round(num/den);
}
function addChange(key,n){state.run.lastChanges[key]=(state.run.lastChanges[key]||0)+n;}
function changeStat(key,amount){
 const p=potentialMeta(),stats=currentStats(),ceil=p.ceiling||87;if(!ATTR_KEYS.includes(key))return 0;
 let n=amount;
 if(n>0){n=Math.max(1,Math.round(n*(p.growth||1)));n=Math.min(n,Math.max(0,ceil-stats[key]));}
 else n=Math.max(n,20-stats[key]);
 state.run.development[key]=(state.run.development[key]||0)+n;if(n)addChange(key,n);return n;
}

function firstSelectionFixtures(team){
 const order=team==='Team Z'?['Team X','Team Y','Team W','Team V']:Object.keys(TEAM_DATA).filter(x=>x!==team);
 return order.map((opp,i)=>({id:'fs'+i,stage:'First Selection',type:'match',team,opponent:opp,stars:TEAM_DATA[opp].stars,strength:TEAM_DATA[opp].strength,teamStrength:TEAM_DATA[team].strength,venue:'Blue Lock Stratum Match '+(i+1),importance:1}));
}
function preNelFixtures(team){
 return [
  ...firstSelectionFixtures(team),
  {id:'goal100',stage:'Second Selection',type:'challenge',team:'Individual Trial',opponent:'Blue Lock Man — 100 Goal Challenge',stars:['Blue Lock Man'],strength:72,teamStrength:overall(),venue:'Second Selection Gate',importance:1.2},
  {id:'2v2',stage:'Second Selection',type:'match',team:'Your 2-Man Side',opponent:'Barou & Naruhaya',stars:['Shoei Barou','Asahi Naruhaya'],strength:75,teamStrength:70,venue:'Second Selection 2v2',importance:1.2},
  {id:'3v3',stage:'Second Selection',type:'match',team:'Your 3-Man Side',opponent:'Rin / Aryu / Tokimitsu',stars:['Rin Itoshi','Jyubei Aryu','Aoshi Tokimitsu'],strength:84,teamStrength:77,venue:'Second Selection 3v3',importance:1.35},
  {id:'4v4',stage:'Second Selection',type:'match',team:'Your 4-Man Side',opponent:'Elite 4-Man Selection',stars:['Yoichi Isagi','Seishiro Nagi','Shoei Barou','Hyoma Chigiri'],strength:86,teamStrength:82,venue:'Second Selection 4v4',importance:1.4},
  {id:'world5',stage:'Second Selection',type:'match',team:'Cleared Selection Five',opponent:'World Five',stars:['Julian Loki','Leonardo Luna','Adam Blake','Pablo Cavasoz','Dada Silva'],strength:98,teamStrength:84,venue:'World Five Exhibition',importance:1.55},
  {id:'thirdA',stage:'Third Selection',type:'match',team:'Blue Lock Trial Side',opponent:'Team A Core',stars:['Rin Itoshi','Ryusei Shidou'],strength:89,teamStrength:86,venue:'Third Selection Trial 1',importance:1.45},
  {id:'thirdB',stage:'Third Selection',type:'match',team:'Blue Lock Trial Side',opponent:'Team B/C Core',stars:['Tabito Karasu','Eita Otoya','Seishiro Nagi','Kenyu Yukimiya'],strength:87,teamStrength:86,venue:'Third Selection Trial 2',importance:1.45},
  {id:'u20',stage:'U-20 Match',type:'match',team:'Blue Lock XI',opponent:'Japan U-20',stars:['Sae Itoshi','Oliver Aiku','Shuto Sendou','Miroku Darai','Teppei Neru','Kazuma Niou'],strength:92,teamStrength:90,venue:'Japan U-20 Match',importance:1.8}
 ];
}
function nelFixtures(club){
 return Object.keys(NEL_DATA).filter(x=>x!==club).map((opp,i)=>({id:'nel'+i,stage:'Neo Egoist League',type:'match',team:club,opponent:opp,stars:NEL_DATA[opp].stars,strength:NEL_DATA[opp].strength,teamStrength:NEL_DATA[club].strength,venue:'NEL Match '+(i+1),importance:1.65}));
}
function startCareer(){
 const team=state.run.selections.firstTeam?.name||'Team Z';
 state.run.mode='career';
 state.run.career={fixtureIndex:0,fixtures:preNelFixtures(team),prepared:false,trainingKey:null,planKey:'balanced',history:[],log:['Entered Blue Lock with '+team+'.'],report:null,totals:{apps:0,goals:0,assists:0,shots:0,keyPasses:0,dribbles:0,tackles:0,interceptions:0,ratingTotal:0,nelApps:0,nelGoals:0,nelAssists:0,nelRatingTotal:0},firstSelectionPoints:0,bid:0,bidHistory:[],rival:null,complete:false,finalStatus:null};
 state.run.energy=100;state.run.confidence=55;state.run.form=0;state.run.fitness=100;state.run.injury=null;state.run.lastChanges={};
 save();renderAll();toast('Blue Lock career started.');
}
function currentFixture(){return state.run.career?.fixtures[state.run.career.fixtureIndex]||null;}
function careerLog(msg){const c=state.run.career;if(!c)return;c.log.unshift(msg);c.log=c.log.slice(0,20);}

function trainingEvent(action){
 const risk=action.risk||0,roll=Math.random();
 if(roll<risk*.22){state.run.fitness=clamp(state.run.fitness-int(8,15),20,100);state.run.injury={name:'Minor knock',matches:1,penalty:6};careerLog('A minor knock interrupted training. Fitness dropped.');return'Minor knock: fitness reduced and the next match is affected.';}
 if(roll<risk*.45){const k=pick(['control','technique','stamina','confidence']);if(k==='confidence'){state.run.confidence=clamp(state.run.confidence-8,0,100);}else changeStat(k,-1);careerLog('A poor session created a small regression.');return'Poor session: a small attribute/confidence setback.';}
 if(roll<risk+.12){const k=pick(['vision','reactions','ego','technique']);changeStat(k,2);state.run.confidence=clamp(state.run.confidence+5,0,100);careerLog('Training breakthrough: '+k+' jumped.');return'Breakthrough: extra growth and confidence.';}
 if(roll<risk+.24){state.run.energy=clamp(state.run.energy-7,0,100);careerLog('You overtrained and carried extra fatigue.');return'Overtraining: extra energy loss.';}
 return'Normal session: the planned gains landed.';
}
function applyTraining(key){
 const c=state.run.career;if(!c||c.prepared||c.report)return;const a=TRAINING_ACTIONS.find(x=>x.key===key);if(!a)return;
 state.run.lastChanges={};
 if(a.key==='rest'){state.run.energy=clamp(state.run.energy+24,0,100);state.run.fitness=clamp(state.run.fitness+16,0,100);state.run.confidence=clamp(state.run.confidence+2,0,100);careerLog('Rest and recovery before '+currentFixture().opponent+'.');}
 else{state.run.energy=clamp(state.run.energy-a.cost,0,100);Object.entries(a.effects).forEach(([k,v])=>changeStat(k,v));trainingEvent(a);}
 if(a.key==='ego'){if(Math.random()<.42){changeStat(pick(['finishing','vision','dribbling','offBall']),2);state.run.confidence=clamp(state.run.confidence+8,0,100);}else{state.run.confidence=clamp(state.run.confidence-6,0,100);state.run.form=clamp(state.run.form-1,-3,3);}}
 c.trainingKey=key;c.prepared=true;save();renderAll();
}
function choosePlan(key){const c=state.run.career;if(!c||c.report)return;if(!MATCH_PLANS.some(x=>x.key===key))return;c.planKey=key;save();renderCareer();clickSound();}

function binomial(n,p){let x=0;for(let i=0;i<n;i++)if(Math.random()<p)x++;return x;}
function poisson(lambda){let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=Math.random();}while(p>L&&k<12);return k-1;}
function effectiveStats(){
 const s=currentStats(),factor=clamp(.78+state.run.energy/500+state.run.fitness/600+(state.run.confidence-50)/650+state.run.form*.025,.65,1.12),inj=state.run.injury?.penalty||0,plan=MATCH_PLANS.find(x=>x.key===state.run.career.planKey)||MATCH_PLANS[0],out={};
 ATTR_KEYS.forEach(k=>out[k]=clamp(s[k]*factor+(plan.mods[k]||0)-inj,15,110));
 return out;
}
function matchMoments(rep,fixture){
 const m=[];
 if(rep.goals===1)m.push('You score once against '+fixture.opponent+'.');
 if(rep.goals>1)m.push('You score '+rep.goals+' goals and become the centre of the match.');
 if(rep.assists===1)m.push('You create one goal for a teammate.');
 if(rep.assists>1)m.push('You supply '+rep.assists+' assists.');
 if(rep.dribbles>=4)m.push('You repeatedly beat defenders 1v1 ('+rep.dribbles+' successful dribbles).');
 if(rep.tackles+rep.interceptions>=4)m.push('You make '+(rep.tackles+rep.interceptions)+' meaningful defensive interventions.');
 if(rep.rating>=8.5&&fixture.stars?.length)m.push('Your duel with '+pick(fixture.stars)+' becomes one of the match’s defining battles.');
 if(rep.rating<6&&fixture.stars?.length)m.push(pick(fixture.stars)+' repeatedly exposes the gap between your current level and the next one.');
 if(!m.length)m.push('You play a relatively quiet match without a decisive individual moment.');
 return m;
}
function simulateChallenge(fixture){
 const s=effectiveStats(),quality=(s.finishing*.28+s.reactions*.16+s.technique*.16+s.control*.14+s.stamina*.1+s.ego*.16),score=clamp(Math.round(70+(quality-55)*.62+rand(-5,6)),62,100),passed=score>=82,rating=clamp(5.3+(score-75)/8,5,10);
 return{type:'challenge',passed,challengeScore:score,rating,goals:0,assists:0,shots:score,keyPasses:0,dribbles:0,tackles:0,interceptions:0,teamGoals:0,oppGoals:0,result:passed?'CLEAR':'RETRY',moments:[passed?'You clear the 100 Goal Challenge with '+score+' successful finishes.':'You only reach '+score+' before the time limit and must attempt the gate again.']};
}
function simulateMatch(fixture){
 const s=effectiveStats(),plan=MATCH_PLANS.find(x=>x.key===state.run.career.planKey)||MATCH_PLANS[0],opp=fixture.strength,minutes=state.run.injury?int(52,76):90;
 const involvement=clamp(Math.round(2+s.offBall/25+s.ego/45+state.run.form*.35),2,8);
 const shots=clamp(involvement+int(-1,1),1,8);
 const goalP=clamp(.06+s.finishing*.0042+s.shotPower*.0014+s.reactions*.0015+s.technique*.0008-opp*.0028,0.04,.58);
 const goals=binomial(shots,goalP);
 const keyPasses=clamp(Math.round(1+s.vision/34+s.passing/45+rand(-1,1)),0,6);
 const dribbleAttempts=clamp(Math.round(1+s.dribbling/28+s.ego/55),1,7);
 const dribbles=binomial(dribbleAttempts,clamp(.18+s.dribbling*.005+s.control*.0025-opp*.003,0.15,.75));
 const defensiveAttempts=clamp(Math.round(1+s.defense/34+s.reactions/55),1,6);
 const tackles=binomial(defensiveAttempts,clamp(.12+s.defense*.005+s.physical*.0018-opp*.0025,.1,.68));
 const interceptions=binomial(clamp(Math.round(s.vision/35),1,4),clamp(.16+s.vision*.004+s.reactions*.002-opp*.002,.12,.62));
 const ownStrength=fixture.teamStrength+overall()*.15+state.run.form*1.5;
 const mateLambda=clamp(.55+(ownStrength-58)/38+(s.passing+s.vision)/500,.25,2.7);
 const teammateGoals=poisson(mateLambda);
 const assists=Math.min(teammateGoals,binomial(keyPasses,clamp(.12+s.passing*.0032+s.vision*.0018,.12,.5)));
 const teamGoals=goals+teammateGoals;
 const defensiveHelp=(s.defense+s.reactions+s.stamina)/3;
 const oppLambda=clamp(.65+(opp-62)/34-defensiveHelp/260,.25,3.3);
 const oppGoals=poisson(oppLambda);
 const result=teamGoals>oppGoals?'WIN':teamGoals<oppGoals?'LOSS':'DRAW';
 const rating=clamp(6+goals*.92+assists*.58+keyPasses*.07+dribbles*.07+(tackles+interceptions)*.07-(shots-goals)*.035+(result==='WIN'?.25:result==='LOSS'?-.18:0)+state.run.form*.08,4.5,10);
 const rep={type:'match',passed:true,minutes,goals,assists,shots,keyPasses,dribbles,tackles,interceptions,teamGoals,oppGoals,result,rating};
 rep.moments=matchMoments(rep,fixture);return rep;
}
function applyPostMatch(rep,fixture){
 const c=state.run.career,t=c.totals;
 if(rep.type==='match'){t.apps++;t.goals+=rep.goals;t.assists+=rep.assists;t.shots+=rep.shots;t.keyPasses+=rep.keyPasses;t.dribbles+=rep.dribbles;t.tackles+=rep.tackles;t.interceptions+=rep.interceptions;t.ratingTotal+=rep.rating;if(fixture.stage==='Neo Egoist League'){t.nelApps++;t.nelGoals+=rep.goals;t.nelAssists+=rep.assists;t.nelRatingTotal+=rep.rating;}if(fixture.stage==='First Selection'){if(rep.result==='WIN')c.firstSelectionPoints+=3;else if(rep.result==='DRAW')c.firstSelectionPoints+=1;}}
 const drain=rep.type==='match'?int(17,25)+(MATCH_PLANS.find(x=>x.key===c.planKey)?.extraEnergy||0):14;
 state.run.energy=clamp(state.run.energy-drain,0,100);state.run.fitness=clamp(state.run.fitness-int(1,5),20,100);
 if(rep.rating>=8){state.run.confidence=clamp(state.run.confidence+int(5,9),0,100);state.run.form=clamp(state.run.form+1,-3,3);}
 else if(rep.rating<6){state.run.confidence=clamp(state.run.confidence-int(5,9),0,100);state.run.form=clamp(state.run.form-1,-3,3);}
 else state.run.confidence=clamp(state.run.confidence+int(-2,3),0,100);
 state.run.lastChanges={};
 const growthCount=rep.rating>=8.5?3:rep.rating>=7?2:1;
 const growthPool=rep.goals?['finishing','offBall','reactions','shotPower']:rep.assists?['passing','vision','control','offBall']:rep.tackles+rep.interceptions>=3?['defense','reactions','stamina','physical']:['ego','stamina','technique','vision'];
 for(let i=0;i<growthCount;i++)if(Math.random()<.72)changeStat(pick(growthPool),1);
 if(rep.rating<5.6&&Math.random()<.22){const k=pick(['confidence','control','technique','ego']);if(k==='confidence')state.run.confidence=clamp(state.run.confidence-5,0,100);else changeStat(k,-1);}
 const injuryRisk=clamp((45-state.run.energy)/180+(45-state.run.fitness)/160,.02,.25);
 if(Math.random()<injuryRisk){state.run.injury={name:Math.random()<.25?'Muscle strain':'Minor knock',matches:Math.random()<.25?2:1,penalty:Math.random()<.25?10:6};careerLog('Injury: '+state.run.injury.name+' will affect upcoming football.');}
 if(fixture.stars?.length&&Math.random()<.48){c.rival=pick(fixture.stars);careerLog(c.rival+' is emerging as a defining rival.');}
 if(fixture.stage==='Neo Egoist League')updateBid(rep);
 careerLog(fixture.stage+': '+(rep.type==='challenge'?rep.result:(fixture.team+' '+rep.teamGoals+'–'+rep.oppGoals+' '+fixture.opponent))+' · rating '+rep.rating.toFixed(1));
}
function updateBid(rep){
 const c=state.run.career,stats=currentStats(),nt=c.totals,avgNel=nt.nelApps?nt.nelRatingTotal/nt.nelApps:rep.rating,base=Math.max(0,(overall(stats)-55)*2.1+nt.nelGoals*16+nt.nelAssists*10+(avgNel-6)*12+rand(-7,11));
 const next=Math.max(3,Math.round(base));c.bid=next;c.bidHistory.push(next);
}
function playFixture(){
 const c=state.run.career,fixture=currentFixture();if(!c||!fixture||!c.prepared||c.report)return;
 whistleSound();const rep=fixture.type==='challenge'?simulateChallenge(fixture):simulateMatch(fixture);c.report=rep;applyPostMatch(rep,fixture);recordHistory();if(rep.goals)goalSound();save();renderAll();
}
function advanceFixture(){
 const c=state.run.career,fixture=currentFixture();if(!c||!c.report)return;
 if(c.report.type==='challenge'&&!c.report.passed){c.prepared=false;c.trainingKey=null;c.planKey='balanced';c.report=null;state.run.energy=clamp(state.run.energy+10,0,100);renderAll();save();return;}
 if(state.run.injury){state.run.injury.matches--;if(state.run.injury.matches<=0){careerLog('You are fully fit again.');state.run.injury=null;}}
 state.run.energy=clamp(state.run.energy+9,0,100);state.run.fitness=clamp(state.run.fitness+5,0,100);
 c.fixtureIndex++;c.prepared=false;c.trainingKey=null;c.planKey='balanced';c.report=null;
 if(c.fixtureIndex>=c.fixtures.length){
  if(!state.run.selections.nelClub){state.run.mode='nelSpin';wheelRotation=0;renderAll();save();toast('Choose your Neo Egoist League club.');return;}
  completeCareer();return;
 }
 renderAll();save();
}
function enterNEL(){
 const club=state.run.selections.nelClub?.name;if(!club)return;
 const c=state.run.career;c.fixtures=c.fixtures.concat(nelFixtures(club));state.run.mode='career';c.prepared=false;c.trainingKey=null;c.planKey='balanced';c.report=null;careerLog('Signed into '+club+' under '+NEL_DATA[club].master+'.');renderAll();save();toast('Neo Egoist League begins.');
}
function completeCareer(){
 const c=state.run.career,s=currentStats(),ov=overall(s),bid=c.bid||Math.max(5,Math.round((ov-50)*2+c.totals.goals*8+c.totals.assists*5));
 let status='Professional Prospect';
 if(bid>=220||ov>=94)status='World-Class Prospect';
 else if(bid>=150||ov>=90)status='New Generation Contender';
 else if(bid>=90||ov>=86)status='Blue Lock Star';
 else if(bid>=45||ov>=80)status='Japan U-20 Candidate';
 c.bid=bid;c.complete=true;c.finalStatus=status;state.run.mode='complete';careerLog('Final status: '+status+' · ¥'+bid+'m bid.');renderAll();save();toast('Career complete: '+status);
}

function renderCareer(){
 const show=state.run.mode==='career'||state.run.mode==='complete';
 $('#setupPanel').hidden=show;$('#careerPanel').hidden=!show;
 if(!show)return;
 const c=state.run.career,fixture=currentFixture();
 if(!fixture&&c.complete){$('#careerStage').textContent='CAREER COMPLETE';$('#fixtureTitle').textContent=c.finalStatus;$('#fixtureSubtitle').textContent='Final bid: ¥'+c.bid+'m';$('#fixtureCount').textContent='FINAL';$('#fixtureType').textContent='ARCHIVE READY';$('#prepArea').hidden=true;$('#matchReport').hidden=false;$('#matchReport').innerHTML='<span class="result-eyebrow">FINAL EVALUATION</span><h3>'+esc(c.finalStatus)+'</h3><p>Your Blue Lock career ends with a ¥'+c.bid+'m bid, '+c.totals.goals+' goals and '+c.totals.assists+' assists.</p>';$('#advanceFixtureBtn').hidden=true;renderCareerLog();return;}
 $('#prepArea').hidden=!!c.report;$('#careerStage').textContent=fixture.stage;$('#fixtureTitle').textContent=fixture.venue;$('#fixtureSubtitle').textContent=fixture.type==='challenge'?'Individual qualification test.':'Your performance is simulated from your current attributes, form, condition and match plan.';
 $('#fixtureCount').textContent=(c.fixtureIndex+1)+' / '+c.fixtures.length;$('#fixtureType').textContent=fixture.type.toUpperCase();
 $('#homeLabel').textContent=fixture.type==='challenge'?'PLAYER':'YOUR SIDE';$('#homeTeam').textContent=fixture.team;$('#homeStars').textContent=fixture.type==='challenge'?'Beat the target to advance.':'OVR '+overall()+' · '+(state.run.selections.primaryWeapon?.name||'No weapon');
 $('#awayTeam').textContent=fixture.opponent;$('#awayStars').textContent=(fixture.stars||[]).slice(0,4).join(' · ');$('#fixtureStageTag').textContent=fixture.stage;$('#fixtureVenue').textContent=fixture.venue;
 renderCondition();renderTraining();renderPlans();
 const inj=$('#injuryNotice');if(state.run.injury){inj.hidden=false;inj.textContent=state.run.injury.name+' — '+state.run.injury.matches+' fixture(s) remaining; effective attributes are reduced.';}else inj.hidden=true;
 $('#playMatchBtn').disabled=!c.prepared;
 $('#matchReport').hidden=!c.report;$('#advanceFixtureBtn').hidden=!c.report;
 if(c.report)renderMatchReport(c.report,fixture);
 renderCareerLog();
}
function renderCondition(){
 const vals={energy:state.run.energy,confidence:state.run.confidence,fitness:state.run.fitness};
 ['energy','confidence','fitness'].forEach(k=>{const cap=k[0].toUpperCase()+k.slice(1);$('#'+k+'Value').textContent=Math.round(vals[k]);$('#'+k+'Bar').style.width=clamp(vals[k],0,100)+'%';});
 $('#formValue').textContent=(state.run.form>0?'+':'')+state.run.form;$('#formBar').style.width=((state.run.form+3)/6*100)+'%';
}
function renderTraining(){
 const c=state.run.career;$('#prepStatus').textContent=c.prepared?'Prepared: '+(TRAINING_ACTIONS.find(a=>a.key===c.trainingKey)?.name||'Done'):'Choose one action';
 $('#trainingActions').innerHTML=TRAINING_ACTIONS.map(a=>'<button type="button" class="training-action '+(c.trainingKey===a.key?'selected':'')+'" data-train="'+a.key+'" '+(c.prepared?'disabled':'')+'><strong>'+esc(a.name)+'</strong><span>'+esc(a.desc)+'</span><em>'+(a.cost<0?'+'+Math.abs(a.cost)+' energy':'-'+a.cost+' energy')+'</em></button>').join('');
}
function renderPlans(){
 const c=state.run.career;$('#matchPlans').innerHTML=MATCH_PLANS.map(p=>'<button type="button" class="plan-button '+(c.planKey===p.key?'selected':'')+'" data-plan="'+p.key+'" '+(c.report?'disabled':'')+'><strong>'+esc(p.name)+'</strong><span>'+esc(p.desc)+'</span></button>').join('');
}
function renderMatchReport(r,f){
 if(r.type==='challenge'){$('#matchReport').innerHTML='<span class="result-eyebrow">'+esc(r.result)+'</span><div class="scoreline"><strong>'+r.challengeScore+'/100</strong></div><p>'+esc(r.moments.join(' '))+'</p><div class="performance-line"><span>RATING <b>'+r.rating.toFixed(1)+'</b></span><span>ENERGY <b>'+Math.round(state.run.energy)+'</b></span></div>';return;}
 const cls=r.result==='WIN'?'win':r.result==='LOSS'?'loss':'draw';
 $('#matchReport').innerHTML='<span class="result-eyebrow '+cls+'">'+r.result+'</span><div class="scoreline"><strong>'+r.teamGoals+' – '+r.oppGoals+'</strong><small>'+esc(f.team)+' vs '+esc(f.opponent)+'</small></div><div class="performance-line"><span>G <b>'+r.goals+'</b></span><span>A <b>'+r.assists+'</b></span><span>SHOTS <b>'+r.shots+'</b></span><span>KEY PASSES <b>'+r.keyPasses+'</b></span><span>DRIBBLES <b>'+r.dribbles+'</b></span><span>TACKLES <b>'+r.tackles+'</b></span><span>INTERCEPTIONS <b>'+r.interceptions+'</b></span><span>RATING <b>'+r.rating.toFixed(1)+'</b></span></div><div class="moment-list">'+r.moments.map(m=>'<p>• '+esc(m)+'</p>').join('')+'</div>';
}
function renderCareerLog(){const c=state.run.career;$('#careerLog').innerHTML=(c?.log||[]).slice(0,8).map(x=>'<div>'+esc(x)+'</div>').join('')||'<div>No career events yet.</div>';}

function renderPlayer(){
 const stats=currentStats(),ov=overall(stats),c=state.run.career,tot=c?.totals||{apps:0,goals:0,assists:0,ratingTotal:0};
 $('#playerTitle').textContent=state.run.name||'Unnamed Egoist';$('#playerName').value=state.run.name||'';$('#overallBadge').textContent='OVR '+ov;
 $('#identityPosition').textContent=state.run.selections.position?.short||state.run.selections.position?.name||'—';$('#identityFirstTeam').textContent=state.run.selections.firstTeam?.name||'—';$('#identityNel').textContent=state.run.selections.nelClub?.name||'—';$('#identityBid').textContent=c?.bid?'¥'+c.bid+'m':'—';
 $('#totalApps').textContent=tot.apps||0;$('#totalGoals').textContent=tot.goals||0;$('#totalAssists').textContent=tot.assists||0;$('#avgRating').textContent=tot.apps?(tot.ratingTotal/tot.apps).toFixed(2):'—';
 $('#primaryWeaponLabel').textContent=state.run.selections.primaryWeapon?.name||'—';$('#secondaryWeaponLabel').textContent=state.run.selections.secondaryWeapon?.name||'—';$('#rivalLabel').textContent=c?.rival||'—';
 $('#statsGrid').innerHTML=ATTRS.map(([k,label])=>{const d=state.run.lastChanges[k]||0;return'<div class="stat detailed-stat"><span>'+label+'</span><strong>'+stats[k]+'</strong>'+(d?'<em class="'+(d>0?'up':'down')+'">'+(d>0?'+':'')+d+'</em>':'')+'<i><b style="width:'+stats[k]+'%"></b></i></div>';}).join('');
 const changed=Object.entries(state.run.lastChanges).filter(x=>x[1]).map(([k,v])=>(v>0?'+':'')+v+' '+(ATTRS.find(a=>a[0]===k)?.[1]||k));$('#statTrendSummary').textContent=changed.length?changed.slice(0,2).join(' · '):'Live development';
 const rows=BUILD_STAGES.map(s=>{const v=state.run.selections[s.key];return'<div class="dossier-row"><span>'+esc(s.name)+'</span><strong>'+esc(v?.name||'—')+'</strong></div>';});if(state.run.selections.nelClub)rows.push('<div class="dossier-row"><span>NEL CLUB</span><strong>'+esc(state.run.selections.nelClub.name)+'</strong></div>');$('#dossierList').innerHTML=rows.join('');
 $('#archiveBtn').disabled=!(c?.complete);
}
function renderProfile(){
 const c=state.run.career,s=currentStats(),hist=c?.history||[],tot=c?.totals||{apps:0,goals:0,assists:0,ratingTotal:0};
 $('#profileContent').innerHTML='<div class="profile-hero"><span class="kicker">CURRENT EGOIST</span><div class="profile-title">'+esc(state.run.name)+'</div><div class="profile-sub">OVR '+overall(s)+' · '+esc(state.run.selections.primaryWeapon?.name||'No primary weapon')+' · '+(c?.bid?'¥'+c.bid+'m bid':'No bid yet')+'</div></div><div class="profile-block"><span class="kicker">CAREER NUMBERS</span><h3>'+tot.apps+' appearances · '+tot.goals+' goals · '+tot.assists+' assists</h3><p class="profile-sub">Average rating: '+(tot.apps?(tot.ratingTotal/tot.apps).toFixed(2):'—')+'<br>First Selection points: '+(c?.firstSelectionPoints||0)+'<br>Rival: '+esc(c?.rival||'—')+'</p></div><div class="profile-block"><span class="kicker">MATCH HISTORY</span><h3>Career timeline</h3><div class="profile-timeline">'+(c?.history?.slice().reverse().map(h=>'<div class="timeline-row"><span>'+esc(h.stage)+' · '+esc(h.opponent)+'</span><strong>'+esc(h.summary)+'</strong></div>').join('')||'<div class="empty-state">Play your first match to begin the timeline.</div>')+'</div></div>';
}
function renderArchive(){
 const g=$('#archiveGrid');if(!state.archive.length){g.innerHTML='<div class="empty-state">No completed careers yet.</div>';return;}
 g.innerHTML=state.archive.map(p=>'<article class="archive-card"><span class="kicker">OVR '+p.overall+'</span><h3>'+esc(p.name)+'</h3><div class="archive-meta">'+esc(p.status)+' · '+(p.club?esc(p.club):'No NEL club')+'<br>¥'+p.bid+'m · '+p.goals+' goals · '+p.assists+' assists</div></article>').join('');
}
function recordHistory(){
 const c=state.run.career,f=currentFixture(),r=c?.report;if(!c||!f||!r)return;
 c.history.push({stage:f.stage,opponent:f.opponent,summary:r.type==='challenge'?r.result+' '+r.challengeScore+'/100':r.result+' '+r.teamGoals+'–'+r.oppGoals+' · '+r.goals+'G '+r.assists+'A · '+r.rating.toFixed(1)});
}

function renderView(){const v=state.ui.view||'runView';$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$$('.nav-button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));}
function renderAll(){
 const wheelMode=state.run.mode==='build'||state.run.mode==='nelSpin';$('#setupPanel').hidden=!wheelMode;if(wheelMode){renderWheel();renderSpinResult();}
 renderCareer();renderPlayer();renderProfile();renderArchive();renderView();syncAudio();$('#quickBuildBtn').hidden=state.run.mode!=='build';
}

function spinCurrent(){
 if(spinning)return;if(audioEnabled)startMusic();spinning=true;const stage=currentWheelStage(),chosen=choose(stage),desired=360-chosen.mid;const previousRotation=wheelRotation;wheelRotation+=1440+((desired-(wheelRotation%360)+360)%360);const spinDelta=wheelRotation-previousRotation;const g=$('#wheelGroup'),labels=$('#wheelLabels');g.style.transition='transform 1.65s cubic-bezier(.08,.72,.12,1)';if(labels){labels.style.opacity='1';labels.style.transformOrigin='260px 260px';labels.style.transition='transform 1.65s cubic-bezier(.08,.72,.12,1)';labels.style.transform='rotate(0deg)';}spinSound();requestAnimationFrame(()=>{g.style.transform='rotate('+wheelRotation+'deg)';if(labels)labels.style.transform='rotate('+spinDelta+'deg)';});
 setTimeout(()=>{state.run.selections[stage.key]=chosen.opt;spinning=false;landSound(stage.mode==='rarity'?chosen.opt.rarity:'rare');renderWheel();renderSpinResult();renderPlayer();save();},1680);
}
function nextBuild(){
 const stage=currentWheelStage();if(!state.run.selections[stage.key])return;
 if(state.run.mode==='nelSpin'){enterNEL();return;}
 if(state.run.buildIndex<BUILD_STAGES.length-1){state.run.buildIndex++;wheelRotation=0;renderAll();save();return;}
 startCareer();
}
function quickBuild(){
 BUILD_STAGES.forEach(s=>{state.run.selections[s.key]=choose(s).opt;});state.run.buildIndex=BUILD_STAGES.length-1;startCareer();clickSound();
}
function newRun(force=false){const progressed=Object.keys(state.run.selections).length||state.run.career;if(progressed&&!force&&!confirm('Start a new player? The current unarchived career will be replaced.'))return;state.run=defaultRun();wheelRotation=0;renderAll();save();clickSound();}
function archiveCareer(){
 const c=state.run.career;if(!c?.complete)return;state.archive.unshift({id:state.run.id,name:state.run.name,overall:overall(),status:c.finalStatus,bid:c.bid,goals:c.totals.goals,assists:c.totals.assists,club:state.run.selections.nelClub?.name||null,savedAt:Date.now()});save();renderArchive();toast(state.run.name+' archived.');newRun(true);
}

function bind(){
 document.addEventListener('pointerdown',()=>{if(audioEnabled){ensureAudio();startMusic();}},{once:true});
 $('#spinBtn').addEventListener('click',spinCurrent);$('#nextBtn').addEventListener('click',nextBuild);$('#quickBuildBtn').addEventListener('click',quickBuild);
 $('#playerName').addEventListener('input',e=>{state.run.name=e.target.value.slice(0,36);renderPlayer();save();});
 $('#randomNameBtn').addEventListener('click',()=>{state.run.name=randomName();renderPlayer();save();clickSound();});
 $('#trainingActions').addEventListener('click',e=>{const b=e.target.closest('[data-train]');if(b)applyTraining(b.dataset.train);});
 $('#matchPlans').addEventListener('click',e=>{const b=e.target.closest('[data-plan]');if(b)choosePlan(b.dataset.plan);});
 $('#playMatchBtn').addEventListener('click',playFixture);
 $('#advanceFixtureBtn').addEventListener('click',advanceFixture);
 $('#archiveBtn').addEventListener('click',archiveCareer);$('#newRunBtn').addEventListener('click',()=>newRun(false));
 $('#stageStrip').addEventListener('click',e=>{const b=e.target.closest('[data-build]');if(!b||state.run.mode!=='build')return;const i=Number(b.dataset.build);if(i<=state.run.buildIndex||state.run.selections[BUILD_STAGES[i]?.key]){state.run.buildIndex=clamp(i,0,BUILD_STAGES.length-1);wheelRotation=0;renderAll();}});
 $$('.nav-button').forEach(b=>b.addEventListener('click',()=>{state.ui.view=b.dataset.view;renderView();if(state.ui.view==='profileView')renderProfile();if(state.ui.view==='archiveView')renderArchive();save();clickSound();}));
 $('#clearArchiveBtn').addEventListener('click',()=>{if(state.archive.length&&confirm('Delete all archived careers on this device?')){state.archive=[];save();renderArchive();}});
 $('#soundBtn').addEventListener('click',()=>{audioEnabled=!audioEnabled;localStorage.setItem(AUDIO_KEY,audioEnabled?'on':'off');if(audioEnabled){ensureAudio();clickSound();startMusic();}else stopMusic();syncAudio();});
}
function init(){bind();renderAll();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});}
init();
})();