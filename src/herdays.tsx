import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ── 1. 儲存與邏輯工具 (放在組件外面) ──────────────────────────────────────────
const SK = {
  logs: "herdays_logs", settings: "herdays_settings", pin: "herdays_pin",
  lastPinCheck: "herdays_last_pin_check", pinEnabled: "herdays_pin_enabled",
};
const DEFAULT_SETTINGS = { cycleLength: 28, periodDuration: 7, cycleStartDate: null };

function load(key, fb) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function cleanOldLogs(logs) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 365);
  const cut = cutoff.toISOString().slice(0, 10);
  return Object.fromEntries(Object.entries(logs).filter(([d]) => d >= cut));
}

function parseLocalDate(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
function dateToStr(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(ds, n) {
  const d = parseLocalDate(ds); d.setDate(d.getDate() + n); return dateToStr(d);
}

const BLANK = { flow_level: null, pain_level: null, medication: false, blood_color: null, note: "" };

function isMeaningful(e) {
  return e.flow_level !== null || e.pain_level !== null || e.medication || (e.note ?? "").trim() !== "";
}

// ── 2. 常量與樣式 ────────────────────────────────────────────────────────────
const BLOOD_COLORS = [
  { name: "Pink Light",   hex: "#FFB7C5" },
  { name: "Bright Red",   hex: "#FF0000" },
  { name: "Deep Red",     hex: "#B22222" },
  { name: "Dark Red",     hex: "#8B0000" },
  { name: "Brown Coffee", hex: "#6F4E37" },
];
const FLOW_FILL = { 1: 25, 2: 50, 3: 75, 4: 100 };
const PAIN_LABELS = ["None", "Mild", "Low", "Mid", "High", "Severe"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "180,100,120";
}

function getPredictedDates(settings) {
  const { cycleLength, periodDuration, cycleStartDate } = settings;
  if (!cycleStartDate) return new Set();
  const predicted = new Set();
  const end = new Date(); end.setMonth(end.getMonth() + 4);
  let cs = new Date(cycleStartDate + "T12:00:00");
  while (cs <= end) {
    for (let d = 0; d < periodDuration; d++) {
      const day = new Date(cs); day.setDate(day.getDate() + d);
      predicted.add(dateToStr(day));
    }
    cs.setDate(cs.getDate() + cycleLength);
  }
  return predicted;
}

function getWeeks() {
  const today = new Date(); today.setHours(0,0,0,0);
  const s = new Date(today.getFullYear(), today.getMonth() - 12, 1);
  s.setDate(s.getDate() - s.getDay());
  const e = new Date(today.getFullYear(), today.getMonth() + 4, 0);
  e.setDate(e.getDate() + (6 - e.getDay()));
  const weeks = []; let cur = new Date(s);
  while (cur <= e) {
    const w = [];
    for (let i = 0; i < 7; i++) { w.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(w);
  }
  return weeks;
}

// ── 3. 子組件 ───────────────────────────────────────────────────────────────
function PainDots({ level, onDark }) {
  if (!level || level <= 0) return null;
  const color = onDark ? "rgba(255,255,255,0.88)" : "#9333ea";
  return (
    <div style={{ display:"flex", flexDirection:"row", gap:2, alignItems:"center", flexWrap:"nowrap" }}>
      {[...Array(Math.min(level, 5))].map((_, i) => (
        <div key={i} style={{ width:3.5, height:3.5, borderRadius:"50%", background:color, flexShrink:0 }} />
      ))}
    </div>
  );
}

function Drop({ size = 11, color = "#9b7fb6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 16" fill="none">
      <path d="M6 1 C6 1 1 7.5 1 10.5 A5 5 0 0 0 11 10.5 C11 7.5 6 1 6 1Z" fill={color} />
    </svg>
  );
}

function NoteIcon() {
  return <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(124,58,237,0.45)" }} />;
}

function Label({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, color:"#3b0764", marginBottom:7, letterSpacing:0.8, textTransform:"uppercase", background:"rgba(237,233,254,0.85)", display:"inline-block", padding:"2px 8px", borderRadius:6 }}>
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, disabled, danger }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:36, height:36, borderRadius:10, border: danger ? "1.5px solid rgba(219,39,119,0.28)" : "1.5px solid rgba(124,58,237,0.28)", background: disabled ? "rgba(220,210,240,0.3)" : "rgba(255,255,255,0.65)", cursor: disabled ? "default" : "pointer", fontSize:18, color: danger ? "#be185d" : (disabled ? "#c4b5fd" : "#7c3aed"), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, flexShrink:0 }}>
      {children}
    </button>
  );
}

function Btn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ width:38, height:38, borderRadius:12, border:"1px solid rgba(168,85,247,0.35)", background:"rgba(255,255,255,0.6)", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {children}
    </button>
  );
}

const glass = { background:"rgba(255,255,255,0.72)", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", border:"1px solid rgba(168,85,247,0.18)", borderRadius:20, boxShadow:"0 4px 24px rgba(160,120,200,0.10)" };
const overlay = { position:"fixed", inset:0, zIndex:100, background:"rgba(80,40,120,0.35)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center" };

// ── 4. 主組件 App ────────────────────────────────────────────────────────────
export default function App() {
  const [logs, setLogs] = useState(() => cleanOldLogs(load(SK.logs, {})));
  const [settings, setSettings] = useState(() => load(SK.settings, DEFAULT_SETTINGS));
  const [pinEnabled, setPinEnabled] = useState(() => load(SK.pinEnabled, false));
  const [pin, setPin] = useState(() => load(SK.pin, ""));
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinMode, setPinMode] = useState("check");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [selectedDay, setSelectedDay] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [panelEntry, setPanelEntry] = useState({ ...BLANK });
  const [showSettings, setShowSettings] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [exportStr, setExportStr] = useState("");
  const [importStr, setImportStr] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [settingsDraft, setSettingsDraft] = useState(settings);

  const todayRowRef = useRef(null);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayStr = useMemo(() => dateToStr(today), [today]);

  useEffect(() => {
    if (!pinEnabled) { setPinUnlocked(true); return; }
    const last = load(SK.lastPinCheck, 0);
    if (Date.now() - last > 30*24*60*60*1000 || !last) {
      setPinMode("check"); setPinInput(""); setPinError(""); setShowPin(true);
    } else { setPinUnlocked(true); }
  }, [pinEnabled]);

  useEffect(() => {
    if (!pinUnlocked) return;
    const el = todayRowRef.current;
    if (el) setTimeout(() => el.scrollIntoView({ behavior:"smooth", block:"center" }), 150);
  }, [pinUnlocked]);

  useEffect(() => { save(SK.logs, logs); }, [logs]);
  useEffect(() => { save(SK.settings, settings); }, [settings]);

  const predicted = useMemo(() => getPredictedDates(settings), [settings]);
  const weeks = useMemo(() => getWeeks(), []);

  const openDay = useCallback((ds) => {
    if (!pinUnlocked) return;
    setSelectedDay(ds);
    const saved = logs[ds];
    setPanelEntry(saved ? { ...BLANK, ...saved } : { ...BLANK });
    setShowPanel(true);
  }, [pinUnlocked, logs]);

  const navigateDay = (delta) => {
    const next = addDays(selectedDay, delta);
    setSelectedDay(next);
    const saved = logs[next];
    setPanelEntry(saved ? { ...BLANK, ...saved } : { ...BLANK });
  };

  const saveEntry = () => {
    if (isMeaningful(panelEntry)) setLogs(l => ({ ...l, [selectedDay]: panelEntry }));
    else setLogs(l => { const n = { ...l }; delete n[selectedDay]; return n; });
    setShowPanel(false);
  };

  const submitPin = () => {
    if (pinMode === "check") {
      if (pinInput === pin) { save(SK.lastPinCheck, Date.now()); setPinUnlocked(true); setShowPin(false); }
      else { setPinError("Incorrect PIN."); setPinInput(""); }
    } else {
      if (pinInput.length < 4) { setPinError("Min 4 digits."); return; }
      save(SK.pin, pinInput); setPin(pinInput); save(SK.pinEnabled, true); setPinEnabled(true);
      save(SK.lastPinCheck, Date.now()); setPinUnlocked(true); setShowPin(false); setPinInput("");
    }
  };

  const panelTitle = selectedDay ? parseLocalDate(selectedDay).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" }) : "";
  let lastMonth = -1;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#e8d5f5 0%,#f0e6ff 30%,#dce8ff 60%,#f5e0ed 100%)", fontFamily:"'Inter',sans-serif" }}>
      <style>{`@keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>

      {/* Header */}
      <div style={{ position:"sticky", top:0, zIndex:50, ...glass, borderRadius:"0 0 20px 20px", padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:22, fontWeight:800, background:"linear-gradient(90deg,#7c3aed,#db2777)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>HerDays</span>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={() => { setSettingsDraft(settings); setShowSettings(true); }}>⚙</Btn>
          <Btn onClick={() => setShowBackup(true)}>☁</Btn>
        </div>
      </div>

      <div style={{ padding:"10px 8px 100px" }}>
        {weeks.map((week, wi) => {
          const wm = week[3].getMonth();
          const showLabel = wm !== lastMonth;
          if (showLabel) lastMonth = wm;
          return (
            <div key={wi} ref={week.some(d => dateToStr(d) === todayStr) ? todayRowRef : null}>
              {showLabel && <div style={{ margin:"12px 10px 6px", fontSize:13, fontWeight:800, color:"#3b0764" }}>{MONTHS[wm]} {week[3].getFullYear()}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
                {week.map((day, di) => {
                  const ds = dateToStr(day);
                  const isToday = ds === todayStr;
                  const log = logs[ds];
                  const hasFlow = log && log.flow_level != null;
                  const fillPct = hasFlow ? (FLOW_FILL[log.flow_level] || 0) : 0;
                  const rgb = log?.blood_color ? hexToRgb(log.blood_color) : "180,100,120";
                  return (
                    <div key={di} onClick={() => pinUnlocked && openDay(ds)} style={{ height:52, borderRadius:12, border:isToday?"2.5px solid #7c3aed":"1px solid rgba(200,180,230,0.25)", position:"relative", overflow:"hidden", background:isToday?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.28)" }}>
                       {fillPct > 0 && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${fillPct}%`, background:`rgba(${rgb},0.75)` }} />}
                       <div style={{ position:"relative", zIndex:1, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize:13, fontWeight:700, color:fillPct>55?"#fff":"#3b0764" }}>{day.getDate()}</span>
                          {log?.pain_level > 0 && <PainDots level={log.pain_level} onDark={fillPct>55} />}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showPanel && (
        <div style={overlay} onClick={() => setShowPanel(false)}>
          <div style={{ ...glass, width:"100%", maxWidth:480, padding:22, borderRadius:"24px 24px 0 0", animation:"slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", position:"relative", marginBottom:20 }}>
               <IconBtn onClick={() => navigateDay(-1)}>‹</IconBtn>
               <span style={{ fontSize:14, fontWeight:800, color:"#3b0764", margin:"0 15px" }}>{panelTitle}</span>
               <IconBtn onClick={() => navigateDay(1)}>›</IconBtn>
               <div style={{ position:"absolute", right:0 }}><IconBtn onClick={() => setShowPanel(false)} danger>✕</IconBtn></div>
            </div>
            <Label>Daily Note</Label>
            <textarea value={panelEntry.note} onChange={e => setPanelEntry({...panelEntry, note: e.target.value})} style={{ width:"100%", borderRadius:12, padding:12, border:"1px solid #ddd" }} rows={3} />
            <button onClick={saveEntry} style={{ width:"100%", marginTop:20, height:46, borderRadius:14, background:"#7c3aed", color:"#fff", border:"none", fontWeight:800 }}>Save</button>
          </div>
        </div>
      )}

      {showPin && (
        <div style={{ ...overlay, alignItems:"center" }}>
          <div style={{ ...glass, width:300, padding:30, textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:15 }}>{pinMode==="setup"?"Set PIN":"Unlock"}</div>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} style={{ width:"100%", textAlign:"center", fontSize:24, padding:10, borderRadius:12, border:"1.5px solid #ddd" }} />
            <button onClick={submitPin} style={{ width:"100%", marginTop:15, height:40, borderRadius:10, background:"#7c3aed", color:"#fff", border:\"none\" }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 5. 啟動渲染 (必須在 App 組件定義完之後) ───────────────────────────────────
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
