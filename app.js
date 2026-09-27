(() => {
'use strict';

const STORAGE_KEY='egowheel.save.v6';
const AUDIO_KEY='egowheel.audio.v1';
const VERSION=6;
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




const HEIGHT_STAGE={key:'height',chapter:'PLAYER CREATION',name:'Height',prompt:'How tall is your player?',mode:'weights',options:[
 weighted('160 cm','Very short for elite football; sharp centre of gravity but contact is a challenge.',.6,{acceleration:3,control:2,physical:-4},'160',{heightCm:160}),
 weighted('163 cm','Low centre of gravity and explosive movement.',1.1,{acceleration:3,dribbling:1,physical:-3},'163',{heightCm:163}),
 weighted('166 cm','Compact and agile.',2,{acceleration:2,control:1,physical:-2},'166',{heightCm:166}),
 weighted('169 cm','Quick-footed and difficult to knock cleanly off balance.',3.5,{acceleration:2,control:1,physical:-1},'169',{heightCm:169}),
 weighted('172 cm','Below average height with useful agility.',6,{acceleration:1,control:1},'172',{heightCm:172}),
 weighted('175 cm','A balanced smaller frame.',9,{acceleration:1},'175',{heightCm:175}),
 weighted('178 cm','Balanced proportions with few obvious trade-offs.',13,{},'178',{heightCm:178}),
 weighted('181 cm','Close to the centre of the distribution.',16,{},'181',{heightCm:181}),
 weighted('184 cm','A little taller without sacrificing much mobility.',16,{physical:1},'184',{heightCm:184}),
 weighted('187 cm','Good reach and contact profile.',13,{physical:2,reactions:1},'187',{heightCm:187}),
 weighted('190 cm','Tall enough to influence aerial play significantly.',9,{physical:3,defense:1,acceleration:-1},'190',{heightCm:190}),
 weighted('193 cm','A powerful tall frame with major aerial upside.',6,{physical:4,defense:1,acceleration:-1},'193',{heightCm:193}),
 weighted('196 cm','Exceptional reach and presence.',3.5,{physical:5,defense:2,speed:-1,acceleration:-1},'196',{heightCm:196}),
 weighted('199 cm','Extremely tall even among professionals.',1.8,{physical:6,defense:2,speed:-2,acceleration:-2},'199',{heightCm:199}),
 weighted('202 cm','A freakishly tall football frame.',.7,{physical:7,defense:3,speed:-2,acceleration:-3},'202',{heightCm:202})
]};
BUILD_STAGES.splice(3,0,HEIGHT_STAGE);

const positionStage=BUILD_STAGES.find(s=>s.key==='position');
positionStage.options.push(
 option('Central Midfielder','You connect phases, progress possession and arrive where the game needs you.','common',{passing:4,vision:4,stamina:3,control:2},'CM'),
 option('Defensive Midfielder','You protect central space, read transitions and start attacks after regains.','common',{defense:6,vision:4,passing:3,stamina:3},'DM'),
 option('Left Back','You defend the flank, overlap when useful and survive isolated wide duels.','common',{defense:5,stamina:4,speed:3,passing:2},'LB'),
 option('Right Back','You defend the flank, overlap when useful and survive isolated wide duels.','common',{defense:5,stamina:4,speed:3,passing:2},'RB'),
 option('Left Wing-Back','You are responsible for both width and recovery over the entire flank.','common',{stamina:6,speed:4,passing:3,defense:3},'LWB'),
 option('Right Wing-Back','You are responsible for both width and recovery over the entire flank.','common',{stamina:6,speed:4,passing:3,defense:3},'RWB'),
 option('Centre Back','You defend the box, win duels and keep the line intact under pressure.','common',{defense:7,physical:5,reactions:3,vision:2},'CB'),
 option('Ball-Playing Centre Back','You break lines with passing while still carrying centre-back responsibility.','common',{defense:5,passing:5,vision:5,control:3},'BPCB'),
 option('Stopper','You step out aggressively to destroy attacks before they develop.','common',{defense:7,physical:6,acceleration:2,ego:2},'STOPPER'),
 option('Sweeper','You defend space behind the line through anticipation rather than constant contact.','common',{defense:6,vision:6,reactions:5,speed:2},'SW')
);

const ARCHETYPE_STAGE={key:'archetype',chapter:'PLAYER ARCHETYPE',name:'Player Archetype',prompt:'What kind of egoist does your natural game resemble?',mode:'equal',options:[
 option('Clinical No. 9','Lives for efficient box movement and decisive finishing.','common',{finishing:4,offBall:4,reactions:2},'NO.9',{bonusText:'+ shot quality and finishing training',match:{goalP:.035,shots:.5},training:{finishing:.25}}),
 option('Space Hunter','Finds the patch of grass defenders forgot existed.','common',{offBall:5,vision:3,acceleration:2},'SPACE',{bonusText:'+ involvement from off-ball movement',match:{shots:.5,keyPasses:.3},training:{film:.2}}),
 option('Creative Playmaker','Treats teammates as moving pieces for chance creation.','common',{vision:4,passing:5,technique:2},'PLAYMAKER',{bonusText:'+ key passes and assist chance',match:{keyPasses:1,assistP:.045},training:{passing:.25,film:.15}}),
 option('1v1 Destroyer','Wants the defender isolated and beaten personally.','common',{dribbling:5,control:3,ego:2},'1V1',{bonusText:'+ dribble volume and success',match:{dribbles:1,dribbleP:.06},training:{duels:.3}}),
 option('Speed Demon','Turns open grass into a scoring chance before the defence can reset.','common',{speed:5,acceleration:5},'SPEED',{bonusText:'+ transition involvement',match:{shots:.35,dribbles:.5},training:{speed:.3}}),
 option('Power Striker','Wins collisions and converts force into shooting power.','common',{physical:5,shotPower:5},'POWER',{bonusText:'+ power-shot conversion',match:{goalP:.02,rating:.08},training:{gym:.3,finishing:.1}}),
 option('Target King','Pins centre-backs, protects service and dominates direct play.','common',{physical:6,control:3,finishing:2},'TARGET',{bonusText:'+ hold-up chances and aerial threat',match:{shots:.25,assistP:.02},training:{gym:.25}}),
 option('Aerial Predator','Attacks high balls as if every cross belongs to them.','common',{physical:4,finishing:4,reactions:3},'AERIAL',{bonusText:'+ finishing in high-contact games',match:{goalP:.025,shots:.25},training:{gym:.15,finishing:.15}}),
 option('Long-Range Cannon','Forces the defence to step out because distance is not safety.','common',{shotPower:6,technique:3,finishing:2},'CANNON',{bonusText:'+ extra shooting volume',match:{shots:.8,goalP:.01},training:{finishing:.2}}),
 option('Trap Genius','Can turn ugly service into an immediate attack.','common',{control:6,technique:5},'TRAP',{bonusText:'+ control protects performance floor',match:{performance:.08,dribbleP:.025},training:{duels:.15}}),
 option('Technical Artist','Solves tight spaces through touch, disguise and technique.','common',{technique:5,control:4,dribbling:4},'TECH',{bonusText:'+ dribble and creation efficiency',match:{dribbleP:.045,keyPasses:.35},training:{duels:.2,passing:.1}}),
 option('Pressing Demon','Treats defending as another route to the goal.','common',{defense:5,stamina:5,reactions:2},'PRESS',{bonusText:'+ defensive actions and transition chances',match:{defense:1.2,oppDefense:.05},training:{press:.3}}),
 option('Counterattack Assassin','Explodes into space the moment possession changes hands.','common',{speed:4,acceleration:4,offBall:4},'COUNTER',{bonusText:'+ better output against stronger teams',match:{underdog:.1,shots:.4},training:{speed:.15,film:.1}}),
 option('Shadow Runner','Lives just outside a marker’s field of attention.','common',{offBall:6,acceleration:3,reactions:2},'SHADOW',{bonusText:'+ shot volume from blind-side runs',match:{shots:.7},training:{film:.2}}),
 option('Reflex Poacher','Thrives when the box becomes too chaotic to consciously plan.','common',{reactions:6,finishing:4},'REFLEX',{bonusText:'+ conversion in high-event matches',match:{goalP:.03,performance:.04},training:{finishing:.2}}),
 option('Link-Up Conductor','Creates scoring routes through combinations rather than solo actions.','common',{passing:5,vision:4,control:2},'LINK',{bonusText:'+ assists and teammate goals',match:{keyPasses:.7,assistP:.035,mateGoals:.08},training:{passing:.3}}),
 option('Complete Forward','Has no single overwhelming identity but very few attacking holes.','common',{finishing:2,passing:2,dribbling:2,control:2,offBall:2,physical:2},'COMPLETE',{bonusText:'+ small bonus to every match phase',match:{goalP:.01,keyPasses:.25,dribbleP:.02,defense:.25,performance:.05},training:{finishing:.08,duels:.08,speed:.08,gym:.08,film:.08,passing:.08,press:.08}}),
 option('Chaos Egoist','Gets stronger as the match loses structure.','common',{ego:6,technique:3,reactions:3},'CHAOS',{bonusText:'+ higher ceiling on performance spins',match:{performance:.12},training:{ego:.35}}),
 option('Adaptive Solver','Reads what is failing and rebuilds their own game around it.','common',{vision:4,reactions:4,ego:3},'ADAPT',{bonusText:'+ better training and match-performance odds',match:{performance:.1},training:{finishing:.12,duels:.12,speed:.12,gym:.12,film:.12,passing:.12,press:.12,ego:.12}}),
 option('Two-Footed Killer','Creates shooting angles defenders normally remove.','common',{weakFoot:8,finishing:3,technique:2},'TWO-FOOT',{bonusText:'+ conversion and weak-side reliability',match:{goalP:.025},training:{finishing:.18}}),
 option('Defensive Forward','Can erase a build-up lane before becoming the first attacker.','common',{defense:6,stamina:4,physical:2},'DEF FWD',{bonusText:'+ tackles, interceptions and opponent suppression',match:{defense:1.5,oppDefense:.08},training:{press:.3}}),
 option('Transition Monster','Can attack, recover and attack again without disappearing from the game.','common',{stamina:6,speed:3,reactions:3},'TRANSITION',{bonusText:'+ involvement stays high when energy drops',match:{performance:.06,energyShield:.08},training:{speed:.15,press:.2}}),
 option('Tempo Controller','Knows when a match needs acceleration and when it needs one extra touch.','common',{vision:5,passing:4,control:3},'TEMPO',{bonusText:'+ stable performance and creation',match:{performance:.07,keyPasses:.6},training:{film:.2,passing:.2}}),
 option('Clutch Specialist','Ordinary phases can be quiet, but decisive moments sharpen the ego.','common',{ego:5,reactions:4,finishing:2},'CLUTCH',{bonusText:'+ stronger odds in important fixtures',match:{clutch:.13},training:{ego:.25}})
,
 option('Lockdown Marker','Your best games make one elite attacker effectively disappear.','common',{defense:7,physical:4,reactions:3},'MARKER',{bonusText:'+ marking duels, tackles and opponent suppression',match:{defense:1.7,oppDefense:.09,performance:.05},training:{press:.35,gym:.12}}),
 option('Interception Predator','You hunt passing lanes before the ball is released.','common',{defense:6,vision:6,reactions:5},'INTERCEPTOR',{bonusText:'+ interceptions and transition starts',match:{defense:1.5,keyPasses:.25,performance:.06},training:{film:.3,press:.2}}),
 option('Aerial Enforcer','High balls and direct play become your territory.','common',{physical:7,defense:5,reactions:3},'ENFORCER',{bonusText:'+ clearances, duels and set-piece threat',match:{defense:1.3,clearances:1.1,shots:.15},training:{gym:.3}}),
 option('Ball-Playing Defender','You defend first, but possession after the regain becomes a weapon.','common',{defense:5,passing:6,vision:5,control:3},'BPD',{bonusText:'+ progression, key passes and stable defensive rating',match:{defense:.8,keyPasses:.7,performance:.07},training:{passing:.25,film:.2}}),
 option('Libero','You read danger early, sweep behind the line and carry into midfield.','common',{vision:6,defense:6,control:4,dribbling:2},'LIBERO',{bonusText:'+ interceptions, carries and build-up value',match:{defense:1.2,dribbles:.45,keyPasses:.35,performance:.08},training:{film:.25,duels:.1}}),
 option('Recovery Defender','You can be beaten once and still win the phase with pace and timing.','common',{speed:5,acceleration:5,defense:4,stamina:3},'RECOVERY',{bonusText:'+ recovery actions and defence against transitions',match:{defense:1,oppDefense:.06,performance:.05},training:{speed:.28,press:.15}}),
 option('Wide Duel Specialist','Wingers rarely get a clean 1v1 against you.','common',{defense:6,speed:4,acceleration:3,physical:2},'WIDE LOCK',{bonusText:'+ defensive actions against dribblers',match:{defense:1.4,oppDefense:.07},training:{press:.25,speed:.12}}),
 option('Engine Wing-Back','You repeatedly appear in both boxes without dropping out of the match.','common',{stamina:7,speed:4,passing:3,defense:3},'WING-BACK',{bonusText:'+ defensive volume, carries and chance creation',match:{defense:.7,keyPasses:.45,dribbles:.35,performance:.04},training:{speed:.2,passing:.12,press:.15}}),
 option('Midfield Anchor','You close central lanes and give everyone around you freedom to attack.','common',{defense:6,vision:5,passing:4,stamina:3},'ANCHOR',{bonusText:'+ interceptions, opponent suppression and progression',match:{defense:1.2,oppDefense:.06,keyPasses:.35},training:{film:.25,press:.2}}),
 option('Destroyer Six','You solve midfield problems through pressure, contact and repeat duels.','common',{defense:7,physical:5,stamina:5},'DESTROYER 6',{bonusText:'+ tackles and duel volume',match:{defense:1.8,performance:.04},training:{press:.3,gym:.2}}),
 option('Press-Bait Technician','You invite pressure, escape it, and break the opponent shape.','common',{control:6,passing:5,vision:4,physical:2},'PRESS BAIT',{bonusText:'+ progression and performance under pressure',match:{keyPasses:.55,dribbles:.35,performance:.09},training:{duels:.18,passing:.22}}),
 option('Defensive Commander','You organise the line, read danger and make teammates defend better.','common',{defense:6,vision:6,ego:4,reactions:3},'COMMANDER',{bonusText:'+ opponent suppression and defensive rating',match:{defense:1,oppDefense:.11,performance:.08},training:{film:.3,ego:.15}})
,
 option('Regista','You orchestrate from deep and turn possession into territory.','common',{passing:6,vision:6,control:3},'REGISTA',{bonusText:'+ deep creation and stable performance',match:{keyPasses:.9,performance:.08},training:{passing:.28,film:.22}}),
 option('Box-to-Box Engine','You want to be involved in every phase rather than own only one zone.','common',{stamina:7,defense:3,passing:3,offBall:3},'B2B',{bonusText:'+ mixed attacking and defensive volume',match:{defense:.7,keyPasses:.35,dribbles:.25,performance:.06},training:{speed:.12,press:.18,passing:.12}}),
 option('Deep-Lying Playmaker','You create from behind pressure instead of between the lines.','common',{passing:6,vision:7,technique:3},'DLP',{bonusText:'+ progression and key passes from deep',match:{keyPasses:1,performance:.07},training:{passing:.3,film:.2}}),
 option('Half-Space Creator','You live between full-back and centre-back and manufacture overloads.','common',{vision:5,passing:5,offBall:4,control:2},'HALF SPACE',{bonusText:'+ chance creation and late box involvement',match:{keyPasses:.8,shots:.25,assistP:.025},training:{film:.16,passing:.2}}),
 option('Inverted Full-Back','You leave the touchline and become an extra midfielder in possession.','common',{defense:4,passing:5,vision:5,control:3},'INVERTED',{bonusText:'+ build-up creation with defensive value',match:{defense:.7,keyPasses:.65,performance:.06},training:{passing:.2,film:.18}}),
 option('Overlap Specialist','Your timing outside the winger turns width into a repeated threat.','common',{stamina:5,speed:4,passing:4,offBall:3},'OVERLAP',{bonusText:'+ wide creation and repeated runs',match:{keyPasses:.6,dribbles:.3,performance:.04},training:{speed:.18,passing:.16}}),
 option('Underlap Specialist','You attack the inside channel from a nominally wide starting point.','common',{offBall:5,passing:4,acceleration:3,vision:3},'UNDERLAP',{bonusText:'+ late runs and cutback creation',match:{shots:.25,keyPasses:.55},training:{film:.15,speed:.12}}),
 option('Set-Piece Threat','Corners and free kicks create a second scoring identity.','common',{physical:4,finishing:3,technique:4},'SET PIECE',{bonusText:'+ occasional extra shot/assist value',match:{shots:.25,goalP:.012,assistP:.012},training:{finishing:.1,gym:.12}}),
 option('Raumdeuter','You contribute by appearing where structure has briefly failed.','common',{offBall:7,vision:4,reactions:4},'SPACE FINDER',{bonusText:'+ involvement without needing dribble volume',match:{shots:.45,keyPasses:.25,performance:.05},training:{film:.25}}),
 option('Press-Bait Eight','You invite midfield pressure to open the next line.','common',{control:6,passing:5,physical:3,vision:4},'PRESS BAIT 8',{bonusText:'+ press resistance and progression',match:{keyPasses:.55,dribbles:.4,performance:.08},training:{duels:.2,passing:.2}}),
 option('Counterpress Eight','Losing possession is simply the start of your next action.','common',{stamina:6,defense:5,reactions:4,passing:2},'COUNTERPRESS',{bonusText:'+ recoveries and transition creation',match:{defense:1,recoveries:.8,keyPasses:.25},training:{press:.28}}),
 option('One-Touch Connector','You keep attacks moving before the defence can lock onto you.','common',{passing:6,control:5,reactions:3},'ONE TOUCH',{bonusText:'+ combinations and assist chains',match:{keyPasses:.65,assistP:.025,mateGoals:.04},training:{passing:.24}}),
 option('Tempo Breaker','You deliberately change the speed of the game to disorganise opponents.','common',{vision:5,control:5,technique:4,ego:2},'TEMPO BREAK',{bonusText:'+ stable contribution and creation',match:{performance:.08,keyPasses:.45},training:{film:.18,passing:.15}}),
 option('Duel Monster','You actively seek physical and technical 1v1s because repeated wins tilt matches.','common',{physical:5,defense:4,dribbling:4,ego:3},'DUEL MONSTER',{bonusText:'+ both attacking and defensive duel volume',match:{defense:.8,dribbles:.6,performance:.05},training:{duels:.25,gym:.15}}),
 option('Playmaking Libero','You defend deep but want the first progressive action after every regain.','common',{defense:5,vision:6,passing:6,control:3},'PLAY LIBERO',{bonusText:'+ interceptions into immediate progression',match:{defense:1,keyPasses:.7,performance:.08},training:{film:.22,passing:.25}}),
 option('Utility Egoist','Your value is being able to solve a different role every match.','common',{vision:3,reactions:3,stamina:3,technique:3,ego:3},'UTILITY',{bonusText:'+ broad match and training consistency',match:{performance:.08,defense:.35,keyPasses:.25,dribbles:.2},training:{finishing:.06,duels:.06,speed:.06,gym:.06,film:.06,passing:.06,press:.06,defduels:.06,aerial:.06,shape:.06}})
]};
BUILD_STAGES.splice(1,0,ARCHETYPE_STAGE);

const primaryStage=BUILD_STAGES.find(s=>s.key==='primaryWeapon');
primaryStage.options.push(
 option('Power Shot','Pure force turns narrow openings into viable shots.','common',{shotPower:8,finishing:3},'POWER SHOT',{bonusText:'+3% conversion, +shot volume',match:{goalP:.03,shots:.35},training:{finishing:.15}}),
 option('Curve Shot','Bending strikes attack corners behind the keeper’s reach.','common',{technique:5,finishing:5},'CURVE',{bonusText:'+2.5% conversion',match:{goalP:.025},training:{finishing:.12}}),
 option('Volley Specialist','You are comfortable finishing before the ball reaches the ground.','common',{finishing:6,reactions:4,technique:3},'VOLLEY',{bonusText:'+ conversion from chaotic chances',match:{goalP:.025,performance:.03},training:{finishing:.18}}),
 option('Header Dominance','You consistently win and direct aerial service.','common',{physical:5,finishing:5},'HEADER',{bonusText:'+ aerial shot volume',match:{shots:.35,goalP:.02},training:{gym:.1,finishing:.12}}),
 option('Blind-Spot Runs','You enter the box from the defender’s dead angle.','uncommon',{offBall:9,acceleration:3},'BLIND SPOT',{bonusText:'+ extra shots',match:{shots:.7},training:{film:.2}}),
 option('Stop-and-Go Dribble','Sudden changes of pace freeze the defender’s feet.','uncommon',{dribbling:8,acceleration:5},'STOP-GO',{bonusText:'+ dribbles and success rate',match:{dribbles:1,dribbleP:.04},training:{duels:.22}}),
 option('Elastic Dribbling','Body elasticity creates escape routes in tiny spaces.','uncommon',{dribbling:8,control:6},'ELASTIC',{bonusText:'+6% dribble success',match:{dribbleP:.06},training:{duels:.25}}),
 option('Through-Ball Vision','You recognise the runner before the lane is obvious.','uncommon',{vision:8,passing:7},'THROUGH BALL',{bonusText:'+ key passes and assists',match:{keyPasses:1,assistP:.04},training:{passing:.25}}),
 option('Crossing','Wide service becomes a repeatable chance-creation weapon.','uncommon',{passing:7,technique:5},'CROSSING',{bonusText:'+ teammate goals and assists',match:{keyPasses:.7,assistP:.03,mateGoals:.07},training:{passing:.2}}),
 option('Hold-Up Play','You receive under contact and make the attack survive pressure.','uncommon',{physical:7,control:6},'HOLD-UP',{bonusText:'+ stable performance and assists',match:{performance:.05,assistP:.02},training:{gym:.18}}),
 option('Shot Fake','Your shooting threat becomes a dribbling weapon.','rare',{finishing:5,dribbling:7,technique:5},'SHOT FAKE',{bonusText:'+ dribbles and shooting quality',match:{dribbles:.6,dribbleP:.04,goalP:.015},training:{duels:.15,finishing:.12}}),
 option('Gyro Shot','Spin produces a late, awkward flight for the goalkeeper.','rare',{finishing:8,technique:7},'GYRO',{bonusText:'+4% conversion',match:{goalP:.04},training:{finishing:.2}}),
 option('Knuckleball','Unstable flight makes long-range strikes difficult to read.','rare',{shotPower:8,technique:7},'KNUCKLE',{bonusText:'+ long-range shot volume and conversion',match:{shots:.55,goalP:.025},training:{finishing:.2}}),
 option('Ball-Stealing','You turn reading and timing into immediate attacking turnovers.','rare',{defense:9,reactions:6},'STEAL',{bonusText:'+ defensive actions and opponent suppression',match:{defense:1.5,oppDefense:.07},training:{press:.25}}),
 option('Aerial Control','You can trap and redirect high balls without losing attack speed.','rare',{control:9,technique:6,physical:4},'AIR CONTROL',{bonusText:'+ performance floor and shot creation',match:{performance:.06,shots:.25},training:{duels:.15}}),
 option('Reflex Shooting','The body selects the finish before conscious thought catches up.','epic',{reactions:11,finishing:9},'REFLEX',{bonusText:'+5% conversion in high-pressure games',match:{goalP:.05,clutch:.06},training:{finishing:.25}}),
 option('Counter Timing','You recognise the exact instant a defensive line loses balance.','epic',{vision:8,offBall:9,acceleration:5},'COUNTER',{bonusText:'+ performance against stronger opponents',match:{underdog:.14,shots:.5},training:{film:.22}}),
 option('Perfect Feint Chain','Each defensive reaction becomes the setup for the next move.','epic',{dribbling:11,technique:8,ego:4},'FEINT CHAIN',{bonusText:'+10% dribble success',match:{dribbleP:.1,dribbles:1},training:{duels:.3}}),
 option('Predator Eye','Your attention narrows onto the goalkeeper’s vulnerable instant.','legendary',{finishing:12,vision:7,reactions:6},'PREDATOR EYE',{bonusText:'+7% conversion',match:{goalP:.07},training:{finishing:.28}}),
 option('Full Metavision','Continuous scanning turns the whole pitch into predictive information.','legendary',{vision:14,offBall:8,reactions:7,passing:5},'METAVISION',{bonusText:'+ performance, creation and interceptions',match:{performance:.15,keyPasses:1,defense:.7},training:{film:.35}}),
 option('Impossible First Touch','The first contact can kill, flick, redirect or instantly finish almost anything.','legendary',{control:14,technique:10,finishing:5},'FIRST TOUCH',{bonusText:'+ performance and chance quality',match:{performance:.12,goalP:.025,dribbleP:.035},training:{duels:.2}}),
 option('Flow-State Instinct','Elite pressure can unlock actions beyond your normal conscious level.','mythic',{ego:10,reactions:9,technique:6},'FLOW',{bonusText:'+ major boost to top performance tiers',match:{performance:.22,clutch:.12},training:{ego:.4}})
);


primaryStage.options.push(
 option('Man-Marking','You stay attached to a danger player until their preferred route disappears.','common',{defense:8,stamina:3},'MARKING',{bonusText:'+ defensive actions and star suppression',match:{defense:1.5,oppDefense:.08},training:{press:.25}}),
 option('Standing Tackle','Timing lets you win the ball without surrendering your feet.','common',{defense:8,reactions:4},'TACKLE',{bonusText:'+ tackle success',match:{defense:1.5},training:{press:.3}}),
 option('Body Block','You put your body between the shot and goal at the decisive instant.','common',{defense:7,physical:5,reactions:3},'BLOCK',{bonusText:'+ blocks and opponent scoring suppression',match:{blocks:1,oppDefense:.07},training:{gym:.15,press:.2}}),
 option('Aerial Dominance','You consistently win first contact against direct service.','uncommon',{defense:7,physical:7,reactions:3},'AIR DUEL',{bonusText:'+ clearances and aerial defence',match:{clearances:1.5,defense:1},training:{gym:.25}}),
 option('Passing-Lane Reading','You identify the pass before the receiver becomes dangerous.','uncommon',{defense:7,vision:8,reactions:5},'LANE READ',{bonusText:'+ interceptions and transition creation',match:{defense:1.4,keyPasses:.3,performance:.05},training:{film:.32}}),
 option('Recovery Pace','Your speed erases mistakes that would normally become chances.','uncommon',{speed:8,acceleration:7,defense:4},'RECOVERY',{bonusText:'+ transition defence and recovery actions',match:{defense:1,oppDefense:.06},training:{speed:.3}}),
 option('Long Diagonal','One regain can become an attack forty metres away.','rare',{passing:9,vision:7,technique:4},'DIAGONAL',{bonusText:'+ key passes from deep areas',match:{keyPasses:.9,assistP:.025},training:{passing:.3}}),
 option('Libero Carry','You step out of the line with the ball and create an overload yourself.','rare',{control:7,dribbling:6,vision:6,defense:4},'LIBERO RUN',{bonusText:'+ progressive carries and creation',match:{dribbles:.8,keyPasses:.4,performance:.06},training:{duels:.18}}),
 option('Last-Man Timing','You specialise in the single intervention that prevents a clear chance.','rare',{defense:10,reactions:8,speed:3},'LAST MAN',{bonusText:'+ blocks/interceptions in high-pressure games',match:{defense:1.6,blocks:.8,clutch:.05},training:{press:.3,film:.2}}),
 option('Defensive Metavision','Continuous scanning is used primarily to erase attacking routes.','epic',{defense:9,vision:12,reactions:7},'DEF META',{bonusText:'+ interceptions, blocks and defensive performance',match:{defense:2,blocks:.6,oppDefense:.1,performance:.12},training:{film:.38}}),
 option('Perfect Duel Sense','You read balance, body shape and touch well enough to dominate isolated duels.','epic',{defense:10,physical:6,reactions:6},'DUEL SENSE',{bonusText:'+ tackle/duel dominance',match:{defense:2.1,performance:.08},training:{press:.32,gym:.12}}),
 option('Fortress Aura','Attackers begin altering decisions simply because your zone feels closed.','legendary',{defense:13,physical:8,ego:5},'FORTRESS',{bonusText:'+ major opponent suppression and defensive volume',match:{defense:2.4,oppDefense:.14,performance:.12},training:{press:.35,gym:.18}}),
 option('Total Defensive Vision','You anticipate the entire attacking pattern before the final action forms.','mythic',{defense:14,vision:14,reactions:9},'TOTAL VISION',{bonusText:'+ elite interceptions, blocks and defensive performance',match:{defense:2.5,blocks:1,oppDefense:.16,performance:.18},training:{film:.45,press:.25}})
);

const secondaryStage=BUILD_STAGES.find(s=>s.key==='secondaryWeapon');
secondaryStage.options.push(
 option('Long-Range Threat','You can punish a defence for backing away.','common',{shotPower:5,finishing:3},'RANGE',{bonusText:'+ shot volume',match:{shots:.35},training:{finishing:.1}}),
 option('Body Feints','Small upper-body lies create genuine separation.','common',{dribbling:5,technique:3},'FEINT',{bonusText:'+ dribble success',match:{dribbleP:.025},training:{duels:.15}}),
 option('First-Touch Escape','Your first contact is designed to beat pressure, not merely control the ball.','common',{control:6,acceleration:2},'ESCAPE',{bonusText:'+ performance under pressure',match:{performance:.035},training:{duels:.12}}),
 option('Cutback Passing','You consistently find runners arriving behind the first defensive line.','common',{passing:5,vision:3},'CUTBACK',{bonusText:'+ assist chance',match:{assistP:.025,keyPasses:.25},training:{passing:.16}}),
 option('Recovery Speed','You can lose a duel and still re-enter the phase.','common',{speed:4,stamina:3,defense:2},'RECOVERY',{bonusText:'+ defensive volume',match:{defense:.5},training:{speed:.12,press:.1}}),
 option('Disguised Pass','Your body shape hides where the ball is actually going.','uncommon',{passing:6,technique:4},'DISGUISE',{bonusText:'+ key passes',match:{keyPasses:.5,assistP:.02},training:{passing:.18}}),
 option('Outside-Foot Technique','You create passing and shooting angles without resetting your body.','uncommon',{technique:6,weakFoot:3},'TRIVELA',{bonusText:'+ creation and conversion',match:{goalP:.012,keyPasses:.3},training:{passing:.1,finishing:.1}}),
 option('Press Resistance','Contact and pressure do not automatically end your possession.','uncommon',{control:6,physical:4},'PRESS RESIST',{bonusText:'+ stable performance',match:{performance:.06},training:{gym:.1,duels:.12}}),
 option('Interception Sense','You read the pass rather than chasing the receiver.','uncommon',{defense:6,vision:5},'INTERCEPT',{bonusText:'+ defensive actions',match:{defense:.8,oppDefense:.035},training:{press:.2}}),
 option('Near-Post Finish','You punish keepers who overprotect the far corner.','rare',{finishing:7,reactions:4},'NEAR POST',{bonusText:'+2.5% conversion',match:{goalP:.025},training:{finishing:.18}}),
 option('Lob Finish','You recognise when the keeper’s depth can be exploited.','rare',{finishing:6,technique:5},'LOB',{bonusText:'+2% conversion',match:{goalP:.02},training:{finishing:.15}}),
 option('Acrobatic Finish','Unbalanced balls can still become legitimate shots.','rare',{finishing:7,physical:4,technique:5},'ACROBAT',{bonusText:'+ shot conversion in chaos',match:{goalP:.02,performance:.035},training:{finishing:.18}}),
 option('Quick Release','You need less preparation time before passing or shooting.','rare',{reactions:6,technique:4},'QUICK',{bonusText:'+ performance and shot quality',match:{performance:.045,goalP:.015},training:{finishing:.1,passing:.1}}),
 option('Scanning Habit','You repeatedly refresh your picture of the pitch before the ball arrives.','rare',{vision:7,reactions:5},'SCAN',{bonusText:'+ performance and creation',match:{performance:.07,keyPasses:.35},training:{film:.22}}),
 option('Aerial Timing','You attack the ball at the instant the defender is least able to jump.','rare',{physical:4,reactions:6,finishing:5},'AIR TIMING',{bonusText:'+ aerial conversion',match:{goalP:.018,shots:.2},training:{gym:.1}}),
 option('Combination Chemistry','Short combinations become faster and more instinctive.','epic',{passing:7,control:5,vision:4},'CHEMISTRY',{bonusText:'+ teammate goals and assists',match:{mateGoals:.08,assistP:.035,keyPasses:.4},training:{passing:.2}}),
 option('Clutch Gear','Your decision speed improves when the match reaches a decisive state.','epic',{ego:6,reactions:6},'CLUTCH',{bonusText:'+ important-match performance',match:{clutch:.1},training:{ego:.25}}),
 option('Mini-Metavision','You cannot sustain full predictive scanning, but can access it in key phases.','epic',{vision:9,offBall:5,reactions:4},'MINI META',{bonusText:'+ performance and defensive reads',match:{performance:.09,defense:.45},training:{film:.25}}),
 option('Two-Stage Shot','A second shooting motion punishes defenders who commit to the first.','legendary',{finishing:9,technique:7,ego:4},'2-STAGE',{bonusText:'+4% conversion',match:{goalP:.04},training:{finishing:.22}}),
 option('Perfect Weak Foot','The supposed weaker side is almost impossible to target defensively.','legendary',{weakFoot:12,technique:5},'WEAK FOOT',{bonusText:'+2.5% conversion and stable technique',match:{goalP:.025,performance:.05},training:{finishing:.18}})
);


secondaryStage.options.push(
 option('Shoulder-to-Shoulder','You remain balanced through contact and move attackers away from preferred lines.','common',{physical:5,defense:4},'CONTACT',{bonusText:'+ duel success',match:{defense:.6},training:{gym:.18}}),
 option('Clearance Technique','You do not merely survive dangerous balls; you clear them into useful zones.','common',{defense:5,technique:3},'CLEAR',{bonusText:'+ clearances and transition quality',match:{clearances:.7,keyPasses:.15},training:{press:.12}}),
 option('Cover Shadow','Your positioning blocks one passing lane while you pressure another.','common',{defense:5,vision:4,stamina:2},'SHADOW',{bonusText:'+ interceptions and pressing value',match:{defense:.7,oppDefense:.035},training:{film:.18,press:.14}}),
 option('Back-Post Awareness','You consistently find danger arriving behind the line.','uncommon',{defense:6,reactions:5,vision:3},'BACK POST',{bonusText:'+ blocks and clearances',match:{blocks:.5,clearances:.5},training:{film:.2}}),
 option('Press Trigger','You recognise exactly when an opponent touch has become vulnerable.','uncommon',{defense:5,reactions:5,stamina:3},'TRIGGER',{bonusText:'+ tackle volume',match:{defense:.8},training:{press:.22}}),
 option('Line-Breaking Pass','You can bypass midfield from deep without surrendering possession.','rare',{passing:7,vision:6,technique:3},'LINE BREAK',{bonusText:'+ deep creation',match:{keyPasses:.55,assistP:.015},training:{passing:.22}}),
 option('Emergency Block','When structure fails, you still find a way to get between ball and goal.','rare',{defense:7,reactions:7,physical:3},'EMERGENCY',{bonusText:'+ clutch blocks',match:{blocks:.7,clutch:.04},training:{press:.2}}),
 option('Sweeper Timing','You leave the line only when the space behind absolutely requires it.','rare',{defense:7,vision:7,speed:3},'SWEEPER',{bonusText:'+ recoveries and interceptions',match:{defense:.8,performance:.05},training:{film:.24}}),
 option('Progressive Carry','You can turn a regain into controlled territory without forcing a pass.','epic',{control:7,dribbling:6,physical:3},'CARRY',{bonusText:'+ carries and build-up performance',match:{dribbles:.65,performance:.06},training:{duels:.18}}),
 option('Captaincy','Organisation and conviction improve the whole defensive unit around you.','epic',{ego:6,vision:5,defense:5},'CAPTAIN',{bonusText:'+ team defensive suppression',match:{oppDefense:.08,performance:.06},training:{ego:.22,film:.15}})
);

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
,
 {key:'defduels',name:'Defensive Duels',desc:'Work on jockeying, tackle timing and surviving isolated 1v1s.',cost:13,effects:{defense:2,reactions:2,physical:1},risk:.09},
 {key:'aerial',name:'Aerial Defence',desc:'Headers, body positioning, clearances and second-ball reactions.',cost:14,effects:{defense:2,physical:2,reactions:1},risk:.11},
 {key:'shape',name:'Positioning Unit',desc:'Train line height, cover shadows, scanning and recovery positions.',cost:8,effects:{defense:2,vision:2,reactions:1},risk:.04}
];

const MATCH_PLANS=[
 {key:'balanced',name:'Balanced',desc:'Read the game and take what appears.',mods:{}},
 {key:'poacher',name:'Goal Hunter',desc:'Sacrifice some creation to attack scoring positions constantly.',mods:{finishing:6,offBall:6,ego:3,passing:-3}},
 {key:'creator',name:'Creator',desc:'Drop into pockets and prioritise chances for others.',mods:{vision:7,passing:7,offBall:2,finishing:-2}},
 {key:'dribbler',name:'Isolation',desc:'Seek 1v1s and destabilise the defensive line yourself.',mods:{dribbling:8,control:5,ego:2,stamina:-2}},
 {key:'pressing',name:'Predatory Press',desc:'Hunt turnovers and accept the energy cost.',mods:{defense:8,stamina:5,reactions:4},extraEnergy:7}
,
 {key:'lockdown',name:'Lockdown',desc:'Prioritise duels, marking and denying the opponent’s strongest attacker.',mods:{defense:10,physical:5,reactions:4,passing:-2},extraEnergy:5},
 {key:'sweeper',name:'Sweep & Read',desc:'Protect space behind the line and hunt interceptions rather than diving into duels.',mods:{defense:7,vision:8,reactions:6,speed:2},extraEnergy:3},
 {key:'progressor',name:'Play Through Pressure',desc:'Defend your zone, then take responsibility for progressing possession.',mods:{passing:8,vision:6,control:5,defense:3}},
 {key:'overlap',name:'Aggressive Overlap',desc:'Attack the flank repeatedly and accept the recovery burden.',mods:{speed:6,stamina:7,passing:5,dribbling:3,defense:-2},extraEnergy:7},
 {key:'anchor',name:'Anchor',desc:'Stay central, screen the defence and make the game pass around you.',mods:{defense:9,vision:6,stamina:5,physical:3,offBall:-2}}
];

const POSITION_WEIGHTS={
 'Centre Forward':{finishing:2,shotPower:1.2,offBall:1.5,reactions:1.1,ego:1},
 'Second Striker':{finishing:1.4,vision:1.4,passing:1.2,offBall:1.3,control:1},
 'Left Wing':{speed:1.4,acceleration:1.4,dribbling:1.5,control:1,finishing:1},
 'Right Wing':{speed:1.4,acceleration:1.4,dribbling:1.5,control:1,finishing:1},
 'False Nine':{vision:1.7,passing:1.5,control:1.3,offBall:1.2,finishing:1},
 'Attacking Midfielder':{vision:1.8,passing:1.7,technique:1.3,control:1.2},
 'Target Forward':{physical:1.7,shotPower:1.4,finishing:1.4,control:1},
 'Pressing Forward':{stamina:1.5,defense:1.3,acceleration:1.2,offBall:1.2,finishing:1},
 'Central Midfielder':{passing:1.55,vision:1.45,control:1.25,stamina:1.15,defense:.8,technique:1},
 'Defensive Midfielder':{defense:1.8,vision:1.55,passing:1.3,stamina:1.25,physical:1.05,reactions:1},
 'Left Back':{defense:1.5,stamina:1.35,speed:1.2,acceleration:1.05,passing:1},
 'Right Back':{defense:1.5,stamina:1.35,speed:1.2,acceleration:1.05,passing:1},
 'Left Wing-Back':{stamina:1.5,speed:1.3,defense:1.2,passing:1.15,dribbling:.85,acceleration:1},
 'Right Wing-Back':{stamina:1.5,speed:1.3,defense:1.2,passing:1.15,dribbling:.85,acceleration:1},
 'Centre Back':{defense:2,physical:1.55,reactions:1.3,vision:1.05,stamina:.8},
 'Ball-Playing Centre Back':{defense:1.75,passing:1.45,vision:1.45,control:1.05,physical:1},
 'Stopper':{defense:2.05,physical:1.7,reactions:1.2,acceleration:.9,ego:.8},
 'Sweeper':{defense:1.85,vision:1.65,reactions:1.55,speed:1.05,passing:.85}
};

const POSITION_MATCH_PROFILE={
 'Centre Forward':{shots:1,defense:.45,creation:.7,carry:.7},
 'Second Striker':{shots:.9,defense:.55,creation:1,carry:.85},
 'Left Wing':{shots:.78,defense:.72,creation:.92,carry:1.2},
 'Right Wing':{shots:.78,defense:.72,creation:.92,carry:1.2},
 'False Nine':{shots:.72,defense:.62,creation:1.18,carry:.9},
 'Attacking Midfielder':{shots:.55,defense:.7,creation:1.3,carry:.85},
 'Target Forward':{shots:.92,defense:.68,creation:.65,carry:.5},
 'Pressing Forward':{shots:.72,defense:1.05,creation:.72,carry:.72},
 'Central Midfielder':{shots:.38,defense:1.08,creation:1.28,carry:.82},
 'Defensive Midfielder':{shots:.22,defense:1.55,creation:1.08,carry:.62},
 'Left Back':{shots:.25,defense:1.5,creation:.95,carry:.85},
 'Right Back':{shots:.25,defense:1.5,creation:.95,carry:.85},
 'Left Wing-Back':{shots:.34,defense:1.28,creation:1.08,carry:1},
 'Right Wing-Back':{shots:.34,defense:1.28,creation:1.08,carry:1},
 'Centre Back':{shots:.12,defense:1.9,creation:.58,carry:.3},
 'Ball-Playing Centre Back':{shots:.16,defense:1.7,creation:1.08,carry:.55},
 'Stopper':{shots:.1,defense:2.05,creation:.5,carry:.25},
 'Sweeper':{shots:.14,defense:1.8,creation:.95,carry:.55}
};

function playerHeight(){return state.run.selections.height?.meta?.heightCm||181;}
function heightAerialFactor(){return clamp(1+(playerHeight()-181)/45,.78,1.48);}
function positionProfile(){
 const name=state.run.selections.position?.name||'Centre Forward';
 return POSITION_MATCH_PROFILE[name]||POSITION_MATCH_PROFILE['Centre Forward'];
}
function isDefensiveRole(){
 const name=state.run.selections.position?.name||'Centre Forward';
 return ['Defensive Midfielder','Left Back','Right Back','Left Wing-Back','Right Wing-Back','Centre Back','Ball-Playing Centre Back','Stopper','Sweeper'].includes(name);
}
function isMidfieldRole(){
 const name=state.run.selections.position?.name||'Centre Forward';
 return ['Central Midfielder','Defensive Midfielder','Attacking Midfielder','False Nine'].includes(name);
}


function randomName(){
 const first=['Haruto','Ren','Sora','Kaito','Riku','Yuto','Minato','Akira','Hayate','Shun','Taiga','Itsuki','Rei','Kou','Haru','Toma','Kei','Nao','Ryota','Seiya'];
 const last=['Amano','Kisaragi','Mizuno','Takeda','Shirakawa','Kanzaki','Aoyama','Kuroda','Fujimoto','Asakura','Naruse','Ishida','Sakurai','Hayashi','Morita','Tsukino','Endo','Kagawa','Matsuda','Kirishima'];
 return pick(first)+' '+pick(last);
}
function baseStats(){const s={};ATTR_KEYS.forEach(k=>s[k]=50);return s;}
function blankDevelopment(){const d={};ATTR_KEYS.forEach(k=>d[k]=0);return d;}
function defaultRun(){return{id:uid(),name:randomName(),mode:'build',buildIndex:0,statIndex:0,selections:{},baseStats:baseStats(),development:blankDevelopment(),energy:100,confidence:52,form:0,fitness:100,injury:null,lastChanges:{},pendingTraining:null,pendingMatch:null,career:null,createdAt:Date.now()};}
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

const START_STAT_TABLE=[
 {value:25,weight:.6},{value:30,weight:1.2},{value:35,weight:2.5},{value:40,weight:5},{value:45,weight:9},
 {value:50,weight:14},{value:55,weight:18},{value:60,weight:18},{value:65,weight:14},{value:70,weight:9},
 {value:75,weight:5},{value:80,weight:2.5},{value:85,weight:1.2},{value:90,weight:.5},{value:95,weight:.12}
];

function gameplayBonuses(){
 const match={},training={};
 for(const key of ['archetype','primaryWeapon','secondaryWeapon']){
  const meta=state.run.selections[key]?.meta||{};
  Object.entries(meta.match||{}).forEach(([k,v])=>match[k]=(match[k]||0)+v);
  Object.entries(meta.training||{}).forEach(([k,v])=>training[k]=(training[k]||0)+v);
 }
 return{match,training};
}
function makeStatStage(index=state.run.statIndex||0){
 const [statKey,label]=ATTRS[index]||ATTRS[0];
 const opts=START_STAT_TABLE.map(r=>weighted(String(r.value),label+' begins at '+r.value+'.',r.weight,{},String(r.value),{statKey,value:r.value}));
 return{key:'stat_'+statKey,chapter:'STARTING ATTRIBUTES',name:label+' Rating',prompt:'Spin your exact starting '+label.toLowerCase()+' rating.',mode:'weights',options:opts};
}
function trainingOutcomeStage(){
 const action=TRAINING_ACTIONS.find(a=>a.key===state.run.pendingTraining)||TRAINING_ACTIONS[0];
 const affinity=gameplayBonuses().training[action.key]||0;
 if(action.key==='rest'){
  return{key:'trainingOutcome',chapter:'TRAINING RESULT',name:'Rest & Recovery',prompt:'How effective is the recovery block?',mode:'weights',options:[
   weighted('Sluggish Recovery','You recover, but nowhere near as much as hoped.',12,{},'SLUGGISH',{mult:.45,confidence:-2}),
   weighted('Normal Recovery','A routine recovery block restores useful energy.',46-affinity*8,{},'NORMAL',{mult:1}),
   weighted('Good Recovery','You come back fresher than expected.',28+affinity*6,{},'GOOD',{mult:1.35,confidence:2}),
   weighted('Full Reset','Body and mind respond exceptionally well.',11+affinity*4,{},'FULL',{mult:1.75,confidence:5}),
   weighted('Mental Breakthrough','Rest creates clarity as well as recovery.',3+affinity*3,{},'BREAKTHROUGH',{mult:1.9,confidence:8,extraStat:'ego'})
  ]};
 }
 const risk=Math.max(0,action.risk||0),fatigue=Math.max(0,50-state.run.energy)/10;
 return{key:'trainingOutcome',chapter:'TRAINING RESULT',name:action.name+' Result',prompt:'You chose the session. The wheel decides how well it actually goes.',mode:'weights',options:[
  weighted('Serious Training Injury','A bad movement ends the session and puts your place in immediate danger.',.8+risk*10+fatigue*.25,{},'SERIOUS INJURY',{mult:0,injury:true,serious:true,confidence:-12}),
  weighted('Training Injury','The session ends with a physical setback.',2+risk*28+fatigue*.4,{},'INJURY',{mult:0,injury:true,confidence:-5}),
  weighted('Ego Collapse','The session gets inside your head; confidence and form crash.',2.5+risk*5,{},'EGO COLLAPSE',{mult:-.65,confidence:-12,form:-2}),
  weighted('Disaster Session','Timing is off and the work actively knocks confidence.',5+risk*8,{},'DISASTER',{mult:-.45,confidence:-7}),
  weighted('Poor Session','Very little sticks and one detail regresses.',11,{},'POOR',{mult:-.15,confidence:-3}),
  weighted('Average Session','The planned work lands at an ordinary level.',31-affinity*5,{},'AVERAGE',{mult:1}),
  weighted('Good Session','The session clearly improves the targeted tools.',28+affinity*8,{},'GOOD',{mult:1.5,confidence:2}),
  weighted('Excellent Session','You make a visible jump in the focus area.',16+affinity*10,{},'EXCELLENT',{mult:2.2,confidence:5}),
  weighted('Breakthrough','A training insight changes how the weapon functions.',6+affinity*8,{},'BREAKTHROUGH',{mult:3.1,confidence:8,extra:true}),
  weighted('Ego Awakening','The session unlocks a much larger leap than planned.',1.5+affinity*5,{},'AWAKENING',{mult:4,confidence:12,extra:true,awakening:true})
 ]};
}
function matchPerformanceStage(){
 const fixture=currentFixture(),bonus=gameplayBonuses().match||{},stats=currentStats(),ov=overall(stats);
 const importance=fixture?.importance||1,underdog=fixture?Math.max(0,fixture.strength-ov):0;
 const edge=(fixture?ov-fixture.strength:0)+(state.run.energy-60)*.08+(state.run.confidence-50)*.07+state.run.form*2.2+(bonus.performance||0)*45+(bonus.clutch||0)*30*Math.max(0,importance-1)+(bonus.underdog||0)*underdog*.55;
 const tiers=[
  ['Sent Off','A reckless or desperate moment removes you from the match entirely.',1.2,-1.6,.38,3.6,{redCard:true}],
  ['Injury Collapse','Your body gives way during the match and your influence disappears.',1.6,-1.45,.42,4.0,{injury:true}],
  ['Nightmare','Nothing works; the level of the match overwhelms you.',5,-1.25,.58,4.6],
  ['Poor','You struggle to impose your weapon.',10,-.85,.74,5.3],
  ['Quiet','You survive the game without becoming central to it.',19,-.4,.88,6.0],
  ['Solid','A competent performance with useful contributions.',27,0,1,6.7],
  ['Strong','Your strengths repeatedly influence the match.',22,.42,1.15,7.5],
  ['Star Performance','You become one of the defining players on the pitch.',11,.82,1.32,8.3],
  ['Masterclass','Your weapon dominates long stretches of the match.',4.5,1.18,1.5,9.0],
  ['Flow State','Challenge and ability align; you play beyond your ordinary level.',1.5,1.55,1.72,9.6]
 ];
 const options=tiers.map(([name,desc,base,bias,factor,rating,extra={}])=>weighted(name,desc,Math.max(.15,base*Math.exp(edge*bias/30)),{},name==='Star Performance'?'STAR':name.toUpperCase(),{factor,rating,edge,...extra}));
 return{key:'matchOutcome',chapter:'MATCH PERFORMANCE',name:fixture?(fixture.team+' vs '+fixture.opponent):'Match Performance',prompt:'Your attributes, condition and opponent shape the odds. The wheel decides your actual performance.',mode:'weights',options};
}
function secondSelectionSurvivalStage(){
 const p=state.run.pendingSurvival||{},r=p.report||{};
 const merit=(r.rating||5)*8+(r.goals||0)*18+(r.assists||0)*11+(r.dribbles||0)*2+((r.tackles||0)+(r.interceptions||0))*2.4+((r.blocks||0)+(r.clearances||0)+(r.recoveries||0))*1.7;
 const chosenBoost=clamp((merit-48)*.7,-16,32);
 return{key:'survivalOutcome',chapter:'SECOND SELECTION',name:'Will They Choose You?',prompt:'Your team lost. The winners may take one player. Your individual performance changes the odds — but rejection ends the run.',mode:'weights',options:[
  weighted('Rejected','The winners see no reason to take you. Your Blue Lock run ends here.',Math.max(8,42-chosenBoost),{},'REJECTED',{survive:false,confidence:-12}),
  weighted('Barely Chosen','You survive, but only just. The loss follows you into the next stage.',Math.max(10,30+chosenBoost*.25),{},'BARELY',{survive:true,confidence:-7,form:-1}),
  weighted('Chosen','Your individual value is obvious even in defeat. You are selected by the winners.',Math.max(10,25+chosenBoost*.55),{},'CHOSEN',{survive:true,confidence:3}),
  weighted('First Pick','They choose you immediately; your display mattered more than the result.',Math.max(2,3+chosenBoost*.2),{},'FIRST PICK',{survive:true,confidence:8,form:1})
 ]};
}
function endRun(status,reason){
 const c=state.run.career;if(!c)return;
 c.complete=true;c.eliminated=true;c.finalStatus=status;c.finalReason=reason||'Your Blue Lock run is over.';
 state.run.mode='complete';
 careerLog(status+': '+c.finalReason);
 save();renderAll();toast(status);
}
function firstSelectionQualified(){
 const c=state.run.career,t=c.totals,apps=Math.max(1,t.apps),avg=t.ratingTotal/apps;
 const teamPass=c.firstSelectionPoints>=5;
 const defActions=(t.tackles||0)+(t.interceptions||0)+(t.blocks||0)+(t.clearances||0)+(t.recoveries||0);
 let individualPass;
 if(isDefensiveRole())individualPass=(avg>=7.25&&defActions/apps>=4.5)||avg>=8.15;
 else if(isMidfieldRole())individualPass=(avg>=7.35&&((t.keyPasses||0)/apps>=2.4||t.assists>=3))||(t.goals+t.assists>=4);
 else individualPass=t.goals>=4||(t.goals>=3&&avg>=7.2)||(t.goals>=2&&t.assists>=3&&avg>=7.5);
 return{pass:teamPass||individualPass,teamPass,individualPass,avg,defActions};
}
function resolveSurvivalOutcome(outcome){
 const c=state.run.career;if(!c||!outcome)return;
 const meta=outcome.meta||{};
 state.run.confidence=clamp(state.run.confidence+(meta.confidence||0),0,100);
 state.run.form=clamp(state.run.form+(meta.form||0),-3,3);
 state.run.pendingSurvivalResult=outcome;
 if(!meta.survive)careerLog('Second Selection: rejected by the winning side.');
 else careerLog('Second Selection: '+outcome.name+'. You remain in Blue Lock.');
}
const BETWEEN_GAME_OUTCOMES=[
 weighted('Focused Training Block','You get a proper development window before the next fixture.',27,{},'TRAIN',{kind:'training'}),
 weighted('Learn From a Teammate','A teammate deliberately shows you something from their game.',11,{},'LEARN',{kind:'learn'}),
 weighted('Study an Opponent','You obsess over one player’s habits and steal a useful detail.',8,{},'STUDY',{kind:'learn'}),
 weighted('Recovery Window','The schedule gives your body a rare chance to reset.',10,{},'RECOVER',{kind:'direct',energy:20,fitness:12,confidence:2}),
 weighted('Tactical Breakthrough','A positioning idea suddenly makes the pitch easier to read.',8,{},'TACTICS',{kind:'direct',stats:{vision:2,reactions:1,defense:1},confidence:3}),
 weighted('Weapon Inspiration','A training moment suggests a new way to use what you already have.',6,{},'WEAPON',{kind:'weapon'}),
 weighted('Ego Test','Something challenges your self-image before the next game.',7,{},'EGO TEST',{kind:'ego'}),
 weighted('Position Experiment','The staff make you work outside your normal comfort zone.',5,{},'EXPERIMENT',{kind:'direct',stats:{vision:1,passing:1,defense:1,offBall:1},confidence:1}),
 weighted('Overtraining','You push past the useful part of the session and carry fatigue forward.',5,{},'OVERTRAIN',{kind:'direct',energy:-18,fitness:-6,confidence:-2,form:-1}),
 weighted('Training Injury','A routine session turns into an injury scare.',4.5,{},'INJURY',{kind:'injury'}),
 weighted('Illness','You lose sharpness during the week and cannot prepare normally.',2.5,{},'ILLNESS',{kind:'direct',energy:-16,fitness:-9,confidence:-2}),
 weighted('Confidence Crisis','A bad week gets into your head before the match.',2.5,{},'CRISIS',{kind:'direct',confidence:-11,form:-1}),
 weighted('Unexpected Praise','A senior player or coach singles out something you did well.',4,{},'PRAISE',{kind:'direct',confidence:9,form:1}),
 weighted('Nothing Special','No breakthrough, no disaster. You simply reach the next fixture.',8,{},'QUIET',{kind:'direct'})
];

const LEARNING_PLAYERS=[
 {name:'Yoichi Isagi',short:'ISAGI',desc:'Scanning and spatial problem solving.',stats:{vision:2,offBall:1,reactions:1}},
 {name:'Rin Itoshi',short:'RIN',desc:'Precision, control and ruthless decision making.',stats:{technique:2,finishing:1,vision:1}},
 {name:'Meguru Bachira',short:'BACHIRA',desc:'Creative dribbling and freedom under pressure.',stats:{dribbling:2,control:1,ego:1}},
 {name:'Seishiro Nagi',short:'NAGI',desc:'First touch and impossible-ball control.',stats:{control:2,technique:2}},
 {name:'Reo Mikage',short:'REO',desc:'Adaptability and rounded technical execution.',stats:{technique:1,passing:1,vision:1,control:1}},
 {name:'Shoei Barou',short:'BAROU',desc:'Power, finishing conviction and selfish attacking routes.',stats:{finishing:2,shotPower:1,ego:1}},
 {name:'Hyoma Chigiri',short:'CHIGIRI',desc:'Sprint mechanics and exploiting open grass.',stats:{speed:2,acceleration:2}},
 {name:'Rensuke Kunigami',short:'KUNIGAMI',desc:'Power striking and physical resilience.',stats:{shotPower:2,physical:2}},
 {name:'Oliver Aiku',short:'AIKU',desc:'Reading attackers, timing interventions and defensive leadership.',stats:{defense:2,vision:1,reactions:1}},
 {name:'Ikki Niko',short:'NIKO',desc:'Interception reading and defensive spatial awareness.',stats:{defense:1,vision:2,reactions:1}},
 {name:'Tabito Karasu',short:'KARASU',desc:'Press resistance, analysis and targeted duels.',stats:{control:1,vision:1,defense:1,physical:1}},
 {name:'Yo Hiori',short:'HIORI',desc:'Passing technique, vision and timing.',stats:{passing:2,vision:2}},
 {name:'Jyubei Aryu',short:'ARYU',desc:'Reach, aerial play and awkward-angle defending.',stats:{physical:2,defense:1,reactions:1}},
 {name:'Gin Gagamaru',short:'GAGAMARU',desc:'Reflexes and unconventional body control.',stats:{reactions:2,physical:1,technique:1}},
 {name:'Michael Kaiser',short:'KAISER',desc:'Elite shot execution and controlling attacking space.',stats:{finishing:2,offBall:1,ego:1}},
 {name:'Don Lorenzo',short:'LORENZO',desc:'Duel defending with ball-carrying confidence.',stats:{defense:2,dribbling:1,control:1}}
];

function betweenGameStage(){
 return{key:'betweenGame',chapter:'BETWEEN GAMES',name:'What Happens This Week?',prompt:'You do not choose the opportunity. Spin to see what Blue Lock gives you before the next match.',mode:'weights',options:BETWEEN_GAME_OUTCOMES};
}
function learningStage(){
 const fixture=currentFixture(),relevant=[...(fixture?.stars||[])];
 const pool=LEARNING_PLAYERS.filter(p=>relevant.includes(p.name));
 const src=pool.length>=4?pool:LEARNING_PLAYERS;
 return{key:'learningPlayer',chapter:'LEARN FROM ANOTHER PLAYER',name:'Who Influences Your Game?',prompt:'Spin the player whose football leaves something behind in yours.',mode:'equal',options:src.map(p=>option(p.name,p.desc,'common',{},p.short,{learnStats:p.stats}))};
}
function injuryEventStage(){
 return{key:'injuryEvent',chapter:'TRAINING SETBACK',name:'How Bad Is It?',prompt:'The injury scare is real. Spin the severity.',mode:'weights',options:[
  weighted('False Alarm','Pain fades quickly; nothing meaningful is damaged.',24,{},'FINE',{matches:0,penalty:0,fitness:-2}),
  weighted('Minor Knock','You can play, but you will not be completely free.',40,{},'KNOCK',{matches:1,penalty:5,fitness:-7}),
  weighted('Muscle Strain','You carry a real physical restriction into multiple fixtures.',25,{},'STRAIN',{matches:2,penalty:10,fitness:-14}),
  weighted('Serious Injury','You miss a major stretch and return diminished.',9,{},'SERIOUS',{matches:3,penalty:14,fitness:-24,confidence:-8}),
  weighted('Medical Withdrawal','The injury is too severe to continue this Blue Lock run.',2,{},'OUT',{eliminate:true,fitness:-35,confidence:-15})
 ]};
}
function egoEventStage(){
 return{key:'egoEvent',chapter:'EGO EVENT',name:'How Do You Respond?',prompt:'Pressure can create evolution or break the version of you that entered the week.',mode:'weights',options:[
  weighted('Ego Collapse','Doubt wins. Confidence and form fall hard.',12,{},'COLLAPSE',{confidence:-14,form:-2,stats:{ego:-1}}),
  weighted('Stagnation','You understand the problem but cannot yet solve it.',24,{},'STAGNATE',{confidence:-3}),
  weighted('Resolve','You stabilise and return to your own game.',32,{},'RESOLVE',{confidence:5,stats:{ego:1}}),
  weighted('Breakthrough','You leave the week with a clearer weapon and stronger conviction.',24,{},'BREAKTHROUGH',{confidence:9,form:1,stats:{ego:2,vision:1}}),
  weighted('Ego Awakening','The pressure forces a genuine leap in how you see yourself on the pitch.',8,{},'AWAKEN',{confidence:14,form:2,stats:{ego:3,reactions:1,technique:1}})
 ]};
}
function weaponEventStage(){
 const pos=state.run.selections.position?.name||'Centre Forward';
 const defensive=isDefensiveRole(),mid=isMidfieldRole();
 const opts=defensive?[
  weighted('Sharper Duel Timing','Your defensive weapon becomes cleaner in direct contests.',30,{},'DUEL',{stats:{defense:2,reactions:1}}),
  weighted('Better First Pass','Your regain now has a more dangerous next action.',24,{},'PROGRESS',{stats:{passing:2,vision:1}}),
  weighted('Aerial Detail','You improve body shape and timing in the air.',18,{},'AERIAL',{stats:{physical:1,defense:1,reactions:1}}),
  weighted('Scanning Habit','You refresh the picture earlier and defend with more information.',20,{},'SCAN',{stats:{vision:2,reactions:1}}),
  weighted('No Useful Discovery','The idea never becomes reliable enough to use.',8,{},'NOTHING',{})
 ]:mid?[
  weighted('Faster Release','You move the ball before pressure can settle.',26,{},'RELEASE',{stats:{passing:2,reactions:1}}),
  weighted('New Receiving Angle','Your first touch opens the next lane more often.',24,{},'ANGLE',{stats:{control:2,vision:1}}),
  weighted('Late-Run Timing','You become harder to track around the box.',20,{},'RUN',{stats:{offBall:2,reactions:1}}),
  weighted('Scanning Habit','You see the next phase earlier.',22,{},'SCAN',{stats:{vision:2,reactions:1}}),
  weighted('No Useful Discovery','The idea never becomes reliable enough to use.',8,{},'NOTHING',{})
 ]:[
  weighted('Cleaner Finishing Window','Your setup touch creates a better strike.',27,{},'FINISH',{stats:{finishing:2,control:1}}),
  weighted('New Run Pattern','You learn a different way to arrive in scoring space.',24,{},'RUN',{stats:{offBall:2,acceleration:1}}),
  weighted('Stronger Shot Shape','Technique and power align more consistently.',20,{},'SHOT',{stats:{shotPower:2,technique:1}}),
  weighted('1v1 Detail','You add a small but usable change of rhythm.',21,{},'1V1',{stats:{dribbling:2,control:1}}),
  weighted('No Useful Discovery','The idea never becomes reliable enough to use.',8,{},'NOTHING',{})
 ];
 return{key:'weaponEvent',chapter:'WEAPON DEVELOPMENT',name:'What Do You Discover?',prompt:'The inspiration only matters if it becomes something usable.',mode:'weights',options:opts};
}
function emptyMatchContribution(){
 return{goals:0,assists:0,shots:0,keyPasses:0,dribbles:0,tackles:0,interceptions:0,blocks:0,clearances:0,recoveries:0,mistakes:0,bigMisses:0,bonusRating:0,labels:[]};
}
function contributionStage(){
 const fixture=currentFixture(),p=state.run.pendingMatch||{},idx=p.spinIndex||0,s=effectiveStats(),prof=positionProfile(),bonus=gameplayBonuses().match||{};
 const formBoost=state.run.form*1.8+(state.run.confidence-50)*.05+(state.run.energy-60)*.025;
 const attack=(s.finishing+s.offBall+s.reactions+s.shotPower)/4;
 const create=(s.passing+s.vision+s.control)/3;
 const carry=(s.dribbling+s.control+s.acceleration)/3;
 const defend=(s.defense+s.reactions+s.physical+s.vision)/4;
 const safe=Math.max(0,overall(s)-fixture.strength+formBoost);
 const bad=Math.max(2,18-safe*.22-(s.reactions+s.control)/28);
 const opts=[
  weighted('Major Error','A bad decision creates a dangerous moment for the opponent.',Math.max(1,bad*.45),{},'ERROR',{contrib:{mistakes:1,bonusRating:-.7}}),
  weighted('Lose Important Duel','You are beaten in a meaningful individual contest.',Math.max(2,bad*.8),{},'LOST DUEL',{contrib:{mistakes:1,bonusRating:-.28}}),
  weighted('Waste Big Chance','You get a major opening but fail to convert it.',Math.max(1,9+prof.shots*5-attack*.07),{},'BIG MISS',{contrib:{shots:1,bigMisses:1,bonusRating:-.18}}),
  weighted('Quiet Phase','The match moves around you without a decisive contribution.',16,{},'QUIET',{contrib:{}}),
  weighted('Shot on Target','You create a credible attempt without scoring.',Math.max(2,6+attack*.08*prof.shots+(bonus.shots||0)*2),{},'SHOT',{contrib:{shots:1,bonusRating:.04}}),
  weighted('Goal','You finish a decisive chance.',Math.max(.8,attack*.095*prof.shots+(bonus.goalP||0)*90+formBoost*.4),{},'GOAL',{contrib:{goals:1,shots:1,bonusRating:1.05}}),
  weighted('Brace Moment','You punish the opponent twice in the same spell.',Math.max(.15,(attack-62)*.025*prof.shots+(bonus.goalP||0)*18+Math.max(0,formBoost)*.08),{},'BRACE',{contrib:{goals:2,shots:2,bonusRating:2.05}}),
  weighted('Assist','You create the final pass for a goal.',Math.max(.8,create*.075*prof.creation+(bonus.assistP||0)*85),{},'ASSIST',{contrib:{assists:1,keyPasses:1,bonusRating:.7}}),
  weighted('Key Pass','You create a chance that someone else fails to finish.',Math.max(2,create*.1*prof.creation+(bonus.keyPasses||0)*2),{},'KEY PASS',{contrib:{keyPasses:1,bonusRating:.12}}),
  weighted('Successful Take-On','You beat an opponent and carry the attack forward.',Math.max(2,carry*.09*prof.carry+(bonus.dribbles||0)*2),{},'DRIBBLE',{contrib:{dribbles:1,bonusRating:.1}}),
  weighted('Tackle Won','You stop an opponent cleanly and win possession.',Math.max(1,defend*.085*prof.defense+(bonus.defense||0)*1.7),{},'TACKLE',{contrib:{tackles:1,bonusRating:.11}}),
  weighted('Interception','You read the pass before it reaches danger.',Math.max(1,(s.vision+s.reactions+s.defense)/36*prof.defense+(bonus.defense||0)*1.5),{},'INTERCEPT',{contrib:{interceptions:1,bonusRating:.13}}),
  weighted('Shot Block','You get between the ball and goal in time.',Math.max(.7,defend*.05*prof.defense+(bonus.blocks||0)*2.2),{},'BLOCK',{contrib:{blocks:1,bonusRating:.18}}),
  weighted('Dominant Clearance','You own a dangerous aerial or box situation.',Math.max(.7,defend*.045*prof.defense*heightAerialFactor()+(bonus.clearances||0)*2),{},'CLEAR',{contrib:{clearances:1,bonusRating:.1}}),
  weighted('Ball Recovery','You regain possession and reset the phase.',Math.max(1,(s.stamina+s.reactions+s.vision)/42*prof.defense),{},'RECOVERY',{contrib:{recoveries:1,bonusRating:.08}}),
  weighted('Last-Man Stop','You erase a chance that looked certain to become a shot.',Math.max(.2,(defend-55)*.025*prof.defense+(bonus.blocks||0)*.8),{},'LAST MAN',{contrib:{tackles:1,blocks:1,bonusRating:.42}}),
  weighted('Turnover to Chance','You win the ball and immediately create a dangerous attack.',Math.max(.2,(defend+create-105)*.035*Math.min(1.4,prof.defense)),{},'TURNOVER',{contrib:{interceptions:1,keyPasses:1,bonusRating:.32}})
 ];
 return{key:'contribution_'+idx,chapter:'MATCH CONTRIBUTION',name:'Match Moment '+(idx+1)+' / 4',prompt:'Your stats, form, role, weapons and opponent change every slice. Spin the action you actually contribute.',mode:'weights',options:opts};
}
function challengeStage(){
 const s=effectiveStats(),q=s.finishing*.28+s.reactions*.17+s.technique*.17+s.control*.14+s.stamina*.1+s.ego*.14+state.run.form*2+(state.run.confidence-50)*.08;
 const boost=(q-60)*.45;
 return{key:'challengeOutcome',chapter:'100 GOAL CHALLENGE',name:'How Many Do You Score?',prompt:'One spin. Miss 100 and the run ends.',mode:'weights',options:[
  weighted('58 Goals','The pace of the machine overwhelms you.',Math.max(1,15-boost*.15),{},'58',{score:58}),
  weighted('74 Goals','You improve, but the clock wins comfortably.',Math.max(1,20-boost*.12),{},'74',{score:74}),
  weighted('88 Goals','A respectable attempt, but still elimination.',Math.max(1,24-boost*.08),{},'88',{score:88}),
  weighted('97 Goals','You come agonisingly close.',Math.max(1,20-boost*.03),{},'97',{score:97}),
  weighted('100 Goals','You clear the line exactly.',Math.max(1,12+boost*.12),{},'100',{score:100}),
  weighted('108 Goals','You solve the test with time to spare.',Math.max(.5,7+boost*.13),{},'108',{score:108}),
  weighted('120 Goals','The finishing test becomes a demonstration.',Math.max(.2,2.5+boost*.08),{},'120',{score:120})
 ]};
}
function currentWheelStage(){
 if(state.run.mode==='nelSpin')return NEL_STAGE;
 if(state.run.mode==='statSpin')return makeStatStage();
 if(state.run.mode==='trainingSpin')return trainingOutcomeStage();
 if(state.run.mode==='betweenSpin')return betweenGameStage();
 if(state.run.mode==='learnSpin')return learningStage();
 if(state.run.mode==='injuryEventSpin')return injuryEventStage();
 if(state.run.mode==='egoEventSpin')return egoEventStage();
 if(state.run.mode==='weaponEventSpin')return weaponEventStage();
 if(state.run.mode==='contributionSpin')return contributionStage();
 if(state.run.mode==='challengeSpin')return challengeStage();
 if(state.run.mode==='survivalSpin')return secondSelectionSurvivalStage();
 return BUILD_STAGES[state.run.buildIndex];
}
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
 const mode=state.run.mode;
 if(mode==='statSpin')$('#stageCount').textContent='STAT '+((state.run.statIndex||0)+1)+' / '+ATTRS.length;
 else if(mode==='trainingSpin')$('#stageCount').textContent='TRAINING';
 else if(mode==='matchSpin')$('#stageCount').textContent='MATCH';
 else if(mode==='survivalSpin')$('#stageCount').textContent='SURVIVAL';
 else if(mode==='nelSpin')$('#stageCount').textContent='NEL';
 else $('#stageCount').textContent=(state.run.buildIndex+1)+' / '+BUILD_STAGES.length;
 $('#stageMode').textContent=stage.mode==='equal'?layout.length+' equal outcomes':'Weighted outcomes';
 g.innerHTML='';labels.innerHTML='';
 const selected=state.run.selections[stage.key]?.name;
 const normalized=((wheelRotation%360)+360)%360;

 layout.forEach((row,i)=>{
   const p=document.createElementNS('http://www.w3.org/2000/svg','path');
   p.setAttribute('d',annularPath(row.start,row.end));p.setAttribute('fill',sliceColor(row.opt,i,stage.mode));p.setAttribute('class','wheel-slice');
   if(row.opt.name===selected)p.style.filter='brightness(1.35) saturate(1.25) drop-shadow(0 0 5px #62d7ff)';
   g.appendChild(p);

   const span=row.end-row.start;
   if(span>=4.5){
     const screenAngle=(row.mid+normalized)%360,a=(screenAngle-90)*Math.PI/180,radius=span>=70?148:span>=35?151:span>=18?154:158;
     const x=260+radius*Math.cos(a),y=260+radius*Math.sin(a);
     const badge=document.createElementNS('http://www.w3.org/2000/svg','g');badge.setAttribute('class','wheel-badge');
     const label=wheelLabelText(row.opt,span).toUpperCase(),fs=span>=55?18:span>=30?16:span>=18?13:10,boxW=Math.max(48,Math.min(span>=55?112:94,label.length*(fs*.66)+22)),boxH=fs+18;
     const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',x-boxW/2);rect.setAttribute('y',y-boxH/2);rect.setAttribute('width',boxW);rect.setAttribute('height',boxH);rect.setAttribute('rx',Math.min(12,boxH/2));rect.setAttribute('class','wheel-label-badge-bg');badge.appendChild(rect);
     const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',x);t.setAttribute('y',y+.5);t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');t.setAttribute('class','wheel-label overlay-label');t.setAttribute('font-size',fs);t.textContent=label;badge.appendChild(t);labels.appendChild(badge);
   }
 });

 g.style.transformOrigin='260px 260px';g.style.transform='rotate('+wheelRotation+'deg)';
 labels.style.transformOrigin='260px 260px';labels.style.transition='none';labels.style.transform='rotate(0deg)';labels.style.opacity='1';

 const picked=state.run.selections[stage.key];$('#nextBtn').disabled=!picked;
 if(mode==='statSpin')$('#nextBtn').textContent=(state.run.statIndex>=ATTRS.length-1?'Enter Blue Lock':'Next Attribute');
 else if(mode==='trainingSpin')$('#nextBtn').textContent='Return to Match Prep';
 else if(mode==='matchSpin')$('#nextBtn').textContent='View Match Report';
 else if(mode==='survivalSpin')$('#nextBtn').textContent=(picked?.meta?.survive?'Continue Second Selection':'Accept Elimination');
 else if(mode==='nelSpin')$('#nextBtn').textContent='Enter Neo Egoist League';
 else $('#nextBtn').textContent=state.run.buildIndex===BUILD_STAGES.length-1?'Roll Starting Stats':'Next Build Stage';
 renderBuildStrip();
}
function renderBuildStrip(){
 const mode=state.run.mode;
 if(mode==='nelSpin'){$('#stageStrip').innerHTML='<span class="stage-pill current">NEL Club Selection</span>';return;}
 if(mode==='trainingSpin'){$('#stageStrip').innerHTML='<span class="stage-pill current">Training Outcome</span>';return;}
 if(mode==='matchSpin'){$('#stageStrip').innerHTML='<span class="stage-pill current">Match Performance</span>';return;}
 if(mode==='survivalSpin'){$('#stageStrip').innerHTML='<span class="stage-pill current">Selection Survival</span>';return;}
 if(mode==='statSpin'){
  $('#stageStrip').innerHTML=ATTRS.map(([k,label],i)=>'<span class="stage-pill '+(state.run.selections['stat_'+k]?'done ':'')+(i===state.run.statIndex?'current':'')+'">'+(i+1)+'. '+esc(label)+'</span>').join('');
  return;
 }
 $('#stageStrip').innerHTML=BUILD_STAGES.map((s,i)=>'<button class="stage-pill '+(state.run.selections[s.key]?'done ':'')+(i===state.run.buildIndex?'current':'')+'" data-build="'+i+'" type="button">'+(i+1)+'. '+esc(s.name)+'</button>').join('');
}
function renderSpinResult(){
 const stage=currentWheelStage(),v=state.run.selections[stage.key],mode=state.run.mode;
 if(!v){
  const copy=mode==='statSpin'?'Spin to set this exact starting attribute.':mode==='trainingSpin'?'You chose the training type. Now spin to see how the session actually goes.':mode==='matchSpin'?'Your stats and opponent set the odds. Spin to determine your performance tier.':'Spin the current wheel.';
  $('#spinResult').innerHTML='<span class="result-eyebrow">'+esc(stage.chapter)+'</span><strong>'+esc(copy)+'</strong><p>'+esc(stage.prompt)+'</p>';return;
 }
 let extra='';
 if(v.meta?.bonusText)extra='<p><strong>Bonus:</strong> '+esc(v.meta.bonusText)+'</p>';
 if(mode==='statSpin')extra='<p>This is your raw starting '+esc(stage.name.replace(' Rating','').toLowerCase())+' before archetype, physique and weapon bonuses.</p>';
 if(mode==='trainingSpin')extra='<p>The result has been applied to this training block.</p>';
 if(mode==='matchSpin')extra='<p>This performance tier drives the goals, assists, defensive actions and rating generated for the fixture.</p>';
 const rare=stage.mode==='rarity'?'<span class="result-rarity r-'+v.rarity+'">'+RARITY_LABELS[v.rarity]+' · '+fmtPct(probability(stage,v))+'</span>':'<span class="result-rarity r-rare">'+fmtPct(probability(stage,v))+'</span>';
 $('#spinResult').innerHTML='<span class="result-eyebrow">'+esc(stage.chapter)+'</span><strong>'+esc(v.name)+'</strong><p>'+esc(v.desc)+'</p>'+extra+rare;
}

function setupDerived(){
 const effects={};ATTR_KEYS.forEach(k=>effects[k]=0);
 Object.values(state.run.selections).forEach(v=>{if(!v||!v.effects)return;Object.entries(v.effects).forEach(([k,n])=>{if(k in effects)effects[k]+=n;});});
 return effects;
}
function potentialMeta(){return state.run.selections.potential?.meta||{growth:1,ceiling:87};}
function currentStats(){
 const setup=setupDerived(),stats={};const ceil=potentialMeta().ceiling||87;
 ATTR_KEYS.forEach(k=>{
  const starting=(state.run.baseStats[k]||50)+(setup[k]||0);
  const cap=Math.max(starting,ceil,k==='ego'?99:ceil);
  stats[k]=clamp(Math.round(starting+(state.run.development[k]||0)),20,cap);
 });
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
function beginStatRolls(){
 state.run.mode='statSpin';state.run.statIndex=0;wheelRotation=0;
 ATTR_KEYS.forEach(k=>delete state.run.selections['stat_'+k]);
 renderAll();save();toast('Now roll every starting attribute.');
}
function startCareer(){
 const team=state.run.selections.firstTeam?.name||'Team Z';
 state.run.mode='career';
 state.run.career={fixtureIndex:0,fixtures:preNelFixtures(team),prepared:false,betweenDone:false,betweenEvent:null,trainingAvailable:false,trainingKey:null,trainingResult:null,planKey:'balanced',history:[],log:['Entered Blue Lock with '+team+'.'],report:null,totals:{apps:0,goals:0,assists:0,shots:0,keyPasses:0,dribbles:0,tackles:0,interceptions:0,blocks:0,clearances:0,recoveries:0,ratingTotal:0,nelApps:0,nelGoals:0,nelAssists:0,nelDefActions:0,nelRatingTotal:0},firstSelectionPoints:0,thirdSelection:{apps:0,ratingTotal:0,goals:0,assists:0,defActions:0},bid:0,bidHistory:[],rival:null,complete:false,eliminated:false,finalStatus:null,finalReason:null};
 state.run.energy=100;state.run.confidence=55;state.run.form=0;state.run.fitness=100;state.run.injury=null;state.run.lastChanges={};
 save();renderAll();toast('Blue Lock career started.');
}
function currentFixture(){return state.run.career?.fixtures[state.run.career.fixtureIndex]||null;}
function careerLog(msg){const c=state.run.career;if(!c)return;c.log.unshift(msg);c.log=c.log.slice(0,20);}

function resetMatchPreparation(c){
 if(!c)return;
 c.prepared=false;c.betweenDone=false;c.betweenEvent=null;c.trainingAvailable=false;c.trainingKey=null;c.trainingResult=null;c.planKey='balanced';c.report=null;
}
function startBetweenEvent(){
 const c=state.run.career;if(!c||c.report||c.prepared||c.trainingAvailable)return;
 delete state.run.selections.betweenGame;
 state.run.mode='betweenSpin';wheelRotation=0;renderAll();save();clickSound();
}
function applyDirectBetween(meta={}){
 state.run.lastChanges={};
 Object.entries(meta.stats||{}).forEach(([k,v])=>changeStat(k,v));
 if(meta.energy)state.run.energy=clamp(state.run.energy+meta.energy,0,100);
 if(meta.fitness)state.run.fitness=clamp(state.run.fitness+meta.fitness,20,100);
 if(meta.confidence)state.run.confidence=clamp(state.run.confidence+meta.confidence,0,100);
 if(meta.form)state.run.form=clamp(state.run.form+meta.form,-3,3);
}
function resolveBetweenGameOutcome(outcome){
 const c=state.run.career;if(!c||!outcome)return;
 c.betweenEvent=outcome.name;
 const meta=outcome.meta||{};
 if(meta.kind==='direct'){
  applyDirectBetween(meta);c.betweenDone=true;c.prepared=true;c.trainingAvailable=false;careerLog('Between games: '+outcome.name+'.');
 }else if(meta.kind==='training'){
  c.trainingAvailable=true;c.betweenDone=false;c.prepared=false;careerLog('Between games: a focused training block opens.');
 }else{
  state.run.pendingBetweenFollowup=meta.kind;c.betweenDone=false;c.prepared=false;careerLog('Between games: '+outcome.name+'.');
 }
}
function resolveLearningOutcome(outcome){
 const c=state.run.career;if(!c||!outcome)return;
 state.run.lastChanges={};Object.entries(outcome.meta?.learnStats||{}).forEach(([k,v])=>changeStat(k,v));
 state.run.confidence=clamp(state.run.confidence+3,0,100);
 c.betweenDone=true;c.prepared=true;c.trainingAvailable=false;
 careerLog('Learned from '+outcome.name+': '+outcome.desc);
}
function resolveInjuryEventOutcome(outcome){
 const c=state.run.career;if(!c||!outcome)return;
 const m=outcome.meta||{};state.run.fitness=clamp(state.run.fitness+(m.fitness||0),20,100);state.run.confidence=clamp(state.run.confidence+(m.confidence||0),0,100);
 if(m.eliminate){state.run.pendingInjuryElimination=outcome.name;careerLog('Training injury: medical withdrawal is being considered.');return;}
 if(m.matches>0)state.run.injury={name:outcome.name,matches:m.matches,penalty:m.penalty||0};
 c.betweenDone=true;c.prepared=true;c.trainingAvailable=false;careerLog('Training injury outcome: '+outcome.name+'.');
}
function resolveEgoEventOutcome(outcome){
 const c=state.run.career;if(!c||!outcome)return;
 applyDirectBetween(outcome.meta||{});c.betweenDone=true;c.prepared=true;c.trainingAvailable=false;careerLog('Ego event: '+outcome.name+'.');
}
function resolveWeaponEventOutcome(outcome){
 const c=state.run.career;if(!c||!outcome)return;
 applyDirectBetween(outcome.meta||{});c.betweenDone=true;c.prepared=true;c.trainingAvailable=false;careerLog('Weapon development: '+outcome.name+'.');
}
function resolveContributionOutcome(outcome){
 const p=state.run.pendingMatch;if(!p||!outcome)return;
 const target=p.contributions||(p.contributions=emptyMatchContribution()),add=outcome.meta?.contrib||{};
 for(const [k,v] of Object.entries(add)){if(k==='labels')continue;target[k]=(target[k]||0)+v;}
 target.labels.push(outcome.name);
}
function finalizeContributionMatch(){
 const c=state.run.career,fixture=currentFixture(),p=state.run.pendingMatch;if(!c||!fixture||!p)return;
 const a=p.contributions||emptyMatchContribution(),s=effectiveStats(),prof=positionProfile(),bonus=gameplayBonuses().match||{};
 const ownStrength=fixture.teamStrength+overall()*.14+state.run.form*1.4;
 const mateLambda=clamp(.45+(ownStrength-58)/40+(s.passing+s.vision)/520+(bonus.mateGoals||0),.15,3);
 const teammateGoals=Math.max(a.assists||0,poisson(mateLambda));
 const teamGoals=(a.goals||0)+teammateGoals;
 const defActions=(a.tackles||0)+(a.interceptions||0)+(a.blocks||0)+(a.clearances||0)+(a.recoveries||0);
 const defensiveHelp=((s.defense+s.reactions+s.stamina)/3)*prof.defense+defActions*5-(a.mistakes||0)*8;
 const oppLambda=clamp(.72+(fixture.strength-62)/34-defensiveHelp/310-(bonus.oppDefense||0),.1,3.8);
 const oppGoals=poisson(oppLambda);
 const result=teamGoals>oppGoals?'WIN':teamGoals<oppGoals?'LOSS':'DRAW';
 const rating=clamp(5.8+(a.bonusRating||0)+(a.keyPasses||0)*.06+(a.dribbles||0)*.05+(result==='WIN'?.22:result==='LOSS'?-.18:0),3.2,10);
 const rep={type:'match',passed:true,minutes:state.run.injury?int(55,82):90,goals:a.goals||0,assists:a.assists||0,shots:a.shots||0,keyPasses:a.keyPasses||0,dribbles:a.dribbles||0,tackles:a.tackles||0,interceptions:a.interceptions||0,blocks:a.blocks||0,clearances:a.clearances||0,recoveries:a.recoveries||0,mistakes:a.mistakes||0,bigMisses:a.bigMisses||0,teamGoals,oppGoals,result,rating,contributionLabels:[...(a.labels||[])]};
 rep.moments=matchMoments(rep,fixture);rep.moments.unshift('Contribution spins: '+rep.contributionLabels.join(' · ')+'.');
 c.report=rep;applyPostMatch(rep,fixture);recordHistory();if(rep.goals)goalSound();
 state.run.pendingMatch=null;
}
function resolveChallengeOutcome(outcome){
 const c=state.run.career,fixture=currentFixture();if(!c||!fixture||!outcome)return;
 const score=outcome.meta?.score||0,passed=score>=100,rating=clamp(4.5+(score-70)*.07,4,9.5);
 const rep={type:'challenge',passed,challengeScore:score,rating,goals:0,assists:0,shots:score,keyPasses:0,dribbles:0,tackles:0,interceptions:0,blocks:0,clearances:0,recoveries:0,teamGoals:0,oppGoals:0,result:passed?'CLEAR':'FAIL',moments:[passed?'You score '+score+' and clear the 100 Goal Challenge.':'You score '+score+'. The target is 100, so the run is in elimination territory.']};
 c.report=rep;applyPostMatch(rep,fixture);recordHistory();state.run.pendingMatch=null;
}
function trainingAffinity(actionKey){
 return gameplayBonuses().training[actionKey]||0;
}
function resolveTrainingOutcome(outcome){
 const c=state.run.career,action=TRAINING_ACTIONS.find(x=>x.key===state.run.pendingTraining);
 if(!c||!action||!outcome)return;
 state.run.lastChanges={};
 const meta=outcome.meta||{},affinity=trainingAffinity(action.key),mult=(meta.mult??1)*(1+affinity);
 if(action.key==='rest'){
  const energyGain=Math.round(24*mult),fitnessGain=Math.round(16*mult);
  state.run.energy=clamp(state.run.energy+energyGain,0,100);
  state.run.fitness=clamp(state.run.fitness+fitnessGain,20,100);
  state.run.confidence=clamp(state.run.confidence+(meta.confidence||0),0,100);
  if(meta.extraStat)changeStat(meta.extraStat,1);
  careerLog(action.name+': '+outcome.name+' (+'+energyGain+' energy, +'+fitnessGain+' fitness).');
 }else{
  state.run.energy=clamp(state.run.energy-action.cost,0,100);
  if(meta.injury){
   state.run.fitness=clamp(state.run.fitness-12,20,100);
   state.run.injury=meta.serious?{name:'Serious muscle injury',matches:3,penalty:14}:{name:Math.random()<.3?'Muscle strain':'Training knock',matches:Math.random()<.3?2:1,penalty:Math.random()<.3?10:6};
  }else{
   Object.entries(action.effects).forEach(([k,v])=>{
    const amount=mult<0?-Math.max(1,Math.round(Math.abs(v*mult))):Math.round(v*mult);
    if(amount)changeStat(k,amount);
   });
   if(meta.extra){
    const pool=Object.keys(action.effects).filter(k=>ATTR_KEYS.includes(k));
    if(pool.length)changeStat(pick(pool),meta.awakening?3:2);
   }
  }
  state.run.confidence=clamp(state.run.confidence+(meta.confidence||0),0,100);
  if(meta.form)state.run.form=clamp(state.run.form+meta.form,-3,3);
  else if(outcome.name==='Disaster Session'||outcome.name==='Poor Session')state.run.form=clamp(state.run.form-1,-3,3);
  if(outcome.name==='Breakthrough'||outcome.name==='Ego Awakening')state.run.form=clamp(state.run.form+1,-3,3);
  careerLog(action.name+': '+outcome.name+'.');
 }
 c.trainingKey=action.key;c.trainingResult=outcome.name;c.prepared=true;c.betweenDone=true;c.trainingAvailable=false;
}
function applyTraining(key){
 const c=state.run.career;if(!c||c.prepared||c.report||!c.trainingAvailable)return;
 const action=TRAINING_ACTIONS.find(x=>x.key===key);if(!action)return;
 state.run.pendingTraining=key;
 delete state.run.selections.trainingOutcome;
 state.run.mode='trainingSpin';
 wheelRotation=0;
 renderAll();save();clickSound();
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
 const m=[],defActions=(rep.tackles||0)+(rep.interceptions||0)+(rep.blocks||0)+(rep.clearances||0)+(rep.recoveries||0);
 if(rep.goals===1)m.push('You score once against '+fixture.opponent+'.');
 if(rep.goals>1)m.push('You score '+rep.goals+' goals and become the centre of the match.');
 if(rep.assists===1)m.push('You create one goal for a teammate.');
 if(rep.assists>1)m.push('You supply '+rep.assists+' assists.');
 if(rep.dribbles>=4)m.push('You repeatedly beat opponents in possession ('+rep.dribbles+' successful carries/dribbles).');
 if(rep.tackles>=3)m.push('You win '+rep.tackles+' tackles and repeatedly kill attacks at source.');
 if(rep.interceptions>=3)m.push('You read '+rep.interceptions+' passing lanes before they can become chances.');
 if(rep.blocks>=2)m.push('You make '+rep.blocks+' decisive blocks inside dangerous phases.');
 if(rep.clearances>=4)m.push('You dominate the box with '+rep.clearances+' clearances.');
 if(rep.recoveries>=4)m.push('You recover possession '+rep.recoveries+' times and restart the attack.');
 if(defActions>=7)m.push('Your defensive output becomes one of the match’s defining features ('+defActions+' actions).');
 if(rep.rating>=8.5&&fixture.stars?.length)m.push('Your duel with '+pick(fixture.stars)+' becomes one of the match’s defining battles.');
 if(rep.rating<6&&fixture.stars?.length)m.push(pick(fixture.stars)+' repeatedly exposes the gap between your current level and the next one.');
 if(!m.length)m.push('You play a relatively quiet match without a decisive individual moment.');
 return m;
}
function simulateChallenge(fixture,tier){
 const s=effectiveStats(),perf=tier?.meta?.factor||1,quality=(s.finishing*.28+s.reactions*.16+s.technique*.16+s.control*.14+s.stamina*.1+s.ego*.16);
 const score=clamp(Math.round(78+(quality-55)*.5+(perf-1)*30+rand(-2,3)),50,100),passed=score>=82;
 const rating=clamp((tier?.meta?.rating||6.7)+(score-82)*.035,4.2,10);
 return{type:'challenge',passed,challengeScore:score,rating,performanceTier:tier?.name||'Solid',goals:0,assists:0,shots:score,keyPasses:0,dribbles:0,tackles:0,interceptions:0,teamGoals:0,oppGoals:0,result:passed?'CLEAR':'RETRY',moments:[passed?'Your '+(tier?.name||'Solid')+' performance clears the 100 Goal Challenge with '+score+' successful finishes.':'A '+(tier?.name||'Poor')+' performance leaves you on '+score+' and forces a retry.']};
}
function simulateMatch(fixture,tier){
 const s=effectiveStats(),bonus=gameplayBonuses().match||{},profile=positionProfile(),perf=tier?.meta?.factor||1,baseRating=tier?.meta?.rating||6.7,opp=fixture.strength;
 const minutes=tier?.meta?.redCard?int(18,68):tier?.meta?.injury?int(12,62):(state.run.injury?int(52,76):90);

 const involvement=clamp(Math.round((2+s.offBall/27+s.ego/48+state.run.form*.3)*(0.72+perf*.3)),1,10);
 const shots=clamp(Math.round((involvement+rand(-1,1)+(bonus.shots||0))*profile.shots),0,11);
 const baseGoalP=.05+s.finishing*.0038+s.shotPower*.00125+s.reactions*.00135+s.technique*.0007-opp*.0026+(bonus.goalP||0);
 const goalP=clamp(baseGoalP*(.72+perf*.27),.02,.72);
 const goals=binomial(shots,goalP);

 const keyPasses=clamp(Math.round(((1+s.vision/34+s.passing/45+rand(-.7,.7))*(.72+perf*.3)+(bonus.keyPasses||0))*profile.creation),0,10);
 const dribbleAttempts=clamp(Math.round(((1+s.dribbling/30+s.ego/58)*(0.75+perf*.28)+(bonus.dribbles||0))*profile.carry),0,10);
 const dribbles=binomial(dribbleAttempts,clamp(.16+s.dribbling*.0048+s.control*.0024-opp*.0028+(bonus.dribbleP||0),.1,.88));

 const defensiveAttempts=clamp(Math.round(((1+s.defense/32+s.reactions/52)*(0.74+perf*.3)+(bonus.defense||0))*profile.defense),0,14);
 const tackleP=clamp(.11+s.defense*.0048+s.physical*.0017+s.reactions*.001-opp*.0024,.08,.82);
 const tackles=binomial(defensiveAttempts,tackleP);

 const interceptionAttempts=clamp(Math.round(((s.vision/37+s.reactions/65)*(0.74+perf*.3)+(bonus.defense||0)*.32)*profile.defense),0,10);
 const interceptions=binomial(interceptionAttempts,clamp(.13+s.vision*.0038+s.reactions*.0021+s.defense*.0014-opp*.0019,.1,.78));

 const blockAttempts=clamp(Math.round(((s.defense+s.reactions)/78)*(0.7+perf*.32)*profile.defense+(bonus.blocks||0)),0,8);
 const blocks=binomial(blockAttempts,clamp(.12+s.defense*.0042+s.reactions*.0024+s.physical*.0012-opp*.002,.08,.76));

 const clearanceAttempts=clamp(Math.round(((s.defense+s.physical)/70)*(0.72+perf*.3)*profile.defense+(bonus.clearances||0)),0,10);
 const clearances=binomial(clearanceAttempts,clamp(.16+s.defense*.0037+s.physical*.003-opp*.0017,.12,.8));

 const recoveryAttempts=clamp(Math.round(((s.stamina+s.reactions+s.vision)/105)*(0.74+perf*.28)*profile.defense),0,10);
 const recoveries=binomial(recoveryAttempts,clamp(.2+s.stamina*.0022+s.reactions*.0018+s.vision*.0014,.18,.72));

 const ownStrength=fixture.teamStrength+overall()*.15+state.run.form*1.5;
 const mateLambda=clamp(.5+(ownStrength-58)/38+(s.passing+s.vision)/500+(bonus.mateGoals||0),.2,3.2);
 const teammateGoals=poisson(mateLambda);
 const assists=Math.min(teammateGoals,binomial(keyPasses,clamp(.1+s.passing*.003+s.vision*.0017+(bonus.assistP||0),.08,.62)));
 const teamGoals=goals+teammateGoals;

 const defensiveHelp=((s.defense+s.reactions+s.stamina)/3)*profile.defense;
 const directDefValue=tackles*.45+interceptions*.5+blocks*.75+clearances*.28+recoveries*.22;
 const oppLambda=clamp(.72+(opp-62)/34-defensiveHelp/300-directDefValue*.018-(bonus.oppDefense||0),.12,3.6);
 const oppGoals=poisson(oppLambda);
 const result=teamGoals>oppGoals?'WIN':teamGoals<oppGoals?'LOSS':'DRAW';

 const attackValue=goals*.4+assists*.28+keyPasses*.035+dribbles*.03-(shots-goals)*.015;
 const defenseWeight=.018+.026*profile.defense;
 const defenseValue=(tackles+interceptions)*defenseWeight+blocks*(.035+.03*profile.defense)+clearances*(.012+.014*profile.defense)+recoveries*(.01+.012*profile.defense);
 const rating=clamp(baseRating+attackValue+defenseValue+(result==='WIN'?.18:result==='LOSS'?-.15:0)+(bonus.rating||0),4,10);

 const rep={type:'match',passed:true,minutes,performanceTier:tier?.name||'Solid',goals,assists,shots,keyPasses,dribbles,tackles,interceptions,blocks,clearances,recoveries,teamGoals,oppGoals,result,rating};
 rep.moments=matchMoments(rep,fixture);rep.moments.unshift('Performance wheel: '+rep.performanceTier+'.');return rep;
}
function applyPostMatch(rep,fixture){
 const c=state.run.career,t=c.totals;
 if(rep.type==='match'){
  const defActions=(rep.tackles||0)+(rep.interceptions||0)+(rep.blocks||0)+(rep.clearances||0)+(rep.recoveries||0);
  t.apps++;t.goals+=rep.goals;t.assists+=rep.assists;t.shots+=rep.shots;t.keyPasses+=rep.keyPasses;t.dribbles+=rep.dribbles;
  t.tackles+=rep.tackles;t.interceptions+=rep.interceptions;t.blocks+=rep.blocks||0;t.clearances+=rep.clearances||0;t.recoveries+=rep.recoveries||0;t.ratingTotal+=rep.rating;
  if(fixture.stage==='Neo Egoist League'){t.nelApps++;t.nelGoals+=rep.goals;t.nelAssists+=rep.assists;t.nelDefActions+=defActions;t.nelRatingTotal+=rep.rating;}
  if(fixture.stage==='Third Selection'){c.thirdSelection=c.thirdSelection||{apps:0,ratingTotal:0,goals:0,assists:0,defActions:0};c.thirdSelection.apps++;c.thirdSelection.ratingTotal+=rep.rating;c.thirdSelection.goals+=rep.goals;c.thirdSelection.assists+=rep.assists;c.thirdSelection.defActions+=defActions;}
  if(fixture.stage==='First Selection'){if(rep.result==='WIN')c.firstSelectionPoints+=3;else if(rep.result==='DRAW')c.firstSelectionPoints+=1;}
 }
 const drain=rep.type==='match'?int(17,25)+(MATCH_PLANS.find(x=>x.key===c.planKey)?.extraEnergy||0):14;
 state.run.energy=clamp(state.run.energy-drain,0,100);state.run.fitness=clamp(state.run.fitness-int(1,5),20,100);
 if(rep.rating>=8){state.run.confidence=clamp(state.run.confidence+int(5,9),0,100);state.run.form=clamp(state.run.form+1,-3,3);}
 else if(rep.rating<6){state.run.confidence=clamp(state.run.confidence-int(5,9),0,100);state.run.form=clamp(state.run.form-1,-3,3);}
 else state.run.confidence=clamp(state.run.confidence+int(-2,3),0,100);
 state.run.lastChanges={};
 const totalDef=(rep.tackles||0)+(rep.interceptions||0)+(rep.blocks||0)+(rep.clearances||0)+(rep.recoveries||0);
 const growthPool=rep.goals?['finishing','offBall','reactions','shotPower']:rep.assists?['passing','vision','control','offBall']:totalDef>=4?['defense','reactions','stamina','physical','vision']:['ego','stamina','technique','vision'];
 const tierGrowth={'Sent Off':-1,'Injury Collapse':0,'Nightmare':-1,'Poor':0,'Quiet':1,'Solid':1,'Strong':2,'Star Performance':3,'Masterclass':4,'Flow State':5};
 const growthCount=tierGrowth[rep.performanceTier]??(rep.rating>=8?2:1);
 if(growthCount<0){changeStat(pick(growthPool),-1);}
 else for(let i=0;i<growthCount;i++)changeStat(pick(growthPool),1);
 const injuryRisk=clamp((45-state.run.energy)/180+(45-state.run.fitness)/160,.02,.25);
 if(Math.random()<injuryRisk){state.run.injury={name:Math.random()<.25?'Muscle strain':'Minor knock',matches:Math.random()<.25?2:1,penalty:Math.random()<.25?10:6};careerLog('Injury: '+state.run.injury.name+' will affect upcoming football.');}
 if(fixture.stars?.length&&Math.random()<.48){c.rival=pick(fixture.stars);careerLog(c.rival+' is emerging as a defining rival.');}
 if(fixture.stage==='Neo Egoist League')updateBid(rep);
 careerLog(fixture.stage+': '+(rep.type==='challenge'?rep.result:(fixture.team+' '+rep.teamGoals+'–'+rep.oppGoals+' '+fixture.opponent))+' · rating '+rep.rating.toFixed(1));
}
function updateBid(rep){
 const c=state.run.career,stats=currentStats(),nt=c.totals,avgNel=nt.nelApps?nt.nelRatingTotal/nt.nelApps:rep.rating;
 const defensiveValue=(nt.nelDefActions||0)*(isDefensiveRole()?1.55:.65);
 const creationValue=(nt.keyPasses||0)*(isMidfieldRole()?0.65:.3);
 const base=Math.max(0,(overall(stats)-55)*2.1+nt.nelGoals*16+nt.nelAssists*10+defensiveValue+creationValue+(avgNel-6)*12+rand(-7,11));
 const next=Math.max(3,Math.round(base));c.bid=next;c.bidHistory.push(next);
}
function resolveMatchOutcome(outcome){
 const c=state.run.career,fixture=currentFixture();if(!c||!fixture||!outcome)return;
 whistleSound();
 const rep=fixture.type==='challenge'?simulateChallenge(fixture,outcome):simulateMatch(fixture,outcome);
 if(outcome.meta?.redCard){rep.moments.unshift('A sending-off ends your match early.');state.run.confidence=clamp(state.run.confidence-8,0,100);state.run.form=clamp(state.run.form-1,-3,3);}
 if(outcome.meta?.injury){rep.moments.unshift('You are forced off injured.');state.run.injury={name:'Match injury',matches:2,penalty:10};state.run.fitness=clamp(state.run.fitness-14,20,100);}
 c.report=rep;applyPostMatch(rep,fixture);recordHistory();if(rep.goals)goalSound();
 state.run.pendingMatch=null;
}
function playFixture(){
 const c=state.run.career,fixture=currentFixture();if(!c||!fixture||!c.prepared||c.report)return;
 state.run.pendingMatch=fixture.id;
 delete state.run.selections.matchOutcome;
 state.run.mode='matchSpin';wheelRotation=0;
 renderAll();save();clickSound();
}
function advanceFixture(){
 const c=state.run.career,fixture=currentFixture();if(!c||!c.report)return;
 const rep=c.report;

 // The 100 Goal Challenge is a real elimination gate: no infinite retries.
 if(fixture.id==='goal100'&&!rep.passed){
  endRun('ELIMINATED — 100 GOAL CHALLENGE','You failed to score 100 goals before the clock expired. There is no retry.');
  return;
 }

 // Losing a small-sided Second Selection match puts your individual value on trial.
 if(['2v2','3v3','4v4'].includes(fixture.id)&&rep.result==='LOSS'){
  state.run.pendingSurvival={fixtureId:fixture.id,report:{rating:rep.rating,goals:rep.goals,assists:rep.assists,dribbles:rep.dribbles,tackles:rep.tackles,interceptions:rep.interceptions,blocks:rep.blocks||0,clearances:rep.clearances||0,recoveries:rep.recoveries||0}};
  state.run.pendingSurvivalResult=null;
  delete state.run.selections.survivalOutcome;
  state.run.mode='survivalSpin';wheelRotation=0;
  renderAll();save();toast('Your team lost. Spin to see if the winners choose you.');
  return;
 }

 // First Selection: weak teams can still produce one surviving top individual.
 const nextFixture=c.fixtures[c.fixtureIndex+1];
 if(fixture.stage==='First Selection'&&(!nextFixture||nextFixture.stage!=='First Selection')){
  const q=firstSelectionQualified();
  if(!q.pass){
   endRun('ELIMINATED — FIRST SELECTION','Your team failed to qualify and your individual output was not strong enough for the project’s individual survival route.');
   return;
  }
  careerLog(q.teamPass?'First Selection cleared through team results.':'First Selection survived through outstanding individual production.');
 }

 // Third Selection can cost you the U-20 match without killing the whole run.
 if(fixture.id==='thirdB'){
  const third=c.thirdSelection||{apps:0,ratingTotal:0,goals:0,assists:0};
  const thirdAvg=third.apps?third.ratingTotal/third.apps:rep.rating;
  const weakTrial=thirdAvg<6.45&&(third.goals+third.assists)<2;
  if(weakTrial){
   careerLog('Third Selection: you are not chosen for the Blue Lock XI. You miss the Japan U-20 match.');
   state.run.confidence=clamp(state.run.confidence-8,0,100);
   state.run.form=clamp(state.run.form-1,-3,3);
   c.fixtureIndex+=2;c.prepared=false;c.trainingKey=null;c.trainingResult=null;c.planKey='balanced';c.report=null;
   if(c.fixtureIndex>=c.fixtures.length){state.run.mode='nelSpin';wheelRotation=0;renderAll();save();return;}
   renderAll();save();return;
  }
 }

 // Losing the U-20 match destroys this Blue Lock run.
 if(fixture.id==='u20'&&rep.result==='LOSS'){
  endRun('BLUE LOCK PROJECT DEFEATED','Japan U-20 defeated Blue Lock. Your route through the project ends with the loss.');
  return;
 }

 if(state.run.injury){state.run.injury.matches--;if(state.run.injury.matches<=0){careerLog('You are fully fit again.');state.run.injury=null;}}
 state.run.energy=clamp(state.run.energy+9,0,100);state.run.fitness=clamp(state.run.fitness+5,0,100);
 c.fixtureIndex++;c.prepared=false;c.trainingKey=null;c.trainingResult=null;c.planKey='balanced';c.report=null;
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
 c.bid=bid;
 if(bid<30){
  c.complete=true;c.eliminated=true;c.finalStatus='ELIMINATED — NEL FINAL CUT';
  c.finalReason='Your final ¥'+bid+'m bid is below the qualifying line. The market does not place you inside the final Blue Lock group.';
  state.run.mode='complete';careerLog(c.finalStatus+': '+c.finalReason);renderAll();save();toast(c.finalStatus);return;
 }
 let status='Professional Prospect';
 if(bid>=220||ov>=94)status='World-Class Prospect';
 else if(bid>=150||ov>=90)status='New Generation Contender';
 else if(bid>=90||ov>=86)status='Blue Lock Star';
 else if(bid>=45||ov>=80)status='Japan U-20 Candidate';
 c.complete=true;c.eliminated=false;c.finalStatus=status;c.finalReason='You survive the final Neo Egoist League cut with a ¥'+bid+'m bid.';
 state.run.mode='complete';careerLog('Final status: '+status+' · ¥'+bid+'m bid.');renderAll();save();toast('Career complete: '+status);
}

function renderCareer(){
 const show=state.run.mode==='career'||state.run.mode==='complete';
 $('#setupPanel').hidden=show;$('#careerPanel').hidden=!show;
 if(!show)return;
 const c=state.run.career,fixture=currentFixture();
 if(c.complete){
  const eliminated=!!c.eliminated;
  $('#careerStage').textContent=eliminated?'RUN ENDED':'CAREER COMPLETE';
  $('#fixtureTitle').textContent=c.finalStatus||'Career Complete';
  $('#fixtureSubtitle').textContent=c.finalReason||('Final bid: ¥'+(c.bid||0)+'m');
  $('#fixtureCount').textContent='FINAL';$('#fixtureType').textContent=eliminated?'ELIMINATED':'ARCHIVE READY';
  $('#prepArea').hidden=true;$('#matchReport').hidden=false;
  $('#matchReport').innerHTML='<span class="result-eyebrow '+(eliminated?'loss':'win')+'">'+(eliminated?'ELIMINATED':'SURVIVED')+'</span><h3>'+esc(c.finalStatus||'Career Complete')+'</h3><p>'+esc(c.finalReason||'Your Blue Lock run is complete.')+'</p><div class="performance-line"><span>APPS <b>'+c.totals.apps+'</b></span><span>GOALS <b>'+c.totals.goals+'</b></span><span>ASSISTS <b>'+c.totals.assists+'</b></span><span>DEF <b>'+((c.totals.tackles||0)+(c.totals.interceptions||0)+(c.totals.blocks||0)+(c.totals.clearances||0)+(c.totals.recoveries||0))+'</b></span><span>BID <b>¥'+(c.bid||0)+'m</b></span></div>';
  $('#advanceFixtureBtn').hidden=true;renderCareerLog();return;
 }
 $('#prepArea').hidden=!!c.report;$('#careerStage').textContent=fixture.stage;$('#fixtureTitle').textContent=fixture.venue;$('#fixtureSubtitle').textContent=fixture.type==='challenge'?'Choose your preparation, then spin your performance in the individual qualification test.':'Choose training and a match plan. Your stats shape the odds, then the wheel decides how well you actually play.';
 $('#fixtureCount').textContent=(c.fixtureIndex+1)+' / '+c.fixtures.length;$('#fixtureType').textContent=fixture.type.toUpperCase();
 $('#homeLabel').textContent=fixture.type==='challenge'?'PLAYER':'YOUR SIDE';$('#homeTeam').textContent=fixture.team;$('#homeStars').textContent=fixture.type==='challenge'?'Beat the target to advance.':'OVR '+overall()+' · '+(state.run.selections.primaryWeapon?.name||'No weapon');
 $('#awayTeam').textContent=fixture.opponent;$('#awayStars').textContent=(fixture.stars||[]).slice(0,4).join(' · ');$('#fixtureStageTag').textContent=fixture.stage;$('#fixtureVenue').textContent=fixture.venue;
 renderCondition();renderTraining();renderPlans();
 const inj=$('#injuryNotice');if(state.run.injury){inj.hidden=false;inj.textContent=state.run.injury.name+' — '+state.run.injury.matches+' fixture(s) remaining; effective attributes are reduced.';}else inj.hidden=true;
 $('#playMatchBtn').disabled=!c.prepared;$('#playMatchBtn').textContent=fixture.type==='challenge'?'Spin Challenge Performance':'Spin Match Performance';
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
 const c=state.run.career;$('#prepStatus').textContent=c.prepared?'Result: '+(c.trainingResult||'Complete'):'Choose an action — its quality will be spun';
 $('#trainingActions').innerHTML=TRAINING_ACTIONS.map(a=>'<button type="button" class="training-action '+(c.trainingKey===a.key?'selected':'')+'" data-train="'+a.key+'" '+(c.prepared?'disabled':'')+'><strong>'+esc(a.name)+'</strong><span>'+esc(a.desc)+'</span><em>'+(a.cost<0?'+'+Math.abs(a.cost)+' energy':'-'+a.cost+' energy')+'</em></button>').join('');
}
function renderPlans(){
 const c=state.run.career;$('#matchPlans').innerHTML=MATCH_PLANS.map(p=>'<button type="button" class="plan-button '+(c.planKey===p.key?'selected':'')+'" data-plan="'+p.key+'" '+(c.report?'disabled':'')+'><strong>'+esc(p.name)+'</strong><span>'+esc(p.desc)+'</span></button>').join('');
}
function renderMatchReport(r,f){
 if(r.type==='challenge'){$('#matchReport').innerHTML='<span class="result-eyebrow">'+esc(r.result)+'</span><div class="scoreline"><strong>'+r.challengeScore+'/100</strong></div><p>'+esc(r.moments.join(' '))+'</p><div class="performance-line"><span>RATING <b>'+r.rating.toFixed(1)+'</b></span><span>ENERGY <b>'+Math.round(state.run.energy)+'</b></span></div>';return;}
 const cls=r.result==='WIN'?'win':r.result==='LOSS'?'loss':'draw';
 const defTotal=(r.tackles||0)+(r.interceptions||0)+(r.blocks||0)+(r.clearances||0)+(r.recoveries||0);
 $('#matchReport').innerHTML='<span class="result-eyebrow '+cls+'">'+r.result+'</span><div class="scoreline"><strong>'+r.teamGoals+' – '+r.oppGoals+'</strong><small>'+esc(f.team)+' vs '+esc(f.opponent)+'</small></div><div class="performance-line"><span>PERFORMANCE <b>'+esc(r.performanceTier||'—')+'</b></span><span>G <b>'+r.goals+'</b></span><span>A <b>'+r.assists+'</b></span><span>SHOTS <b>'+r.shots+'</b></span><span>KEY PASSES <b>'+r.keyPasses+'</b></span><span>DRIBBLES <b>'+r.dribbles+'</b></span><span>TACKLES <b>'+r.tackles+'</b></span><span>INTERCEPTIONS <b>'+r.interceptions+'</b></span><span>BLOCKS <b>'+(r.blocks||0)+'</b></span><span>CLEARANCES <b>'+(r.clearances||0)+'</b></span><span>RECOVERIES <b>'+(r.recoveries||0)+'</b></span><span>DEF ACTIONS <b>'+defTotal+'</b></span><span>RATING <b>'+r.rating.toFixed(1)+'</b></span></div><div class="moment-list">'+r.moments.map(m=>'<p>• '+esc(m)+'</p>').join('')+'</div>';
}
function renderCareerLog(){const c=state.run.career;$('#careerLog').innerHTML=(c?.log||[]).slice(0,8).map(x=>'<div>'+esc(x)+'</div>').join('')||'<div>No career events yet.</div>';}

function renderPlayer(){
 const stats=currentStats(),ov=overall(stats),c=state.run.career,tot=c?.totals||{apps:0,goals:0,assists:0,ratingTotal:0};
 $('#playerTitle').textContent=state.run.name||'Unnamed Egoist';$('#playerName').value=state.run.name||'';$('#overallBadge').textContent='OVR '+ov;
 $('#identityPosition').textContent=state.run.selections.position?.short||state.run.selections.position?.name||'—';$('#identityFirstTeam').textContent=state.run.selections.firstTeam?.name||'—';$('#identityNel').textContent=state.run.selections.nelClub?.name||'—';$('#identityBid').textContent=c?.bid?'¥'+c.bid+'m':'—';
 $('#totalApps').textContent=tot.apps||0;$('#totalGoals').textContent=tot.goals||0;$('#totalAssists').textContent=tot.assists||0;const totalDef=(tot.tackles||0)+(tot.interceptions||0)+(tot.blocks||0)+(tot.clearances||0)+(tot.recoveries||0);$('#totalDefActions').textContent=totalDef;$('#avgRating').textContent=tot.apps?(tot.ratingTotal/tot.apps).toFixed(2):'—';
 const archSel=state.run.selections.archetype;
 const primarySel=state.run.selections.primaryWeapon;
 const secondarySel=state.run.selections.secondaryWeapon;
 $('#archetypeLabel').textContent=archSel?(archSel.name+(archSel.meta&&archSel.meta.bonusText?' — '+archSel.meta.bonusText:'')):'—';
 $('#primaryWeaponLabel').textContent=primarySel?(primarySel.name+(primarySel.meta&&primarySel.meta.bonusText?' — '+primarySel.meta.bonusText:'')):'—';
 $('#secondaryWeaponLabel').textContent=secondarySel?(secondarySel.name+(secondarySel.meta&&secondarySel.meta.bonusText?' — '+secondarySel.meta.bonusText:'')):'—';
 $('#rivalLabel').textContent=c?.rival||'—';
 $('#statsGrid').innerHTML=ATTRS.map(([k,label])=>{const d=state.run.lastChanges[k]||0;return'<div class="stat detailed-stat"><span>'+label+'</span><strong>'+stats[k]+'</strong>'+(d?'<em class="'+(d>0?'up':'down')+'">'+(d>0?'+':'')+d+'</em>':'')+'<i><b style="width:'+stats[k]+'%"></b></i></div>';}).join('');
 const changed=Object.entries(state.run.lastChanges).filter(x=>x[1]).map(([k,v])=>(v>0?'+':'')+v+' '+(ATTRS.find(a=>a[0]===k)?.[1]||k));$('#statTrendSummary').textContent=changed.length?changed.slice(0,2).join(' · '):'Live development';
 const rows=BUILD_STAGES.map(s=>{const v=state.run.selections[s.key];return'<div class="dossier-row"><span>'+esc(s.name)+'</span><strong>'+esc(v?.name||'—')+'</strong></div>';});if(state.run.selections.nelClub)rows.push('<div class="dossier-row"><span>NEL CLUB</span><strong>'+esc(state.run.selections.nelClub.name)+'</strong></div>');$('#dossierList').innerHTML=rows.join('');
 $('#archiveBtn').disabled=!(c?.complete);
}
function renderProfile(){
 const c=state.run.career,s=currentStats(),hist=c?.history||[],tot=c?.totals||{apps:0,goals:0,assists:0,ratingTotal:0};
 $('#profileContent').innerHTML='<div class="profile-hero"><span class="kicker">CURRENT EGOIST</span><div class="profile-title">'+esc(state.run.name)+'</div><div class="profile-sub">OVR '+overall(s)+' · '+esc(state.run.selections.primaryWeapon?.name||'No primary weapon')+' · '+(c?.bid?'¥'+c.bid+'m bid':'No bid yet')+'</div></div><div class="profile-block"><span class="kicker">CAREER NUMBERS</span><h3>'+tot.apps+' appearances · '+tot.goals+' goals · '+tot.assists+' assists</h3><p class="profile-sub">Defensive actions: '+((tot.tackles||0)+(tot.interceptions||0)+(tot.blocks||0)+(tot.clearances||0)+(tot.recoveries||0))+'<br>Average rating: '+(tot.apps?(tot.ratingTotal/tot.apps).toFixed(2):'—')+'<br>First Selection points: '+(c?.firstSelectionPoints||0)+'<br>Rival: '+esc(c?.rival||'—')+'</p></div><div class="profile-block"><span class="kicker">MATCH HISTORY</span><h3>Career timeline</h3><div class="profile-timeline">'+(c?.history?.slice().reverse().map(h=>'<div class="timeline-row"><span>'+esc(h.stage)+' · '+esc(h.opponent)+'</span><strong>'+esc(h.summary)+'</strong></div>').join('')||'<div class="empty-state">Play your first match to begin the timeline.</div>')+'</div></div>';
}
function renderArchive(){
 const g=$('#archiveGrid');if(!state.archive.length){g.innerHTML='<div class="empty-state">No completed careers yet.</div>';return;}
 g.innerHTML=state.archive.map(p=>'<article class="archive-card"><span class="kicker">OVR '+p.overall+'</span><h3>'+esc(p.name)+'</h3><div class="archive-meta">'+esc(p.status)+' · '+(p.club?esc(p.club):'No NEL club')+'<br>¥'+p.bid+'m · '+p.goals+' goals · '+p.assists+' assists · '+(p.defActions||0)+' defensive actions</div></article>').join('');
}
function recordHistory(){
 const c=state.run.career,f=currentFixture(),r=c?.report;if(!c||!f||!r)return;
 c.history.push({stage:f.stage,opponent:f.opponent,summary:r.type==='challenge'?r.result+' '+r.challengeScore+'/100':r.result+' '+r.teamGoals+'–'+r.oppGoals+' · '+r.goals+'G '+r.assists+'A · '+((r.tackles||0)+(r.interceptions||0)+(r.blocks||0)+(r.clearances||0)+(r.recoveries||0))+' DEF · '+r.rating.toFixed(1)});
}

function renderView(){const v=state.ui.view||'runView';$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));$$('.nav-button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));}
function renderAll(){
 const wheelMode=['build','statSpin','trainingSpin','matchSpin','survivalSpin','nelSpin'].includes(state.run.mode);
 $('#setupPanel').hidden=!wheelMode;if(wheelMode){renderWheel();renderSpinResult();}
 renderCareer();renderPlayer();renderProfile();renderArchive();renderView();syncAudio();
 $('#quickBuildBtn').hidden=state.run.mode!=='build';
}

function spinCurrent(){
 if(spinning)return;
 if(audioEnabled)startMusic();
 const mode=state.run.mode,stage=currentWheelStage(),chosen=choose(stage),desired=360-chosen.mid;
 spinning=true;
 const previousRotation=wheelRotation;wheelRotation+=1440+((desired-(wheelRotation%360)+360)%360);const spinDelta=wheelRotation-previousRotation;
 const g=$('#wheelGroup'),labels=$('#wheelLabels');
 g.style.transition='transform 1.65s cubic-bezier(.08,.72,.12,1)';
 if(labels){labels.style.opacity='1';labels.style.transformOrigin='260px 260px';labels.style.transition='transform 1.65s cubic-bezier(.08,.72,.12,1)';labels.style.transform='rotate(0deg)';}
 spinSound();
 requestAnimationFrame(()=>{g.style.transform='rotate('+wheelRotation+'deg)';if(labels)labels.style.transform='rotate('+spinDelta+'deg)';});
 setTimeout(()=>{
  state.run.selections[stage.key]=chosen.opt;
  if(mode==='statSpin'&&chosen.opt.meta){state.run.baseStats[chosen.opt.meta.statKey]=chosen.opt.meta.value;state.run.lastChanges={[chosen.opt.meta.statKey]:0};}
  if(mode==='trainingSpin')resolveTrainingOutcome(chosen.opt);
  if(mode==='matchSpin')resolveMatchOutcome(chosen.opt);
  if(mode==='survivalSpin')resolveSurvivalOutcome(chosen.opt);
  spinning=false;
  landSound(mode==='matchSpin'?(chosen.opt.name==='Flow State'?'legendary':chosen.opt.name==='Masterclass'?'epic':'rare'):(stage.mode==='rarity'?chosen.opt.rarity:'rare'));
  renderWheel();renderSpinResult();renderPlayer();save();
 },1680);
}
function nextBuild(){
 const mode=state.run.mode,stage=currentWheelStage();if(!state.run.selections[stage.key])return;
 if(mode==='trainingSpin'){state.run.pendingTraining=null;state.run.mode='career';wheelRotation=0;renderAll();save();return;}
 if(mode==='matchSpin'){state.run.mode='career';wheelRotation=0;renderAll();save();return;}
 if(mode==='survivalSpin'){
  const result=state.run.pendingSurvivalResult;
  if(!result)return;
  if(!result.meta?.survive){
   endRun('ELIMINATED — SECOND SELECTION','Your team lost and the winners chose somebody else. You leave Blue Lock.');
   return;
  }
  if(state.run.injury){state.run.injury.matches--;if(state.run.injury.matches<=0)state.run.injury=null;}
  state.run.energy=clamp(state.run.energy+7,0,100);state.run.fitness=clamp(state.run.fitness+4,20,100);
  const career=state.run.career;
  career.fixtureIndex++;career.prepared=false;career.trainingKey=null;career.trainingResult=null;career.planKey='balanced';career.report=null;
  state.run.pendingSurvival=null;state.run.pendingSurvivalResult=null;state.run.mode='career';wheelRotation=0;
  renderAll();save();return;
 }
 if(mode==='nelSpin'){enterNEL();return;}
 if(mode==='statSpin'){
  if(state.run.statIndex<ATTRS.length-1){state.run.statIndex++;wheelRotation=0;renderAll();save();return;}
  startCareer();return;
 }
 if(state.run.buildIndex<BUILD_STAGES.length-1){state.run.buildIndex++;wheelRotation=0;renderAll();save();return;}
 beginStatRolls();
}
function quickBuild(){
 BUILD_STAGES.forEach(s=>{state.run.selections[s.key]=choose(s).opt;});
 ATTRS.forEach((_,i)=>{const st=makeStatStage(i),picked=choose(st).opt;state.run.selections[st.key]=picked;state.run.baseStats[picked.meta.statKey]=picked.meta.value;});
 state.run.buildIndex=BUILD_STAGES.length-1;state.run.statIndex=ATTRS.length-1;
 startCareer();clickSound();
}
function newRun(force=false){const progressed=Object.keys(state.run.selections).length||state.run.career;if(progressed&&!force&&!confirm('Start a new player? The current unarchived career will be replaced.'))return;state.run=defaultRun();wheelRotation=0;renderAll();save();clickSound();}
function archiveCareer(){
 const c=state.run.career;if(!c?.complete)return;state.archive.unshift({id:state.run.id,name:state.run.name,overall:overall(),status:c.finalStatus,eliminated:!!c.eliminated,reason:c.finalReason||null,bid:c.bid,goals:c.totals.goals,assists:c.totals.assists,defActions:(c.totals.tackles||0)+(c.totals.interceptions||0)+(c.totals.blocks||0)+(c.totals.clearances||0)+(c.totals.recoveries||0),club:state.run.selections.nelClub?.name||null,savedAt:Date.now()});save();renderArchive();toast(state.run.name+' archived.');newRun(true);
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