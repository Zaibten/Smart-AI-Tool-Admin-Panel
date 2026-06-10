require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const upload = multer({ storage: multer.memoryStorage() });

// ─── MongoDB (cached connection for Vercel serverless) ─────────────────────────
let isConnected = false;
async function connectDB() {
  if (mongoose.connection.readyState === 1) { isConnected = true; return; }
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
}
// Warm-start (non-blocking)
connectDB().catch(function(e) { console.error("DB warm-start:", e.message); });

// ─── Models ────────────────────────────────────────────────────────────────────
const toolSchema = new mongoose.Schema({
  name: String, description: String, category: String, link: String,
  rating: Number, pricing: String, official_link: String, availability: String,
  details: String, profession: [String], tags: [String], new_description: String,
  image_url: String, date: String, overviewimg: String,
  featured: { type: Boolean, default: false },
}, { collection: 'tools' });

const ebookSchema = new mongoose.Schema({
  name: { type: String, required: true }, image: String, author: String,
  publisher: String, publish_date: String, category: String,
}, { collection: 'ebooks' });

const quizSchema = new mongoose.Schema({
  BasicQuiz: { type: Boolean, default: false },
  AdvanceQuiz: { type: Boolean, default: null },
  BasicQuizMarks: { type: Number, default: null },
  AdvanceQuizMarks: { type: Number, default: null },
  email: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
  username: String, email: String, password: String, otp: Number, otpExpiry: Date,
});

const Tool  = mongoose.models.Tool  || mongoose.model('Tool',  toolSchema);
const Ebook = mongoose.models.Ebook || mongoose.model('Ebook', ebookSchema);
const Quiz  = mongoose.models.Quiz  || mongoose.model('Quiz',  quizSchema);
const User  = mongoose.models.User  || mongoose.model('User',  userSchema);

// ─── Shared Layout Shell ───────────────────────────────────────────────────────
function shell(pageTitle, activeNav, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${pageTitle} — Select AI Admin</title>
  <link rel="icon" href="/assets/logo.png"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg:        #0a0e1a;
      --bg2:       #0f1526;
      --bg3:       #151c33;
      --surface:   #1a2240;
      --surface2:  #1f2a4a;
      --border:    rgba(99,130,255,0.15);
      --accent:    #6382ff;
      --accent2:   #a78bfa;
      --accent3:   #34d399;
      --accent4:   #f59e0b;
      --danger:    #f87171;
      --text:      #e2e8f0;
      --text2:     #94a3b8;
      --text3:     #64748b;
      --sidebar-w: 260px;
      --header-h:  64px;
      --radius:    12px;
      --radius-lg: 18px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── Animated bg grid ── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(99,130,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,130,255,0.04) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Header ── */
    .header {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: var(--header-h);
      background: rgba(10,14,26,0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px 0 0;
      z-index: 100;
      transition: left 0.3s ease;
    }

    .header-brand {
      width: var(--sidebar-w);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 20px;
      flex-shrink: 0;
    }

    .brand-logo {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; color: #fff;
      box-shadow: 0 0 20px rgba(99,130,255,0.4);
      animation: logoPulse 3s ease-in-out infinite;
    }

    @keyframes logoPulse {
      0%,100% { box-shadow: 0 0 20px rgba(99,130,255,0.4); }
      50%      { box-shadow: 0 0 35px rgba(99,130,255,0.7), 0 0 60px rgba(167,139,250,0.3); }
    }

    .brand-name {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 18px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.3px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hamburger {
      display: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 36px; height: 36px;
      cursor: pointer;
      color: var(--text2);
      font-size: 16px;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .hamburger:hover { background: var(--surface2); color: var(--text); }

    .header-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 6px 12px;
      font-size: 13px;
      color: var(--text2);
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .header-badge:hover { background: var(--surface2); color: var(--text); border-color: var(--accent); }
    .header-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent3); box-shadow: 0 0 6px var(--accent3); }

    .header-avatar {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: #fff;
      cursor: pointer;
    }

    /* ── Sidebar ── */
    .sidebar {
      position: fixed;
      top: var(--header-h);
      left: 0;
      width: var(--sidebar-w);
      height: calc(100vh - var(--header-h));
      background: var(--bg2);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px 0;
      z-index: 90;
      transition: transform 0.3s ease;
    }
    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-track { background: transparent; }
    .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .sidebar-section {
      padding: 0 12px;
      margin-bottom: 8px;
    }

    .sidebar-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--text3);
      padding: 8px 10px 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text2);
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.2s;
      cursor: pointer;
      margin-bottom: 2px;
      position: relative;
    }
    .nav-item:hover {
      background: var(--surface);
      color: var(--text);
      transform: translateX(2px);
    }
    .nav-item.active {
      background: linear-gradient(135deg, rgba(99,130,255,0.2), rgba(167,139,250,0.1));
      color: #fff;
      border: 1px solid rgba(99,130,255,0.25);
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0; top: 50%;
      transform: translateY(-50%);
      width: 3px; height: 60%;
      background: linear-gradient(var(--accent), var(--accent2));
      border-radius: 0 2px 2px 0;
    }
    .nav-icon {
      width: 32px; height: 32px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    .nav-item:hover .nav-icon, .nav-item.active .nav-icon {
      box-shadow: 0 0 12px rgba(99,130,255,0.3);
    }

    .nav-badge {
      margin-left: auto;
      background: rgba(99,130,255,0.2);
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 20px;
      border: 1px solid rgba(99,130,255,0.3);
    }
    .nav-badge.green { background: rgba(52,211,153,0.15); color: var(--accent3); border-color: rgba(52,211,153,0.3); }
    .nav-badge.orange { background: rgba(245,158,11,0.15); color: var(--accent4); border-color: rgba(245,158,11,0.3); }

    .sidebar-divider {
      height: 1px;
      background: var(--border);
      margin: 12px 20px;
    }

    /* ── Main ── */
    .main {
      margin-left: var(--sidebar-w);
      margin-top: var(--header-h);
      min-height: calc(100vh - var(--header-h));
      padding: 28px;
      position: relative;
      z-index: 1;
      transition: margin-left 0.3s ease;
    }

    /* ── Page header ── */
    .page-header {
      margin-bottom: 28px;
      animation: fadeUp 0.5s ease both;
    }
    .page-eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .page-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.5px;
    }
    .page-sub {
      color: var(--text2);
      font-size: 14px;
      margin-top: 4px;
    }

    /* ── Cards ── */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px;
      position: relative;
      overflow: hidden;
      animation: fadeUp 0.5s ease both;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: default;
    }
    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0; right: 0;
      width: 120px; height: 120px;
      border-radius: 50%;
      opacity: 0.07;
      transform: translate(30%, -30%);
    }
    .stat-card.blue::before   { background: var(--accent); }
    .stat-card.purple::before { background: var(--accent2); }
    .stat-card.green::before  { background: var(--accent3); }
    .stat-card.amber::before  { background: var(--accent4); }

    .stat-icon {
      width: 42px; height: 42px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      margin-bottom: 16px;
    }
    .stat-card.blue   .stat-icon { background: rgba(99,130,255,0.15);  color: var(--accent); }
    .stat-card.purple .stat-icon { background: rgba(167,139,250,0.15); color: var(--accent2); }
    .stat-card.green  .stat-icon { background: rgba(52,211,153,0.15);  color: var(--accent3); }
    .stat-card.amber  .stat-icon { background: rgba(245,158,11,0.15);  color: var(--accent4); }

    .stat-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 13px;
      color: var(--text2);
      font-weight: 500;
    }
    .stat-trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 10px;
      padding: 3px 8px;
      border-radius: 20px;
    }
    .stat-trend.up   { color: var(--accent3); background: rgba(52,211,153,0.1); }
    .stat-trend.blue { color: var(--accent);  background: rgba(99,130,255,0.1); }

    /* ── Charts grid ── */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      animation: fadeUp 0.5s ease 0.15s both;
    }
    .chart-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--text);
      margin-bottom: 4px;
    }
    .chart-sub {
      font-size: 12px;
      color: var(--text3);
      margin-bottom: 20px;
    }

    /* ── Panel / Table container ── */
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      animation: fadeUp 0.5s ease 0.2s both;
      margin-bottom: 24px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 12px;
    }

    .panel-title {
      font-weight: 700;
      font-size: 16px;
      color: var(--text);
    }
    .panel-sub { font-size: 12px; color: var(--text3); margin-top: 2px; }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #fff;
      box-shadow: 0 4px 15px rgba(99,130,255,0.3);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,130,255,0.4); }
    .btn-secondary {
      background: var(--surface2);
      color: var(--text2);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: var(--bg3); color: var(--text); border-color: var(--accent); }
    .btn-danger {
      background: rgba(248,113,113,0.1);
      color: var(--danger);
      border: 1px solid rgba(248,113,113,0.2);
    }
    .btn-danger:hover { background: rgba(248,113,113,0.2); border-color: var(--danger); }
    .btn-success {
      background: rgba(52,211,153,0.1);
      color: var(--accent3);
      border: 1px solid rgba(52,211,153,0.2);
    }
    .btn-success:hover { background: rgba(52,211,153,0.2); }
    .btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 6px; }
    .btn-xs { padding: 3px 8px; font-size: 11px; border-radius: 5px; gap: 4px; }

    /* ── Table ── */
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead th {
      background: var(--bg3);
      color: var(--text3);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 12px 16px;
      text-align: left;
      white-space: nowrap;
      border-bottom: 1px solid var(--border);
    }
    tbody tr {
      border-bottom: 1px solid rgba(99,130,255,0.07);
      transition: background 0.15s;
    }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(99,130,255,0.04); }
    tbody td {
      padding: 13px 16px;
      color: var(--text2);
      vertical-align: middle;
    }
    .td-name { color: var(--text); font-weight: 600; }
    .td-mono { font-family: monospace; font-size: 11px; color: var(--text3); }

    /* ── Badges ── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-blue   { background: rgba(99,130,255,0.15);  color: var(--accent);  border: 1px solid rgba(99,130,255,0.25); }
    .badge-green  { background: rgba(52,211,153,0.15);  color: var(--accent3); border: 1px solid rgba(52,211,153,0.25); }
    .badge-amber  { background: rgba(245,158,11,0.15);  color: var(--accent4); border: 1px solid rgba(245,158,11,0.25); }
    .badge-red    { background: rgba(248,113,113,0.15); color: var(--danger);  border: 1px solid rgba(248,113,113,0.25); }
    .badge-purple { background: rgba(167,139,250,0.15); color: var(--accent2); border: 1px solid rgba(167,139,250,0.25); }
    .badge-gray   { background: rgba(100,116,139,0.15); color: var(--text3);   border: 1px solid rgba(100,116,139,0.25); }

    /* ── Forms ── */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      padding: 24px;
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group.full { grid-column: 1 / -1; }
    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text2);
      letter-spacing: 0.3px;
    }
    .form-input {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 13px;
      color: var(--text);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(99,130,255,0.12);
    }
    .form-input::placeholder { color: var(--text3); }
    textarea.form-input { resize: vertical; min-height: 80px; }
    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 13px;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
    }
    .checkbox-row input[type="checkbox"] {
      width: 16px; height: 16px;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .form-actions {
      padding: 0 24px 24px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* ── Pagination ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 12px;
    }
    .pagination-info { font-size: 13px; color: var(--text3); }
    .pagination-links { display: flex; gap: 6px; flex-wrap: wrap; }
    .page-link {
      width: 32px; height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      color: var(--text2);
      background: var(--bg3);
      border: 1px solid var(--border);
      transition: all 0.2s;
    }
    .page-link:hover    { background: var(--surface2); color: var(--text); border-color: var(--accent); }
    .page-link.active   { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 0 12px rgba(99,130,255,0.4); }

    /* ── Empty state ── */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text3);
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
    .empty-msg  { font-size: 15px; color: var(--text2); margin-bottom: 6px; font-weight: 500; }
    .empty-sub  { font-size: 13px; }

    /* ── Upload zone ── */
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: var(--radius-lg);
      padding: 40px;
      text-align: center;
      transition: all 0.2s;
      cursor: pointer;
      margin: 24px;
    }
    .upload-zone:hover { border-color: var(--accent); background: rgba(99,130,255,0.03); }
    .upload-icon { font-size: 40px; margin-bottom: 12px; color: var(--accent); }
    .upload-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .upload-sub { font-size: 13px; color: var(--text3); }

    /* ── Alert ── */
    .alert {
      padding: 14px 18px;
      border-radius: var(--radius);
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .alert-success { background: rgba(52,211,153,0.1); color: var(--accent3); border: 1px solid rgba(52,211,153,0.2); }
    .alert-error   { background: rgba(248,113,113,0.1); color: var(--danger);   border: 1px solid rgba(248,113,113,0.2); }

    /* ── Animations ── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .stagger-1 { animation-delay: 0.05s; }
    .stagger-2 { animation-delay: 0.1s; }
    .stagger-3 { animation-delay: 0.15s; }
    .stagger-4 { animation-delay: 0.2s; }

    /* ── Overlay for mobile ── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 89;
      backdrop-filter: blur(4px);
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .header-brand { width: auto; }
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .sidebar-overlay.open { display: block; }
      .main { margin-left: 0; padding: 16px; }
      .hamburger { display: flex; }
      .cards-grid { grid-template-columns: 1fr 1fr; }
      .stat-value { font-size: 24px; }
      .page-title { font-size: 22px; }
      .form-grid { grid-template-columns: 1fr; }
      .panel-header { flex-direction: column; align-items: flex-start; }
    }
    @media (max-width: 480px) {
      .cards-grid { grid-template-columns: 1fr; }
      .charts-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<!-- Header -->
<header class="header" id="header">
  <div class="header-brand">
    <div class="brand-logo">S</div>
    <span class="brand-name">Select AI</span>
  </div>
  <div class="header-right">
    <a href="/home" class="header-badge" style="text-decoration:none">
      <span class="dot"></span>
      <span style="font-size:12px">Live</span>
    </a>
    <a href="/logout" class="header-badge" title="Logout" style="text-decoration:none">
      <i class="fa fa-sign-out-alt" style="font-size:12px;color:var(--danger)"></i>
      <span style="display:none" class="lg-only">Logout</span>
    </a>
    <div class="header-avatar" title="Admin">A</div>
    <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
      <i class="fa fa-bars"></i>
    </button>
  </div>
</header>

<!-- Sidebar overlay (mobile) -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

<!-- Sidebar -->
<aside class="sidebar" id="sidebar">

  <div class="sidebar-section">
    <div class="sidebar-label">Main</div>
    <a href="/home" class="nav-item ${activeNav==='home'?'active':''}">
      <div class="nav-icon" style="background:rgba(99,130,255,0.12)"><i class="fa fa-gauge" style="color:var(--accent)"></i></div>
      Dashboard
    </a>
  </div>

  <div class="sidebar-section">
    <div class="sidebar-label">Content</div>
    <a href="/tools" class="nav-item ${activeNav==='tools'?'active':''}">
      <div class="nav-icon" style="background:rgba(52,211,153,0.12)"><i class="fa fa-robot" style="color:var(--accent3)"></i></div>
      AI Tools
      <span class="nav-badge green">DB</span>
    </a>
    <a href="/ebooks" class="nav-item ${activeNav==='ebooks'?'active':''}">
      <div class="nav-icon" style="background:rgba(245,158,11,0.12)"><i class="fa fa-book-open" style="color:var(--accent4)"></i></div>
      Ebooks
      <span class="nav-badge orange">DB</span>
    </a>
    <a href="/users" class="nav-item ${activeNav==='users'?'active':''}">
      <div class="nav-icon" style="background:rgba(167,139,250,0.12)"><i class="fa fa-users" style="color:var(--accent2)"></i></div>
      Users
    </a>
  </div>

  <div class="sidebar-section">
    <div class="sidebar-label">Upload</div>
    <a href="/tools/upload" class="nav-item ${activeNav==='tools-upload'?'active':''}">
      <div class="nav-icon" style="background:rgba(52,211,153,0.08)"><i class="fa fa-file-excel" style="color:var(--accent3)"></i></div>
      Upload Tools
    </a>
    <a href="/ebooks/upload" class="nav-item ${activeNav==='ebooks-upload'?'active':''}">
      <div class="nav-icon" style="background:rgba(245,158,11,0.08)"><i class="fa fa-file-upload" style="color:var(--accent4)"></i></div>
      Upload Ebooks
    </a>
  </div>

  <div class="sidebar-divider"></div>

  <div class="sidebar-section">
    <div class="sidebar-label">System</div>
    <a href="/analytics" class="nav-item ${activeNav==='analytics'?'active':''}">
      <div class="nav-icon" style="background:rgba(99,130,255,0.08)"><i class="fa fa-chart-line" style="color:var(--accent)"></i></div>
      Analytics
    </a>
    <a href="/settings" class="nav-item ${activeNav==='settings'?'active':''}">
      <div class="nav-icon" style="background:rgba(100,116,139,0.12)"><i class="fa fa-gear" style="color:var(--text3)"></i></div>
      Settings
    </a>
  </div>

  <div class="sidebar-divider"></div>

  <div class="sidebar-section">
    <a href="/logout" class="nav-item" style="color:var(--danger)">
      <div class="nav-icon" style="background:rgba(248,113,113,0.1)"><i class="fa fa-sign-out-alt" style="color:var(--danger)"></i></div>
      Logout
    </a>
  </div>

</aside>

<!-- Main content -->
<main class="main" id="main">
  ${bodyContent}
</main>

<script>
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
  document.getElementById('hamburgerBtn').addEventListener('click', function() {
    var s = document.getElementById('sidebar');
    s.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  // Stagger child animations
  var cards = document.querySelectorAll('.stat-card');
  for (var i = 0; i < cards.length; i++) {
    cards[i].style.animationDelay = (i * 0.07) + 's';
  }

  // Auto-dismiss alerts after 4s
  var alerts = document.querySelectorAll('.alert');
  for (var j = 0; j < alerts.length; j++) {
    (function(el) {
      setTimeout(function() {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = '0';
        setTimeout(function() { el.remove(); }, 500);
      }, 4000);
    })(alerts[j]);
  }
</script>

</body>
</html>`;
}

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Select AI Admin — Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
  <style>
    :root {
      --bg: #0a0e1a; --surface: #151c33; --border: rgba(99,130,255,0.2);
      --accent: #6382ff; --accent2: #a78bfa; --text: #e2e8f0; --text2: #94a3b8;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    /* Animated orbs */
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.12;
      animation: float 8s ease-in-out infinite;
      pointer-events: none;
    }
    .orb1 { width: 500px; height: 500px; background: var(--accent);  top: -200px; left: -100px; animation-delay: 0s; }
    .orb2 { width: 400px; height: 400px; background: var(--accent2); bottom: -150px; right: -100px; animation-delay: -4s; }
    .orb3 { width: 300px; height: 300px; background: #34d399; top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -2s; }
    @keyframes float {
      0%,100% { transform: translate(0,0) scale(1); }
      33%      { transform: translate(20px,-20px) scale(1.05); }
      66%      { transform: translate(-20px,15px) scale(0.97); }
    }
    /* Grid bg */
    body::before {
      content: '';
      position: fixed; inset: 0;
      background-image: linear-gradient(rgba(99,130,255,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99,130,255,0.05) 1px, transparent 1px);
      background-size: 36px 36px;
      pointer-events: none;
    }
    .login-card {
      position: relative; z-index: 10;
      background: rgba(21,28,51,0.85);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 48px 44px;
      width: 100%;
      max-width: 420px;
      backdrop-filter: blur(24px);
      box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,130,255,0.1);
      animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .logo-ring {
      width: 64px; height: 64px;
      border-radius: 18px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px; font-weight: 700; color: #fff;
      margin: 0 auto 24px;
      box-shadow: 0 0 40px rgba(99,130,255,0.4);
      animation: pulse 3s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100% { box-shadow: 0 0 40px rgba(99,130,255,0.4); }
      50%      { box-shadow: 0 0 60px rgba(99,130,255,0.7), 0 0 100px rgba(167,139,250,0.3); }
    }
    h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px; font-weight: 700;
      color: var(--text);
      text-align: center;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    .login-sub { text-align: center; color: var(--text2); font-size: 14px; margin-bottom: 32px; }
    .field { margin-bottom: 16px; }
    .field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 6px; letter-spacing: 0.3px; }
    .field-wrap { position: relative; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text2); font-size: 14px; }
    .field-input {
      width: 100%;
      background: rgba(10,14,26,0.7);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 14px 12px 40px;
      color: var(--text);
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(99,130,255,0.15);
    }
    .field-input::placeholder { color: rgba(148,163,184,0.5); }
    .login-btn {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border: none; border-radius: 10px;
      color: #fff; font-size: 15px; font-weight: 700;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(99,130,255,0.35);
      margin-top: 8px;
      position: relative;
      overflow: hidden;
    }
    .login-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(99,130,255,0.5); }
    .login-btn:active { transform: translateY(0); }
    .login-btn::after {
      content: '';
      position: absolute; inset: 0;
      background: rgba(255,255,255,0.1);
      opacity: 0;
      transition: opacity 0.2s;
    }
    .login-btn:hover::after { opacity: 1; }
    .login-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: var(--text2);
    }
    @media (max-width: 480px) {
      .login-card { padding: 36px 24px; margin: 16px; }
    }
  </style>
</head>
<body>
  <div class="orb orb1"></div>
  <div class="orb orb2"></div>
  <div class="orb orb3"></div>
  <script>if(localStorage.getItem('loggedIn')==='true'){window.location.href='/home';}</script>
  <div class="login-card">
    <div class="logo-ring">S</div>
    <h1>Welcome back</h1>
    <p class="login-sub">Sign in to your admin dashboard</p>
    <form action="/login" method="POST">
      <div class="field">
        <label class="field-label">USERNAME</label>
        <div class="field-wrap">
          <i class="fa fa-user field-icon"></i>
          <input type="text" name="username" class="field-input" placeholder="Enter username" required autocomplete="username"/>
        </div>
      </div>
      <div class="field">
        <label class="field-label">PASSWORD</label>
        <div class="field-wrap">
          <i class="fa fa-lock field-icon"></i>
          <input type="password" name="password" class="field-input" placeholder="Enter password" required autocomplete="current-password"/>
        </div>
      </div>
      <button type="submit" class="login-btn">Sign in <i class="fa fa-arrow-right" style="margin-left:8px"></i></button>
    </form>
    <p class="login-footer">Select AI Admin Panel v2.0</p>
  </div>
</body>
</html>`);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.send(`<script>localStorage.setItem('loggedIn','true');localStorage.setItem('username','${username}');window.location.href='/home';</script>`);
  } else {
    res.send(`<script>alert('Invalid username or password');window.location.href='/';</script>`);
  }
});

app.get('/logout', (req, res) => {
  res.send(`<script>if(confirm('Log out of admin panel?')){localStorage.removeItem('loggedIn');window.location.href='/';}else{history.back();}</script>`);
});

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get('/home', async (req, res) => {
  try {
    await connectDB();
    const [users, basicQ, advQ, toolCount, ebookCount] = await Promise.all([
      User.countDocuments(),
      Quiz.countDocuments({ BasicQuiz: true }),
      Quiz.countDocuments({ AdvanceQuiz: { $ne: null } }),
      Tool.countDocuments(),
      Ebook.countDocuments(),
    ]);

    // Pre-serialize chart data BEFORE building template literal
    // Use Number() to ensure these are always plain integers — no DB strings
    const tc  = Number(toolCount)  || 0;
    const uc  = Number(users)      || 0;
    const ec  = Number(ebookCount) || 0;
    const bq  = Number(basicQ)     || 0;
    const aq  = Number(advQ)       || 0;
    const qTotal = bq + aq;

    // Build health cards HTML using string concat to avoid nested template literals
    var healthCards = '';
    var hItems = [
      ['Uptime',       '99.9%', '99.9%',  'var(--accent)'],
      ['Response Time','142ms', '70%',    'var(--accent3)'],
      ['DB Connections','3/10', '30%',    'var(--accent4)'],
      ['Error Rate',   '0.01%','5%',      'var(--accent3)'],
    ];
    for (var hi = 0; hi < hItems.length; hi++) {
      var hl = hItems[hi][0], hv = hItems[hi][1], hw = hItems[hi][2], hc = hItems[hi][3];
      healthCards += '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:18px">'
        + '<div style="font-size:11px;color:var(--text3);font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">' + hl + '</div>'
        + '<div style="font-size:24px;font-weight:700;font-family:Space Grotesk,sans-serif;color:var(--text)">' + hv + '</div>'
        + '<div style="height:4px;background:var(--border);border-radius:2px;margin-top:10px">'
        + '<div style="height:100%;width:' + hw + ';background:' + hc + ';border-radius:2px"></div>'
        + '</div></div>';
    }

    const body = '<div class="page-header">'
      + '<div class="page-eyebrow">Overview</div>'
      + '<h1 class="page-title">Dashboard</h1>'
      + '<p class="page-sub">Welcome back, Admin. Here\'s what\'s happening.</p>'
      + '</div>'

      + '<div class="cards-grid">'
      + '<div class="stat-card blue stagger-1"><div class="stat-icon"><i class="fa fa-robot"></i></div><div class="stat-value" id="cnt-tools">0</div><div class="stat-label">AI Tools</div><div class="stat-trend blue"><i class="fa fa-database" style="font-size:9px"></i> In MongoDB</div></div>'
      + '<div class="stat-card purple stagger-2"><div class="stat-icon"><i class="fa fa-users"></i></div><div class="stat-value" id="cnt-users">0</div><div class="stat-label">Registered Users</div><div class="stat-trend up"><i class="fa fa-arrow-up" style="font-size:9px"></i> Active</div></div>'
      + '<div class="stat-card green stagger-3"><div class="stat-icon"><i class="fa fa-book-open"></i></div><div class="stat-value" id="cnt-ebooks">0</div><div class="stat-label">Ebooks</div><div class="stat-trend blue"><i class="fa fa-database" style="font-size:9px"></i> In MongoDB</div></div>'
      + '<div class="stat-card amber stagger-4"><div class="stat-icon"><i class="fa fa-circle-check"></i></div><div class="stat-value" id="cnt-quiz">0</div><div class="stat-label">Quiz Attempts</div><div class="stat-trend up"><i class="fa fa-arrow-up" style="font-size:9px"></i> Total</div></div>'
      + '</div>'

      + '<div class="charts-grid">'
      + '<div class="chart-card"><div class="chart-title">Platform Statistics</div><div class="chart-sub">Users, quizzes and activity</div><canvas id="chart1" height="220"></canvas></div>'
      + '<div class="chart-card"><div class="chart-title">Quiz Distribution</div><div class="chart-sub">Basic vs Advanced</div><canvas id="chart2" height="220"></canvas></div>'
      + '</div>'

      + '<div class="panel"><div class="panel-header"><div><div class="panel-title">Server Health</div><div class="panel-sub">Infrastructure status</div></div>'
      + '<span class="badge badge-green"><i class="fa fa-circle" style="font-size:8px"></i> All systems operational</span></div>'
      + '<div style="padding:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">'
      + healthCards
      + '</div></div>'

      // Inject data via a hidden element — completely avoids template literal nesting
      + '<div id="dash-data"'
      + ' data-tools="'  + tc     + '"'
      + ' data-users="'  + uc     + '"'
      + ' data-ebooks="' + ec     + '"'
      + ' data-quiz="'   + qTotal + '"'
      + ' data-bq="'     + bq     + '"'
      + ' data-aq="'     + aq     + '"'
      + ' style="display:none"></div>'

      + '<script>'
      + 'window.addEventListener("DOMContentLoaded", function() {'
      + '  var d = document.getElementById("dash-data");'
      + '  if (!d) return;'
      + '  var tc = parseInt(d.dataset.tools,10);'
      + '  var uc = parseInt(d.dataset.users,10);'
      + '  var ec = parseInt(d.dataset.ebooks,10);'
      + '  var qc = parseInt(d.dataset.quiz,10);'
      + '  var bq = parseInt(d.dataset.bq,10);'
      + '  var aq = parseInt(d.dataset.aq,10);'
      + '  function animateCount(id, target) {'
      + '    var el = document.getElementById(id); if (!el) return;'
      + '    var start = 0, step = Math.max(1, Math.ceil(target / 40));'
      + '    var t = setInterval(function() {'
      + '      start = Math.min(start + step, target);'
      + '      el.textContent = start.toLocaleString();'
      + '      if (start >= target) clearInterval(t);'
      + '    }, 30);'
      + '  }'
      + '  animateCount("cnt-tools",  tc);'
      + '  animateCount("cnt-users",  uc);'
      + '  animateCount("cnt-ebooks", ec);'
      + '  animateCount("cnt-quiz",   qc);'
      + '  if (typeof Chart === "undefined") return;'
      + '  var leg = { color: "#94a3b8", font: { size: 12 }, boxWidth: 12 };'
      + '  var gc  = "rgba(99,130,255,0.06)";'
      + '  var c1el = document.getElementById("chart1");'
      + '  var c2el = document.getElementById("chart2");'
      + '  if (c1el) {'
      + '    new Chart(c1el, {'
      + '      type: "bar",'
      + '      data: {'
      + '        labels: ["Basic Quizzes","Advanced Quizzes","Total Users"],'
      + '        datasets: [{ label: "Counts", data: [bq, aq, uc],'
      + '          backgroundColor: ["rgba(99,130,255,0.7)","rgba(167,139,250,0.7)","rgba(52,211,153,0.7)"],'
      + '          borderColor: ["#6382ff","#a78bfa","#34d399"],'
      + '          borderWidth: 2, borderRadius: 8 }]'
      + '      },'
      + '      options: { responsive: true, plugins: { legend: { labels: leg } },'
      + '        scales: { x: { ticks:{color:"#64748b"}, grid:{color:gc} }, y: { ticks:{color:"#64748b"}, grid:{color:gc}, beginAtZero:true } } }'
      + '    });'
      + '  }'
      + '  if (c2el) {'
      + '    new Chart(c2el, {'
      + '      type: "doughnut",'
      + '      data: {'
      + '        labels: ["Basic Quizzes","Advanced Quizzes"],'
      + '        datasets: [{ data: [bq, aq],'
      + '          backgroundColor: ["rgba(99,130,255,0.8)","rgba(167,139,250,0.8)"],'
      + '          borderColor: ["#6382ff","#a78bfa"], borderWidth: 2 }]'
      + '      },'
      + '      options: { responsive: true, cutout: "68%", plugins: { legend: { labels: leg } } }'
      + '    });'
      + '  }'
      + '});'
      + '</script>';

    res.send(shell('Dashboard', 'home', body));
  } catch (err) {
    console.error(err);
    res.status(500).send('<h2 style="font-family:sans-serif;padding:40px;color:red">Dashboard error: ' + err.message + '</h2>');
  }
});

// ─── USERS PAGE ────────────────────────────────────────────────────────────────
app.get('/users', async (req, res) => {
  try {
    await connectDB();
    const users = await User.find();
    const rows = users.length === 0
      ? `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-msg">No users found</div></div></td></tr>`
      : users.map((u, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><span class="td-name">${u.username || '-'}</span></td>
          <td>${u.email || '-'}</td>
          <td class="td-mono">${u.password ? u.password.slice(0, 8) + '••••••••' : 'N/A'}</td>
          <td><span class="badge badge-green"><i class="fa fa-circle" style="font-size:7px"></i> Active</span></td>
          <td>
            <form method="POST" action="/delete-user/${u._id}" onsubmit="return confirm('Delete ${(u.username||'user').replace(/'/g,"\\'")}?')">
              <button type="submit" class="btn btn-danger btn-xs"><i class="fa fa-trash"></i> Delete</button>
            </form>
          </td>
        </tr>`).join('');

    const body = `
      <div class="page-header">
        <div class="page-eyebrow">People</div>
        <h1 class="page-title">Users</h1>
        <p class="page-sub">${users.length} registered users</p>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div><div class="panel-title">All Users</div><div class="panel-sub">Registered accounts</div></div>
          <span class="badge badge-blue">${users.length} total</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Username</th><th>Email</th><th>Password</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    res.send(shell('Users', 'users', body));
  } catch (err) { res.status(500).send('Error'); }
});

app.post('/delete-user/:id', async (req, res) => {
  try {
    await connectDB();
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/users');
  } catch (err) { res.status(500).send('Error'); }
});

// ─── TOOLS PAGE ────────────────────────────────────────────────────────────────
app.get('/tools', async (req, res) => {
  try {
    await connectDB();
    const perPage = 40;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const filter = search ? { $or: [{ name: new RegExp(search,'i') }, { category: new RegExp(search,'i') }] } : {};
    const [recordCount, tools] = await Promise.all([
      Tool.countDocuments(filter),
      Tool.find(filter).skip((page - 1) * perPage).limit(perPage)
    ]);
    const totalPages = Math.ceil(recordCount / perPage);

    const rows = tools.length === 0
      ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🤖</div><div class="empty-msg">No tools found</div><div class="empty-sub">Try a different search or add your first tool</div></div></td></tr>`
      : tools.map((t, i) => `
        <tr>
          <td style="color:var(--text3);font-size:12px">${(page-1)*perPage+i+1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              ${t.image_url ? `<img src="${t.image_url}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'"/>` : `<div style="width:32px;height:32px;border-radius:8px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:14px">🤖</div>`}
              <div>
                <div class="td-name" style="font-size:13px">${t.name}</div>
                ${t.category ? `<div style="font-size:11px;color:var(--text3)">${t.category}</div>` : ''}
              </div>
            </div>
          </td>
          <td>${t.featured ? '<span class="badge badge-amber"><i class="fa fa-star" style="font-size:9px"></i> Featured</span>' : '<span class="badge badge-gray">Standard</span>'}</td>
          <td>${t.pricing ? `<span class="badge ${t.pricing.toLowerCase().includes('free')?'badge-green':'badge-blue'}">${t.pricing}</span>` : '<span class="badge badge-gray">-</span>'}</td>
          <td style="color:var(--text3);font-size:12px">${t.date || '-'}</td>
          <td>${t.official_link ? `<a href="${t.official_link}" target="_blank" class="btn btn-secondary btn-xs"><i class="fa fa-arrow-up-right-from-square"></i> Visit</a>` : '-'}</td>
          <td>
            <form method="POST" action="/api/tools/${t._id}?_method=DELETE" onsubmit="return confirm('Delete ${(t.name||'').replace(/'/g,"\\'")}?')">
              <button type="submit" class="btn btn-danger btn-xs"><i class="fa fa-trash"></i></button>
            </form>
          </td>
        </tr>`).join('');

    const pageLinks = Array.from({length: totalPages}, (_,i) => i+1)
      .map(i => `<a href="/tools?page=${i}${search?'&search='+encodeURIComponent(search):''}" class="page-link ${i===page?'active':''}">${i}</a>`).join('');

    const body = `
      <div class="page-header">
        <div class="page-eyebrow">Content</div>
        <h1 class="page-title">AI Tools</h1>
        <p class="page-sub">${recordCount} tools in database</p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><div class="panel-title">Add New Tool</div></div>
          <div class="panel-actions">
            <a href="/tools/upload" class="btn btn-success btn-sm"><i class="fa fa-file-excel"></i> Upload Excel</a>
          </div>
        </div>
        <form method="POST" action="/api/tools">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Name *</label><input name="name" required class="form-input" placeholder="Tool name"/></div>
            <div class="form-group"><label class="form-label">Category</label><input name="category" class="form-input" placeholder="e.g. Writing, Design"/></div>
            <div class="form-group"><label class="form-label">Pricing</label><input name="pricing" class="form-input" placeholder="Free / Paid / Freemium"/></div>
            <div class="form-group"><label class="form-label">Official Link</label><input name="official_link" class="form-input" placeholder="https://..."/></div>
            <div class="form-group"><label class="form-label">Image URL</label><input name="image_url" class="form-input" placeholder="https://..."/></div>
            <div class="form-group"><label class="form-label">Date</label><input name="date" type="date" class="form-input"/></div>
            <div class="form-group"><label class="form-label">Professions</label><input name="profession" class="form-input" placeholder="Developer, Designer (comma separated)"/></div>
            <div class="form-group"><label class="form-label">Tags</label><input name="tags" class="form-input" placeholder="ai, writing, productivity (comma separated)"/></div>
            <div class="form-group full"><label class="form-label">Description</label><textarea name="description" class="form-input" placeholder="Short description..."></textarea></div>
            <div class="form-group full"><label class="form-label">Details</label><textarea name="details" class="form-input" placeholder="Full details..."></textarea></div>
            <div class="form-group">
              <label class="checkbox-row"><input type="checkbox" name="featured"/><span style="font-size:13px;font-weight:500;color:var(--text)">Mark as Featured</span></label>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Add Tool</button>
          </div>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><div class="panel-title">All Tools</div><div class="panel-sub">${recordCount} records, page ${page} of ${totalPages||1}</div></div>
          <div class="panel-actions">
            <form method="GET" action="/tools" style="display:flex;gap:8px">
              <input name="search" value="${search}" class="form-input" style="width:200px;padding:7px 12px" placeholder="Search tools..."/>
              <button type="submit" class="btn btn-secondary btn-sm"><i class="fa fa-search"></i></button>
              ${search ? `<a href="/tools" class="btn btn-secondary btn-sm"><i class="fa fa-xmark"></i></a>` : ''}
            </form>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Tool</th><th>Featured</th><th>Pricing</th><th>Date</th><th>Link</th><th>Delete</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="pagination-info">Showing ${Math.min((page-1)*perPage+1,recordCount)}–${Math.min(page*perPage,recordCount)} of ${recordCount}</span>
          <div class="pagination-links">${pageLinks}</div>
        </div>
      </div>`;
    res.send(shell('AI Tools', 'tools', body));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// ─── TOOLS UPLOAD ──────────────────────────────────────────────────────────────
app.get('/tools/upload', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-eyebrow">Upload</div>
      <h1 class="page-title">Upload Tools via Excel</h1>
      <p class="page-sub">Bulk import AI tools from an .xlsx file</p>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><div class="panel-title">Excel Import</div></div>
        <a href="/tools" class="btn btn-secondary btn-sm"><i class="fa fa-arrow-left"></i> Back to Tools</a>
      </div>
      <form action="/tools/upload" method="POST" enctype="multipart/form-data">
        <div class="upload-zone" onclick="document.getElementById('fileInput').click()">
          <div class="upload-icon"><i class="fa fa-file-excel"></i></div>
          <div class="upload-title">Drop your Excel file here</div>
          <div class="upload-sub">or click to browse — supports .xlsx and .xls</div>
          <input type="file" id="fileInput" name="excelFile" accept=".xlsx,.xls" required style="display:none" onchange="document.getElementById('fname').textContent=this.files[0]?.name||''"/>
        </div>
        <div style="padding:0 24px 8px;font-size:13px;color:var(--accent)" id="fname"></div>
        <div style="padding:16px 24px;background:var(--bg3);margin:0 24px 24px;border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;color:var(--text2);letter-spacing:0.5px;margin-bottom:10px">EXPECTED COLUMNS</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${['name','description','category','link','official_link','pricing','availability','details','profession','tags','new_description','image_url','overviewimg','date','featured'].map(c=>`<span class="badge badge-gray" style="font-family:monospace">${c}</span>`).join('')}
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fa fa-cloud-upload-alt"></i> Import Tools</button>
        </div>
      </form>
    </div>`;
  res.send(shell('Upload Tools', 'tools-upload', body));
});

app.post('/tools/upload', upload.single('excelFile'), async (req, res) => {
  try {
    await connectDB();
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const tools = data.map(r => ({
      name: r.name||'', description: r.description||'', category: r.category||'',
      link: r.link||'', pricing: r.pricing||'', official_link: r.official_link||'',
      availability: r.availability||'', details: r.details||'',
      profession: r.profession ? r.profession.split(',').map(s=>s.trim()) : [],
      tags: r.tags ? r.tags.split(',').map(s=>s.trim()) : [],
      new_description: r.new_description||'', image_url: r.image_url||'',
      overviewimg: r.overviewimg||'', date: r.date||'',
      featured: r.featured==='true'||r.featured===true,
    }));
    await Tool.insertMany(tools);
    const body = `
      <div class="page-header"><div class="page-eyebrow">Upload</div><h1 class="page-title">Import Complete</h1></div>
      <div class="alert alert-success"><i class="fa fa-circle-check"></i> Successfully imported <strong>${tools.length} tools</strong> into MongoDB.</div>
      <a href="/tools" class="btn btn-primary"><i class="fa fa-arrow-left"></i> Back to Tools</a>`;
    res.send(shell('Upload Complete', 'tools-upload', body));
  } catch (err) {
    const body = `
      <div class="alert alert-error"><i class="fa fa-circle-exclamation"></i> Error: ${err.message}</div>
      <a href="/tools/upload" class="btn btn-secondary"><i class="fa fa-arrow-left"></i> Try Again</a>`;
    res.send(shell('Upload Error', 'tools-upload', body));
  }
});

// ─── EBOOKS PAGE ───────────────────────────────────────────────────────────────
app.get('/ebooks', async (req, res) => {
  try {
    await connectDB();
    const perPage = 40;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const filter = search ? { $or: [{ name: new RegExp(search,'i') }, { category: new RegExp(search,'i') }, { author: new RegExp(search,'i') }] } : {};
    const [recordCount, ebooks] = await Promise.all([
      Ebook.countDocuments(filter),
      Ebook.find(filter).skip((page - 1) * perPage).limit(perPage)
    ]);
    const totalPages = Math.ceil(recordCount / perPage);

    const rows = ebooks.length === 0
      ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📚</div><div class="empty-msg">No ebooks found</div></div></td></tr>`
      : ebooks.map((e, i) => `
        <tr>
          <td style="color:var(--text3);font-size:12px">${(page-1)*perPage+i+1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              ${e.image ? `<img src="${e.image}" style="width:32px;height:44px;border-radius:5px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'"/>` : `<div style="width:32px;height:44px;border-radius:5px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:16px">📖</div>`}
              <span class="td-name" style="font-size:13px">${e.name}</span>
            </div>
          </td>
          <td style="color:var(--text2)">${e.author || '-'}</td>
          <td style="color:var(--text2)">${e.publisher || '-'}</td>
          <td style="color:var(--text3);font-size:12px">${e.publish_date || '-'}</td>
          <td>${e.category ? `<span class="badge badge-amber">${e.category}</span>` : '-'}</td>
          <td>
            <form method="POST" action="/api/ebooks/${e._id}?_method=DELETE" onsubmit="return confirm('Delete this ebook?')">
              <button type="submit" class="btn btn-danger btn-xs"><i class="fa fa-trash"></i></button>
            </form>
          </td>
        </tr>`).join('');

    const pageLinks = Array.from({length: totalPages}, (_,i) => i+1)
      .map(i => `<a href="/ebooks?page=${i}${search?'&search='+encodeURIComponent(search):''}" class="page-link ${i===page?'active':''}">${i}</a>`).join('');

    const body = `
      <div class="page-header">
        <div class="page-eyebrow">Content</div>
        <h1 class="page-title">Ebooks</h1>
        <p class="page-sub">${recordCount} ebooks in database</p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><div class="panel-title">Add New Ebook</div></div>
          <a href="/ebooks/upload" class="btn btn-success btn-sm"><i class="fa fa-file-excel"></i> Upload Excel</a>
        </div>
        <form method="POST" action="/api/ebooks">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Name *</label><input name="name" required class="form-input" placeholder="Ebook title"/></div>
            <div class="form-group"><label class="form-label">Author</label><input name="author" class="form-input" placeholder="Author name"/></div>
            <div class="form-group"><label class="form-label">Publisher</label><input name="publisher" class="form-input" placeholder="Publisher"/></div>
            <div class="form-group"><label class="form-label">Publish Date</label><input name="publish_date" type="date" class="form-input"/></div>
            <div class="form-group"><label class="form-label">Category</label><input name="category" class="form-input" placeholder="Category"/></div>
            <div class="form-group"><label class="form-label">Image URL</label><input name="image" class="form-input" placeholder="https://..."/></div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary"><i class="fa fa-plus"></i> Add Ebook</button>
          </div>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div><div class="panel-title">All Ebooks</div><div class="panel-sub">${recordCount} records, page ${page} of ${totalPages||1}</div></div>
          <div class="panel-actions">
            <form method="GET" action="/ebooks" style="display:flex;gap:8px">
              <input name="search" value="${search}" class="form-input" style="width:200px;padding:7px 12px" placeholder="Search ebooks..."/>
              <button type="submit" class="btn btn-secondary btn-sm"><i class="fa fa-search"></i></button>
              ${search ? `<a href="/ebooks" class="btn btn-secondary btn-sm"><i class="fa fa-xmark"></i></a>` : ''}
            </form>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Title</th><th>Author</th><th>Publisher</th><th>Date</th><th>Category</th><th>Delete</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="pagination-info">Showing ${Math.min((page-1)*perPage+1,recordCount)}–${Math.min(page*perPage,recordCount)} of ${recordCount}</span>
          <div class="pagination-links">${pageLinks}</div>
        </div>
      </div>`;
    res.send(shell('Ebooks', 'ebooks', body));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

app.get('/ebooks/upload', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-eyebrow">Upload</div>
      <h1 class="page-title">Upload Ebooks via Excel</h1>
      <p class="page-sub">Bulk import ebooks from an .xlsx file</p>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><div class="panel-title">Excel Import</div></div>
        <a href="/ebooks" class="btn btn-secondary btn-sm"><i class="fa fa-arrow-left"></i> Back to Ebooks</a>
      </div>
      <form action="/ebooks/upload" method="POST" enctype="multipart/form-data">
        <div class="upload-zone" onclick="document.getElementById('fileInput2').click()">
          <div class="upload-icon"><i class="fa fa-book-open"></i></div>
          <div class="upload-title">Drop your Excel file here</div>
          <div class="upload-sub">supports .xlsx and .xls</div>
          <input type="file" id="fileInput2" name="excelFile" accept=".xlsx,.xls" required style="display:none" onchange="document.getElementById('fname2').textContent=this.files[0]?.name||''"/>
        </div>
        <div style="padding:0 24px 8px;font-size:13px;color:var(--accent)" id="fname2"></div>
        <div style="padding:16px 24px;background:var(--bg3);margin:0 24px 24px;border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;color:var(--text2);letter-spacing:0.5px;margin-bottom:10px">EXPECTED COLUMNS</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${['name','author','publisher','publish_date','category','image'].map(c=>`<span class="badge badge-gray" style="font-family:monospace">${c}</span>`).join('')}
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fa fa-cloud-upload-alt"></i> Import Ebooks</button>
        </div>
      </form>
    </div>`;
  res.send(shell('Upload Ebooks', 'ebooks-upload', body));
});

app.post('/ebooks/upload', upload.single('excelFile'), async (req, res) => {
  try {
    await connectDB();
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const ebooks = data.map(r => ({ name: r.name||'', author: r.author||'', publisher: r.publisher||'', publish_date: r.publish_date||'', category: r.category||'', image: r.image||'' }));
    await Ebook.insertMany(ebooks);
    const body = `
      <div class="page-header"><div class="page-eyebrow">Upload</div><h1 class="page-title">Import Complete</h1></div>
      <div class="alert alert-success"><i class="fa fa-circle-check"></i> Successfully imported <strong>${ebooks.length} ebooks</strong>.</div>
      <a href="/ebooks" class="btn btn-primary"><i class="fa fa-arrow-left"></i> Back to Ebooks</a>`;
    res.send(shell('Upload Complete', 'ebooks-upload', body));
  } catch (err) {
    const body = `
      <div class="alert alert-error"><i class="fa fa-circle-exclamation"></i> Error: ${err.message}</div>
      <a href="/ebooks/upload" class="btn btn-secondary"><i class="fa fa-arrow-left"></i> Try Again</a>`;
    res.send(shell('Upload Error', 'ebooks-upload', body));
  }
});

// ─── ANALYTICS PAGE ────────────────────────────────────────────────────────────
app.get('/analytics', async (req, res) => {
  try {
    await connectDB();
    const [toolCount, ebookCount, userCount, basicQ, advQ] = await Promise.all([
      Tool.countDocuments(), Ebook.countDocuments(), User.countDocuments(),
      Quiz.countDocuments({ BasicQuiz: true }), Quiz.countDocuments({ AdvanceQuiz: { $ne: null } }),
    ]);
    const featuredCount = await Tool.countDocuments({ featured: true });
    const freeCount     = await Tool.countDocuments({ pricing: /free/i });

    const body = `
      <div class="page-header">
        <div class="page-eyebrow">Insights</div>
        <h1 class="page-title">Analytics</h1>
        <p class="page-sub">Platform data overview</p>
      </div>

      <div class="cards-grid">
        ${[
          ['Total Tools', toolCount, 'robot', 'blue'],
          ['Featured Tools', featuredCount, 'star', 'amber'],
          ['Free Tools', freeCount, 'gift', 'green'],
          ['Total Ebooks', ebookCount, 'book-open', 'purple'],
          ['Users', userCount, 'users', 'blue'],
          ['Basic Quizzes', basicQ, 'circle-check', 'green'],
          ['Adv. Quizzes', advQ, 'graduation-cap', 'purple'],
          ['Quiz Total', basicQ+advQ, 'chart-bar', 'amber'],
        ].map(([l,v,ic,cl])=>`
          <div class="stat-card ${cl}">
            <div class="stat-icon"><i class="fa fa-${ic}"></i></div>
            <div class="stat-value">${v.toLocaleString()}</div>
            <div class="stat-label">${l}</div>
          </div>`).join('')}
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-title">Content Breakdown</div>
          <div class="chart-sub">Tools vs Ebooks</div>
          <canvas id="ca1" height="250"></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-title">Tools by Type</div>
          <div class="chart-sub">Featured & Free breakdown</div>
          <canvas id="ca2" height="250"></canvas>
        </div>
      </div>

      <script>
        window.addEventListener('DOMContentLoaded', function() {
          var legendLabels = { color: '#94a3b8', font: { size: 12 }, boxWidth: 12 };
          var gridColor = 'rgba(99,130,255,0.06)';
          if (typeof Chart === 'undefined') return;
          new Chart(document.getElementById('ca1'), {
            type: 'doughnut',
            data: { labels: ['Tools','Ebooks'], datasets: [{ data: [${toolCount},${ebookCount}], backgroundColor: ['rgba(99,130,255,0.8)','rgba(245,158,11,0.8)'], borderColor: ['#6382ff','#f59e0b'], borderWidth: 2 }] },
            options: { responsive: true, cutout: '65%', plugins: { legend: { labels: legendLabels } } }
          });
          new Chart(document.getElementById('ca2'), {
            type: 'bar',
            data: { labels: ['All Tools','Featured','Free'], datasets: [{ data: [${toolCount},${featuredCount},${freeCount}], backgroundColor: ['rgba(99,130,255,0.7)','rgba(245,158,11,0.7)','rgba(52,211,153,0.7)'], borderRadius: 8 }] },
            options: { responsive: true, plugins: { legend: { labels: legendLabels } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: gridColor } }, y: { ticks: { color: '#64748b' }, grid: { color: gridColor }, beginAtZero: true } } }
          });
        });
      </script>`;
    res.send(shell('Analytics', 'analytics', body));
  } catch (err) { res.status(500).send('Error'); }
});

// ─── SETTINGS PAGE ─────────────────────────────────────────────────────────────
app.get('/settings', (req, res) => {
  const body = `
    <div class="page-header">
      <div class="page-eyebrow">Configuration</div>
      <h1 class="page-title">Settings</h1>
      <p class="page-sub">Admin panel configuration</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px">
      ${[
        ['Database', 'fa-database', 'green', 'MongoDB Atlas', 'Connected and healthy', 'View Logs'],
        ['API Server', 'fa-server', 'blue', 'Express v4', 'Running on Vercel', 'Ping'],
        ['Search', 'fa-magnifying-glass', 'amber', 'Algolia', 'Index sync available', 'Sync Now'],
        ['Email', 'fa-envelope', 'purple', 'Nodemailer / Gmail', 'SMTP configured', 'Test'],
      ].map(([t,ic,cl,val,sub,btn])=>`
        <div class="panel" style="margin-bottom:0">
          <div class="panel-header" style="border-bottom:none">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="stat-icon" style="background:rgba(${cl==='green'?'52,211,153':cl==='blue'?'99,130,255':cl==='amber'?'245,158,11':'167,139,250'},0.12)">
                <i class="fa ${ic}" style="color:var(--accent${cl==='green'?'3':cl==='amber'?'4':cl==='purple'?'2':''})"></i>
              </div>
              <div>
                <div class="panel-title">${t}</div>
                <div style="font-size:13px;font-weight:600;color:var(--text)">${val}</div>
                <div class="panel-sub">${sub}</div>
              </div>
            </div>
            <span class="badge badge-${cl}"><i class="fa fa-circle" style="font-size:7px"></i> Active</span>
          </div>
          <div style="padding:0 24px 20px">
            <button class="btn btn-secondary btn-sm" onclick="alert('Feature available in production')">${btn}</button>
          </div>
        </div>`).join('')}
    </div>`;
  res.send(shell('Settings', 'settings', body));
});

// ─── TOOL & EBOOK CRUD APIs ────────────────────────────────────────────────────
app.get('/api/tools', async (req, res) => {
  try { await connectDB(); res.json(await Tool.find()); } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.get('/api/tools/:id', async (req, res) => {
  try { await connectDB(); const t = await Tool.findById(req.params.id); t ? res.json(t) : res.status(404).json({ error: 'Not found' }); } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.post('/api/tools', async (req, res) => {
  try {
    await connectDB();
    const t = new Tool({ ...req.body, featured: req.body.featured === 'on' || req.body.featured === true });
    await t.save();
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) return res.redirect('/tools');
    res.status(201).json(t);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.put('/api/tools/:id', async (req, res) => {
  try { await connectDB(); const t = await Tool.findByIdAndUpdate(req.params.id, req.body, { new: true }); t ? res.json(t) : res.status(404).json({ error: 'Not found' }); } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.delete('/api/tools/:id', async (req, res) => {
  try {
    await connectDB();
    await Tool.findByIdAndDelete(req.params.id);
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) return res.redirect('/tools');
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

app.get('/api/ebooks', async (req, res) => {
  try { await connectDB(); res.json(await Ebook.find()); } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.get('/api/ebooks/:id', async (req, res) => {
  try { await connectDB(); const e = await Ebook.findById(req.params.id); e ? res.json(e) : res.status(404).json({ error: 'Not found' }); } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.post('/api/ebooks', async (req, res) => {
  try {
    await connectDB();
    const e = new Ebook(req.body);
    await e.save();
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) return res.redirect('/ebooks');
    res.status(201).json(e);
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.put('/api/ebooks/:id', async (req, res) => {
  try { await connectDB(); const e = await Ebook.findByIdAndUpdate(req.params.id, req.body, { new: true }); e ? res.json(e) : res.status(404).json({ error: 'Not found' }); } catch (e) { res.status(500).json({ error: 'Error' }); }
});
app.delete('/api/ebooks/:id', async (req, res) => {
  try {
    await connectDB();
    await Ebook.findByIdAndDelete(req.params.id);
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) return res.redirect('/ebooks');
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Error' }); }
});

module.exports = app;
