// === Patched game.js with opening support ===
const ASSET = {
  bg: "assets/bg/",
  danie: "assets/chara/danie/",
  malthus: "assets/chara/malthus/",
  cg: "assets/cg/",
  bgm: "assets/bgm/",
  data: "assets/data/script.json",
};

const $ = (id) => document.getElementById(id);

const el = {
  bg: $("bg"),
  m: $("malthus"),
  d: $("danie"),
  cg: $("cg"),
  name: $("name"),
  text: $("text"),
  textbox: $("textbox"),
  choices: $("choices"),
  choicesInner: $("choicesInner"),
  bgm: $("bgm"),
  ending: $("ending"),
  endingTitle: $("endingTitle"),
  endingText: $("endingText"),
  btnRestart: $("btnRestart"),
  btnAuto: $("btnAuto"),
  btnSkip: $("btnSkip"),
  btnSave: $("btnSave"),
  btnLoad: $("btnLoad"),
  opening: $("opening"),
  openingText: $("openingText"),
  openingHint: $("openingHint"),
};

let script = [];
let indexById = new Map();
let state = { id: "op_opening", vars: {}, auto: false, skip: false, busy: false };

// ===== Opening controller =====
let openingCtl = { active:false, started:false, node:null, i:0, timer:null };

function stopOpening(){ if (openingCtl.timer) clearTimeout(openingCtl.timer); openingCtl={active:false,started:false,node:null,i:0,timer:null};}
function openOpening(){ el.opening.classList.remove("hide"); el.textbox.classList.add("hidden"); el.choices.classList.add("hidden"); el.ending.classList.add("hidden");}
function closeOpening(){ el.opening.classList.add("hide"); el.textbox.classList.remove("hidden");}

function setOpeningLine(line){
  const cls=["opening-text"];
  if(line.style==="cold")cls.push("cold");
  if(line.style==="whisper")cls.push("whisper");
  if(line.style==="whisper-strong")cls.push("whisper-strong");
  if(line.style==="whisper-red")cls.push("whisper-red");
  el.openingText.className=cls.join(" ");
  el.openingText.textContent=line.text||"";
}

function startOpening(node){
  stopOpening();
  openingCtl.active=true; openingCtl.node=node; openingCtl.i=0; openingCtl.started=false;
  openOpening(); el.openingText.textContent=""; el.openingHint.textContent="클릭하여 시작";
  el.opening.onclick=()=>{
    if(!openingCtl.started){
      openingCtl.started=true;
      el.openingHint.textContent="클릭: 다음";
      if(node.bgm) setBgm(ASSET.bgm+node.bgm);
      advanceOpening(); return;
    }
    advanceOpening(true);
  };
}

function advanceOpening(force){
  if(!openingCtl.active) return;
  if(force) openingCtl.i++;
  if(openingCtl.i>=openingCtl.node.lines.length){
    closeOpening(); stopOpening(); run(openingCtl.node.next); return;
  }
  const line=openingCtl.node.lines[openingCtl.i];
  setOpeningLine(line);
  openingCtl.timer=setTimeout(()=>{ openingCtl.i++; advanceOpening(); }, line.hold||2600);
}

function setBgm(src){ el.bgm.src=src; el.bgm.loop=true; el.bgm.volume=0.6; el.bgm.play().catch(()=>{}); }

async function run(id){
  const node = script[indexById.get(id)];
  if(node.type==="opening") return startOpening(node);
}

async function boot(){
  const res = await fetch(ASSET.data,{cache:"no-store"});
  script = await res.json();
  indexById = new Map(script.map((n,i)=>[n.id,i]));
  run(state.id);
}
boot();
