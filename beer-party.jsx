import { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================================
   BEER PARTY  —  dark-mode party game platform with Mario-Party randomness
============================================================================ */

const T = {
  bg:"#13111E", bg2:"#191527", surface:"#221D33", surface2:"#2C2542", surface3:"#392F54",
  border:"#3D3458", border2:"#52466F",
  text:"#F6F3FC", textDim:"#ADA4C9", textFaint:"#766C97",
  gold:"#FFCB45", red:"#FF5D72", blue:"#46A6FF", green:"#5BDB91",
  purple:"#B093FF", pink:"#FF7FC8", teal:"#3FE0CB", orange:"#FF9D4D",
  ink:"#14111F", // dark text on bright buttons
  shadow:"0 6px 20px -6px rgba(0,0,0,0.55)",
  shadowLg:"0 18px 50px -12px rgba(0,0,0,0.6)",
};
// gradient helper for a color → slightly lighter sibling
const grad=(c)=>`linear-gradient(150deg, ${c} 0%, ${c}cc 100%)`;
const PCOLORS=[T.red,T.blue,T.green,T.gold,T.pink,T.teal,T.purple,T.orange,"#6FB8FF","#86E36B","#C9A14A","#FF8FA3","#7FE0D4","#B79CFF","#FFB36B","#FF6F91"];
const TEAM_PRESETS=[
  {name:"Red Rockets",color:T.red},{name:"Blue Bombers",color:T.blue},
  {name:"Green Goblins",color:T.green},{name:"Gold Gladiators",color:T.gold},
  {name:"Pink Phantoms",color:T.pink},{name:"Teal Titans",color:T.teal},
];

const EQUIPMENT={
  table:{id:"table",label:"Tables",hint:"beer pong / die / flip cup",icon:"🏓",type:"count",default:1},
  pingpong:{id:"pingpong",label:"Ping pong balls",icon:"⚪",type:"toggle",default:true},
  cups:{id:"cups",label:"Solo cups",hint:"plenty of them",icon:"🥤",type:"toggle",default:true},
  cans:{id:"cans",label:"Cans",hint:"for shotgunning",icon:"🥫",type:"toggle",default:true},
  cards:{id:"cards",label:"Deck of cards",icon:"🃏",type:"toggle",default:true},
  dice:{id:"dice",label:"Dice",icon:"🎲",type:"toggle",default:true},
  coins:{id:"coins",label:"Coins / quarters",icon:"🪙",type:"toggle",default:true},
  buzzballs:{id:"buzzballs",label:"Buzz Balls",icon:"🔵",type:"toggle",default:false},
  bat:{id:"bat",label:"Bat / broom",hint:"dizzy bat",icon:"🦇",type:"toggle",default:false},
  funnel:{id:"funnel",label:"Beer funnel",icon:"🌀",type:"toggle",default:false},
  openspace:{id:"openspace",label:"Open space",hint:"yard / big room",icon:"🌳",type:"toggle",default:true},
};

const FORMATS={
  ffa:{id:"ffa",label:"Free For All",short:"FFA",desc:"Everyone for themselves",icon:"🎯",color:T.purple,minP:3,maxP:8,pts:"1st +3 · 2nd +2 · 3rd +1"},
  duel:{id:"duel",label:"1 vs 1",short:"1v1",desc:"Head-to-head duel",icon:"⚔️",color:T.red,minP:2,maxP:2,pts:"Winner +3"},
  two_v_two:{id:"two_v_two",label:"2 vs 2",short:"2v2",desc:"Two duos battle",icon:"🤜",color:T.blue,minP:4,maxP:4,pts:"Each winner +2"},
  three_v_three:{id:"three_v_three",label:"3 vs 3",short:"3v3",desc:"Two trios clash",icon:"🛡️",color:T.teal,minP:6,maxP:6,pts:"Each winner +2"},
  partners:{id:"partners",label:"Partners",short:"Pairs",desc:"Random pairs compete",icon:"🤝",color:T.green,minP:4,maxP:8,pts:"Each winner +3"},
  split:{id:"split",label:"Team Split",short:"Split",desc:"Half the group vs the other",icon:"⚡",color:T.gold,minP:4,maxP:12,pts:"Each winner +2"},
  one_v_all:{id:"one_v_all",label:"1 vs All",short:"1vAll",desc:"One hero vs everyone",icon:"👑",color:T.orange,minP:3,maxP:12,pts:"Solo win +4 · else group +2 each"},
  trio:{id:"trio",label:"1v1v1",short:"1v1v1",desc:"Three-way showdown",icon:"🔱",color:T.pink,minP:3,maxP:3,pts:"1st +3 · 2nd +2 · 3rd +1"},
};

const GAMES={
  beer_pong:{id:"beer_pong",name:"Beer Pong",emoji:"🏓",station:"table",needs:["table","pingpong","cups"],fits:["two_v_two","duel"],min:2,max:4,dur:"15 min",blurb:"Sink balls into the other team's cups.",rules:["Set 10 cups in a triangle on each end.","Teams alternate throwing 2 balls per turn.","Sink a ball → that cup is removed and drunk.","Bounce shots = 2 cups (defenders may swat bounces).","Re-rack on request at 6, 3, and 1 cups.","Last team with cups loses; losers get a redemption throw."]},
  beer_die:{id:"beer_die",name:"Beer Die",emoji:"🎲",station:"table",needs:["table","dice","cups"],fits:["two_v_two","partners","duel"],min:2,max:4,dur:"20 min",blurb:"Toss a die over a height line; opponents catch.",rules:["Each player keeps a cup near their corner.","Throw the die so it arcs above head height.","Lands in a cup → drink + point against that team.","Bounces off table uncaught (one hand) → throwing team drinks.","Roll a 5 on the table = everyone drinks.","First to 7, win by 2."]},
  flip_cup:{id:"flip_cup",name:"Flip Cup",emoji:"🍺",station:"table",needs:["table","cups"],fits:["split","two_v_two","three_v_three","partners","duel"],min:2,max:12,dur:"5 min",blurb:"Relay: drink, then flip your cup upright.",rules:["Teams line up on opposite sides.","On GO the first players drink their full cup.","Set the empty cup on the edge, flip with one finger to land upside-up.","Next teammate starts only once the flip lands.","First team to flip every cup wins. Best 2 of 3."]},
  stack_cup:{id:"stack_cup",name:"Stack Cup",emoji:"🗼",station:"table",needs:["table","pingpong","cups"],fits:["ffa","split","two_v_two"],min:3,max:10,dur:"10 min",diagram:"stack_cup",blurb:"One ball goes around the circle — sink it and pass before it catches up to you.",
    setup:["Everyone stands in a circle around the table. No center pile of cups.","Give ONE player a single empty cup with ONE ping pong ball resting in it.","Each player keeps their own drink in hand."],
    rules:["GOAL: keep the ball moving — don't be the bottleneck who lets it pile up on you.","On your turn you bounce the ball off the table and into the cup, then pass BOTH the cup and ball to your left.","One try, one bounce — make it and pass it along smoothly.","If you MISS, you keep trying while the next person waits — and every miss adds a penalty cup onto your stack. The more you miss, the taller your stack of shame.","The catch: it's a relay of one cup, so a slow or clumsy player becomes obvious fast. Whoever has the tallest stack of missed-cups when you call time is the loser and finishes their drink.","Simple, social, and forgiving — great as a warm-up or for mixed-skill groups. (Compare to Rage Cage, which is a frantic 2-ball elimination race.)"]},
  rage_cage:{id:"rage_cage",name:"Rage Cage",emoji:"😤",station:"table",needs:["table","pingpong","cups"],fits:["ffa","split"],min:4,max:10,dur:"12 min",diagram:"rage_cage",blurb:"Frantic bounce-and-stack race around a circle.",
    setup:["Everyone stands in a circle around a table.","Fill a bunch of cups about ⅓ full and crowd them in the CENTER of the table.","Add ONE empty cup to the center too — this is the 'rage cup'.","You need exactly 2 ping pong balls to start, given to two players sitting roughly opposite each other."],
    rules:["GOAL: don't be the person left holding the rage cup at the end.","The 2 players with balls race AT THE SAME TIME to bounce their ball into their own empty cup (bounce off the table, into the cup).","The instant you sink it: grab any full cup from the center, drink it, and flip your now-empty cup upside-down in front of you. Pass the BALL to your left.","Here's the catch — you're racing the person to your right. If you sink your ball and stack your empty cup INTO their cup before they've sunk theirs, they're 'caged': they must chug a center cup as a penalty.","Keep bouncing, drinking, and passing around the circle as fast as you can. It's a continuous chain reaction — balls move left, pressure builds.","When only the single empty 'rage cup' is left in the center, whoever is forced to grab and chug it LOSES the round. Everyone else is safe.","Key difference from Stack Cup: Rage Cage uses TWO balls and a center pile, runs simultaneously, and eliminates — it's fast and cutthroat. Stack Cup uses ONE ball passed around and is the chill version."]},
  civil_war:{id:"civil_war",name:"Civil War",emoji:"⚔️",station:"table",needs:["table","pingpong","cups"],fits:["three_v_three","two_v_two","split"],min:4,max:8,dur:"15 min",blurb:"Non-stop simultaneous pong — no turns.",rules:["Each player has 3-6 cups on their team's side.","No turns — throw whenever you have a ball.","Sink an opponent's cup → they drink & remove it.","A player with no cups left is out.","First team to clear the other side wins."]},
  survival_flip:{id:"survival_flip",name:"Survival Flip",emoji:"🔄",station:"table",needs:["table","cups"],fits:["ffa","split"],min:3,max:10,dur:"8 min",blurb:"Flip cup, last to land each round is out.",rules:["Everyone lines up with a cup.","On GO all drink and flip simultaneously.","Last person to land their flip is eliminated.","Re-drink, repeat with fewer players.","Last flipper standing wins."]},
  shotgun_race:{id:"shotgun_race",name:"Shotgun Race",emoji:"💨",station:"open",needs:["cans"],fits:["ffa","duel","one_v_all","split","two_v_two","trio"],min:2,max:12,dur:"1 min",blurb:"Crack from the side and chug. First empty wins.",rules:["Each racer holds a full can.","Poke a hole low on the side with a key.","On GO open the top tab and drink through the side hole.","First to fully empty wins.","No big spills — judges' call."]},
  funnel_race:{id:"funnel_race",name:"Funnel Race",emoji:"🌀",station:"open",needs:["funnel"],fits:["duel","ffa","two_v_two","trio"],min:2,max:6,dur:"2 min",blurb:"Funnel a beer as fast as possible.",rules:["Each racer gets a loaded funnel (held closed).","On GO release and drink it all.","First to show an empty funnel wins.","No biting tricks or spills."]},
  dizzy_bat:{id:"dizzy_bat",name:"Dizzy Bat",emoji:"🦇",station:"open",needs:["bat","openspace"],fits:["duel","ffa","one_v_all","trio"],min:2,max:6,dur:"3 min",blurb:"Chug, spin on a bat, race to the line.",rules:["Chug a beer (poured in the bat or a can).","Forehead on the bat, spin 8-10 times.","On the last spin race ~20 ft to the line.","First across upright wins. Falling = restart.","Play on grass for safety."]},
  chug_dash:{id:"chug_dash",name:"Chug & Dash",emoji:"🏃",station:"open",needs:["cans","openspace"],fits:["duel","ffa","two_v_two","trio","split"],min:2,max:12,dur:"2 min",blurb:"Relay: run, chug, run back, tag next.",rules:["Set a chug station ~15 ft away.","On GO sprint, chug a full drink, sprint back, tag the next.","Continue through the whole team.","First team fully finished wins."]},
  speed_quarters:{id:"speed_quarters",name:"Speed Quarters",emoji:"🪙",station:"floor",needs:["coins","cups"],fits:["ffa","duel","two_v_two","partners","trio"],min:2,max:8,dur:"5 min",blurb:"Bounce a quarter into the cup — fastest streak.",rules:["Each player: a quarter and a cup on a hard surface.","Bounce the quarter off the surface into the cup.","First to sink 3 in a row wins.","No leaning over the cup. Misses reset your streak."]},
  flip_showdown:{id:"flip_showdown",name:"Flip Showdown",emoji:"🥤",station:"floor",needs:["cups"],fits:["ffa","duel","trio"],min:2,max:8,dur:"4 min",blurb:"Most successful flips in 30 seconds.",rules:["Each player gets a cup at an edge.","On GO flip to land upside-up as many times as you can in 30s.","Drink between flips for the spicy version.","Most flips wins."]},
  pyramid:{id:"pyramid",name:"Pyramid",emoji:"🃏",station:"floor",needs:["cards"],fits:["ffa","split"],min:3,max:10,dur:"10 min",diagram:"pyramid",blurb:"A memory + bluffing card game. Assign drinks, or get caught lying.",
    setup:["Use one deck of cards. Deal each player the SAME number of face-down cards (usually 4). Players may LOOK at their own cards once and try to memorize them — then leave them face-down in front of them.","From the remaining deck, build a pyramid of face-down cards in the middle: a bottom row of 5, then 4, then 3, then 2, then 1 on top (any size works — bigger pyramid = longer game).","Assign a drink value to each row: bottom row = 1 drink, next = 2, then 3, 4, and the top card = 5."],
    rules:["The dealer flips ONE pyramid card face-up, starting with the bottom row.","If you have a card in your hand of the SAME RANK as the flipped card (e.g. both 7s — suit doesn't matter), you MAY point at someone and say 'drink' for that row's value. You can also bluff and pretend you have a match even if you don't!","The person you target has two choices: (a) accept it and drink, OR (b) call your bluff by saying 'show me'.","If they call your bluff: you must reveal a matching card from your hand. If you really had it → THEY drink DOUBLE. If you were lying → YOU drink double.","Multiple people can pile drinks on the same target from one flipped card. Drinks can stack fast on the higher rows.","Work up the pyramid row by row. Higher rows = bigger drinks and bigger bluffs. When the top card is resolved, the round ends.","Drinking is optional — play it as a pure bluffing/memory game and just track who got 'caught' lying for scoring."]},
  horse_race:{id:"horse_race",name:"Horse Race",emoji:"🐎",station:"floor",needs:["cards"],fits:["ffa","split"],min:3,max:12,dur:"8 min",diagram:"horse_race",blurb:"Bet on a suit, then watch the four aces race to the finish.",
    setup:["Take the 4 ACES out of the deck and lay them in a row — these are your 4 'horses' (♠ ♥ ♦ ♣). This is the starting line.","From the rest of the deck, deal 7 cards face-DOWN in a vertical column next to the horses. These are the 7 'furlongs' (the track / finish line markers).","Shuffle the remaining deck — this is your draw pile."],
    rules:["Everyone BETS on which suit they think will win (just call it out, or wager drinks/points). Multiple people can back the same horse.","The dealer flips the top card of the draw pile. Whatever SUIT it is, that horse moves forward one step.","Keep flipping. Horses race forward as their suits get drawn — first one to pass all 7 furlongs wins.","The twist: each time a horse reaches the next furlong line, flip that furlong's face-down card. Whatever suit IT is, that horse gets knocked BACK one step. This keeps the race close and dramatic.","First horse to cross the finish line wins the race.","Backers of the winning suit win the round (or hand out their wagered drinks); backers of losing suits drink. Pure luck — anyone can win."]},
  most_likely:{id:"most_likely",name:"Most Likely To",emoji:"🗳️",station:"any",needs:[],fits:["ffa"],min:3,max:16,dur:"5 min",blurb:"Point-and-vote. No equipment.",rules:["Read a 'Most likely to…' prompt.","On 3 everyone points at one person.","Drink a sip per finger pointing at you.","Most-pointed-at player wins the round.","Great filler — anyone can join."]},
  paranoia:{id:"paranoia",name:"Paranoia",emoji:"🤫",station:"any",needs:[],fits:["ffa"],min:3,max:12,dur:"5 min",blurb:"Whispered questions, public guesses.",rules:["Whisper a question to your neighbor ('Who'd survive a zombie apocalypse?').","They answer OUT LOUD with a name.","No one else heard the question.","The named person pays a sip to learn it, or stays paranoid.","Pass around the circle."]},
  thumb_master:{id:"thumb_master",name:"Thumb Master",emoji:"👍",station:"any",needs:[],fits:["ffa"],min:3,max:16,dur:"ongoing",passive:true,blurb:"Sneaky ongoing game — last to copy drinks.",rules:["Anytime, quietly put your thumb on the table.","Everyone who notices copies you.","The LAST to put their thumb down drinks.","Runs in the background all night."]},
  king_of_table:{id:"king_of_table",name:"King of the Table",emoji:"🤴",station:"table",needs:["table","pingpong","cups"],fits:["one_v_all"],min:3,max:6,dur:"10 min",blurb:"The One defends the table against all challengers.",rules:["The One sets 6 cups on their end; the group shares just 4 cups on theirs — that gap is the group's handicap for outnumbering.","The group throws in rotation, one ball each; The One throws 2 balls per rotation.","Sink an opposing cup → it's removed and that side drinks.","The One wins (+4) by clearing the group's 4 cups first.","The group wins (+2 each) by clearing The One's 6 cups first.","Scale the cup counts to keep it a fair ~50/50 fight for your crowd."]},
  the_gauntlet:{id:"the_gauntlet",name:"The Gauntlet",emoji:"🥊",station:"open",needs:["cans"],fits:["one_v_all"],min:3,max:12,dur:"3 min",blurb:"The One out-chugs the entire group's relay.",rules:["The One must finish 2 drinks solo, back to back.","The rest form a relay — each person chugs ONE drink, then taps the next.","Both sides start on GO.","The One wins (+4) by finishing both drinks before the relay completes.","The group wins (+2 each) if their relay finishes first.","Bump The One's drink count up or down to balance for group size."]},
  boss_flip:{id:"boss_flip",name:"Boss Flip",emoji:"👹",station:"table",needs:["table","cups"],fits:["one_v_all"],min:3,max:10,dur:"5 min",blurb:"The One races the group's flip-cup relay.",rules:["The One must land 4 successful cup flips.","The rest run a normal flip-cup relay down their line.","Both start on GO.","The One wins (+4) by hitting their flips first; the group wins (+2 each) if the relay lands first.","Set The One's flip target near the relay length to keep it even."]},
  stump_the_one:{id:"stump_the_one",name:"Stump the One",emoji:"🧠",station:"any",needs:[],fits:["one_v_all"],min:3,max:14,dur:"4 min",blurb:"The One picks a category; the group must keep up.",rules:["The One names a category (e.g. 'NBA teams', 'beer brands').","Going around the circle, each of the rest names a unique item within 3 seconds.","Repeat, blank, or stall → you're out and you drink.","The One wins (+4) if they outlast over half the group.","Otherwise the group wins (+2 each).","No equipment — great for pulling benched players in."]},

  trivia_duel:{id:"trivia_duel",name:"Trivia Duel",emoji:"❓",station:"any",needs:[],fits:["duel","ffa","two_v_two","split"],min:2,max:12,dur:"6 min",blurb:"No drinking required — just brains. Loser sips.",rules:["One person (or your phone) reads trivia questions.","First to shout the correct answer scores a point.","Best of 5 questions wins the match.","Optional: each wrong buzz-in = a sip.","Pure skill — drinking is just the side stakes."]},
  charades:{id:"charades",name:"Charades",emoji:"🎭",station:"any",needs:[],fits:["two_v_two","split","three_v_three"],min:4,max:16,dur:"8 min",blurb:"Act it out, no words. Skill game — sip if you blank.",rules:["Teams take turns; one member acts out a word/phrase silently.","Their team guesses before the 60-second timer runs out.","Correct guess = a point for that team.","Most points after equal rounds wins.","Optional: a missed clue = the actor takes a sip."]},
  rock_paper_war:{id:"rock_paper_war",name:"RPS Tournament",emoji:"✊",station:"any",needs:[],fits:["ffa","duel","one_v_all"],min:2,max:16,dur:"4 min",blurb:"Rock-paper-scissors bracket. Pure luck & nerve.",rules:["Single-elimination rock-paper-scissors bracket.","Best of 3 each matchup; winner advances.","Losers can cheer (or sip) and watch the finals.","Last person standing wins. Zero equipment, any group size."]},
  category_clap:{id:"category_clap",name:"Rhythm Categories",emoji:"👏",station:"any",needs:[],fits:["ffa","one_v_all"],min:3,max:14,dur:"5 min",blurb:"Keep the beat, name things on rhythm. Miss = out.",rules:["Set a steady clap-clap rhythm as a group.","Pick a category. Going around, each person names an item ON the beat.","Break rhythm, repeat, or blank → you're out (and sip).","Last one keeping the beat wins.","In 1-vs-All, The One sets a brutal pace to try to break everyone."]},
  the_floor_is:{id:"the_floor_is",name:"The Floor Is…",emoji:"🌋",station:"open",needs:["openspace"],fits:["ffa","one_v_all"],min:3,max:16,dur:"3 min",blurb:"Caller shouts a surface; last to reach it is out.",rules:["One caller (or rotate) shouts 'The floor is ___!' (lava, water, etc.).","Everyone scrambles off the ground onto furniture/objects.","Last person still touching the floor is out and sips.","Repeat until one winner remains.","In 1-vs-All, The One is the caller trying to catch the group."]},
  mind_meld:{id:"mind_meld",name:"Mind Meld",emoji:"🧩",station:"any",needs:[],fits:["partners","two_v_two"],min:4,max:12,dur:"5 min",blurb:"Partners try to say the same word at once.",rules:["Pairs count down 3-2-1 and each says a word out loud.","If they don't match, both new words become the next target.","Keep going — the goal is to 'meld' on the same word.","Fewest rounds to match wins. Hilarious and dry by default.","Optional: each non-match round = a sip."]},
  flip_off:{id:"flip_off",name:"Coin Flip Showdown",emoji:"🎰",station:"any",needs:["coins"],fits:["ffa","duel","one_v_all"],min:2,max:16,dur:"2 min",blurb:"Call it in the air. Pure 50/50 chaos elimination.",rules:["Everyone stands. A coin is flipped; everyone calls heads or tails (hand on head or tail-end).","Wrong callers are eliminated each flip.","Keep flipping until one caller remains — that's your winner.","Dead simple, works for any crowd size.","Optional: eliminated players take a sip."]},

  king_defense:{id:"king_defense",name:"King's Dodgeball",emoji:"🥎",station:"open",needs:["openspace"],fits:["one_v_all"],min:3,max:12,dur:"4 min",blurb:"The One dodges; the group tries to tag them. No drinking needed.",rules:["The One stands in a marked zone; the group has a soft ball (or balled-up socks).","The group throws to tag The One below the shoulders within 90 seconds.","The One wins (+4) by surviving untagged; the group wins (+2 each) on a clean hit.","Move the zone size to balance for crowd size.","Optional: a tag = The One sips; a miss-the-whole-time = the group sips."]},
  spotlight:{id:"spotlight",name:"Spotlight",emoji:"🔦",station:"any",needs:[],fits:["one_v_all"],min:3,max:14,dur:"4 min",blurb:"The group fires rapid questions; The One can't say a banned word.",rules:["Pick a banned word/answer (e.g. can't say 'yes', 'no', or 'um').","The group rapid-fires questions at The One for 60 seconds.","The One must answer every question without slipping.","The One wins (+4) by surviving; the group wins (+2 each) if they trip them.","Optional: a slip = The One sips."]},
  keep_it_up:{id:"keep_it_up",name:"Keep It Up",emoji:"🎈",station:"open",needs:["openspace"],fits:["one_v_all","ffa","split"],min:3,max:16,dur:"3 min",blurb:"Balloon (or ball) can't touch the floor. Group vs The One.",rules:["Use a balloon or beach ball.","In 1-vs-All: the group keeps the balloon airborne while The One tries to spike it down within 60s.","The One wins (+4) on a successful ground-out; the group wins (+2 each) by surviving.","FFA/Split version: last team to let it drop wins.","Optional drink: whoever lets it hit the floor sips."]},
};
const FORMAT_NOTES={
  shotgun_race:{one_v_all:"The One shotguns a single can solo while the rest run a shotgun relay (one can each, tag the next). The One wins if they finish before the relay does — otherwise the group takes it."},
  dizzy_bat:{one_v_all:"The One does a full spin-and-dash solo; the rest run a relay of shorter spin-and-dashes. First side across the finish line wins."},
};

// Side Quests — optional challenges anyone can complete anytime. No penalty for skipping.
const SIDE_QUESTS={
  buzz_ball:{id:"buzz_ball",name:"Buzz Ball Marathon",emoji:"🔵",needs:["buzzballs"],desc:"Finish your Buzz Ball anytime during the party."},
  shotgun_side:{id:"shotgun_side",name:"Shotgun Side Bet",emoji:"🥫",needs:["cans"],desc:"Sneak a solo shotgun whenever for bonus points."},
  funnel_side:{id:"funnel_side",name:"Funnel Challenge",emoji:"🌀",needs:["funnel"],desc:"Funnel a beer on your own time for bonus."},
  trick_shot:{id:"trick_shot",name:"Trick Shot Bounty",emoji:"🎯",needs:["pingpong","cups"],desc:"Land a witnessed trick pong shot from behind your back or with eyes closed."},
  bottle_flip:{id:"bottle_flip",name:"Bottle Flip Legend",emoji:"🍾",needs:[],desc:"Land a clean bottle or can flip standing upright — witnessed."},
  card_castle:{id:"card_castle",name:"Card Castle",emoji:"🃏",needs:["cards"],desc:"Stack a 3-story card house that stands for 5 seconds."},
  quarter_swish:{id:"quarter_swish",name:"Quarter Swish",emoji:"🪙",needs:["coins","cups"],desc:"Bounce a quarter into a cup from across the room."},
  photographer:{id:"photographer",name:"Party Paparazzi",emoji:"📸",needs:[],desc:"Capture the best group photo of the night — vote at the end."},
};

// ─── ENGINE ──────────────────────────────────────────────────────────────────
const uid=()=>Math.random().toString(36).slice(2,9);
const eqOK=(eq,needs)=>needs.every(n=>n==="table"?(eq.table||0)>=1:!!eq[n]);
const eligibleGames=(eq)=>Object.values(GAMES).filter(g=>eqOK(eq,g.needs));

function pickFormat(game,n){
  const opts=game.fits.map(f=>FORMATS[f]).filter(f=>f&&f.minP<=n);
  if(!opts.length)return null;
  const w=[];opts.forEach(f=>{const u=Math.min(f.maxP,n);const wt=1+Math.floor(u/2);for(let i=0;i<wt;i++)w.push(f);});
  return w[Math.floor(Math.random()*w.length)];
}
function formatTakes(f,n){
  if(f.id==="ffa")return Math.min(f.maxP,n);
  if(f.id==="split"){const h=Math.floor(n/2);return Math.min(f.maxP,h*2);}
  if(f.id==="partners"){const p=Math.floor(n/2);return Math.min(f.maxP,p*2);}
  if(f.id==="one_v_all")return Math.min(f.maxP,n);
  return f.maxP;
}
// Build history stats from prior rounds: how often each pair teamed up,
// how often each player played each game, and total games per player.
function buildHistory(players,rounds){
  const pairKey=(a,b)=>[a,b].sort().join("|");
  const pair={}; const gamePlays={}; const played={}; const teamFmt={};
  players.forEach(p=>{gamePlays[p.id]={};played[p.id]=0;teamFmt[p.id]=0;});
  (rounds||[]).forEach(rd=>rd.matches.forEach(m=>{
    const f=FORMATS[m.formatId];
    m.playerIds.forEach(id=>{if(gamePlays[id]){gamePlays[id][m.gameId]=(gamePlays[id][m.gameId]||0)+1;played[id]++;}});
    const teamLike=["two_v_two","three_v_three","partners","split"].includes(f?.id);
    if(teamLike){
      // count teammate pairings within each side
      const sides={};m.playerIds.forEach(id=>{const t=m.teams[id];(sides[t]=sides[t]||[]).push(id);});
      Object.values(sides).forEach(arr=>{arr.forEach(a=>{if(teamFmt[a]!==undefined)teamFmt[a]++;});for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){const k=pairKey(arr[i],arr[j]);pair[k]=(pair[k]||0)+1;}});
    }
  }));
  return {pair,pairKey,gamePlays,played,teamFmt};
}
// Greedy split of a player list into teams that minimizes repeat pairings.
function fairTeamAssign(picked,fmt,hist){
  const ids=picked.map(p=>p.id);const n=ids.length;const teams={};
  const cost=(a,b)=>hist.pair[hist.pairKey(a,b)]||0;
  if(fmt.id==="ffa"||fmt.id==="trio"||fmt.id==="duel"){ids.forEach(id=>teams[id]="solo");return teams;}
  if(fmt.id==="one_v_all"){
    // pick the solo as whoever has been "The One" / teamed least recently — favor fresh faces
    const order=[...ids].sort((a,b)=>(hist.teamFmt[a]||0)-(hist.teamFmt[b]||0));
    order.forEach((id,i)=>teams[id]=i===0?"solo":"group");return teams;
  }
  // team formats: greedy pairing to minimize shared history
  const labels=fmt.id==="split"?["A","B"]:["A","B"];
  const perSide=fmt.id==="three_v_three"?3:fmt.id==="split"?Math.ceil(n/2):n/2;
  // Seed: sort by who has played most in team formats so we distribute "veterans"
  let remaining=[...ids].sort((a,b)=>(hist.teamFmt[b]||0)-(hist.teamFmt[a]||0));
  const sides={A:[],B:[]};
  // alternate seed the two most-veteran onto opposite sides, then greedily place each
  remaining.forEach(id=>{
    const capA=fmt.id==="split"?Math.ceil(n/2):perSide;
    const capB=fmt.id==="split"?Math.floor(n/2):perSide;
    const canA=sides.A.length<capA, canB=sides.B.length<capB;
    let put;
    if(canA&&!canB)put="A";else if(canB&&!canA)put="B";
    else{
      const costA=sides.A.reduce((s,o)=>s+cost(id,o),0);
      const costB=sides.B.reduce((s,o)=>s+cost(id,o),0);
      put=costA<costB?"A":costB<costA?"B":(Math.random()<0.5?"A":"B");
    }
    sides[put].push(id);
  });
  sides.A.forEach(id=>teams[id]="A");sides.B.forEach(id=>teams[id]="B");
  return teams;
}
function buildMatch(game,fmt,picked,hist){
  const teams=hist?fairTeamAssign(picked,fmt,hist):(()=>{const s=[...picked].sort(()=>Math.random()-0.5);const o={};s.forEach((p,i)=>o[p.id]=fmt.id==="one_v_all"?(i===0?"solo":"group"):["two_v_two","three_v_three","partners","split"].includes(fmt.id)?(i<Math.ceil(s.length/2)?"A":"B"):"solo");return o;})();
  return{id:uid(),gameId:game.id,formatId:fmt.id,playerIds:picked.map(p=>p.id),teams,result:null};
}
function generateRound(players,eq,rounds,opts={}){
  const elig=eligibleGames(eq);
  if(!elig.length)return{matches:[],benched:players.map(p=>p.id)};
  const hist=buildHistory(players,rounds);
  const tableG=elig.filter(g=>g.station==="table");
  const otherG=elig.filter(g=>g.station!=="table");
  const tablesAvail=eq.table||0;
  // Order pool by who has played LEAST so under-played players get slotted first
  let pool=[...players].sort((a,b)=>(hist.played[a.id]||0)-(hist.played[b.id]||0)+(Math.random()-0.5)*0.6);
  const matches=[];let tablesUsed=0;
  // weighted game pick favoring games the pooled players have played least
  const pickGame=(cands)=>{
    const w=[];
    cands.forEach(g=>{
      const avgPlays=pool.reduce((s,p)=>s+((hist.gamePlays[p.id]||{})[g.id]||0),0)/Math.max(1,pool.length);
      const weight=Math.max(1,Math.round(6-avgPlays*2)); // less-played → higher weight
      for(let i=0;i<weight;i++)w.push(g);
    });
    return w[Math.floor(Math.random()*w.length)];
  };
  const tryAdd=(src)=>{
    if(pool.length<2)return false;
    const cands=src.filter(g=>{
      if(g.station==="table"&&tablesUsed>=tablesAvail)return false;
      const fmtOK=g.fits.some(fid=>FORMATS[fid]&&FORMATS[fid].minP<=pool.length);
      return g.min<=pool.length&&fmtOK;
    });
    if(!cands.length)return false;
    const game=pickGame(cands);
    const fmt=pickFormat(game,pool.length);if(!fmt)return false;
    const take=Math.min(formatTakes(fmt,pool.length),game.max);
    if(take<fmt.minP)return false;
    const picked=pool.slice(0,take);pool=pool.slice(take);
    if(game.station==="table")tablesUsed++;
    matches.push(buildMatch(game,fmt,picked,hist));return true;
  };
  let g=0;while(tablesUsed<tablesAvail&&pool.length>=2&&g<20){if(!tryAdd(tableG))break;g++;}
  g=0;while(pool.length>=2&&g<30){if(!tryAdd(otherG))break;g++;}
  if(pool.length>=3){
    const social=otherG.filter(x=>x.station==="any");
    if(social.length){const game=pickGame(social);matches.push(buildMatch(game,FORMATS.ffa,pool,hist));pool=[];}
  }
  return{matches,benched:pool.map(p=>p.id)};
}

// ─── ROUND VOTE ARCHETYPES (group picks the round style; real-life vote) ──────
const VOTE_OPTIONS={
  random:{id:"random",label:"Dealer's Choice",emoji:"🎲",color:T.purple,desc:"Let the app surprise everyone with a mixed round"},
  big_teams:{id:"big_teams",label:"Everyone, 2 Teams",emoji:"⚡",color:T.gold,desc:"Split the whole party in half for one big team game"},
  duels:{id:"duels",label:"Duel Night",emoji:"⚔️",color:T.red,desc:"Everyone paired off into 1-vs-1 battles"},
  partners:{id:"partners",label:"Partner Up",emoji:"🤝",color:T.green,desc:"Random pairs team up to compete"},
  ffa:{id:"ffa",label:"Free-For-All",emoji:"🎯",color:T.blue,desc:"Every player for themselves, no teams"},
  one_v_all:{id:"one_v_all",label:"1 vs All Showdown",emoji:"👑",color:T.orange,desc:"One hero takes on the whole group"},
};
// Build a round forced toward a chosen archetype. Falls back to normal deal if it can't.
function generateVotedRound(players,eq,rounds,voteId){
  if(voteId==="random"||!voteId) return generateRound(players,eq,rounds);
  const hist=buildHistory(players,rounds);
  const elig=eligibleGames(eq);
  const tablesAvail=eq.table||0;
  const wantFmt={big_teams:"split",duels:"duel",partners:"partners",ffa:"ffa",one_v_all:"one_v_all"}[voteId];
  const pickFrom=(arr)=>arr[Math.floor(Math.random()*arr.length)];

  // Single big game using everyone
  if(voteId==="big_teams"||voteId==="one_v_all"){
    const cands=elig.filter(g=>g.fits.includes(wantFmt)&&g.max>=Math.min(players.length,FORMATS[wantFmt].maxP)&&g.min<=players.length&&(g.station!=="table"||tablesAvail>=1));
    const cap=FORMATS[wantFmt].maxP;
    if(cands.length&&players.length<=cap){
      const game=pickFrom(cands);
      return {matches:[buildMatch(game,FORMATS[wantFmt],players,hist)],benched:[]};
    }
    // too many players for one game → fall through to multi-match below
  }

  // Multi-match: fill the room with games that all use the chosen format
  let pool=[...players].sort((a,b)=>(hist.played[a.id]||0)-(hist.played[b.id]||0)+(Math.random()-0.5)*0.6);
  const matches=[];let tablesUsed=0;
  const fmt=FORMATS[wantFmt];
  const cands=elig.filter(g=>g.fits.includes(wantFmt));
  let guard=0;
  while(pool.length>=fmt.minP&&cands.length&&guard<40){
    guard++;
    const usable=cands.filter(g=>g.station!=="table"||tablesUsed<tablesAvail);
    if(!usable.length)break;
    const game=pickFrom(usable);
    const take=Math.min(formatTakes(fmt,pool.length),game.max);
    if(take<fmt.minP)break;
    const picked=pool.slice(0,take);pool=pool.slice(take);
    if(game.station==="table")tablesUsed++;
    matches.push(buildMatch(game,fmt,picked,hist));
  }
  // leftovers: try a normal small game so nobody waits
  if(pool.length>=2){
    const extra=generateRound(pool,eq,rounds);
    extra.matches.forEach(m=>matches.push(m));
    return {matches,benched:extra.benched};
  }
  if(matches.length===0) return generateRound(players,eq,rounds); // safety
  return {matches,benched:pool.map(p=>p.id)};
}

// ─── MATCH EDITING HELPERS ────────────────────────────────────────────────────
// Re-derive a match's teams when format changes or players move.
function reteamMatch(match){
  const fmt=FORMATS[match.formatId];const ids=match.playerIds;const teams={};
  if(["ffa","trio","duel"].includes(fmt.id)){ids.forEach(id=>teams[id]="solo");}
  else if(fmt.id==="one_v_all"){ids.forEach((id,i)=>teams[id]=i===0?"solo":"group");}
  else {const half=Math.ceil(ids.length/2);ids.forEach((id,i)=>teams[id]=i<half?"A":"B");}
  return {...match,teams,result:null};
}
// Which players in the round are NOT in any match (unassigned pool)
function unassignedIds(round,allPlayers){
  const inPlay=new Set();round.matches.forEach(m=>m.playerIds.forEach(id=>inPlay.add(id)));
  return allPlayers.map(p=>p.id).filter(id=>!inPlay.has(id));
}

function matchPoints(m){
  const f=FORMATS[m.formatId];const r=m.result;const pts={};m.playerIds.forEach(id=>pts[id]=0);
  if(!r)return pts;
  if(f.id==="ffa"||f.id==="trio"){(r.first||[]).forEach(i=>pts[i]=3);(r.second||[]).forEach(i=>pts[i]=2);(r.third||[]).forEach(i=>pts[i]=1);}
  else if(f.id==="duel"){(r.first||[]).forEach(i=>pts[i]=3);}
  else if(f.id==="partners"){(r.winners||[]).forEach(i=>pts[i]=3);}
  else if(f.id==="two_v_two"||f.id==="three_v_three"||f.id==="split"){(r.winners||[]).forEach(i=>pts[i]=2);}
  else if(f.id==="one_v_all"){if(r.soloWon)Object.entries(m.teams).filter(([,t])=>t==="solo").forEach(([i])=>pts[i]=4);else Object.entries(m.teams).filter(([,t])=>t==="group").forEach(([i])=>pts[i]=2);}
  return pts;
}

const KEY="beerparty_v1";
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch{return null;}};
const persist=(d)=>{try{localStorage.setItem(KEY,JSON.stringify(d));}catch{}};
const getInit=()=>{const s=load();return{past:s?.past||[],current:s?.current||null};};

// ─── SOUND ENGINE (synthesized via Web Audio — no files needed) ───────────────
const SETKEY="beerparty_settings_v1";
const loadSettings=()=>{try{return {sfx:true,music:false,...JSON.parse(localStorage.getItem(SETKEY))};}catch{return {sfx:true,music:false};}};
const saveSettings=(s)=>{try{localStorage.setItem(SETKEY,JSON.stringify(s));}catch{}};

const Sound=(()=>{
  let ctx=null, on=true, musicOn=false, musicNodes=null, masterGain=null;
  const ensure=()=>{
    if(typeof window==="undefined")return null;
    if(!ctx){try{ctx=new (window.AudioContext||window.webkitAudioContext)();masterGain=ctx.createGain();masterGain.gain.value=0.5;masterGain.connect(ctx.destination);}catch{ctx=null;}}
    if(ctx&&ctx.state==="suspended")ctx.resume();
    return ctx;
  };
  // basic tone
  const tone=(freq,start,dur,type="sine",vol=0.3)=>{
    const c=ensure();if(!c)return;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.value=freq;
    o.connect(g);g.connect(masterGain);
    const t=c.currentTime+start;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t);o.stop(t+dur+0.02);
  };
  const noise=(start,dur,vol=0.18)=>{
    const c=ensure();if(!c)return;
    const buf=c.createBuffer(1,c.sampleRate*dur,c.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
    const src=c.createBufferSource();src.buffer=buf;
    const g=c.createGain();const f=c.createBiquadFilter();f.type="bandpass";f.frequency.value=1200;
    src.connect(f);f.connect(g);g.connect(masterGain);
    const t=c.currentTime+start;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.start(t);src.stop(t+dur+0.02);
  };
  const api={
    setOn:(v)=>{on=v;},
    isOn:()=>on,
    unlock:()=>{ensure();},
    click:()=>{if(on)tone(520,0,0.06,"square",0.12);},
    tap:()=>{if(on)tone(360,0,0.05,"triangle",0.10);},
    pop:()=>{if(on){tone(700,0,0.08,"sine",0.18);tone(1040,0.04,0.09,"sine",0.12);}},
    deal:()=>{if(on){[0,1,2,3].forEach(i=>noise(i*0.07,0.06,0.12));tone(300,0.28,0.12,"triangle",0.12);}},
    vote:()=>{if(on){tone(440,0,0.1,"square",0.12);tone(660,0.08,0.12,"square",0.10);}},
    success:()=>{if(on){[523,659,784].forEach((f,i)=>tone(f,i*0.07,0.18,"triangle",0.18));}},
    advance:()=>{if(on){tone(659,0,0.1,"triangle",0.16);tone(988,0.08,0.14,"triangle",0.14);}},
    star:()=>{if(on){[784,988,1175,1568].forEach((f,i)=>tone(f,i*0.06,0.2,"sine",0.16));}},
    win:()=>{if(on){const seq=[523,659,784,1047,784,1047,1319];seq.forEach((f,i)=>tone(f,i*0.13,0.3,"triangle",0.2));[0,1].forEach(i=>noise(0.9+i*0.15,0.3,0.1));}},
    // simple looping background music (light, off by default)
    startMusic:()=>{
      const c=ensure();if(!c||musicNodes)return;musicOn=true;
      const g=c.createGain();g.gain.value=0.05;g.connect(masterGain);
      const notes=[392,440,523,440,392,349,392,440];
      let i=0;const bpm=0.42;
      const tick=()=>{
        if(!musicOn)return;
        const o=c.createOscillator();o.type="triangle";o.frequency.value=notes[i%notes.length];
        const ng=c.createGain();ng.gain.setValueAtTime(0,c.currentTime);ng.gain.linearRampToValueAtTime(0.5,c.currentTime+0.02);ng.gain.exponentialRampToValueAtTime(0.001,c.currentTime+bpm*0.9);
        o.connect(ng);ng.connect(g);o.start();o.stop(c.currentTime+bpm);
        // bass
        const b=c.createOscillator();b.type="sine";b.frequency.value=notes[i%notes.length]/2;
        const bg=c.createGain();bg.gain.setValueAtTime(0.3,c.currentTime);bg.gain.exponentialRampToValueAtTime(0.001,c.currentTime+bpm);
        b.connect(bg);bg.connect(g);b.start();b.stop(c.currentTime+bpm);
        i++;musicNodes={g,timer:setTimeout(tick,bpm*1000)};
      };
      tick();
    },
    stopMusic:()=>{musicOn=false;if(musicNodes){clearTimeout(musicNodes.timer);try{musicNodes.g.disconnect();}catch{}musicNodes=null;}},
  };
  return api;
})();


// ─── BONUS STARS (Mario-Party-style end-of-game random awards) ───────────────
// Each star is worth +2. All players tied for a star's stat share it (everyone tied gets +2).
// At game end we randomly reveal 3 of these (deterministically seeded by the session id so
// re-opening the end screen shows the same stars).
const BONUS_STARS={
  minigame:{id:"minigame",name:"Minigame Star",emoji:"🌟",blurb:"Most individual game wins",
    stat:(s)=>{const t={};s.players.forEach(p=>t[p.id]=0);s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result){const mp=matchPoints(m);const mx=Math.max(...Object.values(mp));Object.entries(mp).forEach(([i,v])=>{if(v===mx&&v>0)t[i]++;});}}));return t;}},
  underdog:{id:"underdog",name:"Underdog Star",emoji:"🐢",blurb:"Best win-rate when outnumbered (group side of 1-vs-All)",
    stat:(s)=>{const t={};s.players.forEach(p=>t[p.id]=0);s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result&&m.formatId==="one_v_all"&&m.result.soloWon===false){Object.entries(m.teams).forEach(([i,tm])=>{if(tm==="group")t[i]=(t[i]||0)+1;});}}));return t;}},
  champion:{id:"champion",name:"Champion's Star",emoji:"👑",blurb:"Most 1-vs-All solo victories",
    stat:(s)=>{const t={};s.players.forEach(p=>t[p.id]=0);s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result&&m.formatId==="one_v_all"&&m.result.soloWon){Object.entries(m.teams).forEach(([i,tm])=>{if(tm==="solo")t[i]++;});}}));return t;}},
  quest:{id:"quest",name:"Quest Star",emoji:"🏅",blurb:"Most side quests completed",
    stat:(s)=>{const t={};s.players.forEach(p=>t[p.id]=0);s.bonus?.forEach(b=>{if(b.finished)t[b.playerId]=(t[b.playerId]||0)+1;});return t;}},
  social:{id:"social",name:"Team Player Star",emoji:"🤝",blurb:"Played the most team-format games",
    stat:(s)=>{const t={};s.players.forEach(p=>t[p.id]=0);s.rounds?.forEach(rd=>rd.matches.forEach(m=>{const teamLike=["two_v_two","three_v_three","partners","split"].includes(m.formatId);if(m.result&&teamLike)m.playerIds.forEach(i=>t[i]=(t[i]||0)+1);}));return t;}},
  busy:{id:"busy",name:"Iron Liver Star",emoji:"🔥",blurb:"Played the most games overall",
    stat:(s)=>{const t={};s.players.forEach(p=>t[p.id]=0);s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result)m.playerIds.forEach(i=>t[i]=(t[i]||0)+1);}));return t;}},
};
// seeded shuffle so the chosen 3 stars are stable for a given session
function seededPick(arr,seed,count){
  let h=0;for(let i=0;i<seed.length;i++)h=(h*31+seed.charCodeAt(i))>>>0;
  const a=[...arr];for(let i=a.length-1;i>0;i--){h=(h*1103515245+12345)&0x7fffffff;const j=h%(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a.slice(0,count);
}
// Returns [{star, winners:[ids], value}] for the 3 active stars.
function computeBonusStars(session){
  const chosen=seededPick(Object.values(BONUS_STARS),session.id,3);
  return chosen.map(star=>{
    const t=star.stat(session);
    const max=Math.max(0,...Object.values(t));
    const winners=max>0?Object.entries(t).filter(([,v])=>v===max).map(([i])=>i):[];
    return {star,winners,value:max};
  });
}
function bonusStarPoints(session){
  const pts={};session.players.forEach(p=>pts[p.id]=0);
  computeBonusStars(session).forEach(({winners})=>winners.forEach(id=>pts[id]+=2));
  return pts;
}

function calcMPScores(s){
  const sc={};s.players.forEach(p=>sc[p.id]=0);
  s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result){const mp=matchPoints(m);Object.entries(mp).forEach(([i,v])=>sc[i]=(sc[i]||0)+v);}}));
  s.bonus?.forEach(b=>{if(b.first)sc[b.playerId]=(sc[b.playerId]||0)+2;else if(b.finished)sc[b.playerId]=(sc[b.playerId]||0)+1;});
  if(s.status==="finished"){const bs=bonusStarPoints(s);Object.entries(bs).forEach(([i,v])=>sc[i]=(sc[i]||0)+v);}
  return sc;
}
function calcTeamScores(s){
  const sc={};s.teams?.forEach(t=>sc[t.id]=0);
  s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result){const mp=matchPoints(m);Object.entries(mp).forEach(([i,v])=>{const pl=s.players.find(p=>p.id===i);if(pl)sc[pl.teamId]=(sc[pl.teamId]||0)+v;});}}));
  s.bonus?.forEach(b=>{const pl=s.players.find(p=>p.id===b.playerId);if(!pl)return;if(b.first)sc[pl.teamId]=(sc[pl.teamId]||0)+2;else if(b.finished)sc[pl.teamId]=(sc[pl.teamId]||0)+1;});
  if(s.status==="finished"){const bs=bonusStarPoints(s);Object.entries(bs).forEach(([i,v])=>{const pl=s.players.find(p=>p.id===i);if(pl)sc[pl.teamId]=(sc[pl.teamId]||0)+v;});}
  return sc;
}

// ─── UI ATOMS ────────────────────────────────────────────────────────────────
const Pill=({children,color=T.purple,solid})=>(<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:800,letterSpacing:"0.04em",padding:"3px 10px",borderRadius:999,background:solid?color:color+"24",color:solid?T.ink:color,textTransform:"uppercase",boxShadow:solid?`0 2px 8px -2px ${color}99`:"none"}}>{children}</span>);
const Card=({children,style={},onClick,active,accent,className})=>(<div onClick={onClick} className={`bp-card${onClick?" bp-tap":""}${className?" "+className:""}`} style={{background:T.surface,border:`1.5px solid ${active?accent||T.purple:T.border}`,borderRadius:18,padding:"15px 17px",cursor:onClick?"pointer":"default",boxShadow:active?`0 0 0 1px ${(accent||T.purple)}55, ${T.shadow}`:T.shadow,...style}}>{children}</div>);
const Btn=({children,onClick,disabled,color=T.purple,variant="solid",style={},full})=>{
  const base={borderRadius:14,padding:"12px 20px",fontWeight:800,fontSize:14,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",border:"none",opacity:disabled?0.4:1,width:full?"100%":"auto",letterSpacing:"0.01em",position:"relative"};
  const styles=variant==="solid"
    ?{background:grad(color),color:T.ink,boxShadow:disabled?"none":`0 5px 0 0 ${color}66, 0 10px 22px -8px ${color}99`}
    :variant==="soft"
    ?{background:color+"22",color,border:`1.5px solid ${color}44`}
    :{background:T.surface2,color:T.textDim,border:`1.5px solid ${T.border2}`};
  return <button onClick={onClick} disabled={disabled} className={disabled?"":"bp-btn"} style={{...base,...styles,...style}}>{children}</button>;
};
const Tabs=({tabs,active,onChange})=>(
  <div style={{display:"flex",gap:4,padding:"4px",background:T.bg2,borderRadius:14,border:`1.5px solid ${T.border}`,overflowX:"auto"}}>
    {tabs.map(([k,l])=><button key={k} onClick={()=>onChange(k)} className="bp-tap" style={{flex:"1 1 auto",padding:"8px 12px",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",border:"none",fontFamily:"inherit",background:active===k?grad(T.purple):"transparent",color:active===k?T.ink:T.textDim,boxShadow:active===k?`0 3px 10px -3px ${T.purple}aa`:"none",transition:"all .18s"}}>{l}</button>)}
  </div>
);
const Avatar=({name,color,size=34,ring})=>(<div style={{width:size,height:size,minWidth:size,borderRadius:"50%",background:`radial-gradient(circle at 35% 30%, ${color}55, ${color}22)`,border:`2px solid ${ring?color:color+"77"}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*0.44),fontWeight:900,color,flexShrink:0,lineHeight:1,fontFamily:"'Outfit',sans-serif",overflow:"hidden",boxShadow:ring?`0 0 0 3px ${color}33, 0 2px 8px -2px ${color}aa`:"none"}}><span style={{lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>{name.slice(0,1).toUpperCase()}</span></div>);
const H=({children,size=20,style={}})=><h2 style={{fontSize:size,fontWeight:900,letterSpacing:"-0.02em",margin:0,color:T.text,...style}}>{children}</h2>;
const Sub=({children})=><p style={{fontSize:13,color:T.textDim,margin:"3px 0 0",lineHeight:1.5}}>{children}</p>;
const Line=()=><div style={{height:1,background:`linear-gradient(90deg,transparent,${T.border},transparent)`,margin:"18px 0"}} />;

// Count-up number animation — makes scores feel alive (Mario-Party point ticking)
function useCountUp(target,dur=900,delay=0){
  const [val,setVal]=useState(0);
  useEffect(()=>{
    let raf,start;const from=0;const to=target||0;
    const t0=performance.now()+delay;
    const tick=(now)=>{
      if(now<t0){raf=requestAnimationFrame(tick);return;}
      if(!start)start=now;
      const p=Math.min(1,(now-start)/dur);
      const eased=1-Math.pow(1-p,3);
      setVal(Math.round(from+(to-from)*eased));
      if(p<1)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[target,dur,delay]);
  return val;
}
const Counter=({value,delay=0,style={}})=>{const v=useCountUp(value,850,delay);return <span style={style}>{v}</span>;};

// Dice-roll "here we go" splash shown briefly when a round is dealt
function DiceRoll({label="Dealing the round",onDone,dur=1100}){
  const faces=["⚀","⚁","⚂","⚃","⚄","⚅"];
  const [face,setFace]=useState(0);
  useEffect(()=>{
    let i=0;const iv=setInterval(()=>{i++;setFace(Math.floor(Math.random()*6));},90);
    const to=setTimeout(()=>{clearInterval(iv);onDone&&onDone();},dur);
    return ()=>{clearInterval(iv);clearTimeout(to);};
  },[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:1250,background:"rgba(9,7,16,0.72)",backdropFilter:"blur(3px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{fontSize:96,lineHeight:1,animation:"bpDiceSpin .6s ease-in-out infinite",filter:`drop-shadow(0 8px 24px ${T.gold}66)`,color:T.gold}}>{faces[face]}</div>
      <div style={{fontSize:14,fontWeight:800,letterSpacing:"0.2em",textTransform:"uppercase",color:T.textDim}}>{label}</div>
      <style>{`@keyframes bpDiceSpin{0%,100%{transform:rotate(-12deg) scale(1)}50%{transform:rotate(12deg) scale(1.12)}}`}</style>
    </div>
  );
}

// Confetti burst — fixed overlay, spawns falling pieces, auto-cleans. Respects reduced-motion.
function Confetti({count=120,duration=3200}){
  const reduce=typeof window!=="undefined"&&window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pieces=useRef(null);
  if(!pieces.current){
    const colors=[T.gold,T.red,T.blue,T.green,T.pink,T.teal,T.purple,T.orange];
    pieces.current=Array.from({length:reduce?0:count},(_,i)=>({
      id:i,left:Math.random()*100,delay:Math.random()*0.6,dur:2.2+Math.random()*1.6,
      size:6+Math.random()*8,rot:Math.random()*360,color:colors[i%colors.length],
      drift:(Math.random()-0.5)*120,round:Math.random()>0.5,
    }));
  }
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:1300}}>
      <style>{`@keyframes bpConfFall{0%{transform:translateY(-12vh) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0.9}}`}</style>
      {pieces.current.map(p=>(
        <div key={p.id} style={{position:"absolute",top:0,left:`${p.left}%`,width:p.size,height:p.round?p.size:p.size*0.5,background:p.color,borderRadius:p.round?"50%":2,
          animation:`bpConfFall ${p.dur}s ${p.delay}s cubic-bezier(.3,.6,.5,1) forwards`,
          transform:`translateX(${p.drift}px)`,boxShadow:`0 0 4px ${p.color}88`}}/>
      ))}
    </div>
  );
}

// ─── RULES MODAL ──────────────────────────────────────────────────────────────
// ─── GAME DIAGRAMS (SVG visual aids in the rules modal) ───────────────────────
function GameDiagram({id}){
  const wrap=(children,label)=>(
    <div style={{marginBottom:16,background:T.surface2,borderRadius:14,padding:"14px",border:`1px solid ${T.border}`}}>
      <div style={{fontSize:11,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{label}</div>
      {children}
    </div>
  );
  if(id==="stack_cup"){
    const cx=150,cy=92,R=64,seats=7;
    const pts=Array.from({length:seats},(_,i)=>{const a=(-90+i*360/seats)*Math.PI/180;return{x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)};});
    return wrap(
      <svg viewBox="0 0 300 200" style={{width:"100%",height:"auto",display:"block"}}>
        <ellipse cx={cx} cy={cy} rx="90" ry="68" fill={T.surface3} stroke={T.border2} strokeWidth="1.5"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="11" fill={PCOLORS[i%PCOLORS.length]+"33"} stroke={PCOLORS[i%PCOLORS.length]} strokeWidth="1.5"/>
          </g>
        ))}
        {/* single cup+ball travelling between seat 0 and seat 1 */}
        <g>
          <rect x={(pts[0].x+pts[1].x)/2-6} y={(pts[0].y+pts[1].y)/2-7} width="12" height="13" rx="2" fill={T.gold+"40"} stroke={T.gold} strokeWidth="1.5"/>
          <circle cx={(pts[0].x+pts[1].x)/2} cy={(pts[0].y+pts[1].y)/2-3} r="3" fill={T.text}/>
        </g>
        <path d={`M ${pts[0].x+10} ${pts[0].y} A 70 55 0 0 1 ${pts[2].x} ${pts[2].y-12}`} fill="none" stroke={T.teal} strokeWidth="2" markerEnd="url(#arrowS)"/>
        <defs><marker id="arrowS" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={T.teal}/></marker></defs>
        <text x={cx} y={cy+2} fill={T.textFaint} fontSize="9" textAnchor="middle" dominantBaseline="middle" fontFamily="Outfit">no center pile</text>
        <text x={cx} y={192} fill={T.teal} fontSize="9" textAnchor="middle" fontFamily="Outfit" fontWeight="700">one cup + one ball passes around →</text>
      </svg>,
      "The setup (one shared cup)"
    );
  }
  if(id==="rage_cage"){
    // circle of players around a center cluster of cups, arrows showing ball passing left
    const cx=150,cy=95,R=66;
    const seats=8;
    const pts=Array.from({length:seats},(_,i)=>{const a=(-90+i*360/seats)*Math.PI/180;return{x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)};});
    return wrap(
      <svg viewBox="0 0 300 200" style={{width:"100%",height:"auto",display:"block"}}>
        {/* table */}
        <ellipse cx={cx} cy={cy} rx="92" ry="70" fill={T.surface3} stroke={T.border2} strokeWidth="1.5"/>
        {/* center cups */}
        {[[ -10,-8],[10,-8],[0,6],[-12,8],[12,8],[0,-12]].map(([dx,dy],i)=><circle key={i} cx={cx+dx} cy={cy+dy} r="6" fill={i===2?T.red+"55":T.gold+"55"} stroke={i===2?T.red:T.gold} strokeWidth="1.5"/>)}
        <text x={cx} y={cy+30} fill={T.textDim} fontSize="9" textAnchor="middle" fontFamily="Outfit">cups in center</text>
        <text x={cx} y={cy-26} fill={T.red} fontSize="8" textAnchor="middle" fontFamily="Outfit" fontWeight="700">rage cup</text>
        {/* seats + pass arrows */}
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="11" fill={PCOLORS[i%PCOLORS.length]+"33"} stroke={PCOLORS[i%PCOLORS.length]} strokeWidth="1.5"/>
            <circle cx={p.x} cy={p.y} r="4.5" fill="none" stroke={T.textDim} strokeWidth="1"/>
          </g>
        ))}
        {/* curved arrow indicating pass-to-left direction */}
        <path d={`M ${pts[1].x} ${pts[1].y-16} A 80 60 0 0 1 ${pts[3].x+8} ${pts[3].y-12}`} fill="none" stroke={T.teal} strokeWidth="2" markerEnd="url(#arrowT)"/>
        <defs><marker id="arrowT" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={T.teal}/></marker></defs>
        <text x={cx} y={190} fill={T.teal} fontSize="9" textAnchor="middle" fontFamily="Outfit" fontWeight="700">balls + cups pass left around the circle →</text>
      </svg>,
      "The setup"
    );
  }
  if(id==="pyramid"){
    const rows=[5,4,3,2,1]; const vals=[1,2,3,4,5];
    const cw=30,ch=22,gap=6;
    return wrap(
      <svg viewBox="0 0 300 210" style={{width:"100%",height:"auto",display:"block"}}>
        {rows.map((count,r)=>{
          const rowW=count*cw+(count-1)*gap;
          const startX=150-rowW/2;
          const y=20+r*(ch+gap+6);
          return (
            <g key={r}>
              {Array.from({length:count}).map((_,c)=>(
                <g key={c}>
                  <rect x={startX+c*(cw+gap)} y={y} width={cw} height={ch} rx="3" fill={T.surface3} stroke={T.border2} strokeWidth="1.2"/>
                  <text x={startX+c*(cw+gap)+cw/2} y={y+ch/2+1} fill={T.textFaint} fontSize="12" textAnchor="middle" dominantBaseline="middle" fontFamily="Outfit">?</text>
                </g>
              ))}
              <text x={startX+rowW+14} y={y+ch/2+1} fill={[T.green,T.teal,T.blue,T.purple,T.gold][r]} fontSize="11" textAnchor="start" dominantBaseline="middle" fontFamily="Outfit" fontWeight="700">{vals[r]} {vals[r]===1?"drink":"drinks"}</text>
            </g>
          );
        })}
        <text x="150" y="205" fill={T.textDim} fontSize="9" textAnchor="middle" fontFamily="Outfit">flip from the bottom row up · higher rows = more drinks</text>
      </svg>,
      "The pyramid (drink values per row)"
    );
  }
  if(id==="horse_race"){
    // 4 horses (aces) on left, 7 furlong cards in a vertical track to the right
    const lanes=["♠","♥","♦","♣"]; const laneColors=[T.text,T.red,T.red,T.text];
    return wrap(
      <svg viewBox="0 0 300 180" style={{width:"100%",height:"auto",display:"block"}}>
        {/* finish line */}
        <line x1="262" y1="14" x2="262" y2="150" stroke={T.gold} strokeWidth="2" strokeDasharray="3 3"/>
        <text x="262" y="164" fill={T.gold} fontSize="9" textAnchor="middle" fontFamily="Outfit" fontWeight="700">finish</text>
        {/* start line */}
        <line x1="40" y1="14" x2="40" y2="150" stroke={T.border2} strokeWidth="1.5"/>
        <text x="40" y="164" fill={T.textDim} fontSize="9" textAnchor="middle" fontFamily="Outfit">start</text>
        {/* furlong markers along top */}
        {Array.from({length:7}).map((_,i)=>{const x=40+ (i+1)*(222/8);return <g key={i}><rect x={x-7} y={4} width="14" height="9" rx="2" fill={T.surface3} stroke={T.border2}/><text x={x} y={11} fill={T.textFaint} fontSize="6" textAnchor="middle" dominantBaseline="middle" fontFamily="Outfit">?</text></g>;})}
        {/* lanes */}
        {lanes.map((s,i)=>{const y=34+i*28;return (
          <g key={i}>
            <line x1="40" y1={y} x2="262" y2={y} stroke={T.border} strokeWidth="1" strokeDasharray="2 4"/>
            <circle cx="40" cy={y} r="12" fill={T.surface3} stroke={laneColors[i]} strokeWidth="1.5"/>
            <text x="40" y={y+1} fill={laneColors[i]} fontSize="13" textAnchor="middle" dominantBaseline="middle" fontFamily="Outfit">{s}</text>
          </g>
        );})}
        <text x="150" y="178" fill={T.textDim} fontSize="9" textAnchor="middle" fontFamily="Outfit">draw a card → that suit's horse steps right →</text>
      </svg>,
      "The track (4 ace 'horses', 7 furlongs)"
    );
  }
  return null;
}

function RulesModal({game,formatId,onClose}){
  if(!game)return null;
  const fmts=game.fits.map(f=>FORMATS[f]).filter(Boolean);
  const notes=FORMAT_NOTES[game.id]||{};
  const activeNote=formatId&&notes[formatId];
  const activeFmt=formatId&&FORMATS[formatId];
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1500,padding:"16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:20,maxWidth:500,width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"22px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
          <div style={{fontSize:40}}>{game.emoji}</div>
          <div style={{flex:1}}>
            <H size={22}>{game.name}</H>
            <Sub>{game.blurb}</Sub>
          </div>
          <button onClick={onClose} style={{background:T.surface2,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:T.textDim,fontSize:16,fontFamily:"inherit"}}>✕</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          <Pill color={T.teal}>⏱ {game.dur}</Pill>
          <Pill color={T.blue}>👥 {game.min}-{game.max} players</Pill>
          <Pill color={T.orange}>{game.station==="table"?"🏓 Needs table":game.station==="open"?"🌳 Open space":game.station==="floor"?"🪑 Tabletop/floor":"💬 Anywhere"}</Pill>
        </div>
        {activeFmt&&(
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,padding:"8px 12px",borderRadius:12,background:activeFmt.color+"18",border:`1px solid ${activeFmt.color}44`}}>
            <span style={{fontSize:16}}>{activeFmt.icon}</span>
            <span style={{fontSize:13,fontWeight:800,color:activeFmt.color}}>This match: {activeFmt.label}</span>
            <span style={{marginLeft:"auto",fontSize:11,color:T.textDim}}>{activeFmt.pts}</span>
          </div>
        )}
        {activeNote&&(
          <div style={{marginBottom:14,padding:"11px 13px",borderRadius:12,background:T.orange+"14",border:`1px solid ${T.orange}44`}}>
            <div style={{fontSize:11,fontWeight:800,color:T.orange,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{activeFmt?.icon} {activeFmt?.label} tweak</div>
            <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{activeNote}</div>
          </div>
        )}
        {game.diagram&&<GameDiagram id={game.diagram}/>}
        {game.setup&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Setup</div>
            <ol style={{margin:0,paddingLeft:20,display:"grid",gap:8}}>
              {game.setup.map((r,i)=><li key={i} style={{fontSize:14,color:T.text,lineHeight:1.55}}>{r}</li>)}
            </ol>
          </div>
        )}
        <div style={{fontSize:12,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>{game.setup?"How to play":"How to play"}</div>
        <ol style={{margin:0,paddingLeft:20,display:"grid",gap:8}}>
          {game.rules.map((r,i)=><li key={i} style={{fontSize:14,color:T.text,lineHeight:1.55}}>{r}</li>)}
        </ol>
        <Line/>
        <div style={{fontSize:12,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Plays as</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {fmts.map(f=><span key={f.id} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,padding:"4px 10px",borderRadius:999,background:f.color+"1e",color:f.color}}>{f.icon} {f.label}{notes[f.id]?" *":""}</span>)}
        </div>
        {Object.keys(notes).length>0&&<div style={{fontSize:11,color:T.textFaint,marginTop:8}}>* this format changes the rules a bit — shown when that match comes up.</div>}
      </div>
    </div>
  );
}

export default function App(){ return <Root/>; }

// ─── MODE SELECT ──────────────────────────────────────────────────────────────
function ModeSelect({onSelect,onBack}){
  return (
    <div>
      <TopBar onBack={onBack} title="Choose mode"/>
      <div style={{display:"grid",gap:12,marginTop:8}}>
        <Card onClick={()=>onSelect("party")} active accent={T.purple} style={{borderWidth:2}}>
          <div style={{display:"flex",gap:14}}>
            <div style={{fontSize:38}}>🎉</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><H size={18}>Party Mode</H><Pill color={T.gold} solid>Default</Pill></div>
              <p style={{fontSize:13,color:T.textDim,margin:"0 0 10px",lineHeight:1.5}}>Everyone for themselves. Each round the app auto-deals concurrent mini-games and randomly splits players into temporary teams — so every round feels different and nobody waits. Individual scoring, one champion.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{["🎲 Auto-dealt rounds","⚡ Random team splits","👑 Solo scoring","🚫 No waiting"].map(x=><span key={x} style={{fontSize:11,padding:"3px 9px",borderRadius:999,background:T.purple+"1e",color:T.purple,fontWeight:700}}>{x}</span>)}</div>
            </div>
          </div>
        </Card>
        <Card onClick={()=>onSelect("team")}>
          <div style={{display:"flex",gap:14}}>
            <div style={{fontSize:38}}>🏆</div>
            <div style={{flex:1}}>
              <H size={18}>Team Mode</H>
              <p style={{fontSize:13,color:T.textDim,margin:"6px 0 10px",lineHeight:1.5}}>Persistent teams (2-4 players) compete all night. Rounds are still auto-dealt with random formats, but scoring rolls up to your team.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{["👥 Persistent teams","🛡️ Team scoring","🎲 Random rounds","🏅 Team champion"].map(x=><span key={x} style={{fontSize:11,padding:"3px 9px",borderRadius:999,background:T.blue+"1e",color:T.blue,fontWeight:700}}>{x}</span>)}</div>
            </div>
          </div>
        </Card>
        <Card onClick={()=>onSelect("freeplay")}>
          <div style={{display:"flex",gap:14}}>
            <div style={{fontSize:38}}>🕹️</div>
            <div style={{flex:1}}>
              <H size={18}>Free Play</H>
              <p style={{fontSize:13,color:T.textDim,margin:"6px 0 10px",lineHeight:1.5}}>No auto-dealing. Hand-pick any game and format whenever you want and log results. Best for small groups or casual nights.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{["🎯 Pick any game","✋ Manual control","👑 Solo scoring"].map(x=><span key={x} style={{fontSize:11,padding:"3px 9px",borderRadius:999,background:T.teal+"1e",color:T.teal,fontWeight:700}}>{x}</span>)}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TopBar({onBack,title,right}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      {onBack&&<Btn variant="ghost" onClick={onBack} style={{padding:"7px 12px"}}>←</Btn>}
      <H size={20} style={{flex:1}}>{title}</H>
      {right}
    </div>
  );
}

// ─── SETUP WIZARD ─────────────────────────────────────────────────────────────
function Setup({mode,onComplete,onBack}){
  const [step,setStep]=useState(0);
  const [name,setName]=useState("Beer Party "+new Date().getFullYear());
  const [pIn,setPIn]=useState("");
  const [players,setPlayers]=useState([]);
  const [teamSize,setTeamSize]=useState(3);
  const [teams,setTeams]=useState(TEAM_PRESETS.slice(0,4).map((t,i)=>({...t,id:"t"+i})));
  const [eq,setEq]=useState(()=>{const o={};Object.values(EQUIPMENT).forEach(e=>o[e.id]=e.default);return o;});
  const [targetRounds,setTargetRounds]=useState(8);

  const isTeam=mode==="team";
  const steps=isTeam?["Players","Teams","Gear","Go"]:["Players","Gear","Go"];
  const minP=mode==="freeplay"?2:3;

  const addP=()=>{const n=pIn.trim();if(!n)return;setPlayers(p=>[...p,{id:"p_"+uid(),name:n,teamId:null,color:PCOLORS[p.length%PCOLORS.length]}]);setPIn("");};
  const rmP=id=>setPlayers(p=>p.filter(x=>x.id!==id));
  const autoBalance=()=>{const s=[...players].sort(()=>Math.random()-0.5);const nt=Math.max(2,Math.ceil(s.length/teamSize));setPlayers(s.map((p,i)=>({...p,teamId:"t"+(i%nt)})));};
  const assignT=(pid,tid)=>setPlayers(p=>p.map(x=>x.id===pid?{...x,teamId:tid}:x));

  const eligCount=eligibleGames(eq).length;
  const tableCount=eq.table||0;

  const finish=()=>{
    const at=isTeam?teams.filter(t=>players.some(p=>p.teamId===t.id)):[];
    const activeBonus=Object.values(SIDE_QUESTS).filter(b=>eqOK(eq,b.needs));
    onComplete({
      id:uid(),name,mode,
      date:new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
      players,teams:at,equipment:eq,rounds:[],targetRounds:mode==="freeplay"?null:targetRounds,
      bonus:players.flatMap(p=>activeBonus.map(b=>({playerId:p.id,bonusId:b.id,finished:false,first:false}))),
      bonusTypes:activeBonus.map(b=>b.id),
      status:"active",createdAt:Date.now(),
    });
  };

  const stepIdx=step;
  const PlayersStep=(
    <div>
      <H>{players.length} Players</H><Sub>{isTeam?`Min 4 · team size ${teamSize}`:`Min ${minP} players`}</Sub>
      {isTeam&&(
        <div style={{margin:"14px 0"}}>
          <div style={{fontSize:11,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:7}}>Team size</div>
          <div style={{display:"flex",gap:8}}>{[2,3,4].map(n=><button key={n} onClick={()=>setTeamSize(n)} style={{flex:1,padding:"10px 0",borderRadius:11,fontWeight:800,fontSize:14,cursor:"pointer",border:"none",fontFamily:"inherit",background:teamSize===n?T.blue:T.surface2,color:teamSize===n?"#15131F":T.textDim}}>{n}v{n}</button>)}</div>
          {players.length>0&&<p style={{fontSize:12,color:T.textDim,margin:"6px 0 0"}}>{players.length} players → {Math.ceil(players.length/teamSize)} teams</p>}
        </div>
      )}
      <div style={{display:"flex",gap:8,margin:"14px 0 12px"}}>
        <input value={pIn} onChange={e=>setPIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addP()} placeholder="Player name…" style={{flex:1}}/>
        <Btn onClick={addP} disabled={!pIn.trim()}>Add</Btn>
      </div>
      <div style={{display:"grid",gap:6,marginBottom:8}}>
        {players.map((p,i)=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.surface2,borderRadius:11}}>
            <Avatar name={p.name} color={p.color} size={26}/>
            <span style={{flex:1,fontSize:14,fontWeight:600,color:T.text}}>#{i+1} {p.name}</span>
            <button onClick={()=>rmP(p.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.textFaint,fontSize:15,fontFamily:"inherit"}}>✕</button>
          </div>
        ))}
        {players.length===0&&<p style={{fontSize:13,color:T.textFaint,textAlign:"center",padding:"10px 0"}}>Add everyone who's playing.</p>}
      </div>
    </div>
  );

  const TeamsStep=(
    <div>
      <H>Assign Teams</H>
      <Btn color={T.green} onClick={autoBalance} full style={{margin:"12px 0"}}>⚡ Auto-Balance</Btn>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        {teams.slice(0,Math.max(2,Math.ceil(players.length/teamSize))).map(t=>{const tp=players.filter(p=>p.teamId===t.id);return(
          <Card key={t.id} style={{padding:"11px 13px",borderColor:t.color+"55"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}><div style={{width:9,height:9,borderRadius:"50%",background:t.color}}/><span style={{fontWeight:800,fontSize:12,color:t.color}}>{t.name}</span><span style={{marginLeft:"auto",fontSize:11,color:T.textFaint}}>{tp.length}</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{tp.map(p=><span key={p.id} style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999,background:t.color+"22",color:t.color}}>{p.name}</span>)}{tp.length===0&&<span style={{fontSize:11,color:T.textFaint}}>Empty</span>}</div>
          </Card>
        );})}
      </div>
      {players.some(p=>!p.teamId)&&(
        <div>
          <div style={{fontSize:12,color:T.textDim,fontWeight:700,marginBottom:8}}>Unassigned:</div>
          {players.filter(p=>!p.teamId).map(p=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <Avatar name={p.name} color={p.color} size={24}/>
              <span style={{fontSize:13,fontWeight:600,flex:1,color:T.text}}>{p.name}</span>
              <select value="" onChange={e=>assignT(p.id,e.target.value)} style={{fontSize:12}}><option value="" disabled>Assign…</option>{teams.slice(0,Math.ceil(players.length/teamSize)).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const GearStep=(
    <div>
      <H>What gear do you have?</H><Sub>We'll only deal games you can actually run.</Sub>
      <div style={{margin:"14px 0",display:"grid",gap:9}}>
        {Object.values(EQUIPMENT).map(e=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 14px",background:T.surface2,borderRadius:12}}>
            <span style={{fontSize:20}}>{e.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>{e.label}</div>
              {e.hint&&<div style={{fontSize:11,color:T.textFaint}}>{e.hint}</div>}
            </div>
            {e.type==="count"?(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>setEq(s=>({...s,[e.id]:Math.max(0,(s[e.id]||0)-1)}))} style={{width:30,height:30,borderRadius:9,border:"none",background:T.surface3,color:T.text,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>−</button>
                <span style={{fontSize:17,fontWeight:800,minWidth:18,textAlign:"center",color:T.text}}>{eq[e.id]||0}</span>
                <button onClick={()=>setEq(s=>({...s,[e.id]:(s[e.id]||0)+1}))} style={{width:30,height:30,borderRadius:9,border:"none",background:T.surface3,color:T.text,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            ):(
              <button onClick={()=>setEq(s=>({...s,[e.id]:!s[e.id]}))} style={{width:48,height:28,borderRadius:999,border:"none",cursor:"pointer",background:eq[e.id]?T.green:T.surface3,position:"relative",transition:"background .15s"}}>
                <span style={{position:"absolute",top:3,left:eq[e.id]?23:3,width:22,height:22,borderRadius:"50%",background:"#15131F",transition:"left .15s"}}/>
              </button>
            )}
          </div>
        ))}
      </div>
      <Card style={{borderColor:eligCount>0?T.green+"55":T.red+"55",background:(eligCount>0?T.green:T.red)+"12"}}>
        <div style={{fontSize:13,color:T.text,fontWeight:700}}>{eligCount>0?`✓ ${eligCount} games available`:"⚠ No games available — add some gear"}</div>
        <div style={{fontSize:12,color:T.textDim,marginTop:3}}>{tableCount} table{tableCount===1?"":"s"} → up to {tableCount} table game{tableCount===1?"":"s"} running at once. The rest play floor/open games so nobody waits.</div>
      </Card>
    </div>
  );

  const GoStep=(
    <div>
      <H>Ready to Party</H>
      <Card style={{margin:"12px 0"}}>
        <div style={{fontSize:12,color:T.textDim}}>Event</div>
        <div style={{fontWeight:900,fontSize:18,color:T.text}}>{name}</div>
        <div style={{fontSize:12,color:T.textDim,marginTop:4}}>{mode==="party"?"🎉 Party Mode":mode==="team"?"🏆 Team Mode":"🕹️ Free Play"} · {players.length} players · {eligCount} games</div>
      </Card>

      {mode!=="freeplay"&&(()=>{ const estMin=(n)=>{const lo=Math.round(n*7/5)*5,hi=Math.round(n*11/5)*5;return `${lo}–${hi} min`;}; return (
        <Card style={{margin:"0 0 12px"}}>
          <div style={{fontSize:11,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>How many rounds?</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {[5,8,10,12,15].map(n=>(
              <button key={n} onClick={()=>setTargetRounds(n)} style={{flex:"1 1 0",minWidth:54,padding:"9px 0",borderRadius:11,cursor:"pointer",border:"none",fontFamily:"inherit",background:targetRounds===n?T.gold:T.surface2,color:targetRounds===n?"#15131F":T.textDim,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                <span style={{fontWeight:800,fontSize:16}}>{n}</span>
                <span style={{fontSize:9,fontWeight:600,opacity:0.85}}>{estMin(n)}</span>
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
            <span style={{fontSize:12,color:T.textDim}}>Custom</span>
            <button onClick={()=>setTargetRounds(r=>Math.max(1,r-1))} style={{width:30,height:30,borderRadius:9,border:"none",background:T.surface3,color:T.text,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>−</button>
            <span style={{fontSize:17,fontWeight:800,minWidth:28,textAlign:"center",color:T.text}}>{targetRounds}</span>
            <button onClick={()=>setTargetRounds(r=>Math.min(30,r+1))} style={{width:30,height:30,borderRadius:9,border:"none",background:T.surface3,color:T.text,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>+</button>
            <span style={{fontSize:12,fontWeight:700,color:T.gold,marginLeft:"auto"}}>≈ {estMin(targetRounds)}</span>
          </div>
          <div style={{fontSize:11,color:T.textFaint,marginTop:8}}>Estimate assumes a few games run at once each round. Bonus stars are revealed at the finish.</div>
        </Card>
      ); })()}

      {(() => { const sq=Object.values(SIDE_QUESTS).filter(b=>eqOK(eq,b.needs)); return sq.length>0&&(
        <Card style={{margin:"0 0 12px",borderColor:T.gold+"44",background:T.gold+"0a"}}>
          <div style={{fontSize:11,fontWeight:800,color:T.gold,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>🏅 {sq.length} Side Quests unlocked</div>
          <div style={{fontSize:12,color:T.textDim,marginBottom:10}}>Optional challenges anyone can knock out anytime for bonus points — drinking optional.</div>
          <div style={{display:"grid",gap:7}}>
            {sq.map(q=><div key={q.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",background:T.surface2,borderRadius:11}}><span style={{fontSize:18}}>{q.emoji}</span><div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{q.name}</div><div style={{fontSize:11,color:T.textFaint}}>{q.desc}</div></div></div>)}
          </div>
        </Card>
      ); })()}

      <div style={{fontSize:11,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Players</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {players.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:999,background:p.color+"18",border:`1px solid ${p.color}44`}}><Avatar name={p.name} color={p.color} size={18}/><span style={{fontSize:12,fontWeight:700,color:p.color}}>{p.name}</span></div>)}
      </div>
    </div>
  );

  let content,canNext;
  if(mode==="team"){
    if(stepIdx===0){content=PlayersStep;canNext=players.length>=4;}
    else if(stepIdx===1){content=TeamsStep;canNext=players.every(p=>p.teamId);}
    else if(stepIdx===2){content=GearStep;canNext=eligCount>0;}
    else{content=GoStep;canNext=true;}
  }else{
    if(stepIdx===0){content=PlayersStep;canNext=players.length>=minP;}
    else if(stepIdx===1){content=GearStep;canNext=eligCount>0;}
    else{content=GoStep;canNext=true;}
  }
  const lastStep=steps.length-1;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
        <Btn variant="ghost" onClick={step===0?onBack:()=>setStep(step-1)} style={{padding:"7px 11px"}}>←</Btn>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          {steps.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,lineHeight:1,background:i<=step?T.purple:T.surface2,color:i<=step?"#15131F":T.textFaint}}>{i+1}</div>
            {i<steps.length-1&&<div style={{width:14,height:2,background:i<step?T.purple:T.border}}/>}
          </div>)}
          <span style={{marginLeft:6,fontSize:13,fontWeight:700,color:T.text}}>{steps[step]}</span>
        </div>
      </div>
      {content}
      <div style={{marginTop:20}}>
        {step<lastStep?
          <Btn onClick={()=>setStep(step+1)} disabled={!canNext} full>Next →</Btn>:
          <Btn color={T.gold} onClick={finish} disabled={!canNext} full style={{fontSize:16}}>🍺 Start the Party!</Btn>}
      </div>
    </div>
  );
}

// ─── ROUND REVEAL (Mario-Party-style animated team/game reveal) ───────────────
function RevealChip({p,delay}){
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700,padding:"4px 11px 4px 5px",borderRadius:999,background:p.color+"22",color:p.color,animation:"bpPop .42s both",animationDelay:`${delay}s`}}>
      <Avatar name={p.name} color={p.color} size={20}/>{p.name}
    </span>
  );
}
function VsBadge({delay,color}){
  return <div style={{fontSize:14,fontWeight:900,color:color||T.gold,letterSpacing:"0.05em",animation:`bpPop .4s both, bpVs 1.1s ${delay+0.3}s ease-in-out infinite`,animationDelay:`${delay}s`}}>VS</div>;
}
function RevealMatch({match,pl,idx}){
  const game=GAMES[match.gameId];const fmt=FORMATS[match.formatId];
  const base=0.3+idx*0.5;
  const ids=match.playerIds;
  const A=ids.filter(id=>match.teams[id]==="A").map(pl);
  const B=ids.filter(id=>match.teams[id]==="B").map(pl);
  const solo=ids.filter(id=>match.teams[id]==="solo").map(pl);
  const group=ids.filter(id=>match.teams[id]==="group").map(pl);
  const isTeam=["two_v_two","three_v_three","partners","split"].includes(fmt.id);
  const is1vAll=fmt.id==="one_v_all";
  const isDuel=fmt.id==="duel";
  const all=ids.map(pl);
  let body=0;

  return (
    <div style={{background:T.surface,border:`1.5px solid ${fmt.color}66`,borderRadius:18,padding:"16px 16px 18px",animation:"bpCardIn .5s both",animationDelay:`${base}s`}}>
      <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:13}}>
        <div style={{fontSize:34,animation:"bpSpinLand .65s both",animationDelay:`${base+0.05}s`}}>{game.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:900,fontSize:17,color:T.text}}>{game.name}</div>
          <span style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:4,padding:"3px 12px",borderRadius:999,background:fmt.color,color:"#15131F",fontWeight:900,fontSize:13,animation:"bpSlam .5s both",animationDelay:`${base+0.18}s`}}>{fmt.icon} {fmt.label}</span>
        </div>
      </div>

      {isTeam&&(
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr)",alignItems:"center",gap:10}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"flex-end"}}>{A.map((p,i)=><RevealChip key={p.id} p={p} delay={base+0.35+i*0.1}/>)}</div>
          <VsBadge delay={base+0.4} color={fmt.color}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{B.map((p,i)=><RevealChip key={p.id} p={p} delay={base+0.45+i*0.1}/>)}</div>
        </div>
      )}
      {is1vAll&&(
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr)",alignItems:"center",gap:10}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
            <span style={{fontSize:10,fontWeight:800,color:T.orange,textTransform:"uppercase",letterSpacing:"0.06em"}}>👑 The One</span>
            {solo.map(p=><RevealChip key={p.id} p={p} delay={base+0.35}/>)}
          </div>
          <VsBadge delay={base+0.4} color={fmt.color}/>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <span style={{fontSize:10,fontWeight:800,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.06em"}}>The Rest</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{group.map((p,i)=><RevealChip key={p.id} p={p} delay={base+0.45+i*0.08}/>)}</div>
          </div>
        </div>
      )}
      {isDuel&&(
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr)",alignItems:"center",gap:10}}>
          <div style={{display:"flex",justifyContent:"flex-end"}}>{all[0]&&<RevealChip p={all[0]} delay={base+0.35}/>}</div>
          <VsBadge delay={base+0.4} color={fmt.color}/>
          <div>{all[1]&&<RevealChip p={all[1]} delay={base+0.45}/>}</div>
        </div>
      )}
      {!isTeam&&!is1vAll&&!isDuel&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>{all.map((p,i)=>p&&<RevealChip key={p.id} p={p} delay={base+0.35+i*0.08}/>)}</div>
      )}
    </div>
  );
}
function RoundReveal({round,session,onDone}){
  const pl=id=>session.players.find(p=>p.id===id);
  const benched=(round.benched||[]).map(pl).filter(Boolean);
  const endDelay=0.3+round.matches.length*0.5+0.6;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.94)",zIndex:1100,overflowY:"auto",padding:"26px 16px 28px"}}>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.22em",color:T.textDim,textTransform:"uppercase",animation:"bpFade .4s both"}}>Get ready for</div>
          <div style={{fontSize:40,fontWeight:900,letterSpacing:"-0.03em",color:T.gold,animation:"bpSlam .55s .1s both"}}>ROUND {round.n}</div>
          <div style={{fontSize:13,color:T.textDim,marginTop:2,animation:"bpFade .5s .3s both"}}>{round.matches.length} game{round.matches.length===1?"":"s"} at once · nobody sits out</div>
        </div>
        <div className="bp-grid">
          {round.matches.map((m,i)=><RevealMatch key={m.id} match={m} pl={pl} idx={i}/>)}
        </div>
        {benched.length>0&&(
          <div style={{marginTop:12,padding:"13px 15px",borderRadius:16,background:T.gold+"12",border:`1px solid ${T.gold}44`,animation:"bpCardIn .5s both",animationDelay:`${0.3+round.matches.length*0.5}s`}}>
            <div style={{fontSize:11,fontWeight:800,color:T.gold,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>🪑 On deck this round</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{benched.map(p=><span key={p.id} style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:999,background:p.color+"1c",color:p.color}}>{p.name}</span>)}</div>
            <div style={{fontSize:11,color:T.textFaint,marginTop:6}}>They ref this round, then rotate in next deal — or start a quick social game.</div>
          </div>
        )}
        <Btn color={T.gold} full onClick={()=>{Sound.advance();onDone();}} style={{marginTop:18,fontSize:16,animation:"bpPop .45s both, bpGlow 1.8s ease-in-out infinite",animationDelay:`${endDelay}s`}}>Let's Play! →</Btn>
      </div>
    </div>
  );
}

// ─── MATCH CARD (shared) ──────────────────────────────────────────────────────
// ─── VOTE MODAL (group picks the round style; tap the real-life winner) ───────
function VoteModal({session,onPick,onClose}){
  const n=session.players.length;
  const tables=session.equipment.table||0;
  // only show options that can actually run with this group/gear
  const can=(id)=>{
    if(id==="random") return true;
    const fmtId={big_teams:"split",duels:"duel",partners:"partners",ffa:"ffa",one_v_all:"one_v_all"}[id];
    if(!fmtId) return true;
    const f=FORMATS[fmtId];
    if(n<f.minP) return false;
    return eligibleGames(session.equipment).some(g=>g.fits.includes(fmtId)&&(g.station!=="table"||tables>=1));
  };
  const opts=Object.values(VOTE_OPTIONS).filter(o=>can(o.id));
  const [picked,setPicked]=useState(null);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:20,maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"22px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:4}}>
          <div style={{flex:1}}>
            <H size={22}>🗳️ Vote the round</H>
            <Sub>Show the room, let everyone shout their pick, then tap the winner.</Sub>
          </div>
          <button onClick={onClose} style={{background:T.surface2,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:T.textDim,fontSize:16,fontFamily:"inherit"}}>✕</button>
        </div>
        <div className="bp-grid" style={{marginTop:14}}>
          {opts.map(o=>(
            <div key={o.id} onClick={()=>{Sound.tap();setPicked(o.id);}} style={{cursor:"pointer",padding:"15px 14px",borderRadius:15,border:`2px solid ${picked===o.id?o.color:T.border}`,background:picked===o.id?o.color+"18":T.surface2,transition:"border-color .12s,background .12s"}}>
              <div style={{fontSize:30,marginBottom:6}}>{o.emoji}</div>
              <div style={{fontWeight:800,fontSize:15,color:picked===o.id?o.color:T.text}}>{o.label}</div>
              <div style={{fontSize:12,color:T.textDim,marginTop:3,lineHeight:1.45}}>{o.desc}</div>
              {picked===o.id&&<div style={{marginTop:8,fontSize:11,fontWeight:800,color:o.color}}>✓ Winner</div>}
            </div>
          ))}
        </div>
        <Btn color={T.gold} full disabled={!picked} onClick={()=>{Sound.vote();onPick(picked);}} style={{marginTop:16,fontSize:15}}>
          {picked?`Deal ${VOTE_OPTIONS[picked].label} →`:"Pick the winning option"}
        </Btn>
        <div style={{fontSize:11,color:T.textFaint,textAlign:"center",marginTop:10}}>The vote happens out loud — this just builds the round around what wins.</div>
      </div>
    </div>
  );
}

// ─── ROUND EDITOR (fully customize games, formats, and teams) ─────────────────
// Draggable player chip — works with pointer drag (mouse + touch) and tap-to-select fallback
function DragChip({p,size=20,onPickUp,onTap,dim,big}){
  const start=useRef(null);
  const down=(e)=>{
    e.stopPropagation();
    const pt=e.touches?e.touches[0]:e;
    start.current={x:pt.clientX,y:pt.clientY,moved:false,t:Date.now()};
  };
  const move=(e)=>{
    if(!start.current)return;
    const pt=e.touches?e.touches[0]:e;
    const dx=Math.abs(pt.clientX-start.current.x),dy=Math.abs(pt.clientY-start.current.y);
    if(!start.current.moved&&(dx>6||dy>6)){
      start.current.moved=true;
      onPickUp&&onPickUp(p.id,pt);
      start.current=null;
    }
  };
  const up=(e)=>{
    if(start.current&&!start.current.moved){ onTap&&onTap(p.id); }
    start.current=null;
  };
  return (
    <button
      onPointerDown={down} onPointerMove={move} onPointerUp={up}
      style={{display:"inline-flex",alignItems:"center",gap:6,padding:big?"4px 12px 4px 5px":"3px 10px 3px 4px",borderRadius:999,cursor:"grab",fontFamily:"inherit",border:`2px solid ${dim?"transparent":p.color+"66"}`,background:p.color+"22",color:p.color,fontWeight:800,fontSize:big?13:12,touchAction:"none",userSelect:"none"}}>
      <Avatar name={p.name} color={p.color} size={size}/>{p.name}
    </button>
  );
}

function RoundEditor({session,round,onSave,onClose,onRules}){
  const [matches,setMatches]=useState(()=>round.matches.map(m=>({...m,teams:{...m.teams},playerIds:[...m.playerIds]})));
  const pl=id=>session.players.find(p=>p.id===id);
  const elig=eligibleGames(session.equipment);
  const [drag,setDrag]=useState(null);    // {id, x, y}
  const [hoverZone,setHoverZone]=useState(null); // "matchId:team" or "bench"
  const dragId=useRef(null);
  const hoverRef=useRef(null);

  const unassigned=unassignedIds({matches},session.players);

  // Re-roll the entire round (fresh games, formats, fair teams)
  const randomizeAll=()=>{
    Sound.deal();
    const before=(session.rounds||[]).filter(r=>r.id!==round.id);
    const {matches:m}=generateRound(session.players,session.equipment,before);
    setMatches(m.map(x=>({...x,teams:{...x.teams},playerIds:[...x.playerIds]})));
  };
  // Re-roll just one match's game (keep its players & try to keep format)
  const randomizeMatch=(matchId)=>{
    Sound.pop();
    setMatches(prev=>prev.map(m=>{
      if(m.id!==matchId) return m;
      const n=m.playerIds.length;
      const cands=elig.filter(g=>g.id!==m.gameId&&g.min<=n&&g.fits.some(f=>FORMATS[f].minP<=n));
      if(!cands.length) return m;
      const g=cands[Math.floor(Math.random()*cands.length)];
      const fid=g.fits.includes(m.formatId)?m.formatId:g.fits.find(f=>FORMATS[f].minP<=n)||g.fits[0];
      return reteamMatch({...m,gameId:g.id,formatId:fid});
    }));
  };

  const pullPlayer=(pid,arr)=>arr.map(m=>m.playerIds.includes(pid)?reteamMatch({...m,playerIds:m.playerIds.filter(x=>x!==pid),teams:Object.fromEntries(Object.entries(m.teams).filter(([k])=>k!==pid))}):m);

  const placeIn=(pid,matchId,team)=>{
    setMatches(prev=>{
      let arr=pullPlayer(pid,prev);
      return arr.map(m=>{
        if(m.id!==matchId) return m;
        if(m.playerIds.length>=GAMES[m.gameId].max) return m;
        const fmt=FORMATS[m.formatId];
        const ids=[...m.playerIds,pid];
        const teams={...m.teams};
        if(["ffa","trio","duel"].includes(fmt.id)) teams[pid]="solo";
        else if(fmt.id==="one_v_all") teams[pid]=Object.values(m.teams).includes("solo")?"group":"solo";
        else teams[pid]=team||"A";
        return {...m,playerIds:ids,teams,result:null};
      });
    });
  };
  const benchPlayer=(pid)=>setMatches(prev=>pullPlayer(pid,prev));

  // ── pointer drag handling ──
  const zoneFromPoint=(x,y)=>{
    const el=document.elementFromPoint(x,y);
    if(!el)return null;
    const z=el.closest?.("[data-drop]");
    return z?z.getAttribute("data-drop"):null;
  };
  const onPickUp=(id,pt)=>{
    dragId.current=id;
    setDrag({id,x:pt.clientX,y:pt.clientY});
    const mv=(e)=>{
      const p=e.touches?e.touches[0]:e;
      setDrag(d=>d?{...d,x:p.clientX,y:p.clientY}:null);
      const z=zoneFromPoint(p.clientX,p.clientY);
      hoverRef.current=z;setHoverZone(z);
    };
    const up=()=>{
      window.removeEventListener("pointermove",mv);
      window.removeEventListener("pointerup",up);
      const z=hoverRef.current;
      const pid=dragId.current;
      if(z&&pid){
        if(z==="bench") benchPlayer(pid);
        else{const [mid,team]=z.split("::");placeIn(pid,mid,team);}
      }
      dragId.current=null;hoverRef.current=null;setDrag(null);setHoverZone(null);
    };
    window.addEventListener("pointermove",mv);
    window.addEventListener("pointerup",up);
  };
  // tap fallback: tap a chip to bench-toggle isn't intuitive; instead tap cycles into first open match — keep simple: tap benches if assigned, else places into first match
  const onTap=(id)=>{
    const inMatch=matches.find(m=>m.playerIds.includes(id));
    if(inMatch){ benchPlayer(id); }
    else if(matches[0]){ placeIn(id,matches[0].id); }
  };

  const removeMatch=(matchId)=>setMatches(prev=>prev.filter(m=>m.id!==matchId));
  const changeFormat=(matchId,fid)=>setMatches(prev=>prev.map(m=>m.id!==matchId?m:reteamMatch({...m,formatId:fid})));
  const changeGame=(matchId,gid)=>setMatches(prev=>prev.map(m=>{
    if(m.id!==matchId) return m;
    const g=GAMES[gid];const fid=g.fits.includes(m.formatId)?m.formatId:g.fits[0];
    return reteamMatch({...m,gameId:gid,formatId:fid});
  }));
  const addMatch=()=>{const g=elig[0];setMatches(prev=>[...prev,{id:uid(),gameId:g.id,formatId:g.fits[0],playerIds:[],teams:{},result:null}]);};

  const teamSlots=(m)=>{
    const fmt=FORMATS[m.formatId];
    if(["two_v_two","three_v_three","partners","split"].includes(fmt.id)) return [["A","Team A",T.red],["B","Team B",T.blue]];
    if(fmt.id==="one_v_all") return [["solo","👑 The One",T.orange],["group","The Rest",T.blue]];
    return [["solo","Players",T.purple]];
  };
  const dragP=drag&&pl(drag.id);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(7,5,14,0.93)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"14px",overflowY:"auto"}}>
      {/* drag ghost */}
      {drag&&dragP&&(
        <div style={{position:"fixed",left:drag.x,top:drag.y,transform:"translate(-50%,-130%) rotate(-4deg)",pointerEvents:"none",zIndex:2000,display:"inline-flex",alignItems:"center",gap:6,padding:"5px 13px 5px 6px",borderRadius:999,background:dragP.color,color:T.ink,fontWeight:800,fontSize:13,boxShadow:T.shadowLg}}>
          <Avatar name={dragP.name} color={"#000"} size={20}/>{dragP.name}
        </div>
      )}
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1.5px solid ${T.border2}`,borderRadius:22,maxWidth:720,width:"100%",minHeight:"min(640px,86vh)",padding:"20px",boxShadow:T.shadowLg,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{flex:1}}><H size={21}>✏️ Edit Round {round.n}</H><Sub>Drag players between teams & games. Swap or shuffle any game.</Sub></div>
          <button onClick={onClose} className="bp-tap" style={{background:T.surface2,border:`1.5px solid ${T.border2}`,borderRadius:12,width:34,height:34,cursor:"pointer",color:T.textDim,fontSize:16,fontFamily:"inherit"}}>✕</button>
        </div>

        <Btn color={T.purple} variant="soft" full onClick={randomizeAll} style={{marginBottom:4}}>🎲 Randomize Whole Round</Btn>
        <div style={{fontSize:11,color:T.textFaint,textAlign:"center",margin:"6px 0 2px"}}>Re-rolls every game, format & team — fairly balanced.</div>

        {/* Unassigned / bench drop zone */}
        <div data-drop="bench" className={hoverZone==="bench"?"bp-drop":""} style={{margin:"12px 0",padding:"13px",borderRadius:16,background:unassigned.length?T.gold+"12":T.surface2,border:`1.5px ${unassigned.length?"solid "+T.gold+"55":"dashed "+T.border2}`,transition:"background .15s"}}>
          <div style={{fontSize:11,fontWeight:800,color:unassigned.length?T.gold:T.textFaint,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:9}}>{unassigned.length?`⚠ ${unassigned.length} on the bench — drag them into a game`:"✓ Everyone is assigned"}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,minHeight:30}}>
            {unassigned.length===0&&<span style={{fontSize:12,color:T.textDim}}>Drop a player here to bench them.</span>}
            {unassigned.map(id=>{const p=pl(id);return <span key={id} className={drag&&drag.id===id?"bp-dragging":""}><DragChip p={p} big onPickUp={onPickUp} onTap={onTap}/></span>;})}
          </div>
        </div>

        {/* Matches */}
        <div className="bp-grid" style={{gridTemplateColumns:"1fr"}}>
          {matches.map(m=>{
            const game=GAMES[m.gameId];const fmt=FORMATS[m.formatId];const slots=teamSlots(m);
            return (
              <div key={m.id} style={{borderRadius:16,border:`1.5px solid ${T.border}`,background:T.surface2,padding:"14px",boxShadow:T.shadow}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11,flexWrap:"wrap"}}>
                  <span style={{fontSize:24}}>{game.emoji}</span>
                  <select value={m.gameId} onChange={e=>{Sound.tap();changeGame(m.id,e.target.value);}} style={{fontWeight:800,fontSize:13,maxWidth:150}}>
                    {elig.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <select value={m.formatId} onChange={e=>{Sound.tap();changeFormat(m.id,e.target.value);}} style={{fontWeight:800,fontSize:13,color:fmt.color}}>
                    {game.fits.map(fid=><option key={fid} value={fid}>{FORMATS[fid].icon} {FORMATS[fid].label}</option>)}
                  </select>
                  <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                    <button onClick={()=>{Sound.tap();onRules&&onRules(game,m.formatId);}} className="bp-tap" title="View rules" style={{background:T.blue+"1c",border:`1.5px solid ${T.blue}44`,borderRadius:10,padding:"7px 10px",fontSize:13,fontWeight:800,color:T.blue,cursor:"pointer",fontFamily:"inherit"}}>📖</button>
                    <button onClick={()=>randomizeMatch(m.id)} className="bp-tap" title="Shuffle this game" style={{background:T.purple+"1c",border:`1.5px solid ${T.purple}44`,borderRadius:10,padding:"7px 10px",fontSize:13,fontWeight:800,color:T.purple,cursor:"pointer",fontFamily:"inherit"}}>🎲</button>
                    <button onClick={()=>{Sound.tap();removeMatch(m.id);}} className="bp-tap" title="Remove game" style={{background:T.red+"1c",border:`1.5px solid ${T.red}44`,borderRadius:10,padding:"7px 10px",fontSize:13,fontWeight:800,color:T.red,cursor:"pointer",fontFamily:"inherit"}}>🗑️</button>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:slots.length>1?"1fr 1fr":"1fr",gap:9}}>
                  {slots.map(([key,label,color])=>{
                    const members=m.playerIds.filter(id=>m.teams[id]===key);
                    const zone=`${m.id}::${key}`;
                    return (
                      <div key={key} data-drop={zone} className={hoverZone===zone?"bp-drop":""} style={{borderRadius:13,border:`2px dashed ${color}55`,background:color+"0a",padding:"10px",minHeight:62,transition:"background .15s,outline .1s"}}>
                        <div style={{fontSize:10,fontWeight:800,color,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:7}}>{label}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {members.length===0&&<span style={{fontSize:11,color:T.textFaint}}>drag here</span>}
                          {members.map(id=>{const p=pl(id);return <span key={id} className={drag&&drag.id===id?"bp-dragging":""}><DragChip p={p} size={17} onPickUp={onPickUp} onTap={onTap}/></span>;})}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Btn variant="ghost" full onClick={addMatch} style={{marginTop:13}}>+ Add a game station</Btn>

        <div style={{display:"flex",gap:8,marginTop:16}}>
          <Btn variant="soft" color={T.textDim} onClick={onClose} style={{flex:1}}>Cancel</Btn>
          <Btn color={T.gold} onClick={()=>onSave(matches.filter(m=>m.playerIds.length>0))} style={{flex:2}}>✓ Save Round</Btn>
        </div>
        <div style={{fontSize:11,color:T.textFaint,textAlign:"center",marginTop:9}}>Drag to rearrange · tap a player to bench/unbench · empty games drop on save.</div>
      </div>
    </div>
  );
}


// ─── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({match,session,onRecord,onRules}){
  const game=GAMES[match.gameId];const fmt=FORMATS[match.formatId];
  const pl=id=>session.players.find(p=>p.id===id);
  const done=!!match.result;
  const grpA=match.playerIds.filter(id=>match.teams[id]==="A").map(pl);
  const grpB=match.playerIds.filter(id=>match.teams[id]==="B").map(pl);
  const solo=match.playerIds.filter(id=>match.teams[id]==="solo").map(pl);
  const group=match.playerIds.filter(id=>match.teams[id]==="group").map(pl);
  const isTeamFmt=["two_v_two","three_v_three","partners","split"].includes(fmt.id);
  const is1vAll=fmt.id==="one_v_all";
  const isFFA=["ffa","trio","duel"].includes(fmt.id);

  return (
    <Card accent={done?T.green:fmt.color} active={done} style={{borderColor:done?T.green+"66":T.border,padding:"14px 15px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}>
        <div style={{fontSize:26}}>{game.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontWeight:800,fontSize:15,color:T.text}}>{game.name}</span>
            {done&&<Pill color={T.green} solid>✓ Done</Pill>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
            <span style={{fontSize:12,fontWeight:700,color:fmt.color}}>{fmt.icon} {fmt.label}</span>
            <span style={{fontSize:11,color:T.textFaint}}>· {game.station==="table"?"🏓 table":game.station==="open"?"🌳 open":game.station==="floor"?"🪑 tabletop":"💬 anywhere"}</span>
          </div>
        </div>
        <button onClick={()=>onRules(game,match.formatId)} style={{background:T.surface2,border:"none",borderRadius:9,padding:"6px 11px",fontSize:12,fontWeight:700,color:T.textDim,cursor:"pointer",fontFamily:"inherit"}}>Rules</button>
      </div>

      {isTeamFmt&&(
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:8,marginBottom:11}}>
          {[["A",grpA,T.red],["B",grpB,T.blue]].map(([k,arr,c])=>(
            <div key={k} style={{display:"contents"}}>
              <div style={{display:"flex",alignItems:"center"}}><span style={{fontSize:11,fontWeight:800,color:c}}>Team {k}</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{arr.map(p=>p&&<span key={p.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,padding:"2px 9px",borderRadius:999,background:p.color+"1c",color:p.color}}><Avatar name={p.name} color={p.color} size={16}/>{p.name}</span>)}</div>
            </div>
          ))}
        </div>
      )}
      {is1vAll&&(
        <div style={{display:"grid",gap:8,marginBottom:11}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,fontWeight:800,color:T.orange,minWidth:46}}>👑 The One</span>{solo.map(p=>p&&<span key={p.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,padding:"2px 9px",borderRadius:999,background:p.color+"1c",color:p.color}}><Avatar name={p.name} color={p.color} size={16}/>{p.name}</span>)}</div>
          <div style={{display:"flex",alignItems:"flex-start",gap:8}}><span style={{fontSize:11,fontWeight:800,color:T.textDim,minWidth:46,paddingTop:3}}>The Rest</span><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{group.map(p=>p&&<span key={p.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,padding:"2px 9px",borderRadius:999,background:p.color+"1c",color:p.color}}><Avatar name={p.name} color={p.color} size={16}/>{p.name}</span>)}</div></div>
        </div>
      )}
      {isFFA&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:11}}>
          {match.playerIds.map(pl).map(p=>p&&<span key={p.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,padding:"2px 9px",borderRadius:999,background:p.color+"1c",color:p.color}}><Avatar name={p.name} color={p.color} size={16}/>{p.name}</span>)}
        </div>
      )}

      <div style={{fontSize:11,color:T.textFaint,marginBottom:done?0:11}}>{fmt.pts}</div>
      {!done&&<Btn color={fmt.color} variant="soft" full onClick={()=>onRecord(match)}>Record result</Btn>}
      {done&&<ResultSummary match={match} session={session}/>}
    </Card>
  );
}

function ResultSummary({match,session}){
  const mp=matchPoints(match);
  const top=Object.entries(mp).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(!top.length)return <div style={{fontSize:12,color:T.textFaint,marginTop:8}}>No points</div>;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:9}}>
      {top.map(([id,v])=>{const p=session.players.find(x=>x.id===id);if(!p)return null;return <span key={id} style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999,background:p.color+"22",color:p.color}}>{p.name} +{v}</span>;})}
    </div>
  );
}

// ─── RESULT RECORDER (modal-ish inline) ───────────────────────────────────────
function Recorder({match,session,onSave,onCancel}){
  const game=GAMES[match.gameId];const fmt=FORMATS[match.formatId];
  const pl=id=>session.players.find(p=>p.id===id);
  const [result,setResult]=useState({});
  const isFFA=["ffa","trio","duel"].includes(fmt.id);
  const isTeamFmt=["two_v_two","three_v_three","partners","split"].includes(fmt.id);
  const is1vAll=fmt.id==="one_v_all";

  const toggleFFA=(pid,place)=>setResult(prev=>{const u={...prev};["first","second","third"].forEach(p=>u[p]=(u[p]||[]).filter(i=>i!==pid));if((u[place]||[]).length===0)u[place]=[pid];return u;});
  const grpA=match.playerIds.filter(id=>match.teams[id]==="A");
  const grpB=match.playerIds.filter(id=>match.teams[id]==="B");

  const canSave=(isFFA&&(result.first||[]).length>0)||(isTeamFmt&&(result.winners||[]).length>0)||(is1vAll&&result.soloWon!==undefined);
  const places=fmt.id==="duel"?[["first","🥇 Winner"]]:[["first","🥇 1st"],["second","🥈 2nd"],["third","🥉 3rd"]];

  return (
    <div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:20,maxWidth:440,width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"20px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span style={{fontSize:28}}>{game.emoji}</span><div style={{flex:1}}><H size={18}>{game.name}</H><span style={{fontSize:12,fontWeight:700,color:fmt.color}}>{fmt.icon} {fmt.label}</span></div></div>
        <div style={{fontSize:12,color:T.textFaint,marginBottom:14}}>{fmt.pts}</div>

        {isFFA&&(
          <div style={{display:"grid",gap:8,marginBottom:16}}>
            <div style={{fontSize:12,color:T.textDim,fontWeight:700}}>Tap to assign places:</div>
            {match.playerIds.map(pl).map(p=>p&&(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8}}>
                <Avatar name={p.name} color={p.color} size={28}/>
                <span style={{flex:1,fontWeight:600,fontSize:13,color:T.text}}>{p.name}</span>
                <div style={{display:"flex",gap:5}}>{places.map(([place,label])=>{const on=(result[place]||[]).includes(p.id);return <button key={place} onClick={()=>toggleFFA(p.id,place)} style={{padding:"5px 9px",borderRadius:8,fontSize:12,fontWeight:800,cursor:"pointer",border:"none",fontFamily:"inherit",background:on?p.color:T.surface2,color:on?"#15131F":T.textDim}}>{label.split(" ")[0]}</button>;})}</div>
              </div>
            ))}
          </div>
        )}
        {isTeamFmt&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:T.textDim,fontWeight:700,marginBottom:10}}>Who won?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["A",grpA,T.red],["B",grpB,T.blue]].map(([k,arr,c])=>{const isW=(result.winners||[]).some(id=>arr.includes(id));return(
                <div key={k} onClick={()=>setResult({winners:arr})} style={{cursor:"pointer",padding:"12px",borderRadius:13,border:`2px solid ${isW?c:T.border}`,background:isW?c+"15":T.surface2}}>
                  <div style={{fontWeight:800,fontSize:13,color:c,marginBottom:6}}>{isW&&"✓ "}Team {k}</div>
                  {arr.map(pl).map(p=>p&&<div key={p.id} style={{fontSize:12,color:T.textDim}}>{p.name}</div>)}
                </div>
              );})}
            </div>
          </div>
        )}
        {is1vAll&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:T.textDim,fontWeight:700,marginBottom:10}}>Who won?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div onClick={()=>setResult({soloWon:true})} style={{cursor:"pointer",padding:"12px",borderRadius:13,border:`2px solid ${result.soloWon===true?T.orange:T.border}`,background:result.soloWon===true?T.orange+"15":T.surface2}}><div style={{fontWeight:800,fontSize:13,color:T.orange,marginBottom:3}}>{result.soloWon===true&&"✓ "}👑 The One</div><div style={{fontSize:11,color:T.textDim}}>+4 pts</div></div>
              <div onClick={()=>setResult({soloWon:false})} style={{cursor:"pointer",padding:"12px",borderRadius:13,border:`2px solid ${result.soloWon===false?T.blue:T.border}`,background:result.soloWon===false?T.blue+"15":T.surface2}}><div style={{fontWeight:800,fontSize:13,color:T.blue,marginBottom:3}}>{result.soloWon===false&&"✓ "}👥 The Rest</div><div style={{fontSize:11,color:T.textDim}}>+2 each</div></div>
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={onCancel} style={{flex:1}}>Cancel</Btn>
          <Btn color={T.gold} disabled={!canSave} onClick={()=>{Sound.success();onSave(result);}} style={{flex:2}}>✓ Save & Award</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── PARTY / TEAM SESSION ─────────────────────────────────────────────────────
function Session({session,onUpdate,onEnd,onFinish,mode}){
  const [tab,setTab]=useState("play");
  const [rules,setRules]=useState(null);
  const showRules=(game,formatId)=>setRules({game,formatId:formatId||null});
  const [reveal,setReveal]=useState(null);       // round object to animate (deal/reshuffle)
  const [standingsReveal,setStandingsReveal]=useState(null); // {after:roundN}
  const [recording,setRecording]=useState(null); // {roundIdx,match}
  const [showSettings,setShowSettings]=useState(false);
  const [voting,setVoting]=useState(false);       // show vote picker
  const [editing,setEditing]=useState(false);      // show round editor
  const [dice,setDice]=useState(null);            // pending reveal during dice roll
  const isTeam=mode==="team";
  const scores=isTeam?calcTeamScores(session):calcMPScores(session);
  const rounds=session.rounds||[];
  const currentRound=rounds[rounds.length-1];
  const target=session.targetRounds;
  const roundsDone=rounds.length;
  const atTarget=target!=null&&roundsDone>=target;
  const allRecorded=currentRound&&currentRound.matches.every(m=>m.result);

  const dealRound=()=>{
    Sound.deal();
    const {matches,benched}=generateRound(session.players,session.equipment,session.rounds);
    const round={id:uid(),n:(session.rounds?.length||0)+1,matches,benched,dealtAt:Date.now()};
    onUpdate({...session,rounds:[...(session.rounds||[]),round]});
    setDice({round,label:"Dealing the round"});
  };
  const dealVotedRound=(voteId)=>{
    Sound.deal();
    const {matches,benched}=generateVotedRound(session.players,session.equipment,session.rounds,voteId);
    const round={id:uid(),n:(session.rounds?.length||0)+1,matches,benched,dealtAt:Date.now(),votedAs:voteId};
    onUpdate({...session,rounds:[...(session.rounds||[]),round]});
    setVoting(false);
    setDice({round,label:`${VOTE_OPTIONS[voteId]?.label||"Round"} — let's go!`});
  };
  const saveResult=(roundIdx,matchId,result)=>{
    const newRounds=session.rounds.map((rd,i)=>i!==roundIdx?rd:{...rd,matches:rd.matches.map(m=>m.id===matchId?{...m,result}:m)});
    onUpdate({...session,rounds:newRounds});
    setRecording(null);
  };
  const reshuffleRound=(roundIdx)=>{
    Sound.deal();
    const before=session.rounds.filter((_,i)=>i!==roundIdx);
    const {matches,benched}=generateRound(session.players,session.equipment,before);
    const newRounds=session.rounds.map((rd,i)=>i!==roundIdx?rd:{...rd,matches,benched});
    onUpdate({...session,rounds:newRounds});
    setReveal({...newRounds[roundIdx],matches,benched});
  };
  const applyEditedRound=(matches)=>{
    Sound.success();
    const idx=rounds.length-1;
    const benched=unassignedIds({matches},session.players);
    const newRounds=session.rounds.map((rd,i)=>i!==idx?rd:{...rd,matches,benched});
    onUpdate({...session,rounds:newRounds});
    setEditing(false);
  };
  const finishRoundView=()=>{Sound.advance();setStandingsReveal({n:currentRound.n});};
  const nextAfterStandings=()=>{ setStandingsReveal(null); if(!atTarget) dealRound(); };
  const setTarget=(n)=>onUpdate({...session,targetRounds:n});

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:7}}><Pill color={T.red} solid>● Live</Pill><span style={{fontWeight:900,fontSize:16,color:T.text}}>{session.name}</span></div>
          <div style={{fontSize:12,color:T.textDim,marginTop:2}}>{mode==="party"?"🎉 Party":isTeam?"🏆 Teams":"🕹️ Free Play"} · {session.players.length} players{target!=null?` · round ${Math.min(roundsDone||1,target)} of ${target}`:` · ${roundsDone} rounds`}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {mode!=="freeplay"&&<Btn variant="ghost" onClick={()=>setShowSettings(true)} style={{fontSize:12,padding:"6px 10px"}}>⚙</Btn>}
          <Btn variant="ghost" onClick={onEnd} style={{fontSize:12,padding:"6px 11px"}}>Exit</Btn>
        </div>
      </div>

      {target!=null&&(
        <div style={{display:"flex",gap:3,marginBottom:12}}>
          {Array.from({length:target}).map((_,i)=><div key={i} style={{flex:1,height:5,borderRadius:99,background:i<roundsDone?T.gold:T.surface2,transition:"background .3s"}}/>)}
        </div>
      )}

      <Tabs tabs={[["play","🎲 Play"],["standings","📊 Standings"],["bonus","🏅 Quests"],["games","📖 Games"]]} active={tab} onChange={setTab}/>
      <div style={{marginTop:14}}>
        {tab==="play"&&(
          <div>
            {mode==="freeplay"?(
              <FreePlay session={session} onUpdate={onUpdate} onRules={showRules}/>
            ):(
              <div>
                {rounds.length===0&&(
                  <Card style={{textAlign:"center",padding:"28px 18px"}}>
                    <div style={{fontSize:40,marginBottom:8}}>🎲</div>
                    <H size={18}>Start the first round</H>
                    <Sub>Let the app deal it, or put it to a vote.</Sub>
                    <div style={{display:"grid",gap:9,marginTop:16}}>
                      <Btn color={T.gold} onClick={dealRound} full>🎲 Auto-Deal Round 1</Btn>
                      <Btn color={T.purple} variant="soft" onClick={()=>setVoting(true)} full>🗳️ Put Round to a Vote</Btn>
                    </div>
                  </Card>
                )}
                {currentRound&&(
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,gap:8,flexWrap:"wrap"}}>
                      <H size={18}>Round {currentRound.n}{target!=null?` / ${target}`:""}{currentRound.votedAs?` · ${VOTE_OPTIONS[currentRound.votedAs]?.emoji} voted`:""}</H>
                      <div style={{display:"flex",gap:6}}>
                        <Btn variant="ghost" onClick={()=>setEditing(true)} style={{fontSize:12,padding:"7px 11px"}}>✏️ Edit</Btn>
                        <Btn variant="ghost" onClick={()=>reshuffleRound(rounds.length-1)} style={{fontSize:12,padding:"7px 11px"}}>🔀 Shuffle</Btn>
                      </div>
                    </div>
                    <div className="bp-grid">
                      {currentRound.matches.map(m=><MatchCard key={m.id} match={m} session={session} onRules={showRules} onRecord={(match)=>setRecording({roundIdx:rounds.length-1,match})}/>)}
                    </div>
                    {currentRound.benched?.length>0&&(
                      <Card style={{marginTop:10,borderColor:T.gold+"44",background:T.gold+"0c"}}>
                        <div style={{fontSize:12,fontWeight:800,color:T.gold,marginBottom:6}}>🪑 On deck this round ({currentRound.benched.length})</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{currentRound.benched.map(id=>{const p=session.players.find(x=>x.id===id);return p&&<span key={id} style={{fontSize:12,fontWeight:600,padding:"2px 9px",borderRadius:999,background:p.color+"1c",color:p.color}}>{p.name}</span>;})}</div>
                        <div style={{fontSize:11,color:T.textFaint,marginTop:6}}>Tap ✏️ Edit to slot them into a game, or they ref and rotate in next round.</div>
                      </Card>
                    )}
                    <div style={{marginTop:16}}>
                      {!allRecorded&&<div style={{fontSize:12,color:T.textFaint,textAlign:"center",marginBottom:10}}>Record every game to continue.</div>}
                      {atTarget?(
                        <Btn color={T.gold} full onClick={()=>onFinish(session)} disabled={!allRecorded} style={{fontSize:16}}>🏁 Finish Party & Reveal Winner</Btn>
                      ):(
                        <Btn color={T.gold} full onClick={finishRoundView} disabled={!allRecorded} style={{fontSize:15}}>📊 Round Results →</Btn>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {tab==="standings"&&<Standings session={session} scores={scores} isTeam={isTeam}/>}
        {tab==="bonus"&&<BonusTab session={session} onUpdate={onUpdate}/>}
        {tab==="games"&&<GamesBrowser session={session} onRules={showRules}/>}
      </div>

      {rules&&<RulesModal game={rules.game} formatId={rules.formatId} onClose={()=>setRules(null)}/>}
      {dice&&<DiceRoll label={dice.label} onDone={()=>{setReveal(dice.round);setDice(null);}}/>}
      {reveal&&<RoundReveal round={reveal} session={session} onDone={()=>setReveal(null)}/>}
      {standingsReveal&&<StandingsReveal session={session} isTeam={isTeam} roundN={standingsReveal.n} atTarget={atTarget} onNext={nextAfterStandings} onVote={()=>{setStandingsReveal(null);setVoting(true);}} onFinish={()=>{setStandingsReveal(null);onFinish(session);}}/>}
      {recording&&<Recorder match={recording.match} session={session} onCancel={()=>setRecording(null)} onSave={(r)=>saveResult(recording.roundIdx,recording.match.id,r)}/>}
      {showSettings&&<SettingsModal session={session} roundsDone={roundsDone} onSetTarget={setTarget} onClose={()=>setShowSettings(false)}/>}
      {voting&&<VoteModal session={session} onPick={dealVotedRound} onClose={()=>setVoting(false)}/>}
      {editing&&currentRound&&<RoundEditor session={session} round={currentRound} onSave={applyEditedRound} onClose={()=>setEditing(false)} onRules={showRules}/>}
    </div>
  );
}

// Settings: change target rounds mid-game
function SettingsModal({session,roundsDone,onSetTarget,onClose}){
  const cur=session.targetRounds||8;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:20,maxWidth:420,width:"100%",maxHeight:"90vh",overflowY:"auto",padding:"22px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><H size={20}>Settings</H><button onClick={onClose} style={{background:T.surface2,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:T.textDim,fontSize:16,fontFamily:"inherit"}}>✕</button></div>
        <div style={{fontSize:11,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Total rounds</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
          {[5,8,10,12,15].map(n=><button key={n} onClick={()=>onSetTarget(n)} disabled={n<roundsDone} style={{flex:"1 1 0",minWidth:48,padding:"10px 0",borderRadius:11,fontWeight:800,fontSize:15,cursor:n<roundsDone?"not-allowed":"pointer",border:"none",fontFamily:"inherit",opacity:n<roundsDone?0.35:1,background:cur===n?T.gold:T.surface2,color:cur===n?"#15131F":T.textDim}}>{n}</button>)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>onSetTarget(Math.max(roundsDone||1,cur-1))} style={{width:32,height:32,borderRadius:9,border:"none",background:T.surface3,color:T.text,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>−</button>
          <span style={{fontSize:18,fontWeight:800,minWidth:28,textAlign:"center",color:T.text}}>{cur}</span>
          <button onClick={()=>onSetTarget(Math.min(30,cur+1))} style={{width:32,height:32,borderRadius:9,border:"none",background:T.surface3,color:T.text,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>+</button>
          <span style={{fontSize:12,fontWeight:700,color:T.gold,marginLeft:"auto"}}>≈ {Math.round(cur*7/5)*5}–{Math.round(cur*11/5)*5} min</span>
        </div>
        <div style={{fontSize:11,color:T.textFaint,marginTop:8}}>{roundsDone} played so far — can't go below that.</div>
      </div>
    </div>
  );
}

// Mid-game round-end leaderboard reveal (Mario-Party style)
function StandingsReveal({session,isTeam,roundN,atTarget,onNext,onVote,onFinish}){
  const liveSession={...session,status:"active"}; // no bonus stars mid-game
  const scores=isTeam?calcTeamScores(liveSession):calcMPScores(liveSession);
  const ents=isTeam?session.teams:session.players;
  const sorted=[...ents].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));
  const max=Math.max(...Object.values(scores),1);
  const medals=["🥇","🥈","🥉"];
  // delta gained this round
  const thisRound=(session.rounds||[]).find(r=>r.n===roundN);
  const delta={};(ents).forEach(e=>delta[e.id]=0);
  thisRound?.matches.forEach(m=>{if(m.result){const mp=matchPoints(m);Object.entries(mp).forEach(([i,v])=>{if(isTeam){const pl=session.players.find(p=>p.id===i);if(pl)delta[pl.teamId]=(delta[pl.teamId]||0)+v;}else delta[i]=(delta[i]||0)+v;});}});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.95)",zIndex:1100,overflowY:"auto",padding:"30px 16px 28px"}}>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.22em",color:T.textDim,textTransform:"uppercase",animation:"bpFade .4s both"}}>Round {roundN} complete</div>
          <div style={{fontSize:34,fontWeight:900,color:T.gold,animation:"bpSlam .55s .1s both"}}>STANDINGS</div>
        </div>
        <div style={{display:"grid",gap:9}}>
          {sorted.map((e,i)=>{const pts=scores[e.id]||0;const d=delta[e.id]||0;const base=0.2+i*0.13;return(
            <div key={e.id} style={{background:T.surface,border:`1.5px solid ${i===0?e.color:T.border}`,borderRadius:15,padding:"13px 15px",animation:"bpCardIn .5s both",animationDelay:`${base}s`}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <span style={{fontSize:22,width:30,textAlign:"center"}}>{medals[i]||i+1}</span>
                {!isTeam&&<Avatar name={e.name} color={e.color} size={36} ring={i===0}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontWeight:800,fontSize:15,color:isTeam?e.color:T.text}}>{e.name}</span>
                    {d>0&&<span style={{fontSize:12,fontWeight:800,color:T.green,animation:"bpPop .4s both",animationDelay:`${base+0.25}s`}}>+{d}</span>}
                  </div>
                  <div style={{height:7,background:T.surface2,borderRadius:99,overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:`${Math.round((pts/max)*100)}%`,background:grad(e.color),borderRadius:99,transition:"width .9s cubic-bezier(.2,.8,.2,1)",transitionDelay:`${base+0.1}s`}}/></div>
                </div>
                <span style={{fontWeight:900,fontSize:26,color:e.color,minWidth:42,textAlign:"right"}}><Counter value={pts} delay={base*1000+150}/></span>
              </div>
            </div>
          );})}
        </div>
        {atTarget?(
          <Btn color={T.gold} full onClick={onFinish} style={{marginTop:20,fontSize:16,animation:"bpPop .45s both, bpGlow 1.8s ease-in-out infinite",animationDelay:`${0.3+sorted.length*0.13}s`}}>🏁 Final Results →</Btn>
        ):(
          <div style={{marginTop:20,display:"grid",gap:9,animation:"bpPop .45s both",animationDelay:`${0.3+sorted.length*0.13}s`}}>
            <Btn color={T.gold} full onClick={onNext} style={{fontSize:16}}>🎲 Auto-Deal Next Round →</Btn>
            <Btn color={T.purple} variant="soft" full onClick={onVote} style={{fontSize:15}}>🗳️ Vote on Next Round</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// Free play: hand pick game + format
function FreePlay({session,onUpdate,onRules}){
  const [selGame,setSelGame]=useState(null);
  const [selFmt,setSelFmt]=useState(null);
  const [spinning,setSpinning]=useState(false);
  const [spinDisp,setSpinDisp]=useState(null);
  const [match,setMatch]=useState(null);
  const [recording,setRecording]=useState(false);
  const tmr=useRef(null);
  const elig=eligibleGames(session.equipment);
  const game=selGame?GAMES[selGame]:null;

  const validFmts=game?game.fits.map(f=>FORMATS[f]).filter(f=>f&&f.minP<=session.players.length):[];

  const spin=()=>{
    if(!game||!validFmts.length)return;
    setSpinning(true);setSpinDisp(null);
    const final=validFmts[Math.floor(Math.random()*validFmts.length)];
    let tick=0,speed=80;const maxT=16+Math.floor(Math.random()*8);
    const fn=()=>{setSpinDisp(validFmts[tick%validFmts.length].id);tick++;if(tick<maxT){speed=tick>maxT*0.6?speed+40:speed;tmr.current=setTimeout(fn,speed);}else{setSpinDisp(final.id);setSpinning(false);pickFmt(final.id);}};
    tmr.current=setTimeout(fn,0);
  };
  const pickFmt=(fid)=>{
    const f=FORMATS[fid];const take=Math.min(f.maxP,session.players.length);
    const picked=[...session.players].sort(()=>Math.random()-0.5).slice(0,take);
    setSelFmt(fid);setMatch(buildMatch(game,f,picked));
  };
  const save=(result)=>{
    const m={...match,result};
    const round={id:uid(),n:(session.rounds?.length||0)+1,matches:[m],benched:[],dealtAt:Date.now()};
    onUpdate({...session,rounds:[...(session.rounds||[]),round]});
    setSelGame(null);setSelFmt(null);setMatch(null);setRecording(false);
  };

  if(match&&!recording){
    return (
      <div>
        <MatchCard match={match} session={session} onRules={onRules} onRecord={()=>setRecording(true)}/>
        <Btn variant="ghost" full onClick={()=>{setMatch(null);setSelFmt(null);}} style={{marginTop:10}}>← Pick different game</Btn>
      </div>
    );
  }
  if(match&&recording){
    return <Recorder match={match} session={session} onCancel={()=>setRecording(false)} onSave={save}/>;
  }
  if(game){
    return (
      <div>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:38}}>{game.emoji}</div>
          <H size={20}>{game.name}</H><Sub>Pick a format or spin</Sub>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {validFmts.map(f=><Card key={f.id} onClick={()=>pickFmt(f.id)} style={{padding:"12px 14px",borderColor:f.color+"44"}}><div style={{fontSize:22,marginBottom:4}}>{f.icon}</div><div style={{fontWeight:800,fontSize:13,color:f.color}}>{f.label}</div><div style={{fontSize:11,color:T.textDim,marginTop:2}}>{f.desc}</div></Card>)}
        </div>
        <Line/>
        <div style={{textAlign:"center"}}>
          {spinning?(
            <div style={{padding:"14px 0"}}><div style={{fontSize:40,marginBottom:6}}>{spinDisp?FORMATS[spinDisp].icon:"🎲"}</div><div style={{fontSize:22,fontWeight:900,color:spinDisp?FORMATS[spinDisp].color:T.purple}}>{spinDisp?FORMATS[spinDisp].label:"…"}</div></div>
          ):(
            <Btn color={T.purple} onClick={spin} style={{padding:"12px 30px",fontSize:15}}>🎲 Random Spin!</Btn>
          )}
        </div>
        <Btn variant="ghost" full onClick={()=>setSelGame(null)} style={{marginTop:14}}>← Change game</Btn>
      </div>
    );
  }
  return (
    <div>
      <H size={18}>Pick a Game</H><Sub>Only games your gear supports are shown.</Sub>
      <div className="bp-grid" style={{marginTop:14}}>
        {elig.map(g=>(
          <Card key={g.id} onClick={()=>setSelGame(g.id)} style={{padding:"11px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>{g.emoji}</span>
              <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:T.text}}>{g.name}</div><div style={{fontSize:11,color:T.textDim}}>{g.blurb}</div></div>
              <button onClick={(e)=>{e.stopPropagation();onRules(g);}} style={{background:T.surface2,border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,color:T.textDim,cursor:"pointer",fontFamily:"inherit"}}>Rules</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── STANDINGS ────────────────────────────────────────────────────────────────
function Standings({session,scores,isTeam}){
  const medals=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
  const entities=isTeam?session.teams:session.players;
  const sorted=[...entities].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));
  const max=Math.max(...Object.values(scores),1);
  // per-player game tallies
  const tally={};session.players.forEach(p=>tally[p.id]={played:0,wins:0});
  session.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result){const mp=matchPoints(m);m.playerIds.forEach(id=>{tally[id].played++;});const maxv=Math.max(...Object.values(mp));Object.entries(mp).forEach(([id,v])=>{if(v===maxv&&v>0)tally[id].wins++;});}}));

  return (
    <div>
      <H size={18}>{isTeam?"Team Standings":"Standings"}</H>
      <div style={{display:"grid",gap:8,margin:"14px 0 20px"}}>
        {sorted.map((e,i)=>{const pts=scores[e.id]||0;const c=e.color;return(
          <Card key={e.id} active={i===0} accent={c} style={{padding:"12px 14px",borderColor:i===0?c:T.border}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <span style={{fontSize:21,width:28,textAlign:"center"}}>{medals[i]||i+1}</span>
              {!isTeam&&<Avatar name={e.name} color={c} size={34} ring={i===0}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:14,color:isTeam?c:T.text,marginBottom:5}}>{e.name}</div>
                <div style={{height:6,background:T.surface2,borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round((pts/max)*100)}%`,background:c,borderRadius:999,transition:"width .5s"}}/></div>
                {isTeam&&<div style={{fontSize:11,color:T.textFaint,marginTop:5}}>{session.players.filter(p=>p.teamId===e.id).map(p=>p.name).join(" · ")}</div>}
                {!isTeam&&<div style={{fontSize:11,color:T.textFaint,marginTop:4}}>{tally[e.id].played} games · {tally[e.id].wins} wins</div>}
              </div>
              <span style={{fontWeight:900,fontSize:27,color:c,minWidth:40,textAlign:"right"}}>{pts}</span>
            </div>
          </Card>
        );})}
      </div>
      <H size={15}>Round History</H>
      {(!session.rounds||session.rounds.length===0)?<Card style={{marginTop:10}}><p style={{color:T.textFaint,fontSize:13,textAlign:"center",margin:0}}>No rounds played yet.</p></Card>:(
        <div style={{display:"grid",gap:8,marginTop:10}}>
          {[...session.rounds].reverse().map(rd=>(
            <Card key={rd.id} style={{padding:"11px 14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:T.textDim,marginBottom:8}}>Round {rd.n}</div>
              <div style={{display:"grid",gap:6}}>
                {rd.matches.map(m=>{const g=GAMES[m.gameId];const f=FORMATS[m.formatId];const done=!!m.result;return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{g.emoji}</span>
                    <span style={{fontSize:12,fontWeight:600,color:T.text}}>{g.name}</span>
                    <span style={{fontSize:11,color:f.color}}>{f.short}</span>
                    {done?<span style={{marginLeft:"auto",fontSize:11,color:T.green}}>✓</span>:<span style={{marginLeft:"auto",fontSize:11,color:T.textFaint}}>pending</span>}
                  </div>
                );})}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BONUS TAB ────────────────────────────────────────────────────────────────
function BonusTab({session,onUpdate}){
  const types=(session.bonusTypes||[]).map(id=>SIDE_QUESTS[id]);
  const [activeType,setActiveType]=useState(types[0]?.id);
  const isTeam=session.mode==="team";
  if(!types.length)return <Card><p style={{color:T.textFaint,fontSize:13,textAlign:"center",margin:0}}>No side quests available — add gear like Buzz Balls, cans, cards, or a funnel in setup to unlock more!</p></Card>;
  const rows=session.bonus.filter(b=>b.bonusId===activeType);
  const first=rows.find(b=>b.first);
  const toggle=(playerId,field)=>{
    let bonus=session.bonus.map(b=>{
      if(b.bonusId!==activeType||b.playerId!==playerId)return b;
      if(field==="first"){const nv=!b.first;return{...b,first:nv,finished:nv?true:b.finished};}
      return{...b,[field]:!b[field]};
    });
    if(field==="first")bonus=bonus.map(b=>(b.bonusId===activeType&&b.playerId!==playerId)?{...b,first:false}:b);
    onUpdate({...session,bonus});
  };
  return (
    <div>
      <H size={18}>Side Quests</H><Sub>Optional challenges anyone can knock out anytime — drinking totally optional. No penalty for skipping.</Sub>
      {types.length>1&&<div style={{margin:"12px 0"}}><Tabs tabs={types.map(t=>[t.id,`${t.emoji} ${t.name.split(" ")[0]}`])} active={activeType} onChange={setActiveType}/></div>}
      <Card style={{borderColor:T.gold+"44",background:T.gold+"0c",margin:"12px 0"}}>
        <div style={{fontSize:13,fontWeight:800,color:T.gold,marginBottom:4}}>{SIDE_QUESTS[activeType].emoji} {SIDE_QUESTS[activeType].name}</div>
        <div style={{fontSize:12,color:T.textDim,marginBottom:6}}>{SIDE_QUESTS[activeType].desc}</div>
        <div style={{fontSize:12,color:T.textDim,lineHeight:1.7}}>🥇 First to finish = <b style={{color:T.text}}>+2</b> {isTeam?"to team":""} · ✅ Finish = <b style={{color:T.text}}>+1</b> · ❌ Skip = nothing</div>
      </Card>
      {first&&<div style={{background:T.green+"18",border:`1px solid ${T.green}55`,borderRadius:11,padding:"8px 13px",marginBottom:12,fontSize:13,color:T.green,fontWeight:700}}>🥇 First: {session.players.find(p=>p.id===first.playerId)?.name}</div>}
      <div style={{display:"grid",gap:8}}>
        {session.players.map(p=>{const b=rows.find(x=>x.playerId===p.id)||{};const team=isTeam?session.teams.find(t=>t.id===p.teamId):null;return(
          <Card key={p.id} style={{padding:"11px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Avatar name={p.name} color={p.color} size={32}/>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:T.text}}>{p.name}</div>{team&&<span style={{fontSize:11,padding:"1px 7px",borderRadius:999,background:team.color+"22",color:team.color,fontWeight:700}}>{team.name}</span>}</div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>toggle(p.id,"finished")} style={{padding:"6px 11px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800,border:"none",fontFamily:"inherit",background:b.finished?T.green+"26":T.surface2,color:b.finished?T.green:T.textDim}}>{b.finished?"✅ Done":"○"}</button>
                {b.finished&&<button onClick={()=>toggle(p.id,"first")} style={{padding:"6px 11px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800,border:"none",fontFamily:"inherit",background:b.first?T.gold+"26":T.surface2,color:b.first?T.gold:T.textDim}}>{b.first?"🥇":"1st?"}</button>}
              </div>
            </div>
          </Card>
        );})}
      </div>
    </div>
  );
}

// ─── GAMES BROWSER ────────────────────────────────────────────────────────────
function GamesBrowser({session,onRules}){
  const elig=new Set(eligibleGames(session.equipment).map(g=>g.id));
  const byStation={table:[],open:[],floor:[],any:[]};
  Object.values(GAMES).forEach(g=>byStation[g.station]?.push(g));
  const labels={table:"🏓 Table Games",open:"🌳 Open Space",floor:"🪑 Tabletop / Floor",any:"💬 Anywhere (no gear)"};
  return (
    <div>
      <H size={18}>All Games</H><Sub>Tap any game for full rules. Greyed = your gear can't run it.</Sub>
      {Object.entries(byStation).map(([st,games])=>games.length>0&&(
        <div key={st} style={{marginTop:16}}>
          <div style={{fontSize:12,fontWeight:800,color:T.textFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:9}}>{labels[st]}</div>
          <div className="bp-grid">
            {games.map(g=>{const ok=elig.has(g.id);return(
              <Card key={g.id} onClick={()=>onRules(g)} style={{padding:"11px 14px",opacity:ok?1:0.45}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>{g.emoji}</span>
                  <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:800,fontSize:13,color:T.text}}>{g.name}</span>{!ok&&<Pill color={T.red}>missing gear</Pill>}</div><div style={{fontSize:11,color:T.textDim}}>{g.blurb}</div></div>
                  <span style={{fontSize:11,color:T.textFaint}}>{g.min}-{g.max}p</span>
                </div>
              </Card>
            );})}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function History({past,onBack}){
  const [open,setOpen]=useState(null);
  return (
    <div>
      <TopBar onBack={onBack} title="Past Parties"/>
      {past.length===0?<Card><p style={{color:T.textFaint,fontSize:13,textAlign:"center",margin:0}}>No parties yet!</p></Card>:(
        <div style={{display:"grid",gap:10}}>
          {[...past].reverse().map(s=>{
            const isTeam=s.mode==="team";const scores=isTeam?calcTeamScores(s):calcMPScores(s);
            const ents=isTeam?s.teams:s.players;
            const winner=ents?.reduce((b,e)=>(scores[e.id]||0)>(scores[b?.id]||0)?e:b,ents[0]);
            return(
              <Card key={s.id} onClick={()=>setOpen(open===s.id?null:s.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontWeight:800,fontSize:14,color:T.text}}>{s.name}</div><div style={{fontSize:12,color:T.textDim,marginTop:2}}>{s.date} · {s.mode==="party"?"🎉":isTeam?"🏆":"🕹️"} · {s.rounds?.length||0} rounds</div></div>
                  {winner&&<div style={{textAlign:"right"}}><div style={{fontSize:10,color:T.textFaint}}>Winner</div><div style={{fontWeight:800,fontSize:13,color:winner.color}}>{winner.name}</div></div>}
                </div>
                {open===s.id&&(
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,display:"grid",gap:5}}>
                    {[...ents].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0)).map((e,i)=><div key={e.id} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15}}>{["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]||i+1}</span>{!isTeam&&<Avatar name={e.name} color={e.color} size={20}/>}<span style={{flex:1,fontSize:13,fontWeight:isTeam?800:600,color:isTeam?e.color:T.text}}>{e.name}</span><span style={{fontSize:13,color:T.textDim}}>{scores[e.id]||0} pts</span></div>)}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ALL-TIME LEADERBOARD ─────────────────────────────────────────────────────
function Leaderboard({past,onBack}){
  const [tab,setTab]=useState("players");
  const pStats={};
  past.forEach(s=>{
    const isTeam=s.mode==="team";const scores=isTeam?null:calcMPScores(s);
    s.players.forEach(p=>{
      if(!pStats[p.name])pStats[p.name]={name:p.name,color:p.color,parties:0,pts:0,wins:0,bonus:0,gameWins:0,played:0};
      const st=pStats[p.name];st.parties++;
      if(!isTeam){st.pts+=scores[p.id]||0;const sorted=[...s.players].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));if(sorted[0]?.id===p.id)st.wins++;}
      s.rounds?.forEach(rd=>rd.matches.forEach(m=>{if(m.result&&m.playerIds.includes(p.id)){st.played++;const mp=matchPoints(m);const mx=Math.max(...Object.values(mp));if(mp[p.id]===mx&&mp[p.id]>0)st.gameWins++;}}));
      s.bonus?.filter(b=>b.playerId===p.id&&b.finished).forEach(()=>st.bonus++);
    });
  });
  const tStats={};
  past.filter(s=>s.mode==="team").forEach(s=>{const scores=calcTeamScores(s);s.teams.forEach(t=>{if(!tStats[t.name])tStats[t.name]={name:t.name,color:t.color,parties:0,pts:0,wins:0};const st=tStats[t.name];st.parties++;st.pts+=scores[t.id]||0;const sorted=[...s.teams].sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));if(sorted[0]?.id===t.id)st.wins++;});});
  const sP=Object.values(pStats).sort((a,b)=>b.pts-a.pts);
  const sT=Object.values(tStats).sort((a,b)=>b.pts-a.pts);
  const medals=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
  return (
    <div>
      <TopBar onBack={onBack} title="All-Time"/>
      <Sub>Dominance across {past.length} parties</Sub>
      <div style={{marginTop:12}}><Tabs tabs={[["players","👤 Players"],["teams","🏆 Teams"]]} active={tab} onChange={setTab}/></div>
      <div style={{marginTop:14}}>
        {tab==="players"&&(sP.length===0?<Card><p style={{color:T.textFaint,fontSize:13,textAlign:"center",margin:0}}>No data yet.</p></Card>:
          <div style={{display:"grid",gap:8}}>{sP.map((p,i)=>(
            <Card key={p.name} active={i===0} accent={p.color} style={{padding:"12px 14px",borderColor:i===0?p.color:T.border}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <span style={{fontSize:21,width:28,textAlign:"center"}}>{medals[i]||i+1}</span>
                <Avatar name={p.name} color={p.color} size={34} ring={i===0}/>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,color:T.text,marginBottom:3}}>{p.name}</div><div style={{display:"flex",gap:11,flexWrap:"wrap"}}><span style={{fontSize:11,color:T.textFaint}}>{p.parties} parties</span><span style={{fontSize:11,color:T.textFaint}}>{p.wins} 🏆</span><span style={{fontSize:11,color:T.textFaint}}>{p.gameWins} game wins</span><span style={{fontSize:11,color:T.textFaint}}>{p.bonus} bonus</span></div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:25,color:p.color}}>{p.pts}</div><div style={{fontSize:10,color:T.textFaint}}>pts</div></div>
              </div>
            </Card>
          ))}</div>
        )}
        {tab==="teams"&&(sT.length===0?<Card><p style={{color:T.textFaint,fontSize:13,textAlign:"center",margin:0}}>No team parties yet.</p></Card>:
          <div style={{display:"grid",gap:8}}>{sT.map((t,i)=>(
            <Card key={t.name} active={i===0} accent={t.color} style={{padding:"12px 14px",borderColor:i===0?t.color:T.border}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <span style={{fontSize:21,width:28,textAlign:"center"}}>{medals[i]||i+1}</span>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,color:t.color,marginBottom:3}}>{t.name}</div><div style={{display:"flex",gap:11}}><span style={{fontSize:11,color:T.textFaint}}>{t.parties} parties</span><span style={{fontSize:11,color:T.textFaint}}>{t.wins} wins</span></div></div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:25,color:t.color}}>{t.pts}</div><div style={{fontSize:10,color:T.textFaint}}>pts</div></div>
              </div>
            </Card>
          ))}</div>
        )}
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
// ─── END SCREEN (final results + bonus star reveal) ───────────────────────────
function EndScreen({session,onHome}){
  const isTeam=session.mode==="team";
  const [phase,setPhase]=useState("stars"); // stars → podium
  const [starIdx,setStarIdx]=useState(0);
  const stars=computeBonusStars(session);
  const finalScores=isTeam?calcTeamScores({...session,status:"finished"}):calcMPScores({...session,status:"finished"});
  const ents=isTeam?session.teams:session.players;
  const sorted=[...ents].sort((a,b)=>(finalScores[b.id]||0)-(finalScores[a.id]||0));
  const max=Math.max(...Object.values(finalScores),1);
  const medals=["🥇","🥈","🥉"];
  const pl=id=>session.players.find(p=>p.id===id);

  const advance=()=>{ Sound.star(); if(starIdx<stars.length-1) setStarIdx(starIdx+1); else {Sound.win();setPhase("podium");} };

  if(phase==="stars"){
    const {star,winners,value}=stars[starIdx];
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.97)",zIndex:1100,overflowY:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
        <div style={{maxWidth:460,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.22em",color:T.textDim,textTransform:"uppercase",animation:"bpFade .4s both"}}>Bonus Star {starIdx+1} of {stars.length}</div>
          <div key={star.id} style={{fontSize:80,margin:"14px 0 4px",animation:"bpSpinLand .7s both"}}>{star.emoji}</div>
          <div style={{fontSize:28,fontWeight:900,color:T.gold,animation:"bpSlam .55s .1s both"}}>{star.name}</div>
          <div style={{fontSize:14,color:T.textDim,marginTop:4,animation:"bpFade .5s .3s both"}}>{star.blurb}</div>
          <div style={{marginTop:24}}>
            {winners.length===0?(
              <div style={{fontSize:14,color:T.textFaint,animation:"bpPop .4s .5s both"}}>No one qualified — star goes unclaimed!</div>
            ):(
              <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                {winners.map((id,i)=>{const p=isTeam?session.teams.find(t=>t.id===(pl(id)?.teamId))||pl(id):pl(id);const who=pl(id);return(
                  <div key={id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 18px",borderRadius:16,background:(who?.color||T.gold)+"1e",border:`1.5px solid ${who?.color||T.gold}`,animation:"bpPop .5s both",animationDelay:`${0.5+i*0.12}s`}}>
                    <Avatar name={who.name} color={who.color} size={44} ring/>
                    <span style={{fontWeight:800,fontSize:15,color:who.color}}>{who.name}</span>
                    <span style={{fontSize:12,fontWeight:800,color:T.green}}>+2 {isTeam?"(to team)":""}</span>
                  </div>
                );})}
              </div>
            )}
            {winners.length>1&&<div style={{fontSize:12,color:T.textFaint,marginTop:10,animation:"bpFade .4s .8s both"}}>Tie — everyone tied gets the star!</div>}
            {value>0&&<div style={{fontSize:11,color:T.textFaint,marginTop:6}}>({value} {value===1?"time":"times"})</div>}
          </div>
          <Btn color={T.gold} full onClick={advance} style={{marginTop:28,fontSize:16,animation:"bpPop .45s both, bpGlow 1.8s ease-in-out infinite",animationDelay:`${0.6+winners.length*0.12}s`}}>{starIdx<stars.length-1?"Next Star →":"See Final Standings →"}</Btn>
        </div>
      </div>
    );
  }

  // PODIUM
  const champ=sorted[0];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(8,6,16,0.97)",zIndex:1100,overflowY:"auto",padding:"30px 16px 28px"}}>
      <Confetti/>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.22em",color:T.textDim,textTransform:"uppercase",animation:"bpFade .4s both"}}>{session.name}</div>
          <div style={{fontSize:44,fontWeight:900,color:T.gold,letterSpacing:"-0.03em",animation:"bpSlam .6s .1s both"}}>🏆 CHAMPION</div>
        </div>
        {champ&&(
          <div style={{textAlign:"center",margin:"10px 0 22px",animation:"bpPop .6s .35s both"}}>
            {!isTeam&&<div style={{display:"flex",justifyContent:"center",marginBottom:8}}><Avatar name={champ.name} color={champ.color} size={80} ring/></div>}
            <div style={{fontSize:32,fontWeight:900,color:champ.color}}>{champ.name}</div>
            <div style={{fontSize:14,color:T.textDim}}><Counter value={finalScores[champ.id]||0} delay={450}/> points · {session.rounds.length} rounds played</div>
          </div>
        )}
        <div style={{display:"grid",gap:9}}>
          {sorted.map((e,i)=>{const pts=finalScores[e.id]||0;const base=0.5+i*0.1;return(
            <div key={e.id} style={{background:T.surface,border:`1.5px solid ${i===0?e.color:T.border}`,borderRadius:15,padding:"12px 15px",animation:"bpCardIn .5s both",animationDelay:`${base}s`,boxShadow:i===0?`0 0 0 1px ${e.color}55, ${T.shadowLg}`:T.shadow}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <span style={{fontSize:22,width:30,textAlign:"center"}}>{medals[i]||i+1}</span>
                {!isTeam&&<Avatar name={e.name} color={e.color} size={34} ring={i===0}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:15,color:isTeam?e.color:T.text}}>{e.name}</div>
                  {isTeam&&<div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{session.players.filter(p=>p.teamId===e.id).map(p=>p.name).join(" · ")}</div>}
                  <div style={{height:6,background:T.surface2,borderRadius:99,overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:`${Math.round((pts/max)*100)}%`,background:grad(e.color),borderRadius:99,transition:"width .9s cubic-bezier(.2,.8,.2,1)",transitionDelay:`${base}s`}}/></div>
                </div>
                <span style={{fontWeight:900,fontSize:25,color:e.color,minWidth:40,textAlign:"right"}}><Counter value={pts} delay={base*1000+200}/></span>
              </div>
            </div>
          );})}
        </div>
        <Card style={{marginTop:16,borderColor:T.gold+"33"}}>
          <div style={{fontSize:11,fontWeight:800,color:T.gold,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>🌟 Bonus stars awarded (+2 each)</div>
          <div style={{display:"grid",gap:7}}>
            {stars.map(({star,winners})=>(
              <div key={star.id} style={{display:"flex",alignItems:"center",gap:9}}>
                <span style={{fontSize:18}}>{star.emoji}</span>
                <span style={{fontSize:13,fontWeight:700,color:T.text,flex:1}}>{star.name}</span>
                <span style={{fontSize:12,color:T.textDim,textAlign:"right"}}>{winners.length?winners.map(id=>pl(id)?.name).join(", "):"unclaimed"}</span>
              </div>
            ))}
          </div>
        </Card>
        <Btn color={T.gold} full onClick={onHome} style={{marginTop:18,fontSize:16}}>🏠 Done — Back Home</Btn>
      </div>
    </div>
  );
}


function Home({state,onNew,onContinue,onHistory,onLeaderboard}){
  const has=!!state.current;
  const partiesPlayed=(state.past||[]).length;
  const gameCount=Object.keys(GAMES).length;
  const oneVAll=Object.values(GAMES).filter(g=>g.fits.includes("one_v_all")).length;
  const noGear=Object.values(GAMES).filter(g=>g.needs.length===0).length;
  return (
    <div>
      {/* HERO */}
      <div style={{position:"relative",textAlign:"center",padding:"32px 0 30px",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,left:"50%",transform:"translateX(-50%)",width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle, ${T.purple}33, transparent 65%)`,pointerEvents:"none"}}/>
        <div style={{position:"relative"}}>
          <div style={{fontSize:64,marginBottom:2,animation:"bpFloat 3.5s ease-in-out infinite",display:"inline-block",filter:`drop-shadow(0 8px 22px ${T.gold}55)`}}>🍻</div>
          <h1 className="bp-title" style={{fontSize:52,fontWeight:900,letterSpacing:"-0.055em",margin:"2px 0 0",lineHeight:0.95}}>BEER<br/>PARTY</h1>
          <p style={{fontSize:14,color:T.textDim,marginTop:10,fontWeight:600}}>Mario-Party-style party games · drinking optional</p>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16,flexWrap:"wrap"}}>
            {[[gameCount,"games",T.gold],[oneVAll,"1-v-all",T.orange],[partiesPlayed,partiesPlayed===1?"party played":"parties played",T.purple]].map(([n,l,c])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 16px",borderRadius:14,background:c+"18",border:`1.5px solid ${c}44`,minWidth:74}}>
                <span style={{fontSize:22,fontWeight:900,color:c,lineHeight:1}}>{n}</span>
                <span style={{fontSize:10,fontWeight:700,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.04em",marginTop:3}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RESUME (if live) */}
      {has&&(
        <Card active accent={T.red} className="bp-tap" onClick={()=>{Sound.click();onContinue();}} style={{borderColor:T.red+"88",background:`linear-gradient(135deg, ${T.red}1a, ${T.surface})`,padding:"17px 19px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:9,height:9,borderRadius:"50%",background:T.red,boxShadow:`0 0 8px ${T.red}`,animation:"bpGlow 1.5s ease-in-out infinite"}}/><span style={{fontSize:11,fontWeight:800,color:T.red,letterSpacing:"0.08em",textTransform:"uppercase"}}>Live now</span></div>
              <div style={{fontWeight:900,fontSize:18,margin:"7px 0 3px",color:T.text}}>{state.current.name}</div>
              <div style={{fontSize:12.5,color:T.textDim}}>{state.current.players.length} players · round {state.current.rounds?.length||0}{state.current.targetRounds?` of ${state.current.targetRounds}`:""}</div>
            </div>
            <Btn color={T.red} onClick={(e)=>{e.stopPropagation();Sound.click();onContinue();}} style={{padding:"13px 22px",fontSize:15}}>Resume →</Btn>
          </div>
        </Card>
      )}

      {/* PRIMARY CTA */}
      <button onClick={()=>{Sound.click();onNew();}} className="bp-btn" style={{width:"100%",border:"none",cursor:"pointer",fontFamily:"inherit",borderRadius:20,padding:"22px",background:grad(T.gold),color:T.ink,boxShadow:`0 6px 0 0 ${T.gold}66, 0 14px 30px -8px ${T.gold}99`,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
        <span style={{fontSize:30}}>{has?"➕":"🎉"}</span>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:"-0.01em"}}>{has?"New Party":"Start a Party"}</div>
          <div style={{fontSize:12,fontWeight:700,opacity:0.7}}>Pick a mode, add players, deal round one</div>
        </div>
      </button>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:36}}>
        <Btn variant="ghost" onClick={()=>{Sound.tap();onHistory();}} full style={{padding:"16px 0",fontSize:15}}>📋 History</Btn>
        <Btn variant="ghost" onClick={()=>{Sound.tap();onLeaderboard();}} full style={{padding:"16px 0",fontSize:15}}>👑 All-Time</Btn>
      </div>

      {/* HOW IT WORKS */}
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
        <span style={{fontSize:20}}>✨</span><H size={17}>How a round works</H>
      </div>
      <div className="bp-grid" style={{gap:12}}>
        {[["🎲","App deals the round","Splits everyone into games at once",T.purple],["⚡","Random formats","2v2, 1v1, partners, 1-v-all, FFA",T.blue],["🏓","Gear-aware","Never more table games than tables",T.teal],["🚫","Nobody waits","Leftovers ref & rotate in next round",T.orange]].map(([e,t,d,c])=>(
          <div key={t} style={{display:"flex",gap:12,alignItems:"center",padding:"15px 16px",background:T.surface,borderRadius:16,border:`1.5px solid ${T.border}`,boxShadow:T.shadow}}>
            <div style={{fontSize:20,width:46,height:46,borderRadius:13,background:c+"1e",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{e}</div>
            <div><div style={{fontSize:14,fontWeight:800,color:T.text}}>{t}</div><div style={{fontSize:12,color:T.textDim,marginTop:2}}>{d}</div></div>
          </div>
        ))}
      </div>

      {/* GAMES */}
      <div style={{display:"flex",alignItems:"center",gap:9,margin:"36px 0 14px"}}>
        <span style={{fontSize:20}}>🎮</span><H size={17}>{gameCount} games included</H>
        <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:T.green,background:T.green+"1c",padding:"5px 11px",borderRadius:999}}>{noGear} need no gear</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
        {Object.values(GAMES).map(g=><span key={g.id} style={{fontSize:12.5,fontWeight:700,padding:"6px 12px",borderRadius:999,background:T.surface2,color:T.textDim,border:`1px solid ${T.border}`}}>{g.emoji} {g.name}</span>)}
      </div>
      <div style={{textAlign:"center",fontSize:11,color:T.textFaint,margin:"22px 0 4px"}}>🔊 Tap the sound button anytime · made for the party</div>
    </div>
  );
}

// ─── AUDIO SETTINGS MODAL ─────────────────────────────────────────────────────
function Toggle({on,onClick,color=T.green}){
  return (
    <button onClick={onClick} className="bp-tap" style={{width:52,height:30,borderRadius:999,border:"none",cursor:"pointer",background:on?color:T.surface3,position:"relative",transition:"background .2s",flexShrink:0}}>
      <span style={{position:"absolute",top:3,left:on?25:3,width:24,height:24,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 2px 5px rgba(0,0,0,0.3)"}}/>
    </button>
  );
}
function AudioSettingsModal({settings,onChange,onClose}){
  const rows=[
    {key:"sfx",icon:"🔊",label:"Sound effects",desc:"Clicks, dealing, score chimes, win fanfare",color:T.gold},
    {key:"music",icon:"🎵",label:"Background music",desc:"Light party loop while you play",color:T.pink},
  ];
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(7,5,14,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,padding:"16px"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,border:`1.5px solid ${T.border2}`,borderRadius:22,maxWidth:420,width:"100%",padding:"22px",boxShadow:T.shadowLg}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <H size={21}>🔊 Sound</H>
          <button onClick={onClose} className="bp-tap" style={{background:T.surface2,border:`1.5px solid ${T.border2}`,borderRadius:12,width:34,height:34,cursor:"pointer",color:T.textDim,fontSize:16,fontFamily:"inherit"}}>✕</button>
        </div>
        <div style={{display:"grid",gap:10}}>
          {rows.map(r=>(
            <div key={r.key} style={{display:"flex",alignItems:"center",gap:13,padding:"14px",borderRadius:15,background:T.surface2,border:`1.5px solid ${T.border}`}}>
              <span style={{fontSize:24}}>{r.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15,color:T.text}}>{r.label}</div>
                <div style={{fontSize:12,color:T.textDim,marginTop:2}}>{r.desc}</div>
              </div>
              <Toggle on={settings[r.key]} color={r.color} onClick={()=>{Sound.unlock();const v=!settings[r.key];if(r.key==="sfx"&&v){Sound.setOn(true);Sound.pop();}onChange({...settings,[r.key]:v});}}/>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:T.textFaint,textAlign:"center",marginTop:14}}>All audio is generated live — no downloads. Tweak anytime from the 🔊 button.</div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function Root(){
  const [state,setState]=useState(getInit);
  const [view,setView]=useState("home");
  const [setupMode,setSetupMode]=useState(null);
  const [settings,setSettings]=useState(loadSettings);
  const [showAudio,setShowAudio]=useState(false);
  useEffect(()=>{persist(state);},[state]);
  // apply + persist audio settings
  useEffect(()=>{
    saveSettings(settings);
    Sound.setOn(settings.sfx);
    if(settings.music) Sound.startMusic(); else Sound.stopMusic();
  },[settings]);
  // unlock audio on first interaction (browser autoplay policy)
  useEffect(()=>{
    const unlock=()=>{Sound.unlock();if(settings.music)Sound.startMusic();window.removeEventListener("pointerdown",unlock);};
    window.addEventListener("pointerdown",unlock);
    return ()=>window.removeEventListener("pointerdown",unlock);
  },[]);

  const launch=useCallback((session)=>{Sound.deal();setState(prev=>{const past=prev.current?[...prev.past,{...prev.current,status:"completed"}]:prev.past;return{...prev,current:session,past};});setView("session");},[]);
  const upd=useCallback((s)=>setState(p=>({...p,current:s})),[]);
  const end=useCallback(()=>{setState(prev=>{if(!prev.current)return prev;return{...prev,past:[...prev.past,{...prev.current,status:"completed"}],current:null};});setView("home");},[]);
  const finish=useCallback((session)=>{Sound.win();setState(p=>({...p,current:{...session,status:"finished"}}));setView("finished");},[]);
  const closeFinished=useCallback(()=>{setState(prev=>{if(!prev.current)return prev;return{...prev,past:[...prev.past,prev.current],current:null};});setView("home");},[]);

  const s=state.current;

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(1200px 600px at 50% -10%, ${T.bg2}, ${T.bg})`,color:T.text,fontFamily:"'Outfit','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::selection{background:${T.purple}55}
        input,select{border:1.5px solid ${T.border2};border-radius:12px;padding:11px 14px;font-size:14px;background:${T.surface2};color:${T.text};font-family:inherit;outline:none;font-weight:600}
        input::placeholder{color:${T.textFaint}}
        input:focus,select:focus{border-color:${T.purple};box-shadow:0 0 0 3px ${T.purple}33}
        select{appearance:none;-webkit-appearance:none;background-image:linear-gradient(45deg,transparent 50%,${T.textDim} 50%),linear-gradient(135deg,${T.textDim} 50%,transparent 50%);background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:32px;cursor:pointer}
        button{font-family:inherit}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${T.border2};border-radius:99px}
        .bp-btn{transition:transform .08s ease, box-shadow .08s ease, filter .15s ease}
        .bp-btn:hover{filter:brightness(1.06)}
        .bp-btn:active{transform:translateY(4px);box-shadow:none !important}
        .bp-tap{transition:transform .1s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease}
        .bp-tap:active{transform:scale(0.97)}
        .bp-card{transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease}
        .bp-card.bp-tap:hover{transform:translateY(-3px);box-shadow:${T.shadowLg}}
        .bp-dragging{opacity:0.35!important}
        .bp-drop{outline:2px dashed ${T.purple};outline-offset:2px;background:${T.purple}14!important}
        @keyframes bpFade{from{opacity:0}to{opacity:1}}
        @keyframes bpSlam{0%{transform:scale(1.8);opacity:0}55%{transform:scale(0.93)}100%{transform:scale(1);opacity:1}}
        @keyframes bpPop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
        @keyframes bpCardIn{from{transform:translateY(26px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes bpSpinLand{0%{transform:rotate(-200deg) scale(0.3);opacity:0}70%{transform:rotate(18deg) scale(1.25)}100%{transform:rotate(0deg) scale(1);opacity:1}}
        @keyframes bpVs{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}
        @keyframes bpGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,203,69,0)}50%{box-shadow:0 0 24px 2px rgba(255,203,69,0.4)}}
        @keyframes bpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes bpShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .bp-title{background:linear-gradient(100deg,${T.red},${T.gold} 35%,${T.pink} 60%,${T.purple});background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:bpShimmer 5s linear infinite}
        /* responsive */
        .bp-shell{max-width:560px;margin:0 auto;padding:18px 16px 110px;min-height:100vh;position:relative}
        .bp-grid{display:grid;gap:11px}
        .bp-center{max-width:560px;margin:0 auto}
        @media(min-width:720px){
          .bp-shell{max-width:840px;padding:30px 32px 120px}
          .bp-grid{grid-template-columns:1fr 1fr;gap:14px}
          .bp-grid-full{grid-column:1 / -1}
          .bp-center{max-width:840px}
        }
      `}</style>
      <button onClick={()=>{Sound.tap();setShowAudio(true);}} className="bp-tap" title="Sound settings" style={{position:"fixed",top:14,right:14,zIndex:60,width:42,height:42,borderRadius:13,border:`1.5px solid ${T.border2}`,background:T.surface+"e8",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",cursor:"pointer",fontSize:18,boxShadow:T.shadow}}>{settings.sfx||settings.music?"🔊":"🔈"}</button>
      <div className="bp-shell">
        {view==="home"&&<Home state={state} onNew={()=>setView("mode")} onContinue={()=>setView("session")} onHistory={()=>setView("history")} onLeaderboard={()=>setView("leaderboard")}/>}
        {view==="mode"&&<ModeSelect onSelect={m=>{setSetupMode(m);setView("setup");}} onBack={()=>setView("home")}/>}
        {view==="setup"&&<Setup mode={setupMode} onComplete={launch} onBack={()=>setView("mode")}/>}
        {view==="session"&&s&&<Session session={s} mode={s.mode} onUpdate={upd} onEnd={end} onFinish={finish}/>}
        {view==="finished"&&s&&<EndScreen session={s} onHome={closeFinished}/>}
        {view==="history"&&<History past={state.past} onBack={()=>setView("home")}/>}
        {view==="leaderboard"&&<Leaderboard past={state.past} onBack={()=>setView("home")}/>}

        <div className="bp-nav" style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",background:T.bg2+"f5",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:`1px solid ${T.border2}`,borderRadius:22,display:"flex",gap:4,padding:"7px",zIndex:50,boxShadow:`0 12px 40px -8px rgba(0,0,0,0.7)`}}>
          {[["home","🏠","Home"],["session","🎲","Live"],["history","📋","History"],["leaderboard","👑","Stats"]].map(([v,e,l])=>{const dis=v==="session"&&!s;const on=view===v;return(
            <button key={v} onClick={()=>{if(dis)return;Sound.tap();setView(v);}} className="bp-tap" style={{background:on?grad(T.purple):"transparent",border:"none",cursor:dis?"not-allowed":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:dis?0.28:1,padding:on?"9px 18px":"9px 14px",borderRadius:16,minWidth:58,transition:"all .2s ease",boxShadow:on?`0 4px 14px -3px ${T.purple}aa`:"none"}}>
              <span style={{fontSize:20,filter:on?"none":"grayscale(0.45) opacity(0.85)",transform:on?"scale(1.05)":"scale(1)",transition:"transform .2s"}}>{e}</span>
              <span style={{fontSize:10.5,fontWeight:on?900:600,color:on?T.ink:T.textDim,letterSpacing:"0.01em"}}>{l}</span>
            </button>
          );})}
        </div>
        {showAudio&&<AudioSettingsModal settings={settings} onChange={setSettings} onClose={()=>setShowAudio(false)}/>}
      </div>
    </div>
  );
}
