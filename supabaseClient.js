import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import {
  Search, FileText, BarChart3, Target, Smile, Users, DownloadCloud,
  RefreshCw, UploadCloud, ClipboardList, ClipboardCheck, History, Wrench, Package,
  X, ChevronLeft, ChevronRight, Check, Plus, Trash2, Link2, Pencil,
  ExternalLink, Save, Loader2, TicketCheck, Mail, MessageSquare, Phone,
  CreditCard, Book, HelpCircle, Globe, Calendar, AlertTriangle, Star, Zap,
  Database, FileSpreadsheet, Settings, Lock, ShieldCheck, Bell, MapPin,
  Award, Lightbulb, LogOut, Sparkles,
} from "lucide-react";

const BRAND = {
  darkTeal: "#1E3C47",
  teal: "#265564",
  lime: "#B7EF87",
  white: "#FFFFFF",
  sand: "#F3F1EA",
  sandBorder: "#E3DFD2",
  tealSoft: "rgba(38,85,100,0.08)",
  limeSoft: "rgba(183,239,135,0.35)",
};

const ICONS = {
  search: Search, file: FileText, chart: BarChart3, target: Target,
  smile: Smile, users: Users, uploadCloud: UploadCloud, downloadCloud: DownloadCloud,
  sync: RefreshCw, clipboard: ClipboardList, clipboardCheck: ClipboardCheck,
  history: History, wrench: Wrench, package: Package, mail: Mail,
  messageSquare: MessageSquare, phone: Phone, creditCard: CreditCard, book: Book,
  helpCircle: HelpCircle, globe: Globe, calendar: Calendar, alertTriangle: AlertTriangle,
  star: Star, zap: Zap, database: Database, fileSpreadsheet: FileSpreadsheet,
  settings: Settings, lock: Lock, shieldCheck: ShieldCheck, bell: Bell,
  mapPin: MapPin, award: Award, lightbulb: Lightbulb,
};

const ICON_PICKER_ORDER = [
  "search", "clipboardCheck", "chart", "target", "smile", "users", "mail",
  "messageSquare", "phone", "uploadCloud", "downloadCloud", "sync", "database",
  "fileSpreadsheet", "clipboard", "shieldCheck", "lock", "history", "wrench",
  "package", "settings", "book", "helpCircle", "globe", "calendar",
  "alertTriangle", "star", "zap", "bell", "mapPin", "award", "lightbulb", "file",
];

const DEFAULT_TOPICS = [
  { id: "search-tickets", icon: "search", order: 1,
    title: "Search tickets", description: "Browse and filter Freshdesk tickets by month, agent, and reason.",
    slides: [
      { id: "s1", title: "What it's for", bullets: ["Find tickets that need evaluating", "Filter by month, agent, or contact reason", "Already-evaluated tickets are flagged"] },
      { id: "s2", title: "Walkthrough", bullets: ["Add the real steps here", "Click Edit content to replace this slide"] },
    ],
    links: [], ticketLinks: [], tips: ["Add a practical tip for new hires here."], quiz: [] },
  { id: "ticket-evaluation", icon: "clipboardCheck", order: 2,
    title: "Ticket evaluation", description: "Evaluate a ticket with a decision tree — quality, root cause, and improvement ideas.",
    slides: [
      { id: "s1", title: "How it works", bullets: ["Decision tree: how the ticket was resolved", "Quality and root cause are picked step by step", "Score is calculated automatically"] },
    ],
    links: [], ticketLinks: [], tips: ["Add a practical tip for new hires here."], quiz: [] },
  { id: "view-results", icon: "chart", order: 3,
    title: "View results", description: "Evaluations by quarter, team, and agent — scores, root causes, calibration flags.",
    slides: [ { id: "s1", title: "What's in here", bullets: ["Filter by quarter, team, agent", "Score and trend overview", "Calibration flags"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "calibration-queue", icon: "target", order: 4,
    title: "Calibration queue", description: "Tickets flagged for calibration, waiting for a group review.",
    slides: [ { id: "s1", title: "How calibration works", bullets: ["Tickets wait for a team discussion", "Mark them calibrated once discussed"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "csat-report", icon: "smile", order: 5,
    title: "CSAT report", description: "Customer satisfaction stats, top agents, and detailed feedback by period.",
    slides: [ { id: "s1", title: "Overview", bullets: ["CSAT stats by period", "Top agents", "Detailed feedback analysis"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "team-management", icon: "users", order: 6,
    title: "Team management", description: "Create and manage teams, add agents, organize the support structure.",
    slides: [ { id: "s1", title: "What you manage here", bullets: ["Create and edit teams", "Add agents", "Support org structure"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "import-legacy", icon: "uploadCloud", order: 7,
    title: "Import legacy data", description: "Import evaluations from the old system by pasting Excel table data.",
    slides: [ { id: "s1", title: "How to import", bullets: ["Paste data copied from Excel", "Review and confirm the import"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "freshdesk-import", icon: "sync", order: 8,
    title: "Freshdesk import", description: "Import ticket data directly from Freshdesk exports for evaluation.",
    slides: [ { id: "s1", title: "How it works", bullets: ["Upload a Freshdesk export", "Data gets prepped for evaluation"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "export-data", icon: "downloadCloud", order: 9,
    title: "Export data", description: "Export evaluated tickets to CSV, Excel, or JSON, with optional date filtering.",
    slides: [ { id: "s1", title: "Export formats", bullets: ["CSV, Excel, JSON", "Optional date filtering"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "access-log", icon: "shieldCheck", order: 10,
    title: "Access log", description: "Login and logout activity, IP addresses, and unauthorized access attempts.",
    slides: [ { id: "s1", title: "What to watch for", bullets: ["Login and logout history", "IP addresses", "Unauthorized access attempts"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "changelog", icon: "history", order: 11,
    title: "Changelog", description: "Recent updates, bug fixes, and new features added to the system.",
    slides: [ { id: "s1", title: "What it's for", bullets: ["History of system changes", "New features and fixes"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "debug", icon: "wrench", order: 12,
    title: "Debug", description: "Inspect data paths, write permissions, JSON integrity, and record counts.",
    slides: [ { id: "s1", title: "When to use it", bullets: ["Diagnose data issues", "Check permissions and file integrity"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "migration", icon: "package", order: 13,
    title: "Migration", description: "One-shot: move old evaluations into the archive and set up the new store.",
    slides: [ { id: "s1", title: "What it does", bullets: ["Moves old data into the archive", "Initializes the new evaluations store"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
];

function uid() { return Math.random().toString(36).slice(2, 9); }
const font = "'Inter', 'Graphik', -apple-system, 'Segoe UI', sans-serif";

// ---------- Supabase data helpers ----------

async function fetchTopics() {
  const { data, error } = await supabase.from("topics").select("id, data").order("id");
  if (error) throw error;
  return data.map(row => ({ ...row.data, id: row.id }));
}
async function upsertTopicRow(topic) {
  const { id, ...data } = topic;
  const { error } = await supabase.from("topics").upsert({ id, data, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function deleteTopicRow(id) {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}
async function seedDefaultTopics() {
  const rows = DEFAULT_TOPICS.map(t => { const { id, ...data } = t; return { id, data }; });
  const { error } = await supabase.from("topics").insert(rows);
  if (error) throw error;
}
async function fetchProgress(userId) {
  const { data, error } = await supabase.from("progress").select("topic_id, completed").eq("user_id", userId);
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[r.topic_id] = r.completed; });
  return map;
}
async function setProgressRow(userId, topicId, completed) {
  const { error } = await supabase.from("progress").upsert({ user_id: userId, topic_id: topicId, completed, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function saveQuizScore(userId, topicId, correct, total) {
  const { error } = await supabase.from("quiz_scores").upsert({ user_id: userId, topic_id: topicId, correct, total, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("id, email, role").eq("id", userId).single();
  if (error) throw error;
  return data;
}

// ---------- App root: auth gate ----------

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) { setProfile(null); return; }
    if (!session) return;
    fetchProfile(session.user.id).then(setProfile).catch(() => setProfile(null));
  }, [session]);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.sand, color: BRAND.teal, fontFamily: font }}>
        <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> Loading…
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.sand, color: BRAND.teal, fontFamily: font }}>
        <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> Setting up your account…
      </div>
    );
  }

  return <Hub session={session} profile={profile} />;
}

// ---------- Auth screen (sign in / sign up) ----------

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("Account created. Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
    setBusy(false);
  }

  const inputStyle = { width: "100%", background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, color: BRAND.darkTeal, padding: "10px 12px", fontSize: 14, boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.darkTeal, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');`}</style>
      <div style={{ background: BRAND.white, borderRadius: 16, padding: 32, width: "100%", maxWidth: 380 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", color: BRAND.teal, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
          Webnode · Onboarding
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700, color: BRAND.darkTeal }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ margin: "0 0 22px", fontSize: 13.5, color: BRAND.teal }}>
          {mode === "signin" ? "Sign in to continue to Launchpad." : "Set a password to get started."}
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" required placeholder="you@company.com" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required minLength={6} placeholder="Password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div style={{ fontSize: 13, color: "#C0392B" }}>{error}</div>}
          {notice && <div style={{ fontSize: 13, color: BRAND.teal }}>{notice}</div>}
          <button type="submit" disabled={busy} className="onb-btn" style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          onClick={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}
          className="onb-btn"
          style={{ marginTop: 16, background: "transparent", border: "none", color: BRAND.teal, fontSize: 13, cursor: "pointer" }}
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

// ---------- Hub ----------

function Hub({ session, profile }) {
  const isEditor = profile.role === "editor";
  const [topics, setTopics] = useState(null);
  const [progress, setProgress] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [editDraft, setEditDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [t, p] = await Promise.all([fetchTopics(), fetchProgress(session.user.id)]);
      setTopics(t);
      setProgress(p);
    } catch (err) {
      showToast(err.message || "Couldn't load data.");
      setTopics([]);
    }
  }

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  async function persistTopic(topic) {
    setSaving(true);
    try {
      await upsertTopicRow(topic);
      setTopics(prev => {
        const exists = prev.some(t => t.id === topic.id);
        return exists ? prev.map(t => t.id === topic.id ? topic : t) : [...prev, topic];
      });
    } catch (err) {
      showToast(err.message || "Couldn't save. Try again.");
    }
    setSaving(false);
  }

  async function removeTopic(id) {
    setSaving(true);
    try {
      await deleteTopicRow(id);
      setTopics(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      showToast(err.message || "Couldn't delete. Try again.");
    }
    setSaving(false);
  }

  async function toggleComplete(id) {
    const next = !progress[id];
    setProgress(p => ({ ...p, [id]: next }));
    try { await setProgressRow(session.user.id, id, next); } catch (err) { showToast(err.message || "Couldn't save progress."); }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDefaultTopics();
      await loadAll();
      showToast("Starter content loaded.");
    } catch (err) {
      showToast(err.message || "Couldn't seed content.");
    }
    setSeeding(false);
  }

  const active = topics && activeId ? topics.find(t => t.id === activeId) : null;
  const sorted = topics ? [...topics].sort((a, b) => a.order - b.order) : [];
  const totalDone = topics ? topics.filter(t => progress[t.id]).length : 0;
  const totalCount = topics ? topics.length : 0;

  function openTopic(id) { setActiveId(id); setSlideIdx(0); }
  function closeTopic() { setActiveId(null); setSlideIdx(0); }
  function startEdit(topic) { setEditDraft(JSON.parse(JSON.stringify(topic))); }
  function startNewTopic() {
    setEditDraft({
      id: "topic-" + uid(), icon: "file",
      order: (topics?.length || 0) + 1, title: "", description: "",
      slides: [{ id: uid(), title: "", bullets: [""] }], links: [], ticketLinks: [], tips: [], quiz: [],
    });
  }
  async function saveDraft() {
    if (!editDraft.title.trim()) { showToast("Add a title first."); return; }
    await persistTopic(editDraft);
    setEditDraft(null);
    showToast("Saved.");
  }
  async function handleDeleteDraft(id) {
    await removeTopic(id);
    setEditDraft(null);
    if (activeId === id) closeTopic();
    showToast("Topic deleted.");
  }

  if (!topics) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.sand, color: BRAND.teal, fontFamily: font }}>
        <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BRAND.sand, color: BRAND.darkTeal, fontFamily: font, paddingBottom: 64 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        .onb-card { transition: transform .15s ease, box-shadow .15s ease; cursor:pointer; }
        .onb-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(30,60,71,0.08); }
        .onb-btn { cursor:pointer; font-family: inherit; }
        input, textarea, select { font-family: inherit; }
      `}</style>

      <div style={{ background: BRAND.darkTeal, color: BRAND.white, padding: "44px 32px 36px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>
            <span>{session.user.email} · {isEditor ? "Editor" : "Viewer"}</span>
            <button onClick={() => supabase.auth.signOut()} className="onb-btn" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
          <div style={{ display: "inline-block", fontSize: 12, letterSpacing: "0.12em", color: BRAND.lime, textTransform: "uppercase", marginBottom: 14, fontWeight: 500 }}>
            Webnode · Onboarding
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Welcome</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15.5, lineHeight: 1.6, marginTop: 12, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Below you'll find all the topics we'll cover during your onboarding. Take them one by one and you'll gradually get to know our product, processes, and the tools you'll be using every day.
          </p>

          {sorted.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 32, overflowX: "auto", padding: "8px 4px", justifyContent: "center" }}>
                {sorted.map((t, i, arr) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
                    <button onClick={() => openTopic(t.id)} title={t.title} className="onb-btn" style={{ width: 13, height: 13, borderRadius: "50%", border: "none", background: progress[t.id] ? BRAND.lime : "rgba(255,255,255,0.25)", boxShadow: progress[t.id] ? "0 0 0 4px rgba(183,239,135,0.25)" : "none" }} />
                    {i < arr.length - 1 && <div style={{ width: 24, height: 2, background: "rgba(255,255,255,0.2)" }} />}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 12 }}>{totalDone} of {totalCount} topics complete</p>
            </>
          )}

          {isEditor && (
            <button
              className="onb-btn"
              onClick={() => setEditMode(e => !e)}
              style={{
                marginTop: 22, background: editMode ? BRAND.lime : "transparent",
                color: editMode ? BRAND.darkTeal : BRAND.white,
                border: editMode ? "none" : "1px solid rgba(255,255,255,0.35)",
                borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Pencil size={14} /> {editMode ? "Done editing" : "Edit content"}
            </button>
          )}
          {saving && <span style={{ marginLeft: 10, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Saving…</span>}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center", color: BRAND.teal }}>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>No topics yet.</p>
          {isEditor ? (
            <button onClick={handleSeed} disabled={seeding} className="onb-btn" style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700 }}>
              {seeding ? "Loading…" : "Load starter content"}
            </button>
          ) : (
            <p style={{ fontSize: 13 }}>Ask an editor to add the first topic.</p>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
            {sorted.map(t => {
              const Icon = ICONS[t.icon] || FileText;
              const done = !!progress[t.id];
              return (
                <div key={t.id} className="onb-card" onClick={() => openTopic(t.id)} style={{ background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderTop: `3px solid ${BRAND.teal}`, borderRadius: 12, padding: "20px 20px 18px", position: "relative" }}>
                  {editMode && (
                    <button onClick={(e) => { e.stopPropagation(); startEdit(t); }} className="onb-btn" style={{ position: "absolute", top: 12, right: 12, background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 6, padding: 5, color: BRAND.teal }}>
                      <Pencil size={13} />
                    </button>
                  )}
                  {done && (
                    <div style={{ position: "absolute", top: 12, right: editMode ? 42 : 12, width: 22, height: 22, borderRadius: "50%", background: BRAND.lime, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={13} color={BRAND.darkTeal} />
                    </div>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: BRAND.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color={BRAND.teal} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 6px" }}>{t.title}</h3>
                  <p style={{ fontSize: 13, color: BRAND.teal, lineHeight: 1.55, margin: 0 }}>{t.description}</p>
                  {t.quiz && t.quiz.length > 0 && (
                    <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: BRAND.darkTeal, background: BRAND.limeSoft, borderRadius: 6, padding: "3px 8px", fontWeight: 700 }}>
                      <Zap size={11} /> Quiz
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editMode && isEditor && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={startNewTopic} className="onb-btn" style={{ background: "transparent", border: `1px dashed ${BRAND.teal}`, color: BRAND.teal, borderRadius: 10, padding: "10px 20px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Add topic
          </button>
        </div>
      )}

      {active && (
        <TopicViewer
          key={active.id}
          topic={active} slideIdx={slideIdx} setSlideIdx={setSlideIdx} onClose={closeTopic}
          done={!!progress[active.id]} onToggleDone={() => toggleComplete(active.id)}
          editMode={editMode && isEditor} onEdit={() => startEdit(active)}
          userId={session.user.id}
        />
      )}

      {editDraft && (
        <EditModal
          draft={editDraft} setDraft={setEditDraft} onCancel={() => setEditDraft(null)}
          onSave={saveDraft} onDelete={topics.some(t => t.id === editDraft.id) ? () => handleDeleteDraft(editDraft.id) : null}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: BRAND.darkTeal, color: BRAND.white, padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- Topic viewer (slides + quiz) ----------

function TopicViewer({ topic, slideIdx, setSlideIdx, onClose, done, onToggleDone, editMode, onEdit, userId }) {
  const slide = topic.slides[slideIdx] || topic.slides[0];
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const hasQuiz = topic.quiz && topic.quiz.length > 0;

  function pickAnswer(qId, optIdx) {
    if (quizResult) return;
    setQuizAnswers(a => ({ ...a, [qId]: optIdx }));
  }
  async function submitQuiz() {
    const total = topic.quiz.length;
    const correct = topic.quiz.filter(q => quizAnswers[q.id] === q.correct).length;
    setQuizResult({ correct, total });
    try { await saveQuizScore(userId, topic.id, correct, total); } catch {}
  }
  function retryQuiz() { setQuizAnswers({}); setQuizResult(null); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,60,71,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: BRAND.white, borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BRAND.sandBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: BRAND.teal, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>Topic {String(topic.order).padStart(2, "0")}</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: BRAND.darkTeal }}>{topic.title}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {editMode && (
              <button onClick={onEdit} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: 8, color: BRAND.teal }}><Pencil size={15} /></button>
            )}
            <button onClick={onClose} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: 8, color: BRAND.teal }}><X size={15} /></button>
          </div>
        </div>

        <div style={{ padding: "24px", flex: 1 }}>
          {!quizMode && (
            <>
              <div style={{ background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 12, padding: "28px 26px", minHeight: 180 }}>
                <div style={{ fontSize: 11, color: BRAND.teal, marginBottom: 10, fontWeight: 500 }}>Slide {slideIdx + 1} of {topic.slides.length}</div>
                <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700, color: BRAND.darkTeal }}>{slide.title}</h3>
                <ul style={{ margin: 0, paddingLeft: 20, color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}>
                  {slide.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <button disabled={slideIdx === 0} onClick={() => setSlideIdx(i => Math.max(0, i - 1))} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: slideIdx === 0 ? "#B7BDC0" : BRAND.darkTeal, display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><ChevronLeft size={14} /> Previous</button>
                <div style={{ display: "flex", gap: 6 }}>
                  {topic.slides.map((s, i) => <div key={s.id} style={{ width: 6, height: 6, borderRadius: "50%", background: i === slideIdx ? BRAND.teal : BRAND.sandBorder }} />)}
                </div>
                <button disabled={slideIdx === topic.slides.length - 1} onClick={() => setSlideIdx(i => Math.min(topic.slides.length - 1, i + 1))} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: slideIdx === topic.slides.length - 1 ? "#B7BDC0" : BRAND.darkTeal, display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>Next <ChevronRight size={14} /></button>
              </div>

              {topic.ticketLinks && topic.ticketLinks.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND.teal, marginBottom: 10, fontWeight: 700 }}>Related tickets</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topic.ticketLinks.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ color: BRAND.teal, fontSize: 14, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontWeight: 500 }}>
                        <TicketCheck size={13} /> {l.label || l.url} <ExternalLink size={11} style={{ opacity: 0.6 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {topic.links.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND.teal, marginBottom: 10, fontWeight: 700 }}>Links and resources</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topic.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ color: BRAND.teal, fontSize: 14, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontWeight: 500 }}>
                        <Link2 size={13} /> {l.label || l.url} <ExternalLink size={11} style={{ opacity: 0.6 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {topic.tips.length > 0 && (
                <div style={{ marginTop: 22, background: BRAND.limeSoft, borderRadius: 10, padding: "14px 16px" }}>
                  <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND.darkTeal, margin: "0 0 8px", fontWeight: 700 }}>Tips</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: BRAND.darkTeal, fontSize: 13.5, lineHeight: 1.7 }}>
                    {topic.tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}

              {hasQuiz && (
                <button onClick={() => { setQuizMode(true); retryQuiz(); }} className="onb-btn" style={{ marginTop: 22, width: "100%", background: BRAND.darkTeal, color: BRAND.white, border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Zap size={16} color={BRAND.lime} /> Test your knowledge ({topic.quiz.length} question{topic.quiz.length > 1 ? "s" : ""})
                </button>
              )}
            </>
          )}

          {quizMode && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.darkTeal }}>Quick quiz</h3>
                <button onClick={() => setQuizMode(false)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: BRAND.teal }}>Back to slides</button>
              </div>

              {quizResult && (
                <div style={{ background: BRAND.limeSoft, borderRadius: 10, padding: "14px 16px", marginBottom: 18, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.darkTeal }}>{quizResult.correct} / {quizResult.total}</div>
                  <div style={{ fontSize: 13, color: BRAND.darkTeal }}>correct answers</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {topic.quiz.map((q, qi) => (
                  <div key={q.id} style={{ border: `1px solid ${BRAND.sandBorder}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.darkTeal, marginBottom: 10 }}>{qi + 1}. {q.question}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {q.options.map((opt, oi) => {
                        const selected = quizAnswers[q.id] === oi;
                        let bg = BRAND.sand, border = BRAND.sandBorder;
                        if (quizResult) {
                          if (oi === q.correct) { bg = BRAND.limeSoft; border = BRAND.lime; }
                          else if (selected && oi !== q.correct) { bg = "rgba(192,57,43,0.08)"; border = "rgba(192,57,43,0.4)"; }
                        } else if (selected) { bg = BRAND.tealSoft; border = BRAND.teal; }
                        return (
                          <button key={oi} onClick={() => pickAnswer(q.id, oi)} className="onb-btn" style={{ textAlign: "left", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13.5, color: BRAND.darkTeal }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                {!quizResult ? (
                  <button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < topic.quiz.length} className="onb-btn" style={{ width: "100%", background: Object.keys(quizAnswers).length < topic.quiz.length ? BRAND.sandBorder : BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700 }}>
                    Submit answers
                  </button>
                ) : (
                  <button onClick={retryQuiz} className="onb-btn" style={{ width: "100%", background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, color: BRAND.darkTeal, borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700 }}>
                    Retry quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${BRAND.sandBorder}` }}>
          <button onClick={onToggleDone} className="onb-btn" style={{ width: "100%", background: done ? BRAND.lime : BRAND.sand, border: done ? "none" : `1px solid ${BRAND.sandBorder}`, color: BRAND.darkTeal, borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Check size={16} /> {done ? "Topic complete" : "Mark as complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Edit modal ----------

function EditModal({ draft, setDraft, onCancel, onSave, onDelete }) {
  function update(field, value) { setDraft(d => ({ ...d, [field]: value })); }
  function updateSlide(i, field, value) { update("slides", draft.slides.map((s, idx) => idx === i ? { ...s, [field]: value } : s)); }
  function addSlide() { update("slides", [...draft.slides, { id: uid(), title: "", bullets: [""] }]); }
  function removeSlide(i) { update("slides", draft.slides.filter((_, idx) => idx !== i)); }
  function addLink() { update("links", [...draft.links, { label: "", url: "" }]); }
  function updateLink(i, field, value) { update("links", draft.links.map((l, idx) => idx === i ? { ...l, [field]: value } : l)); }
  function removeLink(i) { update("links", draft.links.filter((_, idx) => idx !== i)); }
  function addTicketLink() { update("ticketLinks", [...(draft.ticketLinks || []), { label: "", url: "" }]); }
  function updateTicketLink(i, field, value) { update("ticketLinks", draft.ticketLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l)); }
  function removeTicketLink(i) { update("ticketLinks", draft.ticketLinks.filter((_, idx) => idx !== i)); }

  const quiz = draft.quiz || [];
  function addQuestion() { update("quiz", [...quiz, { id: uid(), question: "", options: ["", ""], correct: 0 }]); }
  function updateQuestion(i, field, value) { update("quiz", quiz.map((q, idx) => idx === i ? { ...q, [field]: value } : q)); }
  function removeQuestion(i) { update("quiz", quiz.filter((_, idx) => idx !== i)); }
  function updateOption(qi, oi, value) { update("quiz", quiz.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q)); }
  function addOption(qi) { update("quiz", quiz.map((q, idx) => idx === qi ? { ...q, options: [...q.options, ""] } : q)); }
  function removeOption(qi, oi) {
    update("quiz", quiz.map((q, idx) => {
      if (idx !== qi) return q;
      const options = q.options.filter((_, j) => j !== oi);
      const correct = q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct;
      return { ...q, options, correct };
    }));
  }

  const inputStyle = { width: "100%", background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, color: BRAND.darkTeal, padding: "8px 10px", fontSize: 13.5, boxSizing: "border-box" };
  const labelStyle = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: BRAND.teal, marginBottom: 5, display: "block", fontWeight: 700 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,60,71,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: BRAND.white, borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${BRAND.sandBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.darkTeal }}>Edit topic</h3>
          <button onClick={onCancel} className="onb-btn" style={{ background: "transparent", border: "none", color: BRAND.teal }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={draft.title} onChange={e => update("title", e.target.value)} placeholder="e.g. Search tickets" />
          </div>
          <div>
            <label style={labelStyle}>Card description</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={draft.description} onChange={e => update("description", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: 8 }}>
              {ICON_PICKER_ORDER.map(key => {
                const Ico = ICONS[key];
                const selected = draft.icon === key;
                return (
                  <button key={key} onClick={() => update("icon", key)} className="onb-btn" title={key} style={{ width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? BRAND.lime : BRAND.white, border: `1px solid ${selected ? BRAND.lime : BRAND.sandBorder}` }}>
                    <Ico size={15} color={BRAND.darkTeal} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 90 }}>
              <label style={labelStyle}>Order</label>
              <input type="number" style={inputStyle} value={draft.order} onChange={e => update("order", Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Presentation slides</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {draft.slides.map((s, i) => (
                <div key={s.id} style={{ border: `1px solid ${BRAND.sandBorder}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input style={inputStyle} placeholder={"Slide " + (i + 1) + " title"} value={s.title} onChange={e => updateSlide(i, "title", e.target.value)} />
                    <button onClick={() => removeSlide(i)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "0 10px", color: "#C0392B" }}><Trash2 size={14} /></button>
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder="One bullet per line" value={s.bullets.join("\n")} onChange={e => updateSlide(i, "bullets", e.target.value.split("\n"))} />
                </div>
              ))}
              <button onClick={addSlide} className="onb-btn" style={{ background: "transparent", border: `1px dashed ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px", color: BRAND.teal, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={14} /> Add slide
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Related customer care tickets</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(draft.ticketLinks || []).map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inputStyle, flex: "0 0 40%" }} placeholder="e.g. Ticket #4821 — refund dispute" value={l.label} onChange={e => updateTicketLink(i, "label", e.target.value)} />
                  <input style={inputStyle} placeholder="https://..." value={l.url} onChange={e => updateTicketLink(i, "url", e.target.value)} />
                  <button onClick={() => removeTicketLink(i)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "0 10px", color: "#C0392B" }}><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={addTicketLink} className="onb-btn" style={{ background: "transparent", border: `1px dashed ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px", color: BRAND.teal, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={14} /> Add related ticket
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Links to manuals and internal resources</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {draft.links.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inputStyle, flex: "0 0 40%" }} placeholder="Label" value={l.label} onChange={e => updateLink(i, "label", e.target.value)} />
                  <input style={inputStyle} placeholder="https://..." value={l.url} onChange={e => updateLink(i, "url", e.target.value)} />
                  <button onClick={() => removeLink(i)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "0 10px", color: "#C0392B" }}><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={addLink} className="onb-btn" style={{ background: "transparent", border: `1px dashed ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px", color: BRAND.teal, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={14} /> Add link
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tips, one per line</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={draft.tips.join("\n")} onChange={e => update("tips", e.target.value.split("\n"))} />
          </div>

          <div>
            <label style={labelStyle}>Quiz questions</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {quiz.map((q, qi) => (
                <div key={q.id} style={{ border: `1px solid ${BRAND.sandBorder}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input style={inputStyle} placeholder={"Question " + (qi + 1)} value={q.question} onChange={e => updateQuestion(qi, "question", e.target.value)} />
                    <button onClick={() => removeQuestion(qi)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "0 10px", color: "#C0392B" }}><Trash2 size={14} /></button>
                  </div>
                  <div style={{ fontSize: 11, color: BRAND.teal, marginBottom: 6 }}>Pick the correct option:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="radio" name={"correct-" + q.id} checked={q.correct === oi} onChange={() => updateQuestion(qi, "correct", oi)} />
                        <input style={{ ...inputStyle, flex: 1 }} placeholder={"Option " + (oi + 1)} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qi, oi)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "0 8px", color: "#C0392B" }}><Trash2 size={12} /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addOption(qi)} className="onb-btn" style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: BRAND.teal, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <Plus size={12} /> Add option
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addQuestion} className="onb-btn" style={{ background: "transparent", border: `1px dashed ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px", color: BRAND.teal, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={14} /> Add quiz question
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 22px", borderTop: `1px solid ${BRAND.sandBorder}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
          {onDelete ? (
            <button onClick={onDelete} className="onb-btn" style={{ background: "transparent", border: "1px solid rgba(192,57,43,0.4)", color: "#C0392B", borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>Delete topic</button>
          ) : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, color: BRAND.teal, borderRadius: 8, padding: "9px 16px", fontSize: 13 }}>Cancel</button>
            <button onClick={onSave} className="onb-btn" style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
