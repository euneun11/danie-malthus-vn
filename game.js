/* 아주 단순한 Web VN 플레이어 (정적 파일 + JSON 시나리오) */
const ASSET = {
  bg: "assets/bg/",
  danie: "assets/chara/danie/",
  malthus: "assets/chara/malthus/",
  cg: "assets/cg/",
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
};

let script = [];
let indexById = new Map();
let state = {
  id: "op_1",
  vars: {},
  auto: false,
  skip: false,
  busy: false,
};

function saveState() {
  localStorage.setItem("vn_save", JSON.stringify(state));
  toast("저장했습니다.");
}
function loadState() {
  const raw = localStorage.getItem("vn_save");
  if (!raw) return toast("저장 데이터가 없습니다.");
  try {
    state = JSON.parse(raw);
    toast("불러왔습니다.");
    run(state.id);
  } catch {
    toast("불러오기에 실패했습니다.");
  }
}

function toast(msg){
  // 최소한의 알림 (대화창 힌트 영역에 표시)
  const prev = el.textbox.querySelector(".hint").textContent;
  el.textbox.querySelector(".hint").textContent = msg;
  setTimeout(() => el.textbox.querySelector(".hint").textContent = prev, 900);
}

function setImg(imgEl, src) {
  if (!src) { imgEl.classList.add("hidden"); imgEl.removeAttribute("src"); return; }
  imgEl.classList.remove("hidden");
  imgEl.src = src;
}

function setBgm(src){
  if (!src) return;
  const next = src;
  if (el.bgm.getAttribute("data-src") === next) return;
  el.bgm.setAttribute("data-src", next);
  el.bgm.src = next;
  el.bgm.volume = 0.6;
  el.bgm.play().catch(()=>{ /* 사용자 제스처 전까지 재생 실패할 수 있음 */ });
}

function parseCond(expr){
  // 아주 간단한 조건 파서: "a==1 && b==0" 형태만 지원
  // vars 키는 영문/숫자/언더바 권장
  const safe = expr
    .replaceAll("&&", "&&")
    .replaceAll("||", "||")
    .replaceAll("==", "==")
    .replaceAll("!=", "!=")
    .replace(/([a-zA-Z_]\w*)/g, (m)=> `vars["${m}"]`);
  const vars = new Proxy(state.vars, { get:(t,p)=> (p in t ? t[p] : 0) });
  try { return Function("vars", `return (${safe});`)(vars); }
  catch { return false; }
}

function showChoices(choices){
  el.choicesInner.innerHTML = "";
  el.choices.classList.remove("hidden");
  choices.forEach(ch => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = ch.text;
    btn.onclick = () => {
      el.choices.classList.add("hidden");
      run(ch.goto);
    };
    el.choicesInner.appendChild(btn);
  });
}

function showEnding(node){
  el.endingTitle.textContent = node.title || "END";
  el.endingText.textContent = node.text || "";
  el.ending.classList.remove("hidden");
  // 화면은 node의 bg/m/d 또는 cg로 유지
}

function hideEnding(){
  el.ending.classList.add("hidden");
}

function applyScene(node){
  if (node.bg) setImg(el.bg, ASSET.bg + node.bg);
  if (node.d) setImg(el.d, ASSET.danie + node.d);
  if (node.m) setImg(el.m, ASSET.malthus + node.m);

  if (node.cg){
    setImg(el.cg, ASSET.cg + node.cg);
  } else {
    el.cg.classList.add("hidden");
  }

  if (node.bgm){
    setBgm(node.bgm);
  }
}

function typeText(text){
  // 기본은 즉시 출력. 필요하면 타자기 효과로 변경 가능.
  el.text.textContent = text ?? "";
}

async function run(id){
  if (!indexById.has(id)) {
    console.error("Unknown id:", id);
    toast("시나리오 오류: " + id);
    return;
  }
  state.id = id;
  const node = script[indexById.get(id)];
  applyScene(node);

  // 종류별 처리
  const t = node.type || "say";

  if (t === "bg" || t === "cg" || t === "say"){
    el.name.textContent = node.name || "";
    typeText(node.text || "");
    if (state.skip) {
      // 스킵이면 즉시 다음
      if (node.next) return run(node.next);
    }
    return;
  }

  if (t === "choice"){
    el.name.textContent = "";
    typeText(node.text || "");
    return showChoices(node.choices || []);
  }

  if (t === "set"){
    state.vars[node.var] = node.value;
    return run(node.next);
  }

  if (t === "jump"){
    return run(node.goto);
  }

  if (t === "if"){
    const cases = node.cases || [];
    for (const c of cases){
      if (parseCond(c.cond)) return run(c.goto);
    }
    return run(node.else);
  }

  if (t === "ending"){
    // ending은 scene 적용 후, 엔딩 패널 표시
    el.name.textContent = "";
    typeText("");
    showEnding(node);
    return;
  }
}

function next(){
  if (el.ending && !el.ending.classList.contains("hidden")) return; // 엔딩 중엔 클릭 무시
  const node = script[indexById.get(state.id)];
  if (!node) return;
  if (node.type === "choice") return;
  if (node.type === "set" || node.type === "jump" || node.type === "if") return;
  if (node.next) run(node.next);
}

function bindUI(){
  el.textbox.addEventListener("click", next);
  window.addEventListener("keydown", (e)=>{
    if (e.code === "Space" || e.code === "Enter"){
      e.preventDefault();
      next();
    }
  });

  el.btnRestart.addEventListener("click", ()=>{
    hideEnding();
    state = { id:"op_1", vars:{}, auto:false, skip:false, busy:false };
    run(state.id);
  });

  el.btnAuto.addEventListener("click", ()=>{
    state.auto = !state.auto;
    toast(state.auto ? "AUTO ON" : "AUTO OFF");
  });

  el.btnSkip.addEventListener("click", ()=>{
    state.skip = !state.skip;
    toast(state.skip ? "SKIP ON" : "SKIP OFF");
  });

  el.btnSave.addEventListener("click", saveState);
  el.btnLoad.addEventListener("click", loadState);

  // AUTO: 일정 시간마다 next
  setInterval(()=>{ if (state.auto && !state.skip && el.choices.classList.contains("hidden")) next(); }, 1800);
  // SKIP: 빠르게 넘김
  setInterval(()=>{ if (state.skip && el.choices.classList.contains("hidden")) next(); }, 120);
}

async function boot(){
  const res = await fetch(ASSET.data, { cache:"no-store" });
  script = await res.json();
  indexById = new Map(script.map((n,i)=> [n.id, i]));
  bindUI();
  run(state.id);
}

boot().catch(err=>{
  console.error(err);
  toast("로딩 실패: 콘솔 확인");
});
