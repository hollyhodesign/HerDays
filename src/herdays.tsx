import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ── 1. 工具與儲存邏輯 ────────────────────────────────────────────────────────
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(ds, n) {
  const d = parseLocalDate(ds); d.setDate(d.getDate() + n); return dateToStr(d);
}

const BLANK = { flow_level: null, pain_level: null, medication: false, blood_color: null, note: "" };
const FLOW_FILL = { 1: 25, 2: 50, 3: 75, 4: 100 };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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

// ── 2. 子組件 ──────────────────────────────────────────────────────────────
function PainDots({ level, onDark }) {
  if (!level || level <= 0) return null;
  const color = onDark ? "rgba(255,255,255,0.9)" : "#9333ea";
  return (
    <div style={{ display:"flex", gap:2, alignItems:"center", flexWrap:"nowrap" }}>
      {[...Array(Math.min(level, 5))].map((_, i) => (
        <div key={i} style={{ width:3.5, height:3.5, borderRadius:"50%", background:color, flexShrink:0 }} />
      ))}
    </div>
  );
}

const glass = { background:"rgba(255,255,255,0.72)", backdropFilter:"blur(18px)", border:"1px solid rgba(168,85,247,0.18)", borderRadius:20, boxShadow:"0 4px 24px rgba(160,120,200,0.1)" };
const overlay = { position:"fixed", inset:0, zIndex:100, background:"rgba(80,40,120,0.35)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end", justifyContent:"center" };

// ── 3. 主程式 App ────────────────────────────────────────────────────────────
export default function App() {
  const [logs, setLogs] = useState(() => cleanOldLogs(load(SK.logs, {})));
  const [settings, setSettings] = useState(() => load(SK.settings, DEFAULT_SETTINGS));
  const [pinEnabled, setPinEnabled] = useState(() => load(SK.pinEnabled, false));
  const [pin, setPin] = useState(() => load(SK.pin, ""));
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinMode, setPinMode] = useState("check");
  const [pinInput, setPinInput] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [panelEntry, setPanelEntry] = useState({ ...BLANK });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(settings);

  const todayRowRef = useRef(null);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayStr = useMemo(() => dateToStr(today), [today]);
  const predicted = useMemo(() => getPredictedDates(settings), [settings]);
  const weeks = useMemo(() => getWeeks(), []);

  useEffect(() => {
    if (!pinEnabled) setPinUnlocked(true);
    else setShowPin(true);
  }, [pinEnabled]);

  useEffect(() => {
    if (pinUnlocked && todayRowRef.current) {
      setTimeout(() => todayRowRef.current.scrollIntoView({ behavior:"smooth", block:"center" }), 200);
    }
  }, [pinUnlocked]);

  useEffect(() => { save(SK.logs, logs); }, [logs]);
  useEffect(() => { save(SK.settings, settings); }, [settings]);

  const openDay = useCallback((ds) => {
    setSelectedDay(ds);
    const saved = logs[ds];
    setPanelEntry(saved ? { ...BLANK, ...saved } : { ...BLANK });
    setShowPanel(true);
  }, [logs]);

  const navigateDay = (delta) => {
    const next = addDays(selectedDay, delta);
    setSelectedDay(next);
    const saved = logs[next];
    setPanelEntry(saved ? { ...BLANK, ...saved } : { ...BLANK });
  };

  const saveEntry = () => {
    setLogs(l => ({ ...l, [selectedDay]: panelEntry }));
    setShowPanel(false);
  };

  const submitPin = () => {
    if (pinMode === "check") {
      if (pinInput === pin) { setPinUnlocked(true); setShowPin(false); }
      else { setPinInput(""); alert("Wrong PIN"); }
    } else {
      save(SK.pin, pinInput); setPin(pinInput); save(SK.pinEnabled, true); setPinEnabled(true);
      setPinUnlocked(true); setShowPin(false);
    }
  };

  let lastMonth = -1;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0e6ff 0%,#dce8ff 100%)", fontFamily:"sans-serif" }}>
      <header style={{ ...glass, borderRadius:"0 0 20px 20px", padding:15, display:"flex", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
        <span style={{ fontSize:20, fontWeight:900, color:"#7c3aed" }}>HerDays</span>
        <button onClick={() => { setSettingsDraft(settings); setShowSettings(true); }} style={{ background:"none", border:"none", fontSize:20 }}>⚙️</button>
      </header>

      <div style={{ padding:"10px 8px 100px" }}>
        {weeks.map((week, wi) => {
          const wm = week[3].getMonth();
          const showLabel = wm !== lastMonth;
          if (showLabel) lastMonth = wm;
          return (
            <div key={wi} ref={week.some(d => dateToStr(d) === todayStr) ? todayRowRef : null}>
              {showLabel && <div style={{ margin:"15px 10px 5px", fontWeight:800, color:"#3b0764" }}>{MONTHS[wm]} {week[3].getFullYear()}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
                {week.map((day, di) => {
                  const ds = dateToStr(day);
                  const isToday = ds === todayStr;
                  const log = logs[ds];
                  const hasFlow = log && log.flow_level != null;
                  const fillPct = hasFlow ? (FLOW_FILL[log.flow_level] || 0) : 0;
                  const darkBg = fillPct > 55;
                  const rgb = log?.blood_color ? hexToRgb(log.blood_color) : "180,100,120";

                  return (
                    <div key={di} onClick={() => pinUnlocked && openDay(ds)} style={{ height:52, borderRadius:12, border:isToday?"2px solid #7c3aed":"1px solid rgba(200,180,230,0.25)", position:"relative", overflow:"hidden", background:isToday?"rgba(167,139,250,0.1)":"#fff" }}>
                      {fillPct > 0 && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${fillPct}%`, background:`rgba(${rgb},0.8)` }} />}
                      <div style={{ position:"relative", zIndex:1, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:darkBg?"#fff":"#3b0764" }}>{day.getDate()}</span>
                        {log?.pain_level > 0 && <PainDots level={log.pain_level} onDark={darkBg} />}
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
          <div style={{ ...glass, width:"100%", maxWidth:400, padding:20, borderRadius:"24px 24px 0 0" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", position:"relative", marginBottom:20 }}>
              <button onClick={() => navigateDay(-1)}>‹</button>
              <span style={{ margin:"0 15px", fontWeight:800 }}>{selectedDay}</span>
              <button onClick={() => navigateDay(1)}>›</button>
              <button onClick={() => setShowPanel(false)} style={{ position:"absolute", right:0 }}>✕</button>
            </div>
            <textarea value={panelEntry.note} onChange={e => setPanelEntry({...panelEntry, note: e.target.value})} style={{ width:"100%", height:100, borderRadius:12, padding:10, border:"1px solid #ddd" }} placeholder="Notes..." />
            <button onClick={saveEntry} style={{ width:"100%", marginTop:15, padding:12, borderRadius:14, background:"#7c3aed", color:"#fff", border:"none", fontWeight:800 }}>Save</button>
          </div>
        </div>
      )}

      {showPin && (
        <div style={{ ...overlay, alignItems:"center" }}>
          <div style={{ ...glass, width:300, padding:30, textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:15 }}>{pinMode === "setup" ? "Set PIN" : "HerDays Locked"}</div>
            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} style={{ width:"100%", textAlign:"center", fontSize:24, padding:10, borderRadius:12, border:"1px solid #ddd" }} />
            <button onClick={submitPin} style={{ width:"100%", marginTop:15, padding:10, borderRadius:10, background:"#7c3aed", color:"#fff", border:"none" }}>Unlock</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. 掛載渲染 ─────────────────────────────────────────────────────────────
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
