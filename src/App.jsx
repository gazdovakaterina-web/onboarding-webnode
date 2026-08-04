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
  Underline, Quote, Undo, Redo, Heading3, ListTodo,
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

// Not used yet — topics don't have a `category` field today. This is here so that once
// one is added (e.g. "product", "domains", "billing", "email", "seo", "gettingStarted"),
// topics without an explicit `icon` can automatically fall back to a sensible
// category-appropriate icon instead of the generic FileText default.
const CATEGORY_ICONS = {
  product: Package,
  domains: Globe,
  billing: CreditCard,
  email: Mail,
  seo: BarChart3,
  gettingStarted: Star,
};

// Central place that decides which icon a topic's card/header shows. Resolution order:
// 1. an explicit per-topic `icon` key (today's only source — unchanged behavior)
// 2. a `category`-based default (future: once topics gain a `category` field)
// 3. FileText as a last-resort fallback
// Keeping this logic in one function means adding real categorization later is a data
// change plus a one-line lookup, not a rewrite of every place an icon is rendered.
function getTopicIconComponent(topic) {
  if (topic?.icon && ICONS[topic.icon]) return ICONS[topic.icon];
  if (topic?.category && CATEGORY_ICONS[topic.category]) return CATEGORY_ICONS[topic.category];
  return FileText;
}

// Small rounded icon badge used on topic cards (and reusable anywhere else a topic's
// icon needs to render). Size/colors are configurable so it can be reused at other
// scales later without duplicating the lookup logic above.
function TopicIcon({ topic, size = 20, boxSize = 40, color = BRAND.teal, background = BRAND.tealSoft }) {
  const Icon = getTopicIconComponent(topic);
  return (
    <div style={{ width: boxSize, height: boxSize, borderRadius: 10, background, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={size} color={color} strokeWidth={1.8} />
    </div>
  );
}

const ICON_PICKER_ORDER = [
  "search", "clipboardCheck", "chart", "target", "smile", "users", "mail",
  "messageSquare", "phone", "uploadCloud", "downloadCloud", "sync", "database",
  "fileSpreadsheet", "clipboard", "shieldCheck", "lock", "history", "wrench",
  "package", "settings", "book", "helpCircle", "globe", "calendar",
  "alertTriangle", "star", "zap", "bell", "mapPin", "award", "lightbulb", "file",
];

// ---------- Topic categories ----------
// Registry-driven so the homepage can render one section per category without any
// hardcoded "if getting_started render X, if product render Y" branching. Adding a
// third section later (Internal Processes, Sales, Technical, …) is just adding an entry
// here — the grouping/rendering logic below needs no changes.
//
// `tracksXp` decides whether a category's topics count toward the Product Academy XP
// bar / Learning Levels, or are tracked as a simple onboarding completion count instead
// (see categoryTracksXp below). Getting Started is onboarding, not product learning, so
// it's excluded; everything else defaults to counting (see categoryTracksXp's fallback),
// so a brand new category added later "just works" as part of learning progress unless
// explicitly opted out here.
const TOPIC_CATEGORIES = [
  { key: "getting_started", emoji: "🚀", label: "Getting Started", description: "Everything you need during your first days at Webnode.", tracksXp: false },
  { key: "product", emoji: "📚", label: "Product Academy", description: "Build your product knowledge and customer support skills.", tracksXp: true },
];
const TOPIC_CATEGORY_MAP = Object.fromEntries(TOPIC_CATEGORIES.map(c => [c.key, c]));
const DEFAULT_TOPIC_CATEGORY = "product";

// ---------- Backward compatibility: inferring a missing category ----------
// Topics created before the Getting Started / Product Academy split (or restored from
// an older export/backup) have no `category` field at all — `topic.category` is
// `undefined` or explicitly `null`. Rather than lumping every one of those into Product
// Academy (which would silently count onboarding topics toward XP and Learning Levels),
// infer a category from the topic's title, the same way a human skimming the list would.
// Titles that look like onboarding content map to Getting Started; anything else —
// recognized product topics or anything unrecognized — falls through to Product
// Academy, same as the old flat default. This keeps existing data working correctly with
// zero manual database edits; see migrateLegacyTopics() in Hub for optionally writing
// the inferred value back so it becomes explicit.
const ONBOARDING_TITLE_KEYWORDS = [
  "welcome", "communication", "feedback", "culture", "internal rules",
  "office", "practical", "who can help", "onboarding", "journey", "life at webnode",
];

function inferCategoryFromTitle(title) {
  const t = (title || "").toLowerCase();
  return ONBOARDING_TITLE_KEYWORDS.some(kw => t.includes(kw)) ? "getting_started" : DEFAULT_TOPIC_CATEGORY;
}

function getTopicCategory(topic) {
  return topic?.category || inferCategoryFromTitle(topic?.title);
}

// Whether a category's topics count toward Product Academy XP / Learning Levels. A
// category not found in TOPIC_CATEGORIES (e.g. one set directly in the database, ahead
// of a code deploy) defaults to `true` — new categories are assumed to be learning
// content unless explicitly marked as onboarding via `tracksXp: false` above.
function categoryTracksXp(categoryKey) {
  const cat = TOPIC_CATEGORY_MAP[categoryKey];
  return cat ? cat.tracksXp !== false : true;
}

// Turns "sales_enablement" into "Sales Enablement" — used so a category that hasn't been
// added to TOPIC_CATEGORIES yet (e.g. set directly in the database) still gets a readable
// section heading instead of breaking or being silently dropped from the homepage.
function humanizeCategoryKey(key) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Groups a flat topic list into ordered sections: known categories first (in the order
// declared in TOPIC_CATEGORIES), then any other category present in the data, in the
// order it was first encountered. Categories with zero topics (e.g. filtered out by
// search) simply produce no section — callers don't need to special-case "empty".
function groupTopicsIntoSections(topicsList) {
  const byCategory = {};
  const encounterOrder = [];
  topicsList.forEach(t => {
    const key = getTopicCategory(t);
    if (!byCategory[key]) { byCategory[key] = []; encounterOrder.push(key); }
    byCategory[key].push(t);
  });

  const sections = [];
  const used = new Set();
  TOPIC_CATEGORIES.forEach(cat => {
    if (byCategory[cat.key]?.length) {
      sections.push({ ...cat, topics: byCategory[cat.key] });
      used.add(cat.key);
    }
  });
  encounterOrder.forEach(key => {
    if (used.has(key)) return;
    sections.push({ key, emoji: "📁", label: humanizeCategoryKey(key), description: "More learning topics.", topics: byCategory[key] });
  });
  return sections;
}

// One topic card — used inside every category section. Kept as its own component so the
// section-rendering loop below stays simple regardless of how many sections there are.
function TopicCard({ topic: t, done, editMode, trimmedQuery, onOpen, onEdit }) {
  const match = trimmedQuery ? getTopicMatch(t, trimmedQuery) : null;
  const otherMatches = match ? match.filter(f => f.key !== "title" && f.key !== "description").map(f => f.label) : [];

  return (
    <div className="onb-card" onClick={onOpen} style={{ background: done ? BRAND.limeSoft : BRAND.white, border: `1px solid ${done ? "rgba(183,239,135,0.6)" : BRAND.sandBorder}`, borderTop: `3px solid ${done ? BRAND.lime : BRAND.teal}`, borderRadius: 12, padding: "20px 20px 18px", position: "relative" }}>
      {editMode && (
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="onb-btn" style={{ position: "absolute", top: 12, right: 12, background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 6, padding: 5, color: BRAND.teal }}>
          <Pencil size={13} />
        </button>
      )}
      {done && (
        <div style={{ position: "absolute", top: 12, right: editMode ? 42 : 12, width: 22, height: 22, borderRadius: "50%", background: BRAND.lime, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={13} color={BRAND.darkTeal} />
        </div>
      )}
      <TopicIcon topic={t} />
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "14px 0 6px" }}>{trimmedQuery ? highlightText(t.title, trimmedQuery) : t.title}</h3>
      <p style={{ fontSize: 13, color: BRAND.teal, lineHeight: 1.55, margin: 0 }}>{trimmedQuery ? highlightText(t.description, trimmedQuery) : t.description}</p>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12, color: BRAND.teal }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {formatMinutes(getEstimatedTime(t))}</span>
        {categoryTracksXp(getTopicCategory(t)) && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Star size={12} /> {getTopicXp(t)} XP</span>
        )}
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
}

// A search "hit" for My Notebook, shown alongside topic cards on the homepage when the
// search query matches something inside the notebook. Clicking it opens the Notebook
// already focused on that match (see openNotebookSearch in Hub).
function NotebookSearchResult({ query, snippet, onOpen }) {
  return (
    <div
      className="onb-card"
      onClick={onOpen}
      style={{ background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderTop: `3px solid ${BRAND.lime}`, borderRadius: 12, padding: "18px 20px", marginBottom: 24, maxWidth: 640 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: BRAND.darkTeal, marginBottom: 6 }}>
        <span aria-hidden="true">📝</span> My Notebook
      </div>
      <p style={{ fontSize: 13, color: BRAND.teal, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
        "{highlightText(snippet, query)}"
      </p>
      <div style={{ marginTop: 8, fontSize: 12, color: BRAND.teal, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
        Open notebook <ChevronRight size={12} />
      </div>
    </div>
  );
}

const DEFAULT_TOPICS = [
  { id: "search-tickets", category: "product", estimatedTime: 6, icon: "search", order: 1,
    title: "Search tickets", description: "Browse and filter Freshdesk tickets by month, agent, and reason.",
    slides: [
      { id: "s1", title: "What it's for", bullets: ["- Find tickets that need evaluating", "- Filter by month, agent, or contact reason", "- Already-evaluated tickets are flagged"] },
      { id: "s2", title: "Walkthrough", bullets: ["- Add the real steps here", "- Click Edit content to replace this slide"] },
    ],
    links: [], ticketLinks: [], tips: ["Add a practical tip for new hires here."], quiz: [] },
  { id: "ticket-evaluation", category: "product", estimatedTime: 8, icon: "clipboardCheck", order: 2,
    title: "Ticket evaluation", description: "Evaluate a ticket with a decision tree — quality, root cause, and improvement ideas.",
    slides: [
      { id: "s1", title: "How it works", bullets: ["- Decision tree: how the ticket was resolved", "- Quality and root cause are picked step by step", "- Score is calculated automatically"] },
    ],
    links: [], ticketLinks: [], tips: ["Add a practical tip for new hires here."], quiz: [] },
  { id: "view-results", category: "product", estimatedTime: 6, icon: "chart", order: 3,
    title: "View results", description: "Evaluations by quarter, team, and agent — scores, root causes, calibration flags.",
    slides: [ { id: "s1", title: "What's in here", bullets: ["- Filter by quarter, team, agent", "- Score and trend overview", "- Calibration flags"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "calibration-queue", category: "product", estimatedTime: 5, icon: "target", order: 4,
    title: "Calibration queue", description: "Tickets flagged for calibration, waiting for a group review.",
    slides: [ { id: "s1", title: "How calibration works", bullets: ["- Tickets wait for a team discussion", "- Mark them calibrated once discussed"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "csat-report", category: "product", estimatedTime: 6, icon: "smile", order: 5,
    title: "CSAT report", description: "Customer satisfaction stats, top agents, and detailed feedback by period.",
    slides: [ { id: "s1", title: "Overview", bullets: ["- CSAT stats by period", "- Top agents", "- Detailed feedback analysis"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "team-management", category: "product", estimatedTime: 7, icon: "users", order: 6,
    title: "Team management", description: "Create and manage teams, add agents, organize the support structure.",
    slides: [ { id: "s1", title: "What you manage here", bullets: ["- Create and edit teams", "- Add agents", "- Support org structure"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "import-legacy", category: "product", estimatedTime: 8, icon: "uploadCloud", order: 7,
    title: "Import legacy data", description: "Import evaluations from the old system by pasting Excel table data.",
    slides: [ { id: "s1", title: "How to import", bullets: ["- Paste data copied from Excel", "- Review and confirm the import"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "freshdesk-import", category: "product", estimatedTime: 7, icon: "sync", order: 8,
    title: "Freshdesk import", description: "Import ticket data directly from Freshdesk exports for evaluation.",
    slides: [ { id: "s1", title: "How it works", bullets: ["- Upload a Freshdesk export", "- Data gets prepped for evaluation"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "export-data", category: "product", estimatedTime: 5, icon: "downloadCloud", order: 9,
    title: "Export data", description: "Export evaluated tickets to CSV, Excel, or JSON, with optional date filtering.",
    slides: [ { id: "s1", title: "Export formats", bullets: ["- CSV, Excel, JSON", "- Optional date filtering"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "access-log", category: "product", estimatedTime: 5, icon: "shieldCheck", order: 10,
    title: "Access log", description: "Login and logout activity, IP addresses, and unauthorized access attempts.",
    slides: [ { id: "s1", title: "What to watch for", bullets: ["- Login and logout history", "- IP addresses", "- Unauthorized access attempts"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "changelog", category: "product", estimatedTime: 4, icon: "history", order: 11,
    title: "Changelog", description: "Recent updates, bug fixes, and new features added to the system.",
    slides: [ { id: "s1", title: "What it's for", bullets: ["- History of system changes", "- New features and fixes"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "debug", category: "product", estimatedTime: 6, icon: "wrench", order: 12,
    title: "Debug", description: "Inspect data paths, write permissions, JSON integrity, and record counts.",
    slides: [ { id: "s1", title: "When to use it", bullets: ["- Diagnose data issues", "- Check permissions and file integrity"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "migration", category: "product", estimatedTime: 9, icon: "package", order: 13,
    title: "Migration", description: "One-shot: move old evaluations into the archive and set up the new store.",
    slides: [ { id: "s1", title: "What it does", bullets: ["- Moves old data into the archive", "- Initializes the new evaluations store"] } ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "life-at-webnode", category: "getting_started", estimatedTime: 8, icon: "mapPin", order: 103,
    title: "Life at Webnode", description: "How everyday life, support, and culture work here — who to ask, where things are, and how we work together.",
    slides: [
      { id: "s1", title: "Your support network", bullets: [
        "During onboarding you're never figuring things out alone. There's a simple chain to lean on:",
        "1. Your trainer — your first stop for day-to-day questions",
        "2. Your Team Leader — for anything your trainer can't answer, or team/process questions",
        "3. Senior agents — happy to help with tricky tickets or product knowledge",
        "Add the real names and contacts for your team here.",
      ] },
      { id: "s2", title: "Who to ask, for what", bullets: [
        "Different questions go to different people. As a rule of thumb:",
        "- Product or ticket questions → your trainer or a senior agent",
        "- Team, schedule, or performance questions → your Team Leader",
        "- Payroll, contracts, time off → HR",
        "- Laptop, accounts, access issues → ITC",
        "- Building, badges, visitors → Reception",
      ] },
      { id: "s3", title: "HR", bullets: [
        "- Add HR's contact details and office location here",
        "- What HR helps with: contracts, payroll, time off, benefits",
        "- Add a link to the HR request/ticket system if there is one",
      ] },
      { id: "s4", title: "Reception", bullets: [
        "- Add reception's location and contact details here",
        "- What reception helps with: visitors, deliveries, badges, meeting rooms",
      ] },
      { id: "s5", title: "ITC", bullets: [
        "- Add ITC's contact details here",
        "- What ITC helps with: laptop setup, account access, software installs, hardware issues",
        "- Add a link to the IT helpdesk/ticket system if there is one",
      ] },
      { id: "s6", title: "Kitchen & office", bullets: [
        "- Add kitchen location, opening hours, and house rules here",
        "- Add any office-specific info: parking, lockers, meeting rooms, quiet zones",
      ] },
      { id: "s7", title: "Internal communication", bullets: [
        "- Add the primary chat tool here (e.g. Slack) and which channels to join first",
        "- Add guidance on when to use chat vs. email vs. a quick call",
        "- Add a link to the internal wiki or knowledge base if there is one",
      ] },
      { id: "s8", title: "Company culture", bullets: [
        "A few things that shape how we work day to day:",
        "- We're on a first-name basis with everyone, no matter the role",
        "- Punctuality matters — for shifts, meetings, and breaks",
        "- We help each other out — asking questions is expected, not a weakness",
        "Add more specifics about your team's culture here.",
      ] },
    ],
    links: [], ticketLinks: [], tips: ["No question is too small — asking early saves time for everyone later."], quiz: [] },

  // ---- Getting Started (onboarding/company knowledge) — placeholder content ----
  { id: "welcome-to-webnode", category: "getting_started", estimatedTime: 5, icon: "smile", order: 101,
    title: "Welcome to Webnode", description: "A quick introduction to who we are and what to expect from your first days.",
    slides: [
      { id: "s1", title: "Welcome", bullets: [
        "Welcome to the team! This topic is a placeholder — an editor will fill in the real welcome content here.",
        "- Add a short intro to Webnode as a company",
        "- Add what makes us different and what we're proud of",
        "- Add a friendly note on what to expect from onboarding",
      ] },
    ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "onboarding-journey", category: "getting_started", estimatedTime: 5, icon: "target", order: 102,
    title: "Your Onboarding Journey", description: "What the next few weeks look like, step by step.",
    slides: [
      { id: "s1", title: "The journey ahead", bullets: [
        "Placeholder — add the real onboarding timeline here.",
        "- Add key milestones (e.g. week 1, week 2, first solo shift)",
        "- Add what's expected of you at each stage",
        "- Add where to track your own progress (this Learning Hub!)",
      ] },
    ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "who-can-help-me", category: "getting_started", estimatedTime: 5, icon: "helpCircle", order: 104,
    title: "Who Can Help Me?", description: "A quick-reference guide to who to contact for what.",
    slides: [
      { id: "s1", title: "Quick reference", bullets: [
        "Placeholder — add a short quick-reference list here (this can complement the fuller version in Life at Webnode).",
        "- Add your trainer's name and contact",
        "- Add your Team Leader's name and contact",
        "- Add where to find the full support-network breakdown",
      ] },
    ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "communication-feedback", category: "getting_started", estimatedTime: 5, icon: "messageSquare", order: 105,
    title: "Communication & Feedback", description: "How we talk to each other, and how feedback works here.",
    slides: [
      { id: "s1", title: "How we communicate", bullets: [
        "Placeholder — add the real content here.",
        "- Add which channels we use and when (chat, email, calls, standups)",
        "- Add how and when feedback is given (1:1s, reviews, informal check-ins)",
        "- Add how to give feedback upward, not just receive it",
      ] },
    ],
    links: [], ticketLinks: [], tips: [], quiz: [] },
  { id: "office-practical-info", category: "getting_started", estimatedTime: 5, icon: "mapPin", order: 106,
    title: "Office & Practical Information", description: "The practical day-to-day details: where things are and how things work.",
    slides: [
      { id: "s1", title: "The practical stuff", bullets: [
        "Placeholder — add the real content here (this can complement Life at Webnode's Kitchen & office slide).",
        "- Add opening hours, entry/badge info, parking",
        "- Add remote/hybrid work practicalities if relevant",
        "- Add who to contact for facilities issues",
      ] },
    ],
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
//
// My Notebook is a single, topic-independent document (see NotebookPage) and isn't a
// per-topic field, so it can't be one of these SEARCH_FIELDS — it's matched separately,
// via getNotebookSnippet(), and shown alongside these topic results (see Hub).
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

// ---------- Notebook search helpers ----------
// The notebook stores rich HTML (see NotebookEditor below). These helpers turn that
// HTML into plain text so the homepage's global search can match against it and show a
// short "…context around the match…" preview, without ever needing to parse or render
// the HTML itself.
function notebookToPlainText(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

// A notebook counts as empty once tags/whitespace are stripped — this covers both the
// initial "" and the "<p><br></p>" a browser leaves behind after clearing its content.
function isNotebookEmpty(html) {
  return notebookToPlainText(html).length === 0;
}

// First case-insensitive match of `query` inside the notebook's plain text, with a
// short window of surrounding context — or null if there's no match at all.
function getNotebookSnippet(html, query) {
  const q = (query || "").trim();
  if (!q) return null;
  const text = notebookToPlainText(html);
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return null;
  const radius = 60;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

// ---------- Practical exercise completion ----------
// How a topic "ends" is configurable per-topic (see the topic editor's "Completion"
// section) rather than hardcoded per lesson — this is what lets the Blog topic, the
// Business Website topic, or any future practical exercise reuse the exact same submit
// → review → resolve workflow with nothing but different data (attachment type +
// template). Every field here is read through a getter with a safe fallback, so a topic
// saved before this feature existed — which has none of these fields — is simply
// treated as a Standard lesson, unchanged.
const ATTACHMENT_TYPES = [
  { key: "none", label: "None" },
  { key: "url", label: "Website URL", placeholder: "https://…", inputType: "url" },
  // No file-upload storage exists in this app today, so "Screenshot" is a link field
  // (e.g. to an uploaded image, Drive file, or Loom) rather than a real file picker.
  { key: "screenshot", label: "Screenshot", placeholder: "Paste a link to your screenshot", inputType: "url" },
  { key: "ticket", label: "Ticket ID", placeholder: "e.g. #4821", inputType: "text" },
  { key: "text", label: "Text answer", placeholder: "Write your answer…", inputType: "textarea" },
];
const ATTACHMENT_TYPE_MAP = Object.fromEntries(ATTACHMENT_TYPES.map(a => [a.key, a]));
const DEFAULT_ATTACHMENT_TYPE = "none";

const DEFAULT_REVIEW_TEMPLATE =
`Hi!
I've completed this practical exercise.
Website:
{{attachment}}
I'd really appreciate your feedback and suggestions for improvement.
Thank you!`;

function isPracticalExercise(topic) {
  return topic?.completionType === "practical";
}
// Whether this topic ends with "Submit for Review" rather than a plain "Mark as
// complete" — the only flag the rest of the app needs to check.
function requiresTrainerReview(topic) {
  return isPracticalExercise(topic) && !!topic?.requiresReview;
}
function getAttachmentType(topic) {
  return ATTACHMENT_TYPE_MAP[topic?.attachmentType] ? topic.attachmentType : DEFAULT_ATTACHMENT_TYPE;
}
function getReviewTemplate(topic) {
  return typeof topic?.reviewTemplate === "string" && topic.reviewTemplate.trim()
    ? topic.reviewTemplate
    : DEFAULT_REVIEW_TEMPLATE;
}
// Fills {{attachment}} into a review template — every occurrence, so an editor can
// reference it more than once if they want. An empty value leaves a visible placeholder
// rather than a blank gap, since this is shown live while the learner is still typing.
function fillReviewTemplate(template, attachmentValue) {
  const value = (attachmentValue || "").trim();
  return template.replace(/\{\{attachment\}\}/g, value || "___");
}

// ---------- Learning Points (XP) ----------
// Product Academy's progress bar is driven by weighted XP rather than a raw topic count
// or a sum of estimated minutes — a 5-minute topic and a 45-minute topic shouldn't move
// the bar by the same amount. Getting Started doesn't use XP at all (see
// categoryTracksXp) — it's tracked as a plain completion count instead.
//
// Every topic has an authoritative XP value via getTopicXp() below. If a topic (or an
// editor, via the topic editor's "XP" field) has set an explicit `xp`, that's used as-is
// — this is the customization point future work should hook into. Otherwise XP is
// derived once, at read time, from a bucketed estimated-time default so existing/seeded
// content doesn't need anyone to go back and manually weight every topic. Nothing else
// in the app should compute XP from `estimatedTime` directly — always go through
// getTopicXp(), so "customize XP per topic" stays a one-field data change forever.
const XP_BUCKETS = [
  { maxMinutes: 6, xp: 1 },    // small
  { maxMinutes: 12, xp: 2 },   // medium
  { maxMinutes: 20, xp: 3 },   // large
  { maxMinutes: Infinity, xp: 5 }, // complex
];

function estimateXpFromMinutes(minutes) {
  const bucket = XP_BUCKETS.find(b => minutes <= b.maxMinutes);
  return bucket ? bucket.xp : XP_BUCKETS[XP_BUCKETS.length - 1].xp;
}

function getTopicXp(topic) {
  const val = topic?.xp;
  if (Number.isFinite(val) && val > 0) return Math.round(val);
  return estimateXpFromMinutes(getEstimatedTime(topic));
}

// ---------- Learning Levels ----------
// Levels are reached by *percentage* of Product Academy XP completed, not an absolute
// XP number — that's what keeps them meaningful as the catalog grows from 20 topics to
// 100+: a level named for "half the catalog" stays "half the catalog" whether that's 40
// XP or 400 XP, with no threshold retuning needed as content is added.
//
// This list is the single place level count, names, emoji, and thresholds live — adding
// a level, renaming one, or changing a threshold is purely a data change here.
const LEARNING_LEVELS = [
  { key: "new-joiner", emoji: "🌱", label: "New Joiner", minPercent: 0 },
  { key: "explorer", emoji: "🚀", label: "Explorer", minPercent: 15 },
  { key: "builder", emoji: "🛠️", label: "Builder", minPercent: 35 },
  { key: "problem-solver", emoji: "💡", label: "Problem Solver", minPercent: 55 },
  { key: "website-expert", emoji: "⭐", label: "Website Expert", minPercent: 75 },
  { key: "webnode-master", emoji: "🏆", label: "Webnode Master", minPercent: 100 },
];

// The highest level whose threshold a given completion percentage has reached.
function getLearningLevel(percent) {
  let current = LEARNING_LEVELS[0];
  for (const level of LEARNING_LEVELS) {
    if (percent >= level.minPercent) current = level;
  }
  return current;
}

function getLevelIndex(levelKey) {
  const idx = LEARNING_LEVELS.findIndex(l => l.key === levelKey);
  return idx === -1 ? 0 : idx;
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

// "Saved today at 09:42" / "Saved yesterday at 09:42" / "Saved Jul 12 at 09:42"
function formatSavedTime(date) {
  if (!date) return "";
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `yesterday at ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

// "Saved just now" for the first ~45s after a save, then falls back to formatSavedTime's
// "Saved today at 14:37" style. Purely cosmetic — recomputed each render.
function formatSavedLabel(date) {
  if (!date) return "";
  const seconds = (Date.now() - date.getTime()) / 1000;
  return seconds < 45 ? "just now" : formatSavedTime(date);
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
// Generic helpers for a "single private text document per user" table — the shape used
// by `notes`, now a single personal Notebook per user rather than one row per topic.
async function fetchPrivateEntry(table, userId) {
  const { data, error } = await supabase.from(table).select("content, updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data; // null when the user hasn't written anything yet
}
async function upsertPrivateEntry(table, userId, content) {
  const { error } = await supabase.from(table).upsert(
    { user_id: userId, content, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

async function fetchNotebook(userId) { return fetchPrivateEntry("notes", userId); }
async function upsertNotebook(userId, content) { return upsertPrivateEntry("notes", userId, content); }

// ---------- Mentoring Questions ----------
// An asynchronous mentoring conversation attached to a topic: the learner's original
// question, plus zero or more replies (from the learner continuing the conversation, or
// from an editor acting as mentor). Deliberately two tables (questions + replies, see
// schema.sql) rather than one growing text blob, so replies can be attributed to a real
// author/timestamp and queried on their own (e.g. "answered today", further down).
//
// Status vocabulary is normalized across two eras of this feature: the original simple
// "My Questions" to-do list used 'unanswered'/'answered'; this mentoring version uses
// 'waiting' (awaiting a mentor reply) / 'replied' (a mentor answered, awaiting the
// learner) / 'resolved'. Every read goes through normalizeQuestionStatus so old rows
// keep working with zero database migration.
function normalizeQuestionStatus(status) {
  if (status === "unanswered") return "waiting";
  if (status === "answered") return "resolved";
  if (status === "waiting" || status === "replied" || status === "resolved") return status;
  return "waiting"; // unknown/missing — safest default is "still needs a look"
}

const QUESTION_STATUS_META = {
  waiting: { emoji: "🟡", label: "Waiting for reply", color: "#B8860B" },
  replied: { emoji: "💬", label: "Replied", color: "#2E6F8E" },
  resolved: { emoji: "✅", label: "Resolved", color: "#2E7D4F" },
};

// Groundwork for a future FAQ feature (see schema.sql's `normalized_text` column) —
// collapses case/punctuation/whitespace so "How do I add a domain?" and "how do i add a
// domain" would group together once that feature exists. Not read anywhere yet.
function normalizeQuestionText(text) {
  return (text || "").toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

const QUESTION_SELECT_BASE = "id, user_id, topic_id, text, status, created_at, updated_at, question_replies(id, author_id, body, created_at)";
// `kind` distinguishes an ordinary learner question ('question') from a practical
// exercise's "Submit for Review" submission ('review') — see requiresTrainerReview /
// askQuestion's `kind` param. Selected as a separate, optional column (with a fallback
// below) so a Supabase project that hasn't yet run the small migration adding it
// doesn't have Questions break entirely — those rows are just treated as ordinary
// questions (see shapeQuestion's default).
const QUESTION_SELECT = QUESTION_SELECT_BASE + ", kind";

// Turns a raw Supabase row (with its embedded replies) into the shape every part of the
// UI works with: normalized status, replies sorted oldest-first.
function shapeQuestion(row) {
  return {
    id: row.id,
    userId: row.user_id,
    topicId: row.topic_id,
    text: row.text,
    status: normalizeQuestionStatus(row.status),
    kind: row.kind || "question",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replies: (row.question_replies || [])
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(r => ({ id: r.id, authorId: r.author_id, body: r.body, createdAt: r.created_at })),
  };
}

// Every conversation this learner has ever started, across every topic — loaded once
// after login (see Hub's loadAll) and kept fresh afterward via optimistic local updates.
async function fetchMyQuestions(userId) {
  try {
    const { data, error } = await supabase.from("questions").select(QUESTION_SELECT).eq("user_id", userId).order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(shapeQuestion);
  } catch {
    // `kind` isn't migrated on this project yet — retry without it rather than letting
    // Questions fail outright; every row just reads back as an ordinary question.
    const { data, error } = await supabase.from("questions").select(QUESTION_SELECT_BASE).eq("user_id", userId).order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(shapeQuestion);
  }
}

// Editor-only: every learner's conversation, for the Learner Questions inbox — fetched
// lazily (only when that page is opened), not on every login.
async function fetchAllQuestionsForEditors() {
  try {
    const { data, error } = await supabase.from("questions").select(QUESTION_SELECT).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(shapeQuestion);
  } catch {
    const { data, error } = await supabase.from("questions").select(QUESTION_SELECT_BASE).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(shapeQuestion);
  }
}

// So the inbox can show which learner asked, and any reply can show a real identity
// ("Tom (Editor)") instead of a raw user id. Readable by any signed-in user (see
// schema.sql) — needed in both directions: learners need to identify the mentor who
// replied, not just editors needing to identify the learner.
async function fetchAllProfilesLite() {
  const { data, error } = await supabase.from("profiles").select("id, email, role");
  if (error) throw error;
  return data || [];
}

// `kind` defaults to a plain learner question; the "Submit for Review" flow (see
// SubmitForReviewModal) is the only caller that passes `"review"`.
async function askQuestion(userId, topicId, text, kind = "question") {
  const basePayload = { user_id: userId, topic_id: topicId, text, normalized_text: normalizeQuestionText(text), status: "waiting" };
  try {
    const { data, error } = await supabase.from("questions").insert({ ...basePayload, kind }).select(QUESTION_SELECT).single();
    if (error) throw error;
    return shapeQuestion(data);
  } catch {
    // `kind` column missing on this project — insert without it rather than failing
    // the ask entirely; this row will just read back as an ordinary question.
    const { data, error } = await supabase.from("questions").insert(basePayload).select(QUESTION_SELECT_BASE).single();
    if (error) throw error;
    return shapeQuestion(data);
  }
}

// Adds a reply and moves the conversation into whichever court it now belongs in: an
// editor's reply means the learner owes the next response ('replied'); a learner's
// reply means a mentor does ('waiting') — which is also how reopening-via-reply works.
async function replyToQuestion(questionId, authorId, body, isEditorReply) {
  const { data: reply, error: replyErr } = await supabase.from("question_replies")
    .insert({ question_id: questionId, author_id: authorId, body })
    .select("id, author_id, body, created_at")
    .single();
  if (replyErr) throw replyErr;
  const nextStatus = isEditorReply ? "replied" : "waiting";
  const { error: statusErr } = await supabase.from("questions")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (statusErr) throw statusErr;
  return { reply, status: nextStatus };
}

// Used for both "mark as resolved" and "reopen" (reopening just sets status back to
// 'waiting') — deliberately no delete function anywhere in this file: per the design,
// conversations never disappear, they become part of the learner's history.
async function setQuestionStatus(questionId, status) {
  const { error } = await supabase.from("questions").update({ status, updated_at: new Date().toISOString() }).eq("id", questionId);
  if (error) throw error;
}

// Per-user "resource state" facts for external links — currently only "visited", but
// deliberately generic (state is a free-text column, one row per user+url+state) so a
// future "bookmarked" or "reviewed" state is just a new `state` value, not a new table
// or migration. Used only by the Links & Resources section — Related Tickets is untouched.
async function fetchAllLinkStates(userId) {
  const { data, error } = await supabase.from("link_states").select("url, state").eq("user_id", userId);
  if (error) throw error;
  return data || []; // [{ url, state }]
}
// Records that this user has this state for this url. Safe to call repeatedly — the
// unique (user_id, url, state) constraint means a duplicate mark is a harmless no-op.
async function markLinkState(userId, url, state) {
  const { error } = await supabase.from("link_states")
    .upsert({ user_id: userId, url, state }, { onConflict: "user_id,url,state", ignoreDuplicates: true });
  if (error) throw error;
}

// The highest Learning Level milestone this user has already been celebrated for — one
// row per user. Read once at login; written the moment a *new* level is reached, so the
// "🎉 Congratulations" banner only ever shows once per level, even across devices/reloads.
async function fetchMilestoneState(userId) {
  const { data, error } = await supabase.from("learning_milestones").select("level_key").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data; // { level_key } | null
}
async function upsertMilestoneState(userId, levelKey) {
  const { error } = await supabase.from("learning_milestones")
    .upsert({ user_id: userId, level_key: levelKey, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
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
  // ---------- Mentoring Questions ----------
  // Every conversation *this* learner has started, across every topic — a flat list
  // (each item already carries its own topicId), loaded once after login and kept fresh
  // afterward via optimistic local updates (see handleAskQuestion/handleReplyToQuestion/
  // handleSetQuestionStatus below) rather than refetching after every action.
  const [myQuestions, setMyQuestions] = useState([]);
  // Editor-only: every learner's conversation, across every learner/topic — powers the
  // Learner Questions inbox. Fetched once at login for editors only (see loadAll);
  // viewers never fetch or hold this.
  const [allQuestions, setAllQuestions] = useState([]);
  // { [userId]: { id, email, role } } — every signed-in user's public identity, used to
  // label replies ("Tom (Mentor)") and, in the inbox, which learner asked. See
  // fetchAllProfilesLite / the broadened profiles RLS policy in schema.sql.
  const [profilesById, setProfilesById] = useState({});
  const [showQuestionsPage, setShowQuestionsPage] = useState(false); // "My Questions" (everyone)
  const [showQuestionsInbox, setShowQuestionsInbox] = useState(false); // "Learner Questions" (editors)
  // Whether the dedicated Notebook page is open. The notebook's *content* itself lives
  // in the `notebook` hook below (owned here, not inside NotebookPage), so it stays
  // available to the homepage's global search even while this is false.
  const [showNotebook, setShowNotebook] = useState(false);
  const notebook = useNotebookAutosave(session.user.id);
  // Query the Notebook page should open with — set when opening it from a global search
  // match, so the person lands straight on their highlighted note instead of having to
  // search again.
  const [notebookInitialQuery, setNotebookInitialQuery] = useState("");
  // A pending "insert this topic's heading" request from a topic's "Add note" button —
  // { text, key }. `key` (not `text`) is what NotebookEditor keys its insert effect off
  // of, so asking for the same topic twice in a row still triggers a fresh insert.
  const [notebookHeadingRequest, setNotebookHeadingRequest] = useState(null);
  // Local, per-user index of link resource states — currently only "visited" — for the
  // Links & Resources section: { [url]: Set<string> }. Loaded once after login, kept
  // fresh instantly by markLinkVisited's optimistic update. Generic on purpose: adding a
  // "bookmarked" state later needs no new state shape, just another entry in each Set.
  const [linkStatesByUrl, setLinkStatesByUrl] = useState({});
  // The highest Learning Level milestone index this user has already been congratulated
  // for (see LEARNING_LEVELS) — null until fetched, so the celebration effect below can
  // tell "haven't loaded yet" apart from "genuinely never celebrated anything".
  const [highestMilestoneIdx, setHighestMilestoneIdx] = useState(null);
  // The level currently being celebrated, if any — drives the dismissible "🎉
  // Congratulations" banner. Cleared on dismiss; the *database* record of having seen it
  // is written the moment it's detected (not on dismiss), so a refresh never re-shows it.
  const [celebratingLevel, setCelebratingLevel] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    // Promise.allSettled (not .all) deliberately — these are independent features
    // (topics, progress, my Questions, Links & Resources, Learning Milestones,
    // profiles, and — editors only — every learner's Questions). If, say, a table
    // hasn't been migrated yet on someone's Supabase project, that one rejection must
    // not take down the whole homepage and show "No topics yet" even though topics
    // loaded just fine — each piece degrades to an empty/default state on its own.
    const [tRes, pRes, myQRes, lsRes, mRes, profilesRes, allQRes] = await Promise.allSettled([
      fetchTopics(), fetchProgress(session.user.id),
      fetchMyQuestions(session.user.id), fetchAllLinkStates(session.user.id),
      fetchMilestoneState(session.user.id), fetchAllProfilesLite(),
      isEditor ? fetchAllQuestionsForEditors() : Promise.resolve([]),
    ]);

    if (tRes.status === "fulfilled") {
      setTopics(tRes.value);
    } else {
      showToast(tRes.reason?.message || "Couldn't load topics.");
      setTopics([]);
    }

    if (pRes.status === "fulfilled") setProgress(pRes.value);
    else showToast(pRes.reason?.message || "Couldn't load progress.");

    if (myQRes.status === "fulfilled") setMyQuestions(myQRes.value);
    // else: leave My Questions at its initial [] — that table simply isn't set up yet

    if (lsRes.status === "fulfilled") {
      const statesByUrl = {};
      lsRes.value.forEach(row => {
        if (!statesByUrl[row.url]) statesByUrl[row.url] = new Set();
        statesByUrl[row.url].add(row.state);
      });
      setLinkStatesByUrl(statesByUrl);
    }

    if (profilesRes.status === "fulfilled") {
      const map = {};
      profilesRes.value.forEach(p => { map[p.id] = p; });
      setProfilesById(map);
    }

    if (isEditor && allQRes.status === "fulfilled") setAllQuestions(allQRes.value);

    // No row yet (or the fetch failed, e.g. the table isn't migrated yet) means this
    // user has never been congratulated for anything — start them at level 0 (New
    // Joiner) so reaching it is never treated as a "milestone".
    setHighestMilestoneIdx(mRes.status === "fulfilled" && mRes.value ? getLevelIndex(mRes.value.level_key) : 0);
  }

  // Applies the same update to both question lists at once (my own +, if I'm an editor,
  // the everyone-inbox copy) — every mutation below goes through this so the two never
  // drift out of sync with each other.
  function patchQuestion(id, updater) {
    setMyQuestions(prev => prev.map(q => (q.id === id ? updater(q) : q)));
    if (isEditor) setAllQuestions(prev => prev.map(q => (q.id === id ? updater(q) : q)));
  }

  // Optimistic: a new conversation appears instantly; reverted if the write fails.
  // `kind` defaults to a plain learner question; SubmitForReviewModal is the only
  // caller that passes "review" (see requiresTrainerReview / the auto-complete effect
  // below, which watches specifically for review-kind conversations being resolved).
  async function handleAskQuestion(topicId, text, kind = "question") {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const optimistic = { id: tempId, userId: session.user.id, topicId, text, status: "waiting", kind, createdAt: now, updatedAt: now, replies: [] };
    setMyQuestions(prev => [...prev, optimistic]);
    if (isEditor) setAllQuestions(prev => [...prev, optimistic]);
    try {
      const saved = await askQuestion(session.user.id, topicId, text, kind);
      patchQuestion(tempId, () => saved);
    } catch (err) {
      setMyQuestions(prev => prev.filter(q => q.id !== tempId));
      if (isEditor) setAllQuestions(prev => prev.filter(q => q.id !== tempId));
      throw err;
    }
  }

  // Optimistic reply — appends the message locally and flips the conversation into
  // whichever court it now belongs in, before the network round trip confirms it.
  // `isEditorReply` is about who's *acting* right now (mentoring vs. continuing their
  // own conversation), not the viewer's role — an editor asking their own question and
  // replying to it is acting as a learner in that moment.
  async function handleReplyToQuestion(question, text, isEditorReply) {
    const authorId = session.user.id;
    const tempReplyId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const nextStatus = isEditorReply ? "replied" : "waiting";
    patchQuestion(question.id, q => ({
      ...q, status: nextStatus, updatedAt: now,
      replies: [...q.replies, { id: tempReplyId, authorId, body: text, createdAt: now }],
    }));
    try {
      const { reply } = await replyToQuestion(question.id, authorId, text, isEditorReply);
      patchQuestion(question.id, q => ({
        ...q,
        replies: q.replies.map(r => (r.id === tempReplyId ? { id: reply.id, authorId: reply.author_id, body: reply.body, createdAt: reply.created_at } : r)),
      }));
    } catch (err) {
      patchQuestion(question.id, () => question); // revert to the pre-optimistic snapshot
      showToast(err?.message || "Couldn't send your reply. Try again.");
    }
  }

  // Used for both "mark as resolved" and "reopen" (reopening just sets status back to
  // 'waiting', putting it back in front of a mentor).
  async function handleSetQuestionStatus(question, status) {
    patchQuestion(question.id, q => ({ ...q, status, updatedAt: new Date().toISOString() }));
    try {
      await setQuestionStatus(question.id, status);
    } catch (err) {
      patchQuestion(question.id, () => question); // revert
      showToast(err?.message || "Couldn't update this conversation. Try again.");
    }
  }

  // Fire-and-forget: mark a Links & Resources URL as visited. Optimistic (updates the UI
  // immediately) with a silent retry-on-next-click if the write fails — a failed "visited"
  // mark isn't worth interrupting the user with a toast over, since the link still opened.
  function markLinkVisited(url) {
    setLinkStatesByUrl(prev => {
      if (prev[url]?.has("visited")) return prev; // already marked, nothing to do
      const next = { ...prev, [url]: new Set([...(prev[url] || []), "visited"]) };
      return next;
    });
    markLinkState(session.user.id, url, "visited").catch(() => {
      // Leave the optimistic UI state as-is; the next click on this link will just try again.
    });
  }

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  // Opens the Notebook plainly (via the homepage's "Open Notebook" card).
  function openNotebook() {
    setNotebookInitialQuery("");
    setShowNotebook(true);
  }
  // Opens the Notebook already focused on a global-search match.
  function openNotebookSearch(query) {
    setNotebookInitialQuery(query);
    setShowNotebook(true);
  }
  // Topic helper: opens the Notebook and asks it to insert a heading for this topic.
  function openNotebookForTopic(title) {
    setNotebookHeadingRequest({ text: title, key: uid() });
    setNotebookInitialQuery("");
    setShowNotebook(true);
  }
  function closeNotebook() {
    setShowNotebook(false);
    setNotebookHeadingRequest(null);
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

  // ---------- One-time migration for legacy topics ----------
  // The app already infers a missing `category`/`xp` at read time (see
  // getTopicCategory / getTopicXp), so nothing breaks without running this. This is
  // purely optional, for editors who'd rather have those values stored explicitly (e.g.
  // to then hand-tune XP per topic, or fix a mis-inferred category) than re-derived on
  // every load. Safe to run more than once — already-migrated topics are skipped.
  async function migrateLegacyTopics() {
    if (!topics) return;
    const needsMigration = topics.filter(t => !t.category || !Number.isFinite(t.xp) || t.xp <= 0);
    if (needsMigration.length === 0) {
      showToast("Nothing to migrate — every topic already has a section and XP.");
      return;
    }
    setSaving(true);
    let migrated = 0;
    try {
      for (const t of needsMigration) {
        await upsertTopicRow({
          ...t,
          category: t.category || inferCategoryFromTitle(t.title),
          xp: Number.isFinite(t.xp) && t.xp > 0 ? t.xp : getTopicXp(t),
        });
        migrated++;
      }
      await loadAll();
      showToast(`Migrated ${migrated} topic${migrated === 1 ? "" : "s"}.`);
    } catch (err) {
      showToast(err.message || `Migration stopped after ${migrated} topic${migrated === 1 ? "" : "s"} — safe to run again.`);
    }
    setSaving(false);
  }

  const active = topics && activeId ? topics.find(t => t.id === activeId) : null;
  const sorted = topics ? [...topics].sort((a, b) => a.order - b.order) : [];
  const totalCount = topics ? topics.length : 0;
  // Topics missing an explicit `category` and/or valid `xp` — the app already infers
  // sensible values for these at read time, so this count only drives the *optional*
  // "Migrate legacy topics" button, not anything user-facing.
  const legacyTopicCount = topics ? topics.filter(t => !t.category || !Number.isFinite(t.xp) || t.xp <= 0).length : 0;
  const remainingMinutes = topics ? topics.filter(t => !progress[t.id]).reduce((sum, t) => sum + getEstimatedTime(t), 0) : 0;
  const totalQuizzes = topics ? topics.reduce((sum, t) => sum + ((t.quiz && t.quiz.length) || 0), 0) : 0;
  const totalLearningMinutes = topics ? topics.reduce((sum, t) => sum + getEstimatedTime(t), 0) : 0;

  // ---------- Product Academy progress (XP-driven) ----------
  // Only topics from an XP-tracking category (Product Academy, by default) count toward
  // the main progress bar / Learning Levels — see categoryTracksXp. Onboarding
  // categories (Getting Started) are tracked separately, just below.
  const xpTopics = sorted.filter(t => categoryTracksXp(getTopicCategory(t)));
  const totalXp = xpTopics.reduce((sum, t) => sum + getTopicXp(t), 0);
  const completedXp = xpTopics.filter(t => progress[t.id]).reduce((sum, t) => sum + getTopicXp(t), 0);
  const xpPct = totalXp > 0 ? Math.round((completedXp / totalXp) * 100) : 0;
  const currentLevel = getLearningLevel(xpPct);
  const currentLevelIdx = getLevelIndex(currentLevel.key);
  const nextLevel = LEARNING_LEVELS[currentLevelIdx + 1] || null;
  // The next not-yet-completed Product Academy topic, in reading order — what "Continue
  // Learning" jumps to.
  const nextXpTopic = xpTopics.find(t => !progress[t.id]) || null;

  // ---------- Onboarding progress (Getting Started & friends) ----------
  // Every non-XP category gets its own simple "X / Y completed" count — generic so a
  // second onboarding-style category later needs no new code, just tracksXp: false.
  const onboardingSections = TOPIC_CATEGORIES
    .filter(cat => !cat.tracksXp)
    .map(cat => {
      const catTopics = sorted.filter(t => getTopicCategory(t) === cat.key);
      return { ...cat, total: catTopics.length, done: catTopics.filter(t => progress[t.id]).length };
    })
    .filter(section => section.total > 0);

  const trimmedQuery = searchQuery.trim();
  const filtered = trimmedQuery ? sorted.filter(t => getTopicMatch(t, trimmedQuery)) : sorted;
  // My Notebook isn't a topic, so it's matched separately and shown alongside these
  // topic results rather than being one of them.
  const notebookSnippet = trimmedQuery ? getNotebookSnippet(notebook.content, trimmedQuery) : null;
  // Homepage sections (Getting Started / Product Academy / …), computed dynamically —
  // see groupTopicsIntoSections. Built from `filtered` so a search still narrows within
  // each section rather than needing separate search UI per category.
  const topicSections = groupTopicsIntoSections(filtered);
  // Position within its own category — not the raw `order` value, since `order` ranges
  // now vary by category (see DEFAULT_TOPICS) and no longer map 1:1 to "1st, 2nd, 3rd…"
  // Always computed from the full topic list so it stays correct even mid-search.
  const activePositionInCategory = active
    ? sorted.filter(t => getTopicCategory(t) === getTopicCategory(active)).findIndex(t => t.id === active.id) + 1
    : 1;
  // ---------- Questions notification badges (simple version — no read-tracking) ----------
  // Learner badge: conversations currently sitting in 'replied' status are, by
  // definition, ones a mentor has answered and the learner hasn't acted on since —
  // that's "a new reply" without needing a separate "seen" table.
  const myNewReplyCount = myQuestions.filter(q => q.status === "replied").length;
  // Editor badge: every learner's conversation still waiting on a mentor, across
  // everyone — only meaningful (and only fetched) for editors.
  const waitingForEditorCount = isEditor ? allQuestions.filter(q => q.status === "waiting").length : 0;

  function openTopic(id) { setActiveId(id); setSlideIdx(0); }
  function closeTopic() { setActiveId(null); setSlideIdx(0); }
  function continueLearning() { if (nextXpTopic) openTopic(nextXpTopic.id); }

  // Fires the "🎉 Congratulations" banner the moment the person's XP crosses into a new
  // Learning Level they haven't been congratulated for yet — and persists that
  // immediately (not on dismiss), so it can never show twice. Only compares against
  // *higher* levels reached, so completing/un-completing topics around a threshold
  // can't repeatedly re-trigger the same celebration.
  useEffect(() => {
    if (!topics || highestMilestoneIdx === null) return;
    if (currentLevelIdx > highestMilestoneIdx) {
      setCelebratingLevel(currentLevel);
      setHighestMilestoneIdx(currentLevelIdx);
      upsertMilestoneState(session.user.id, currentLevel.key).catch(() => {
        // Worst case this re-shows once on a future reload — not worth interrupting the
        // celebration with an error toast over.
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, highestMilestoneIdx, currentLevelIdx]);

  // Practical exercises: once the review conversation is resolved, treat the topic as
  // complete automatically — for a practical exercise, "the trainer wrapped up their
  // review" is the natural completion signal, not a separate manual step. This only
  // ever reacts to a review-kind conversation (see requiresTrainerReview / the `kind`
  // param on askQuestion) — an ordinary learner question about the same topic being
  // resolved never triggers it. The existing "Mark as complete" toggle still works
  // exactly as before for every topic, standard or practical; this is purely additive.
  useEffect(() => {
    if (!topics) return;
    myQuestions.forEach(q => {
      if (q.kind === "review" && q.status === "resolved" && !progress[q.topicId]) {
        setProgress(p => (p[q.topicId] ? p : { ...p, [q.topicId]: true }));
        setProgressRow(session.user.id, q.topicId, true).catch(() => {
          // Worst case the learner just uses "Mark as complete" manually — not worth a
          // toast over a background convenience.
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myQuestions, topics]);

  function startEdit(topic) { setEditDraft(JSON.parse(JSON.stringify(topic))); }
  function startNewTopic() {
    setEditDraft({
      id: "topic-" + uid(), icon: "file", category: DEFAULT_TOPIC_CATEGORY,
      order: (topics?.length || 0) + 1, title: "", description: "", estimatedTime: DEFAULT_ESTIMATED_MINUTES,
      slides: [{ id: uid(), title: "", bullets: [""] }], links: [], ticketLinks: [], tips: [], quiz: [],
      completionType: "standard", requiresReview: false, attachmentType: DEFAULT_ATTACHMENT_TYPE, reviewTemplate: "",
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

        .onb-editor { outline: none; }
        .onb-editor.onb-empty::before {
          content: attr(data-placeholder);
          color: ${BRAND.teal};
          opacity: 0.55;
          pointer-events: none;
        }
        .onb-editor p { margin: 0 0 10px; }
        .onb-editor h2 { font-size: 1.35em; font-weight: 700; margin: 20px 0 8px; color: ${BRAND.darkTeal}; }
        .onb-editor h3 { font-size: 1.12em; font-weight: 700; margin: 16px 0 6px; color: ${BRAND.darkTeal}; }
        .onb-editor blockquote {
          margin: 10px 0; padding: 4px 16px; border-left: 3px solid ${BRAND.sandBorder};
          color: ${BRAND.teal}; font-style: italic;
        }
        .onb-editor ul, .onb-editor ol { padding-left: 22px; margin: 8px 0; }
        .onb-editor li { margin: 3px 0; }
        .onb-editor a { color: ${BRAND.teal}; text-decoration: underline; cursor: pointer; }
        .onb-editor .onb-checklist { list-style: none; padding-left: 2px; }
        .onb-editor .onb-checklist li { display: flex; align-items: flex-start; gap: 8px; margin: 5px 0; }
        .onb-editor .onb-checklist input[type="checkbox"] { margin-top: 4px; cursor: pointer; }
        .onb-editor .onb-checklist li.onb-checked span { text-decoration: line-through; opacity: 0.5; }
        mark.onb-search-mark { background: ${BRAND.lime}; color: ${BRAND.darkTeal}; border-radius: 2px; padding: 0 1px; }
        mark.onb-search-mark.onb-search-mark-current { background: #F5A623; }
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
              {/* Summary stats — computed live from topic data */}
              <div style={{ display: "flex", gap: 10, marginTop: 30, flexWrap: "wrap" }}>
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

              {/* Product Academy — the main progress panel. Driven by XP, not raw topic
                  count, so a 5-minute topic and a 45-minute topic don't move the bar by
                  the same amount (see getTopicXp / LEARNING_LEVELS). */}
              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14, padding: "18px 20px", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>📚 Product Academy</div>
                  <div style={{ fontSize: 12.5, color: BRAND.lime, fontWeight: 700 }}>
                    {currentLevel.emoji} Level {currentLevelIdx + 1} • {currentLevel.label}
                  </div>
                </div>
                <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                  <div style={{ width: `${xpPct}%`, height: "100%", background: BRAND.lime, borderRadius: 999, transition: "width .3s ease" }} />
                </div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{xpPct}% Complete</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{completedXp} / {totalXp} XP</div>
                </div>
                {nextXpTopic && (
                  <button onClick={continueLearning} className="onb-btn" style={{ marginTop: 14, background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Continue Learning <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* Secondary stats: overall remaining time, plus one simple completion
                  count per onboarding category (Getting Started doesn't use XP or a
                  progress bar — see categoryTracksXp). */}
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px", minWidth: 170, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Clock size={15} color={BRAND.white} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>Remaining Learning Time</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{formatMinutes(remainingMinutes)}</div>
                  </div>
                </div>
                {onboardingSections.map(section => (
                  <div key={section.key} style={{ flex: "1 1 180px", minWidth: 170, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "12px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>
                      {section.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)" }}>{section.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{section.done} / {section.total} completed</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestone celebration — shown once per level (see the effect above),
                  dismissible, and deliberately understated: no confetti, no modal. */}
              {celebratingLevel && (
                <div style={{ marginTop: 14, background: "rgba(183,239,135,0.14)", border: "1px solid rgba(183,239,135,0.4)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left" }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    🎉 <strong>Congratulations!</strong> You've reached <strong>{celebratingLevel.emoji} {celebratingLevel.label}</strong>. Keep going — you're making great progress!
                  </div>
                  <button onClick={() => setCelebratingLevel(null)} className="onb-btn" title="Dismiss" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", flexShrink: 0, display: "flex" }}>
                    <X size={15} />
                  </button>
                </div>
              )}

              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>
                    📝
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>My Notebook</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                      Your personal space for notes, reminders and anything you'd like to remember.
                    </div>
                  </div>
                </div>
                <button
                  onClick={openNotebook}
                  className="onb-btn"
                  style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}
                >
                  Open Notebook
                </button>
              </div>

              {/* My Questions — everyone's personal mentoring-conversation history.
                  Badge wording only changes when there's something new to look at. */}
              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>
                    💬
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>My Questions</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                      {myNewReplyCount > 0
                        ? `🔔 You have ${myNewReplyCount} new repl${myNewReplyCount === 1 ? "y" : "ies"}.`
                        : "Ask a mentor a question from any topic, any time."}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowQuestionsPage(true)} className="onb-btn" style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                  Open
                </button>
              </div>

              {/* Learner Questions — editors only: the mentoring inbox. */}
              {isEditor && (
                <div style={{ marginTop: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>
                      📥
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Learner Questions</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                        {waitingForEditorCount > 0
                          ? `🔔 ${waitingForEditorCount} unanswered learner question${waitingForEditorCount === 1 ? "" : "s"}.`
                          : "Every learner's mentoring conversation, in one inbox."}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowQuestionsInbox(true)} className="onb-btn" style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                    Open
                  </button>
                </div>
              )}
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
      ) : trimmedQuery && filtered.length === 0 && !notebookSnippet ? (
        <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center", color: BRAND.teal }}>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>No topics match "{searchQuery}".</p>
          <button onClick={() => setSearchQuery("")} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, color: BRAND.teal, borderRadius: 8, padding: "8px 16px", fontSize: 13 }}>
            Clear search
          </button>
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 40px" }}>
          {trimmedQuery && notebookSnippet && (
            <NotebookSearchResult query={trimmedQuery} snippet={notebookSnippet} onOpen={() => openNotebookSearch(trimmedQuery)} />
          )}
          {topicSections.map(section => (
            <div key={section.key} style={{ marginBottom: 40 }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: BRAND.darkTeal, margin: "0 0 4px" }}>{section.emoji} {section.label}</h2>
                <p style={{ fontSize: 13.5, color: BRAND.teal, margin: 0 }}>{section.description}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
                {section.topics.map(t => (
                  <TopicCard
                    key={t.id} topic={t} done={!!progress[t.id]} editMode={editMode}
                    trimmedQuery={trimmedQuery}
                    onOpen={() => openTopic(t.id)}
                    onEdit={() => startEdit(t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editMode && isEditor && (
        <div style={{ textAlign: "center", marginTop: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={startNewTopic} className="onb-btn" style={{ background: "transparent", border: `1px dashed ${BRAND.teal}`, color: BRAND.teal, borderRadius: 10, padding: "10px 20px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Add topic
          </button>
          {legacyTopicCount > 0 && (
            <button
              onClick={migrateLegacyTopics}
              disabled={saving}
              className="onb-btn"
              title="Fills in a section and XP value for topics saved before this system existed — safe to run more than once."
              style={{ background: "transparent", border: `1px dashed ${BRAND.teal}`, color: BRAND.teal, borderRadius: 10, padding: "10px 20px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={16} /> Migrate {legacyTopicCount} legacy topic{legacyTopicCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      {active && (
        <TopicViewer
          key={active.id}
          topic={active} slideIdx={slideIdx} setSlideIdx={setSlideIdx} onClose={closeTopic}
          done={!!progress[active.id]} onToggleDone={() => toggleComplete(active.id)}
          editMode={editMode && isEditor} onEdit={() => startEdit(active)}
          userId={session.user.id}
          questions={myQuestions}
          profilesById={profilesById}
          onAskQuestion={handleAskQuestion}
          onReplyToQuestion={handleReplyToQuestion}
          onSetQuestionStatus={handleSetQuestionStatus}
          showToast={showToast}
          linkStatesByUrl={linkStatesByUrl}
          onVisitLink={markLinkVisited}
          positionInCategory={activePositionInCategory}
          onAddNoteForTopic={() => openNotebookForTopic(active.title)}
        />
      )}

      {showNotebook && (
        <NotebookPage
          notebook={notebook}
          onClose={closeNotebook}
          initialQuery={notebookInitialQuery}
          insertHeadingRequest={notebookHeadingRequest}
          onHeadingInserted={() => setNotebookHeadingRequest(null)}
        />
      )}

      {showQuestionsPage && (
        <MyQuestionsPage
          questions={myQuestions}
          topics={sorted}
          profilesById={profilesById}
          userId={session.user.id}
          onReply={(q, text) => handleReplyToQuestion(q, text, false)}
          onSetStatus={handleSetQuestionStatus}
          onClose={() => setShowQuestionsPage(false)}
          onOpenTopic={topicId => { setShowQuestionsPage(false); openTopic(topicId); }}
        />
      )}

      {showQuestionsInbox && (
        <QuestionsInboxPage
          questions={allQuestions}
          topics={sorted}
          profilesById={profilesById}
          viewerUserId={session.user.id}
          onReply={(q, text) => handleReplyToQuestion(q, text, true)}
          onSetStatus={handleSetQuestionStatus}
          onClose={() => setShowQuestionsInbox(false)}
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

// ---------- Personal Notebook ----------
// Drives a single private, per-user autosaving *rich-text* document against a
// "notes"-shaped table (id, user_id, content, updated_at) — one row per user, storing
// HTML (as produced by NotebookEditor below) instead of the plain text it used to hold.
//
// This hook lives at the Hub level (not inside NotebookPage) rather than only while the
// Notebook page is open, for one reason: the homepage's global search needs to be able
// to match against notebook content even while the Notebook itself is closed.
//
// Autosaves 1s after the content changes, never on a timer/interval while the user is
// actively typing, and can be flushed immediately (skipping the debounce) when the
// Notebook page closes. Saves are serialized through a single promise chain
// (`saveChainRef`) so they always reach the table in the order they were made — never
// two in flight at once, so an older request can never resolve after (and overwrite) a
// newer one. `lastSavedRef.current` only advances once a write is confirmed, so a failed
// save can never be mistaken for a saved one.
function useNotebookAutosave(userId) {
  const [content, setContentState] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const contentRef = useRef("");
  const lastSavedRef = useRef("");
  const timerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load this user's notebook once.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setStatus("idle");
    setContentState("");
    contentRef.current = "";
    lastSavedRef.current = "";
    setLastSavedAt(null);
    saveChainRef.current = Promise.resolve(); // fresh queue
    (async () => {
      try {
        const row = await fetchNotebook(userId);
        if (cancelled) return;
        const html = row?.content || "";
        setContentState(html);
        contentRef.current = html;
        lastSavedRef.current = html;
        if (row?.updated_at) { setLastSavedAt(new Date(row.updated_at)); setStatus("saved"); }
      } catch {
        // Editor stays usable even if the initial fetch fails — just no "Saved" timestamp yet.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Appends one save attempt to the end of the chain. Because it's chained off the
  // previous step's promise, it can't start until every earlier-queued save has fully
  // settled — that's what guarantees in-order delivery with no overlap. Reading
  // contentRef.current here (rather than capturing a snapshot at call time) means this
  // step always saves whatever is truly current by the time its turn comes up.
  const enqueueSave = () => {
    saveChainRef.current = saveChainRef.current.then(async () => {
      const html = contentRef.current;
      if (html === lastSavedRef.current) return; // nothing new since the last confirmed save
      if (mountedRef.current) setStatus("saving");
      try {
        await upsertNotebook(userId, html);
        lastSavedRef.current = html; // only advance this on confirmed success
        if (mountedRef.current) {
          setContentState(html); // keeps global search reading the latest saved text
          setLastSavedAt(new Date());
          setStatus("saved");
        }
      } catch {
        if (mountedRef.current) setStatus("error");
      }
    });
    return saveChainRef.current;
  };

  // Saves immediately, skipping the debounce — used when the Notebook page closes, so a
  // pending debounce is superseded rather than lost.
  const flush = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    enqueueSave();
  };

  // Updates the Hub-level `content` state right away (rather than waiting for the save
  // round trip) — called when the Notebook page closes, so global search reflects the
  // latest text immediately even before the network request settles.
  const syncNow = () => setContentState(contentRef.current);

  // Called by NotebookEditor on every input. Debounced 1s. Doesn't touch React state on
  // every keystroke — the editor itself is uncontrolled, so there's no risk of the
  // cursor jumping while the user types.
  function handleContentChange(html) {
    contentRef.current = html;
    if (!loaded) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      enqueueSave();
    }, 1000);
  }

  // Flush any pending save if the whole Hub unmounts (e.g. sign-out) with edits pending.
  useEffect(() => () => { flush(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { content, loaded, status, lastSavedAt, handleContentChange, flush, syncNow };
}

// ---------- Notebook rich text editor ----------
// A small, dependency-free contentEditable editor — enough of a "Notion-lite" writing
// surface (bold/italic/underline, headings, lists, checklists, blockquotes, links,
// undo/redo) without pulling in a full editor framework. Formatting commands go through
// the browser's own execCommand, which is deprecated but still broadly supported for
// exactly this kind of lightweight use.
//
// The editor is intentionally uncontrolled: React sets its innerHTML exactly once, the
// moment the notebook finishes loading (see the hydrate effect below); every keystroke
// after that is left entirely to the browser. That's what keeps the cursor from ever
// jumping around while autosave runs in the background.
function NotebookEditor({ containerRef, content, loaded, searching, onChangeHtml, placeholder, insertHeadingRequest, onHeadingInserted }) {
  const hydratedRef = useRef(false); // whether innerHTML has been set for this mount yet

  const updateEmptyState = () => {
    const el = containerRef.current;
    if (!el) return;
    el.classList.toggle("onb-empty", isNotebookEmpty(el.innerHTML));
  };

  // Hydrate the editor exactly once, the moment the notebook finishes loading.
  useEffect(() => {
    if (!loaded || hydratedRef.current || !containerRef.current) return;
    containerRef.current.innerHTML = content || "";
    hydratedRef.current = true;
    updateEmptyState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Topic helper: append a heading for the topic the person came from, then focus it so
  // they can start typing straight under it.
  useEffect(() => {
    if (!insertHeadingRequest || !hydratedRef.current || !containerRef.current) return;
    const el = containerRef.current;
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    if (!isNotebookEmpty(el.innerHTML)) document.execCommand("insertHTML", false, "<p><br></p>");
    document.execCommand("insertHTML", false, `<h2>${escapeHtml(insertHeadingRequest.text)}</h2><p><br></p>`);
    updateEmptyState();
    onChangeHtml(el.innerHTML);
    onHeadingInserted && onHeadingInserted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertHeadingRequest && insertHeadingRequest.key]);

  function handleInput() {
    updateEmptyState();
    onChangeHtml(containerRef.current.innerHTML);
  }

  function toggleHeading(tag) {
    const current = (document.queryCommandValue("formatBlock") || "").toUpperCase();
    document.execCommand("formatBlock", false, current === tag ? "P" : tag);
  }

  function insertChecklist() {
    document.execCommand(
      "insertHTML", false,
      `<ul class="onb-checklist"><li><input type="checkbox" contenteditable="false"><span>To-do</span></li></ul><p><br></p>`
    );
    // Select the placeholder text so the next keystroke replaces it immediately.
    const spans = containerRef.current.querySelectorAll(".onb-checklist span");
    const span = spans[spans.length - 1];
    if (span) {
      const range = document.createRange();
      range.selectNodeContents(span);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function insertLink() {
    const el = containerRef.current;
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;
    const url = window.prompt(hasSelection ? "Link URL" : "Link URL (inserted as the link text)");
    if (!url) return;
    if (hasSelection) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    }
    // createLink/insertHTML don't let us set target/rel directly — patch every link
    // that's missing them right after (cheap: a notebook realistically has a handful).
    el.querySelectorAll("a:not([target])").forEach(a => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }

  function runCommand(cmd) {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
    switch (cmd) {
      case "bold": document.execCommand("bold"); break;
      case "italic": document.execCommand("italic"); break;
      case "underline": document.execCommand("underline"); break;
      case "ul": document.execCommand("insertUnorderedList"); break;
      case "ol": document.execCommand("insertOrderedList"); break;
      case "quote": document.execCommand("formatBlock", false, "blockquote"); break;
      case "h2": toggleHeading("H2"); break;
      case "h3": toggleHeading("H3"); break;
      case "checklist": insertChecklist(); break;
      case "link": insertLink(); break;
      case "undo": document.execCommand("undo"); break;
      case "redo": document.execCommand("redo"); break;
      default: break;
    }
    updateEmptyState();
    onChangeHtml(el.innerHTML);
  }

  function handleKeyDown(e) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "b") { e.preventDefault(); runCommand("bold"); }
    else if (key === "i") { e.preventDefault(); runCommand("italic"); }
    else if (key === "u") { e.preventDefault(); runCommand("underline"); }
  }

  // Toggle a checklist item's "done" look, and keep the `checked` *attribute* (not just
  // the DOM property) in sync — that's what survives being read back out of innerHTML.
  function handleClick(e) {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (checkbox && containerRef.current.contains(checkbox)) {
      const li = checkbox.closest("li");
      if (checkbox.checked) { checkbox.setAttribute("checked", "checked"); li && li.classList.add("onb-checked"); }
      else { checkbox.removeAttribute("checked"); li && li.classList.remove("onb-checked"); }
      onChangeHtml(containerRef.current.innerHTML);
      return;
    }
    // Links stay editable in place — a plain click opens them (in a new tab) rather
    // than navigating the whole app away; editing the URL itself is a double-click.
    const link = e.target.closest("a");
    if (link && containerRef.current.contains(link)) {
      e.preventDefault();
      window.open(link.getAttribute("href"), "_blank", "noopener,noreferrer");
    }
  }

  function handleDoubleClick(e) {
    const link = e.target.closest("a");
    if (!link || !containerRef.current.contains(link)) return;
    e.preventDefault();
    const next = window.prompt("Edit link URL (leave empty to remove the link)", link.getAttribute("href") || "");
    if (next === null) return;
    if (next.trim() === "") {
      link.replaceWith(document.createTextNode(link.textContent));
    } else {
      link.setAttribute("href", next.trim());
    }
    onChangeHtml(containerRef.current.innerHTML);
  }

  return (
    <>
      <NotebookToolbar onCommand={runCommand} />
      <div
        ref={containerRef}
        className="onb-editor onb-empty"
        contentEditable={loaded && !searching}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{
          width: "100%", boxSizing: "border-box", minHeight: 420,
          padding: "6px 22px 20px", fontSize: 15, lineHeight: 1.7, fontFamily: font,
          color: BRAND.darkTeal, outline: "none", overflowWrap: "break-word",
        }}
      />
    </>
  );
}

// Compact, sticky formatting toolbar for NotebookEditor. onMouseDown prevents each
// button from stealing focus (and therefore the text selection) away from the editor
// right before its onClick fires the actual command.
function NotebookToolbar({ onCommand }) {
  const btnStyle = { background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 6, padding: "6px 8px", color: BRAND.teal, display: "flex", alignItems: "center", justifyContent: "center" };
  const dividerStyle = { width: 1, alignSelf: "stretch", background: BRAND.sandBorder, margin: "2px 2px" };
  const Btn = ({ cmd, title, children }) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand(cmd)} className="onb-btn" style={btnStyle} title={title}>
      {children}
    </button>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, padding: "10px 12px", position: "sticky", top: 0, background: BRAND.white, zIndex: 1, borderBottom: `1px solid ${BRAND.sandBorder}` }}>
      <Btn cmd="bold" title="Bold (Ctrl/Cmd+B)"><Bold size={14} /></Btn>
      <Btn cmd="italic" title="Italic (Ctrl/Cmd+I)"><Italic size={14} /></Btn>
      <Btn cmd="underline" title="Underline (Ctrl/Cmd+U)"><Underline size={14} /></Btn>
      <div style={dividerStyle} />
      <Btn cmd="h2" title="Heading 2"><Heading2 size={14} /></Btn>
      <Btn cmd="h3" title="Heading 3"><Heading3 size={14} /></Btn>
      <div style={dividerStyle} />
      <Btn cmd="ul" title="Bullet list"><List size={14} /></Btn>
      <Btn cmd="ol" title="Numbered list"><ListOrdered size={14} /></Btn>
      <Btn cmd="checklist" title="Checklist"><ListTodo size={14} /></Btn>
      <Btn cmd="quote" title="Quote"><Quote size={14} /></Btn>
      <Btn cmd="link" title="Insert link"><LinkIcon size={14} /></Btn>
      <div style={dividerStyle} />
      <Btn cmd="undo" title="Undo (Ctrl/Cmd+Z)"><Undo size={14} /></Btn>
      <Btn cmd="redo" title="Redo (Ctrl/Cmd+Shift+Z)"><Redo size={14} /></Btn>
    </div>
  );
}

// ---------- Notebook page ----------
// A single, topic-independent notebook per user — a full-screen "page" (not a small
// modal) so the editor has room to breathe. `notebook` is the useNotebookAutosave()
// instance, owned by Hub (not created here) so its content survives the page closing.
function NotebookPage({ notebook, onClose, initialQuery, insertHeadingRequest, onHeadingInserted }) {
  const { content, loaded, status, lastSavedAt, handleContentChange, flush } = notebook;
  const [query, setQuery] = useState(initialQuery || "");
  const [matchCount, setMatchCount] = useState(0);
  const [matchIndex, setMatchIndex] = useState(-1);
  const containerRef = useRef(null);
  const marksRef = useRef([]);
  const searching = query.trim().length > 0;

  // If the notebook was opened from a homepage search match, jump straight to it.
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // A once-a-minute re-render so the "Saved just now" → "Saved today at …" label stays
  // accurate for as long as the page is left open.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 20000);
    return () => clearInterval(id);
  }, []);

  function clearMarks() {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll("mark.onb-search-mark").forEach(mark => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
    marksRef.current = [];
  }

  // Rebuilds the <mark> highlights for the current query. Walks every text node in the
  // editor and wraps matching substrings — deliberately done as plain DOM surgery
  // (rather than through React) since the editor's content is otherwise uncontrolled.
  function rebuildMarks(q) {
    clearMarks();
    const root = containerRef.current;
    if (!root || !q) { setMatchCount(0); setMatchIndex(-1); return; }
    const lower = q.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    const marks = [];
    textNodes.forEach(node => {
      const text = node.nodeValue;
      const lowerText = text.toLowerCase();
      if (!lowerText.includes(lower)) return;
      let start = 0, idx;
      const frag = document.createDocumentFragment();
      while ((idx = lowerText.indexOf(lower, start)) !== -1) {
        if (idx > start) frag.appendChild(document.createTextNode(text.slice(start, idx)));
        const mark = document.createElement("mark");
        mark.className = "onb-search-mark";
        mark.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mark);
        marks.push(mark);
        start = idx + q.length;
      }
      if (start < text.length) frag.appendChild(document.createTextNode(text.slice(start)));
      node.parentNode.replaceChild(frag, node);
    });

    marksRef.current = marks;
    setMatchCount(marks.length);
    if (marks.length) { setMatchIndex(0); highlightCurrent(marks, 0); }
    else setMatchIndex(-1);
  }

  function highlightCurrent(marks, idx) {
    marks.forEach((m, i) => m.classList.toggle("onb-search-mark-current", i === idx));
    if (marks[idx]) marks[idx].scrollIntoView({ block: "center", behavior: "smooth" });
  }

  useEffect(() => {
    if (!loaded) return;
    rebuildMarks(query.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, loaded]);

  function goToMatch(delta) {
    const marks = marksRef.current;
    if (!marks.length) return;
    const next = (matchIndex + delta + marks.length) % marks.length;
    setMatchIndex(next);
    highlightCurrent(marks, next);
  }

  function clearSearch() {
    setQuery("");
  }

  function handleClose() {
    clearMarks();
    flush();
    notebook.syncNow();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: BRAND.sand, zIndex: 70, overflowY: "auto" }}>
      <div style={{ background: BRAND.darkTeal, padding: "16px 24px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleClose} className="onb-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "7px 12px", color: BRAND.white, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ChevronLeft size={15} /> Back
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>📝 My Notebook</div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 60px" }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, color: BRAND.darkTeal, margin: "0 0 8px" }}>My Notebook</h1>
        <p style={{ fontSize: 14.5, color: BRAND.teal, margin: "0 0 22px", lineHeight: 1.6, maxWidth: 560 }}>
          Take notes while learning. Your notebook is private and always available in one place.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", maxWidth: 340, flex: "1 1 240px" }}>
            <Search size={14} color={BRAND.teal} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); goToMatch(e.shiftKey ? -1 : 1); }
                if (e.key === "Escape") clearSearch();
              }}
              placeholder="Search in this notebook…"
              style={{ width: "100%", boxSizing: "border-box", background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 999, padding: "9px 34px", fontSize: 13.5, color: BRAND.darkTeal }}
            />
            {query && (
              <button onClick={clearSearch} title="Clear search" className="onb-btn" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: BRAND.teal, display: "flex", padding: 4 }}>
                <X size={14} />
              </button>
            )}
          </div>
          {searching && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: BRAND.teal, flexShrink: 0 }}>
              <span>{matchCount > 0 ? `${matchIndex + 1}/${matchCount}` : "No matches"}</span>
              <button onClick={() => goToMatch(-1)} disabled={!matchCount} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 6, padding: 4, color: BRAND.teal, opacity: matchCount ? 1 : 0.4 }}><ChevronLeft size={13} /></button>
              <button onClick={() => goToMatch(1)} disabled={!matchCount} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 6, padding: 4, color: BRAND.teal, opacity: matchCount ? 1 : 0.4 }}><ChevronRight size={13} /></button>
            </div>
          )}
        </div>

        <div style={{ background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <NotebookEditor
            containerRef={containerRef}
            content={content}
            loaded={loaded}
            searching={searching}
            onChangeHtml={handleContentChange}
            placeholder="Start taking notes while you learn. Save useful tips, reminders, links, or anything you’d like to remember later."
            insertHeadingRequest={insertHeadingRequest}
            onHeadingInserted={onHeadingInserted}
          />
        </div>

        <div style={{ marginTop: 12, fontSize: 12.5, color: BRAND.teal, minHeight: 16, display: "flex", alignItems: "center", gap: 6 }}>
          {!loaded && <span>Loading your notebook…</span>}
          {loaded && status === "saving" && <><Loader2 size={13} className="animate-spin" /> Saving…</>}
          {loaded && status === "saved" && lastSavedAt && <><Check size={13} /> Saved {formatSavedLabel(lastSavedAt)}</>}
          {loaded && status === "error" && <span style={{ color: "#C0392B" }}>Couldn't save — will retry as you keep typing.</span>}
          {loaded && status === "idle" && !lastSavedAt && <span>Nothing saved yet — start typing.</span>}
        </div>
      </div>
    </div>
  );
}

// ---------- Mentoring Questions: shared UI ----------

// Turns "tom.smith@webnode.com" into "Tom Smith" — used whenever we don't have a nicer
// display name to fall back on (this app's profiles table only stores email + role).
function displayNameFromEmail(email) {
  if (!email) return "Someone";
  const namePart = (email.split("@")[0] || "").replace(/[._-]+/g, " ").trim();
  if (!namePart) return "Someone";
  return namePart.replace(/\b\w/g, c => c.toUpperCase());
}

// "You", or "Tom Smith (Mentor)" for an editor's reply, or "Tom Smith" for a learner's.
// Editors are labeled "Mentor" here rather than "Editor" — same role, but this is the
// word a learner actually sees, per the design goal ("editors act as mentors").
function getAuthorLabel(profile, viewerUserId, authorId) {
  if (authorId === viewerUserId) return "You";
  if (!profile) return "Someone";
  const name = displayNameFromEmail(profile.email);
  return profile.role === "editor" ? `${name} (Mentor)` : name;
}

// One mentoring conversation: the original question, every reply in order, a status
// badge, and — for whoever's allowed — a reply box plus resolve/reopen controls. Used
// in three places (same component, different data around it): the per-topic Questions
// section, the learner's My Questions page, and the editor's Learner Questions inbox.
function ConversationThread({ question, topicTitle, onOpenTopic, learnerLabel, profilesById, viewerUserId, isEditorActor, onReply, onSetStatus, defaultExpanded }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const meta = QUESTION_STATUS_META[question.status];

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onReply(question, text);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="onb-btn"
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}
      >
        <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{meta.emoji}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {(topicTitle || learnerLabel) && (
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.teal, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {topicTitle && (
                onOpenTopic ? (
                  <span onClick={e => { e.stopPropagation(); onOpenTopic(question.topicId); }} style={{ textDecoration: "underline", cursor: "pointer" }}>{topicTitle}</span>
                ) : <span>{topicTitle}</span>
              )}
              {learnerLabel && <span style={{ opacity: 0.7 }}>· {learnerLabel}</span>}
            </div>
          )}
          <div style={{ fontSize: 13.5, color: BRAND.darkTeal, fontWeight: 600, lineHeight: 1.4 }}>{question.text}</div>
          <div style={{ fontSize: 11.5, color: meta.color, fontWeight: 700, marginTop: 4 }}>
            {meta.label}{question.replies.length > 0 ? ` · ${question.replies.length} repl${question.replies.length === 1 ? "y" : "ies"}` : ""}
          </div>
        </span>
        <ChevronRight size={14} color={BRAND.teal} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0, marginTop: 3 }} />
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${BRAND.sandBorder}`, padding: 14, background: BRAND.sand }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {question.replies.length === 0 && (
              <p style={{ fontSize: 12.5, color: BRAND.teal, fontStyle: "italic", margin: 0 }}>No replies yet.</p>
            )}
            {question.replies.map(r => {
              const p = profilesById[r.authorId];
              const isEditorAuthor = p?.role === "editor";
              return (
                <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: isEditorAuthor ? BRAND.darkTeal : BRAND.teal }}>
                    {getAuthorLabel(p, viewerUserId, r.authorId)}{" "}
                    <span style={{ fontWeight: 400, color: BRAND.teal }}>· {formatSavedTime(new Date(r.createdAt))}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: BRAND.darkTeal, lineHeight: 1.55, background: isEditorAuthor ? BRAND.limeSoft : BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px 12px", whiteSpace: "pre-wrap" }}>
                    {r.body}
                  </div>
                </div>
              );
            })}
          </div>

          {question.status !== "resolved" && (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }}
                placeholder={isEditorActor ? "Write a reply as a mentor…" : "Continue the conversation…"}
                rows={2}
                style={{ flex: 1, resize: "vertical", background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: font, color: BRAND.darkTeal, boxSizing: "border-box" }}
              />
              <button onClick={handleSend} disabled={sending || !draft.trim()} className="onb-btn" style={{ background: BRAND.darkTeal, border: "none", borderRadius: 8, padding: "0 14px", color: BRAND.white, fontSize: 13, fontWeight: 600, opacity: sending || !draft.trim() ? 0.6 : 1, flexShrink: 0 }}>
                Send
              </button>
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {question.status !== "resolved" ? (
              <button onClick={() => onSetStatus(question, "resolved")} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: BRAND.teal, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <Check size={13} /> Mark as resolved
              </button>
            ) : (
              <button onClick={() => onSetStatus(question, "waiting")} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: BRAND.teal, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <RefreshCw size={13} /> Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Per-topic mentoring Q&A — shows previous conversations for this topic and lets the
// learner start a new one. Topic-aware by construction: since this lives inside
// TopicViewer, the topic is already known, so the learner never has to say what it's
// about (see the feature's "Topic Awareness" goal).
function QuestionsSection({ userId, topicId, questions, profilesById, onAsk, onReply, onSetStatus, showToast }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus(); }, [adding]);

  const topicQuestions = questions.filter(q => q.topicId === topicId).slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  async function handleAsk() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onAsk(topicId, text);
      setDraft("");
      setAdding(false);
    } catch (err) {
      showToast(err?.message || "Couldn't send your question. Try again.");
    }
    setSending(false);
  }

  return (
    <div style={{ marginTop: 24, background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: BRAND.darkTeal, margin: "0 0 4px" }}>💬 Questions</h4>
          <p style={{ fontSize: 12, color: BRAND.teal, margin: 0 }}>
            {topicQuestions.length > 0
              ? `You have ${topicQuestions.length} previous question${topicQuestions.length === 1 ? "" : "s"} in this topic.`
              : "Ask a mentor anything about this topic — they'll reply here, no need to leave the Hub."}
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: BRAND.teal, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <Plus size={13} /> Ask a question
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); handleAsk(); }
              if (e.key === "Escape") { setDraft(""); setAdding(false); }
            }}
            placeholder="e.g. why can't I connect Google Search Console on a Free website?"
            disabled={sending}
            style={{ flex: 1, background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, color: BRAND.darkTeal, padding: "9px 12px", fontSize: 13.5, boxSizing: "border-box", fontFamily: font }}
          />
          <button onClick={handleAsk} disabled={sending} className="onb-btn" style={{ background: BRAND.darkTeal, border: "none", borderRadius: 8, padding: "0 14px", color: BRAND.white, fontSize: 13, fontWeight: 600, opacity: sending ? 0.6 : 1 }}>Ask</button>
          <button onClick={() => { setDraft(""); setAdding(false); }} title="Cancel" className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "0 10px", color: BRAND.teal, display: "flex", alignItems: "center" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {topicQuestions.length === 0 && !adding && (
        <p style={{ marginTop: 14, fontSize: 12.5, color: BRAND.teal, margin: "14px 0 0", fontStyle: "italic" }}>No conversations for this topic yet.</p>
      )}

      {topicQuestions.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {topicQuestions.map(q => (
            <ConversationThread
              key={q.id} question={q} profilesById={profilesById} viewerUserId={userId}
              isEditorActor={false}
              onReply={(question, text) => onReply(question, text, false)}
              onSetStatus={onSetStatus}
              defaultExpanded={topicQuestions.length === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function TopicViewer({ topic, slideIdx, setSlideIdx, onClose, done, onToggleDone, editMode, onEdit, userId, questions, profilesById, onAskQuestion, onReplyToQuestion, onSetQuestionStatus, showToast, linkStatesByUrl, onVisitLink, positionInCategory, onAddNoteForTopic }) {
  const slide = topic.slides[slideIdx] || topic.slides[0];
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const hasQuiz = topic.quiz && topic.quiz.length > 0;
  // Practical exercise / review workflow — see requiresTrainerReview. `reviewQuestion`
  // is the one existing "Submit for Review" conversation for this topic, if any (kept
  // separate from the learner's ordinary questions about the same topic via `kind`).
  const [showSubmitReviewModal, setShowSubmitReviewModal] = useState(false);
  const practicalReview = requiresTrainerReview(topic);
  const isLastSlide = slideIdx === topic.slides.length - 1;
  const reviewQuestion = questions.find(q => q.topicId === topic.id && q.kind === "review") || null;

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

  async function handleSubmitForReview(text) {
    await onAskQuestion(topic.id, text, "review");
    setShowSubmitReviewModal(false);
    showToast("Sent for review!");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,60,71,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: BRAND.white, borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BRAND.sandBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: BRAND.teal, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>Topic {String(positionInCategory ?? topic.order).padStart(2, "0")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: BRAND.darkTeal }}>{topic.title}</h2>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: BRAND.teal, background: BRAND.tealSoft, borderRadius: 999, padding: "3px 10px" }}>
                <Clock size={12} /> {formatMinutes(getEstimatedTime(topic))}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {onAddNoteForTopic && (
              <button
                onClick={onAddNoteForTopic}
                className="onb-btn"
                title="Add a note for this topic"
                style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px 12px", color: BRAND.teal, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}
              >
                📝 Add note
              </button>
            )}
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
                {practicalReview && isLastSlide ? (
                  <SubmitForReviewPanel topic={topic} reviewQuestion={reviewQuestion} onOpenSubmit={() => setShowSubmitReviewModal(true)} />
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: BRAND.teal, marginBottom: 10, fontWeight: 500 }}>Slide {slideIdx + 1} of {topic.slides.length}</div>
                    <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700, color: BRAND.darkTeal }}>{slide.title}</h3>
                    <div style={{ color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}>
                      <ContentBlocks
                        lines={slide.bullets}
                        pStyle={{ color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}
                        listStyle={{ color: BRAND.darkTeal, lineHeight: 1.8, fontSize: 14.5 }}
                      />
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <button disabled={slideIdx === 0} onClick={() => setSlideIdx(i => Math.max(0, i - 1))} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: slideIdx === 0 ? "#B7BDC0" : BRAND.darkTeal, display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}><ChevronLeft size={14} /> Previous</button>
                <div style={{ display: "flex", gap: 6 }}>
                  {topic.slides.map((s, i) => <div key={s.id} style={{ width: 6, height: 6, borderRadius: "50%", background: i === slideIdx ? BRAND.teal : BRAND.sandBorder }} />)}
                </div>
                <button disabled={slideIdx === topic.slides.length - 1} onClick={() => setSlideIdx(i => Math.min(topic.slides.length - 1, i + 1))} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "6px 12px", color: slideIdx === topic.slides.length - 1 ? "#B7BDC0" : BRAND.darkTeal, display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>Next <ChevronRight size={14} /></button>
              </div>

              {topic.links.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND.teal, marginBottom: 10, fontWeight: 700 }}>Links and resources</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topic.links.map((l, i) => {
                      const visited = !!linkStatesByUrl?.[l.url]?.has("visited");
                      return (
                        <a
                          key={i} href={l.url} target="_blank" rel="noreferrer"
                          onClick={() => onVisitLink && onVisitLink(l.url)}
                          style={{ color: visited ? "rgba(38,85,100,0.6)" : BRAND.teal, fontSize: 14, display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontWeight: 500 }}
                        >
                          <Link2 size={13} /> {l.label || l.url} <ExternalLink size={11} style={{ opacity: 0.6 }} />
                          {visited && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: BRAND.teal, background: BRAND.tealSoft, borderRadius: 999, padding: "1px 8px 1px 6px" }}>
                              <Check size={10} /> Visited
                            </span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

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

              <QuestionsSection
                userId={userId} topicId={topic.id} questions={questions} profilesById={profilesById}
                onAsk={onAskQuestion} onReply={onReplyToQuestion} onSetStatus={onSetQuestionStatus}
                showToast={showToast}
              />
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

      {showSubmitReviewModal && (
        <SubmitForReviewModal topic={topic} onClose={() => setShowSubmitReviewModal(false)} onSubmit={handleSubmitForReview} />
      )}
    </div>
  );
}

// ---------- Practical exercise: Submit for Review ----------
// Shown in place of the final slide's normal content when a topic is configured as a
// practical exercise requiring trainer review (see requiresTrainerReview). Purely
// data-driven — nothing here is specific to any one topic (Blog, Business Website, or
// any future exercise all render the exact same way from their own configuration).
function SubmitForReviewPanel({ topic, reviewQuestion, onOpenSubmit }) {
  if (reviewQuestion) {
    const meta = QUESTION_STATUS_META[reviewQuestion.status];
    return (
      <div style={{ textAlign: "center", padding: "20px 10px" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>{meta.emoji}</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: BRAND.darkTeal }}>Submitted for review</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: BRAND.teal, lineHeight: 1.6 }}>
          Status: <strong style={{ color: meta.color }}>{meta.label}</strong>. Scroll down to see the conversation and your trainer's feedback.
        </p>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", padding: "6px 6px 10px" }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🤝</div>
      <h3 style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 700, color: BRAND.darkTeal }}>Submit for Review</h3>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: BRAND.darkTeal, lineHeight: 1.7 }}>
        <strong>Congratulations!</strong> You've completed the practical exercise.<br />
        Learning doesn't stop here. Share your work with your trainer and ask for feedback before moving on.
      </p>
      <div style={{ background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 10, padding: "14px 18px", margin: "0 0 14px", textAlign: "left", fontSize: 13.5, color: BRAND.darkTeal, lineHeight: 1.9 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Your trainer will:</div>
        <div>✅ Review your work</div>
        <div>💬 Share feedback and suggestions</div>
        <div>❓ Answer any remaining questions</div>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: BRAND.teal, lineHeight: 1.6, fontStyle: "italic" }}>
        Remember: the goal isn't to build a perfect {topic.title.toLowerCase()}. The goal is to gain experience and learn from feedback.
      </p>
      <button onClick={onOpenSubmit} className="onb-btn" style={{ background: BRAND.darkTeal, color: BRAND.white, border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
        📩 Submit for Review
      </button>
    </div>
  );
}

// The dialog that turns a completed practical exercise into the first message of a
// mentoring conversation (see Questions Integration — this calls the exact same
// askQuestion/onAskQuestion path as an ordinary question, just tagged kind: "review").
// The attachment field shown is entirely driven by the topic's configured
// attachmentType; the message itself is generated from the topic's reviewTemplate and
// re-generated live as the learner fills in the attachment, unless they've started
// editing the message directly (in which case their edits are respected).
function SubmitForReviewModal({ topic, onClose, onSubmit }) {
  const attachmentType = getAttachmentType(topic);
  const attachmentMeta = ATTACHMENT_TYPE_MAP[attachmentType];
  const template = getReviewTemplate(topic);
  const [attachmentValue, setAttachmentValue] = useState("");
  const [message, setMessage] = useState(fillReviewTemplate(template, ""));
  const [messageEdited, setMessageEdited] = useState(false);
  const [sending, setSending] = useState(false);

  function handleAttachmentChange(value) {
    setAttachmentValue(value);
    if (!messageEdited) setMessage(fillReviewTemplate(template, value));
  }

  async function handleSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit(message.trim());
    } finally {
      setSending(false);
    }
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, color: BRAND.darkTeal, padding: "9px 12px", fontSize: 13.5, fontFamily: font };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,60,71,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: BRAND.white, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${BRAND.sandBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.darkTeal }}>📩 Submit for Review</h3>
          <button onClick={onClose} className="onb-btn" style={{ background: "transparent", border: "none", color: BRAND.teal }}><X size={18} /></button>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {attachmentType !== "none" && (
            <div>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: BRAND.teal, marginBottom: 5, display: "block", fontWeight: 700 }}>
                {attachmentMeta.label}
              </label>
              {attachmentMeta.inputType === "textarea" ? (
                <textarea
                  autoFocus
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  placeholder={attachmentMeta.placeholder}
                  value={attachmentValue}
                  onChange={e => handleAttachmentChange(e.target.value)}
                />
              ) : (
                <input
                  autoFocus
                  type={attachmentMeta.inputType === "url" ? "url" : "text"}
                  style={inputStyle}
                  placeholder={attachmentMeta.placeholder}
                  value={attachmentValue}
                  onChange={e => handleAttachmentChange(e.target.value)}
                />
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: BRAND.teal, marginBottom: 5, display: "block", fontWeight: 700 }}>
              Message to your trainer
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              value={message}
              onChange={e => { setMessage(e.target.value); setMessageEdited(true); }}
            />
          </div>
        </div>

        <div style={{ padding: "16px 22px", borderTop: `1px solid ${BRAND.sandBorder}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} className="onb-btn" style={{ background: "transparent", border: `1px solid ${BRAND.sandBorder}`, color: BRAND.teal, borderRadius: 8, padding: "9px 16px", fontSize: 13 }}>Cancel</button>
          <button onClick={handleSend} disabled={sending || !message.trim()} className="onb-btn" style={{ background: BRAND.lime, border: "none", color: BRAND.darkTeal, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, opacity: sending || !message.trim() ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} /> {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}


// Every conversation this learner has ever started, across every topic. Per the design
// goal, conversations never disappear — this is deliberately their whole history, not
// just open items, with filters to narrow it down.
function MyQuestionsPage({ questions, topics, profilesById, userId, onReply, onSetStatus, onClose, onOpenTopic }) {
  const [filter, setFilter] = useState("all");
  const topicById = Object.fromEntries(topics.map(t => [t.id, t]));
  const sorted = questions.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const counts = {
    waiting: sorted.filter(q => q.status === "waiting").length,
    replied: sorted.filter(q => q.status === "replied").length,
    resolved: sorted.filter(q => q.status === "resolved").length,
  };
  const filtered = filter === "all" ? sorted : sorted.filter(q => q.status === filter);

  const tabs = [
    { key: "all", label: `All (${sorted.length})` },
    { key: "waiting", label: `🟡 Waiting (${counts.waiting})` },
    { key: "replied", label: `💬 Replied (${counts.replied})` },
    { key: "resolved", label: `✅ Resolved (${counts.resolved})` },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: BRAND.sand, zIndex: 70, overflowY: "auto" }}>
      <div style={{ background: BRAND.darkTeal, padding: "16px 24px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} className="onb-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "7px 12px", color: BRAND.white, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ChevronLeft size={15} /> Back
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>💬 My Questions</div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 60px" }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, color: BRAND.darkTeal, margin: "0 0 8px" }}>My Questions</h1>
        <p style={{ fontSize: 14.5, color: BRAND.teal, margin: "0 0 20px", lineHeight: 1.6, maxWidth: 560 }}>
          Every mentoring conversation you've started, across every topic. Nothing here ever disappears — it's part of your learning history.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="onb-btn"
              style={{
                background: filter === t.key ? BRAND.darkTeal : BRAND.white,
                color: filter === t.key ? BRAND.white : BRAND.darkTeal,
                border: `1px solid ${filter === t.key ? BRAND.darkTeal : BRAND.sandBorder}`,
                borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p style={{ fontSize: 13.5, color: BRAND.teal, fontStyle: "italic" }}>
            {sorted.length === 0 ? "You haven't asked anything yet — open any topic and ask a mentor a question." : "No conversations match this filter."}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(q => (
            <ConversationThread
              key={q.id}
              question={q}
              topicTitle={topicById[q.topicId]?.title || "Unknown topic"}
              onOpenTopic={onOpenTopic}
              profilesById={profilesById}
              viewerUserId={userId}
              isEditorActor={false}
              onReply={onReply}
              onSetStatus={onSetStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Learner Questions (editor mentoring inbox) ----------
// Every learner's conversation, across every topic — a lightweight support inbox for
// editors acting as mentors: dashboard insights up top, filters, then the list itself.
function QuestionsInboxPage({ questions, topics, profilesById, viewerUserId, onReply, onSetStatus, onClose }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [learnerFilter, setLearnerFilter] = useState("all");

  const topicById = Object.fromEntries(topics.map(t => [t.id, t]));

  // ---- Dashboard insights ----
  const waitingCount = questions.filter(q => q.status === "waiting").length;
  const resolvedCount = questions.filter(q => q.status === "resolved").length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const answeredToday = questions.reduce((sum, q) => {
    const editorRepliesToday = q.replies.filter(r => profilesById[r.authorId]?.role === "editor" && new Date(r.createdAt) >= startOfToday);
    return sum + editorRepliesToday.length;
  }, 0);

  const topicCounts = {};
  questions.forEach(q => { topicCounts[q.topicId] = (topicCounts[q.topicId] || 0) + 1; });
  const topTopics = Object.entries(topicCounts)
    .map(([topicId, count]) => ({ topicId, count, title: topicById[topicId]?.title || "Unknown topic" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ---- Filter option lists ----
  const learnerIds = [...new Set(questions.map(q => q.userId))];
  const learners = learnerIds.map(id => ({ id, label: displayNameFromEmail(profilesById[id]?.email) + (id === viewerUserId ? " (you)" : "") }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const topicsWithQuestions = topics.filter(t => topicCounts[t.id] > 0);

  let filtered = questions;
  if (statusFilter !== "all") filtered = filtered.filter(q => q.status === statusFilter);
  if (topicFilter !== "all") filtered = filtered.filter(q => q.topicId === topicFilter);
  if (learnerFilter !== "all") filtered = filtered.filter(q => q.userId === learnerFilter);
  filtered = filtered.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const selectStyle = { background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, color: BRAND.darkTeal, fontFamily: font };

  return (
    <div style={{ position: "fixed", inset: 0, background: BRAND.sand, zIndex: 70, overflowY: "auto" }}>
      <div style={{ background: BRAND.darkTeal, padding: "16px 24px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} className="onb-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "7px 12px", color: BRAND.white, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ChevronLeft size={15} /> Back
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>📥 Learner Questions</div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px 60px" }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, color: BRAND.darkTeal, margin: "0 0 8px" }}>Learner Questions</h1>
        <p style={{ fontSize: 14.5, color: BRAND.teal, margin: "0 0 22px", lineHeight: 1.6, maxWidth: 620 }}>
          Every learner's mentoring conversation, in one place — reply, resolve, or reopen. This also shows where learners are struggling, which is useful for improving the material itself.
        </p>

        {/* Dashboard insights */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          {[
            { emoji: "🟡", value: waitingCount, label: "Waiting for reply" },
            { emoji: "💬", value: answeredToday, label: "Answered today" },
            { emoji: "✅", value: resolvedCount, label: "Resolved" },
          ].map((s, i) => (
            <div key={i} style={{ flex: "1 1 160px", minWidth: 150, background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.darkTeal }}>{s.emoji} {s.value}</div>
              <div style={{ fontSize: 11.5, color: BRAND.teal, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {topTopics.length > 0 && (
          <div style={{ background: BRAND.white, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.darkTeal, marginBottom: 8 }}>Most common topics</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {topTopics.map(t => (
                <div key={t.topicId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: BRAND.teal }}>
                  <span>{t.title}</span>
                  <span style={{ fontWeight: 700, color: BRAND.darkTeal }}>{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="all">All statuses</option>
            <option value="waiting">🟡 Waiting</option>
            <option value="replied">💬 Replied</option>
            <option value="resolved">✅ Resolved</option>
          </select>
          <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} style={selectStyle}>
            <option value="all">All topics</option>
            {topicsWithQuestions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select value={learnerFilter} onChange={e => setLearnerFilter(e.target.value)} style={selectStyle}>
            <option value="all">All learners</option>
            {learners.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 && (
          <p style={{ fontSize: 13.5, color: BRAND.teal, fontStyle: "italic" }}>No conversations match these filters.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(q => (
            <ConversationThread
              key={q.id}
              question={q}
              topicTitle={topicById[q.topicId]?.title || "Unknown topic"}
              learnerLabel={displayNameFromEmail(profilesById[q.userId]?.email) + (q.userId === viewerUserId ? " (you)" : "")}
              profilesById={profilesById}
              viewerUserId={viewerUserId}
              isEditorActor
              onReply={onReply}
              onSetStatus={onSetStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
            {categoryTracksXp(getTopicCategory(draft)) && (
              <div style={{ width: 110 }}>
                <label style={labelStyle}>XP</label>
                <input
                  type="number"
                  min="1"
                  style={inputStyle}
                  placeholder={String(getTopicXp(draft))}
                  value={draft.xp ?? ""}
                  onChange={e => {
                    const raw = e.target.value;
                    update("xp", raw === "" ? undefined : Math.max(1, Number(raw) || 1));
                  }}
                />
              </div>
            )}
            <div style={{ flex: "1 1 180px" }}>
              <label style={labelStyle}>Section</label>
              <select
                style={inputStyle}
                value={getTopicCategory(draft)}
                onChange={e => update("category", e.target.value)}
              >
                {TOPIC_CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>
                ))}
                {draft.category && !TOPIC_CATEGORY_MAP[draft.category] && (
                  <option value={draft.category}>{humanizeCategoryKey(draft.category)}</option>
                )}
              </select>
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

          <div>
            <label style={labelStyle}>Completion</label>
            <p style={{ fontSize: 12, color: BRAND.teal, margin: "0 0 10px" }}>
              How should this topic end for the learner?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: BRAND.darkTeal, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="completion-type"
                  checked={(draft.completionType || "standard") !== "practical"}
                  onChange={() => update("completionType", "standard")}
                />
                Standard lesson
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: BRAND.darkTeal, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="completion-type"
                  checked={draft.completionType === "practical"}
                  onChange={() => update("completionType", "practical")}
                />
                Practical exercise
              </label>
            </div>

            {draft.completionType === "practical" && (
              <div style={{ background: BRAND.sand, border: `1px solid ${BRAND.sandBorder}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: BRAND.darkTeal, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!draft.requiresReview}
                    onChange={e => update("requiresReview", e.target.checked)}
                  />
                  Requires trainer review
                </label>

                {draft.requiresReview && (
                  <>
                    <div>
                      <label style={labelStyle}>Attachment</label>
                      <select
                        style={inputStyle}
                        value={getAttachmentType(draft)}
                        onChange={e => update("attachmentType", e.target.value)}
                      >
                        {ATTACHMENT_TYPES.map(a => (
                          <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Review request template</label>
                      <p style={{ fontSize: 11.5, color: BRAND.teal, margin: "0 0 6px" }}>
                        Use <code>{"{{attachment}}"}</code> where the learner's answer should be inserted.
                      </p>
                      <textarea
                        style={{ ...inputStyle, minHeight: 130, resize: "vertical", fontFamily: font }}
                        value={getReviewTemplate(draft)}
                        onChange={e => update("reviewTemplate", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
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
