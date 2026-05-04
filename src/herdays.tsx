import { useState, useEffect, useRef, useMemo } from "react";

// -- Storage Logic --
const SK = {
  logs: "herdays_logs",
  settings: "herdays_settings",
  pin: "herdays_pin",
  lastPinCheck: "herdays_last_pin_check",
  pinEnabled: "herdays_pin_enabled",
};

const DEFAULT_SETTINGS = {
  cycleLength: 28,
  periodDuration: 7,
  cycleStartDate: null,
};

function load(key, fb) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
}

function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function cleanOldLogs(logs) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cut = cutoff.toISOString().slice(0, 10);
  return Object.fromEntries(Object.entries(logs).filter(([d]) => d >= cut));
}

// -- Constants --
const BLOOD_COLORS = [
  { name: "Pink Light",   hex: "#FFB7C5" },
  { name: "Bright Red",   hex: "#FF0000" },
  { name: "Deep Red",     hex: "#B22222" },
  { name: "Dark Red",     hex: "#8B0000" },
  { name: "Brown Coffee", hex: "#6F4E37" },
];

const FLOW_FILL_PCT = { 1: 25, 2: 50, 3: 75, 4: 100 };
const PAIN_LABELS = ["None", "Mild", "Low", "Mid", "High", "Severe"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const BLANK_ENTRY = {
  flow_level: null,
  pain_level: null,
  medication: false,
  blood_color: null,
  note: "",
};

// -- Helpers --
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : "180,100,120";
}

function isEntryMeaningful(e) {
  return e.flow_level !== null || e.pain_level !== null || e.medication === true || (e.note ?? "").trim() !== "";
}

function getPredictedDates(settings) {
  const { cycleLength, periodDuration, cycleStartDate } = settings;
  if (!cycleStartDate) return new Set();
  const predicted = new Set();
  const end = new Date();
  end.setMonth(end.getMonth() + 4);
  let cs = new Date(cycleStartDate + "T00:00:00");
  while (cs <= end) {
    for (let d = 0; d < periodDuration; d++) {
      const day = new Date(cs);
      day.setDate(day.getDate() + d);
      predicted.add(day.toISOString().slice(0, 10));
    }
    cs.setDate(cs.getDate() + cycleLength);
  }
  return predicted;
}

function getWeeksForRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonth = new Date(today.getFullYear(), today.getMonth() - 12, 1);
  startMonth.setDate(startMonth.getDate() - startMonth.getDay());
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 4, 0);
  endMonth.setDate(endMonth.getDate() + (6 - endMonth.getDay()));
  const weeks = [];
  let cur = new Date(startMonth);
  while (cur <= endMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// -- Components --
function Drop({ size = 13, color = "#a855f7" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 16" fill="none">
      <path d="M6 1 C6 1 1 7.5 1 10.5 A5 5 0 0 0 11 10.5 C11 7.5 6 1 6 1Z" fill={color} />
    </svg>
  );
}

function NoteIcon({ color = "#7c3aed" }) {
  return (
    <svg width={8} height={8} viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4" fill={color} opacity="0.7" />
    </svg>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#3b0764", marginBottom: 7, letterSpacing: 0.8, textTransform: "uppercase", background: "rgba(237,233,254,0.85)", display: "inline-block", padding: "2px 8px", borderRadius: 6 }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(168,85,247,0.35)", background: "rgba(255,255,255,0.6)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}

const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(168,85,247,0.18)",
  borderRadius: 20,
  boxShadow: "0 4px 24px rgba(160,120,200,0.10)",
};

const overlayStyle = {
  position: "fixed", inset: 0, zIndex: 100,
  background: "rgba(80,40,120,0.35)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
};

export default function App() {
  const [logs, setLogs] = useState(() => cleanOldLogs(load(SK.logs, {})));
  const [settings, setSettings] = useState(() => load(SK.settings, DEFAULT_SETTINGS));
  const [pinEnabled, setPinEnabled] = useState(() => load(SK.pinEnabled, false));
  const [pin, setPin] = useState(() => load(SK.pin, ""));
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [showPinOverlay, setShowPinOverlay] = useState(false);
  const [pinMode, setPinMode] = useState("check");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [panelEntry, setPanelEntry] = useState({ ...BLANK_ENTRY });
  const [showSettings, setShowSettings] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [exportStr, setExportStr] = useState("");
  const [importStr, setImportStr] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [settingsDraft, setSettingsDraft] = useState(settings);

  const todayRowRef = useRef(null);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);

  useEffect(() => {
    if (!pinEnabled) { setPinUnlocked(true); return; }
    const last = load(SK.lastPinCheck, 0);
    if (Date.now() - last > 30 * 24 * 60 * 60 * 1000 || !last) {
      setPinMode("check"); setShowPinOverlay(true);
    } else {
      setPinUnlocked(true);
    }
  }, [pinEnabled]);

  useEffect(() => {
    if (!pinUnlocked) return;
    setTimeout(() => todayRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  }, [pinUnlocked]);

  useEffect(() => { save(SK.logs, logs); }, [logs]);
  useEffect(() => { save(SK.settings, settings); }, [settings]);

  const predicted = useMemo(() => getPredictedDates(settings), [settings]);
  const weeks = useMemo(() => getWeeksForRange(), []);

  const openDay = (ds) => {
    if (!pinUnlocked) return;
    const d = new Date(ds + "T00:00:00");
    if (d > today && !(d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())) return;
    setSelectedDay(ds);
    setPanelEntry(logs[ds] ? { ...BLANK_ENTRY, ...logs[ds] } : { ...BLANK_ENTRY });
    setShowPanel(true);
  };

  const saveEntry = () => {
    if (isEntryMeaningful(panelEntry)) setLogs(l => ({ ...l, [selectedDay]: panelEntry }));
    else setLogs(l => { const n = { ...l }; delete n[selectedDay]; return n; });
    setShowPanel(false);
  };

  const deleteEntry = () => {
    setLogs(l => { const n = { ...l }; delete n[selectedDay]; return n; });
    setShowPanel(false);
  };

  const handlePinSubmit = () => {
    if (pinMode === "check") {
      if (pinInput === pin) { save(SK.lastPinCheck, Date.now()); setPinUnlocked(true); setShowPinOverlay(false); }
      else { setPinError("Incorrect PIN."); setPinInput(""); }
    } else {
      if (pinInput.length < 4) { setPinError("Min 4 digits."); return; }
      save(SK.pin, pinInput); setPin(pinInput); save(SK.pinEnabled, true); setPinEnabled(true);
      save(SK.lastPinCheck, Date.now()); setPinUnlocked(true); setShowPinOverlay(false);
    }
  };

  let lastRenderedMonth = -1;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#e8d5f5 0%,#f0e6ff 30%,#dce8ff 60%,#f5e0ed 100%)", fontFamily: "'Inter',sans-serif" }}>
      <style>{`@keyframes slideUp { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>
      <div style={{ position:"sticky", top:0, zIndex:50, ...glass, borderRadius:"0 0 20px 20px", padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div><span style={{ fontSize:22, fontWeight:800, background:"linear-gradient(90deg,#7c3aed,#db2777)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>HerDays</span></div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={() => { setSettingsDraft(settings); setShowSettings(true); }}>⚙</Btn>
          <Btn onClick={() => { setShowBackup(true); }}>☁</Btn>
        </div>
      </div>

      <div style={{ padding:"10px 8px 100px" }}>
        <div style={{ position:"sticky", top:62, zIndex:40, display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, background:"rgba(237,233,254,0.90)", backdropFilter:"blur(12px)", borderRadius:12, padding:"6px 4px" }}>
          {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#3b0764" }}>{d}</div>)}
        </div>
        {weeks.map((week, wi) => {
          const wm = week[3].getMonth();
          const showLabel = wm !== lastRenderedMonth;
          if (showLabel) lastRenderedMonth = wm;
          return (
            <div key={wi} ref={week.some(d => d.toISOString().slice(0, 10) === todayStr) ? todayRowRef : null}>
              {showLabel && <div style={{ margin:"6px 0", fontSize:13, fontWeight:800, color:"#3b0764" }}>{MONTHS[wm]} {week[3].getFullYear()}</div>}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
                {week.map((day, di) => {
                  const ds = day.toISOString().slice(0, 10);
                  const isToday = ds === todayStr;
                  const log = logs[ds];
                  const hasFlow = log && log.flow_level != null;
                  return (
                    <div key={di} onClick={() => openDay(ds)} style={{ height:48, borderRadius:12, border:isToday?"2.5px solid #7c3aed":"1px solid rgba(200,180,230,0.25)", position:"relative", background:isToday?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.28)" }}>
                       <div style={{ textAlign:"center", marginTop:8, fontSize:13, color:"#3b0764" }}>{day.getDate()}</div>
                       {hasFlow && <div style={{ position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)" }}><Drop size={6} color="#db2777" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showPanel && (
        <div style={overlayStyle} onClick={() => setShowPanel(false)}>
          <div style={{ ...glass, width:"100%", maxWidth:480, padding:22, animation:"slideUp 0.3s ease" }} onClick={e => e.stopPropagation()}>
            <Label>Daily Log</Label>
            <textarea value={panelEntry.note} onChange={e => setPanelEntry({...panelEntry, note: e.target.value})} style={{ width:"100%", borderRadius:12, padding:10 }} rows={3} />
            <button onClick={saveEntry} style={{ width:"100%", marginTop:10, height:46, borderRadius:14, background:"#7c3aed", color:"#fff" }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
