"""
AI Tutor Agent — Feature Test Cases PDF Generator
Produces a professional test case document for all app features.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os, datetime

OUTPUT = os.path.join(os.path.dirname(__file__), "AI-Tutor-Agent-Test-Cases.pdf")

# ── Colour palette ────────────────────────────────────────────────────────────
VIOLET      = colors.HexColor("#7C3AED")
INDIGO      = colors.HexColor("#4F46E5")
INDIGO_LITE = colors.HexColor("#EEF2FF")
GREEN       = colors.HexColor("#059669")
GREEN_LITE  = colors.HexColor("#ECFDF5")
AMBER       = colors.HexColor("#D97706")
AMBER_LITE  = colors.HexColor("#FFFBEB")
RED         = colors.HexColor("#DC2626")
RED_LITE    = colors.HexColor("#FEF2F2")
SLATE_700   = colors.HexColor("#334155")
SLATE_500   = colors.HexColor("#64748B")
SLATE_200   = colors.HexColor("#E2E8F0")
WHITE       = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# ── Test case data ─────────────────────────────────────────────────────────────
TEST_CASES = [
    {
        "id": "TC-01",
        "feature": "Persistent Cross-Session Memory",
        "icon": "🧠",
        "description": "The AI remembers summaries of past conversations and injects them into new chats automatically.",
        "preconditions": [
            "App is open at the Vercel URL",
            "At least one LLM API key is configured",
        ],
        "steps": [
            "Start a chat and send: \"My name is Alex and I am studying for AZ-900\"",
            "Send 3 more messages on any topic",
            "Close the browser tab completely",
            "Reopen the app in a new tab",
            "Send: \"What do you know about me?\"",
        ],
        "expected": "The AI responds with the user's name (Alex) and study goal (AZ-900) without being told again.",
        "status_label": "PASS / FAIL",
        "priority": "High",
    },
    {
        "id": "TC-02",
        "feature": "Session History Panel",
        "icon": "🕑",
        "description": "Browse all past conversations by auto-generated title and resume any session with full context.",
        "preconditions": [
            "At least one previous conversation exists",
            "Backend is online",
        ],
        "steps": [
            "Have a conversation — send at least 3 messages",
            "Click the 🕑 (clock) button in the chat header",
            "Verify current session appears under \"Current session\"",
            "Click \"+ New Chat\" to start a fresh session",
            "Re-open the 🕑 panel",
            "Click the previous session from the \"Past sessions\" list",
        ],
        "expected": "The full previous conversation reloads in the chat window. The session ID updates.",
        "status_label": "PASS / FAIL",
        "priority": "High",
    },
    {
        "id": "TC-03",
        "feature": "Learning Progress Dashboard",
        "icon": "📊",
        "description": "Shows grade (A–F), quiz accuracy bars, streak, topics covered, mode breakdown, and exam history.",
        "preconditions": [
            "At least 3 quiz questions have been answered",
        ],
        "steps": [
            "Switch to Quiz mode using the mode tabs at the top of the chat",
            "Answer 4 questions — answer 3 correctly and 1 incorrectly",
            "Open the Learning Progress panel in the left sidebar",
            "Observe the grade badge, accuracy bar, and mode breakdown",
        ],
        "expected": "Grade shows B or higher (≥75%), quiz accuracy bar shows ~75%, 'Quiz' appears in mode breakdown.",
        "status_label": "PASS / FAIL",
        "priority": "Medium",
    },
    {
        "id": "TC-04",
        "feature": "Exam Mode",
        "icon": "🎓",
        "description": "Structured graded exam with 5 varied question types, automatic scoring, grade, and improvement suggestions.",
        "preconditions": [
            "Exam mode is available in mode tabs",
            "LLM API key is configured",
        ],
        "steps": [
            "Click the Exam tab (🎓) in the mode selector",
            "Send: \"Give me an exam on Python basics\"",
            "Answer all 5 questions in the exam",
            "Type SUBMIT to trigger grading",
        ],
        "expected": "The AI returns a score (e.g. 4/5), a letter grade (e.g. B), and a bullet list of topics to improve.",
        "status_label": "PASS / FAIL",
        "priority": "High",
    },
    {
        "id": "TC-05",
        "feature": "Certification Prep (🏆 Panel)",
        "icon": "🏆",
        "description": "20 certifications with mock exams in the exact vendor format, coaching mode, and study plans.",
        "preconditions": [
            "LLM API key is configured",
        ],
        "steps": [
            "Click the 🏆 (trophy) button in the chat header",
            "Type 'AZ-900' in the search box",
            "Select the AZ-900 certification card",
            "Review the domain breakdown and stats",
            "Click 'Start Mock Exam'",
        ],
        "expected": "Chat starts an AZ-900 mock exam with Microsoft-style questions covering Cloud Concepts, Azure Services, and Pricing domains.",
        "status_label": "PASS / FAIL",
        "priority": "High",
    },
    {
        "id": "TC-06",
        "feature": "Coaching Mode",
        "icon": "💬",
        "description": "Interactive one-question-at-a-time practice for any subject or certification with instant feedback.",
        "preconditions": [
            "LLM API key is configured",
        ],
        "steps": [
            "Click the 🏆 button and select any certification (e.g. AWS SAA-C03)",
            "Click 'Coach Me'",
            "Answer the first question",
            "Observe feedback and wait for next question",
        ],
        "expected": "The AI gives immediate feedback on the answer, explains why it is correct or incorrect, then asks the next question.",
        "status_label": "PASS / FAIL",
        "priority": "Medium",
    },
    {
        "id": "TC-07",
        "feature": "Web Search Integration",
        "icon": "🔍",
        "description": "Detects search intent, queries DuckDuckGo, and augments the AI response with live results.",
        "preconditions": [
            "Internet connection is available on the backend",
            "LLM API key is configured",
        ],
        "steps": [
            "In the chat input, type: \"Search for the latest Python 3.13 release notes\"",
            "Press Send",
            "Wait for the search indicator to appear",
        ],
        "expected": "A '🔍 Searching the web for...' message appears, followed by a response referencing current Python 3.13 information.",
        "status_label": "PASS / FAIL",
        "priority": "Medium",
    },
    {
        "id": "TC-08",
        "feature": "User Profile Personalisation",
        "icon": "👤",
        "description": "User sets name, background, and goals; the AI adapts tone and depth to the user's level in every reply.",
        "preconditions": [
            "My Profile panel is visible in the sidebar",
        ],
        "steps": [
            "Open My Profile in the sidebar and click Edit",
            "Enter: Name = 'Jordan', Background = 'Software developer', Goal = 'Learn cloud architecture'",
            "Save the profile",
            "In the chat, send: \"Explain containers\"",
        ],
        "expected": "The response uses developer-appropriate language and relates containers to cloud architecture without the user restating their background.",
        "status_label": "PASS / FAIL",
        "priority": "Medium",
    },
    {
        "id": "TC-09",
        "feature": "URL / Media Ingestion",
        "icon": "🔗",
        "description": "Paste any URL into chat; the app fetches the content, adds it to the knowledge base, and answers questions about it.",
        "preconditions": [
            "Backend is online",
            "LLM API key is configured",
            "Valid internet-accessible URL is available",
        ],
        "steps": [
            "In the chat, type: \"Load https://en.wikipedia.org/wiki/Machine_learning and summarise it\"",
            "Press Send",
            "Wait for the confirmation message",
        ],
        "expected": "'✅ Loaded [URL] (N chunks)' confirmation appears, followed by a summary drawn from the Wikipedia article content.",
        "status_label": "PASS / FAIL",
        "priority": "Medium",
    },
    {
        "id": "TC-10",
        "feature": "Document Upload & RAG",
        "icon": "📄",
        "description": "Upload PDF, DOCX, MD, or TXT files; the AI uses document chunks to answer questions accurately.",
        "preconditions": [
            "A test PDF or DOCX file is available locally",
            "LLM API key is configured",
        ],
        "steps": [
            "Click the File tab in the Upload panel on the left",
            "Drag and drop a PDF file onto the upload area",
            "Wait for the success status (green tick)",
            "In the chat, ask a specific question from the document content",
        ],
        "expected": "The AI answers using exact details from the uploaded document and cites the filename as a source.",
        "status_label": "PASS / FAIL",
        "priority": "High",
    },
    {
        "id": "TC-11",
        "feature": "Multi-Provider AI Switching",
        "icon": "⚡",
        "description": "Switch between Claude, Gemini, and OpenAI mid-conversation using the Provider panel or voice commands.",
        "preconditions": [
            "At least two API keys are configured (e.g. CLAUDE_API_KEY + GEMINI_API_KEY)",
        ],
        "steps": [
            "Note the active provider shown in the AI Provider panel (e.g. Claude — Agent 1)",
            "In the chat, type: \"Hey Agent 2\"",
            "Observe the confirmation message",
            "Ask any question",
        ],
        "expected": "The app confirms 'Switched to Gemini (Agent 2)' and the next AI response comes from the Gemini model.",
        "status_label": "PASS / FAIL",
        "priority": "High",
    },
    {
        "id": "TC-12",
        "feature": "Flashcard Mode",
        "icon": "🃏",
        "description": "Generates 5 Q&A flashcard pairs from uploaded content or general knowledge on any topic.",
        "preconditions": [
            "LLM API key is configured",
        ],
        "steps": [
            "Switch to Flashcards mode using the mode tab",
            "Send: \"Generate flashcards on the OSI model\"",
        ],
        "expected": "The AI returns exactly 5 numbered flashcard pairs with a clear question and concise answer for each of the 7 OSI layers.",
        "status_label": "PASS / FAIL",
        "priority": "Low",
    },
    {
        "id": "TC-13",
        "feature": "Streaming Responses & Stop Button",
        "icon": "⏹️",
        "description": "Responses stream token-by-token in real time; the user can stop generation mid-stream.",
        "preconditions": [
            "LLM API key is configured",
        ],
        "steps": [
            "Send a long-answer prompt: \"Explain the entire history of computing in detail\"",
            "While the response is streaming, click the ⏹️ Stop button",
        ],
        "expected": "The response stops immediately at the current token. No further text is appended. The input box re-enables.",
        "status_label": "PASS / FAIL",
        "priority": "Medium",
    },
    {
        "id": "TC-14",
        "feature": "Dark / Light Theme Toggle",
        "icon": "🌙",
        "description": "The entire UI switches between dark and light themes; preference persists across page reloads.",
        "preconditions": [
            "App is loaded in the browser",
        ],
        "steps": [
            "Note the current theme (light or dark)",
            "Click the 🌙 / ☀️ toggle button in the top-right of the header",
            "Reload the page (F5)",
        ],
        "expected": "The theme switches instantly. After reload, the same theme is still active (persisted in localStorage).",
        "status_label": "PASS / FAIL",
        "priority": "Low",
    },
    {
        "id": "TC-15",
        "feature": "Error Log & Diagnostics Panel",
        "icon": "⚠️",
        "description": "All errors (upload failures, API errors, network issues) are captured and shown in the Error Log panel.",
        "preconditions": [
            "App is loaded in the browser",
        ],
        "steps": [
            "Temporarily disconnect from the internet (or stop the backend)",
            "Attempt to send a chat message",
            "Reconnect to the internet",
            "Open the Error Log panel in the sidebar",
        ],
        "expected": "The failed request appears in the Error Log with a timestamp, source (Chat), and error message. A red badge count shows in the header.",
        "status_label": "PASS / FAIL",
        "priority": "Low",
    },
]

# ── PDF builder ───────────────────────────────────────────────────────────────

def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN,  bottomMargin=MARGIN,
        title="AI Tutor Agent — Feature Test Cases",
        author="AI Tutor QA",
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("Title2", parent=styles["Normal"],
        fontSize=26, fontName="Helvetica-Bold",
        textColor=WHITE, alignment=TA_CENTER, spaceAfter=4)

    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"],
        fontSize=11, fontName="Helvetica",
        textColor=colors.HexColor("#C7D2FE"), alignment=TA_CENTER, spaceAfter=2)

    meta_style = ParagraphStyle("Meta", parent=styles["Normal"],
        fontSize=8, fontName="Helvetica",
        textColor=colors.HexColor("#A5B4FC"), alignment=TA_CENTER)

    tc_id_style = ParagraphStyle("TCID", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica-Bold",
        textColor=VIOLET)

    feature_style = ParagraphStyle("Feature", parent=styles["Normal"],
        fontSize=13, fontName="Helvetica-Bold",
        textColor=SLATE_700, spaceAfter=3)

    desc_style = ParagraphStyle("Desc", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica",
        textColor=SLATE_500, spaceAfter=6)

    label_style = ParagraphStyle("Label", parent=styles["Normal"],
        fontSize=8, fontName="Helvetica-Bold",
        textColor=INDIGO, spaceBefore=4, spaceAfter=2)

    body_style = ParagraphStyle("Body", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica",
        textColor=SLATE_700, leading=14)

    expected_style = ParagraphStyle("Expected", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica",
        textColor=GREEN, leading=14)

    story = []

    # ── Cover header ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("AI Tutor Agent", title_style),
        Paragraph("Feature Test Cases", subtitle_style),
        Paragraph(
            f"Generated: {datetime.date.today().strftime('%d %B %Y')}  •  "
            f"{len(TEST_CASES)} Test Cases  •  Version 2.0",
            meta_style,
        ),
    ]]
    header_table = Table(header_data, colWidths=[PAGE_W - 2 * MARGIN])
    header_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), INDIGO),
        ("ROUNDEDCORNERS", [6]),
        ("TOPPADDING",   (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 14),
        ("LEFTPADDING",  (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10 * mm))

    # ── Legend row ────────────────────────────────────────────────────────────
    legend = [
        [Paragraph("Priority Legend:", ParagraphStyle("L", parent=styles["Normal"],
                   fontSize=8, fontName="Helvetica-Bold", textColor=SLATE_700)),
         Paragraph("🔴 High — core functionality",
                   ParagraphStyle("L2", parent=styles["Normal"], fontSize=8, textColor=SLATE_700)),
         Paragraph("🟡 Medium — important but not blocking",
                   ParagraphStyle("L3", parent=styles["Normal"], fontSize=8, textColor=SLATE_700)),
         Paragraph("🟢 Low — nice-to-have / cosmetic",
                   ParagraphStyle("L4", parent=styles["Normal"], fontSize=8, textColor=SLATE_700)),
        ]
    ]
    leg_table = Table(legend, colWidths=[35*mm, 55*mm, 65*mm, 45*mm])
    leg_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), INDIGO_LITE),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("BOX",          (0, 0), (-1, -1), 0.5, INDIGO),
    ]))
    story.append(leg_table)
    story.append(Spacer(1, 8 * mm))

    # ── One card per test case ────────────────────────────────────────────────
    priority_colours = {"High": RED_LITE, "Medium": AMBER_LITE, "Low": GREEN_LITE}
    priority_text    = {"High": ("🔴", RED), "Medium": ("🟡", AMBER), "Low": ("🟢", GREEN)}

    for tc in TEST_CASES:
        dot, dot_col = priority_text[tc["priority"]]
        p_bg = priority_colours[tc["priority"]]

        # Header row of card: TC-ID | Feature name | Priority badge
        header_cells = [
            Paragraph(tc["id"], tc_id_style),
            Paragraph(f"{tc['icon']}  {tc['feature']}", feature_style),
            Paragraph(
                f"{dot}  {tc['priority']}",
                ParagraphStyle("Pri", parent=styles["Normal"],
                               fontSize=8, fontName="Helvetica-Bold",
                               textColor=dot_col, alignment=TA_CENTER),
            ),
        ]
        card_header = Table([header_cells], colWidths=[18*mm, 115*mm, 22*mm])
        card_header.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), INDIGO_LITE),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW",     (0, 0), (-1, 0),  0.5, INDIGO),
            ("ALIGN",         (2, 0), (2, 0),   "CENTER"),
        ]))

        # Body rows
        body_rows = []

        # Description
        body_rows.append([
            Paragraph("Description", label_style),
            Paragraph(tc["description"], desc_style),
        ])

        # Preconditions
        pre_text = "<br/>".join(f"• {p}" for p in tc["preconditions"])
        body_rows.append([
            Paragraph("Pre-conditions", label_style),
            Paragraph(pre_text, body_style),
        ])

        # Steps
        steps_text = "<br/>".join(f"{i+1}.  {s}" for i, s in enumerate(tc["steps"]))
        body_rows.append([
            Paragraph("Test Steps", label_style),
            Paragraph(steps_text, body_style),
        ])

        # Expected result
        body_rows.append([
            Paragraph("Expected Result", ParagraphStyle("EL", parent=styles["Normal"],
                      fontSize=8, fontName="Helvetica-Bold", textColor=GREEN, spaceBefore=4, spaceAfter=2)),
            Paragraph(tc["expected"], expected_style),
        ])

        # Pass/Fail row
        pf_label = ParagraphStyle("PF", parent=styles["Normal"],
                   fontSize=8, fontName="Helvetica-Bold", textColor=SLATE_500)
        pf_boxes = Table([[
            Paragraph("Result:", pf_label),
            Paragraph("  ☐  PASS", ParagraphStyle("PP", parent=styles["Normal"],
                      fontSize=9, fontName="Helvetica", textColor=GREEN)),
            Paragraph("  ☐  FAIL", ParagraphStyle("PF2", parent=styles["Normal"],
                      fontSize=9, fontName="Helvetica", textColor=RED)),
            Paragraph("Notes / Defect ID: ________________________",
                      ParagraphStyle("NT", parent=styles["Normal"],
                      fontSize=8, fontName="Helvetica", textColor=SLATE_500)),
        ]], colWidths=[15*mm, 22*mm, 22*mm, 96*mm])
        pf_boxes.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 4),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND",    (0, 0), (-1, -1), p_bg),
        ]))

        body_rows.append([Paragraph("", label_style), pf_boxes])

        card_body = Table(body_rows, colWidths=[28*mm, 127*mm])
        card_body.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), WHITE),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW",     (0, -1), (-1, -1), 0.5, SLATE_200),
        ]))

        # Wrap header + body in outer border table
        outer = Table([[card_header], [card_body]], colWidths=[PAGE_W - 2 * MARGIN])
        outer.setStyle(TableStyle([
            ("BOX",       (0, 0), (-1, -1), 1, INDIGO),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [INDIGO_LITE, WHITE]),
        ]))

        story.append(KeepTogether(outer))
        story.append(Spacer(1, 5 * mm))

    # ── Sign-off footer table ─────────────────────────────────────────────────
    story.append(Spacer(1, 4 * mm))
    sign_style = ParagraphStyle("Sign", parent=styles["Normal"],
                 fontSize=8, fontName="Helvetica", textColor=SLATE_500)
    sign_bold  = ParagraphStyle("SignB", parent=styles["Normal"],
                 fontSize=8, fontName="Helvetica-Bold", textColor=SLATE_700)
    signoff = Table([[
        Paragraph("Tester Name:", sign_bold),
        Paragraph("_________________________", sign_style),
        Paragraph("Date:", sign_bold),
        Paragraph("_______________", sign_style),
        Paragraph("Sign-off:", sign_bold),
        Paragraph("_________________________", sign_style),
    ]], colWidths=[22*mm, 45*mm, 12*mm, 30*mm, 18*mm, 45*mm])
    signoff.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("BACKGROUND",    (0, 0), (-1, -1), INDIGO_LITE),
        ("BOX",           (0, 0), (-1, -1), 0.5, INDIGO),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(signoff)

    doc.build(story)
    print(f"PDF written to: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
