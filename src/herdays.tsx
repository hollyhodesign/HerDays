import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";

// ── 1. 儲存與邏輯工具 (放在元件外面) ──────────────────────────────────────────
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

function isMeaningful(e) {
  return e.flow_level !== null || e.pain_level !== null || e.medication || (e.note ?? "").trim() !== "";
}

const FLOW_FILL = { 1: 25, 2: 50, 3: 75, 4: 100 };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "180,100,120";
}

// ── 2. 主組件 App ────────────────────────────────────────────────────────────
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

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayStr = useMemo(() => dateToStr(today), [today]);

  useEffect(() => {
    if (!pinEnabled) { setPinUnlocked(true); }
    else { setShowPin(true); }
  }, [pinEnabled]);

  const openDay = (ds) => {
    setSelectedDay(ds);
    const saved = logs[ds];
    setPanelEntry(saved ? { ...BLANK, ...saved } : { ...BLANK });
    setShowPanel(true);
  };

  return (
    <div className="min-h-screen p-4" style={{ background: "linear-gradient(135deg, #f0e6ff, #dce8ff)" }}>
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-purple-800">HerDays</h1>
        <div className="bg-white/50 p-2 rounded-full">🌸</div>
      </header>
      
      <div className="grid grid-cols-7 gap-2 mb-4">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-purple-900">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* 這裡先做一個簡單的測試日曆，確保能動 */}
        {[...Array(31)].map((_, i) => {
          const ds = `2026-05-${String(i + 1).padStart(2, "0")}`;
          return (
            <div key={i} onClick={() => openDay(ds)} className="h-12 bg-white/40 rounded-lg flex items-center justify-center border border-purple-100 cursor-pointer">
              {i + 1}
            </div>
          );
        })}
      </div>

      {showPin && (
        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center">
            <h2 className="text-xl font-bold mb-4">Enter PIN</h2>
            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="border-2 border-purple-200 rounded-xl p-2 text-center text-2xl w-32 mb-4" />
            <button onClick={() => setPinUnlocked(true) || setShowPin(false)} className="block w-full bg-purple-600 text-white p-3 rounded-xl font-bold">Unlock</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. 啟動渲染 (這段必須在 App 元件的大括號外面！) ──────────────────────────────
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
