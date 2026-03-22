import { useState, useMemo, useRef, useEffect } from "react";
// FIX #2: Removed unused BarChart, Area, AreaChart imports
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const BRAND = {
  blue: "#1d4ed8",
  cyan: "#06b6d4",
  green: "#059669",
  purple: "#7c3aed",
  orange: "#d97706",
  red: "#dc2626",
  grey: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  sub: "#64748b",
  light: "#94a3b8",
};

const INDUSTRIES = [
  "Food & Beverage",
  "Pharmaceuticals",
  "Oil & Gas",
  "Chemicals",
  "Automotive",
  "Steel & Metals",
  "Cement",
  "Paper & Pulp",
  "Water Treatment",
  "Other",
];
const PLANT_SIZES = [
  "Small (< 50 assets)",
  "Medium (50–200 assets)",
  "Large (200–500 assets)",
  "Enterprise (500+ assets)",
];

// ── MAINTENANCE AGENT DATA ──────────────────────────────────────
const MAINT_ASSETS = [
  {
    id: "P-101",
    name: "Centrifugal Pump",
    location: "Line A",
    failure: "Bearing Wear (Gradual)",
    color: BRAND.blue,
    sensors: ["vibration", "temperature", "pressure"],
    thresholds: {
      vibration: { warn: 3.5, crit: 5.0 },
      temperature: { warn: 82, crit: 92 },
      pressure: { warn: 3.2, crit: 2.8 },
    },
    units: { vibration: "mm/s", temperature: "°C", pressure: "bar" },
    failureStart: 480,
    failureCrit: 600,
    agentData: {
      anomalyScore: 0.94,
      confidence: 94,
      historicalMatches: 847,
      rootCause:
        "Inner race bearing degradation — vibration pattern matches 94% of past bearing failures across 847 historical records",
      recommendations: [
        {
          priority: "CRITICAL",
          action: "Schedule immediate bearing replacement within 12 hours",
          saving: 420000,
          urgency: "< 12 hrs",
          confidence: 94,
          icon: "🔴",
        },
        {
          priority: "HIGH",
          action: "Reduce pump load by 15% to extend RUL by ~8 days",
          saving: 180000,
          urgency: "< 24 hrs",
          confidence: 88,
          icon: "🟠",
        },
        {
          priority: "HIGH",
          action: "Alert maintenance team and order spare bearing kit",
          saving: 95000,
          urgency: "< 6 hrs",
          confidence: 97,
          icon: "🟠",
        },
        {
          priority: "MEDIUM",
          action: "Increase vibration monitoring frequency to every 15 min",
          saving: 40000,
          urgency: "< 2 hrs",
          confidence: 91,
          icon: "🟡",
        },
      ],
    },
  },
  {
    id: "C-204",
    name: "Compressor Unit",
    location: "Line B",
    failure: "Surge Event (Sudden)",
    color: BRAND.purple,
    sensors: ["vibration", "temperature", "pressure"],
    thresholds: {
      vibration: { warn: 4.0, crit: 6.5 },
      temperature: { warn: 88, crit: 98 },
      pressure: { warn: 7.5, crit: 6.8 },
    },
    units: { vibration: "mm/s", temperature: "°C", pressure: "bar" },
    failureStart: 504,
    failureCrit: 648,
    agentData: {
      anomalyScore: 0.71,
      confidence: 71,
      historicalMatches: 312,
      rootCause:
        "Surge precursor pattern detected — pressure fluctuation combined with vibration spikes matches 71% of compressor surge events",
      recommendations: [
        {
          priority: "HIGH",
          action: "Inspect inlet guide vanes and anti-surge valve",
          saving: 180000,
          urgency: "< 48 hrs",
          confidence: 71,
          icon: "🟠",
        },
        {
          priority: "HIGH",
          action: "Verify operating point is within stable surge envelope",
          saving: 120000,
          urgency: "< 24 hrs",
          confidence: 78,
          icon: "🟠",
        },
        {
          priority: "MEDIUM",
          action: "Review process flow conditions and adjust setpoints",
          saving: 60000,
          urgency: "< 72 hrs",
          confidence: 65,
          icon: "🟡",
        },
      ],
    },
  },
  {
    id: "M-312",
    name: "Drive Motor",
    location: "Line C",
    failure: "Overheating (Thermal Drift)",
    color: BRAND.green,
    sensors: ["vibration", "temperature", "current"],
    thresholds: {
      vibration: { warn: 2.8, crit: 4.5 },
      temperature: { warn: 90, crit: 105 },
      current: { warn: 48, crit: 55 },
    },
    units: { vibration: "mm/s", temperature: "°C", current: "A" },
    failureStart: 360,
    failureCrit: 576,
    agentData: {
      anomalyScore: 0.55,
      confidence: 55,
      historicalMatches: 198,
      rootCause:
        "Thermal drift pattern — gradual temperature rise with increased current draw suggests insulation degradation or cooling system blockage",
      recommendations: [
        {
          priority: "MEDIUM",
          action: "Inspect cooling system and clean air vents",
          saving: 95000,
          urgency: "< 5 days",
          confidence: 55,
          icon: "🟡",
        },
        {
          priority: "MEDIUM",
          action: "Check motor insulation resistance (Megger test)",
          saving: 60000,
          urgency: "< 3 days",
          confidence: 62,
          icon: "🟡",
        },
        {
          priority: "LOW",
          action: "Schedule thermal imaging scan at next maintenance window",
          saving: 30000,
          urgency: "< 2 weeks",
          confidence: 48,
          icon: "🟢",
        },
      ],
    },
  },
];

// ── ENERGY AGENT DATA ───────────────────────────────────────────
const ENERGY_ASSETS = [
  {
    id: "EL-01",
    name: "Production Line 1",
    location: "Zone A",
    type: "High Consumption",
    color: BRAND.orange,
    agentData: {
      anomalyScore: 0.87,
      confidence: 87,
      historicalMatches: 623,
      rootCause:
        "Line 1 consuming 34% above baseline during off-peak hours — motors running at idle, compressed air leaks detected, and inefficient heat recovery contributing to ₹2.1L monthly excess cost",
      kpis: {
        consumption: "48,200 kWh",
        cost: "₹14.5L/mo",
        efficiency: "64%",
        peakDemand: "210 kW",
      },
      recommendations: [
        {
          priority: "HIGH",
          action: "Implement auto-shutdown for idle motors during shift breaks",
          saving: 840000,
          urgency: "< 48 hrs",
          confidence: 87,
          icon: "🟠",
        },
        {
          priority: "HIGH",
          action: "Fix compressed air leak on conveyor section C3",
          saving: 420000,
          urgency: "< 24 hrs",
          confidence: 92,
          icon: "🟠",
        },
        {
          priority: "MEDIUM",
          action:
            "Optimise heat recovery exchanger settings for 12% efficiency gain",
          saving: 310000,
          urgency: "< 1 week",
          confidence: 79,
          icon: "🟡",
        },
        {
          priority: "MEDIUM",
          action:
            "Shift 3 non-critical loads to off-peak tariff window (11pm–6am)",
          saving: 260000,
          urgency: "< 3 days",
          confidence: 83,
          icon: "🟡",
        },
      ],
    },
  },
  {
    id: "EL-02",
    name: "Production Line 2",
    location: "Zone B",
    type: "Moderate Consumption",
    color: BRAND.cyan,
    agentData: {
      anomalyScore: 0.62,
      confidence: 62,
      historicalMatches: 341,
      rootCause:
        "Power factor degrading to 0.74 — below optimal 0.95 threshold. Ageing capacitor banks causing reactive power draw penalty of ₹0.8L/month from utility",
      kpis: {
        consumption: "31,800 kWh",
        cost: "₹9.6L/mo",
        efficiency: "78%",
        peakDemand: "145 kW",
      },
      recommendations: [
        {
          priority: "HIGH",
          action:
            "Replace capacitor bank on Panel B-2 to restore power factor to 0.95+",
          saving: 320000,
          urgency: "< 1 week",
          confidence: 88,
          icon: "🟠",
        },
        {
          priority: "MEDIUM",
          action:
            "Install energy sub-metering on 4 sub-circuits for granular monitoring",
          saving: 180000,
          urgency: "< 2 weeks",
          confidence: 71,
          icon: "🟡",
        },
        {
          priority: "LOW",
          action:
            "Upgrade 6 legacy fluorescent fixtures to LED in production area",
          saving: 95000,
          urgency: "< 1 month",
          confidence: 95,
          icon: "🟢",
        },
      ],
    },
  },
  {
    id: "EL-03",
    name: "Utilities Block",
    location: "Zone C",
    type: "Peak Demand",
    color: BRAND.green,
    agentData: {
      anomalyScore: 0.45,
      confidence: 45,
      historicalMatches: 189,
      rootCause:
        "Peak demand spikes of 280 kW detected on 8 occasions last month — primary driver is simultaneous HVAC startup at shift change. Demand charge penalty averaging ₹1.2L/month",
      kpis: {
        consumption: "18,400 kWh",
        cost: "₹5.5L/mo",
        efficiency: "82%",
        peakDemand: "280 kW",
      },
      recommendations: [
        {
          priority: "MEDIUM",
          action:
            "Stagger HVAC startup by 15-min intervals to reduce peak demand by 40 kW",
          saving: 480000,
          urgency: "< 1 week",
          confidence: 82,
          icon: "🟡",
        },
        {
          priority: "LOW",
          action:
            "Install demand controller to cap peak at 220 kW automatically",
          saving: 360000,
          urgency: "< 1 month",
          confidence: 74,
          icon: "🟢",
        },
        {
          priority: "LOW",
          action: "Evaluate battery storage (50 kWh) for peak shaving ROI",
          saving: 240000,
          urgency: "< 3 months",
          confidence: 61,
          icon: "🟢",
        },
      ],
    },
  },
];

// ── QUALITY AGENT DATA ──────────────────────────────────────────
const QUALITY_ASSETS = [
  {
    id: "QP-01",
    name: "Filling Line A",
    location: "Unit 1",
    type: "Defect Risk: High",
    color: BRAND.red,
    agentData: {
      anomalyScore: 0.91,
      confidence: 91,
      historicalMatches: 534,
      rootCause:
        "Fill weight drift detected — mean shifting +2.3% above nominal over last 48 batches. Temperature variance in sealing zone (±8°C vs ±2°C spec) causing 3.2% seal failure rate and batch rejection risk",
      kpis: {
        defectRate: "3.2%",
        batchScore: "61/100",
        driftIndex: "High",
        oosAlerts: 7,
      },
      recommendations: [
        {
          priority: "CRITICAL",
          action:
            "Recalibrate fill nozzle #3 and #7 — showing 4.1% overfill deviation",
          saving: 680000,
          urgency: "< 4 hrs",
          confidence: 91,
          icon: "🔴",
        },
        {
          priority: "HIGH",
          action:
            "Reduce sealing zone temperature variance — tighten PID control loop",
          saving: 420000,
          urgency: "< 8 hrs",
          confidence: 87,
          icon: "🟠",
        },
        {
          priority: "HIGH",
          action:
            "Hold current batch BT-2847 for 100% inspection before dispatch",
          saving: 380000,
          urgency: "Immediate",
          confidence: 93,
          icon: "🟠",
        },
        {
          priority: "MEDIUM",
          action:
            "Increase SPC sampling frequency from every 30 to every 10 mins",
          saving: 210000,
          urgency: "< 2 hrs",
          confidence: 85,
          icon: "🟡",
        },
      ],
    },
  },
  {
    id: "QP-02",
    name: "Mixing Station B",
    location: "Unit 2",
    type: "Process Drift: Medium",
    color: BRAND.orange,
    agentData: {
      anomalyScore: 0.68,
      confidence: 68,
      historicalMatches: 298,
      rootCause:
        "Viscosity drifting upward over 6-hour cycle — likely raw material batch variation from Supplier 2. pH readings showing ±0.4 variance against ±0.1 spec. 2 out-of-spec batches in last 24 hours",
      kpis: {
        defectRate: "1.8%",
        batchScore: "74/100",
        driftIndex: "Medium",
        oosAlerts: 3,
      },
      recommendations: [
        {
          priority: "HIGH",
          action:
            "Adjust mixing RPM from 180 to 165 to compensate viscosity drift",
          saving: 290000,
          urgency: "< 2 hrs",
          confidence: 74,
          icon: "🟠",
        },
        {
          priority: "MEDIUM",
          action:
            "Quarantine Supplier 2 raw material lot and run incoming QC test",
          saving: 240000,
          urgency: "< 4 hrs",
          confidence: 81,
          icon: "🟡",
        },
        {
          priority: "MEDIUM",
          action:
            "Recalibrate pH probe — last calibration was 18 days ago (spec: 14 days)",
          saving: 160000,
          urgency: "< 6 hrs",
          confidence: 88,
          icon: "🟡",
        },
      ],
    },
  },
  {
    id: "QP-03",
    name: "Packaging Unit C",
    location: "Unit 3",
    type: "Batch Score: Good",
    color: BRAND.green,
    agentData: {
      anomalyScore: 0.32,
      confidence: 32,
      historicalMatches: 142,
      rootCause:
        "Minor label placement drift detected — 0.8mm average offset trending over last 200 units. Within spec currently but trajectory suggests OOS condition within ~4 hours at current rate",
      kpis: {
        defectRate: "0.4%",
        batchScore: "88/100",
        driftIndex: "Low",
        oosAlerts: 1,
      },
      recommendations: [
        {
          priority: "MEDIUM",
          action:
            "Adjust label applicator guide rail by 0.8mm — preventive correction",
          saving: 120000,
          urgency: "< 4 hrs",
          confidence: 76,
          icon: "🟡",
        },
        {
          priority: "LOW",
          action: "Schedule applicator head cleaning at next planned break",
          saving: 60000,
          urgency: "< 8 hrs",
          confidence: 82,
          icon: "🟢",
        },
        {
          priority: "LOW",
          action:
            "Review camera inspection sensitivity threshold — may need recalibration",
          saving: 40000,
          urgency: "< 1 day",
          confidence: 58,
          icon: "🟢",
        },
      ],
    },
  },
];

const PIPELINE_STEPS = {
  maintenance: [
    { id: "observe", label: "Observe", icon: "👁", color: BRAND.blue },
    { id: "detect", label: "Detect", icon: "🔍", color: BRAND.purple },
    { id: "reason", label: "Reason", icon: "🧠", color: BRAND.orange },
    { id: "recommend", label: "Recommend", icon: "📋", color: BRAND.green },
    { id: "act", label: "Act", icon: "⚡", color: BRAND.red },
  ],
  energy: [
    { id: "meter", label: "Meter", icon: "📊", color: BRAND.orange },
    { id: "baseline", label: "Baseline", icon: "📉", color: BRAND.cyan },
    { id: "detect", label: "Detect", icon: "🔍", color: BRAND.purple },
    { id: "optimise", label: "Optimise", icon: "⚙️", color: BRAND.green },
    { id: "save", label: "Save", icon: "💰", color: BRAND.blue },
  ],
  quality: [
    { id: "inspect", label: "Inspect", icon: "🔬", color: BRAND.red },
    { id: "drift", label: "Drift", icon: "📈", color: BRAND.orange },
    { id: "root", label: "Root Cause", icon: "🧠", color: BRAND.purple },
    { id: "correct", label: "Correct", icon: "✅", color: BRAND.green },
    { id: "prevent", label: "Prevent", icon: "🛡", color: BRAND.blue },
  ],
};

const PIPELINE_DESC = {
  maintenance: {
    observe:
      "Real-time sensor ingestion · 720hrs history · Multi-sensor fusion · Pre-screening",
    detect:
      "ML anomaly scoring 0–1 · Confidence calibration · Pattern fingerprinting",
    reason:
      "847+ historical matches · Root cause inference · Failure mode mapping · RUL estimation",
    recommend:
      "Priority ranked actions · Urgency windows · Step-by-step maintenance guidance",
    act: "Cost saving estimates · Downtime prevention · ROI calculation · Business impact",
  },
  energy: {
    meter:
      "Real-time kWh metering · Power factor monitoring · Demand tracking · Sub-circuit analysis",
    baseline:
      "30-day rolling baseline · Shift-pattern normalisation · Weather correction · Benchmark vs industry",
    detect:
      "Consumption anomaly scoring · Peak demand alerts · Efficiency degradation · Tariff optimisation signals",
    optimise:
      "Load scheduling · Motor efficiency tuning · Compressed air leak detection · Heat recovery",
    save: "Cost saving quantification · Carbon reduction · Demand charge avoidance · ROI reporting",
  },
  quality: {
    inspect:
      "In-line sensor fusion · Vision system data · SPC chart monitoring · Batch parameter ingestion",
    drift:
      "Process drift detection · Mean shift analysis · Variance trending · OOS prediction",
    root: "Multi-variate root cause · Supplier traceability · Equipment correlation · Historical batch matching",
    correct:
      "Corrective action generation · Parameter adjustment · Batch disposition · Operator alert",
    prevent:
      "SPC limit optimisation · Preventive schedule · Supplier quality scoring · Yield improvement",
  },
};

const pColor = {
  CRITICAL: BRAND.red,
  HIGH: "#f97316",
  MEDIUM: BRAND.orange,
  LOW: BRAND.green,
};
const pBg = {
  CRITICAL: "#fff5f5",
  HIGH: "#fff7ed",
  MEDIUM: "#fffbeb",
  LOW: "#f0fdf4",
};

function generateMaintData(asset) {
  const d = [];
  for (let h = 0; h < 720; h++) {
    let row = { hour: h, label: `D${Math.floor(h / 24) + 1}` };
    if (asset.id === "P-101") {
      const w =
        h >= asset.failureStart
          ? Math.pow((h - asset.failureStart) / 240, 1.6) * 4
          : 0;
      row.vibration = +(
        2.0 +
        Math.sin(h * 0.25) * 0.3 +
        w +
        Math.random() * 0.25
      ).toFixed(2);
      row.temperature = +(
        72 +
        Math.cos(h * 0.18) * 2.5 +
        w * 3.5 +
        Math.random() * 1.2
      ).toFixed(1);
    } else if (asset.id === "C-204") {
      const s =
        h >= asset.failureStart && h <= asset.failureStart + 18
          ? Math.sin(((h - asset.failureStart) / 18) * Math.PI) * 5
          : 0;
      row.vibration = +(
        2.8 +
        Math.sin(h * 0.3) * 0.4 +
        s +
        Math.random() * 0.3
      ).toFixed(2);
      row.temperature = +(
        78 +
        Math.sin(h * 0.2) * 3 +
        s * 2.2 +
        Math.random() * 1.5
      ).toFixed(1);
    } else {
      const drift =
        h >= asset.failureStart ? ((h - asset.failureStart) / 360) * 22 : 0;
      row.vibration = +(
        1.8 +
        Math.sin(h * 0.22) * 0.3 +
        drift * 0.04 +
        Math.random() * 0.2
      ).toFixed(2);
      row.temperature = +(
        75 +
        drift +
        Math.sin(h * 0.1) * 2 +
        Math.random() * 1.8
      ).toFixed(1);
    }
    let score = 100;
    asset.sensors.forEach((s) => {
      const val = row[s] || 0;
      const { warn, crit } = asset.thresholds[s];
      if (s === "pressure") {
        if (val < crit) score -= 35;
        else if (val < warn) score -= 15;
      } else {
        if (val >= crit) score -= 35;
        else if (val >= warn) score -= 15;
      }
    });
    row.health = Math.max(0, Math.min(100, score));
    d.push(row);
  }
  return d;
}

function generateEnergyData(asset) {
  const d = [];
  const base = asset.id === "EL-01" ? 1800 : asset.id === "EL-02" ? 1200 : 700;
  for (let h = 0; h < 720; h++) {
    const isOffPeak = h % 24 < 6 || h % 24 > 22;
    const shift = h % 24 >= 8 && h % 24 <= 17;
    const waste = asset.id === "EL-01" ? (isOffPeak ? 0.34 : 0.08) : 0.05;
    d.push({
      hour: h,
      label: `D${Math.floor(h / 24) + 1}`,
      consumption: +(
        base * (shift ? 1.2 : 0.7) * (1 + waste) +
        Math.random() * 50
      ).toFixed(0),
      cost: +(
        base * (shift ? 1.2 : 0.7) * (1 + waste) * 0.3 +
        Math.random() * 15
      ).toFixed(0),
      efficiency: +(100 - waste * 100 - Math.random() * 5).toFixed(1),
    });
  }
  return d;
}

function generateQualityData(asset) {
  const d = [];
  const baseDefect =
    asset.id === "QP-01" ? 2.8 : asset.id === "QP-02" ? 1.4 : 0.3;
  for (let b = 0; b < 100; b++) {
    const drift = b > 60 ? (b - 60) * 0.04 : 0;
    d.push({
      batch: `B${b + 1}`,
      batchNum: b,
      defectRate: +(baseDefect + drift + Math.random() * 0.6).toFixed(2),
      batchScore: Math.max(
        0,
        Math.min(100, Math.round(95 - drift * 8 - Math.random() * 8))
      ),
      deviation: +(drift + Math.random() * 0.5).toFixed(2),
    });
  }
  return d;
}

// ── Sign-in Screen ──────────────────────────────────────────────
function SignUpScreen({ onSubmit }) {
  const [form, setForm] = useState({ name: "", company: "", email: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.company.trim()) e.company = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitting(true);
    try {
      await fetch("https://formspree.io/f/xqeywrry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          _subject: `AriLinc Platform Sign-in: ${form.name} — ${form.company}`,
        }),
      });
    } catch (_) {}
    onSubmit(form);
  };

  const inputStyle = (key) => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    fontSize: 14,
    border: `1.5px solid ${errors[key] ? "#fca5a5" : "rgba(255,255,255,0.25)"}`,
    outline: "none",
    fontFamily: "Inter,sans-serif",
    color: "##f8fafc",
    background: "#fff",
    marginTop: 5,
  });
  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.3,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "Inter,sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @media(max-width:500px){.fc{padding:24px 18px!important;}}
        .launch-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,0.2);}
      `}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo block */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <div
            style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 4,
            }}
          >
            AriLinc
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Agentic AI Platform · by AriPrus
          </div>
        </div>

        {/* Card */}
        <div
          className="fc"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            borderRadius: 20,
            padding: "32px 32px",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            Sign In
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            Maintenance · Energy · Quality Agents
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="name" style={labelStyle}>
                Full Name *
              </label>
              <input
                id="name"
                style={inputStyle("name")}
                value={form.name}
                onChange={set("name")}
              />
              {errors.name && (
                <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>
                  {errors.name}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="company" style={labelStyle}>
                Company *
              </label>
              <input
                id="company"
                style={inputStyle("company")}
                value={form.company}
                onChange={set("company")}
              />
              {errors.company && (
                <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>
                  {errors.company}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="email" style={labelStyle}>
                Work Email *
              </label>
              <input
                id="email"
                type="email"
                style={inputStyle("email")}
                value={form.email}
                onChange={set("email")}
              />
              {errors.email && (
                <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>
                  {errors.email}
                </div>
              )}
            </div>
          </div>

          <button
            className="launch-btn"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 28,
              padding: "14px",
              background: submitting ? "rgba(255,255,255,0.15)" : "#fff",
              color: submitting ? "rgba(255,255,255,0.4)" : "#1d4ed8",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "Inter,sans-serif",
              transition: "all 0.2s",
              letterSpacing: 0.2,
            }}
          >
            {submitting ? "⏳ Launching..." : "🚀 Launch Platform"}
          </button>

          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              marginTop: 16,
            }}
          >
            🔒 Secure access ·{" "}
            <a
              href="mailto:info@ariprus.com"
              style={{
                color: "rgba(255,255,255,0.6)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              info@ariprus.com
            </a>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          © 2026 AriPrus ·{" "}
          <a
            href="https://ariprus.com"
            style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
          >
            ariprus.com
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Agent Card Component ────────────────────────────────────────
function AgentCard({
  asset,
  state,
  step,
  msgs,
  chartData,
  chartKey,
  chartColor,
  thresholdY,
  onRun,
  onReset,
  onViewActions,
  kpiItems,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `2px solid ${state === "done" ? asset.color : BRAND.border}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "border-color 0.3s",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `3px solid ${asset.color}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 16,
              fontWeight: 800,
              color: BRAND.text,
            }}
          >
            {asset.id} · {asset.name}
          </div>
          <div style={{ fontSize: 11, color: BRAND.sub }}>
            {asset.location} · {asset.type || asset.failure}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color:
                asset.agentData.anomalyScore > 0.8
                  ? BRAND.red
                  : asset.agentData.anomalyScore > 0.6
                  ? BRAND.orange
                  : BRAND.green,
            }}
          >
            {(asset.agentData.anomalyScore * 100).toFixed(0)}
          </div>
          <div style={{ fontSize: 10, color: BRAND.light }}>Anomaly Score</div>
        </div>
      </div>

      <div style={{ padding: "10px 12px 0", background: "#fafafa" }}>
        <ResponsiveContainer width="100%" height={60}>
          <LineChart
            data={chartData}
            margin={{ top: 2, right: 4, bottom: 2, left: 0 }}
          >
            <Line
              type="monotone"
              dataKey={chartKey}
              stroke={chartColor || asset.color}
              strokeWidth={1.5}
              dot={false}
            />
            {thresholdY && (
              <ReferenceLine
                y={thresholdY}
                stroke={BRAND.red}
                strokeDasharray="3 2"
                strokeWidth={1}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          padding: "10px 18px",
          borderTop: `1px solid ${BRAND.border}`,
          borderBottom: `1px solid ${BRAND.border}`,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {kpiItems.map((k, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 70,
              background: BRAND.grey,
              borderRadius: 8,
              padding: "6px 8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 9, color: BRAND.light }}>{k.label}</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "Inter,sans-serif",
                color: k.color || asset.color,
                marginTop: 1,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
          {PIPELINE_STEPS[asset._agentType || "maintenance"].map((ps, i) => (
            <div key={ps.id} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  width: "100%",
                  height: 4,
                  borderRadius: 2,
                  background:
                    i <= step && state !== "idle" ? ps.color : BRAND.border,
                  transition: "background 0.4s",
                  marginBottom: 3,
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: i <= step && state !== "idle" ? ps.color : BRAND.light,
                  fontWeight: 600,
                }}
              >
                {ps.icon} {ps.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ minHeight: 56, marginBottom: 10 }}>
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                background: "#f1f5f9",
                borderRadius: 6,
                marginBottom: 5,
                borderLeft: `3px solid ${asset.color}`,
                color: i === msgs.length - 1 ? BRAND.text : "#94a3b8",
                lineHeight: 1.5,
              }}
            >
              {m}
            </div>
          ))}
          {state === "running" && (
            <div
              style={{
                fontSize: 12,
                color: BRAND.light,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ animation: "pulse 1.5s infinite" }}>●</span> Agent
              processing...
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {state !== "running" && (
            <button
              onClick={onRun}
              style={{
                flex: 1,
                padding: "9px",
                background:
                  state === "done"
                    ? BRAND.grey
                    : `linear-gradient(135deg,${asset.color},${asset.color}dd)`,
                color: state === "done" ? BRAND.sub : "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter,sans-serif",
              }}
            >
              {state === "done" ? "▶ Re-run Agent" : "▶ Run Agent"}
            </button>
          )}
          {state === "done" && (
            <button
              onClick={onViewActions}
              style={{
                flex: 1,
                padding: "9px",
                background: asset.color,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter,sans-serif",
              }}
            >
              📋 View Actions
            </button>
          )}
          {state !== "idle" && (
            <button
              onClick={onReset}
              style={{
                padding: "9px 12px",
                background: BRAND.grey,
                color: BRAND.sub,
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────
export default function AriLincAgentDemo() {
  const [user, setUser] = useState(null);
  const [agentType, setAgentType] = useState("maintenance");
  const [activeTab, setActiveTab] = useState("agent");
  const [agentStates, setAgentStates] = useState({});
  const [pipelineStep, setPipelineStep] = useState({});
  const [pipelineMsgs, setPipelineMsgs] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const intervalRef = useRef({});

  useEffect(() => {
    const refs = intervalRef.current;
    return () => Object.values(refs).forEach(clearInterval);
  }, []);

  const maintData = useMemo(() => {
    const m = {};
    MAINT_ASSETS.forEach((a) => {
      m[a.id] = generateMaintData(a);
    });
    return m;
  }, []);
  const energyData = useMemo(() => {
    const m = {};
    ENERGY_ASSETS.forEach((a) => {
      m[a.id] = generateEnergyData(a);
    });
    return m;
  }, []);
  const qualityData = useMemo(() => {
    const m = {};
    QUALITY_ASSETS.forEach((a) => {
      m[a.id] = generateQualityData(a);
    });
    return m;
  }, []);

  const currentAssets =
    agentType === "maintenance"
      ? MAINT_ASSETS
      : agentType === "energy"
      ? ENERGY_ASSETS
      : QUALITY_ASSETS;

  // FIX #1: Use asset._agentType from the passed asset, not outer agentType closure
  const buildMsgs = (asset) => {
    const type = asset._agentType || "maintenance";
    const total = asset.agentData.recommendations.reduce(
      (s, r) => s + r.saving,
      0
    );
    if (type === "maintenance")
      return [
        `👁  Ingesting ${asset.sensors?.length || 3} live sensor streams from ${
          asset.id
        } — 720 data points across 30 days`,
        `🔍  Anomaly score: ${asset.agentData.anomalyScore} · Confidence: ${asset.agentData.confidence}% · Failure pattern: ${asset.failure}`,
        `🧠  Cross-referenced ${
          asset.agentData.historicalMatches
        } historical cases · ${asset.agentData.rootCause.substring(0, 100)}...`,
        `📋  ${asset.agentData.recommendations.length} prioritised actions · Top: ${asset.agentData.recommendations[0].priority} · Act within ${asset.agentData.recommendations[0].urgency}`,
        `⚡  Total saving potential: ₹${(total / 100000).toFixed(
          1
        )}L · Priority action: ${asset.agentData.recommendations[0].action.substring(
          0,
          60
        )}...`,
      ];
    if (type === "energy")
      return [
        `📊  Ingesting real-time energy meters for ${asset.id} — consumption, power factor, demand data`,
        `📉  Baseline established · Current efficiency: ${asset.agentData.kpis.efficiency} · Anomaly score: ${asset.agentData.anomalyScore}`,
        `🔍  ${
          asset.agentData.historicalMatches
        } energy patterns matched · ${asset.agentData.rootCause.substring(
          0,
          100
        )}...`,
        `⚙️  ${
          asset.agentData.recommendations.length
        } optimisation actions generated · Top saving: ₹${(
          asset.agentData.recommendations[0].saving / 100000
        ).toFixed(1)}L`,
        `💰  Total monthly saving potential: ₹${(total / 100000).toFixed(
          1
        )}L · Carbon reduction opportunity identified`,
      ];
    return [
      `🔬  Ingesting SPC data, batch parameters and inspection results for ${asset.id}`,
      `📈  Drift index: ${asset.agentData.kpis.driftIndex} · Defect rate: ${asset.agentData.kpis.defectRate} · Batch score: ${asset.agentData.kpis.batchScore}/100`,
      `🧠  ${
        asset.agentData.historicalMatches
      } batch records analysed · ${asset.agentData.rootCause.substring(
        0,
        100
      )}...`,
      `✅  ${asset.agentData.recommendations.length} corrective actions generated · ${asset.agentData.kpis.oosAlerts} OOS alerts active`,
      `🛡  Estimated quality loss avoided: ₹${(total / 100000).toFixed(
        1
      )}L · Yield improvement pathway identified`,
    ];
  };

  const runAgent = (asset) => {
    const key = asset.id;
    if (agentStates[key] === "running") return;
    setAgentStates((p) => ({ ...p, [key]: "running" }));
    setPipelineStep((p) => ({ ...p, [key]: 0 }));
    setPipelineMsgs((p) => ({ ...p, [key]: [] }));
    const msgs = buildMsgs(asset);
    let step = 0;
    intervalRef.current[key] = setInterval(() => {
      setPipelineStep((p) => ({ ...p, [key]: step }));
      setPipelineMsgs((p) => ({
        ...p,
        [key]: [...(p[key] || []), msgs[step]],
      }));
      step++;
      if (step >= msgs.length) {
        clearInterval(intervalRef.current[key]);
        setAgentStates((p) => ({ ...p, [key]: "done" }));
      }
    }, 900);
  };

  const resetAgent = (id) => {
    clearInterval(intervalRef.current[id]);
    setAgentStates((p) => ({ ...p, [id]: "idle" }));
    setPipelineStep((p) => ({ ...p, [id]: -1 }));
    setPipelineMsgs((p) => ({ ...p, [id]: [] }));
  };

  const getChartProps = (asset) => {
    if (agentType === "maintenance") {
      const d = (maintData[asset.id] || []).filter((_, i) => i % 8 === 0);
      return {
        chartData: d,
        chartKey: "vibration",
        chartColor: asset.color,
        thresholdY: asset.thresholds?.vibration?.crit,
      };
    }
    if (agentType === "energy") {
      const d = (energyData[asset.id] || []).filter((_, i) => i % 8 === 0);
      return {
        chartData: d,
        chartKey: "consumption",
        chartColor: BRAND.orange,
        thresholdY: null,
      };
    }
    const d = (qualityData[asset.id] || []).filter((_, i) => i % 2 === 0);
    return {
      chartData: d,
      chartKey: "defectRate",
      chartColor: BRAND.red,
      thresholdY: 2.0,
    };
  };

  const getKpiItems = (asset) => {
    if (agentType === "maintenance")
      return [
        {
          label: "Anomaly Score",
          value: asset.agentData.anomalyScore,
          color:
            asset.agentData.anomalyScore > 0.8
              ? BRAND.red
              : asset.agentData.anomalyScore > 0.6
              ? BRAND.orange
              : BRAND.green,
        },
        {
          label: "Confidence",
          value: `${asset.agentData.confidence}%`,
          color: asset.color,
        },
        {
          label: "Est. Saving",
          value: `₹${(
            asset.agentData.recommendations.reduce((s, r) => s + r.saving, 0) /
            100000
          ).toFixed(1)}L`,
          color: BRAND.purple,
        },
      ];
    if (agentType === "energy")
      return [
        {
          label: "Consumption",
          value: asset.agentData.kpis.consumption,
          color: BRAND.orange,
        },
        // FIX #4: parseInt() to correctly compare efficiency string vs number
        {
          label: "Efficiency",
          value: asset.agentData.kpis.efficiency,
          color:
            parseInt(asset.agentData.kpis.efficiency) < 70
              ? BRAND.red
              : BRAND.green,
        },
        {
          label: "Est. Saving",
          value: `₹${(
            asset.agentData.recommendations.reduce((s, r) => s + r.saving, 0) /
            100000
          ).toFixed(1)}L`,
          color: BRAND.purple,
        },
      ];
    return [
      {
        label: "Defect Rate",
        value: asset.agentData.kpis.defectRate,
        color:
          parseFloat(asset.agentData.kpis.defectRate) > 2
            ? BRAND.red
            : BRAND.orange,
      },
      {
        label: "Batch Score",
        value: `${asset.agentData.kpis.batchScore}/100`,
        color:
          asset.agentData.kpis.batchScore > 80 ? BRAND.green : BRAND.orange,
      },
      {
        label: "OOS Alerts",
        value: asset.agentData.kpis.oosAlerts,
        color: asset.agentData.kpis.oosAlerts > 5 ? BRAND.red : BRAND.orange,
      },
    ];
  };

  // FIX #5: anyAgentRun scoped to current agent type's assets only
  const anyAgentRun = currentAssets.some(
    (a) => agentStates[a.id] === "done" || agentStates[a.id] === "running"
  );

  const agentTypeConfig = {
    maintenance: {
      icon: "🔧",
      label: "Maintenance",
      color: BRAND.blue,
      desc: "Predict failures · Reduce downtime · Optimise maintenance",
    },
    energy: {
      icon: "⚡",
      label: "Energy",
      color: BRAND.orange,
      desc: "Cut energy costs · Improve efficiency · Reduce carbon",
    },
    quality: {
      icon: "🎯",
      label: "Quality",
      color: BRAND.red,
      desc: "Detect defects · Fix process drift · Improve yield",
    },
  };

  if (!user) return <SignUpScreen onSubmit={setUser} />;

  return (
    <div
      style={{
        background: BRAND.grey,
        minHeight: "100vh",
        color: BRAND.text,
        fontFamily: "Inter,sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .nb{background:none;border:none;cursor:pointer;padding:8px 14px;border-radius:6px;font-size:13px;font-weight:600;color:${BRAND.sub};transition:all 0.2s;font-family:Inter,sans-serif;white-space:nowrap;}
        .nb:hover{background:${BRAND.border};color:${BRAND.text};}
        .na{background:#dbeafe!important;color:${BRAND.blue}!important;}
        .rc{border-radius:10px;padding:14px 16px;margin-bottom:10px;border-left:4px solid;transition:all 0.2s;}
        .rc:hover{transform:translateX(3px);}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.35;}}

        .hdr{background:#fff;border-bottom:1px solid ${BRAND.border};padding:12px 28px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
        .hdr-tabs{display:flex;gap:4px;}
        .hdr-user{display:flex;align-items:center;gap:10px;}
        .agent-type-bar{background:#fff;border-bottom:2px solid ${BRAND.border};padding:0 28px;display:flex;gap:0;overflow-x:auto;}
        .at-btn{padding:14px 24px;border:none;background:none;cursor:pointer;font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:${BRAND.sub};border-bottom:3px solid transparent;transition:all 0.2s;white-space:nowrap;}
        .at-btn:hover{color:${BRAND.text};background:#f8fafc;}
        .pp{padding:24px 28px 28px;}
        .agent-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .pipeline-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px;}
        .metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
        .actions-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
        .actions-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
        .rec-btns{display:flex;gap:8px;flex-wrap:wrap;}
        .fw{padding:14px 28px;border-top:1px solid ${BRAND.border};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;background:#fff;}

        @media(max-width:900px){
          .hdr{padding:12px 16px;}
          .agent-type-bar{padding:0 16px;}
          .pp{padding:16px;}
          .agent-grid{grid-template-columns:repeat(2,1fr);gap:14px;}
          .pipeline-grid{grid-template-columns:repeat(3,1fr);gap:10px;}
          .metrics-grid{grid-template-columns:repeat(2,1fr);}
          .actions-kpi{grid-template-columns:repeat(2,1fr);}
          .fw{padding:12px 16px;}
        }
        @media(max-width:600px){
          .hdr{padding:10px 12px;flex-direction:column;align-items:flex-start;}
          .hdr-tabs{width:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px;}
          .nb{padding:6px 10px;font-size:12px;}
          .at-btn{padding:10px 14px;font-size:12px;}
          .pp{padding:12px;}
          .agent-grid{grid-template-columns:1fr;gap:12px;}
          .pipeline-grid{grid-template-columns:repeat(2,1fr);gap:8px;}
          .metrics-grid{grid-template-columns:repeat(2,1fr);gap:10px;}
          .actions-kpi{grid-template-columns:repeat(2,1fr);gap:10px;}
          .actions-hdr{flex-direction:column;align-items:flex-start;}
          .rec-btns{width:100%;overflow-x:auto;flex-wrap:nowrap;}
          .fw{flex-direction:column;align-items:flex-start;padding:10px 12px;}
        }
      `}</style>

      {/* Header */}
      <div className="hdr">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "Inter,sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: BRAND.blue,
            }}
          >
            AriLinc
          </div>
          <span
            style={{
              background: `${BRAND.cyan}15`,
              color: BRAND.cyan,
              border: `1px solid ${BRAND.cyan}40`,
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            AGENTIC AI DEMO
          </span>
        </div>
        <div className="hdr-tabs">
          {[
            ["agent", "🤖 Agent"],
            ["pipeline", "⚙️ Pipeline"],
            ["actions", "📋 Actions"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`nb ${activeTab === v ? "na" : ""}`}
              onClick={() => setActiveTab(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="hdr-user">
          <div style={{ fontSize: 12, color: BRAND.light }}>
            👋 {user.name} · {user.company}
          </div>
          <button
            onClick={() => setUser(null)}
            style={{
              fontSize: 11,
              color: BRAND.light,
              background: "none",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Agent Type Selector */}
      <div className="agent-type-bar">
        {Object.entries(agentTypeConfig).map(([key, cfg]) => (
          <button
            key={key}
            className="at-btn"
            style={{
              color: agentType === key ? cfg.color : BRAND.sub,
              borderBottom: `3px solid ${
                agentType === key ? cfg.color : "transparent"
              }`,
            }}
            onClick={() => {
              setAgentType(key);
              setActiveTab("agent");
              setSelectedAsset(null);
            }}
          >
            {cfg.icon} {cfg.label} Agent
          </button>
        ))}
      </div>

      {/* Agent type description strip */}
      <div
        style={{
          background: `${agentTypeConfig[agentType].color}08`,
          borderBottom: `1px solid ${agentTypeConfig[agentType].color}20`,
          padding: "8px 28px",
          fontSize: 12,
          color: agentTypeConfig[agentType].color,
          fontWeight: 600,
        }}
      >
        {agentTypeConfig[agentType].icon}{" "}
        <strong>{agentTypeConfig[agentType].label} Agent</strong> —{" "}
        {agentTypeConfig[agentType].desc}
      </div>

      <div className="pp">
        {/* AGENT TAB */}
        {activeTab === "agent" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "Inter,sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: BRAND.text,
                  marginBottom: 4,
                }}
              >
                {agentTypeConfig[agentType].icon}{" "}
                {agentTypeConfig[agentType].label} AI Agent
              </div>
              <div style={{ fontSize: 13, color: BRAND.sub }}>
                Run the agent on each asset to detect issues, reason through
                root causes and get prioritised recommendations
              </div>
            </div>
            <div className="agent-grid">
              {currentAssets.map((a) => {
                const key = a.id;
                const state = agentStates[key] || "idle";
                const step = pipelineStep[key] ?? -1;
                const msgs = pipelineMsgs[key] || [];
                const chartProps = getChartProps(a);
                const kpiItems = getKpiItems(a);
                return (
                  <AgentCard
                    key={key}
                    asset={{ ...a, _agentType: agentType }}
                    state={state}
                    step={step}
                    msgs={msgs}
                    {...chartProps}
                    kpiItems={kpiItems}
                    onRun={() => runAgent({ ...a, _agentType: agentType })}
                    onReset={() => resetAgent(key)}
                    onViewActions={() => {
                      setSelectedAsset(a);
                      setActiveTab("actions");
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* PIPELINE TAB */}
        {activeTab === "pipeline" && (
          <div>
            <div
              style={{
                fontFamily: "Inter,sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: BRAND.text,
                marginBottom: 20,
              }}
            >
              How AriLinc {agentTypeConfig[agentType].label} Agent Thinks
            </div>
            <div className="pipeline-grid">
              {PIPELINE_STEPS[agentType].map((ps, i) => (
                <div
                  key={ps.id}
                  style={{
                    background: "#fff",
                    border: `2px solid ${ps.color}25`,
                    borderRadius: 12,
                    padding: 16,
                    borderTop: `4px solid ${ps.color}`,
                    position: "relative",
                  }}
                >
                  {i < 4 && (
                    <div
                      style={{
                        position: "absolute",
                        right: -14,
                        top: "38%",
                        fontSize: 14,
                        color: BRAND.border,
                        zIndex: 1,
                      }}
                    >
                      →
                    </div>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{ps.icon}</div>
                  <div
                    style={{
                      fontFamily: "Inter,sans-serif",
                      fontSize: 14,
                      fontWeight: 800,
                      color: ps.color,
                      marginBottom: 6,
                    }}
                  >
                    {ps.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: BRAND.sub,
                      lineHeight: 1.7,
                      background: BRAND.grey,
                      borderRadius: 6,
                      padding: "8px 10px",
                    }}
                  >
                    {PIPELINE_DESC[agentType][ps.id]}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                background: "#fff",
                border: `2px solid ${BRAND.border}`,
                borderRadius: 12,
                padding: 22,
              }}
            >
              <div
                style={{
                  fontFamily: "Inter,sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  color: BRAND.text,
                  marginBottom: 16,
                }}
              >
                Performance Metrics
              </div>
              <div className="metrics-grid">
                {(agentType === "maintenance"
                  ? [
                      {
                        label: "Detection Speed",
                        value: "< 30 sec",
                        color: BRAND.blue,
                        icon: "⚡",
                      },
                      {
                        label: "Model Accuracy",
                        value: "94.2%",
                        color: BRAND.green,
                        icon: "🎯",
                      },
                      {
                        label: "False Positive",
                        value: "3.1%",
                        color: BRAND.orange,
                        icon: "📉",
                      },
                      {
                        label: "Historical DB",
                        value: "1,357 cases",
                        color: BRAND.purple,
                        icon: "🗄",
                      },
                    ]
                  : agentType === "energy"
                  ? [
                      {
                        label: "Detection Speed",
                        value: "< 15 min",
                        color: BRAND.orange,
                        icon: "⚡",
                      },
                      {
                        label: "Saving Accuracy",
                        value: "91.4%",
                        color: BRAND.green,
                        icon: "🎯",
                      },
                      {
                        label: "False Positive",
                        value: "4.2%",
                        color: BRAND.orange,
                        icon: "📉",
                      },
                      {
                        label: "Energy Patterns",
                        value: "2,841 sites",
                        color: BRAND.purple,
                        icon: "🗄",
                      },
                    ]
                  : [
                      {
                        label: "Detection Speed",
                        value: "Real-time",
                        color: BRAND.red,
                        icon: "⚡",
                      },
                      {
                        label: "Defect Accuracy",
                        value: "96.8%",
                        color: BRAND.green,
                        icon: "🎯",
                      },
                      {
                        label: "False Positive",
                        value: "1.9%",
                        color: BRAND.orange,
                        icon: "📉",
                      },
                      {
                        label: "Batch Records",
                        value: "48,200",
                        color: BRAND.purple,
                        icon: "🗄",
                      },
                    ]
                ).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: BRAND.grey,
                      borderRadius: 10,
                      padding: "14px 16px",
                      border: `1px solid ${m.color}20`,
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 6 }}>
                      {m.icon}
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter,sans-serif",
                        fontSize: 20,
                        fontWeight: 800,
                        color: m.color,
                      }}
                    >
                      {m.value}
                    </div>
                    <div
                      style={{ fontSize: 12, color: BRAND.sub, marginTop: 4 }}
                    >
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACTIONS TAB */}
        {activeTab === "actions" && (
          <div>
            <div className="actions-hdr">
              <div>
                <div
                  style={{
                    fontFamily: "Inter,sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    color: BRAND.text,
                    marginBottom: 4,
                  }}
                >
                  Prioritised Action Queue
                </div>
                <div style={{ fontSize: 13, color: BRAND.sub }}>
                  AI-generated recommendations sorted by priority and urgency
                </div>
              </div>
              <div className="rec-btns">
                {currentAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() =>
                      setSelectedAsset(selectedAsset?.id === a.id ? null : a)
                    }
                    style={{
                      background: selectedAsset?.id === a.id ? a.color : "#fff",
                      color: selectedAsset?.id === a.id ? "#fff" : BRAND.sub,
                      border: `2px solid ${
                        selectedAsset?.id === a.id ? a.color : BRAND.border
                      }`,
                      borderRadius: 6,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.id}
                  </button>
                ))}
              </div>
            </div>

            {/* FIX #5: anyAgentRun now scoped to currentAssets */}
            {!anyAgentRun && (
              <div
                style={{
                  background: "#fffbeb",
                  border: `1px solid ${BRAND.orange}40`,
                  borderLeft: `4px solid ${BRAND.orange}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: BRAND.orange,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                ⚠ No {agentTypeConfig[agentType].label} agents have run yet —{" "}
                <button
                  onClick={() => setActiveTab("agent")}
                  style={{
                    background: BRAND.orange,
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🤖 Go to Agent tab
                </button>{" "}
                to run the analysis first.
              </div>
            )}

            <div className="actions-kpi">
              {[
                {
                  label: "Total Recommendations",
                  value: currentAssets.reduce(
                    (s, a) => s + a.agentData.recommendations.length,
                    0
                  ),
                  color: BRAND.blue,
                },
                {
                  label: "Critical Actions",
                  value: currentAssets.reduce(
                    (s, a) =>
                      s +
                      a.agentData.recommendations.filter(
                        (r) => r.priority === "CRITICAL"
                      ).length,
                    0
                  ),
                  color: BRAND.red,
                },
                {
                  label: "High Priority",
                  value: currentAssets.reduce(
                    (s, a) =>
                      s +
                      a.agentData.recommendations.filter(
                        (r) => r.priority === "HIGH"
                      ).length,
                    0
                  ),
                  color: "#f97316",
                },
                {
                  label: "Total Saving Potential",
                  value: `₹${(
                    currentAssets.reduce(
                      (s, a) =>
                        s +
                        a.agentData.recommendations.reduce(
                          (x, r) => x + r.saving,
                          0
                        ),
                      0
                    ) / 100000
                  ).toFixed(1)}L`,
                  color: BRAND.purple,
                },
              ].map((k, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: `2px solid ${k.color}20`,
                    borderRadius: 10,
                    padding: "14px 18px",
                    borderTop: `3px solid ${k.color}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Inter,sans-serif",
                      fontSize: 24,
                      fontWeight: 800,
                      color: k.color,
                    }}
                  >
                    {k.value}
                  </div>
                  <div style={{ fontSize: 12, color: BRAND.sub, marginTop: 4 }}>
                    {k.label}
                  </div>
                </div>
              ))}
            </div>

            {currentAssets
              .filter((a) => !selectedAsset || a.id === selectedAsset.id)
              .map((a) => (
                <div key={a.id} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: a.color,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "Inter,sans-serif",
                        fontSize: 16,
                        fontWeight: 800,
                        color: BRAND.text,
                      }}
                    >
                      {a.id} · {a.name}
                    </div>
                    <div style={{ fontSize: 12, color: BRAND.light }}>
                      — {a.type || a.failure}
                    </div>
                  </div>
                  <div
                    style={{
                      background: `${a.color}08`,
                      border: `1px solid ${a.color}25`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 12,
                      fontSize: 12,
                      color: BRAND.text,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ color: a.color }}>🧠 Root Cause: </strong>
                    {a.agentData.rootCause}
                  </div>
                  {a.agentData.recommendations.map((r, i) => (
                    <div
                      key={i}
                      className="rc"
                      style={{
                        background: pBg[r.priority],
                        borderLeftColor: pColor[r.priority],
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                background: pColor[r.priority],
                                color: "#fff",
                                borderRadius: 4,
                                padding: "2px 8px",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 0.8,
                              }}
                            >
                              {r.priority}
                            </span>
                            <span style={{ fontSize: 11, color: BRAND.light }}>
                              Confidence:{" "}
                              <strong
                                style={{
                                  color:
                                    r.confidence >= 80
                                      ? BRAND.green
                                      : BRAND.orange,
                                }}
                              >
                                {r.confidence}%
                              </strong>
                            </span>
                            <span style={{ fontSize: 11, color: BRAND.light }}>
                              Act:{" "}
                              <strong style={{ color: pColor[r.priority] }}>
                                {r.urgency}
                              </strong>
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: BRAND.text,
                            }}
                          >
                            {r.action}
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#fff",
                            border: `1px solid ${BRAND.border}`,
                            borderRadius: 8,
                            padding: "8px 14px",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ fontSize: 10, color: BRAND.light }}>
                            Est. Saving
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: BRAND.purple,
                              fontFamily: "Inter,sans-serif",
                            }}
                          >
                            ₹{(r.saving / 100000).toFixed(1)}L
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fw">
        <div style={{ fontSize: 12, color: BRAND.light }}>
          <span style={{ color: BRAND.green }}>●</span> AriLinc Agentic AI Demo
          · Maintenance · Energy · Quality · Powered by AriPrus
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="mailto:info@ariprus.com"
            style={{ fontSize: 12, color: BRAND.sub, textDecoration: "none" }}
          >
            ✉ info@ariprus.com
          </a>
          <a
            href="https://ariprus.com/contact-us/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: BRAND.blue,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Talk to us about your plant →
          </a>
        </div>
      </div>
    </div>
  );
}
