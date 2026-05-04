"""
AI Tutor Agent — User Guide & Manual PDF Generator
Produces a concise, professional 7-page PDF.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "AI-Tutor-Agent-User-Guide.pdf")

# ── Colour palette ────────────────────────────────────────────────────────────
NAVY      = colors.HexColor("#0F172A")
BLUE      = colors.HexColor("#3B82F6")
PURPLE    = colors.HexColor("#7C3AED")
TEAL      = colors.HexColor("#0EA5E9")
LIGHT_BG  = colors.HexColor("#F1F5F9")
MID_GRAY  = colors.HexColor("#64748B")
DARK_GRAY = colors.HexColor("#334155")
WHITE     = colors.white
AMBER     = colors.HexColor("#F59E0B")
GREEN     = colors.HexColor("#10B981")

W, H = A4  # 595 x 842 pts

# ── Styles ────────────────────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle("cover_title",
            fontSize=32, leading=38, textColor=WHITE,
            fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=8),
        "cover_sub": ParagraphStyle("cover_sub",
            fontSize=14, leading=20, textColor=colors.HexColor("#CBD5E1"),
            fontName="Helvetica", alignment=TA_CENTER, spaceAfter=4),
        "cover_url": ParagraphStyle("cover_url",
            fontSize=10, leading=14, textColor=colors.HexColor("#94A3B8"),
            fontName="Helvetica", alignment=TA_CENTER),
        "h1": ParagraphStyle("h1",
            fontSize=18, leading=24, textColor=NAVY,
            fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6),
        "h2": ParagraphStyle("h2",
            fontSize=13, leading=18, textColor=BLUE,
            fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4),
        "body": ParagraphStyle("body",
            fontSize=9.5, leading=15, textColor=DARK_GRAY,
            fontName="Helvetica", spaceAfter=5),
        "bullet": ParagraphStyle("bullet",
            fontSize=9.5, leading=15, textColor=DARK_GRAY,
            fontName="Helvetica", leftIndent=14, spaceAfter=3,
            bulletIndent=4, bulletText="•"),
        "badge": ParagraphStyle("badge",
            fontSize=8, leading=12, textColor=WHITE,
            fontName="Helvetica-Bold", alignment=TA_CENTER),
        "caption": ParagraphStyle("caption",
            fontSize=8, leading=12, textColor=MID_GRAY,
            fontName="Helvetica-Oblique", alignment=TA_CENTER),
        "tip_head": ParagraphStyle("tip_head",
            fontSize=9.5, leading=14, textColor=NAVY,
            fontName="Helvetica-Bold", spaceAfter=2),
        "tip_body": ParagraphStyle("tip_body",
            fontSize=9, leading=14, textColor=DARK_GRAY,
            fontName="Helvetica", spaceAfter=0),
        "footer": ParagraphStyle("footer",
            fontSize=7.5, leading=10, textColor=MID_GRAY,
            fontName="Helvetica", alignment=TA_CENTER),
    }

S = make_styles()

# ── Canvas callbacks (header / footer) ───────────────────────────────────────
def cover_page_bg(canvas, doc):
    """Full-bleed gradient cover."""
    canvas.saveState()
    # Deep navy background
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Decorative teal bar across top
    canvas.setFillColor(BLUE)
    canvas.rect(0, H - 8*mm, W, 8*mm, fill=1, stroke=0)
    # Subtle bottom strip
    canvas.setFillColor(PURPLE)
    canvas.rect(0, 0, W, 4*mm, fill=1, stroke=0)
    # Light circle accent top-right
    canvas.setFillColor(colors.HexColor("#1E3A5F"))
    canvas.circle(W - 30*mm, H - 30*mm, 45*mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#1E40AF"))
    canvas.circle(W - 30*mm, H - 30*mm, 28*mm, fill=1, stroke=0)
    canvas.restoreState()

def interior_page(canvas, doc):
    """Header bar + page number for interior pages."""
    canvas.saveState()
    # Top header strip
    canvas.setFillColor(NAVY)
    canvas.rect(0, H - 14*mm, W, 14*mm, fill=1, stroke=0)
    # App name in header
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(15*mm, H - 9*mm, "🎓  AI Tutor Agent — User Guide")
    # Page number right-aligned
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(W - 15*mm, H - 9*mm, f"Page {doc.page}")
    # Footer rule
    canvas.setStrokeColor(LIGHT_BG)
    canvas.setLineWidth(0.5)
    canvas.line(15*mm, 12*mm, W - 15*mm, 12*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MID_GRAY)
    canvas.drawCentredString(W/2, 7*mm, "ai-tutor-agent-ten.vercel.app  ·  v2.1  ·  2026")
    canvas.restoreState()

# ── Helper builders ───────────────────────────────────────────────────────────
def rule(color=LIGHT_BG, thickness=1):
    return HRFlowable(width="100%", thickness=thickness,
                      color=color, spaceAfter=6, spaceBefore=2)

def badge_table(items, bg=BLUE):
    """Inline coloured badge pills in a table row."""
    data = [[Paragraph(t, S["badge"]) for t in items]]
    col_w = (W - 40*mm) / len(items)
    ts = TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("TEXTCOLOR",  (0,0), (-1,-1), WHITE),
        ("ALIGN",      (0,0), (-1,-1), "CENTER"),
        ("VALIGN",     (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ("INNERGRID",  (0,0), (-1,-1), 0, WHITE),
        ("BOX",        (0,0), (-1,-1), 0, WHITE),
        ("COLPADDING", (0,0), (-1,-1), 4),
    ])
    t = Table(data, colWidths=[col_w]*len(items), rowHeights=[18])
    t.setStyle(ts)
    return t

def info_table(rows, col_ratio=(0.38, 0.62)):
    """Two-column key-value info table."""
    cw = [(W - 40*mm) * r for r in col_ratio]
    data = [[Paragraph(f"<b>{k}</b>", S["body"]),
             Paragraph(v, S["body"])] for k, v in rows]
    ts = TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), LIGHT_BG),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [WHITE, LIGHT_BG]),
        ("TEXTCOLOR",     (0,0), (-1,-1), DARK_GRAY),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("LINEBELOW",     (0,0), (-1,-2), 0.3, colors.HexColor("#E2E8F0")),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
    ])
    t = Table(data, colWidths=cw)
    t.setStyle(ts)
    return t

def tip_box(heading, body, color=TEAL):
    """Coloured tip/callout box."""
    inner = [
        [Paragraph(heading, S["tip_head"])],
        [Paragraph(body, S["tip_body"])],
    ]
    ts = TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("TOPPADDING",    (0,0), (0,0), 8),
        ("BOTTOMPADDING", (0,-1), (-1,-1), 8),
        ("LINEBEFORE",    (0,0), (-1,-1), 3, color),
        ("BOX",           (0,0), (-1,-1), 0.3, colors.HexColor("#BFDBFE")),
    ])
    t = Table(inner, colWidths=[W - 40*mm])
    t.setStyle(ts)
    return t

def mode_table(modes):
    """5-column mode overview table."""
    header = [Paragraph(f"<b>{m}</b>", S["badge"]) for m in modes.keys()]
    desc   = [Paragraph(v, S["tip_body"]) for v in modes.values()]
    data   = [header, desc]
    cw = [(W - 40*mm) / len(modes)] * len(modes)
    ts = TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), BLUE),
        ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
        ("BACKGROUND",    (0,1), (-1,1), LIGHT_BG),
        ("ALIGN",         (0,0), (-1,0), "CENTER"),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("INNERGRID",     (0,0), (-1,-1), 0.3, colors.HexColor("#CBD5E1")),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
    ])
    t = Table(data, colWidths=cw)
    t.setStyle(ts)
    return t

def feature_grid(features):
    """3-column feature cards."""
    rows = []
    row  = []
    cw = [(W - 40*mm) / 3] * 3
    for i, (icon, title, desc) in enumerate(features):
        cell = Table([
            [Paragraph(f"{icon}  <b>{title}</b>", S["tip_head"])],
            [Paragraph(desc, S["tip_body"])],
        ], colWidths=[cw[0] - 12])
        cell.setStyle(TableStyle([
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ]))
        row.append(cell)
        if len(row) == 3:
            rows.append(row); row = []
    if row:
        while len(row) < 3: row.append(Paragraph("", S["body"]))
        rows.append(row)
    ts = TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), LIGHT_BG),
        ("LINEBEFORE",    (0,0), (-1,-1), 2, BLUE),
        ("INNERGRID",     (0,0), (-1,-1), 0.4, WHITE),
        ("BOX",           (0,0), (-1,-1), 0.4, colors.HexColor("#CBD5E1")),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ])
    t = Table(rows, colWidths=cw)
    t.setStyle(ts)
    return t

# ── Build story ───────────────────────────────────────────────────────────────
def build_story():
    story = []

    # ── PAGE 1: COVER ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 55*mm))
    story.append(Paragraph("🎓", ParagraphStyle("em", fontSize=48,
        alignment=TA_CENTER, textColor=WHITE, leading=60)))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("AI Tutor Agent", S["cover_title"]))
    story.append(Paragraph("User Guide &amp; Manual", S["cover_sub"]))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Version 2.1  ·  2026", S["cover_url"]))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("ai-tutor-agent-ten.vercel.app", S["cover_url"]))
    story.append(Spacer(1, 16*mm))

    # Feature pills on cover
    pills_data = [["RAG + Streaming", "5 Learning Modes", "3 AI Providers"]]
    pts = TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#1E3A5F")),
        ("TEXTCOLOR",     (0,0), (-1,-1), colors.HexColor("#93C5FD")),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("FONTNAME",      (0,0), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#3B82F6")),
        ("INNERGRID",     (0,0), (-1,-1), 0.5, colors.HexColor("#3B82F6")),
    ])
    pw = (W - 80*mm) / 3
    pt = Table(pills_data, colWidths=[pw, pw, pw])
    pt.setStyle(pts)
    story.append(Table([[pt]], colWidths=[W - 40*mm],
        style=[("ALIGN",(0,0),(-1,-1),"CENTER"),
               ("LEFTPADDING",(0,0),(-1,-1),0),
               ("RIGHTPADDING",(0,0),(-1,-1),0)]))

    story.append(PageBreak())

    # ── PAGE 2: INTRODUCTION & QUICK START ────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Introduction", S["h1"]))
    story.append(rule())
    story.append(Paragraph(
        "AI Tutor Agent is a cloud-based learning assistant powered by "
        "Retrieval-Augmented Generation (RAG). Upload any document — PDF, Word, "
        "Markdown, image, audio, or video — and the app builds a searchable "
        "knowledge base. Ask questions in plain English and receive streamed, "
        "source-cited answers from Claude, Gemini, or OpenAI.", S["body"]))
    story.append(Spacer(1, 2*mm))
    story.append(tip_box("🌐  Live App",
        "Access the app at: ai-tutor-agent-ten.vercel.app  — no installation required."))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("Quick Start", S["h1"]))
    story.append(rule())
    steps = [
        ("1", "Open the App", "Go to ai-tutor-agent-ten.vercel.app in any modern browser."),
        ("2", "Upload a Document", "Click the 📄 File button in the sidebar or drag & drop a file onto the upload zone."),
        ("3", "Wait for Processing", "A progress bar shows upload %, then the app processes the content into the knowledge base."),
        ("4", "Choose a Mode", "Select Explain, Quiz, Chat, Summarize, or Flashcards from the top toolbar."),
        ("5", "Ask a Question", "Type your question in the chat box and press Send (or Enter)."),
        ("6", "Get Your Answer", "The AI streams a markdown-formatted reply citing which document answered it."),
    ]
    step_data = []
    for num, title, desc in steps:
        step_data.append([
            Paragraph(f"<b>{num}</b>", ParagraphStyle("sn",
                fontSize=12, textColor=WHITE, fontName="Helvetica-Bold",
                alignment=TA_CENTER, leading=16)),
            Table([[Paragraph(f"<b>{title}</b>", S["tip_head"])],
                   [Paragraph(desc, S["tip_body"])]],
                  colWidths=[W - 40*mm - 18*mm - 6*mm])
        ])
    left_col = 18*mm
    right_col = W - 40*mm - left_col
    ts2 = TableStyle([
        ("BACKGROUND",    (0,0), (0,-1), BLUE),
        ("BACKGROUND",    (1,0), (1,-1), WHITE),
        ("ROWBACKGROUNDS",(1,0), (1,-1), [LIGHT_BG, WHITE]),
        ("ALIGN",         (0,0), (0,-1), "CENTER"),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("LINEBELOW",     (0,0), (-1,-2), 0.3, colors.HexColor("#E2E8F0")),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
    ])
    t = Table(step_data, colWidths=[left_col, right_col])
    t.setStyle(ts2)
    story.append(t)
    story.append(PageBreak())

    # ── PAGE 3: UPLOADING + LEARNING MODES ────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Uploading to the Knowledge Base", S["h1"]))
    story.append(rule())
    story.append(Paragraph(
        "The sidebar contains the upload panel. Two methods are available:", S["body"]))

    story.append(Paragraph("<b>📄 File Upload</b>", S["h2"]))
    story.append(info_table([
        ("PDF",           "Full text extraction from all pages"),
        ("Word (.docx)",  "Raw text extracted (formatting stripped)"),
        ("Markdown / TXT","Ingested as-is"),
        ("Images (JPG/PNG/GIF/WEBP)", "Described in detail by Claude or GPT-4o vision"),
        ("Audio (MP3/WAV/M4A)", "Transcribed with OpenAI Whisper"),
        ("Video (MP4/MOV/AVI)", "Audio track transcribed with Whisper"),
    ]))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph("<b>🔗 URL Ingest</b>", S["h2"]))
    story.append(Paragraph(
        "Switch to the URL tab and paste any public web page or PDF link. "
        "The app fetches and processes the content automatically.", S["body"]))
    story.append(tip_box("⏳  Progress Bar",
        "A live % bar tracks the upload. Once 100% is reached, the bar pulses "
        "while the AI processes (vision / transcription). Large video files may take up to 60 s."))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("The 5 Learning Modes", S["h1"]))
    story.append(rule())
    story.append(mode_table({
        "💡 Explain":    "In-depth breakdown with examples and analogies. Ends with a comprehension check.",
        "📝 Quiz":       "Generates one focused question. Provides feedback after you answer.",
        "💬 Chat":       "Free-form conversation. Great for follow-up questions.",
        "📋 Summarize":  "Structured overview with headings, bullets, and Key Takeaways.",
        "🃏 Flashcards": "Returns 5 Q&A pairs formatted for quick revision.",
    }))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        "Switch modes at any time using the toolbar above the chat. "
        "Each mode uses a tailored system prompt optimised for that learning style.", S["body"]))
    story.append(PageBreak())

    # ── PAGE 4: AI PROVIDERS + ROLES ─────────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("AI Providers", S["h1"]))
    story.append(rule())
    story.append(info_table([
        ("🟣  Claude (Agent 1)",  "Default. Best for creative explanation, tutoring, and nuanced writing."),
        ("🔵  Gemini (Agent 2)",  "Best for broad general knowledge, multi-topic questions."),
        ("🟢  OpenAI (Agent 3)",  "Best for analytical reasoning, structured problem-solving."),
    ]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Switch providers using the AI Provider panel in the sidebar or by voice: "
        '"Hey Agent 1", "Hey Agent 2", or "Hey Agent 3". '
        "Auto-fallback is enabled — if one provider is unavailable, the app "
        "automatically tries the next.", S["body"]))
    story.append(Spacer(1, 3*mm))
    story.append(tip_box("⚡  Auto-Switch on Role Change",
        "When you select a Role, the app automatically switches to the best-fit provider "
        "(e.g. Brainy Expert → OpenAI; General Knowledge → Gemini; others → Claude)."))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("Roles &amp; Personas", S["h1"]))
    story.append(rule())
    story.append(Paragraph(
        "Use the Role dropdown (top-right of the chat panel) to change the "
        "AI's persona. Each role adapts tone, depth, and style:", S["body"]))
    story.append(Spacer(1, 2*mm))
    story.append(info_table([
        ("🎓  AI Tutor",               "Socratic teaching style. Asks guiding questions. Scaffolds explanations."),
        ("🤝  Receptionist",           "Friendly, concise. Direct answers. 2–4 sentences. No over-explaining."),
        ("🧠  Brainy Expert",          "Rigorous analysis. Cites evidence. Distinguishes fact from inference."),
        ("🌐  General Knowledge Agent","Encyclopaedic breadth. Neutral language. Connects facts across domains."),
        ("✨  Creative Assistant",     "Imaginative. Varied sentence rhythm. Generates 3+ directions then refines."),
        ("⚙️  Custom role",            'Type any persona up to 80 characters (e.g. "Pirate Captain", "Finance CFO").'),
    ]))
    story.append(PageBreak())

    # ── PAGE 5: FEATURES ──────────────────────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Features Reference", S["h1"]))
    story.append(rule())
    story.append(feature_grid([
        ("💾", "Chat Persistence",
         "All messages are saved to localStorage keyed by session UUID. Survive page refresh automatically."),
        ("📱", "Mobile Sidebar",
         "Tap ☰ in the header to open the sidebar as a full-height overlay. Tap outside to close."),
        ("📋", "Code Copy Button",
         "Hover over any code block to reveal a Copy button in the top-right corner."),
        ("⚠️", "KB Reset Warning",
         "Amber banner appears after server restart wipes the in-memory vector store."),
        ("🗣️", "Voice Dictation",
         'Click 🎙️ Dictate to speak your question. Say "Hey Agent 1/2/3" to switch providers.'),
        ("🔊", "Auto-Read",
         "Toggle Auto-read ON/OFF. Click Read answer to replay the last response via TTS."),
        ("🖼️", "Image Attachment",
         "Attach an image to your message for visual analysis alongside your question."),
        ("📥", "Export Chat",
         "Download the full conversation as a Markdown file via the ↓ button in the toolbar."),
        ("⏹️", "Stop Generation",
         "Click the stop button during streaming to abort the response mid-reply."),
    ]))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("Managing the Knowledge Base", S["h1"]))
    story.append(rule())
    story.append(info_table([
        ("View docs",    "The Knowledge Base panel (sidebar) shows chunks, doc count, and a list of sources."),
        ("Delete a doc", "Click 🗑️ next to any document name to remove it and its chunks immediately."),
        ("Re-upload",    "After a server restart (cold start), re-upload documents — they are stored in RAM."),
        ("Clear history","Click the 🗑 button in the chat toolbar to clear chat and start a new session."),
    ]))
    story.append(PageBreak())

    # ── PAGE 6: KEYBOARD SHORTCUTS + TIPS ────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Keyboard Shortcuts", S["h1"]))
    story.append(rule())
    story.append(info_table([
        ("Enter",            "Send message"),
        ("Shift + Enter",    "New line in message (no send)"),
        ("Escape",           "Cancel current voice dictation"),
    ], col_ratio=(0.3, 0.7)))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("Tips &amp; Best Practices", S["h1"]))
    story.append(rule())
    tips = [
        ("Use Explain for new topics",
         "Start every new subject in 💡 Explain mode. The AI scaffolds from simple to complex and ends with a comprehension check."),
        ("Quiz yourself after reading",
         "Switch to 📝 Quiz after an Explain session. The AI generates one targeted question per message — answer it, then press Send for the next."),
        ("Flashcards for revision",
         "Use 🃏 Flashcards when reviewing. Copy the 5 Q&A pairs and paste into Anki or Notion for spaced repetition."),
        ("Focus on a specific doc",
         "If multiple documents are loaded, mention the filename in your question — the app prioritises that source first."),
        ("Richer answers with images",
         "Attach a diagram or screenshot to your message. Claude and GPT-4o will describe it and incorporate it into the answer."),
        ("Ingest audio lectures",
         "Upload MP3/WAV recordings. Whisper transcribes them into the knowledge base — then quiz yourself on the lecture content."),
        ("Custom role for specialised help",
         'Set a custom role like "Tax Accountant UK" or "Python Senior Engineer" for domain-specific answers.'),
        ("Keep the KB fresh",
         "Vercel serverless functions restart on cold start, wiping the in-memory vector store. Re-upload documents if the KB reset warning appears."),
    ]
    for i, (head, body) in enumerate(tips):
        story.append(tip_box(f"{'💡' if i % 3 == 0 else '📌' if i % 3 == 1 else '✅'}  {head}", body,
                              color=[TEAL, PURPLE, GREEN][i % 3]))
        story.append(Spacer(1, 3*mm))

    story.append(PageBreak())

    # ── PAGE 7: TROUBLESHOOTING + SUPPORT ────────────────────────────────────
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Troubleshooting", S["h1"]))
    story.append(rule())
    story.append(info_table([
        ("⚠️  'Knowledge base was reset'",
         "Vercel restarted the server. Re-upload your documents — the vector store is RAM-only."),
        ("⚠️  '502 AI provider error'",
         "API key is missing or invalid. Check environment variables in Vercel Settings."),
        ("⚠️  Backend offline message",
         "The serverless function is cold-starting. Refresh in 5–10 seconds."),
        ("No audio from TTS",
         "Browser may block autoplay. Click the 🔊 Read answer button manually."),
        ("Dictation not working",
         "Grant microphone permission when the browser prompts. Use HTTPS (required for mic API)."),
        ("Large video fails to upload",
         "Videos over 50 MB may time out on Vercel. Compress first or extract the audio track."),
        ("Chat history lost",
         "Chat is saved per session UUID. Clearing browser localStorage will erase history."),
    ], col_ratio=(0.38, 0.62)))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("API Key Configuration", S["h1"]))
    story.append(rule())
    story.append(Paragraph(
        "For self-hosted deployments, add these environment variables in "
        "Vercel → Project → Settings → Environment Variables:", S["body"]))
    story.append(Spacer(1, 2*mm))
    story.append(info_table([
        ("OPENAI_API_KEY",  "Required always — powers text-embedding-3-small for RAG retrieval."),
        ("LLM_PROVIDER",    "Set to claude, openai, or gemini (default: claude)."),
        ("CLAUDE_API_KEY",  "Required when LLM_PROVIDER=claude (Anthropic key)."),
        ("GEMINI_API_KEY",  "Required when LLM_PROVIDER=gemini (Google AI key)."),
        ("ALLOWED_ORIGIN",  "Set to your Vercel app URL for CORS (e.g. https://your-app.vercel.app)."),
    ]))
    story.append(Spacer(1, 5*mm))

    story.append(tip_box("📬  Support",
        "For issues, feature requests, or contributions, visit the GitHub repository:\n"
        "github.com/paulcoleltd/AT-Tutor-2",
        color=PURPLE))

    return story

# ── Document assembly ─────────────────────────────────────────────────────────
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=18*mm,
        title="AI Tutor Agent — User Guide",
        author="paulcoleltd",
        subject="AI Tutor Agent v2.1 User Manual",
    )

    story = build_story()

    def page_template(canvas, doc):
        if doc.page == 1:
            cover_page_bg(canvas, doc)
        else:
            interior_page(canvas, doc)

    doc.build(story, onFirstPage=page_template, onLaterPages=page_template)
    size_kb = os.path.getsize(OUTPUT) // 1024
    print(f"PDF generated: {OUTPUT}  ({size_kb} KB, {doc.page} pages)")

if __name__ == "__main__":
    build_pdf()
