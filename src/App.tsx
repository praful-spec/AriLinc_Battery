// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";

// ── Brand ─────────────────────────────────────────────────────────
const B = {
  blue:"#1d4ed8", teal:"#0891b2", green:"#059669", purple:"#7c3aed",
  orange:"#d97706", red:"#dc2626", yellow:"#ca8a04", grey:"#f8fafc",
  border:"#e2e8f0", text:"#0f172a", sub:"#64748b", light:"#94a3b8",
};

// ── Production Lines ───────────────────────────────────────────────
const LINES = [
  {
    id:"EL-A1", name:"Electrode Line A1", type:"Anode Coating", location:"Module 1",
    icon:"⬛", color:B.blue, status:"running",
    kpis:{ throughput:"142 m/min", coatingWeight:"185 g/m²", defectRate:"0.8%", yield:"98.4%" },
    thresholds:{ coatingWeight:{nom:185,tol:3}, defectRate:{warn:1.5,crit:3.0} },
    aiAlert:"Coating uniformity nominal. Edge thinning detected on left margin — AI adjusting slot die by 0.3mm.",
    defects:{ pinholes:3, streaks:1, thickness:2, contamination:0 },
    qualityScore:94, aiAction:"Auto-corrected",
  },
  {
    id:"EL-C2", name:"Electrode Line C2", type:"Cathode Coating", location:"Module 1",
    icon:"⬜", color:B.purple, status:"warning",
    kpis:{ throughput:"138 m/min", coatingWeight:"278 g/m²", defectRate:"2.1%", yield:"96.2%" },
    thresholds:{ coatingWeight:{nom:278,tol:4}, defectRate:{warn:1.5,crit:3.0} },
    aiAlert:"Defect rate 2.1% — above warning threshold. NMP solvent viscosity drift detected. AI recommends slurry temperature adjustment.",
    defects:{ pinholes:8, streaks:4, thickness:6, contamination:2 },
    qualityScore:76, aiAction:"Action Required",
  },
  {
    id:"AS-B1", name:"Assembly Line B1", type:"Cell Assembly", location:"Module 2",
    icon:"🔋", color:B.green, status:"running",
    kpis:{ throughput:"2,400 cells/hr", alignmentError:"0.12 mm", shortCircuit:"0.02%", yield:"99.1%" },
    thresholds:{ alignmentError:{warn:0.2,crit:0.4}, shortCircuit:{warn:0.05,crit:0.1} },
    aiAlert:"All assembly parameters nominal. Vision AI detecting 99.98% separator alignment accuracy.",
    defects:{ misalignment:2, shortCircuit:0, wrinkle:1, contamination:0 },
    qualityScore:97, aiAction:"Monitoring",
  },
  {
    id:"FM-D1", name:"Formation Line D1", type:"Cell Formation", location:"Module 3",
    icon:"⚡", color:B.orange, status:"in_formation",
    kpis:{ capacity:"48.2 Ah", efficiency:"98.6%", cycleTime:"18h 42m", yield:"97.8%" },
    thresholds:{ capacity:{nom:48,tol:1}, efficiency:{warn:97,crit:95} },
    aiAlert:"Formation Cycle 2/4 running. Capacity trending 0.4% above nominal — excellent batch. AI predicting final capacity 48.6 Ah.",
    defects:{ lowCapacity:3, highSelfDischarge:1, voltageDeviation:2, thermalAnomaly:0 },
    qualityScore:96, aiAction:"Monitoring",
  },
  {
    id:"QC-E1", name:"End-of-Line QC", type:"Testing & Grading", location:"Module 4",
    icon:"🔬", color:B.teal, status:"running",
    kpis:{ tested:"1,847 cells/shift", gradeA:"94.2%", gradeB:"4.1%", reject:"1.7%" },
    thresholds:{ gradeA:{warn:92,crit:88}, reject:{warn:2.0,crit:4.0} },
    aiAlert:"Grade A yield 94.2% — above target. AI identified 3 cells with elevated self-discharge — flagged for extended soak test.",
    defects:{ capacity:12, selfDischarge:8, ir:5, voltage:3 },
    qualityScore:92, aiAction:"Monitoring",
  },
];

// ── Formation Cycle Definitions ────────────────────────────────────
const FORMATION_CYCLES = [
  { id:"c1", label:"Cycle 1 — Initial Charge",    icon:"⬆", color:B.blue,   duration:"4h 30m", cRate:"C/10", voltageRange:"2.5 to 4.2V", purpose:"SEI layer formation on anode surface",        status:"completed" },
  { id:"c2", label:"Cycle 2 — Discharge",          icon:"⬇", color:B.purple, duration:"4h 15m", cRate:"C/10", voltageRange:"4.2 to 2.5V", purpose:"Initial capacity measurement & SEI stabilisation", status:"running"   },
  { id:"c3", label:"Cycle 3 — Charge",             icon:"⬆", color:B.green,  duration:"3h 50m", cRate:"C/5",  voltageRange:"2.5 to 4.2V", purpose:"Capacity confirmation — must meet >=48 Ah",   status:"pending"   },
  { id:"c4", label:"Cycle 4 — Grading Discharge",  icon:"🏁", color:B.orange, duration:"3h 55m", cRate:"C/5",  voltageRange:"4.2 to 2.5V", purpose:"Final grade assignment · dV/dQ analysis",    status:"pending"   },
];

// ── Cell Grade Definitions ─────────────────────────────────────────
const GRADE_CRITERIA = [
  { grade:"A+", capacity:">= 48.5 Ah", selfDischarge:"under 0.02%/day", ir:"under 1.8 mOhm", voltage:"4.195-4.205V", yield:"12%", color:B.blue },
  { grade:"A",  capacity:"48.0-48.5 Ah", selfDischarge:"under 0.03%/day", ir:"under 2.0 mOhm", voltage:"4.190-4.210V", yield:"82%", color:B.green },
  { grade:"B",  capacity:"47.0-48.0 Ah", selfDischarge:"under 0.05%/day", ir:"under 2.5 mOhm", voltage:"4.180-4.220V", yield:"4%",  color:B.orange },
  { grade:"C",  capacity:"under 47.0 Ah",   selfDischarge:">= 0.05%/day", ir:">= 2.5 mOhm", voltage:"Out of spec",  yield:"2%",  color:B.red },
];

// ── Synthetic Data ─────────────────────────────────────────────────
const genFormationCurve = () => {
  const d = [];
  for(let t=0; t<=270; t+=3){
    const phase = t<90?"charge1":t<180?"discharge":t<240?"charge2":"discharge2";
    const charging = phase==="charge1"||phase==="charge2";
    const baseV = charging ? 2.5+(t%90)*0.019 : 4.2-(t%90)*0.019;
    const baseCurrent = charging ? 4.8 : -4.8;
    d.push({
      t:`${Math.floor(t/60)}h${t%60}m`,
      voltage: +(baseV+Math.random()*0.02-0.01).toFixed(3),
      current: +(baseCurrent+Math.random()*0.1-0.05).toFixed(2),
      temperature: +(28+t*0.04+Math.random()*0.5).toFixed(1),
      capacity: t<90?+(t*0.536+Math.random()*0.1).toFixed(2):t<180?+(48.2-((t-90)*0.536)+Math.random()*0.1).toFixed(2):t<240?+(((t-180)*0.8)+Math.random()*0.1).toFixed(2):+(48.6-((t-240)*0.8)+Math.random()*0.1).toFixed(2),
    });
  }
  return d;
};

const genDefectTrend = (line) => Array.from({length:24},(_,i)=>({
  hour:`${i}:00`,
  pinholes:  Math.max(0,Math.round((line.defects.pinholes/8)*(1+Math.sin(i*0.4)*0.5)+Math.random()*1)),
  streaks:   Math.max(0,Math.round((line.defects.streaks/4)*(1+Math.cos(i*0.3)*0.4)+Math.random()*0.5)),
  thickness: Math.max(0,Math.round((line.defects.thickness/6)*(1+Math.sin(i*0.5)*0.3)+Math.random()*0.5)),
}));

const genYieldTrend = () => Array.from({length:30},(_,i)=>({
  day:`D${i+1}`,
  gradeA: +(92+Math.random()*4+(i>20?1.5:0)).toFixed(1),
  gradeB: +(3+Math.random()*2-(i>20?0.5:0)).toFixed(1),
  reject: +(1+Math.random()*1.5-(i>20?0.3:0)).toFixed(1),
}));

const genCapacityDist = () => {
  const d = [];
  for(let cap=46.5; cap<=49.5; cap+=0.1){
    const mu=48.2, sigma=0.4;
    const val = Math.round(500*Math.exp(-Math.pow(cap-mu,2)/(2*sigma*sigma))+Math.random()*8);
    d.push({ capacity:+cap.toFixed(1), count:val });
  }
  return d;
};



const FORMATION_DATA = genFormationCurve();
const YIELD_DATA = genYieldTrend();
const CAP_DATA = genCapacityDist();

// ── Components ────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const cfg = {
    running:     ["#f0fdf4","#059669","● RUNNING"],
    warning:     ["#fffbeb","#d97706","⚠ WARNING"],
    in_formation:["#eff6ff","#1d4ed8","⚡ FORMING"],
    stopped:     ["#fff5f5","#dc2626","■ STOPPED"],
    pending:     ["#f8fafc","#94a3b8","○ PENDING"],
    completed:   ["#f0fdf4","#059669","✓ COMPLETE"],
  };
  const [bg,col,lbl] = cfg[status]||["#f8fafc","#94a3b8","—"];
  return <span style={{background:bg,color:col,border:`1px solid ${col}40`,borderRadius:4,padding:"2px 9px",fontSize:10,fontWeight:700,letterSpacing:0.8,whiteSpace:"nowrap"}}>{lbl}</span>;
};

const CT = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
      <div style={{color:"#64748b",fontWeight:600,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=>(<div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}</div>))}
    </div>
  );
};

// ── Formation Live Monitor ─────────────────────────────────────────
function FormationMonitor({ line }) {
  const [cycleIdx, setCycleIdx] = useState(1);
  const [elapsed, setElapsed] = useState(142);
  const [running, setRunning] = useState(true);
  const ref = useRef(null);
  const cur = FORMATION_CYCLES[cycleIdx];
  const totalMin = 270;
  const pct = Math.min(100, Math.round((elapsed/totalMin)*100));
  const liveData = FORMATION_DATA.slice(0, Math.max(10, Math.floor(elapsed/totalMin*FORMATION_DATA.length)));

  useEffect(()=>{
    if(running){
      ref.current = setInterval(()=>setElapsed(e=>e>=totalMin?e:e+1),600);
    }
    return()=>clearInterval(ref.current);
  },[running]);

  const latestV = liveData[liveData.length-1]?.voltage||3.82;
  const latestCap = liveData[liveData.length-1]?.capacity||24.1;
  const latestTemp = liveData[liveData.length-1]?.temperature||30.2;

  return (
    <div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:B.text}}>Formation Monitor — {line.id}</div>
            <div style={{fontSize:12,color:B.sub,marginTop:2}}>Batch BT-2024-1847 · 2,400 cells · 48V NMC Pouch</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,color:B.blue}}>Overall: {pct}%</div>
            <button onClick={()=>setRunning(r=>!r)} style={{background:running?"#fff5f5":"#f0fdf4",border:`1px solid ${running?"#fecaca":"#bbf7d0"}`,color:running?"#dc2626":"#059669",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{running?"⏸ Pause":"▶ Resume"}</button>
          </div>
        </div>

        {/* Cycle steps */}
        <div style={{display:"flex",gap:4,marginBottom:12}}>
          {FORMATION_CYCLES.map((c,i)=>(
            <div key={c.id} style={{flex:1,cursor:"pointer"}} onClick={()=>setCycleIdx(i)}>
              <div style={{height:6,borderRadius:3,background:c.status==="completed"?B.green:c.status==="running"?c.color:"#e2e8f0",marginBottom:3,transition:"background 0.4s"}}/>
              <div style={{fontSize:8,color:c.status==="completed"?B.green:c.status==="running"?c.color:B.light,fontWeight:700,textAlign:"center"}}>{c.icon} Cycle {i+1}</div>
            </div>
          ))}
        </div>

        {/* Active cycle */}
        <div style={{background:`${cur.color}08`,border:`2px solid ${cur.color}30`,borderRadius:10,padding:"14px 16px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:cur.color}}>{cur.label}</div>
              <div style={{fontSize:11,color:B.sub,marginTop:2}}>📋 {cur.purpose}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:cur.color}}>{Math.floor(elapsed/60)}h {elapsed%60}m</div>
              <div style={{fontSize:10,color:B.light}}>Elapsed</div>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:4,height:6,marginTop:10}}>
            <div style={{height:6,borderRadius:4,background:cur.color,width:`${pct}%`,transition:"width 0.6s"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
            {[{l:"C-Rate",v:cur.cRate},{l:"Voltage Range",v:cur.voltageRange},{l:"Duration",v:cur.duration}].map((k,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:7,padding:"7px 10px",textAlign:"center",border:`1px solid ${cur.color}20`}}>
                <div style={{fontSize:9,color:B.light,marginBottom:2}}>{k.l}</div>
                <div style={{fontSize:12,fontWeight:800,color:cur.color}}>{k.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live readings */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            {label:"Voltage",val:`${latestV} V`,color:B.blue,limit:"2.5 to 4.2V",ok:latestV>2.5&&latestV<4.2},
            {label:"Capacity",val:`${latestCap.toFixed(1)} Ah`,color:B.purple,limit:"Target: 48 Ah",ok:true},
            {label:"Temperature",val:`${latestTemp}°C`,color:latestTemp>40?B.red:B.orange,limit:"below 40C",ok:latestTemp<40},
            {label:"AI Prediction",val:"48.6 Ah",color:B.green,limit:"+0.4% above nominal",ok:true},
          ].map((s,i)=>(
            <div key={i} style={{background:`${s.color}08`,border:`1px solid ${s.color}30`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:9,color:B.light,marginBottom:3}}>{s.label}</div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:s.color}}>{s.val}</div>
              <div style={{fontSize:9,color:s.ok?B.green:B.red,fontWeight:600,marginTop:2}}>{s.ok?"✓":""} {s.limit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Formation curve */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>Live Formation Curve — Voltage & Capacity</div>
        <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Real-time electrochemical characterisation · All 4 cycles overlaid</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={liveData} margin={{top:4,right:16,bottom:4,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="t" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={14}/>
            <YAxis yAxisId="v" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={38} domain={[2.4,4.3]} label={{value:"V",angle:-90,position:"insideLeft",fill:"#94a3b8",fontSize:10}}/>
            <YAxis yAxisId="c" orientation="right" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={40} label={{value:"Ah",angle:90,position:"insideRight",fill:"#94a3b8",fontSize:10}}/>
            <Tooltip content={<CT/>}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <ReferenceLine yAxisId="v" y={4.2} stroke={B.red} strokeDasharray="4 3" strokeWidth={1}/>
            <ReferenceLine yAxisId="v" y={2.5} stroke={B.orange} strokeDasharray="4 3" strokeWidth={1}/>
            <Line yAxisId="v" type="monotone" dataKey="voltage"  stroke={B.blue}   strokeWidth={2} dot={false} name="Voltage (V)"/>
            <Line yAxisId="c" type="monotone" dataKey="capacity" stroke={B.purple} strokeWidth={2} dot={false} name="Capacity (Ah)" strokeDasharray="5 3"/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Temperature */}
      <div className="card">
        <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Cell Temperature During Formation</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={liveData} margin={{top:4,right:16,bottom:4,left:0}}>
            <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.orange} stopOpacity={0.2}/><stop offset="95%" stopColor={B.orange} stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="t" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={14}/>
            <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} unit="°C"/>
            <Tooltip content={<CT/>}/>
            <ReferenceLine y={40} stroke={B.red} strokeDasharray="4 3" label={{value:"Limit 40°C",fill:B.red,fontSize:9}}/>
            <Area type="monotone" dataKey="temperature" stroke={B.orange} fill="url(#tg)" strokeWidth={2} dot={false} name="Temperature (°C)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Sign-in Screen ─────────────────────────────────────────────────
function SignInScreen({ onSubmit }) {
  const [form, setForm] = useState({ name:"", company:"", email:"" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const validate = () => {
    const e = {};
    if(!form.name.trim()) e.name = "Required";
    if(!form.company.trim()) e.company = "Required";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if(Object.keys(e).length){ setErrors(e); return; }
    setSubmitting(true);
    try {
      await fetch("https://formspree.io/f/xqeywrry", {
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body: JSON.stringify({
          name:form.name, company:form.company, email:form.email,
          _subject:`AriLinc Battery Mfg Sign-in: ${form.name} — ${form.company}`,
        }),
      });
    } catch(_){}
    onSubmit(form);
  };

  const inp = key => ({
    width:"100%", padding:"11px 14px", borderRadius:8, fontSize:14,
    border:`1.5px solid ${errors[key]?"#fca5a5":"rgba(255,255,255,0.25)"}`,
    outline:"none", fontFamily:"Inter,sans-serif", color:"#0f172a",
    background:"#fff", marginTop:5,
  });
  const lbl = { fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.75)", letterSpacing:0.3 };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .lb:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,0.2);}
        @media(max-width:480px){.sfc{padding:24px 18px!important;}}
      `}</style>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,background:"rgba(255,255,255,0.15)",borderRadius:16,marginBottom:16,border:"1px solid rgba(255,255,255,0.25)"}}>
            <span style={{fontSize:28}}>🔋</span>
          </div>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:28,fontWeight:800,color:"#fff",marginBottom:4}}>AriLinc</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Battery Manufacturing Intelligence · by AriPrus</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>Formation Cycles · Quality Control · Yield Analytics</div>
        </div>
        <div className="sfc" style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",borderRadius:20,padding:"32px 32px",border:"1px solid rgba(255,255,255,0.18)",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:20,fontWeight:800,color:"#fff",marginBottom:4,textAlign:"center"}}>Sign In</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",textAlign:"center",marginBottom:24}}>Access the Battery Intelligence Platform</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={lbl}>Full Name *</label>
              <input style={inp("name")} value={form.name} onChange={set("name")} />
              {errors.name&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.name}</div>}
            </div>
            <div>
              <label style={lbl}>Company *</label>
              <input style={inp("company")} value={form.company} onChange={set("company")} />
              {errors.company&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.company}</div>}
            </div>
            <div>
              <label style={lbl}>Work Email *</label>
              <input type="email" style={inp("email")} value={form.email} onChange={set("email")} />
              {errors.email&&<div style={{fontSize:11,color:"#fca5a5",marginTop:3}}>{errors.email}</div>}
            </div>
          </div>
          <button className="lb" onClick={handleSubmit} disabled={submitting}
            style={{width:"100%",marginTop:28,padding:"14px",background:submitting?"rgba(255,255,255,0.15)":"#fff",color:submitting?"rgba(255,255,255,0.4)":"#1d4ed8",border:"none",borderRadius:10,fontSize:15,fontWeight:800,cursor:submitting?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
            {submitting?"⏳ Launching...":"🚀 Launch Platform"}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:14}}>
            🔒 Secure · <a href="mailto:info@ariprus.com" style={{color:"rgba(255,255,255,0.6)",textDecoration:"none",fontWeight:600}}>info@ariprus.com</a>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:18,fontSize:12,color:"rgba(255,255,255,0.25)"}}>
          © 2026 AriPrus · <a href="https://ariprus.com" style={{color:"rgba(255,255,255,0.45)",textDecoration:"none"}}>ariprus.com</a>
        </div>
      </div>
    </div>
  );
}
// ================================================================
//  MAIN COMPONENT
// ================================================================
export default function BatteryMfg() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("lines");
  const [selectedLine, setSelectedLine] = useState(LINES[3]);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date().toLocaleTimeString()),1000); return()=>clearInterval(t); },[]);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = [
      "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')",
      "*{box-sizing:border-box;margin:0;padding:0;}",
      ".card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);}",
      ".sec-btn{padding:12px 16px;border:none;background:none;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all 0.2s;white-space:nowrap;}",
      ".sec-btn:hover{color:#0f172a;background:#f1f5f9;}",
      ".g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}",
      ".g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}",
      ".g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}",
      ".g5{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}",
      ".hdr{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}",
      ".sec-bar{background:#fff;border-bottom:2px solid #e2e8f0;padding:0 24px;display:flex;overflow-x:auto;}",
      ".pp{padding:20px 24px 32px;}",
      ".fw{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;background:#fff;}",
      "@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}",
      "@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}",
    ].join(" ");
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  if(!user) return <SignInScreen onSubmit={setUser}/>;

  const warningCount = LINES.filter(l=>l.status==="warning").length;
  const totalCells = 1847;
  const gradeAYield = 94.2;
  const rejectRate = 1.7;

  const sections = [
    {key:"lines",     icon:"🏭", label:"Production Lines"},
    {key:"formation", icon:"⚡", label:"Formation Cycles"},
    {key:"quality",   icon:"🔬", label:"Quality Control"},
    {key:"ai",        icon:"🤖", label:"AI Intelligence"},
    {key:"analytics", icon:"📊", label:"Analytics"},
    {key:"grading",   icon:"🏆", label:"Cell Grading"},
  ];

  return (
    <div style={{background:B.grey,minHeight:"100vh",color:B.text,fontFamily:"Inter,sans-serif"}}>
      {/* Styles injected via useEffect to avoid JSX parser conflicts */}

      {/* Header */}
      <div className="hdr">
        <div style={{flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.blue}}>AriLinc <span style={{color:B.orange}}>Battery</span> Intelligence</div>
            <span style={{background:"#eff6ff",color:B.blue,border:"1px solid #bfdbfe",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}>NMC · LFP · NCA</span>
          </div>
          <div style={{fontSize:11,color:B.light,marginTop:2}}>Battery Manufacturing QC · Formation Intelligence · Powered by AriPrus</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {warningCount>0&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.orange}}>⚠ {warningCount} Line Alert</div>}
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.green,display:"flex",alignItems:"center",gap:5}}><span style={{animation:"blink 1s infinite"}}>●</span>LIVE</div>
          <div style={{fontSize:12,color:B.light}}>{time}</div>
          <div style={{fontSize:12,color:B.light}}>👋 {user.name} · {user.company}</div>
          <button onClick={()=>setUser(null)} style={{fontSize:11,color:B.light,background:"none",border:`1px solid ${B.border}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>

      {/* Section bar */}
      <div className="sec-bar">
        {sections.map(s=>(
          <button key={s.key} className="sec-btn"
            style={{color:section===s.key?B.blue:B.sub,borderBottom:`3px solid ${section===s.key?B.blue:"transparent"}`,fontWeight:section===s.key?800:600}}
            onClick={()=>setSection(s.key)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="pp">

        {/* ── PRODUCTION LINES ── */}
        {section==="lines" && (
          <div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🏭",label:"Production Lines",value:"5 / 5",sub:"All monitored",color:B.blue},
                {icon:"⚠️",label:"Lines in Warning",value:warningCount,sub:"AI alert active",color:B.orange},
                {icon:"🔋",label:"Cells Tested Today",value:"1,847",sub:"This shift",color:B.purple},
                {icon:"✅",label:"Grade A Yield",value:`${gradeAYield}%`,sub:"Above 92% target",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{fontFamily:"Inter,sans-serif",fontSize:17,fontWeight:800,color:B.text,marginBottom:14}}>Production Line Status</div>
            <div className="g3">
              {LINES.map(line=>{
                const defectData = genDefectTrend(line).filter((_,idx)=>idx%4===0);
                return (
                  <div key={line.id} style={{background:"#fff",border:`2px solid ${line.status==="warning"?"#fde68a":line.status==="in_formation"?"#bfdbfe":"#e2e8f0"}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                    <div style={{padding:"12px 16px",borderBottom:`3px solid ${line.color}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                          <span style={{fontSize:18}}>{line.icon}</span>
                          <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:B.text}}>{line.id}</div>
                        </div>
                        <div style={{fontSize:11,color:B.sub}}>{line.name}</div>
                        <div style={{fontSize:10,color:B.light}}>{line.type} · {line.location}</div>
                      </div>
                      <StatusPill status={line.status}/>
                    </div>

                    {/* Quality score ring */}
                    <div style={{padding:"10px 16px",background:"#fafafa",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:14}}>
                      <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                        <svg width="52" height="52" viewBox="0 0 52 52">
                          <circle cx="26" cy="26" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5"/>
                          <circle cx="26" cy="26" r="22" fill="none" stroke={line.qualityScore>=90?B.green:line.qualityScore>=75?B.orange:B.red} strokeWidth="5"
                            strokeDasharray={`${2*Math.PI*22*line.qualityScore/100} ${2*Math.PI*22}`} strokeLinecap="round" transform="rotate(-90 26 26)"/>
                          <text x="26" y="31" textAnchor="middle" fill={line.qualityScore>=90?B.green:line.qualityScore>=75?B.orange:B.red} fontSize="11" fontWeight="bold">{line.qualityScore}</text>
                        </svg>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:700,color:B.text,marginBottom:2}}>Quality Score</div>
                        <div style={{fontSize:10,color:line.qualityScore>=90?B.green:line.qualityScore>=75?B.orange:B.red,fontWeight:600}}>{line.aiAction}</div>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,borderBottom:"1px solid #f1f5f9"}}>
                      {Object.entries(line.kpis).map(([k,v])=>(
                        <div key={k} style={{background:"#f8fafc",borderRadius:6,padding:"5px 8px"}}>
                          <div style={{fontSize:9,color:B.light,textTransform:"capitalize"}}>{k.replace(/([A-Z])/g," $1").trim()}</div>
                          <div style={{fontSize:12,fontWeight:700,color:B.text}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Defect sparkline */}
                    <div style={{padding:"8px 12px 4px"}}>
                      <div style={{fontSize:9,color:B.light,marginBottom:2}}>Defect trend (24h)</div>
                      <ResponsiveContainer width="100%" height={45}>
                        <BarChart data={defectData} margin={{top:0,right:4,bottom:0,left:0}}>
                          <Bar dataKey="pinholes" stackId="a" fill={B.red} radius={[0,0,0,0]}/>
                          <Bar dataKey="streaks" stackId="a" fill={B.orange}/>
                          <Bar dataKey="thickness" stackId="a" fill={B.yellow} radius={[2,2,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* AI alert */}
                    <div style={{padding:"8px 14px"}}>
                      <div style={{background:`${line.status==="warning"?"#fffbeb":"#f0fdf4"}`,border:`1px solid ${line.status==="warning"?"#fde68a":"#bbf7d0"}`,borderRadius:7,padding:"6px 10px",fontSize:11,color:B.text,lineHeight:1.5,marginBottom:8}}>
                        <strong style={{color:line.status==="warning"?B.orange:B.green}}>🤖 AI: </strong>{line.aiAlert}
                      </div>
                      <button onClick={()=>{setSelectedLine(line);setSection(line.status==="in_formation"?"formation":"quality");}} style={{width:"100%",padding:"7px",background:`${line.color}10`,border:`1px solid ${line.color}40`,borderRadius:7,fontSize:11,fontWeight:700,color:line.color,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                        {line.status==="in_formation"?"⚡ View Formation":"🔬 View QC Detail"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FORMATION CYCLES ── */}
        {section==="formation" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text}}>⚡ Formation Cycle Intelligence</div>
                <div style={{fontSize:13,color:B.sub,marginTop:2}}>Real-time electrochemical monitoring · AI capacity prediction · SEI formation tracking</div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {LINES.map(l=>(<button key={l.id} onClick={()=>setSelectedLine(l)} style={{background:selectedLine.id===l.id?l.color:"#fff",color:selectedLine.id===l.id?"#fff":B.sub,border:`2px solid ${selectedLine.id===l.id?l.color:B.border}`,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l.id}</button>))}
              </div>
            </div>
            <FormationMonitor line={selectedLine}/>

            {/* Cycle ref table */}
            <div className="card" style={{marginTop:16}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Formation Protocol — All Cycles</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
                  <thead><tr style={{background:"#f8fafc"}}>{["Cycle","Direction","C-Rate","Voltage","Duration","GMP Purpose","Status"].map(h=>(<th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#475569",fontWeight:700,borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
                  <tbody>{FORMATION_CYCLES.map((c,i)=>(
                    <tr key={c.id} style={{borderBottom:"1px solid #f1f5f9",background:c.status==="running"?"#eff6ff":i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"8px 12px",fontWeight:700,color:c.color}}>{c.icon} Cycle {i+1}</td>
                      <td style={{padding:"8px 12px",color:B.sub}}>{c.label.split("—")[1]?.trim()}</td>
                      <td style={{padding:"8px 12px",fontWeight:600,color:B.text}}>{c.cRate}</td>
                      <td style={{padding:"8px 12px",color:B.sub}}>{c.voltageRange}</td>
                      <td style={{padding:"8px 12px",color:B.sub}}>{c.duration}</td>
                      <td style={{padding:"8px 12px",color:B.sub,maxWidth:280}}>{c.purpose}</td>
                      <td style={{padding:"8px 12px"}}><StatusPill status={c.status}/></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── QUALITY CONTROL ── */}
        {section==="quality" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>🔬 Quality Control — In-Line & End-of-Line</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Vision AI defect detection · SPC monitoring · Real-time yield tracking</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🔬",label:"Cells Tested",value:"1,847",sub:"This shift",color:B.blue},
                {icon:"✅",label:"Grade A",value:"94.2%",sub:"↑ 2.1% vs target",color:B.green},
                {icon:"⚠️",label:"Grade B",value:"4.1%",sub:"Rework candidate",color:B.orange},
                {icon:"❌",label:"Reject Rate",value:"1.7%",sub:"↓ 0.3% vs baseline",color:B.red},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="g2" style={{marginBottom:16}}>
              {/* Defect Pareto */}
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>Defect Pareto — This Shift</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Top defect types by frequency across all lines</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart layout="vertical" data={[
                    {name:"Pinholes",count:28,color:B.red},
                    {name:"Thickness Deviation",count:19,color:B.orange},
                    {name:"Coating Streaks",count:14,color:B.yellow},
                    {name:"Contamination",count:8,color:B.purple},
                    {name:"Misalignment",count:6,color:B.teal},
                    {name:"Short Circuit",count:2,color:B.blue},
                  ]} margin={{top:4,right:40,bottom:4,left:80}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}}/>
                    <YAxis type="category" dataKey="name" stroke="#e2e8f0" tick={{fill:"#475569",fontSize:10}} width={80}/>
                    <Tooltip content={<CT/>}/>
                    <Bar dataKey="count" fill={B.blue} radius={[0,4,4,0]} name="Count"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* SPC Chart */}
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>SPC — Coating Weight (EL-C2)</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Statistical process control · Nominal 278 g/m² ± 4 g/m²</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={Array.from({length:30},(_,i)=>({
                    sample:`S${i+1}`,
                    value: +(278+Math.sin(i*0.6)*3.5+(i>20?2:0)+Math.random()*2-1).toFixed(1),
                    ucl:282, lcl:274, nom:278,
                  }))} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="sample" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} domain={[270,290]} unit=" g"/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine y={282} stroke={B.red} strokeDasharray="4 3" label={{value:"UCL",fill:B.red,fontSize:9}}/>
                    <ReferenceLine y={278} stroke={B.green} strokeDasharray="4 3" label={{value:"NOM",fill:B.green,fontSize:9}}/>
                    <ReferenceLine y={274} stroke={B.red} strokeDasharray="4 3" label={{value:"LCL",fill:B.red,fontSize:9}}/>
                    <Line type="monotone" dataKey="value" stroke={B.purple} strokeWidth={2} dot={{r:2}} name="Coating Wt (g/m²)"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Defect map per line */}
            <div className="card">
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Defect Summary — All Production Lines</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
                  <thead><tr style={{background:"#f8fafc"}}>{["Line","Type","Throughput","Defect Rate","Pinholes","Streaks","Thickness","Contamination","Quality Score","AI Status"].map(h=>(<th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#475569",fontWeight:700,borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap",fontSize:11}}>{h}</th>))}</tr></thead>
                  <tbody>{LINES.map((l,i)=>(
                    <tr key={l.id} style={{borderBottom:"1px solid #f1f5f9",background:l.status==="warning"?"#fffbeb":i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"7px 12px",fontWeight:700,color:l.color}}>{l.icon} {l.id}</td>
                      <td style={{padding:"7px 12px",fontSize:11,color:B.sub}}>{l.type}</td>
                      <td style={{padding:"7px 12px",color:B.text}}>{l.kpis.throughput||l.kpis.tested}</td>
                      <td style={{padding:"7px 12px",fontWeight:700,color:parseFloat(l.kpis.defectRate||l.kpis.reject)>2?B.red:parseFloat(l.kpis.defectRate||l.kpis.reject)>1?B.orange:B.green}}>{l.kpis.defectRate||l.kpis.reject}</td>
                      <td style={{padding:"7px 12px",color:l.defects.pinholes>5?B.red:B.text}}>{l.defects.pinholes}</td>
                      <td style={{padding:"7px 12px",color:l.defects.streaks>3?B.orange:B.text}}>{l.defects.streaks}</td>
                      <td style={{padding:"7px 12px",color:l.defects.thickness>4?B.orange:B.text}}>{l.defects.thickness}</td>
                      <td style={{padding:"7px 12px",color:l.defects.contamination>0?B.red:B.green}}>{l.defects.contamination===0?"✓ 0":l.defects.contamination}</td>
                      <td style={{padding:"7px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:48,background:"#e2e8f0",borderRadius:3,height:5}}><div style={{height:5,borderRadius:3,background:l.qualityScore>=90?B.green:l.qualityScore>=75?B.orange:B.red,width:`${l.qualityScore}%`}}/></div>
                          <span style={{fontWeight:700,color:l.qualityScore>=90?B.green:l.qualityScore>=75?B.orange:B.red}}>{l.qualityScore}</span>
                        </div>
                      </td>
                      <td style={{padding:"7px 12px"}}><StatusPill status={l.status}/></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── AI INTELLIGENCE ── */}
        {section==="ai" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>🤖 Battery AI Intelligence</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Predictive quality control · Formation optimisation · Defect root cause · Yield forecasting</div>
            <div className="g2" style={{marginBottom:16}}>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.blue,marginBottom:4}}>🎯 Predictive Quality Scoring</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI scores each line in real-time — flags deviations before they hit reject</div>
                {LINES.map(l=>(
                  <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"9px 12px",background:`${l.qualityScore<80?"#fffbeb":l.qualityScore<90?"#f8fafc":"#f0fdf4"}`,border:`1px solid ${l.qualityScore<80?B.orange:l.qualityScore<90?"#e2e8f0":B.green}30`,borderRadius:8}}>
                    <span style={{fontSize:16}}>{l.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:11,fontWeight:700,color:B.text}}>{l.id} — {l.type}</span>
                        <span style={{fontSize:11,fontWeight:700,color:l.qualityScore>=90?B.green:l.qualityScore>=75?B.orange:B.red}}>{l.aiAction}</span>
                      </div>
                      <div style={{background:"#e2e8f0",borderRadius:3,height:5}}><div style={{height:5,borderRadius:3,background:l.qualityScore>=90?B.green:l.qualityScore>=75?B.orange:B.red,width:`${l.qualityScore}%`}}/></div>
                    </div>
                    <span style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:l.qualityScore>=90?B.green:l.qualityScore>=75?B.orange:B.red,minWidth:28}}>{l.qualityScore}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.purple,marginBottom:4}}>⚡ Formation AI Insights</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI optimises formation protocol per batch chemistry</div>
                {[
                  {label:"Capacity Prediction",value:"48.6 Ah",note:"AI forecast: 0.4% above nominal — Grade A+ likely",color:B.blue,icon:"🔋"},
                  {label:"SEI Layer Quality",value:"Excellent",note:"Impedance growth rate 1.2 mOhm per cycle — within optimal range",color:B.green,icon:"🧬"},
                  {label:"Temperature Control",value:"31.4°C avg",note:"Uniform cell temp plus or minus 0.8C — no thermal hotspots detected",color:B.orange,icon:"🌡"},
                  {label:"Time Optimisation",value:"-18 min",note:"AI shortened Cycle 2 by 18 min — capacity target met early",color:B.purple,icon:"⏱"},
                ].map((f,i)=>(
                  <div key={i} style={{background:`${f.color}06`,border:`1px solid ${f.color}20`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{f.icon}</span>
                        <div><div style={{fontSize:12,fontWeight:700,color:B.text}}>{f.label}</div><div style={{fontSize:11,color:B.sub,marginTop:2}}>{f.note}</div></div>
                      </div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:f.color,whiteSpace:"nowrap",marginLeft:10}}>{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="g2">
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.red,marginBottom:4}}>⚠️ Root Cause Analysis — EL-C2 Warning</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI identified primary and contributing causes for cathode line defect rate elevation</div>
                {[
                  {cause:"Primary — NMP Solvent Viscosity",detail:"Viscosity drifted 8% above spec at 14:32. Slurry temperature drop of 2.3°C detected — likely batch changeover issue.",confidence:91,action:"Increase slurry heating to 45°C and wait 15 min before resuming.",color:B.red},
                  {cause:"Secondary — Slot Die Pressure",detail:"Coating head pressure 3.2 bar vs 3.0 bar nominal. Contributing to edge thickness variation.",confidence:74,action:"Reduce slot die pressure by 0.2 bar — auto-correcting.",color:B.orange},
                  {cause:"Contributing — Substrate Tension",detail:"Web tension 8% below setpoint on roll changeover. Minor streaking at seams.",confidence:58,action:"Monitor tension — within acceptance range for now.",color:B.yellow},
                ].map((r,i)=>(
                  <div key={i} style={{background:`${r.color}06`,border:`1px solid ${r.color}25`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6,marginBottom:6}}>
                      <div style={{fontSize:12,fontWeight:700,color:r.color}}>{r.cause}</div>
                      <span style={{background:`${r.color}15`,color:r.color,borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{r.confidence}% confidence</span>
                    </div>
                    <div style={{fontSize:11,color:B.sub,lineHeight:1.5,marginBottom:6}}>{r.detail}</div>
                    <div style={{fontSize:11,fontWeight:600,color:B.text}}>✅ {r.action}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.green,marginBottom:4}}>💰 AI Value Delivered — This Month</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Quantified business impact from AriLinc Battery Intelligence</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  {[
                    {icon:"🔋",label:"Cells Saved from Reject",value:"1,240",color:B.blue},
                    {icon:"⏱",label:"Formation Time Saved",value:"186 hrs",color:B.purple},
                    {icon:"💰",label:"Cost Saving",value:"₹28.4L",color:B.green},
                    {icon:"📈",label:"Yield Improvement",value:"+2.3%",color:B.orange},
                  ].map((s,i)=>(
                    <div key={i} style={{background:`${s.color}08`,border:`1px solid ${s.color}25`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                      <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                      <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
                      <div style={{fontSize:10,color:B.sub,marginTop:3}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",fontSize:12}}>
                  <strong style={{color:B.green}}>Annual projection: </strong><span style={{color:B.text}}>₹3.4 Cr cost saving · 98.7% Grade A yield target achievable · 6-month payback</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {section==="analytics" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>📊 Production Analytics — 30 Day Trend</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Yield · Defect rates · Capacity distribution · Formation efficiency</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"✅",label:"Avg Grade A Yield",value:"93.4%",sub:"↑ 1.8% vs last month",color:B.green},
                {icon:"🔋",label:"Avg Capacity",value:"48.18 Ah",sub:"↑ 0.3% vs nominal",color:B.blue},
                {icon:"⏱",label:"Avg Formation Time",value:"16.8 hrs",sub:"↓ 1.2 hrs with AI",color:B.purple},
                {icon:"❌",label:"Avg Reject Rate",value:"2.1%",sub:"↓ 0.6% vs baseline",color:B.orange},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:20,marginBottom:5}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              {/* Yield trend */}
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>Grade Yield Trend (30 Days)</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Grade A improving with AI quality control — Grade B and rejects declining</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={YIELD_DATA} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} width={36} unit="%"/>
                    <Tooltip content={<CT/>}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <ReferenceLine y={92} stroke={B.blue} strokeDasharray="4 3" label={{value:"A Target",fill:B.blue,fontSize:9}}/>
                    <Line type="monotone" dataKey="gradeA" stroke={B.green} strokeWidth={2.5} dot={false} name="Grade A (%)"/>
                    <Line type="monotone" dataKey="gradeB" stroke={B.orange} strokeWidth={1.5} dot={false} name="Grade B (%)"/>
                    <Line type="monotone" dataKey="reject" stroke={B.red} strokeWidth={1.5} dot={false} name="Reject (%)" strokeDasharray="5 3"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Capacity distribution */}
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>Cell Capacity Distribution (Today)</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>Target: 48 Ah · sigma = 0.4 Ah · Grade A: 47–48.5 Ah · 1,847 cells tested</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={CAP_DATA} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="capacity" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={4} unit=" Ah"/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36}/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine x={48} stroke={B.blue} strokeDasharray="4 3" label={{value:"Nominal",fill:B.blue,fontSize:9}}/>
                    <ReferenceLine x={47} stroke={B.orange} strokeDasharray="4 3" label={{value:"Grade B",fill:B.orange,fontSize:9}}/>
                    <Bar dataKey="count" fill={B.purple} radius={[2,2,0,0]} name="Cell Count"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── CELL GRADING ── */}
        {section==="grading" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>🏆 Cell Grading & Classification</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>AI-automated grading · Capacity · Self-discharge · Internal resistance · Voltage</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {grade:"A+",count:219,pct:"11.9%",color:B.blue},
                {grade:"A", count:1520,pct:"82.3%",color:B.green},
                {grade:"B", count:77, pct:"4.2%", color:B.orange},
                {grade:"C/Reject",count:31,pct:"1.7%",color:B.red},
              ].map((g,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${g.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${g.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)",textAlign:"center"}}>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:32,fontWeight:800,color:g.color,marginBottom:4}}>Grade {g.grade}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:B.text}}>{g.count}</div>
                  <div style={{fontSize:13,color:g.color,fontWeight:700,marginTop:2}}>{g.pct}</div>
                </div>
              ))}
            </div>

            {/* Grading criteria */}
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>Grade Classification Criteria</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
                  <thead><tr style={{background:"#f8fafc"}}>{["Grade","Capacity","Self-Discharge","Internal Resistance","Voltage at EOC","Batch Yield","Action"].map(h=>(<th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#475569",fontWeight:700,borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
                  <tbody>{GRADE_CRITERIA.map((g,i)=>(
                    <tr key={g.grade} style={{borderBottom:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"9px 12px"}}><span style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:g.color}}>Grade {g.grade}</span></td>
                      <td style={{padding:"9px 12px",color:B.text,fontWeight:600}}>{g.capacity}</td>
                      <td style={{padding:"9px 12px",color:B.sub}}>{g.selfDischarge}</td>
                      <td style={{padding:"9px 12px",color:B.sub}}>{g.ir}</td>
                      <td style={{padding:"9px 12px",color:B.sub}}>{g.voltage}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:g.color}}>{g.yield}</td>
                      <td style={{padding:"9px 12px",fontSize:11,color:g.grade==="A+"||g.grade==="A"?B.green:g.grade==="B"?B.orange:B.red,fontWeight:600}}>{g.grade==="A+"?"Premium customer pack":g.grade==="A"?"Standard EV pack":g.grade==="B"?"ESS / energy storage":"Discard / recycle"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            {/* AI grading pipeline */}
            <div className="card">
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>AI Grading Pipeline — How AriLinc Grades Each Cell</div>
              <div className="g5">
                {[
                  {icon:"⚡",step:"1. Formation",desc:"4-cycle electrochemical characterisation · Capacity, efficiency, dQ/dV",color:B.blue},
                  {icon:"🔬",step:"2. EOL Testing",desc:"Capacity, DCIR, OCV, self-discharge at 25°C and 45°C",color:B.purple},
                  {icon:"🧠",step:"3. AI Scoring",desc:"ML model trained on 2.4M cells · Predicts 10-year calendar life",color:B.orange},
                  {icon:"🏆",step:"4. Grade Assign",desc:"A+/A/B/C assigned based on 12 parameters simultaneously",color:B.green},
                  {icon:"📦",step:"5. Pack Match",desc:"Cell matching for balance within pack — dCap under 0.5%, dIR under 0.2mOhm",color:B.teal},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#fff",border:`2px solid ${s.color}25`,borderRadius:10,padding:"14px",borderTop:`3px solid ${s.color}`,position:"relative"}}>
                    {i < 4 && <div style={{position:"absolute",right:-14,top:"38%",fontSize:12,color:B.border,zIndex:1}}>{" >"}</div>}
                    <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:12,fontWeight:800,color:s.color,marginBottom:5}}>{s.step}</div>
                    <div style={{fontSize:11,color:B.sub,lineHeight:1.5,background:B.grey,borderRadius:5,padding:"6px 8px"}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fw">
        <div style={{fontSize:12,color:B.light}}>
          <span style={{color:B.green,animation:"pulse 2s infinite"}}>●</span> AriLinc Battery Manufacturing Intelligence · NMC · LFP · NCA · Powered by AriPrus
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <a href="mailto:info@ariprus.com" style={{fontSize:12,color:B.sub,textDecoration:"none"}}>✉ info@ariprus.com</a>
          <a href="https://arilinc.ariprus.com" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:B.blue,fontWeight:700,textDecoration:"none"}}>Explore AriLinc Platform →</a>
        </div>
      </div>
    </div>
  );
}
