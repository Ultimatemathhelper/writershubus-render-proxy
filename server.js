import { useState, useEffect, useRef } from "react";

const SYS = `You are the WritersHubUS Student-Athlete Content & Reels Agent (v2.0). Create premium, direct, human-sounding marketing content for WritersHubUS targeting U.S. college student-athletes. PRIMARY OFFERING: Full Online Class Management on Blackboard, Canvas, McGraw Hill, Pearson, ALEKS, MATLAB. SUPPORTING SERVICES: Essay support, assignment help, finals prep, accounting/finance/economics, calculus/math, deadline planning. CONTACTS: support@writershubusa.com | @writershubus | www.writershubusa.com | Apple Pay, Mastercard, Bank Transfer. AVOID: robotic hype words, guaranteed grades, dashes, hashtags unless asked. SAFETY: Frame all as academic support and logistics. Never promise grades or impersonation.`;

const GROK_SYS = `You are a Grok Imagine video prompt specialist. Convert the given script into a perfectly structured prompt for realistic short-form vertical 9:16 video. Include: visual scenes, camera movement, lighting, mood, on-screen text, transitions, duration.`;

const ANGLES = [
  { id:"deadline", label:"Deadline Pressure", emoji:"⏰" },
  { id:"authority", label:"Brand Authority", emoji:"🏆" },
  { id:"educational", label:"Educational", emoji:"📚" },
  { id:"social_proof", label:"Social Proof", emoji:"✅" },
  { id:"sports", label:"Real-Time Sports", emoji:"🏈" },
  { id:"comedy", label:"Comedy & Metaphors", emoji:"😄" },
];

const TABS = [
  { id:"reel", label:"Reel", icon:"🎬" },
  { id:"post", label:"IG Post", icon:"📸" },
  { id:"podcast", label:"Podcast", icon:"🎙️" },
  { id:"street", label:"Street", icon:"🏙️" },
];

const FORMATS = {
  reel: ["30-Sec Cinematic","Comedy Skit (30-45s)","Sports Metaphor","Coach Voice VO","POV Student-Athlete"],
  post: ["Professional Caption","Comedy Caption","Sports Metaphor Caption","Carousel (6 Slides)","Single Image Copy"],
  podcast: ["Episode Hook & Intro","Full Episode Outline","60-Sec Promo Clip","Audiogram Caption","Show Notes"],
  street: ["Campus Guerrilla (30s)","Locker Room Walk","Game Day Street","Bus / Travel Raw","Study Hall Vibe"],
};

const DEFAULT_PROXY = "https://writershubus-render-proxy.onrender.com";

export default function App() {
  const [tab, setTab] = useState("reel");
  const [angle, setAngle] = useState(0);
  const [fmt, setFmt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [grokShortLoading, setGrokShortLoading] = useState(false);
  const [grokShortOut, setGrokShortOut] = useState("");
  const [grokLoading, setGrokLoading] = useState(false);
  const [grokOut, setGrokOut] = useState("");
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const [proxyUrl, setProxyUrl] = useState(DEFAULT_PROXY);
  const [xaiKey, setXaiKey] = useState("");
  const [proxyInput, setProxyInput] = useState(DEFAULT_PROXY);
  const [keyInput, setKeyInput] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [proxyOk, setProxyOk] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoStatus, setVideoStatus] = useState("");
  const [activePrompt, setActivePrompt] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await window.storage.get("wh_hist");
        if (h) setHistory(JSON.parse(h.value));
        const s = await window.storage.get("wh_proxy");
        if (s) { setProxyUrl(s.value); setProxyInput(s.value); }
        const k = await window.storage.get("wh_xai");
        if (k) setXaiKey(k.value);
      } catch (_) {}
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const saveHistory = async h => {
    try { await window.storage.set("wh_hist", JSON.stringify(h)); } catch (_) {}
  };

  const showT = m => { setToast(m); setTimeout(() => setToast(""), 2400); };
  const cp = (t, k) => { navigator.clipboard.writeText(t); setCopied(k); showT("Copied!"); setTimeout(() => setCopied(""), 2400); };

  const switchTab = t => {
    setTab(t); setFmt(0); setOutput("");
    setGrokShortOut(""); setGrokOut("");
    setVideoUrl(""); setVideoStatus("");
  };

  const saveConfig = async () => {
    const s = proxyInput.trim().replace(/\/$/, "");
    const k = keyInput.trim();
    setProxyUrl(s);
    if (k) setXaiKey(k);
    try {
      await window.storage.set("wh_proxy", s);
      if (k) await window.storage.set("wh_xai", k);
    } catch (_) {}
    setProxyOk(null);
    try {
      const r = await fetch(`${s}/`);
      setProxyOk(r.ok);
      showT(r.ok ? "✅ Proxy connected!" : "❌ Proxy error");
    } catch (_) {
      setProxyOk(false);
      showT("❌ Cannot reach proxy");
    }
    setShowConfig(false);
  };

  const callClaude = async (sys, msg, max = 1000) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: max, system: sys, messages: [{ role: "user", content: msg }] })
    });
    const d = await r.json();
    return d.content?.map(b => b.text || "").join("") || "Error. Try again.";
  };

  const generate = async () => {
    setLoading(true); setOutput(""); setGrokShortOut(""); setGrokOut(""); setVideoUrl(""); setVideoStatus("");
    const a = ANGLES[angle], f = FORMATS[tab][fmt];
    const usedHooks = history.filter(h => h.tab === tab).slice(-10).map(h => h.hook).filter(Boolean);
    const avoid = usedHooks.length ? `\n\nSTRICTLY AVOID these recently used hooks:\n${usedHooks.map((h, i) => `${i+1}. "${h}"`).join("\n")}` : "";
    const ps = {
      reel: `Create a "${f}" Reel script for WritersHubUS with the "${a.label}" angle. Timed breakdown: [VISUAL DIRECTION], (VOICEOVER), ON-SCREEN TEXT, timestamps. Start with: HOOK: [line]\n${avoid}`,
      post: `Create a "${f}" IG Post for WritersHubUS with "${a.label}" angle. Human, direct, ready to post. Start with: HOOK: [line]\n${avoid}`,
      podcast: `Create "${f}" for WritersHubUS student-athlete podcast. Angle: "${a.label}". Authentic, coach-like. Start with: HOOK: [line]\n${avoid}`,
      street: `Create "${f}" street video script for WritersHubUS. Raw cinematic campus style. Angle: "${a.label}". [SCENE], (VO/DIALOGUE), on-screen text. Start with: HOOK: [line]\n${avoid}`,
    };
    try {
      const text = await callClaude(SYS, ps[tab]);
      setOutput(text);
      const m = text.match(/HOOK:\s*(.+)/);
      const hook = m ? m[1].trim() : text.split("\n")[0].replace(/^HOOK:\s*/i, "").trim();
      const entry = { id: Date.now(), tab, angle: a.label, format: f, hook };
      const nh = [...history, entry].slice(-40);
      setHistory(nh); saveHistory(nh);
    } catch (_) { setOutput("Connection error. Try again."); }
    setLoading(false);
  };

  const genGrok = async short => {
    if (!output) return;
    short ? setGrokShortLoading(true) : setGrokLoading(true);
    const p = short
      ? `Convert to Grok SHORT video prompt — 10-15s only. One scene, one message, one CTA.\n\nScript:\n${output}\n\nBrand: WritersHubUS. Navy, gold, white. Athletic-academic. Vertical 9:16.`
      : `Convert to full Grok video prompt. Complete scene breakdown, camera movement, lighting, text overlays.\n\nScript:\n${output}\n\nBrand: WritersHubUS. Navy, gold, white. Premium cinematic. Vertical 9:16.`;
    try {
      const text = await callClaude(GROK_SYS, p, 700);
      short ? setGrokShortOut(text) : setGrokOut(text);
    } catch (_) { short ? setGrokShortOut("Error.") : setGrokOut("Error."); }
    short ? setGrokShortLoading(false) : setGrokLoading(false);
  };

  const generateVideo = async (prompt, dur) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setVideoLoading(true); setVideoUrl(""); setVideoStatus("Submitting to Grok Imagine..."); setActivePrompt(prompt);
    const hdrs = { "Content-Type": "application/json" };
    if (xaiKey) hdrs["x-xai-key"] = xaiKey;
    try {
      const r = await fetch(`${proxyUrl}/api/generate`, { method: "POST", headers: hdrs, body: JSON.stringify({ prompt, duration: dur, aspect_ratio: "9:16", resolution: "720p" }) });
      const d = await r.json();
      if (!r.ok) { setVideoStatus(`Error: ${d.error || "Unknown"}`); setVideoLoading(false); return; }
      const { requestId } = d;
      setVideoStatus("Generating video — usually 1-3 minutes...");
      let n = 0;
      pollRef.current = setInterval(async () => {
        n++;
        if (n > 72) { clearInterval(pollRef.current); setVideoStatus("Timed out. Try again."); setVideoLoading(false); return; }
        try {
          const pr = await fetch(`${proxyUrl}/api/status/${requestId}`, { headers: xaiKey ? { "x-xai-key": xaiKey } : {} });
          const pd = await pr.json();
          if (pd.status === "done") { clearInterval(pollRef.current); setVideoUrl(pd.video?.url || ""); setVideoStatus("done"); setVideoLoading(false); }
          else if (pd.status === "failed") { clearInterval(pollRef.current); setVideoStatus(`Failed: ${pd.error?.message || "Unknown"}`); setVideoLoading(false); }
          else if (pd.status === "expired") { clearInterval(pollRef.current); setVideoStatus("Expired. Try again."); setVideoLoading(false); }
          else setVideoStatus(`Generating... (${n * 5}s elapsed)`);
        } catch (e) { setVideoStatus(`Poll error: ${e.message}`); }
      }, 5000);
    } catch (_) { setVideoStatus("Cannot reach proxy. Check Setup Proxy."); setVideoLoading(false); }
  };

  const Spin = ({ size = 12, color = "#fff" }) => (
    <span style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
  );

  const isGrokTab = ["reel", "street"].includes(tab);
  const curTab = TABS.find(t => t.id === tab);
  const tabHistory = history.filter(h => h.tab === tab);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#001529", minHeight: "100vh", color: "#fff" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } button { cursor: pointer; font-family: inherit; transition: all .18s; } button:not(:disabled):hover { opacity: .88; }`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", background: "#00A86B", color: "#fff", padding: "9px 22px", borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.5)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#001F3F,#002D6B)", padding: "14px 16px 12px", borderBottom: "2px solid #FFD700", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ background: "#fff", color: "#0047AB", fontWeight: 900, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>WritersHub</div>
        <div>
          <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 13, lineHeight: 1 }}>Content Engine</div>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, marginTop: 2, letterSpacing: ".8px", textTransform: "uppercase" }}>Reels · Posts · Podcast · Street · Grok Video</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {history.length > 0 && (
            <div style={{ background: "rgba(255,215,0,.12)", border: "1px solid rgba(255,215,0,.3)", borderRadius: 20, padding: "3px 9px", fontSize: 10, color: "#FFD700", fontWeight: 700 }}>
              {history.length} made
            </div>
          )}
          <button onClick={() => setShowConfig(v => !v)} style={{ background: proxyOk === true ? "rgba(0,168,107,.2)" : proxyOk === false ? "rgba(255,60,60,.15)" : "rgba(109,40,217,.25)", border: `1px solid ${proxyOk === true ? "#00A86B" : proxyOk === false ? "rgba(255,60,60,.4)" : "rgba(139,92,246,.4)"}`, borderRadius: 6, color: proxyOk === true ? "#00A86B" : proxyOk === false ? "#ff6060" : "#A78BFA", fontSize: 10, fontWeight: 700, padding: "3px 10px" }}>
            {proxyOk === true ? "✅ Proxy Live" : proxyOk === false ? "❌ No Proxy" : "⚡ Setup Proxy"}
          </button>
          {history.length > 0 && (
            <button onClick={async () => { setHistory([]); try { await window.storage.delete("wh_hist"); } catch (_) {} showT("Reset!"); }} style={{ background: "none", border: "none", color: "rgba(255,80,80,.5)", fontSize: 10, fontWeight: 700, padding: 0 }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Proxy Config */}
      {showConfig && (
        <div style={{ background: "rgba(109,40,217,.1)", borderBottom: "1px solid rgba(139,92,246,.3)", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#A78BFA", fontWeight: 700, marginBottom: 10 }}>⚡ Grok Proxy Configuration</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>Proxy URL (Render)</div>
            <input value={proxyInput} onChange={e => setProxyInput(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(139,92,246,.4)", borderRadius: 7, color: "#fff", fontSize: 12, padding: "8px 12px", outline: "none", boxSizing: "border-box" }} placeholder="https://writershubus-render-proxy.onrender.com" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>xAI API Key</div>
            <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder={xaiKey ? "Key saved — enter to update" : "xai-..."} style={{ width: "100%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(139,92,246,.4)", borderRadius: 7, color: "#fff", fontSize: 12, padding: "8px 12px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveConfig} style={{ flex: 1, background: "#6D28D9", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, padding: "9px" }}>Save & Test</button>
            <button onClick={() => setShowConfig(false)} style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.5)", border: "none", borderRadius: 7, fontSize: 12, padding: "9px 14px" }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ padding: "14px 14px 60px", maxWidth: 520, margin: "0 auto" }}>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "rgba(255,255,255,.05)", borderRadius: 10, padding: 3, marginBottom: 16, gap: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)} style={{ padding: "9px 4px", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 11, background: tab === t.id ? "#FFD700" : "transparent", color: tab === t.id ? "#001529" : "rgba(255,255,255,.45)", lineHeight: 1.3, textAlign: "center" }}>
              <div>{t.icon}</div><div style={{ marginTop: 2 }}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* Angles */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#FFD700", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>Content Angle</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {ANGLES.map((a, i) => {
              const count = history.filter(h => h.angle === a.label && h.tab === tab).length;
              return (
                <button key={a.id} onClick={() => setAngle(i)} style={{ padding: "9px 8px", border: angle === i ? "2px solid #FFD700" : "2px solid rgba(255,255,255,.07)", borderRadius: 8, background: angle === i ? "rgba(255,215,0,.1)" : "rgba(255,255,255,.03)", color: angle === i ? "#FFD700" : "rgba(255,255,255,.6)", fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
                  <div>{a.emoji}</div>
                  <div style={{ marginTop: 2 }}>{a.label}</div>
                  {count > 0 && <div style={{ fontSize: 9, color: angle === i ? "rgba(255,215,0,.5)" : "rgba(255,255,255,.25)", marginTop: 2 }}>{count}x</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formats */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#FFD700", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>Format</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {FORMATS[tab].map((f, i) => (
              <button key={i} onClick={() => setFmt(i)} style={{ padding: "10px 13px", border: fmt === i ? "2px solid #0047AB" : "2px solid rgba(255,255,255,.07)", borderRadius: 8, background: fmt === i ? "rgba(0,71,171,.25)" : "rgba(255,255,255,.03)", color: fmt === i ? "#fff" : "rgba(255,255,255,.55)", fontSize: 12, fontWeight: fmt === i ? 700 : 500, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                {fmt === i && <span style={{ color: "#4A9EFF", fontSize: 8 }}>●</span>}{f}
              </button>
            ))}
          </div>
        </div>

        {/* Recent hooks */}
        {tabHistory.slice(-3).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Recent hooks — avoided next generation</div>
            {tabHistory.slice(-3).reverse().map(h => (
              <div key={h.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 7, padding: "7px 11px", fontSize: 11, color: "rgba(255,255,255,.33)", marginBottom: 5, lineHeight: 1.4 }}>
                {h.hook?.slice(0, 90)}{h.hook?.length > 90 ? "..." : ""}
              </div>
            ))}
          </div>
        )}

        {/* Generate */}
        <button onClick={generate} disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "rgba(255,215,0,.2)" : "linear-gradient(135deg,#FFD700,#FFC107)", color: "#001529", border: "none", borderRadius: 11, fontSize: 13, fontWeight: 900, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 16, boxShadow: loading ? "none" : "0 4px 18px rgba(255,215,0,.22)" }}>
          {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}><Spin size={13} color="#001529" />Generating...</span> : `Generate ${curTab?.label} →`}
        </button>

        {/* Output */}
        {output && (
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(0,71,171,.35)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#FFD700", textTransform: "uppercase", letterSpacing: 1 }}>{curTab?.icon} {curTab?.label} — {ANGLES[angle].label}</span>
              <button onClick={() => cp(output, "main")} style={{ background: copied === "main" ? "#00A86B" : "#0047AB", color: "#fff", border: "none", borderRadius: 6, padding: "5px 13px", fontSize: 11, fontWeight: 700 }}>
                {copied === "main" ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.75, color: "rgba(255,255,255,.87)", margin: 0, fontFamily: "inherit" }}>{output}</pre>

            {isGrokTab && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>⚡ Grok Export</div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button onClick={() => genGrok(true)} disabled={grokShortLoading} style={{ flex: 1, padding: "10px 6px", background: grokShortLoading ? "rgba(76,29,149,.2)" : "linear-gradient(135deg,#4C1D95,#6D28D9)", color: "#fff", border: "2px solid rgba(139,92,246,.4)", borderRadius: 8, fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>
                    {grokShortLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Spin size={11} />...</span> : <><div>⚡ Short</div><div style={{ fontSize: 9, opacity: .7, marginTop: 1 }}>10-15s</div></>}
                  </button>
                  <button onClick={() => genGrok(false)} disabled={grokLoading} style={{ flex: 1, padding: "10px 6px", background: grokLoading ? "rgba(109,40,217,.2)" : "linear-gradient(135deg,#6D28D9,#8B5CF6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>
                    {grokLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Spin size={11} />...</span> : <><div>⚡ Full</div><div style={{ fontSize: 9, opacity: .7, marginTop: 1 }}>Full</div></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grok Prompt Boxes */}
        {[
          { text: grokShortOut, label: "⚡ Grok Short", sub: "10-15 sec", ck: "gs", dur: 12 },
          { text: grokOut, label: "⚡ Grok Full", sub: "Full prompt", ck: "gf", dur: 10 }
        ].map(({ text, label, sub, ck, dur }) => !text ? null : (
          <div key={ck} style={{ background: "rgba(76,29,149,.1)", border: "1px solid rgba(139,92,246,.35)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#C4B5FD", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{sub} — paste into SuperGrok or generate below</div>
              </div>
              <button onClick={() => cp(text, ck)} style={{ background: copied === ck ? "#00A86B" : "#4C1D95", color: "#fff", border: "1px solid rgba(139,92,246,.5)", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>
                {copied === ck ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.75, color: "rgba(255,255,255,.83)", margin: "0 0 14px", fontFamily: "inherit" }}>{text}</pre>
            <button onClick={() => generateVideo(text, dur)} disabled={videoLoading} style={{ width: "100%", padding: "11px", background: videoLoading && activePrompt === text ? "rgba(255,215,0,.15)" : proxyOk === true ? "linear-gradient(135deg,#B45309,#D97706)" : "rgba(109,40,217,.3)", color: proxyOk === true ? "#fff" : "#A78BFA", border: proxyOk === true ? "none" : "1px solid rgba(139,92,246,.4)", borderRadius: 8, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {videoLoading && activePrompt === text
                ? <><span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />Generating video...</>
                : proxyOk === true ? "🎬 Generate Video with Grok" : "⚡ Setup Proxy to Generate Video"}
            </button>
          </div>
        ))}

        {/* Video Player */}
        {(videoLoading || videoStatus) && (
          <div style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#FFD700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>🎬 Grok Video</div>
            {videoLoading && <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.6)", fontSize: 12 }}><Spin size={14} color="#FFD700" />{videoStatus}</div>}
            {videoStatus === "done" && videoUrl && (
              <div>
                <video src={videoUrl} controls playsInline style={{ width: "100%", borderRadius: 9 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <a href={videoUrl} download="writershub.mp4" style={{ flex: 1, textAlign: "center", background: "#00A86B", color: "#fff", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "block", textDecoration: "none" }}>⬇ Download</a>
                  <button onClick={() => { setVideoUrl(""); setVideoStatus(""); }} style={{ background: "rgba(255,255,255,.07)", border: "none", borderRadius: 8, color: "rgba(255,255,255,.4)", fontSize: 12, padding: "10px 14px" }}>✕</button>
                </div>
              </div>
            )}
            {!videoLoading && videoStatus !== "done" && videoStatus && (
              <div style={{ fontSize: 11, color: "rgba(255,100,100,.8)", lineHeight: 1.6 }}>{videoStatus}</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
