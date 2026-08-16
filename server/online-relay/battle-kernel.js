"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const DEFAULT_GAME_HTML_CANDIDATES = Object.freeze([
  path.resolve(__dirname, "game.html"),
  path.resolve(__dirname, "index(20260815-111049)(1).html"),
  path.resolve(__dirname, "../../upload/index(20260815-111049)(1).html"),
]);
const defaultGameHtml = () => DEFAULT_GAME_HTML_CANDIDATES.find(candidate => fs.existsSync(candidate)) || DEFAULT_GAME_HTML_CANDIDATES[0];

function makeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(String(name))),
    remove: (...names) => names.forEach(name => values.delete(String(name))),
    contains: name => values.has(String(name)),
    toggle(name, force) {
      name = String(name);
      if (force === true) { values.add(name); return true; }
      if (force === false) { values.delete(name); return false; }
      if (values.has(name)) { values.delete(name); return false; }
      values.add(name); return true;
    },
    replace(oldName, newName) {
      if (!values.has(String(oldName))) return false;
      values.delete(String(oldName)); values.add(String(newName)); return true;
    },
    toString: () => [...values].join(" "),
    [Symbol.iterator]: () => values[Symbol.iterator](),
  };
}

function makeHeadlessBrowser() {
  const elementsById = new Map();
  const elementsBySelector = new Map();

  class HeadlessElement {
    constructor(tagName = "div", id = "") {
      this.tagName = String(tagName || "div").toUpperCase();
      this.nodeName = this.tagName;
      this.nodeType = 1;
      this.id = id;
      this.children = [];
      this.childNodes = this.children;
      this.parentNode = null;
      this.parentElement = null;
      this.firstChild = null;
      this.firstElementChild = null;
      this.lastChild = null;
      this.lastElementChild = null;
      this.nextSibling = null;
      this.previousSibling = null;
      this.isConnected = false;
      this.classList = makeClassList();
      this.dataset = Object.create(null);
      this.style = new Proxy(Object.create(null), {
        get(target, key) {
          if (key === "setProperty") return (name, value) => { target[name] = String(value); };
          if (key === "removeProperty") return name => { const old = target[name] || ""; delete target[name]; return old; };
          if (key === "getPropertyValue") return name => target[name] || "";
          return target[key] || "";
        },
      });
      this.attributes = new Map();
      this.textContent = "";
      this.innerText = "";
      this._innerHTML = "";
      Object.defineProperty(this, "innerHTML", {
        configurable: true,
        enumerable: true,
        get: () => this._innerHTML,
        set: value => {
          this._innerHTML = String(value == null ? "" : value);
          this.children.splice(0, this.children.length);
          if (this._innerHTML) this.appendChild(new HeadlessElement("div"));
          else this._syncChildren();
        },
      });
      this.value = "";
      this.checked = false;
      this.disabled = false;
      this.hidden = false;
      this.open = false;
      this.selectedIndex = 0;
      this.options = [];
      this.files = [];
      this.width = 0;
      this.height = 0;
      this.scrollTop = 0;
      this.scrollLeft = 0;
      this.scrollWidth = 0;
      this.scrollHeight = 0;
      this.clientWidth = 0;
      this.clientHeight = 0;
      this.offsetWidth = 0;
      this.offsetHeight = 0;
    }
    appendChild(child) {
      if (!child) return child;
      child.parentNode = this; child.parentElement = this; child.isConnected = this.isConnected;
      this.children.push(child); this._syncChildren(); return child;
    }
    append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
    prepend(...nodes) {
      for (const node of nodes.reverse()) {
        if (!node) continue;
        node.parentNode = this; node.parentElement = this; node.isConnected = this.isConnected;
        this.children.unshift(node);
      }
      this._syncChildren();
    }
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      if (child) { child.parentNode = null; child.parentElement = null; child.isConnected = false; }
      this._syncChildren(); return child;
    }
    replaceChild(next, prior) {
      const index = this.children.indexOf(prior);
      if (index < 0) return prior;
      this.children[index] = next; next.parentNode = this; next.parentElement = this;
      prior.parentNode = null; prior.parentElement = null; this._syncChildren(); return prior;
    }
    replaceWith(...nodes) {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index < 0) return;
      this.parentNode.children.splice(index, 1, ...nodes);
      for (const node of nodes) { if (node) { node.parentNode = this.parentNode; node.parentElement = this.parentElement; } }
      this.parentNode._syncChildren?.();
    }
    remove() { this.parentNode?.removeChild?.(this); }
    insertBefore(next, reference) {
      const index = Math.max(0, this.children.indexOf(reference));
      next.parentNode = this; next.parentElement = this; this.children.splice(index, 0, next); this._syncChildren(); return next;
    }
    insertAdjacentElement(_position, element) { return this.appendChild(element); }
    insertAdjacentHTML() {}
    insertAdjacentText(_position, text) { this.textContent += String(text); }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    matches() { return false; }
    closest() { return null; }
    contains(node) { return node === this || this.children.includes(node); }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
    click() {}
    focus() {}
    blur() {}
    scrollIntoView() {}
    setPointerCapture() {}
    releasePointerCapture() {}
    setAttribute(name, value) { this.attributes.set(String(name), String(value)); if (name === "id") this.id = String(value); }
    getAttribute(name) { return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null; }
    hasAttribute(name) { return this.attributes.has(String(name)); }
    removeAttribute(name) { this.attributes.delete(String(name)); }
    toggleAttribute(name, force) {
      if (force === false) { this.removeAttribute(name); return false; }
      if (force === true || !this.hasAttribute(name)) { this.setAttribute(name, ""); return true; }
      this.removeAttribute(name); return false;
    }
    getBoundingClientRect() { return { x:0, y:0, top:0, left:0, right:0, bottom:0, width:0, height:0, toJSON(){ return this; } }; }
    getClientRects() { return []; }
    cloneNode(deep = false) {
      const clone = new HeadlessElement(this.tagName, this.id);
      clone.textContent = this.textContent; clone.innerHTML = this.innerHTML;
      if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode?.(true) || child));
      return clone;
    }
    _syncChildren() {
      this.firstChild = this.children[0] || null;
      this.firstElementChild = this.children.find(child => child?.nodeType === 1) || null;
      this.lastChild = this.children[this.children.length - 1] || null;
      this.lastElementChild = [...this.children].reverse().find(child => child?.nodeType === 1) || null;
    }
  }

  class HeadlessText {
    constructor(text = "") { this.nodeType = 3; this.nodeName = "#text"; this.textContent = String(text); this.parentNode = null; }
    cloneNode() { return new HeadlessText(this.textContent); }
    remove() { this.parentNode?.removeChild?.(this); }
  }

  const body = new HeadlessElement("body", "body"); body.isConnected = true;
  const documentElement = new HeadlessElement("html", "html"); documentElement.isConnected = true; documentElement.appendChild(body);
  const getId = id => {
    id = String(id || "");
    if (!elementsById.has(id)) {
      const element = new HeadlessElement("div", id);
      element.appendChild(new HeadlessText(""));
      body.appendChild(element);
      elementsById.set(id, element);
    }
    return elementsById.get(id);
  };
  const getSelector = selector => {
    selector = String(selector || "");
    if (selector.startsWith("#") && /^#[A-Za-z0-9_-]+$/.test(selector)) return getId(selector.slice(1));
    if (!elementsBySelector.has(selector)) elementsBySelector.set(selector, new HeadlessElement("div"));
    return elementsBySelector.get(selector);
  };
  const document = {
    body, documentElement,
    visibilityState: "visible", hidden: false, readyState: "loading", fullscreenElement: null,
    activeElement: body, scrollingElement: documentElement,
    getElementById: getId,
    querySelector: getSelector,
    querySelectorAll: () => [],
    getElementsByClassName: () => [],
    getElementsByTagName: () => [],
    createElement: tag => new HeadlessElement(tag),
    createElementNS: (_ns, tag) => new HeadlessElement(tag),
    createTextNode: text => new HeadlessText(text),
    createDocumentFragment: () => new HeadlessElement("fragment"),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    elementFromPoint: () => null, elementsFromPoint: () => [],
    hasFocus: () => true,
  };

  const storage = new Map();
  const localStorage = {
    getItem: key => storage.has(String(key)) ? storage.get(String(key)) : null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear(),
    key: index => [...storage.keys()][index] || null,
    get length() { return storage.size; },
  };
  class StubAudio {
    constructor(src = "") { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; this.loop = false; this.preload = "none"; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener() {} removeEventListener() {} load() {} cloneNode() { return new StubAudio(this.src); }
  }
  class StubImage extends HeadlessElement { constructor(){ super("img"); this.complete = true; this.naturalWidth = 1; this.naturalHeight = 1; } }
  class StubWebSocket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    constructor() { this.readyState = StubWebSocket.CLOSED; }
    addEventListener() {} removeEventListener() {} send() { return false; } close() { this.readyState = StubWebSocket.CLOSED; }
  }
  class StubObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  class StubEvent { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } preventDefault(){} stopPropagation(){} stopImmediatePropagation(){} }

  return {
    document, HeadlessElement, HeadlessText, localStorage,
    globals: {
      document,
      navigator: { userAgent:"cp32-server-kernel", language:"ko-KR", languages:["ko-KR"], onLine:true, maxTouchPoints:0, clipboard:{ writeText: async () => {} }, vibrate: () => false },
      location: new URL("https://cp32.server.invalid/"),
      history: { pushState(){}, replaceState(){}, back(){}, forward(){}, go(){} },
      localStorage, sessionStorage: localStorage,
      Element: HeadlessElement, HTMLElement: HeadlessElement, HTMLButtonElement: HeadlessElement, HTMLInputElement: HeadlessElement,
      Node: { ELEMENT_NODE:1, TEXT_NODE:3, DOCUMENT_NODE:9 },
      Event: StubEvent, CustomEvent: StubEvent, MouseEvent: StubEvent, KeyboardEvent: StubEvent, PointerEvent: StubEvent,
      Audio: StubAudio, Image: StubImage, WebSocket: StubWebSocket,
      ResizeObserver: StubObserver, MutationObserver: StubObserver, IntersectionObserver: StubObserver,
      requestAnimationFrame: () => 0, cancelAnimationFrame() {}, requestIdleCallback: () => 0, cancelIdleCallback() {},
      setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
      getComputedStyle: () => new Proxy({ pointerEvents:"auto", display:"block", visibility:"visible", opacity:"1" }, { get:(target,key) => target[key] ?? "" }),
      matchMedia: () => ({ matches:false, media:"", onchange:null, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } }),
      CSS: { escape:value => String(value), supports:() => false },
      screen: { width:1920, height:1080, availWidth:1920, availHeight:1080, orientation:{ type:"landscape-primary", angle:0, addEventListener(){}, removeEventListener(){} } },
      innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
      scrollX: 0, scrollY: 0, scrollTo() {}, scrollBy() {},
      alert() {}, confirm: () => false, prompt: () => null, open: () => null,
      fetch: async () => ({ ok:false, status:404, json:async()=>({}), text:async()=>"", arrayBuffer:async()=>new ArrayBuffer(0) }),
      URL, URLSearchParams, TextEncoder, TextDecoder, Blob, AbortController,
      structuredClone: globalThis.structuredClone || (value => JSON.parse(JSON.stringify(value))),
      crypto: crypto.webcrypto,
      performance,
      atob: text => Buffer.from(String(text), "base64").toString("binary"),
      btoa: text => Buffer.from(String(text), "binary").toString("base64"),
    },
  };
}

function extractScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    scripts.push(match[2].replace(/const BGM_AUDIO_SRC = "data:audio\/mpeg;base64,[^"]*";/, "const BGM_AUDIO_SRC = \"\";"));
  }
  return scripts;
}

const BRIDGE_SOURCE = String.raw`
(() => {
  const cloneJson = value => JSON.parse(JSON.stringify(value));
  const decisionKeys = Object.freeze([
    "paymentPlan","switchPaymentPlan","prefer","gatherProposal","replaceIndex","replaceIndices","discardNew",
    "healTargetUid","sealedSkillId","extraEnergyPlan","split","healSplitPct","rTargetUid","rDiscardSpecs","deepMindTargetUid",
    "vortexSwaps","unsealDiscardSpecs","strikeBaseColor","genociderPayment",
    "timeAccelerationChoice","timeKeepGainIndices","timeReplacementIndex","timeReplacementIndices","timeSwapPairs","timeDeclineOverflow",
    "energyOverflowChoices","energyOverflowResolved"
  ]);
  const actionKeyOmissions = new Set([
    "label","reason","actionId","transactionId","sourceInstanceId","scheduledActionId","effectiveActionSpec",
    ...decisionKeys,"forcedDirectColor","healSplitAmountPreview","timeFirstColor","timeSecondColor","timeBonusColor","timePreviewState"
  ]);
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (actionKeyOmissions.has(key)) continue;
        out[key] = canonical(value[key]);
      }
      return out;
    }
    return value;
  };
  const actionKey = action => JSON.stringify(canonical(action || {}));
  const rulesOf = rules => {
    const league = LeagueFormatOwner.normalizeLeague(rules?.league || "mega");
    const compositions = league === "comprehensive"
      ? {
          P: LeagueFormatOwner.normalizeComposition(rules?.compositions?.P || rules?.composition || "2234"),
          A: LeagueFormatOwner.normalizeComposition(rules?.compositions?.A || rules?.composition || "2234"),
        }
      : { P:null, A:null };
    return { league, composition:compositions.P, compositions, variance:false, difficulty:"normal" };
  };
  const normalizePlus = (choice, deck, team) => {
    const resolved = resolvePlusStarChoices(choice, deck, team);
    return resolved.length > 1 ? resolved : (resolved[0] || null);
  };
  const validateDeck = ({ deck, league, composition, plusStar, team = "P", complete = true } = {}) => {
    const normalizedLeague = LeagueFormatOwner.normalizeLeague(league || "mega");
    const normalizedComposition = normalizedLeague === "comprehensive" ? LeagueFormatOwner.normalizeComposition(composition || "2234") : null;
    const clean = Array.isArray(deck) ? deck.map(String) : [];
    const normalizedPlusStar = normalizePlus(plusStar, clean, team);
    const valid = complete
      ? LeagueFormatOwner.completeValid(clean, normalizedLeague, normalizedComposition, normalizedPlusStar, team)
      : LeagueFormatOwner.partialValid(clean, normalizedLeague, normalizedComposition, normalizedPlusStar, team);
    return {
      valid, deck:clean, plusStar:normalizedPlusStar, league:normalizedLeague,
      composition:normalizedComposition,
      progress:LeagueFormatOwner.progressText(clean, normalizedLeague, normalizedComposition, normalizedPlusStar, team),
    };
  };
  const install = (next, rules) => {
    game = next;
    p2p.role = "host";
    p2p.connected = true;
    p2p.rules = rulesOf(rules);
    onlineSide = "P";
    busy = false;
    pendingSkill = null;
    StateFactory.decorate(game, { mode:"online" });
    prepareCurrentTurn(game);
    StateFactory.updateActive(game);
    return game;
  };
  const snapshot = () => serializeOnlineBattleProjection(game);
  const stateMeta = () => {
    const [team, slot] = game?.order?.[game?.turn] || [];
    return {
      matchId:game?.matchId || null, battleId:game?.battleId || null,
      turn:Number(game?.turn || 0), turnSerial:Number(game?.turnSerial || 0),
      revision:Number(game?.networkRevision || 0), activeTeam:team || null, activeSlot:Number(slot ?? -1),
      winner:game?.winner || null, ended:!!(game?.ended || game?.winner), phase:game?.winner ? "ENDED" : "IN_BATTLE",
    };
  };
  const restore = (raw, rules) => install(OnlineSnapshotEngine.restoreState(String(raw), { source:"authoritative-state", rules:rulesOf(rules) }), rules);
  const legal = () => {
    const [team, slot] = game?.order?.[game?.turn] || [];
    const actions = legalActions(game, team, slot) || [];
    return { team, slot, actions:actions.map(action => ({ key:actionKey(action), action:cloneJson(action) })) };
  };
  const mergeDecision = (base, submitted) => {
    const merged = cloneJson(base);
    for (const key of decisionKeys) if (submitted && Object.prototype.hasOwnProperty.call(submitted, key)) merged[key] = cloneJson(submitted[key]);
    return merged;
  };
  const api = {
    manifest() {
      return {
        cards:CARDS.length,
        cardIds:CARDS.map(card => card.id),
        cardGrades:Object.fromEntries(CARDS.map(card => [card.id, card.grade])),
        leagues:Object.keys(LeagueFormatOwner.definitions),
        comprehensivePatterns:Object.keys(LeagueFormatOwner.comprehensivePatterns),
        snapshotVersion:OnlineSnapshotEngine.VERSION,
      };
    },
    validateDeck,
    createBattle({ host, guest, rules, seed, matchId, firstTeam, onlineCoin, revision = 0 } = {}) {
      const normalizedRules = rulesOf(rules);
      const hostDeck = validateDeck({ deck:host?.deck, plusStar:host?.plusStar, league:normalizedRules.league, composition:normalizedRules.compositions.P, team:"P", complete:true });
      const guestDeck = validateDeck({ deck:guest?.deck, plusStar:guest?.plusStar, league:normalizedRules.league, composition:normalizedRules.compositions.A, team:"A", complete:true });
      if (!hostDeck.valid || !guestDeck.valid) {
        const error = new Error("SERVER_DECK_VALIDATION_FAILED");
        error.code = "SERVER_DECK_VALIDATION_FAILED";
        error.details = { host:hostDeck, guest:guestDeck };
        throw error;
      }
      const next = newGame(hostDeck.deck, guestDeck.deck, {
        mode:"online", league:normalizedRules.league, leagueCompositions:normalizedRules.compositions,
        plusStar:{ P:hostDeck.plusStar, A:guestDeck.plusStar }, variance:false, difficulty:"normal",
        seed:String(seed || matchId || Date.now()), matchId:String(matchId || seed || Date.now()), firstTeam, onlineCoin,
      });
      install(next, normalizedRules);
      game.networkRevision = Math.max(0, Number(revision || 0));
      game.revision = game.networkRevision;
      return { state:snapshot(), meta:stateMeta(), rules:normalizedRules };
    },
    inspect(raw, rules) {
      restore(raw, rules);
      const legalNow = legal();
      return { state:snapshot(), meta:stateMeta(), legal:legalNow.actions };
    },
    execute(raw, rules, command = {}) {
      restore(raw, rules);
      const before = stateMeta();
      if (command.expectedTurnSerial != null && Number(command.expectedTurnSerial) !== before.turnSerial) {
        return { accepted:false, reason:"STALE_TURN_SERIAL", state:snapshot(), meta:before, legal:legal().actions };
      }
      if(command.commandKind==="summon"){
        const current=normalizePendingSummonTurns(game),expectedTeam=command.role==="guest"?"A":"P";
        if(!current||current.q.team!==expectedTeam||String(current.u.uid)!==String(command.summonUid||""))
          return {accepted:false,reason:"SUMMON_ACTION_OWNER_MISMATCH",state:snapshot(),meta:before,legal:[]};
        const options=(summonActionOptions(game,current.q.team,current.u)||[]).map(action=>({key:actionKey(action),action:cloneJson(action)}));
        const submitted=command.action&&typeof command.action==="object"?command.action:{};
        const wantedKey=String(command.actionKey||actionKey(submitted));
        const matched=options.find(row=>row.key===wantedKey);
        if(!matched)return {accepted:false,reason:"SUMMON_ACTION_NOT_LEGAL",state:snapshot(),meta:before,legal:options};
        p2p.role=command.role==="guest"?"guest":"host";onlineSide=expectedTeam;
        const action=mergeDecision(matched.action,submitted);
        for(const key of ["color","discardNew"])if(Object.prototype.hasOwnProperty.call(submitted,key))action[key]=cloneJson(submitted[key]);
        const ok=applyManualSummonAction(game,current.q.team,current.u.uid,action);
        if(!ok)return {accepted:false,reason:"SUMMON_ACTION_EXECUTION_REJECTED",state:snapshot(),meta:stateMeta(),legal:options};
        if(command.commitRevision!=null){game.networkRevision=Math.max(Number(game.networkRevision||0),Number(command.commitRevision||0));game.revision=game.networkRevision;}
        StateFactory.updateActive(game);
        return {accepted:true,reason:"COMMITTED",state:snapshot(),meta:stateMeta(),action:cloneJson(action),legal:[]};
      }
      const legalNow = legal();
      const expectedTeam = command.role === "guest" ? "A" : "P";
      if (legalNow.team !== expectedTeam) {
        return { accepted:false, reason:"NOT_ACTION_OWNER", state:snapshot(), meta:before, legal:legalNow.actions };
      }
      p2p.role=command.role==="guest"?"guest":"host";onlineSide=expectedTeam;
      const submitted = command.action && typeof command.action === "object" ? command.action : {};
      const wantedKey = String(command.actionKey || actionKey(submitted));
      const matched = legalNow.actions.find(row => row.key === wantedKey);
      if (!matched) return { accepted:false, reason:"ACTION_NOT_LEGAL", state:snapshot(), meta:before, legal:legalNow.actions };
      const action = mergeDecision(matched.action, submitted);
      if (command.commandId) action.actionId = String(command.commandId);
      const previousApplyingRemoteAction = !!p2p.applyingRemoteAction;
      p2p.applyingRemoteAction = true;
      let ok = false;
      try {
        ok = execute(game, legalNow.team, legalNow.slot, action, { serverAuthoritative:true, r48Live:true });
      } finally {
        p2p.applyingRemoteAction = previousApplyingRemoteAction;
      }
      if (!ok) return { accepted:false, reason:"ACTION_EXECUTION_REJECTED", state:snapshot(), meta:stateMeta(), legal:legal().actions };
      if (command.commitRevision != null) {
        game.networkRevision = Math.max(Number(game.networkRevision || 0), Number(command.commitRevision || 0));
        game.revision = game.networkRevision;
      }
      StateFactory.updateActive(game);
      return { accepted:true, reason:"COMMITTED", state:snapshot(), meta:stateMeta(), action:cloneJson(action), legal:legal().actions };
    },
    actionKey,
  };
  Object.defineProperty(globalThis, "__CP32_SERVER_KERNEL__", { value:Object.freeze(api), configurable:false, writable:false });
})();
`;

function loadBattleKernel(htmlPath = process.env.CP32_GAME_HTML || defaultGameHtml()) {
  const absolute = path.resolve(htmlPath);
  const html = fs.readFileSync(absolute, "utf8");
  const scripts = extractScripts(html);
  if (!scripts.length) throw new Error(`CP32_GAME_SCRIPTS_NOT_FOUND:${absolute}`);
  const browser = makeHeadlessBrowser();
  const sandbox = {
    ...browser.globals,
    console: { log(){}, info(){}, warn(){}, error(){} },
    process: { env:Object.create(null) },
    Buffer,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox, { name:"cp32-server-battle-kernel", codeGeneration:{ strings:true, wasm:false } });
  for (let index = 0; index < scripts.length; index++) {
    try { vm.runInContext(scripts[index], context, { filename:`${path.basename(absolute)}#script-${index + 1}`, timeout:30_000 }); }
    catch (error) { error.message = `CP32_GAME_SCRIPT_LOAD_FAILED[${index + 1}/${scripts.length}]: ${error.message}`; throw error; }
  }
  vm.runInContext(BRIDGE_SOURCE, context, { filename:"cp32-server-kernel-bridge.js", timeout:30_000 });
  const api = context.__CP32_SERVER_KERNEL__;
  if (!api) throw new Error("CP32_SERVER_KERNEL_BRIDGE_UNAVAILABLE");
  const htmlSha256 = crypto.createHash("sha256").update(html).digest("hex");
  return Object.freeze({
    htmlPath:absolute,
    htmlSha256,
    scriptCount:scripts.length,
    manifest:() => api.manifest(),
    validateDeck:input => api.validateDeck(input),
    createBattle:input => api.createBattle(input),
    inspect:(raw, rules) => api.inspect(raw, rules),
    execute:(raw, rules, command) => api.execute(raw, rules, command),
    actionKey:action => api.actionKey(action),
  });
}

module.exports = { loadBattleKernel };
