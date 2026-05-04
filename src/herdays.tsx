import React from "react";
import ReactDOM from "react-dom/client"; // 新增這行來驅動 React
// ── Storage ───────────────────────────────────────────────────────────────────
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

// ── BLANK entry — all menstrual fields null, only note is ""
// This is the canonical "untouched" state so we can distinguish null vs 0
const BLANK_ENTRY = { flow_level: null, pain_level: null, medication: false, blood_color: null, note: "" };

// ── Constants ─────────────────────────────────────────────────────────────────
const BLOOD_COLORS = [
  { name: "Pink Light",   hex: "#FFB7C5" },
  { name: "Bright Red",   hex: "#FF0000" },
  { name: "Deep Red",     hex: "#B22222" },
  { name: "Dark Red",     hex: "#8B0000" },
  { name: "Brown Coffee", hex: "#6F4E37" },
];
const FLOW_FILL_PCT = { 1: 25, 2: 50, 3: 75, 4: 100 };
const PAIN_LABELS   = ["None", "Mild", "Low", "Mid", "High", "Severe"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "180,100,120";
}

// Returns true only if the entry has at least one non-empty field worth saving
function isEntryMeaningful(e) {
  return e.flow_level !== null || e.pain_level !== null || e.medication || (e.note && e.note.trim() !== "");
}

function getPredictedDates(settings) {
  const { cycleLength, periodDuration, cycleStartDate } = settings;
  if (!cycleStartDate) return new Set();
  const predicted = new Set();
  const end = new Date(); end.setMonth(end.getMonth() + 4);
  let cs = new Date(cycleStartDate + "T00:00:00");
  while (cs <= end) {
    for (let d = 0; d < periodDuration; d++) {
      const day = new Date(cs); day.setDate(day.getDate() + d);
      predicted.add(day.toISOString().slice(0, 10));
    }
    cs.setDate(cs.getDate() + cycleLength);
  }
  return predicted;
}

function getWeeksForRange() {
  const today = new Date(); today.setHours(0,0,0,0);
  const startMonth = new Date(today.getFullYear(), today.getMonth() - 12, 1);
  startMonth.setDate(startMonth.getDate() - startMonth.getDay());
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 4, 0);
  endMonth.setDate(endMonth.getDate() + (6 - endMonth.getDay()));
  const weeks = []; let cur = new Date(startMonth);
  while (cur <= endMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

// ── Sub-components ────────────────────────────────────────────────────────────
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

// ── Styles ────────────────────────────────────────────────────────────────────
const glass = { background: "rgba(255,255,255,0.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 20, boxShadow: "0 4px 24px rgba(160,120,200,0.10)" };
const overlayStyle = { position: "fixed", inset: 0, zIndex: 100, background: "rgba(80,40,120,0.35)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" };

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [logs,        setLogs]        = useState(() => cleanOldLogs(load(SK.logs, {})));
  const [settings,    setSettings]    = useState(() => load(SK.settings, DEFAULT_SETTINGS));
  const [pinEnabled,  setPinEnabled]  = useState(() => load(SK.pinEnabled, false));
  const [pin,         setPin]         = useState(() => load(SK.pin, ""));
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [showPinOverlay, setShowPinOverlay] = useState(false);
  const [pinMode,     setPinMode]     = useState("check");
  const [pinInput,    setPinInput]    = useState("");
  const [pinError,    setPinError]    = useState("");

  const [selectedDay,   setSelectedDay]   = useState(null);
  const [showPanel,     setShowPanel]     = useState(false);
  const [panelEntry,    setPanelEntry]    = useState({ ...BLANK_ENTRY });
  const [showSettings,  setShowSettings]  = useState(false);
  const [showBackup,    setShowBackup]    = useState(false);
  const [exportStr,     setExportStr]     = useState("");
  const [importStr,     setImportStr]     = useState("");
  const [importMsg,     setImportMsg]     = useState("");
  const [settingsDraft, setSettingsDraft] = useState(settings);

  const todayRowRef = useRef(null);
  const today    = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);

  // PIN check on mount
  useEffect(() => {
    if (!pinEnabled) { setPinUnlocked(true); return; }
    const last = load(SK.lastPinCheck, 0);
    if (Date.now() - last > 30*24*60*60*1000 || !last) {
      setPinMode("check"); setPinInput(""); setPinError(""); setShowPinOverlay(true);
    } else { setPinUnlocked(true); }
  }, [pinEnabled]);

  // Auto-scroll to today once unlocked
  useEffect(() => {
    if (!pinUnlocked) return;
    const el = todayRowRef.current;
    if (!el) return;
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  }, [pinUnlocked]);

  useEffect(() => { save(SK.logs,     logs);     }, [logs]);
  useEffect(() => { save(SK.settings, settings); }, [settings]);

  const predicted = useMemo(() => getPredictedDates(settings), [settings]);
  const weeks     = useMemo(() => getWeeksForRange(), []);

  // ── Open day: load existing log OR start with a blank slate
  const openDay = (ds) => {
    if (!pinUnlocked) return;
    const d = new Date(ds + "T00:00:00");
    const isCurMonth = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    if (d > today && !isCurMonth) return;
    setSelectedDay(ds);
    // Merge saved log over BLANK so any null fields that were never set stay null
    const saved = logs[ds];
    setPanelEntry(saved ? { ...BLANK_ENTRY, ...saved } : { ...BLANK_ENTRY });
    setShowPanel(true);
  };

  // ── Save: only persist if meaningful; delete record if user cleared everything
  const saveEntry = () => {
    if (isEntryMeaningful(panelEntry)) {
      setLogs(l => ({ ...l, [selectedDay]: panelEntry }));
    } else {
      // User wiped all fields — remove the record entirely
      setLogs(l => { const n = { ...l }; delete n[selectedDay]; return n; });
    }
    setShowPanel(false);
  };

  const deleteEntry = () => {
    setLogs(l => { const n = { ...l }; delete n[selectedDay]; return n; });
    setShowPanel(false);
  };

  // ── Toggle helper: clicking an already-selected value deselects it (back to null)
  const toggleField = (field, val) => {
    setPanelEntry(e => ({ ...e, [field]: e[field] === val ? null : val }));
  };

  const handlePinSubmit = () => {
    if (pinMode === "check") {
      if (pinInput === pin) { save(SK.lastPinCheck, Date.now()); setPinUnlocked(true); setShowPinOverlay(false); }
      else { setPinError("Incorrect PIN."); setPinInput(""); }
    } else {
      if (pinInput.length < 4) { setPinError("Min 4 digits."); return; }
      save(SK.pin, pinInput); setPin(pinInput);
      save(SK.pinEnabled, true); setPinEnabled(true);
      save(SK.lastPinCheck, Date.now());
      setPinUnlocked(true); setShowPinOverlay(false); setPinInput("");
    }
  };

  const applySettings = () => { setSettings(settingsDraft); setShowSettings(false); };
  const handleExport  = () => setExportStr(JSON.stringify({ logs, settings }, null, 2));
  const handleImport  = () => {
    try {
      const p = JSON.parse(importStr);
      if (p.logs)     setLogs(cleanOldLogs(p.logs));
      if (p.settings) setSettings(p.settings);
      setImportMsg("✓ Restored!"); setImportStr("");
    } catch { setImportMsg("Invalid JSON."); }
  };

  let lastRenderedMonth = -1;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#e8d5f5 0%,#f0e6ff 30%,#dce8ff 60%,#f5e0ed 100%)", fontFamily: "'Inter',sans-serif" }}>
      <style>{`@keyframes slideUp { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>

      {/* Header */}
      <div style={{ position:"sticky", top:0, zIndex:50, ...glass, borderRadius:"0 0 20px 20px", padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <span style={{ fontSize:22, fontWeight:800, background:"linear-gradient(90deg,#7c3aed,#db2777)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>HerDays</span>
          <span style={{ fontSize:11, color:"#6b21a8", marginLeft:8, fontWeight:600 }}>cycle tracker</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={() => { setSettingsDraft(settings); setShowSettings(true); }}>⚙</Btn>
          <Btn onClick={() => { setExportStr(""); setImportStr(""); setImportMsg(""); setShowBackup(true); }}>☁</Btn>
          <Btn onClick={() => { setPinMode(pinEnabled?"check":"setup"); setPinInput(""); setPinError(""); setShowPinOverlay(true); }}>{pinEnabled?"🔒":"🔓"}</Btn>
        </div>
      </div>

      {/* Today strip */}
      {pinUnlocked && (
        <div style={{ padding:"12px 14px 0" }}>
          <div style={{ ...glass, padding:"12px 16px", display:"flex", gap:14, alignItems:"center" }}>
            <div style={{ width:44, height:44, borderRadius:12, background:predicted.has(todayStr)?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.4)", border:predicted.has(todayStr)?"2px dashed #7c3aed":"1.5px solid rgba(168,85,247,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#5b21b6" }}>
              {today.getDate()}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#3b0764" }}>{MONTHS[today.getMonth()]} {today.getFullYear()}</div>
              <div style={{ fontSize:12, color:"#6b21a8" }}>{predicted.has(todayStr)?"Period predicted today":logs[todayStr]?"Logged today":"Tap any date to log"}</div>
            </div>
            {settings.cycleStartDate && (
              <div style={{ marginLeft:"auto", textAlign:"right" }}>
                <div style={{ fontSize:11, color:"#6b21a8", fontWeight:600 }}>Cycle</div>
                <div style={{ fontSize:15, fontWeight:800, color:"#5b21b6" }}>{settings.cycleLength}d</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div style={{ padding:"10px 8px 100px" }}>
        {/* DOW header */}
        <div style={{ position:"sticky", top:62, zIndex:40, display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4, background:"rgba(237,233,254,0.90)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderRadius:12, padding:"6px 4px" }}>
          {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#3b0764" }}>{d}</div>)}
        </div>

        {weeks.map((week, wi) => {
          const wm = week[3].getMonth();
          const wy = week[3].getFullYear();
          const showLabel = wm !== lastRenderedMonth;
          if (showLabel) lastRenderedMonth = wm;
          const weekContainsToday = week.some(d => d.toISOString().slice(0,10) === todayStr);

          return (
            <div key={wi} ref={weekContainsToday ? todayRowRef : null}>
              {showLabel && (
                <div style={{ position:"sticky", top:98, zIndex:30, margin:"6px 0 3px", background:"rgba(237,233,254,0.93)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", borderRadius:10, padding:"5px 10px", fontSize:13, fontWeight:800, color:"#3b0764", letterSpacing:0.5, display:"inline-block", boxShadow:"0 1px 6px rgba(124,58,237,0.08)" }}>
                  {MONTHS[wm]} {wy}
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
                {week.map((day, di) => {
                  const ds         = day.toISOString().slice(0,10);
                  const isToday    = ds === todayStr;
                  const isPred     = predicted.has(ds);
                  const log        = logs[ds];
                  const inMonth    = day.getMonth() === wm;
                  const isPast     = day < today;
                  const isFuture   = day > today;
                  const isCurMonth = day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth();
                  const isFarFut   = isFuture && !isCurMonth;
                  const isClickable = !isFarFut;

                  // Flow fill: only when flow_level is set (not null)
                  const hasFlow  = log && log.flow_level != null && pinUnlocked;
                  const fillPct  = hasFlow ? (FLOW_FILL_PCT[log.flow_level] || 0) : 0;
                  const rgb      = log && log.blood_color ? hexToRgb(log.blood_color) : "180,100,120";

                  // Note-only indicator: log exists, has note, but no flow
                  const hasNoteOnly = log && !hasFlow && log.note && log.note.trim() !== "" && pinUnlocked;

                  let border = "1px solid rgba(200,180,230,0.25)";
                  if (isToday)             border = "2.5px solid #7c3aed";
                  else if (isPred && isFarFut) border = "1.5px dashed rgba(124,58,237,0.28)";
                  else if (isPred && !log)     border = "1.5px dashed rgba(124,58,237,0.65)";

                  return (
                    <div key={di} onClick={() => { if (isClickable) openDay(ds); }} style={{ height:48, borderRadius:12, border, overflow:"hidden", cursor:isClickable?"pointer":"default", position:"relative", opacity:inMonth?1:0.28, background:isToday?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.28)", transition:"transform 0.1s" }}>
                      {/* Flow fill from bottom */}
                      {fillPct > 0 && (
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${fillPct}%`, background:`rgba(${rgb},${isPast?0.82:0.65})`, transition:"height 0.2s" }} />
                      )}
                      {/* Predicted tint */}
                      {isPred && !log && <div style={{ position:"absolute", inset:0, background:"rgba(124,58,237,0.06)" }} />}
                      {/* Today inner ring */}
                      {isToday && <div style={{ position:"absolute", inset:2, borderRadius:10, border:"1.5px solid rgba(124,58,237,0.4)" }} />}

                      <div style={{ position:"relative", zIndex:1, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
                        <span style={{ fontSize:13, fontWeight:isToday?900:(isPast&&log)?700:500, color:isToday?"#5b21b6":(hasFlow&&fillPct>60)?"#fff":"#3b0764" }}>
                          {day.getDate()}
                        </span>
                        {/* Flow drops */}
                        {hasFlow && (
                          <div style={{ display:"flex", gap:1 }}>
                            {[...Array(log.flow_level)].map((_,i) => (
                              <Drop key={i} size={5} color={fillPct>60?"rgba(255,255,255,0.9)":"rgba(109,33,79,0.8)"} />
                            ))}
                          </div>
                        )}
                        {/* Note-only dot */}
                        {hasNoteOnly && <NoteIcon color="#7c3aed" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Logging Panel */}
      {showPanel && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setShowPanel(false); }}>
          <div style={{ ...glass, width:"100%", maxWidth:480, borderRadius:"24px 24px 0 0", padding:22, paddingBottom:32, animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:16, fontWeight:800, color:"#3b0764" }}>
                {selectedDay ? new Date(selectedDay+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}) : ""}
              </span>
              <button onClick={() => setShowPanel(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#6b21a8", fontWeight:700 }}>✕</button>
            </div>

            {/* Flow Level */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <Label>Flow Level</Label>
                {panelEntry.flow_level !== null && (
                  <button onClick={() => setPanelEntry(e=>({...e,flow_level:null,blood_color:null}))} style={{ fontSize:11, color:"#9b7fb6", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Clear</button>
                )}
              </div>
              <div style={{ display:"flex", gap:7 }}>
                {[1,2,3,4].map(v => {
                  const active = panelEntry.flow_level === v;
                  return (
                    <button key={v} onClick={() => toggleField("flow_level", v)} style={{ flex:1, height:52, borderRadius:14, border:active?"2px solid #7c3aed":"1.5px solid rgba(124,58,237,0.25)", background:active?"rgba(124,58,237,0.15)":"rgba(255,255,255,0.55)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3 }}>
                      <div style={{ display:"flex", gap:2 }}>
                        {[...Array(v)].map((_,i) => <Drop key={i} size={11} color={active?"#5b21b6":"#9b7fb6"} />)}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:active?"#3b0764":"#6b21a8" }}>{["","Light","Mod","Heavy","Very"][v]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Blood Color — only shown when flow is selected */}
            {panelEntry.flow_level !== null && (
              <div style={{ marginBottom:14 }}>
                <Label>Blood Color</Label>
                <div style={{ display:"flex", gap:10, marginTop:6, alignItems:"center" }}>
                  {BLOOD_COLORS.map(c => {
                    const active = panelEntry.blood_color === c.hex;
                    return (
                      <button key={c.hex} onClick={() => toggleField("blood_color", c.hex)} title={c.name} style={{ width:active?38:32, height:active?38:32, borderRadius:"50%", background:c.hex, cursor:"pointer", border:active?"3px solid #7c3aed":"2.5px solid rgba(255,255,255,0.8)", boxShadow:active?"0 0 0 2px rgba(124,58,237,0.35)":"none", transition:"all 0.15s" }} />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pain Level 0–5 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <Label>Pain Level</Label>
                {panelEntry.pain_level !== null && (
                  <button onClick={() => setPanelEntry(e=>({...e,pain_level:null}))} style={{ fontSize:11, color:"#9b7fb6", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Clear</button>
                )}
              </div>
              <div style={{ display:"flex", gap:5 }}>
                {[0,1,2,3,4,5].map(v => {
                  const active = panelEntry.pain_level === v;
                  return (
                    <button key={v} onClick={() => toggleField("pain_level", v)} style={{ flex:1, height:46, borderRadius:12, border:active?"2px solid #db2777":"1.5px solid rgba(219,39,119,0.25)", background:v===0?(active?"rgba(52,211,153,0.22)":"rgba(255,255,255,0.55)"):(active?"rgba(219,39,119,0.15)":"rgba(255,255,255,0.55)"), color:active?(v===0?"#065f46":"#831843"):(v===0?"#059669":"#9d174d"), fontWeight:700, cursor:"pointer", fontSize:11, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1 }}>
                      <span style={{ fontSize:13 }}>{v}</span>
                      <span style={{ fontSize:8, opacity:0.85 }}>{PAIN_LABELS[v]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Medication */}
            <div style={{ marginBottom:14 }}>
              <Label>Medication</Label>
              <button onClick={() => setPanelEntry(e=>({...e,medication:!e.medication}))} style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, width:"100%", padding:"12px 16px", borderRadius:14, border:panelEntry.medication?"2px solid #7c3aed":"1.5px solid rgba(124,58,237,0.3)", background:panelEntry.medication?"rgba(124,58,237,0.15)":"rgba(255,255,255,0.55)", color:panelEntry.medication?"#3b0764":"#6b21a8", fontWeight:700, cursor:"pointer", fontSize:14, minHeight:48, boxSizing:"border-box" }}>
                <span style={{ fontSize:20 }}>{panelEntry.medication?"💊":"○"}</span>
                <span>{panelEntry.medication?"Took painkiller today":"No medication taken"}</span>
                <span style={{ marginLeft:"auto", fontSize:18 }}>{panelEntry.medication?"✓":""}</span>
              </button>
            </div>

            {/* Note */}
            <div style={{ marginBottom:16 }}>
              <Label>Note</Label>
              <textarea value={panelEntry.note||""} onChange={e=>setPanelEntry(p=>({...p,note:e.target.value}))} placeholder="How are you feeling? (Note can be saved alone)" rows={3} style={{ width:"100%", marginTop:6, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.25)", background:"rgba(255,255,255,0.6)", padding:"10px 12px", fontSize:13, color:"#3b0764", resize:"none", boxSizing:"border-box", outline:"none", fontFamily:"inherit", fontWeight:500 }} />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              {logs[selectedDay] && (
                <button onClick={deleteEntry} style={{ flex:1, height:46, borderRadius:14, border:"1.5px solid rgba(219,39,119,0.4)", background:"rgba(219,39,119,0.08)", color:"#9d174d", fontWeight:700, cursor:"pointer", fontSize:14 }}>Delete</button>
              )}
              <button onClick={saveEntry} style={{ flex:2, height:46, borderRadius:14, border:"none", background:"linear-gradient(90deg,#7c3aed,#db2777)", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:15 }}>Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Panel */}
      {showSettings && (
        <div style={overlayStyle} onClick={e=>{ if(e.target===e.currentTarget) setShowSettings(false); }}>
          <div style={{ ...glass, width:"100%", maxWidth:480, borderRadius:"24px 24px 0 0", padding:22, paddingBottom:32, animation:"slideUp 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:16, fontWeight:800, color:"#3b0764" }}>Settings</span>
              <button onClick={()=>setShowSettings(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#6b21a8" }}>✕</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>Cycle Length (days)</Label>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:6 }}>
                <input type="range" min={21} max={45} value={settingsDraft.cycleLength} onChange={e=>setSettingsDraft(s=>({...s,cycleLength:+e.target.value}))} style={{ flex:1 }} />
                <span style={{ fontSize:16, fontWeight:800, color:"#3b0764", minWidth:32 }}>{settingsDraft.cycleLength}</span>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>Period Duration (days)</Label>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:6 }}>
                <input type="range" min={2} max={10} value={settingsDraft.periodDuration} onChange={e=>setSettingsDraft(s=>({...s,periodDuration:+e.target.value}))} style={{ flex:1 }} />
                <span style={{ fontSize:16, fontWeight:800, color:"#3b0764", minWidth:24 }}>{settingsDraft.periodDuration}</span>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <Label>Last Period Start Date</Label>
              <input type="date" value={settingsDraft.cycleStartDate||""} onChange={e=>setSettingsDraft(s=>({...s,cycleStartDate:e.target.value}))} style={{ width:"100%", marginTop:6, padding:"10px 12px", borderRadius:12, border:"1.5px solid rgba(124,58,237,0.25)", background:"rgba(255,255,255,0.6)", fontSize:14, color:"#3b0764", boxSizing:"border-box", outline:"none", fontFamily:"inherit", fontWeight:500 }} />
            </div>
            <div style={{ borderTop:"1px solid rgba(124,58,237,0.15)", paddingTop:14, marginBottom:14 }}>
              <Label>PIN Security</Label>
              <div style={{ marginTop:6 }}>
                {pinEnabled ? (
                  <button onClick={()=>{ save(SK.pinEnabled,false); setPinEnabled(false); setPinUnlocked(true); }} style={{ width:"100%", padding:10, borderRadius:12, border:"1.5px solid rgba(219,39,119,0.4)", background:"rgba(219,39,119,0.08)", color:"#9d174d", fontWeight:700, cursor:"pointer", fontSize:13 }}>Disable PIN</button>
                ) : (
                  <button onClick={()=>{ setShowSettings(false); setPinMode("setup"); setPinInput(""); setPinError(""); setShowPinOverlay(true); }} style={{ width:"100%", padding:10, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.35)", background:"rgba(124,58,237,0.08)", color:"#3b0764", fontWeight:700, cursor:"pointer", fontSize:13 }}>Enable Monthly PIN Check</button>
                )}
              </div>
            </div>
            <button onClick={applySettings} style={{ width:"100%", height:46, borderRadius:14, border:"none", background:"linear-gradient(90deg,#7c3aed,#db2777)", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:15 }}>Apply Settings</button>
          </div>
        </div>
      )}

      {/* ── Backup Panel */}
      {showBackup && (
        <div style={overlayStyle} onClick={e=>{ if(e.target===e.currentTarget) setShowBackup(false); }}>
          <div style={{ ...glass, width:"100%", maxWidth:480, borderRadius:"24px 24px 0 0", padding:22, paddingBottom:32, animation:"slideUp 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:16, fontWeight:800, color:"#3b0764" }}>Data Backup</span>
              <button onClick={()=>setShowBackup(false)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#6b21a8" }}>✕</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>Export Data</Label>
              <button onClick={handleExport} style={{ width:"100%", marginTop:6, padding:"11px", borderRadius:12, border:"1.5px solid rgba(124,58,237,0.35)", background:"rgba(124,58,237,0.08)", color:"#3b0764", fontWeight:700, cursor:"pointer", fontSize:14 }}>Generate Export JSON</button>
              {exportStr && <textarea readOnly value={exportStr} rows={4} onClick={e=>e.target.select()} style={{ width:"100%", marginTop:8, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.2)", background:"rgba(255,255,255,0.6)", padding:"10px 12px", fontSize:11, color:"#3b0764", resize:"none", boxSizing:"border-box", fontFamily:"monospace" }} />}
            </div>
            <div style={{ marginBottom:16 }}>
              <Label>Import Data</Label>
              <textarea value={importStr} onChange={e=>setImportStr(e.target.value)} placeholder="Paste your JSON backup here…" rows={4} style={{ width:"100%", marginTop:6, borderRadius:12, border:"1.5px solid rgba(124,58,237,0.25)", background:"rgba(255,255,255,0.6)", padding:"10px 12px", fontSize:12, color:"#3b0764", resize:"none", boxSizing:"border-box", outline:"none", fontFamily:"monospace" }} />
              {importMsg && <div style={{ fontSize:13, fontWeight:600, color:importMsg.startsWith("✓")?"#166534":"#9d174d", marginTop:6 }}>{importMsg}</div>}
            </div>
            <button onClick={handleImport} style={{ width:"100%", height:46, borderRadius:14, border:"none", background:"linear-gradient(90deg,#7c3aed,#db2777)", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:15 }}>Restore from Backup</button>
          </div>
        </div>
      )}

      {/* ── PIN Overlay */}
      {showPinOverlay && (
        <div style={{ ...overlayStyle, alignItems:"center" }}>
          <div style={{ ...glass, width:320, borderRadius:24, padding:32, textAlign:"center" }}>
            <div style={{ fontSize:38, marginBottom:8 }}>{pinMode==="setup"?"🔐":"🌸"}</div>
            <div style={{ fontSize:17, fontWeight:800, color:"#3b0764", marginBottom:6 }}>{pinMode==="setup"?"Set Your PIN":"Welcome back"}</div>
            <div style={{ fontSize:13, color:"#6b21a8", fontWeight:500, marginBottom:20 }}>{pinMode==="setup"?"Choose a 4+ digit PIN to protect your data.":"Enter your PIN to access HerDays."}</div>
            <input type="password" inputMode="numeric" maxLength={8} value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,""))} onKeyDown={e=>{ if(e.key==="Enter") handlePinSubmit(); }} placeholder="····" autoFocus style={{ width:"100%", textAlign:"center", fontSize:28, letterSpacing:14, padding:"12px", borderRadius:14, border:"1.5px solid rgba(124,58,237,0.4)", background:"rgba(255,255,255,0.7)", color:"#3b0764", outline:"none", boxSizing:"border-box", fontFamily:"monospace", marginBottom:8 }} />
            {pinError && <div style={{ fontSize:12, fontWeight:600, color:"#9d174d", marginBottom:8 }}>{pinError}</div>}
            <button onClick={handlePinSubmit} style={{ width:"100%", height:46, borderRadius:14, border:"none", background:"linear-gradient(90deg,#7c3aed,#db2777)", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:16 }}>{pinMode==="setup"?"Set PIN":"Unlock"}</button>
            {pinMode==="check" && (
              <button onClick={()=>{ save(SK.pinEnabled,false); setPinEnabled(false); setPinUnlocked(true); setShowPinOverlay(false); }} style={{ marginTop:12, background:"none", border:"none", color:"#6b21a8", fontSize:12, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}>Forgot PIN — disable &amp; reset</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App/>);
