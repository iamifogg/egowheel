(() => {
  'use strict';

  const STORAGE_KEY='egowheel.save.v1';
  const AUDIO_KEY='egowheel.audio.v1';
  const VERSION=1;
  const RARITY_ORDER=['common','uncommon','rare','epic','legendary','mythic'];
  const RARITY_CHANCES={common:52,uncommon:28,rare:13,epic:5,legendary:1.5,mythic:.5};
  const RARITY_LABELS={common:'Common',uncommon:'Uncommon',rare:'Rare',epic:'Epic',legendary:'Legendary',mythic:'Mythic'};
  const RARITY_COLORS={common:'#77879b',uncommon:'#47b86a',rare:'#288fdb',epic:'#8659c7',legendary:'#d9a92d',mythic:'#dc405b'};
  const STATS=['shoot','dribble','speed','vision','pass','physical','defense','ego'];
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const int=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const o=(name,desc,rarity='common',effects={},short=null,tags=[],meta={})=>({name,desc,rarity,effects,short:short||name,tags,meta});

  const MAIN_CHARACTERS=[
    'Yoichi Isagi','Rin Itoshi','Meguru Bachira','Seishiro Nagi','Reo Mikage','Shoei Barou','Hyoma Chigiri','Rensuke Kunigami',
    'Ryusei Shidou','Sae Itoshi','Oliver Aiku','Gin Gagamaru','Ikki Niko','Jyubei Aryu','Aoshi Tokimitsu','Tabito Karasu',
    'Eita Otoya','Yo Hiori','Kenyu Yukimiya','Ranze Kurona','Zantetsu Tsurugi','Jingo Raichi','Kiyora Jin','Nijiro Nanase',
    'Gurimu Igarashi','Michael Kaiser','Alexis Ness','Don Lorenzo','Charles Chevalier','Agi'
  ];
  const characterOptions=MAIN_CHARACTERS.map(name=>o(name,`Your career becomes closely entangled with ${name}.`,'common',{},name.split(' ').slice(-1)[0]));

  const stages=[
    {key:'position',chapter:'ENTRY',name:'Starting Position',prompt:'Where do you begin on the pitch?',mode:'equal',options:[
      o('Centre Forward','You start as the most direct goal threat.','common',{shoot:3,ego:2},'CF'),
      o('Second Striker','You operate behind the main forward and attack loose space.','common',{vision:2,shoot:2,pass:1},'SS'),
      o('Left Wing','You attack from the left channel and cut toward goal.','common',{speed:2,dribble:2},'LW'),
      o('Right Wing','You attack from the right channel and stretch the back line.','common',{speed:2,dribble:2},'RW'),
      o('False Nine','You drop away from centre-backs to create and then re-enter the box.','common',{vision:3,pass:2},'F9'),
      o('Attacking Midfielder','You begin as a creator who still wants to become the scorer.','common',{vision:2,pass:3},'AM'),
      o('Target Forward','Your frame and hold-up play make you the focal point.','common',{physical:4,shoot:1},'Target'),
      o('Pressing Forward','Your value begins with relentless pressure and transition attacks.','common',{speed:2,defense:2,ego:1},'Press'),
      o('Wide Forward','You begin outside but are always looking to attack the goal.','common',{speed:2,shoot:2,dribble:1},'WF'),
      o('Shadow Striker','You specialise in appearing behind the obvious attacking line.','common',{vision:2,shoot:2,ego:1},'Shadow')
    ]},
    {key:'physique',chapter:'ENTRY',name:'Physical Profile',prompt:'What kind of body did football give you?',mode:'weighted',options:[
      o('Balanced Athlete','No glaring weakness; you can build in almost any direction.','common',{speed:2,physical:2}),
      o('Lean Runner','Light frame, excellent repeat movement and recovery.','common',{speed:4,physical:1}),
      o('Compact Build','Low centre of gravity helps you turn through traffic.','common',{dribble:4,physical:1}),
      o('Tall Striker','Reach and leverage give you a natural aerial target.','common',{physical:3,shoot:2}),
      o('Endurance Engine','You can keep making high-intensity runs after others slow down.','common',{speed:2,physical:3}),
      o('Explosive Sprinter','Your first five metres are a serious problem for defenders.','uncommon',{speed:7,ego:1}),
      o('Power Frame','You can protect the ball and force your way through contact.','uncommon',{physical:7,shoot:2}),
      o('Spring-Loaded Body','Elastic strength helps with leaps, volleys and sudden direction changes.','uncommon',{speed:3,physical:4,shoot:2}),
      o('Hyper-Flexible','Unusual mobility lets you improvise awkward touches and finishes.','rare',{dribble:5,shoot:4,physical:2}),
      o('Long-Strider','Once you reach top speed you swallow huge amounts of space.','rare',{speed:9,physical:2}),
      o('Aerial Monster','Jump timing and explosive lift make you dominant in the air.','rare',{shoot:6,physical:6}),
      o('Natural Ambidexterity','Your body mechanics are unusually symmetrical from the start.','epic',{shoot:6,dribble:4,pass:4}),
      o('Elite Genetic Specimen','Power, balance, speed and recovery are all abnormally high.','legendary',{speed:7,physical:8,shoot:4}),
      o('Perfect Football Frame','Your body seems almost custom-built for high-level attacking football.','mythic',{speed:8,physical:8,shoot:6,dribble:5})
    ]},
    {key:'potential',chapter:'ENTRY',name:'Potential',prompt:'How high is your ceiling before Blue Lock changes you?',mode:'weighted',options:[
      o('Late Bloomer','Your current ability is ordinary, but growth may come later.','common',{ego:1}),
      o('Solid Prospect','Coaches see enough ability to keep investing in you.','common',{shoot:1,dribble:1,speed:1,vision:1,pass:1,physical:1}),
      o('Above Average','You consistently stand out at school and regional level.','uncommon',{shoot:2,dribble:2,speed:2,vision:2,pass:2,physical:2}),
      o('High Potential','Your rate of improvement becomes obvious once competition rises.','uncommon',{vision:3,ego:3,shoot:2,dribble:2}),
      o('National Prospect','You were already viewed as one of the stronger forwards of your age.','rare',{shoot:4,dribble:3,speed:3,vision:3,ego:3}),
      o('Prodigy','New techniques arrive unnervingly quickly.','epic',{shoot:4,dribble:4,speed:4,vision:5,pass:3,ego:4}),
      o('Genius','You possess at least one natural quality ordinary development cannot explain.','legendary',{shoot:6,dribble:6,speed:4,vision:4,ego:6}),
      o('Generational Talent','Your ceiling is discussed in terms of the best players of your generation.','mythic',{shoot:7,dribble:7,speed:6,vision:7,pass:5,physical:5,ego:8})
    ]},
    {key:'primaryWeapon',chapter:'WEAPON',name:'Primary Weapon',prompt:'What first makes you the most dangerous player on the field?',mode:'weighted',options:[
      o('Direct Shot','You strike quickly without taking an extra touch.','common',{shoot:7,ego:1},'Direct Shot'),
      o('Off-Ball Movement','You escape attention and arrive where defenders hate you most.','common',{vision:5,speed:3},'Off-Ball'),
      o('Ball Control','Your first touch reliably puts the next action within reach.','common',{dribble:6,pass:2},'Control'),
      o('Long Shot','You are a threat before defenders think they need to step out.','common',{shoot:7},'Long Shot'),
      o('Aerial Finishing','Headers and improvised aerial strikes are genuine scoring options.','common',{shoot:5,physical:4},'Aerial'),
      o('Acceleration','You create separation the instant an opponent shifts their weight.','common',{speed:7,dribble:2},'Burst'),
      o('Creative Dribbling','You beat defenders through rhythm changes, feints and imagination.','uncommon',{dribble:9,ego:2},'Creative'),
      o('Spatial Awareness','You constantly scan relationships between players and open space.','uncommon',{vision:9,ego:2},'Spatial'),
      o('Trapping','Difficult passes become attacking opportunities through your first contact.','uncommon',{dribble:7,shoot:4},'Trap'),
      o('Curve Shot','You bend finishes around defenders and goalkeepers.','uncommon',{shoot:8},'Curve'),
      o('Explosive Speed','Your top gear can break an organised line in seconds.','uncommon',{speed:10},'Speed'),
      o('Physical Superiority','You impose yourself through balance, strength and contact tolerance.','rare',{physical:10,shoot:3},'Power'),
      o('Analytical Vision','You recognise patterns quickly enough to predict the next phase.','rare',{vision:10,pass:4},'Analysis'),
      o('Puppet Passing','You manipulate teammate movement through timing and delivery.','rare',{pass:10,vision:6},'Puppet'),
      o('Predator Finishing','Inside the box you read the goalkeeper before choosing the strike.','rare',{shoot:11,vision:4},'Predator'),
      o('Chameleon Technique','You reproduce pieces of techniques after seeing how they work.','epic',{dribble:6,vision:7,pass:5,shoot:5},'Chameleon'),
      o('Metavision Seed','Your scanning is already close to becoming a full-field predictive weapon.','epic',{vision:13,ego:4},'Meta Seed'),
      o('Two-Footed Finishing','You attack shooting windows on either side with little loss of quality.','epic',{shoot:11,dribble:4},'Two-Footed'),
      o('Perfect First Touch','Your control can kill, redirect or weaponise almost any ball.','legendary',{dribble:12,shoot:8,vision:4},'Perfect Touch'),
      o('Destroyer Instinct','Pressure strips away hesitation and turns your play frighteningly direct.','legendary',{ego:12,shoot:8,physical:5},'Destroyer'),
      o('Complete Ambidexterity','Both sides of your body function as genuine primary weapons.','mythic',{shoot:14,dribble:8,pass:7,ego:6},'Ambidextrous')
    ]},
    {key:'secondaryWeapon',chapter:'WEAPON',name:'Secondary Weapon',prompt:'What lets your main weapon survive against better opponents?',mode:'weighted',options:[
      o('One-Touch Passing','You keep combinations moving before pressure arrives.','common',{pass:5,vision:2}),
      o('Weak-Foot Training','Your weaker side becomes reliable enough to stop defenders cheating.','common',{shoot:4,dribble:2}),
      o('Pressing Sense','You recognise when a defender or keeper is vulnerable to pressure.','common',{defense:4,vision:2}),
      o('Ball Keeping','You protect possession long enough for the next option to appear.','common',{dribble:5,physical:2}),
      o('Man Marking','You are unusually disciplined when asked to erase one opponent.','common',{defense:6,physical:1}),
      o('Kick Accuracy','Your deliveries repeatedly hit the intended zone.','uncommon',{shoot:4,pass:5}),
      o('Chop Feints','Sharp cuts create the half-step needed for a finish.','uncommon',{dribble:7,speed:2}),
      o('Stealth Movement','You exploit blind spots rather than racing directly against defenders.','uncommon',{vision:5,speed:4}),
      o('Vertical Leap','Your jumping reach changes which passes count as playable.','uncommon',{physical:5,shoot:4}),
      o('Gyro Shot','A difficult spinning strike gives keepers an unusual flight to solve.','rare',{shoot:9}),
      o('Finesse Finish','You trade raw force for placement, disguise and timing.','rare',{shoot:8,vision:3}),
      o('Counter-Pressing','Losing the ball immediately triggers your best defensive work.','rare',{defense:7,speed:3,ego:2}),
      o('Adaptive Dribbling','Your 1v1 choices change according to the defender rather than a fixed move.','epic',{dribble:9,vision:5}),
      o('Reflex Finishing','In chaotic box situations your body shoots before conscious planning catches up.','epic',{shoot:10,ego:4}),
      o('Weapon Fusion','Your secondary tool naturally combines with the primary one.','legendary',{shoot:5,dribble:5,vision:5,ego:5}),
      o('No True Weak Foot','Defenders cannot reliably force you onto a harmless side.','mythic',{shoot:10,dribble:7,pass:6})
    ]},
    {key:'egoStyle',chapter:'EGO',name:'Ego Style',prompt:'What kind of selfishness drives your football?',mode:'equal',options:[
      o('Adaptation Addict','You are happiest when an opponent forces you to become something new.','common',{vision:3,ego:3},'Adapt'),
      o('The King','You want the field organised around your scoring.','common',{shoot:3,ego:4},'King'),
      o('Freedom Seeker','Rigid instructions suffocate you; space and improvisation unlock your best play.','common',{dribble:3,ego:3},'Freedom'),
      o('Perfectionist','You pursue an ideal version of each action and hate visible flaws.','common',{shoot:2,pass:2,ego:2},'Perfect'),
      o('Destroyer','You want to crush the strongest thing directly in front of you.','common',{physical:3,ego:4},'Destroy'),
      o('Puzzle Solver','Football becomes a chain of solvable information problems.','common',{vision:4,ego:2},'Puzzle'),
      o('Hunter','You wait for vulnerability, then attack without sentiment.','common',{shoot:3,vision:3},'Hunter'),
      o('Showman','Humiliation, flair and spectacle are part of winning.','common',{dribble:4,ego:2},'Showman'),
      o('Challenger','The stronger the opponent, the more alive you become.','common',{ego:4,physical:2},'Challenge'),
      o('Controller','You want to dictate which choices everyone else is allowed to make.','common',{vision:3,pass:3},'Control'),
      o('Chaos Engine','Broken structure creates opportunities you understand better than everyone else.','common',{dribble:3,vision:2,ego:2},'Chaos'),
      o('Goal Obsession','Every decision eventually collapses back into one question: can you score?','common',{shoot:4,ego:3},'Goal')
    ]},
    {key:'firstTeam',chapter:'FIRST SELECTION',name:'First Selection Team',prompt:'Which stratum team receives you?',mode:'equal',options:[
      o('Team Z','You enter the chaotic group containing Isagi, Bachira, Chigiri, Kunigami, Gagamaru and Raichi.','common',{ego:1},'TEAM Z'),
      o('Team X','You enter Barou’s orbit and experience football built around a self-declared king.','common',{physical:1,ego:2},'TEAM X'),
      o('Team Y','You join a side where Niko’s reading of the field shapes the game.','common',{vision:2},'TEAM Y'),
      o('Team W','You enter a team built around coordinated movement and the Wanima twins.','common',{pass:2},'TEAM W'),
      o('Team V','You join the strongest initial trio of Nagi, Reo and Zantetsu.','common',{dribble:1,speed:1,ego:1},'TEAM V')
    ]},
    {key:'firstArc',chapter:'FIRST SELECTION',name:'First Selection Development',prompt:'What changes when elimination becomes real?',mode:'weighted',options:[
      o('Barely Survive','You contribute just enough to remain in the project.','common',{ego:2}),
      o('Discover Your Formula','You understand the conditions that make your scoring repeatable.','uncommon',{shoot:4,vision:3,ego:3}),
      o('Clutch Goal','A decisive finish changes how teammates and rivals see you.','uncommon',{shoot:5,ego:4}),
      o('Learn to Devour','You stop admiring another player’s strength and start stealing useful pieces of it.','rare',{vision:5,ego:5,dribble:2}),
      o('Chemical Reaction','Your weapon becomes much stronger when paired with the right teammate.','rare',{pass:4,vision:4,ego:3}),
      o('Awaken Under Pressure','Your previous limits disappear during an elimination match.','epic',{shoot:5,dribble:5,speed:4,ego:7}),
      o('Become the Team Focal Point','The side restructures itself around your decisions and finishing.','epic',{shoot:6,vision:5,ego:7}),
      o('First True Flow State','For a stretch, challenge and ability align perfectly.','legendary',{shoot:7,dribble:6,vision:6,ego:8}),
      o('Dominate the Stratum','You leave the First Selection looking like the defining player of your block.','mythic',{shoot:8,dribble:7,speed:6,vision:7,ego:10})
    ]},
    {key:'rival',chapter:'RIVALRY',name:'Defining Rival',prompt:'Whose existence forces your ego to sharpen?',mode:'equal',options:characterOptions},
    {key:'chemistry',chapter:'RIVALRY',name:'Chemical Reaction Partner',prompt:'Who makes your football mutate when you combine?',mode:'equal',options:characterOptions},
    {key:'secondSelection',chapter:'SECOND SELECTION',name:'Second Selection Path',prompt:'How do you survive the small-sided battles?',mode:'weighted',options:[
      o('Chosen After a Loss','You lose, but the winning side decides your weapon is too useful to leave behind.','common',{ego:2}),
      o('Steady Climb','You progress by making consistently correct contributions.','common',{vision:2,pass:2,ego:2}),
      o('Lose a Partner, Rebuild','Being stripped of a teammate forces you to become more individually dangerous.','uncommon',{shoot:3,dribble:3,ego:4}),
      o('Devour a Specialist','A rival exposes a missing piece and you add a version of it to your game.','uncommon',{vision:4,ego:4}),
      o('Become the Pick','Multiple teams want you after the same match.','rare',{shoot:4,dribble:4,vision:3,ego:5}),
      o('Signature Duo','You and one partner become much more dangerous together than your raw ratings suggest.','rare',{pass:5,vision:4,ego:3}),
      o('Weapon Evolution','Your primary weapon gains a new application against elite opposition.','epic',{shoot:6,dribble:4,vision:5,ego:6}),
      o('Wildcard Detour','Elimination sends you through a brutal alternative route before you force your way back.','epic',{physical:8,shoot:5,ego:8}),
      o('Clear as the Ace','You become the player opponents plan around.','legendary',{shoot:7,vision:6,ego:9}),
      o('Unstoppable Selection Run','Every loss becomes immediate adaptation and every win raises your ceiling.','mythic',{shoot:7,dribble:7,speed:6,vision:8,ego:10})
    ]},
    {key:'thirdSelection',chapter:'THIRD SELECTION',name:'Third Selection Role',prompt:'How are you evaluated among Blue Lock’s surviving elite?',mode:'weighted',options:[
      o('Fringe Survivor','You remain inside the project but are not trusted centrally yet.','common',{ego:1}),
      o('Specialist Substitute','Your weapon is valuable enough for a specific tactical role.','common',{shoot:2,vision:2}),
      o('Reliable Connector','You prove capable of linking stronger individual scorers together.','uncommon',{pass:5,vision:4}),
      o('Tactical Starter','Your balance of weapon and decision-making earns meaningful minutes.','uncommon',{vision:4,pass:3,ego:2}),
      o('Breakout Candidate','You move from survivor to a player the project actively watches.','rare',{shoot:4,dribble:3,vision:4,ego:4}),
      o('Top-Six Challenger','Your performances put you near the project’s highest-rated attacking group.','epic',{shoot:5,dribble:5,vision:5,ego:6}),
      o('Blue Lock Core','You become one of the players around whom the U-20 plan can be built.','legendary',{shoot:6,vision:7,pass:4,ego:7}),
      o('Selection Monster','Your evaluation places you at the centre of every serious tactical conversation.','mythic',{shoot:7,dribble:6,speed:5,vision:8,ego:9})
    ]},
    {key:'u20',chapter:'U-20 MATCH',name:'U-20 Match Impact',prompt:'What happens when Blue Lock faces Japan’s established U-20 side?',mode:'weighted',options:[
      o('Unused Reserve','You make the squad but never find the right tactical opening.','common',{ego:1}),
      o('Late Substitute','You enter to change the tempo or chase a result.','common',{speed:2,ego:2}),
      o('Defensive Contribution','Your pressing or recovery prevents a dangerous transition.','uncommon',{defense:4,vision:2}),
      o('Create a Major Chance','One decisive pass or movement nearly becomes a goal.','uncommon',{pass:4,vision:4}),
      o('Assist','You directly create a Blue Lock goal on the biggest stage so far.','rare',{pass:6,vision:4,ego:3}),
      o('Score','You put your own name on the match with a goal.','rare',{shoot:7,ego:5}),
      o('Awaken Mid-Match','The U-20 level forces a new layer of your weapon into existence.','epic',{shoot:5,vision:6,ego:7}),
      o('Decisive Goal Contribution','The match turns on a sequence that you initiate or finish.','legendary',{shoot:7,vision:6,pass:4,ego:8}),
      o('Man of the Match','Against elite opposition your performance becomes impossible to treat as secondary.','mythic',{shoot:8,dribble:7,vision:8,ego:10})
    ]},
    {key:'nelClub',chapter:'NEO EGOIST LEAGUE',name:'NEL Club',prompt:'Which European philosophy do you choose?',mode:'equal',options:[
      o('Bastard München','Noel Noa’s environment prioritises rational results, numbers and ruthless competition.','common',{vision:2,shoot:2},'BASTARD',[],{master:'Noel Noa'}),
      o('Manshine City','Chris Prince’s environment builds a body that expresses your ideal football.','common',{speed:2,physical:3},'MANSHINE',[],{master:'Chris Prince'}),
      o('FC Barcha','Lavinho’s environment rewards creativity, rhythm and individual expression.','common',{dribble:4,ego:1},'BARCHA',[],{master:'Lavinho'}),
      o('Ubers','Marc Snuffy’s environment turns information, roles and repeatable tactics into weapons.','common',{vision:3,defense:2,pass:1},'UBERS',[],{master:'Marc Snuffy'}),
      o('Paris X Gen','Julian Loki’s environment throws elite individual talents into direct competition.','common',{speed:2,ego:3},'PXG',[],{master:'Julian Loki'})
    ]},
    {key:'nelInteraction',chapter:'NEO EGOIST LEAGUE',name:'NEL Key Interaction',prompt:'Who most directly shapes your league arc?',mode:'equal',options:[]},
    {key:'nelEvolution',chapter:'NEO EGOIST LEAGUE',name:'NEL Evolution',prompt:'What does professional-level competition force you to become?',mode:'weighted',options:[]},
    {key:'bid',chapter:'AUCTION',name:'Auction Bid',prompt:'How highly do clubs value the player you have become?',mode:'weighted',options:[
      o('¥3–10m','A professional club sees a project worth developing.','common',{ego:1},'¥3–10M',[],{bid:'¥3–10m'}),
      o('¥11–25m','Your NEL appearances establish genuine market value.','common',{ego:1},'¥11–25M',[],{bid:'¥11–25m'}),
      o('¥26–45m','You are now treated as a serious young professional prospect.','uncommon',{ego:2},'¥26–45M',[],{bid:'¥26–45m'}),
      o('¥46–70m','Your weapon is valuable enough to influence recruitment strategy.','uncommon',{ego:2},'¥46–70M',[],{bid:'¥46–70m'}),
      o('¥71–100m','Your price reflects starter-level confidence rather than mere potential.','rare',{ego:3},'¥71–100M',[],{bid:'¥71–100m'}),
      o('¥101–140m','You have become one of the most valuable Blue Lock products.','rare',{ego:4},'¥101–140M',[],{bid:'¥101–140m'}),
      o('¥141–180m','Major clubs see you as a player who can change matches immediately.','epic',{ego:5},'¥141–180M',[],{bid:'¥141–180m'}),
      o('¥181–230m','Your auction value puts you among the project’s elite names.','epic',{ego:6},'¥181–230M',[],{bid:'¥181–230m'}),
      o('¥231–300m','Your valuation reaches superstar-prospect territory.','legendary',{ego:7},'¥231–300M',[],{bid:'¥231–300m'}),
      o('¥300m+','The market treats you like a potential future face of world football.','mythic',{ego:9},'¥300M+',[],{bid:'¥300m+'})
    ]},
    {key:'finalStatus',chapter:'FINAL PROFILE',name:'Blue Lock Outcome',prompt:'Where does the programme leave you?',mode:'weighted',options:[
      o('Professional Prospect','You leave Blue Lock with a viable professional route and a defined weapon.','common',{ego:2}),
      o('Rotation-Level U-20 Player','You are useful enough to survive at international youth level.','common',{ego:2}),
      o('Japan U-20 Squad Member','You secure a place in the expanded national setup.','uncommon',{ego:3,vision:2}),
      o('Japan U-20 Starter','Your evolved weapon earns a regular place in the national eleven.','uncommon',{shoot:3,vision:3,ego:4}),
      o('Blue Lock Star','You become one of the recognisable faces of the project.','rare',{shoot:4,dribble:3,vision:3,ego:5}),
      o('Ace Candidate','Coaches can realistically imagine building the attack around you.','rare',{shoot:5,ego:6}),
      o('World-Level Prospect','Your next comparison is no longer domestic youth football.','epic',{shoot:5,dribble:4,speed:4,vision:5,ego:6}),
      o('New-Generation Contender','Your profile begins to overlap with the young players already recognised on the world stage.','legendary',{shoot:6,dribble:5,speed:4,vision:6,ego:8}),
      o('Future World No. 1 Candidate','Everything in your trajectory points toward the highest possible individual ambition.','mythic',{shoot:8,dribble:7,speed:6,vision:8,pass:5,physical:5,ego:10})
    ]}
  ];

  const NEL_INTERACTIONS={
    'Bastard München':['Yoichi Isagi','Michael Kaiser','Alexis Ness','Rensuke Kunigami','Yo Hiori','Kenyu Yukimiya','Ranze Kurona','Kiyora Jin'],
    'Manshine City':['Seishiro Nagi','Reo Mikage','Hyoma Chigiri','Agi'],
    'FC Barcha':['Meguru Bachira','Eita Otoya'],
    'Ubers':['Shoei Barou','Oliver Aiku','Ikki Niko','Jyubei Aryu','Don Lorenzo'],
    'Paris X Gen':['Rin Itoshi','Ryusei Shidou','Tabito Karasu','Aoshi Tokimitsu','Zantetsu Tsurugi','Nijiro Nanase','Charles Chevalier']
  };
  const NEL_EVOLUTIONS={
    'Bastard München':[
      o('Rational Scoring Formula','You strip unnecessary actions until every movement serves a repeatable goal.','uncommon',{shoot:5,vision:5,ego:3}),
      o('Advanced Scanning','Constant competition forces you to process the whole field before receiving.','rare',{vision:8,pass:3}),
      o('Two-Gun Finish','You build a second finishing motion so defenders cannot close one answer and feel safe.','epic',{shoot:9,dribble:3}),
      o('Metavision','Scanning, prediction and positioning become a true full-field weapon.','legendary',{vision:12,ego:6}),
      o('World-Class Adaptation','You repeatedly transform in response to elite opponents within the same match.','mythic',{vision:10,shoot:7,ego:10})
    ],
    'Manshine City':[
      o('Ideal Body Project','Training reshapes your body around the exact actions your weapon needs.','uncommon',{physical:6,speed:4}),
      o('Explosive Acceleration','Your first steps become dramatically more dangerous.','rare',{speed:9,physical:3}),
      o('Power-Technique Fusion','Strength stops being separate from technique and begins amplifying it.','epic',{physical:8,shoot:5,dribble:4}),
      o('Perfect Athletic Expression','Your body executes ideas that previously existed only in imagination.','legendary',{speed:9,physical:9,dribble:5}),
      o('Superhuman Football Body','Your athletic ceiling becomes a weapon opponents must game-plan around.','mythic',{speed:11,physical:11,shoot:6})
    ],
    'FC Barcha':[
      o('Rhythm Dribbling','You change rhythm according to the defender instead of chaining fixed moves.','uncommon',{dribble:6,ego:3}),
      o('Freeform Combination','Improvised one-twos and rotations make you difficult to predict.','rare',{dribble:6,pass:5,vision:3}),
      o('Street Creativity','You discover solutions that would never appear in a rigid tactical drill.','epic',{dribble:9,ego:6}),
      o('Monster Dribbling','Your 1v1 play becomes expressive enough to break structure on demand.','legendary',{dribble:12,speed:5,ego:6}),
      o('Total Creative Freedom','The field becomes a canvas and your technique keeps pace with imagination.','mythic',{dribble:13,pass:7,vision:6,ego:9})
    ],
    'Ubers':[
      o('Role Mastery','You learn exactly where your weapon fits inside a professional system.','uncommon',{vision:5,defense:3,pass:2}),
      o('Pattern Library','You accumulate prepared answers for common match situations.','rare',{vision:8,defense:4}),
      o('Predator Eye','Your finishing attention narrows onto the goalkeeper and the instant they become vulnerable.','epic',{shoot:9,vision:6}),
      o('Tactical Predator','You follow the plan until breaking it produces a better goal.','legendary',{vision:10,shoot:7,ego:7}),
      o('Master Strategist Striker','You weaponise both structure and rebellion.','mythic',{vision:12,pass:7,shoot:7,ego:9})
    ],
    'Paris X Gen':[
      o('Explosive Specialisation','Training removes hesitation from the strongest part of your game.','uncommon',{shoot:4,speed:4,ego:4}),
      o('Dual-System Adaptation','Competing styles force you to function inside more than one attacking structure.','rare',{vision:5,shoot:4,dribble:4}),
      o('Berserker Flow','Elite competition unlocks a much more instinctive and aggressive version of you.','epic',{shoot:7,speed:5,ego:8}),
      o('Destroyer Evolution','You seek the strongest opponent and use direct conflict to raise your level.','legendary',{shoot:8,physical:6,ego:10}),
      o('Explosive Genius','Your best moments arrive with the speed and violence of a world-level individual talent.','mythic',{shoot:10,speed:10,dribble:7,ego:10})
    ]
  };

  function randomName(){
    const first=['Haruto','Ren','Sora','Kaito','Riku','Yuto','Minato','Akira','Hayate','Shun','Taiga','Itsuki','Rei','Kou','Haru','Toma','Kei','Nao','Ryota','Seiya'];
    const last=['Amano','Kisaragi','Mizuno','Takeda','Shirakawa','Kanzaki','Aoyama','Kuroda','Fujimoto','Asakura','Naruse','Ishida','Sakurai','Hayashi','Morita','Tsukino','Endo','Kagawa','Matsuda','Kirishima'];
    return pick(first)+' '+pick(last);
  }
  function freshBaseStats(){const x={};STATS.forEach(k=>x[k]=int(44,54));return x;}
  function defaultState(){return{version:VERSION,run:{id:uid(),name:randomName(),stageIndex:0,selections:{},baseStats:freshBaseStats(),createdAt:Date.now()},archive:[],ui:{view:'runView'}};}
  function load(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!p||p.version!==VERSION)return defaultState();p.archive||=[];p.ui||={view:'runView'};p.run||=defaultState().run;p.run.selections||={};p.run.baseStats||=freshBaseStats();return p;}catch(_){return defaultState();}}

  let state=load(),wheelRotation=0,spinning=false,toastTimer=null;
  let audioEnabled=localStorage.getItem(AUDIO_KEY)!=='off',audioCtx=null,masterGain=null;
  function save(){const d=$('#saveDot'),l=$('#saveText');d?.classList.add('busy');if(l)l.textContent='Saving';try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setTimeout(()=>{d?.classList.remove('busy');if(l)l.textContent='Saved';},130);}catch(_){if(l)l.textContent='Save failed';}}
  function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300);}
  function ensureAudio(){if(!audioEnabled)return null;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!audioCtx){audioCtx=new C();masterGain=audioCtx.createGain();masterGain.gain.value=.42;masterGain.connect(audioCtx.destination);}if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx;}
  function tone(f,d=0,dur=.045,g=.04,type='triangle',slide=null){const c=ensureAudio();if(!c||!masterGain)return;const n=c.currentTime+d,o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.setValueAtTime(f,n);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,slide),n+dur);a.gain.setValueAtTime(.0001,n);a.gain.exponentialRampToValueAtTime(g,n+.004);a.gain.exponentialRampToValueAtTime(.0001,n+dur);o.connect(a);a.connect(masterGain);o.start(n);o.stop(n+dur+.02);}
  function spinSound(d=1.65){let t=.03,gap=.035,i=0;while(t<d-.08&&i<38){tone(850+(i%3)*95,t,.015,.02,'square',520);t+=gap;gap*=1.07;i++;}}
  function landSound(r){const rank=Math.max(0,RARITY_ORDER.indexOf(r));tone(140+rank*20,0,.12,.075,'triangle',90);tone(520+rank*85,.05,.18,.035,'sine',690+rank*100);if(rank>=3)tone(820+rank*100,.16,.25,.035,'sine');}
  function clickSound(){tone(420,0,.025,.018,'square',300);}

  function currentStage(){return stages[state.run.stageIndex];}
  function poolFor(stage){
    if(stage.key==='chemistry'){const rival=state.run.selections.rival?.name;return characterOptions.filter(x=>x.name!==rival);}
    if(stage.key==='nelInteraction'){const club=state.run.selections.nelClub?.name||'Bastard München';return(NEL_INTERACTIONS[club]||MAIN_CHARACTERS).map(name=>o(name,`${name} becomes the defining relationship of your ${club} spell.`,'common',{},name.split(' ').slice(-1)[0]));}
    if(stage.key==='nelEvolution'){const club=state.run.selections.nelClub?.name||'Bastard München';const generic=[
      o('Professional Tempo','You adjust to receiving, deciding and executing under far less time.','common',{vision:3,pass:2,speed:2}),
      o('Sharper Finishing','Repeated high-level reps make your shooting mechanics cleaner.','common',{shoot:5}),
      o('Press Resistance','You stop panicking when elite opponents arrive on your back.','uncommon',{dribble:5,physical:3,vision:2})
    ];return[...generic,...(NEL_EVOLUTIONS[club]||[])];}
    return stage.options;
  }
  function layoutFor(stage){
    const options=poolFor(stage);
    if(stage.mode==='equal'){const share=1/Math.max(1,options.length);let cursor=0;return options.map((opt,index)=>{const start=cursor*360;cursor+=share;const end=cursor*360;return{opt,index,start,end,mid:(start+end)/2,share,rarity:null};});}
    const present=RARITY_ORDER.filter(r=>options.some(x=>x.rarity===r)),tierTotal=present.reduce((s,r)=>s+RARITY_CHANCES[r],0)||1,groups=Object.fromEntries(present.map(r=>[r,options.filter(x=>x.rarity===r)]));let cursor=0,rows=[];
    for(const rarity of present){const tierShare=RARITY_CHANCES[rarity]/tierTotal,each=tierShare/groups[rarity].length;for(const opt of groups[rarity]){const start=cursor*360;cursor+=each;const end=cursor*360;rows.push({opt,index:options.indexOf(opt),start,end,mid:(start+end)/2,share:each,rarity});}}
    return rows;
  }
  function chooseOutcome(stage){const layout=layoutFor(stage);let roll=Math.random(),chosen=layout[layout.length-1];for(const row of layout){roll-=row.share;if(roll<=0){chosen=row;break;}}return chosen;}
  function probability(stage,opt){const row=layoutFor(stage).find(x=>x.opt.name===opt.name);return row?row.share*100:0;}
  function fmtPct(n){return n<.1?n.toFixed(2)+'%':n<1?n.toFixed(1)+'%':n.toFixed(n>=10?0:1)+'%';}
  function polar(cx,cy,r,angle){const rad=(angle-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}
  function annularPath(start,end,inner=73,outer=203){const span=end-start,gap=Math.min(.55,span*.06),a=start+gap/2,b=end-gap/2,o1=polar(260,260,outer,a),o2=polar(260,260,outer,b),i1=polar(260,260,inner,b),i2=polar(260,260,inner,a),large=b-a>180?1:0;return`M${o1.x} ${o1.y} A${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y} L${i1.x} ${i1.y} A${inner} ${inner} 0 ${large} 0 ${i2.x} ${i2.y} Z`;}
  function sliceColor(row,i,mode){if(mode==='equal'){const a=['#0d5ba6','#0a73c9','#17518d','#11406e','#23699f','#135b91','#0b4d80','#1c77ad'];return a[i%a.length];}const base={common:['#526175','#65748a'],uncommon:['#287e46','#36975a'],rare:['#17699f','#2286c6'],epic:['#5e3c91','#754bb3'],legendary:['#9f761b','#c29831'],mythic:['#a72d43','#cf3b55']},a=base[row.rarity]||base.common;return a[i%a.length];}
  function shortLabel(opt){const s=opt.short||opt.name;return s.length>14?s.slice(0,13)+'…':s;}

  function renderWheel(){
    const stage=currentStage(),layout=layoutFor(stage),group=$('#wheelGroup');
    $('#stageChapter').textContent=stage.chapter;$('#stageName').textContent=stage.name;$('#stagePrompt').textContent=stage.prompt;$('#stageCount').textContent=`${state.run.stageIndex+1} / ${stages.length}`;$('#stageMode').textContent=stage.mode==='equal'?`${layout.length} equal routes`:`${layout.length} outcomes · weighted`;
    group.innerHTML='';const selected=state.run.selections[stage.key]?.name;
    layout.forEach((row,i)=>{
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',annularPath(row.start,row.end));path.setAttribute('fill',sliceColor(row,i,stage.mode));path.setAttribute('class','wheel-slice');if(row.opt.name===selected)path.style.filter='brightness(1.3) saturate(1.25) drop-shadow(0 0 5px #62d7ff)';group.appendChild(path);
      const span=row.end-row.start;if(span>=5.2){const text=document.createElementNS('http://www.w3.org/2000/svg','text'),r=143,a=(row.mid-90)*Math.PI/180,x=260+r*Math.cos(a),y=260+r*Math.sin(a);text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','middle');text.setAttribute('class','wheel-label');text.setAttribute('font-size',span<8?'5.5':span<13?'6.7':'7.8');text.setAttribute('transform',`rotate(${row.mid} ${x} ${y})`);text.textContent=shortLabel(row.opt);group.appendChild(text);}
    });
    group.style.transformOrigin='260px 260px';group.style.transform=`rotate(${wheelRotation}deg)`;
    $('#nextBtn').disabled=!state.run.selections[stage.key]||state.run.stageIndex>=stages.length-1;$('#nextBtn').textContent=state.run.stageIndex>=stages.length-1?'Career Complete':'Next Stage';renderStageStrip();
  }
  function renderStageStrip(){$('#stageStrip').innerHTML=stages.map((s,i)=>`<button class="stage-pill ${state.run.selections[s.key]?'done':''} ${i===state.run.stageIndex?'current':''}" data-stage="${i}" type="button">${i+1}. ${esc(s.name)}</button>`).join('');}
  function totalStats(){const stats={...state.run.baseStats};for(const stage of stages){const sel=state.run.selections[stage.key];if(!sel)continue;for(const[k,v]of Object.entries(sel.effects||{}))if(k in stats)stats[k]+=v;}STATS.forEach(k=>stats[k]=clamp(Math.round(stats[k]),1,99));return stats;}
  function overall(stats){return Math.round(STATS.reduce((s,k)=>s+stats[k],0)/STATS.length);}
  function isComplete(){return stages.every(stage=>state.run.selections[stage.key]);}

  function renderPlayer(){
    const stats=totalStats(),ovr=overall(stats),s=state.run.selections;
    $('#playerTitle').textContent=state.run.name||'Unnamed Egoist';$('#overallBadge').textContent='OVR '+ovr;$('#playerName').value=state.run.name||'';
    $('#identityPosition').textContent=s.position?.short||s.position?.name||'—';$('#identityFirstTeam').textContent=s.firstTeam?.name||'—';$('#identityNel').textContent=s.nelClub?.name||'—';$('#identityBid').textContent=s.bid?.meta?.bid||s.bid?.name||'—';
    for(const k of STATS){const cap=k[0].toUpperCase()+k.slice(1),value=stats[k],el=$('#stat'+cap),bar=$('#bar'+cap);if(el)el.textContent=value;if(bar)bar.style.width=value+'%';}
    $('#dossierList').innerHTML=stages.map(stage=>{const v=s[stage.key];if(!v)return`<div class="dossier-row"><span>${esc(stage.name)}</span><strong>—</strong></div>`;const rarity=stage.mode==='equal'?'':`<em class="rarity-chip r-${v.rarity}">${RARITY_LABELS[v.rarity]}</em>`;return`<div class="dossier-row"><span>${esc(stage.name)}</span><strong>${esc(v.name)}${rarity}</strong></div>`;}).join('');
    $('#archiveBtn').disabled=!isComplete();renderProfile();
  }
  function renderProfile(){
    const s=state.run.selections,stats=totalStats(),primary=s.primaryWeapon?.name||'Undeveloped',secondary=s.secondaryWeapon?.name||'Undeveloped',club=s.nelClub?.name||'No NEL club yet',rival=s.rival?.name||'No defining rival yet',chem=s.chemistry?.name||'No chemical reaction partner yet',top=[...STATS].sort((a,b)=>stats[b]-stats[a]).slice(0,3);
    $('#profileContent').innerHTML=`<div class="profile-hero"><span class="kicker">CURRENT EGOIST</span><div class="profile-title">${esc(state.run.name)}</div><div class="profile-sub">${esc(primary)} + ${esc(secondary)} · ${esc(club)} · OVR ${overall(stats)}</div></div><div class="profile-block"><span class="kicker">CORE PROFILE</span><h3>Identity</h3><p class="profile-sub">Rival: <strong>${esc(rival)}</strong><br>Chemical reaction: <strong>${esc(chem)}</strong><br>Strongest areas: <strong>${top.map(k=>k.toUpperCase()+' '+stats[k]).join(' · ')}</strong></p></div><div class="profile-block"><span class="kicker">CAREER</span><h3>Timeline</h3><div class="profile-timeline">${stages.filter(x=>s[x.key]).map(x=>`<div class="timeline-row"><span>${esc(x.chapter)} · ${esc(x.name)}</span><strong>${esc(s[x.key].name)}</strong></div>`).join('')||'<div class="empty-state">Spin the first wheel to begin.</div>'}</div></div>`;
  }
  function renderResult(stage,selection){
    if(!selection){$('#spinResult').innerHTML='<span class="result-eyebrow">WAITING FOR INPUT</span><strong>Your career has not started.</strong><p>Spin the current wheel.</p>';return;}
    if(stage.mode==='equal')$('#spinResult').innerHTML=`<span class="result-eyebrow">ROUTE LOCKED</span><strong>${esc(selection.name)}</strong><p>${esc(selection.desc)}</p><span class="result-rarity r-rare">Route · ${fmtPct(probability(stage,selection))}</span>`;
    else $('#spinResult').innerHTML=`<span class="result-eyebrow">DEVELOPMENT LOCKED</span><strong class="r-${selection.rarity}">${esc(selection.name)}</strong><p>${esc(selection.desc)}</p><span class="result-rarity r-${selection.rarity}">${RARITY_LABELS[selection.rarity]} · ${fmtPct(probability(stage,selection))}</span>`;
  }
  function renderArchive(){
    const g=$('#archiveGrid');if(!g)return;if(!state.archive.length){g.innerHTML='<div class="empty-state">No completed players yet. Finish a career run and archive it here.</div>';return;}
    g.innerHTML=state.archive.map(p=>{const s=p.selections||{},top=[...STATS].sort((a,b)=>(p.stats?.[b]||0)-(p.stats?.[a]||0)).slice(0,3);return`<article class="archive-card"><span class="kicker">OVR ${p.overall}</span><h3>${esc(p.name)}</h3><div class="archive-meta">${esc(s.position?.name||'Unknown position')} · ${esc(s.nelClub?.name||'No NEL club')}<br>${esc(s.primaryWeapon?.name||'No weapon')} · ${esc(s.bid?.name||'No bid')}<br>Rival: ${esc(s.rival?.name||'—')}</div><div class="archive-stats">${top.map(k=>`<div><span>${k.toUpperCase()}</span><strong>${p.stats[k]}</strong></div>`).join('')}</div></article>`;}).join('');
  }
  function renderView(){const view=state.ui.view||'runView';$$('.view').forEach(v=>v.classList.toggle('active',v.id===view));$$('.nav-button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
  function renderAll(){renderWheel();renderPlayer();const stage=currentStage();renderResult(stage,state.run.selections[stage.key]);renderArchive();renderView();$('#soundBtn').textContent=audioEnabled?'🔊':'🔇';}

  function spinCurrent(animate=true){
    if(spinning)return;spinning=true;const stage=currentStage(),chosen=chooseOutcome(stage),reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,desired=360-chosen.mid;wheelRotation+=1440+((desired-(wheelRotation%360)+360)%360);const group=$('#wheelGroup');group.style.transition=(!animate||reduce)?'none':'transform 1.65s cubic-bezier(.08,.72,.12,1)';if(animate&&!reduce)spinSound(1.65);else clickSound();requestAnimationFrame(()=>group.style.transform=`rotate(${wheelRotation}deg)`);
    setTimeout(()=>{state.run.selections[stage.key]=chosen.opt;spinning=false;const rarity=stage.mode==='equal'?'rare':chosen.opt.rarity;landSound(rarity);const shell=$('#wheelShell');shell.style.setProperty('--land',stage.mode==='equal'?'#1598ff':RARITY_COLORS[rarity]);shell.classList.remove('land');void shell.offsetWidth;shell.classList.add('land');renderResult(stage,chosen.opt);renderPlayer();renderWheel();save();},(!animate||reduce)?25:1680);
  }
  function nextStage(){const stage=currentStage();if(!state.run.selections[stage.key])return;if(state.run.stageIndex<stages.length-1){state.run.stageIndex++;wheelRotation=0;renderAll();save();document.querySelector('.wheel-card')?.scrollIntoView({behavior:'smooth',block:'start'});}else toast('Career complete — archive this player.');}
  function quickRun(){clickSound();for(let i=0;i<stages.length;i++){state.run.stageIndex=i;const stage=stages[i];if(!state.run.selections[stage.key])state.run.selections[stage.key]=chooseOutcome(stage).opt;}state.run.stageIndex=stages.length-1;wheelRotation=0;renderAll();save();toast(state.run.name+' completed a full Blue Lock run.');}
  function newRun(force=false){const progressed=Object.keys(state.run.selections).length>0;if(progressed&&!force&&!confirm('Start a new player? The current unarchived run will be replaced.'))return;state.run={id:uid(),name:randomName(),stageIndex:0,selections:{},baseStats:freshBaseStats(),createdAt:Date.now()};wheelRotation=0;renderAll();save();toast('New egoist ready.');}
  function archiveCurrent(){if(!isComplete())return;const stats=totalStats();state.archive.unshift({id:state.run.id,name:state.run.name,selections:JSON.parse(JSON.stringify(state.run.selections)),stats,overall:overall(stats),savedAt:Date.now()});save();renderArchive();toast(state.run.name+' added to the archive.');newRun(true);}

  function bind(){
    $('#spinBtn').addEventListener('click',()=>spinCurrent(true));$('#nextBtn').addEventListener('click',nextStage);$('#quickRunBtn').addEventListener('click',quickRun);$('#archiveBtn').addEventListener('click',archiveCurrent);$('#newRunBtn').addEventListener('click',()=>newRun(false));
    $('#randomNameBtn').addEventListener('click',()=>{state.run.name=randomName();renderPlayer();save();clickSound();});
    $('#playerName').addEventListener('input',e=>{state.run.name=e.target.value.slice(0,36);$('#playerTitle').textContent=state.run.name||'Unnamed Egoist';save();});
    $('#soundBtn').addEventListener('click',()=>{audioEnabled=!audioEnabled;localStorage.setItem(AUDIO_KEY,audioEnabled?'on':'off');$('#soundBtn').textContent=audioEnabled?'🔊':'🔇';if(audioEnabled)clickSound();});
    $('#stageStrip').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(!b)return;const i=Number(b.dataset.stage);if(i<=state.run.stageIndex||state.run.selections[stages[i]?.key]){state.run.stageIndex=clamp(i,0,stages.length-1);wheelRotation=0;renderAll();save();}});
    $$('.nav-button').forEach(b=>b.addEventListener('click',()=>{state.ui.view=b.dataset.view;renderView();if(state.ui.view==='profileView')renderProfile();if(state.ui.view==='archiveView')renderArchive();save();clickSound();}));
    $('#clearArchiveBtn').addEventListener('click',()=>{if(!state.archive.length)return;if(confirm('Delete all archived players on this device?')){state.archive=[];save();renderArchive();toast('Archive cleared.');}});
  }
  function init(){bind();renderAll();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});}
  init();
})();