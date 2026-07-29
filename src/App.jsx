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
  Bold, Italic, List, ListOrdered, Heading2, Image as ImageIcon, Link as LinkIcon, Clock,
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
  { id: "search-tickets", estimatedTime: 6, icon: "search", order: 1,
    title: "Search tickets", description: "Browse and filter Freshdesk tickets by month, agent, and reason.",
    slides: [
      { id: "s1", title: "What it's for", bullets: ["- Find tickets that need evaluating", "- Filter by month, agent, or contact reason", "- Already-evaluated tickets are flagged"] },
      { id: "s2", title: "Walkthrough", bullets: ["- Add the real steps here", "- Click Edit content to replace this slide"] },
    ],
    links: [], ticketLinks: [], tips: ["Add a practical tip for new hires here."], quiz: [] },
  { id: "ticket-evaluation", estimatedTime: 8, icon: "clipboardCheck", order: 2,
    title: "Ticket evaluation", description: "Evaluate a ticket with a decision tree — quality, root cause, and improvement ideas.",
    slides: [
      { id: "s1", title: "How it works", bullets: ["- Decision tree: how the ticket was resolved", "- Quality and root cause are picked step by step", "- Score is calculated automatically"] },
    ],
    links: [], ticketLinks: [], tips: ["Add a practical tip for new hires here."], quiz: [] },
  { id: "view-results", estimatedTime: 6, icon: "chart", order: 3,
    title: "View results", description: "Evaluations by quarter, team, and agent — scores, root causes, calibration flags.",
    slides: [ { id: "s1", title: "What's in here", bullets: ["- Filter by quarter, team, agent", "- Score and trend overview", "- Calibration flags"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "calibration-queue", estimatedTime: 5, icon: "target", order: 4,
    title: "Calibration queue", description: "Tickets flagged for calibration, waiting for a group review.",
    slides: [ { id: "s1", title: "How calibration works", bullets: ["- Tickets wait for a team discussion", "- Mark them calibrated once discussed"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "csat-report", estimatedTime: 6, icon: "smile", order: 5,
    title: "CSAT report", description: "Customer satisfaction stats, top agents, and detailed feedback by period.",
    slides: [ { id: "s1", title: "Overview", bullets: ["- CSAT stats by period", "- Top agents", "- Detailed feedback analysis"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "team-management", estimatedTime: 7, icon: "users", order: 6,
    title: "Team management", description: "Create and manage teams, add agents, organize the support structure.",
    slides: [ { id: "s1", title: "What you manage here", bullets: ["- Create and edit teams", "- Add agents", "- Support org structure"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "import-legacy", estimatedTime: 8, icon: "uploadCloud", order: 7,
    title: "Import legacy data", description: "Import evaluations from the old system by pasting Excel table data.",
    slides: [ { id: "s1", title: "How to import", bullets: ["- Paste data copied from Excel", "- Review and confirm the import"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "freshdesk-import", estimatedTime: 7, icon: "sync", order: 8,
    title: "Freshdesk import", description: "Import ticket data directly from Freshdesk exports for evaluation.",
    slides: [ { id: "s1", title: "How it works", bullets: ["- Upload a Freshdesk export", "- Data gets prepped for evaluation"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "export-data", estimatedTime: 5, icon: "downloadCloud", order: 9,
    title: "Export data", description: "Export evaluated tickets to CSV, Excel, or JSON, with optional date filtering.",
    slides: [ { id: "s1", title: "Export formats", bullets: ["- CSV, Excel, JSON", "- Optional date filtering"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "access-log", estimatedTime: 5, icon: "shieldCheck", order: 10,
    title: "Access log", description: "Login and logout activity, IP addresses, and unauthorized access attempts.",
    slides: [ { id: "s1", title: "What to watch for", bullets: ["- Login and logout history", "- IP addresses", "- Unauthorized access attempts"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "changelog", estimatedTime: 4, icon: "history", order: 11,
    title: "Changelog", description: "Recent updates, bug fixes, and new features added to the system.",
    slides: [ { id: "s1", title: "What it's for", bullets: ["- History of system changes", "- New features and fixes"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "debug", estimatedTime: 6, icon: "wrench", order: 12,
    title: "Debug", description: "Inspect data paths, write permissions, JSON integrity, and record counts.",
    slides: [ { id: "s1", title: "When to use it", bullets: ["- Diagnose data issues", "- Check permissions and file integrity"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "migration", estimatedTime: 9, icon: "package", order: 13,
    title: "Migration", description: "One-shot: move old evaluations into the archive and set up the new store.",
    slides: [ { id: "s1", title: "What it does", bullets: ["- Moves old data into the archive", "- Initializes the new evaluations store"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
];

function uid() { return Math.random().toString(36).slice(2, 9); }
const font = "'Inter', 'Graphik', -apple-system, 'Segoe UI', sans-serif";

// ---------- Plain-text content renderer ----------
// Turns an array of stored lines into paragraphs / headings / bullet lists / numbered lists.
// - A line starting with "#", "##", or "###" (followed by a space) becomes a heading.
// - A line starting with "- " or "* " joins (or starts) a bullet list.
// - A line starting with "1. ", "2. ", etc. joins (or starts) a numbered list.
// - Any other non-empty line is its own paragraph.
// - Empty lines close the current list/paragraph and add spacing before the next block.
// Inline markdown (bold, italic, code, links, autolinks, images) is parsed separately by
// renderInline() at render time — the underlying data (bullets / tips arrays) stays plain
// text; only the rendering changes. No HTML is ever parsed or injected (no dangerouslySetInnerHTML).
function parseContentLines(lines) {
  const blocks = [];
  let currentList = null; // { type: "ul" | "ol", items: [] }

  const closeList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  (lines || []).forEach((raw) => {
    const line = (raw ?? "").trim();

    if (line === "") {
      closeList();
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== "space") {
        blocks.push({ type: "space" });
      }
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);

    if (headingMatch) {
      closeList();
      blocks.push({ type: "h" + headingMatch[1].length, text: headingMatch[2] });
    } else if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        closeList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
    } else if (numberMatch) {
      if (!currentList || currentList.type !== "ol") {
        closeList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numberMatch[1]);
    } else {
      closeList();
      blocks.push({ type: "p", text: line });
    }
  });
  closeList();

  // Trailing spacer blocks don't add anything visually — drop them.
  while (blocks.length && blocks[blocks.length - 1].type === "space") blocks.pop();

  return blocks;
}

// Matches, in priority order: images, links, bold, italic, inline code, and bare autolinks.
// Named groups let us tell which alternative matched without juggling numeric indices.
const INLINE_MD_RE =
  /(?<img>!\[(?<imgAlt>[^\]]*)\]\((?<imgUrl>[^\s)]+)\))|(?<link>\[(?<linkLabel>[^\]]*)\]\((?<linkUrl>[^\s)]+)\))|(?<bold>\*\*(?<boldText>[^*]+)\*\*)|(?<italic>\*(?<italicText>[^*]+)\*)|(?<code>`(?<codeText>[^`]+)`)|(?<autolink>https?:\/\/[^\s<>"')\]]+)/g;

// Parses a single line of plain text into safe React nodes — never HTML.
// Supports **bold**, *italic*, `code`, [label](url), bare https:// URLs, and ![alt](url) images.
function renderInline(text, keyBase, linkColor) {
  const nodes = [];
  let lastIndex = 0;
  let match;
  let i = 0;
  INLINE_MD_RE.lastIndex = 0;

  while ((match = INLINE_MD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const g = match.groups;
    const key = `${keyBase}-${i++}`;

    if (g.img) {
      nodes.push(
        <a key={key} href={g.imgUrl} target="_blank" rel="noreferrer">
          <img
            src={g.imgUrl}
            alt={g.imgAlt}
            style={{ maxWidth: "100%", height: "auto", borderRadius: 10, display: "block" }}
          />
        </a>
      );
    } else if (g.link) {
      nodes.push(
        <a key={key} href={g.linkUrl} target="_blank" rel="noreferrer" style={{ color: linkColor, textDecoration: "underline" }}>
          {g.linkLabel}
        </a>
      );
    } else if (g.bold) {
      nodes.push(<strong key={key}>{g.boldText}</strong>);
    } else if (g.italic) {
      nodes.push(<em key={key}>{g.italicText}</em>);
    } else if (g.code) {
      nodes.push(
        <code key={key} style={{ background: BRAND.tealSoft, padding: "1px 5px", borderRadius: 4, fontSize: "0.9em", fontFamily: "ui-monospace, Menlo, monospace" }}>
          {g.codeText}
        </code>
      );
    } else if (g.autolink) {
      nodes.push(
        <a key={key} href={match[0]} target="_blank" rel="noreferrer" style={{ color: linkColor, textDecoration: "underline" }}>
          {match[0]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) INLINE_MD_RE.lastIndex += 1; // guard against zero-length matches
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const HEADING_SIZE = { h1: 1.35, h2: 1.15, h3: 1.0 };

function ContentBlocks({ lines, pStyle, listStyle, liStyle, spacing = 10, linkColor = BRAND.teal }) {
  const blocks = parseContentLines(lines);
  if (blocks.length === 0) return null;
  const baseSize = parseFloat(pStyle?.fontSize) || 14.5;

  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === "p") {
          return <p key={idx} style={{ margin: `0 0 ${spacing}px`, ...pStyle }}>{renderInline(block.text, "p" + idx, linkColor)}</p>;
        }
        if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
          return (
            <p key={idx} style={{ margin: `0 0 ${spacing}px`, ...pStyle, fontSize: baseSize * HEADING_SIZE[block.type], fontWeight: 700 }}>
              {renderInline(block.text, block.type + idx, linkColor)}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={idx} style={{ margin: `0 0 ${spacing}px`, paddingLeft: 20, ...listStyle }}>
              {block.items.map((item, i) => <li key={i} style={liStyle}>{renderInline(item, "ul" + idx + "-" + i, linkColor)}</li>)}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={idx} style={{ margin: `0 0 ${spacing}px`, paddingLeft: 20, ...listStyle }}>
              {block.items.map((item, i) => <li key={i} style={liStyle}>{renderInline(item, "ol" + idx + "-" + i, linkColor)}</li>)}
            </ol>
          );
        }
        // spacer between paragraphs/lists
        return <div key={idx} style={{ height: spacing }} />;
      })}
    </>
  );
}

// ---------- Editor formatting toolbar ----------
// Operates directly on the plain-text string (same one stored as a newline-joined
// line array). Every action edits the raw text and hands the result back through
// onChange — nothing here changes how/where the content is persisted.
function FormattingToolbar({ value, onChange, getTextarea }) {
  const getSelection = () => {
    const el = getTextarea();
    if (!el) return { start: value.length, end: value.length };
    return { start: el.selectionStart ?? value.length, end: el.selectionEnd ?? value.length };
  };

  const focusAndSelect = (start, end) => {
    requestAnimationFrame(() => {
      const el = getTextarea();
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  // Wraps the current selection with `before`/`after` (e.g. ** / **). Falls back to a
  // placeholder word when nothing is selected, so the button always does something useful.
  const wrapSelection = (before, after, placeholder) => {
    const { start, end } = getSelection();
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    focusAndSelect(start + before.length, start + before.length + selected.length);
  };

  // Applies `mapLine(line, lineIndex)` to every line touched by the current selection
  // (or just the current line, if nothing is selected).
  const applyToLines = (mapLine) => {
    const { start, end } = getSelection();
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const segment = value.slice(lineStart, lineEnd);
    const newSegment = segment.split("\n").map(mapLine).join("\n");
    const next = value.slice(0, lineStart) + newSegment + value.slice(lineEnd);
    onChange(next);
    focusAndSelect(lineStart, lineStart + newSegment.length);
  };

  const insertAtCursor = (before, after, placeholder, selectPlaceholder) => {
    const { start, end } = getSelection();
    const label = value.slice(start, end) || placeholder;
    const snippet = before + label + after;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    if (selectPlaceholder) {
      const selStart = start + before.length;
      focusAndSelect(selStart, selStart + label.length);
    } else {
      focusAndSelect(start + snippet.length, start + snippet.length);
    }
  };

  const makeBold = () => wrapSelection("**", "**", "bold text");
  const makeItalic = () => wrapSelection("*", "*", "italic text");
  const makeHeading = () => applyToLines((line, i) => (i === 0 ? (/^#{1,3}\s/.test(line) ? line : "## " + line) : line));
  const makeBulletList = () => applyToLines((line) => (line.trim() === "" ? line : (/^[-*]\s/.test(line) ? line : "- " + line)));
  const makeNumberedList = () => {
    let n = 1;
    applyToLines((line) => {
      if (line.trim() === "") return line;
      const stripped = line.replace(/^\d+\.\s+/, "");
      return `${n++}. ${stripped}`;
    });
  };
  const insertLink = () => insertAtCursor("[", "](https://example.com)", "label", true);
  const insertImage = () => insertAtCursor("![", "](https://example.com/image.png)", "description", true);

  const btnStyle = { background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 6, padding: "5px 7px", color: BRAND.teal, display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
      <button type="button" onClick={makeBold} className="onb-btn" style={btnStyle} title="Bold"><Bold size={13} /></button>
      <button type="button" onClick={makeItalic} className="onb-btn" style={btnStyle} title="Italic"><Italic size={13} /></button>
      <button type="button" onClick={makeHeading} className="onb-btn" style={btnStyle} title="Heading"><Heading2 size={13} /></button>
      <button type="button" onClick={makeBulletList} className="onb-btn" style={btnStyle} title="Bullet list"><List size={13} /></button>
      <button type="button" onClick={makeNumberedList} className="onb-btn" style={btnStyle} title="Numbered list"><ListOrdered size={13} /></button>
      <button type="button" onClick={insertLink} className="onb-btn" style={btnStyle} title="Link"><LinkIcon size={13} /></button>
      <button type="button" onClick={insertImage} className="onb-btn" style={btnStyle} title="Image"><ImageIcon size={13} /></button>
    </div>
  );
}

// ---------- Global search ----------
// Searches across everything the app stores for a topic: title, description, slide
// titles/content, tips, links, related tickets, and quiz questions (+ their options).
// Matching is a simple case-insensitive substring match — fast, predictable, and works
// the same way whether the stored text is plain or uses the markdown syntax above.
const SEARCH_FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "slideTitle", label: "Slide titles" },
  { key: "slideContent", label: "Slide content" },
  { key: "tips", label: "Tips" },
  { key: "links", label: "Links" },
  { key: "tickets", label: "Related tickets" },
  { key: "quiz", label: "Quiz questions" },
];

function getSearchableFieldText(topic, key) {
  switch (key) {
    case "title": return topic.title || "";
    case "description": return topic.description || "";
    case "slideTitle": return (topic.slides || []).map(s => s.title || "").join(" \n ");
    case "slideContent": return (topic.slides || []).flatMap(s => s.bullets || []).join(" \n ");
    case "tips": return (topic.tips || []).join(" \n ");
    case "links": return (topic.links || []).map(l => `${l.label || ""} ${l.url || ""}`).join(" \n ");
    case "tickets": return (topic.ticketLinks || []).map(l => `${l.label || ""} ${l.url || ""}`).join(" \n ");
    case "quiz": return (topic.quiz || []).map(q => `${q.question || ""} ${(q.options || []).join(" ")}`).join(" \n ");
    default: return "";
  }
}

// Returns the list of matched field descriptors ({ key, label }) for a topic, or null
// if the query doesn't match anywhere. `query` is expected to already be trimmed.
function getTopicMatch(topic, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  const matched = SEARCH_FIELDS.filter(f => getSearchableFieldText(topic, f.key).toLowerCase().includes(q));
  return matched.length > 0 ? matched : null;
}

// Splits `text` on (case-insensitive) occurrences of `query` and wraps matches in <mark>.
// Pure substring matching — no regex special characters to worry about.
function highlightText(text, query) {
  if (!text) return text;
  const q = (query || "").trim();
  if (!q) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const nodes = [];
  let start = 0;
  let idx = lowerText.indexOf(lowerQuery, start);
  let i = 0;
  while (idx !== -1) {
    if (idx > start) nodes.push(text.slice(start, idx));
    nodes.push(
      <mark key={i++} style={{ background: BRAND.lime, color: BRAND.darkTeal, borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    start = idx + q.length;
    idx = lowerText.indexOf(lowerQuery, start);
  }
  if (start < text.length) nodes.push(text.slice(start));
  return nodes;
}

// ---------- Estimated learning time ----------
// Stored as a plain integer (minutes) inside each topic's jsonb `data`, alongside
// title/description/slides/etc — no schema change needed. Topics saved before this
// feature existed simply don't have the field, so we default those to 5 minutes.
const DEFAULT_ESTIMATED_MINUTES = 5;

function getEstimatedTime(topic) {
  const val = topic?.estimatedTime;
  return Number.isFinite(val) && val > 0 ? Math.round(val) : DEFAULT_ESTIMATED_MINUTES;
}

// under 60 min -> "45 min"; 60 min or more -> "2h 15m" (or "2h" on an exact hour)
function formatMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Compact rounded form used for the hero's "Learning Time" summary stat, e.g. "33 Hours" / "45 Min".
function formatStatTime(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} Min`;
  const hours = Math.round(mins / 60);
  return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
}

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
  const [searchQuery, setSearchQuery] = useState("");
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
  const remainingMinutes = topics ? topics.filter(t => !progress[t.id]).reduce((sum, t) => sum + getEstimatedTime(t), 0) : 0;
  const totalQuizzes = topics ? topics.reduce((sum, t) => sum + ((t.quiz && t.quiz.length) || 0), 0) : 0;
  const totalLearningMinutes = topics ? topics.reduce((sum, t) => sum + getEstimatedTime(t), 0) : 0;
  const trimmedQuery = searchQuery.trim();
  const filtered = trimmedQuery ? sorted.filter(t => getTopicMatch(t, trimmedQuery)) : sorted;

  function openTopic(id) { setActiveId(id); setSlideIdx(0); }
  function closeTopic() { setActiveId(null); setSlideIdx(0); }
  function startEdit(topic) { setEditDraft(JSON.parse(JSON.stringify(topic))); }
  function startNewTopic() {
    setEditDraft({
      id: "topic-" + uid(), icon: "file",
      order: (topics?.length || 0) + 1, title: "", description: "", estimatedTime: DEFAULT_ESTIMATED_MINUTES,
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

      <div style={{ background: BRAND.darkTeal, color: BRAND.white, padding: "40px 32px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>
            <span>{session.user.email} · {isEditor ? "Editor" : "Viewer"}</span>
            <button onClick={() => supabase.auth.signOut()} className="onb-btn" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
          <div style={{ display: "inline-block", fontSize: 11.5, letterSpacing: "0.16em", color: BRAND.lime, textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>
            Webnode • Customer Care
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Your Learning Hub</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14.5, lineHeight: 1.55, marginTop: 10, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            Learn at your own pace, track your progress, and build confidence with every topic.
          </p>

          {sorted.length > 0 && (
            <div style={{ position: "relative", maxWidth: 420, margin: "22px auto 0" }}>
              <Search size={15} color="rgba(255,255,255,0.55)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topics, slides, tips, links, quizzes…"
                style={{
                  width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, color: BRAND.white,
                  padding: "10px 38px", fontSize: 13.5,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="onb-btn"
                  title="Clear search"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", padding: 4 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {sorted.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 26, overflowX: "auto", padding: "8px 4px", justifyContent: "center" }}>
                {sorted.map((t, i, arr) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
                    <button onClick={() => openTopic(t.id)} title={t.title} className="onb-btn" style={{ width: 13, height: 13, borderRadius: "50%", border: "none", background: progress[t.id] ? BRAND.lime : "rgba(255,255,255,0.25)", boxShadow: progress[t.id] ? "0 0 0 4px rgba(183,239,135,0.25)" : "none" }} />
                    {i < arr.length - 1 && <div style={{ width: 24, height: 2, background: "rgba(255,255,255,0.2)" }} />}
                  </div>
                ))}
              </div>

              {/* Summary stats — computed live from topic data */}
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                {[
                  { icon: FileText, value: totalCount, label: totalCount === 1 ? "Topic" : "Topics" },
                  { icon: Zap, value: totalQuizzes, label: totalQuizzes === 1 ? "Quiz" : "Quizzes" },
                  { icon: Clock, value: formatStatTime(totalLearningMinutes), label: "Learning Time" },
                ].map((stat, idx) => (
                  <div key={idx} style={{ flex: "1 1 120px", minWidth: 110, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 10px" }}>
                    <stat.icon size={14} color={BRAND.lime} style={{ marginBottom: 4 }} />
                    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Progress summary — compact cards replacing the old plain-text lines */}
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px", minWidth: 170, background: "rgba(183,239,135,0.1)", border: "1px solid rgba(183,239,135,0.3)", borderRadius: 12, padding: "12px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: BRAND.lime, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={15} color={BRAND.darkTeal} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>Progress</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{totalDone} / {totalCount} topics</div>
                  </div>
                </div>
                <div style={{ flex: "1 1 180px", minWidth: 170, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Clock size={15} color={BRAND.white} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>Remaining Learning Time</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{formatMinutes(remainingMinutes)}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isEditor && (
            <button
              className="onb-btn"
              onClick={() => setEditMode(e => !e)}
              style={{
                marginTop: 20, background: editMode ? BRAND.lime : "transparent",
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
      ) : trimmedQuery && filtered.length === 0 ? (
        <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center", color: BRAND.teal }}>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>No topics match "{searchQuery}".</p>
          <button onClick={() => setSearchQuery("")} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, color: BRAND.teal, borderRadius: 8, padding: "8px 16px", fontSize: 13 }}>
            Clear search
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
            {filtered.map(t => {
              const Icon = ICONS[t.icon] || FileText;
              const done = !!progress[t.id];
              const match = trimmedQuery ? getTopicMatch(t, trimmedQuery) : null;
              const otherMatches = match ? match.filter(f => f.key !== "title" && f.key !== "description").map(f => f.label) : [];
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
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 6px" }}>{trimmedQuery ? highlightText(t.title, trimmedQuery) : t.title}</h3>
                  <p style={{ fontSize: 13, color: BRAND.teal, lineHeight: 1.55, margin: 0 }}>{trimmedQuery ? highlightText(t.description, trimmedQuery) : t.description}</p>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: BRAND.teal }}>
                    <Clock size={12} /> {formatMinutes(getEstimatedTime(t))}
                  </div>
                  {otherMatches.length > 0 && (
                    <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: BRAND.teal, background: BRAND.tealSoft, borderRadius: 6, padding: "3px 8px" }}>
                      <Search size={11} /> Matches in {otherMatches.join(", ")}
                    </div>
                  )}
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: BRAND.darkTeal }}>{topic.title}</h2>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: BRAND.teal, background: BRAND.tealSoft, borderRadius: 999, padding: "3px 10px" }}>
                <Clock size={12} /> {formatMinutes(getEstimatedTime(topic))}
              </span>
            </div>
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
                <div style={{ color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}>
                  <ContentBlocks
                    lines={slide.bullets}
                    pStyle={{ color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}
                    listStyle={{ color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}
                  />
                </div>
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
                  <div style={{ color: BRAND.darkTeal, fontSize: 13.5, lineHeight: 1.7 }}>
                    <ContentBlocks
                      lines={topic.tips}
                      pStyle={{ color: BRAND.darkTeal, fontSize: 13.5, lineHeight: 1.7 }}
                      listStyle={{ color: BRAND.darkTeal, fontSize: 13.5, lineHeight: 1.7, paddingLeft: 18 }}
                      spacing={8}
                    />
                  </div>
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
  const slideTextareaRefs = useRef({});
  const tipsTextareaRef = useRef(null);
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
            <div style={{ width: 140 }}>
              <label style={labelStyle}>Est. time (min)</label>
              <input
                type="number"
                min="1"
                style={inputStyle}
                value={draft.estimatedTime ?? DEFAULT_ESTIMATED_MINUTES}
                onChange={e => update("estimatedTime", Math.max(1, Number(e.target.value) || DEFAULT_ESTIMATED_MINUTES))}
              />
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
                  <FormattingToolbar
                    value={s.bullets.join("\n")}
                    onChange={newValue => updateSlide(i, "bullets", newValue.split("\n"))}
                    getTextarea={() => slideTextareaRefs.current[s.id]}
                  />
                  <textarea
                    ref={el => { slideTextareaRefs.current[s.id] = el; }}
                    style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                    placeholder={"One line per paragraph. Start a line with \"- \" for a bullet, or \"1. \" for a numbered list. Leave a line blank for spacing. Supports **bold**, *italic*, `code`, # headings, and [links](https://...)."}
                    value={s.bullets.join("\n")}
                    onChange={e => updateSlide(i, "bullets", e.target.value.split("\n"))}
                  />
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
            <label style={labelStyle}>Tips</label>
            <FormattingToolbar
              value={draft.tips.join("\n")}
              onChange={newValue => update("tips", newValue.split("\n"))}
              getTextarea={() => tipsTextareaRef.current}
            />
            <textarea
              ref={tipsTextareaRef}
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              placeholder={"One line per paragraph. Start a line with \"- \" for a bullet, or \"1. \" for a numbered list. Leave a line blank for spacing. Supports **bold**, *italic*, `code`, # headings, and [links](https://...)."}
              value={draft.tips.join("\n")}
              onChange={e => update("tips", e.target.value.split("\n"))}
            />
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
