#!/usr/bin/env python3
# ============================================================
# TAA-App Technical Defense Reviewer
# Generates a companion reviewer: component explanations + Q&A bank.
# ============================================================
import os

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "TAA-App_Defense_Reviewer.docx")

NAVY = RGBColor(0x1F, 0x38, 0x64)
NAVY2 = RGBColor(0x2E, 0x54, 0x96)
GRAY = RGBColor(0x59, 0x59, 0x59)
BLACK = RGBColor(0x1A, 0x1A, 0x1A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BODY_PT = 10.5
USABLE = 16.6  # cm


# ------------------------------------------------------------
# low-level helpers
# ------------------------------------------------------------
PPR_ORDER = [
    "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl",
    "numPr", "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens",
    "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE",
    "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind",
    "contextualSpacing", "mirrorIndents", "suppressOverlap", "jc", "textDirection",
    "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle", "rPr",
    "sectPr", "pPrChange",
]
TBLPR_ORDER = [
    "tblStyle", "tblpPr", "tblOverlap", "bidiVisual", "tblStyleRowBandSize",
    "tblStyleColBandSize", "tblW", "jc", "tblCellSpacing", "tblInd", "tblBorders",
    "shd", "tblLayout", "tblCellMar", "tblLook", "tblCaption", "tblDescription",
]
TCPR_ORDER = [
    "cnfStyle", "tcW", "gridSpan", "hMerge", "vMerge", "tcBorders", "shd",
    "noWrap", "tcMar", "textDirection", "tcFitText", "vAlign", "hideMark",
]


def _local(el):
    return el.tag.split("}")[-1]


def insert_ordered(parent, child, order):
    """Insert child into parent at the position required by the OOXML schema."""
    idx = order.index(_local(child))
    for existing in list(parent):
        name = _local(existing)
        if name in order and order.index(name) > idx:
            existing.addprevious(child)
            return
    parent.append(child)


def shade(el, hex_fill):
    """Apply background shading to a paragraph properties element."""
    pPr = el.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    insert_ordered(pPr, shd, PPR_ORDER)


def cell_shade(cell, hex_fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    insert_ordered(tcPr, shd, TCPR_ORDER)


def para_border_bottom(p, color="1F3864", size=6):
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    pbdr.append(bottom)
    insert_ordered(pPr, pbdr, PPR_ORDER)


def keep_together(p):
    p.paragraph_format.keep_together = True


def add_field(paragraph, code, placeholder="1"):
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = code
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    txt = OxmlElement("w:t")
    txt.text = placeholder
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_sep)
    run._r.append(txt)
    run._r.append(fld_end)


def set_cell_margins(table, top=60, bottom=60, left=90, right=90):
    tblPr = table._tbl.tblPr
    for existing in tblPr.findall(qn("w:tblCellMar")):
        tblPr.remove(existing)
    mar = OxmlElement("w:tblCellMar")
    for side, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        mar.append(node)
    insert_ordered(tblPr, mar, TBLPR_ORDER)


def set_fixed_layout(table, widths):
    tbl = table._tbl
    tblPr = tbl.tblPr
    for existing in tblPr.findall(qn("w:tblLayout")):
        tblPr.remove(existing)
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    insert_ordered(tblPr, layout, TBLPR_ORDER)

    # tcW alone is not enough; the grid definition drives rendering.
    grid = tbl.tblGrid
    cols = grid.findall(qn("w:gridCol"))
    for col, width in zip(cols, widths):
        col.set(qn("w:w"), str(int(Cm(width).twips)))
    for i, width in enumerate(widths):
        table.columns[i].width = Cm(width)


def repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    el.set(qn("w:val"), "true")
    trPr.append(el)


# ------------------------------------------------------------
# document setup
# ------------------------------------------------------------
doc = Document()

sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.left_margin = Cm(2.2)
sec.right_margin = Cm(2.2)
sec.top_margin = Cm(2.0)
sec.bottom_margin = Cm(1.9)
sec.header_distance = Cm(1.0)
sec.footer_distance = Cm(0.9)

styles = doc.styles

normal = styles["Normal"]
normal.font.name = "Times New Roman"
normal.font.size = Pt(BODY_PT)
normal.font.color.rgb = BLACK
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
normal.paragraph_format.space_after = Pt(5)
normal.paragraph_format.line_spacing = 1.08

for name, size, color, before, after in (
    ("Heading 1", 14.5, NAVY, 0, 8),
    ("Heading 2", 12, NAVY2, 12, 4),
    ("Heading 3", 10.5, BLACK, 10, 2),
):
    st = styles[name]
    st.font.name = "Times New Roman"
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = color
    st.font.italic = False
    st._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    st.paragraph_format.space_before = Pt(before)
    st.paragraph_format.space_after = Pt(after)
    st.paragraph_format.keep_with_next = True

for name in ("List Bullet", "List Number"):
    st = styles[name]
    st.font.name = "Times New Roman"
    st.font.size = Pt(BODY_PT)
    st.paragraph_format.space_after = Pt(3)
    st.paragraph_format.line_spacing = 1.05


# ------------------------------------------------------------
# block helpers
# ------------------------------------------------------------
def h1(text, page_break=True):
    p = doc.add_paragraph(style="Heading 1")
    p.paragraph_format.page_break_before = page_break
    p.paragraph_format.space_before = Pt(0)
    p.add_run(text)
    para_border_bottom(p, "1F3864", 8)
    return p


def h2(text):
    p = doc.add_paragraph(style="Heading 2")
    p.add_run(text)
    return p


def h3(text):
    p = doc.add_paragraph(style="Heading 3")
    p.add_run(text)
    return p


def p(text, italic=False, size=None, color=None, after=None, align=None, bold=False):
    par = doc.add_paragraph()
    run = par.add_run(text)
    run.italic = italic
    run.bold = bold
    if size:
        run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color
    if after is not None:
        par.paragraph_format.space_after = Pt(after)
    if align == "center":
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return par


def bullets(items, style="List Bullet"):
    for item in items:
        par = doc.add_paragraph(style=style)
        par.paragraph_format.left_indent = Cm(0.75)
        par.paragraph_format.first_line_indent = Cm(-0.35)
        if isinstance(item, tuple):
            lead, rest = item
            r = par.add_run(lead)
            r.bold = True
            par.add_run(rest)
        else:
            par.add_run(item)


def numbered(items):
    for i, item in enumerate(items, 1):
        par = doc.add_paragraph()
        par.paragraph_format.left_indent = Cm(0.85)
        par.paragraph_format.first_line_indent = Cm(-0.85)
        par.paragraph_format.space_after = Pt(3)
        r = par.add_run(f"{i}.  ")
        r.bold = True
        r.font.color.rgb = NAVY
        par.add_run(item)


def kv(label, text):
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Cm(0.0)
    par.paragraph_format.space_after = Pt(2.5)
    r = par.add_run(label + ": ")
    r.bold = True
    r.font.color.rgb = NAVY2
    par.add_run(text)
    return par


def qa(question, answer):
    pq = doc.add_paragraph()
    pq.paragraph_format.space_before = Pt(8)
    pq.paragraph_format.space_after = Pt(2)
    pq.paragraph_format.keep_with_next = True
    pq.paragraph_format.left_indent = Cm(0.0)
    shade(pq._p, "EDF1F8")
    r = pq.add_run("Q   ")
    r.bold = True
    r.font.color.rgb = NAVY
    rq = pq.add_run(question)
    rq.bold = True
    rq.font.color.rgb = NAVY

    pa = doc.add_paragraph()
    pa.paragraph_format.left_indent = Cm(0.55)
    pa.paragraph_format.space_after = Pt(5)
    ra = pa.add_run("A   ")
    ra.bold = True
    ra.font.color.rgb = NAVY2
    pa.add_run(answer)


def callout(label, text, fill="FFF6E0", border="C89B3C", width=USABLE):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_fixed_layout(table, [width])
    cell = table.cell(0, 0)
    cell.width = Cm(width)
    cell_shade(cell, fill)
    set_cell_margins(table, top=110, bottom=110, left=160, right=160)
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), "24")
    left.set(qn("w:color"), border)
    borders.append(left)
    insert_ordered(tcPr, borders, TCPR_ORDER)
    par = cell.paragraphs[0]
    par.paragraph_format.space_after = Pt(3)
    r = par.add_run(label)
    r.bold = True
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x8A, 0x62, 0x00)
    r.font.all_caps = True
    body = cell.add_paragraph()
    body.paragraph_format.space_after = Pt(0)
    body.paragraph_format.line_spacing = 1.12
    body.add_run(text)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def table(headers, rows, widths, font=9.5, header_fill="1F3864"):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_fixed_layout(tbl, widths)
    set_cell_margins(tbl)
    hdr = tbl.rows[0]
    repeat_header(hdr)
    for i, head in enumerate(headers):
        cell = hdr.cells[i]
        cell.width = Cm(widths[i])
        cell_shade(cell, header_fill)
        par = cell.paragraphs[0]
        par.paragraph_format.space_after = Pt(0)
        run = par.add_run(head)
        run.bold = True
        run.font.size = Pt(font)
        run.font.color.rgb = WHITE
    for row in rows:
        cells = tbl.add_row().cells
        for i, value in enumerate(row):
            cells[i].width = Cm(widths[i])
            par = cells[i].paragraphs[0]
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.line_spacing = 1.0
            run = par.add_run(str(value))
            run.font.size = Pt(font)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return tbl


def spacer(pts=4):
    par = doc.add_paragraph()
    par.paragraph_format.space_after = Pt(pts)
    return par


# ------------------------------------------------------------
# header / footer (main section)
# ------------------------------------------------------------
def build_header_footer(section):
    # Create the header/footer definition on this section itself; otherwise
    # python-docx walks back and attaches it to the cover section.
    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.paragraph_format.space_after = Pt(0)
    hp.paragraph_format.tab_stops.clear_all()
    hp.paragraph_format.tab_stops.add_tab_stop(Cm(USABLE), WD_TAB_ALIGNMENT.RIGHT)
    r = hp.add_run("TAA-App  |  Technical Defense Reviewer")
    r.font.size = Pt(8.5)
    r.font.color.rgb = GRAY
    r.font.name = "Times New Roman"
    hp.add_run("\t")
    r2 = hp.add_run("Bulahan Capstone 2026")
    r2.font.size = Pt(8.5)
    r2.font.color.rgb = GRAY
    r2.font.name = "Times New Roman"
    para_border_bottom(hp, "BFBFBF", 4)

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("Pahina ")
    r.font.size = Pt(8.5)
    r.font.color.rgb = GRAY
    add_field(fp, " PAGE ")
    r = fp.add_run(" ng ")
    r.font.size = Pt(8.5)
    r.font.color.rgb = GRAY
    add_field(fp, " NUMPAGES ", "1")
    for run in fp.runs:
        run.font.size = Pt(8.5)
        run.font.color.rgb = GRAY
        run.font.name = "Times New Roman"


# ------------------------------------------------------------
# COVER
# ------------------------------------------------------------
cover = doc.add_paragraph()
cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
cover.paragraph_format.space_before = Pt(110)
r = cover.add_run("TAA-APP")
r.bold = True
r.font.size = Pt(36)
r.font.color.rgb = NAVY
r.font.name = "Times New Roman"

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub.paragraph_format.space_after = Pt(2)
r = sub.add_run("Technical Defense Reviewer")
r.bold = True
r.font.size = Pt(20)
r.font.color.rgb = NAVY2

line = doc.add_paragraph()
line.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = line.add_run("Mga paliwanag sa bawat technical component  •  Possible panel questions and answers")
r.font.size = Pt(10.5)
r.font.color.rgb = GRAY
r.italic = True

spacer(30)

box = doc.add_table(rows=1, cols=1)
box.alignment = WD_TABLE_ALIGNMENT.CENTER
box.autofit = False
set_fixed_layout(box, [13.6])
cell = box.cell(0, 0)
cell.width = Cm(13.6)
cell_shade(cell, "F2F5FA")
set_cell_margins(box, top=160, bottom=160, left=220, right=220)
bp = cell.paragraphs[0]
bp.alignment = WD_ALIGN_PARAGRAPH.CENTER
bp.paragraph_format.space_after = Pt(5)
r = bp.add_run("Companion document to the capstone paper")
r.bold = True
r.font.size = Pt(9)
r.font.color.rgb = NAVY
bp2 = cell.add_paragraph()
bp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
bp2.paragraph_format.space_after = Pt(0)
r = bp2.add_run(
    "Hindi ito isinusumite. Gabay ito para maintindihan at maipaliwanag\n"
    "ang bawat bahagi ng sistema sa oral defense."
)
r.font.size = Pt(9.5)
r.font.color.rgb = GRAY
r.italic = True

spacer(46)
for text, size, bold_, color in (
    ("Bulahan Capstone Project", 12, True, NAVY),
    ("Taguig Alliance of Associations (TAA)  •  Homeowners Association Management System", 9.5, False, GRAY),
):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.space_after = Pt(4)
    r = par.add_run(text)
    r.font.size = Pt(size)
    r.bold = bold_
    r.font.color.rgb = color

par = doc.add_paragraph()
par.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = par.add_run("2026")
r.font.size = Pt(11)
r.font.color.rgb = NAVY2
r.bold = True

# ------------------------------------------------------------
# main section
# ------------------------------------------------------------
main = doc.add_section(WD_SECTION.NEW_PAGE)
main.left_margin = Cm(2.2)
main.right_margin = Cm(2.2)
main.top_margin = Cm(2.0)
main.bottom_margin = Cm(1.9)
main.header_distance = Cm(1.0)
main.footer_distance = Cm(0.9)
build_header_footer(main)

# ------------------------------------------------------------
# CONTENTS
# ------------------------------------------------------------
h1("CONTENTS", page_break=False)
contents = [
    ("Paano Gamitin ang Reviewer na Ito", "3 rules bago magsimula"),
    ("Part 1 — Ang Kwento ng Sistema (60 Seconds)", "Isang sagot na sasakop sa lahat ng tanong"),
    ("Part 2 — Tech Stack: Ano 'To, Para Saan, Bakit", "28 components, 3 tanong bawat isa"),
    ("Part 3 — Data Model sa Isang Pahina", "10 tables, 5 enums, relations"),
    ("Part 4 — Possible Panel Questions at Sagot", "70 questions, 10 themes"),
    ("Part 5 — Numbers Cheat Sheet", "Ang mga numerong pwedeng itanong"),
    ("Part 6 — Kapag Hindi Mo Alam ang Sagot", "Protocol at mga karaniwang bitag"),
    ("Part 7 — Two-Minute Demo Script", "Sunod-sunod na ipapakita"),
    ("Part 8 — Final Checklist", "Bago at habang defense"),
]
for title, note in contents:
    par = doc.add_paragraph()
    par.paragraph_format.space_after = Pt(3)
    par.paragraph_format.left_indent = Cm(0.2)
    r = par.add_run(title)
    r.bold = True
    r.font.size = Pt(10.5)
    r.font.color.rgb = NAVY
    r2 = par.add_run("   —  " + note)
    r2.font.size = Pt(9)
    r2.font.color.rgb = GRAY

spacer(8)
callout(
    "PAALALA",
    "Huwag kabisaduhin ang dokumentong ito. Kabisaduhin ang tatlong bagay: (1) ano ang problema, "
    "(2) paano hinahati ng sistema ang trabaho, at (3) bakit pinili ang bawat tool. "
    "Kapag alam mo ang tatlong iyon, kaya mong sagutin ang halos lahat ng tanong kahit iba-ibang salita ang gamitin ng panel.",
)

# ------------------------------------------------------------
# HOW TO USE
# ------------------------------------------------------------
h1("PAANO GAMITIN ANG REVIEWER NA ITO", page_break=False)

p(
    "Tatlong layer ang reviewer na ito, at magkaiba ang gamit ng bawat isa. Basahin muna ang Part 1 "
    "hanggang Part 3 para maintindihan ang sistema. Gamiting pang-test ang Part 4. I-memorize lang "
    "ang Part 5 sa gabi bago ang defense."
)

table(
    ["Layer", "Nasa part", "Paano gamitin"],
    [
        ("Kuwento", "Part 1", "Ito ang unang sasabihin kapag tinanong na 'ano ang sistema ninyo?' Sundin ang 60-second script."),
        ("Paliwanag", "Parts 2–3", "Bawat component may tatlong tanong: Ano 'to? Para saan? Bakit ito ang ginamit? Basahin para maintindihan, hindi para kabisaduhin."),
        ("Paghahanda", "Parts 4–8", "Q&A bank, numbers, protocol kapag hindi alam, demo script, at checklist."),
    ],
    [2.6, 2.4, 11.6],
)

h2("Tatlong prinsipyo sa pagsagot")
numbered([
    "Sagot muna, paliwanag pagkatapos. Tanong: 'Bakit JWT?' Sagot: 'Cookies na HttpOnly na may 15-minute access at 7-day refresh. Dahil hindi kayang basahin ng JavaScript ang HttpOnly cookie, hindi nakukuha ng XSS ang token.' Huwag mag-umpisa sa kasaysayan ng JWT.",
    "Isang dahilan na totoo, hindi sampung dahilan na puro teorya. Mas kapani-paniwala ang 'ginamit namin ito dahil kailangan ng foreign key at transaction' kaysa sa 'maganda ito sa scalability'.",
    "Kung may trade-off, sabihin ang trade-off. Kapag sinabi mong perpekto ang sistema, maghahanap ang panel ng butas. Kapag sinabi mong 'ito ang limitasyon at ito ang plano', tapos na ang usapan.",
])

h2("Anong wika ang gamitin")
p(
    "Taglish ang paliwanag sa reviewer na ito para natural ang intindihin. Pero sa defense, sagutin sa "
    "wika na ginamit ng panel. Kung English ang tanong, English ang sagot. Kung Tagalog, Tagalog. "
    "Ang mahalaga ay hindi ka nagko-code-switch sa gitna ng pangungusap dahil nagkakagulo ang thought."
)

# ------------------------------------------------------------
# PART 1
# ------------------------------------------------------------
h1("PART 1 — ANG KWENTO NG SISTEMA (60 SECONDS)")

p(
    "Ito ang pinaka-madalas na tanong at ang pinaka-madaling i-overshoot. Kapag tinanong na 'ano ba ang "
    "TAA-App?', huwag mag-umpisa sa React o Prisma. I-umpisa sa tao at problema, tapos ang solusyon, "
    "tapos ang tatlong layer."
)

callout(
    "SABIHIN MO ITO — 60 SECONDS",
    "Ang TAA-App ay isang web-based na management system para sa homeowners association. Bago ito, "
    "nasa Facebook group, Viber, Excel, at papel ang announcements, reklamo, at bayad sa dues. "
    "Ang problema, kanya-kanyang listahan, madaling mawala ang resibo, at mahirap malaman kung sino "
    "ang updated at sino ang hindi. Ang ginawa namin, isang system na may tatlong role: resident, "
    "HOA officer, at admin. Ang resident ay nagre-register, nagbabayad ng dues at nag-a-upload ng proof, "
    "at nagre-report ng incident. Ang officer ang nagbe-verify ng payment at humahawak ng incident. "
    "Ang admin ang nagma-manage ng accounts at finances. Naka-Next.js ang frontend, Express at Prisma "
    "ang backend, at TiDB Cloud ang database. Ang lahat ng nakikita ng isang role ay nakabase sa "
    "role at status ng account, at ang lahat ng actions sa pera ay may audit trail.",
)

h2("Ang tatlong layer, isang linya bawat isa")
table(
    ["Layer", "Ano ang nandito", "Bakit hiwalay"],
    [
        (
            "Client (browser)",
            "Next.js 15 + React 18 + TypeScript + Tailwind. Forms, tables, dialogs, dashboards.",
            "Ang UI lang ang tumatakbo sa device ng user. Wala itong direktang access sa database.",
        ),
        (
            "Application (API)",
            "Express 4 + Zod + JWT + Prisma. Rules, validation, permissions, file processing.",
            "Dito nangyayari ang lahat ng desisyon. Kahit i-bypass ang UI, hindi ito malalampasan.",
        ),
        (
            "Data",
            "TiDB Cloud (MySQL-compatible) + Vercel Blob para sa images.",
            "Isang source of truth. Naka-lock sa public internet; API lang ang may connection string.",
        ),
    ],
    [3.0, 7.6, 6.0],
)

h2("Ang tatlong role, dalawang linya bawat isa")
table(
    ["Role", "Ano ang nakikita", "Ano ang kayang gawin"],
    [
        ("Resident", "Sariling dashboard, announcements, sariling payments, sariling incidents, officials directory", "Magbayad at mag-submit ng proof, mag-report ng incident, i-edit ang sariling profile"),
        ("HOA Officer", "Lahat ng resident records, pending payments, incident queue, announcements, officials", "I-verify ang payment at account, i-update ang incident status, mag-post ng announcement"),
        ("Admin", "Lahat ng nasa officer, plus finance at user management", "Mag-record ng income/expense, gumawa ng dues, i-verify/disable ang account, tingnan ang audit log"),
    ],
    [2.6, 7.4, 6.6],
)

h2("Ang buhay ng isang request (para sa 'paano gumagana' na tanong)")
p(
    "Kapag may nagtanong na 'paano dumadaan ang isang click hanggang database?', ito ang isasagot. "
    "Isang tawag lang ito sa login, pero pareho ang pattern sa lahat ng features."
)
numbered([
    "Nag-click ang user ng Login. Kinukuha ng React Hook Form ang values at tinitignan ng Zod schema kung kumpleto bago pa magpadala.",
    "Nagpadala ang Axios ng POST /api/auth/login. Same-origin ito dahil nire-rewrite ng Next.js ang /api papunta sa Express server, kaya kasama ang cookies at walang CORS problem sa browser.",
    "Sa Express, dumadaan muna sa helmet, CORS, rate limiter, at body parser. Ang login route ay may mas strict na limiter: 10 attempts kada 15 minuto kada IP.",
    "Pumasok sa controller. Hinahanap ang user sa database gamit ang Prisma, tapos ikinukumpara ang password gamit ang bcrypt.",
    "Kung tama, gumagawa ng dalawang JWT: 15-minute access token at 7-day refresh token. Isinusulat sila sa HttpOnly cookies, hindi sa localStorage.",
    "Bumabalik ang JSON na may success, user, at role. Ini-save ng AuthContext ang user at inililipat ang page sa dashboard ng tamang role.",
    "Sa susunod na request, binabasa ng authenticate middleware ang cookie, vine-verify ang signature, tinitingnan ang tokenVersion at status sa database, tapos pinapasa ang user sa controller.",
    "Ang authorize middleware ang humaharang sa maling role. Ang service layer ang may business rules, at ang Prisma ang huling nagsasalita sa TiDB.",
])

callout(
    "BANGITIN ITO KAPAG TINANONG 'SAAN NANGYAYARI ANG SECURITY?'",
    "Hindi sa frontend. Ang frontend ay kagandahan at kaginhawahan lang. Ang tunay na check ay nasa "
    "middleware at service layer: token verification, role check, ownership check, at status check. "
    "Kahit baguhin ng user ang URL o gumamit ng Postman, hindi siya makakalampas.",
    fill="EAF1FB",
    border="2E5496",
)

# ------------------------------------------------------------
# PART 2
# ------------------------------------------------------------
h1("PART 2 — TECH STACK: ANO 'TO, PARA SAAN, BAKIT")

p(
    "Bawat component ay may tatlong linyang sagot. Kapag tinanong ng panel ang isang tool, hanapin ang "
    "pangalan nito at gamitin ang tatlong linyang iyon. Huwag dagdagan ng hindi mo sigurado."
)

# --- 2.1 architecture
h2("2.1  Ang kabuuang arkitektura")

h3("Three-tier architecture")
kv("Ano 'to", "Tatlong magkahiwalay na layer: browser (client), Express API (application), at TiDB Cloud (data).")
kv("Para saan", "Tinitiyak na ang bawat layer ay may isang trabaho at hindi directly nag-uusap ang browser at database.")
kv("Bakit ito", "Kapag nagbago ang UI, hindi gagalawin ang rules. Kapag pinalitan ang database, hindi gagaralgalin ang UI. Mas madaling i-secure dahil ang connection string ay nasa server lang, at mas madaling i-test at i-deploy nang hiwalay.")

# --- 2.2 frontend
h2("2.2  Frontend")

h3("Next.js 15 (App Router)")
kv("Ano 'to", "React framework na may file-based routing, shared layouts, at server-side rewrites/proxy.")
kv("Para saan", "Ito ang nagse-serve ng lahat ng pages at nagpo-proxy ng /api papunta sa Express backend.")
kv("Bakit ito", "Isang deploy lang para sa buong UI. Ang route groups na (auth) at (dashboard) ay nagbibigay ng magkaibang layout nang walang duplicate code. Ang rewrites ay ginagawang same-origin ang API, kaya kasama ang cookies at hindi lumalabas ang backend URL sa browser. May automatic code splitting din, kaya hindi binabasa ng resident ang code ng admin pages.")

h3("React 18")
kv("Ano 'to", "Component-based UI library na nagbibigay ng state at re-rendering.")
kv("Para saan", "Mga interactive na bahagi: tables na may filter, dialogs, forms, tabs, notifications.")
kv("Bakit ito", "Declarative: kapag nagbago ang state, automatic na nag-a-update ang UI. Naka-component ang mga panel (PaymentsPanel, UsersPanel, IncidentsPanel), kaya isang beses lang isinusulat ang table at dialog at nagagamit sa tatlong role. Malaki rin ang ecosystem kaya may ready na accessible primitives.")

h3("TypeScript 5.6")
kv("Ano 'to", "JavaScript na may static types na chine-check bago mag-run.")
kv("Para saan", "Nagde-define ng shape ng data mula sa database hanggang sa UI.")
kv("Bakit ito", "Nahuhuli ang mali habang nagco-code pa lang: maling field name, maling status value, o posibleng null. Dahil galing sa Prisma ang types at may shared types folder, pareho ang alam ng frontend at backend. Kapag nag-refactor, sinasabi ng compiler kung saan ka masisira.")

h3("Tailwind CSS 3.4")
kv("Ano 'to", "Utility-first CSS framework kung saan ginagamit ang maliliit na class sa markup.")
kv("Para saan", "Layout, spacing, colors, at responsive behavior ng lahat ng pages.")
kv("Bakit ito", "Hindi na kailangang mag-imbento ng pangalan ng CSS class at hindi nag-iiwan ng dead CSS. Pareho ang design tokens sa lahat ng page kaya consistent ang itsura. Mobile-first ang breakpoints, mahalaga dahil karamihan ng resident ay cellphone ang gamit.")

h3("Radix UI primitives + sonner")
kv("Ano 'to", "Mga unstyled ngunit accessible na UI primitives (dialog, select, tabs, dropdown, alert dialog) at toast library.")
kv("Para saan", "Modals para sa payment at user actions, dropdown menus, tabs sa finance, at non-blocking notifications.")
kv("Bakit ito", "Mahirap gawin nang tama ang focus trap, keyboard navigation, at screen-reader labels. Ang Radix ang humahawak niyon, at kami lang ang nagbibigay ng Tailwind styles, kaya magaan at hindi mukhang generic. Ang sonner ay para sa feedback tulad ng 'Payment submitted' na hindi humaharang sa screen.")

h3("React Hook Form + Zod")
kv("Ano 'to", "Form state manager at schema validation library na magkasama.")
kv("Para saan", "Login, registration, payment, announcement, incident, at profile forms, kasama ang inline errors.")
kv("Bakit ito", "Uncontrolled ang inputs ng React Hook Form kaya kakaunti ang re-render at mabilis ang mahabang form. Ang Zod schema ay kapareho ng rules sa backend, kaya hindi nagkakalayo ang behavior. Isang lugar lang ang error messages.")

h3("Axios instance + interceptors")
kv("Ano 'to", "Isang HTTP client na may request at response interceptors.")
kv("Para saan", "Lahat ng API calls, auto-refresh kapag 401, at consistent na error handling.")
kv("Bakit ito", "Naka-base sa /api at withCredentials, kaya automatic ang cookies. Kapag nag-expire ang 15-minute access token, isang refresh call lang ang gumagawa at naka-queue ang ibang requests, tapos nire-retry. Hindi nababali ang ginagawa ng user. Isang lugar lang ang logic, hindi scatter sa bawat page.")

h3("AuthContext at route guards")
kv("Ano 'to", "React context na may current user, role, at loading state, plus redirect guards.")
kv("Para saan", "Pinipili kung anong dashboard ang ipapakita at hinaharang ang pages na hindi para sa role.")
kv("Bakit ito", "Isang source of truth ang session sa buong app, kaya hindi nagtatalo ang header, sidebar, at page. Pero importante: UX lang ang guard sa browser. Ang tunay na paghaharang ay nasa API.")

# --- 2.3 backend
h2("2.3  Backend at API")

h3("Express 4 (feature-based structure)")
kv("Ano 'to", "Minimal na Node.js HTTP framework na may middleware chain.")
kv("Para saan", "Ang buong REST API sa ilalim ng /api, hati sa siyam na feature modules.")
kv("Bakit ito", "Ang middleware chain ang natural na lugar para sa auth, validation, at rate limiting. Mature at stable, kaya kaunti ang sorpresa sa deployment. Feature-based ang folders: auth, users, residents, announcements, incidents, payments, finance, officials, dashboard. Bawat isa may routes, controller, service, schema, at rules.")

h3("Layered flow: routes → middleware → controller → service → Prisma")
kv("Ano 'to", "Paghiwalay ng HTTP concerns, business rules, at data access.")
kv("Para saan", "Halimbawa, ang payment.rules.ts ay naglalaman ng 'pwede bang baguhin ito?' at 'overdue ba?' samantalang ang controller ay taga-basa lang ng request.")
kv("Bakit ito", "Nare-reuse ang rules sa dashboard at reports, hindi nagiging 800 lines ang isang file, at kayang i-test ang rule nang hindi dumadaan sa HTTP. Mas madali ring ipaliwanag sa panel kung saan nangyayari ang isang desisyon.")

h3("Zod validation middleware")
kv("Ano 'to", "Per-endpoint schema na nagva-validate ng body, params, at query bago pumasok sa controller.")
kv("Para saan", "Siguraduhing tama ang uri, haba, range, at enum bago pa mag-touch ng database.")
kv("Bakit ito", "Hindi pinagkakatiwalaan ang client. Ang validate() middleware ay nagbabalik ng malinaw na 400 bago pa tumakbo ang business logic. Isang schema lang ang pinagmumulan ng truth, at typed ang labas kaya walang manual casting.")

h3("ApiError at central error handler")
kv("Ano 'to", "Error class na may HTTP status at isang error middleware na nag-format ng JSON.")
kv("Para saan", "Pareho ang shape ng lahat ng error: success false, message, at tamang status code.")
kv("Bakit ito", "Hindi kailangang mag-try/catch at mag-format sa bawat controller. Hindi lumalabas ang stack trace sa user, pero naka-log sa server. Alam ng frontend kung 401, 403, 404, o 409 ang nangyari at makakapili ng tamang mensahe.")

h3("Prisma 5.21 (ORM)")
kv("Ano 'to", "Type-safe ORM na may schema file, generated client, at migrations.")
kv("Para saan", "Lahat ng reads at writes: relations, filters, aggregation, at transactions.")
kv("Bakit ito", "Ang schema ang source of truth, kaya ang generated types ay tugma sa actual columns. Parameterized ang queries by default, kaya hindi basta-basta nakakapasok ang SQL injection. May relations at include, kaya hindi kailangang magsulat ng maraming JOIN. May migration history din kapag nagbago ang schema.")

h3("TiDB Cloud (MySQL-compatible)")
kv("Ano 'to", "Fully managed, distributed SQL database na MySQL wire-compatible.")
kv("Para saan", "Permanenteng imbakan ng users, residents, payments, incidents, at audit logs.")
kv("Bakit ito", "MySQL-compatible kaya gumagana ang Prisma mysql provider at pamilyar ang SQL. Managed, kaya walang server na i-patch o i-backup manually. May serverless tier na sakto sa budget ng capstone, at kayang lumaki nang hindi nire-rewrite ang schema.")

h3("JWT access + refresh sa HttpOnly cookies")
kv("Ano 'to", "Dalawang token: 15-minute access token at 7-day refresh token, nakalagay sa HttpOnly cookies na Secure sa production at SameSite=Lax.")
kv("Para saan", "Pinapatunayan ang identity sa bawat request at pinapanatili ang session nang hindi nagre-login.")
kv("Bakit ito", "Maikli ang buhay ng access token, kaya limitado ang damage kapag nanakaw. Ang refresh token ang nagbibigay ng magandang UX. HttpOnly ibig sabihin hindi kayang basahin ng JavaScript, kaya hindi nakukuha ng XSS, hindi tulad ng localStorage. Same-origin ang API dahil sa Next rewrites, kaya automatic ang cookies.")

h3("bcryptjs, 12 salt rounds")
kv("Ano 'to", "Adaptive password hashing na may salt bawat password.")
kv("Para saan", "Hindi kailanman iniimbak ang plaintext password.")
kv("Bakit ito", "Sadyang mabagal ang bcrypt, kaya mahal ang brute force kahit makuha ang database. 12 rounds ang balanse ng security at login speed. Pure JavaScript ito kaya walang native build issue sa deployment, at automatic ang unique salt kaya hindi magkatulad ang hash ng dalawang taong may parehong password.")

h3("tokenVersion (session revocation)")
kv("Ano 'to", "Integer sa User record na nakalagay din sa JWT at vine-verify sa bawat request.")
kv("Para saan", "Puwersahang mag-logout ng isang user o lahat ng device niya.")
kv("Bakit ito", "Stateless ang JWT at hindi kayang 'bawiin'. Kapag ini-increment ang tokenVersion, lahat ng lumang token ay invalid agad. Ginagawa ito kapag nag-logout, nagpalit ng password, na-disable, na-suspend, o nagbago ang status. Hindi kailangan ng Redis o token blacklist.")

h3("Role-based access control (RBAC)")
kv("Ano 'to", "Role enum (resident, hoa_officer, admin) plus authorize() middleware at row-level checks.")
kv("Para saan", "Tinitiyak na tama ang nakikita at nagagawa ng bawat role.")
kv("Bakit ito", "Default deny: kailangang ideklara ng route kung sinong role ang pwede. May ownership checks din, halimbawa sariling payments lang ang nakikita ng resident. May guard din laban sa self-disable at laban sa pag-disable ng admin account.")

h3("Rate limiting (tatlong limiter)")
kv("Ano 'to", "express-rate-limit na may 10 login attempts kada 15 minuto, 5 registrations kada oras, at 1000 API requests kada 15 minuto kada IP.")
kv("Para saan", "Pinipigilan ang password guessing, spam accounts, at sobrang daming request.")
kv("Bakit ito", "Mura at unang linya ng depensa. Mas strict sa auth endpoints kung saan nangyayari ang guessing. Mas mataas ang general API limit dahil dumadaan sa isang proxy IP ang frontend, kaya masyadong mababa ang magtho-throttle sa normal na paggamit.")

h3("helmet at CORS")
kv("Ano 'to", "Security headers at origin allowlist na may credentials.")
kv("Para saan", "Binabawasan ang browser attack surface at sinisigurong tanging frontend namin ang pwedeng magpadala ng cookies.")
kv("Bakit ito", "Nagse-set ang helmet ng mga header tulad ng X-Content-Type-Options at frame protection. Kapag may credentials, hindi pwedeng wildcard ang CORS origin; kailangang exact na CLIENT_URL, kaya blockado ang random na site na susubok gumamit ng session ng user.")

h3("Upload pipeline: multer → sharp → Vercel Blob")
kv("Ano 'to", "Memory upload na may 5MB cap at MIME whitelist, resize sa 1200×675 JPEG quality 82, tapos upload sa Blob at iimbak ang URL.")
kv("Para saan", "Mga larawan ng announcement at proof of payment.")
kv("Bakit ito", "Ang cap ay proteksyon sa memory at storage. Ang whitelist ay pumipigil sa executables at SVG scripts. Ang resize at re-encode ay ginagawang pareho ang laki ng images, mabilis mag-load, at natatanggal ang EXIF metadata. Ang Blob ay CDN-backed at walang disk na kailangang i-manage sa serverless.")

h3("Prisma $transaction")
kv("Ano 'to", "Isang atomic na grupo ng writes: lahat tatagumpay o lahat babalik.")
kv("Para saan", "Pag-generate ng dues para sa maraming household at pag-record ng audit entry kasabay ng payment change.")
kv("Bakit ito", "Hindi pwedeng maging kalahati ang billing. Kapag may isang failure, rollback lahat, kaya walang orphan record at consistent ang audit trail.")

# --- 2.5 data
h2("2.4  Data model")

h3("Relational schema na may 10 models at 5 enums")
kv("Ano 'to", "Users, residents, announcements, incidents, payments, payment references, audit logs, finance entries, finance settings, at officials.")
kv("Para saan", "Isang normalised na representasyon ng lahat ng entity ng HOA.")
kv("Bakit ito", "Relasyon ang sentro ng sistema: isang user ay may isang resident profile, isang resident ay may maraming payments, isang payment ay may proof reference. Sa relational database, hindi nagdodoble ang data at kayang i-enforce ng foreign key ang consistency.")

h3("UUID primary keys")
kv("Ano 'to", "Random na 128-bit identifier sa halip na 1, 2, 3.")
kv("Para saan", "ID ng lahat ng records.")
kv("Bakit ito", "Hindi mahuhulaan ang susunod na ID, kaya hindi madaling mag-enumerate ng records. Pwede ring gumawa ng ID sa application bago pa mag-commit, at hindi nagkakaproblema kapag maraming nagsusulat nang sabay.")

h3("Status fields at soft disable")
kv("Ano 'to", "Ginagamit ang status (pending, verified, rejected, suspended, disabled) sa halip na burahin ang user.")
kv("Para saan", "Pinapanatili ang history at maiwasan ang sirang foreign key.")
kv("Bakit ito", "May mga payment at incident na naka-link sa user. Kapag binura, mawawala ang trail. Ang disable ay nagbabawal ng login pero hindi ginagalaw ang records, at ang tokenVersion bump ay agad na nagpapawala ng active sessions.")

h3("Indexes sa madalas hanapin na columns")
kv("Ano 'to", "Database indexes sa role, status, dueDate, userId, at iba pang filter columns.")
kv("Para saan", "Pabilisin ang dashboard counts, pending lists, at per-resident queries.")
kv("Bakit ito", "Kung walang index, full table scan ang bawat filter. Sa maliit na data hindi halata, pero kapag dumami ang payments at incidents, ito ang unang bumabagal.")

# --- alternatives
h2("2.5  Mga alternatibong isinaalang-alang (para sa 'bakit hindi X?')")
p(
    "Halos lahat ng 'bakit' na tanong ay may kasamang 'bakit hindi ito?'. Ito ang maikling sagot sa bawat isa."
)
table(
    ["Alternatibo", "Bakit hindi ito ang pinili", "Trade-off na tinanggap"],
    [
        ("Firebase / Supabase", "Kulang ang relational constraints at complex queries na kailangan ng payments at audit trail. Vendor lock-in din.", "Mas maraming code na sinusulat namin, pero kontrolado ang data at logic."),
        ("MongoDB", "Relasyon ang natural na hugis ng data: user → resident → payments. Sa document store, kailangang i-duplicate o i-embed.", "Schema migration kapag nagbago, pero consistent ang data."),
        ("Django / Laravel", "Node ang alam ng team at isang wika lang ang frontend at backend, kaya mas mabilis ang development at debugging.", "Hindi kasama ang built-in admin ng Django, pero may sariling admin UI."),
        ("GraphQL", "Simple at predictable ang data needs. Isang REST endpoint per screen action ang sapat.", "Kung lumaki ang clients (mobile), mas maraming beses na round trip."),
        ("Plain React + Vite", "Kailangan ng routing, layouts, at proxy na built-in na sa Next.js.", "Mas malaking framework, pero mas kaunting configuration."),
        ("Redux", "Isang session at ilang page-level states lang ang kailangan. Sobra ang boilerplate ng Redux.", "Context lang, pero kailangang mag-ingat sa unnecessary re-render."),
        ("localStorage tokens", "Kayang basahin ng JavaScript, kaya isang XSS lang ay nakaw na ang token.", "Kailangang i-manage ang cookies at CSRF considerations."),
        ("Session table / Redis", "Stateless JWT + tokenVersion ang sapat para sa isang deployment. Walang extra service na i-maintain.", "May maliit na DB read sa bawat authenticated request."),
        ("Cron job para sa overdue", "Naka-derive ang overdue, kaya walang scheduled job na pwedeng mabigo o maantala.", "Kalkulasyon sa read time, pero mura lang ito."),
        ("Online payment gateway", "Wala pang merchant account ang HOA at manual verification ang actual na proseso.", "Manual pa rin ang confirmation, pero may digital record at proof."),
    ],
    [3.4, 8.4, 4.8],
    font=9,
)

# ------------------------------------------------------------
# PART 3
# ------------------------------------------------------------
h1("PART 3 — DATA MODEL SA ISANG PAHINA")

p(
    "Kapag ipinakita ang ERD, huwag basahin ang lahat ng linya. Sabihin ang sentro: User → Resident → "
    "Payment, at User → AuditLog. Ang iba ay supporting."
)

table(
    ["Model", "Para saan", "Mahalagang fields"],
    [
        ("User", "Identity at role ng lahat ng gumagamit", "username, email, password hash, role, status, tokenVersion, verifiedAt"),
        ("Resident", "Profile ng household; one-to-one sa User", "houseNumber, street, barangay, householdRole, householdSize"),
        ("Announcement", "Mga post ng officer at admin", "title, body, image URL, authorId, timestamps"),
        ("Incident", "Reklamo at report ng resident", "title, description, status, reportedById, handledById, resolution"),
        ("Payment", "Dues at iba pang bayarin ng household", "amount, dueDate, status, residentId, proofOfPayment, verifiedById"),
        ("PaymentReference", "Unique na reference ng proof of payment", "reference (unique), paymentId, submittedAt"),
        ("AuditLog", "Trail ng finance at payment actions", "actorId, entity, entityId, action, details, createdAt"),
        ("FinanceEntry", "Income at expense ng HOA", "type, category, amount, description, recordedById, date"),
        ("FinanceSetting", "Global na setting ng dues", "duesSuspended, updatedAt"),
        ("Official", "Directory ng HOA officials", "name, position, term, contact, photo"),
    ],
    [3.1, 6.6, 6.9],
    font=9,
)

h2("Ang limang enums")
table(
    ["Enum", "Values", "Bakit enum"],
    [
        ("UserRole", "resident, hoa_officer, admin", "Tatlong fixed na antas ng access; hindi pwedeng mag-imbento ng role sa request."),
        ("UserStatus", "pending, verified, rejected, suspended, disabled", "Kinokontrol kung makakapasok at kung anong dahilan ng paghinto."),
        ("IncidentStatus", "pending, investigating, resolved, rejected", "Malinaw na state machine ng reklamo."),
        ("PaymentStatus", "pending, confirmed, rejected, overdue", "Limitadong state ng pera; ang overdue ay derived."),
        ("FinanceEntryType", "income, expense", "Dalawang direksyon lang ng cash flow."),
    ],
    [3.3, 7.4, 5.9],
    font=9,
)

h2("Tatlong detalye na madalas itanong")
kv(
    "Bakit one-to-one ang User at Resident",
    "Ang User ay para sa authentication at role. Ang Resident ay para sa household information na kailangan ng HOA. Pinaghihiwalay para hindi maghalo ang login data at community data, at para kayang mag-exist ang officer o admin na walang household record.",
)
kv(
    "Bakit may hiwalay na PaymentReference",
    "Ang reference number ang identifier na binibigay ng resident mula sa GCash o bank. Unique ito para hindi magamit ang isang resibo sa dalawang payment. Hiwalay na table ito para may sariling timestamp at para madaling i-audit ang submission history.",
)
kv(
    "Bakit hindi direktang naka-store ang overdue",
    "Dahil nagbabago ang kahulugan ng overdue habang tumatakbo ang oras. Kung naka-store, kailangang may cron job na mag-a-update araw-araw, at kapag nabigo ito, mali ang status. Sa derived approach, isang function ang nagko-compute kapag binabasa, kaya laging tama.",
)

# ------------------------------------------------------------
# PART 4 — Q&A
# ------------------------------------------------------------
h1("PART 4 — POSSIBLE PANEL QUESTIONS AT SAGOT")

p(
    "Sagutin sa tatlong hakbang: direktang sagot, isang dahilan, isang epekto. Ang mga sagot dito ay "
    "maikli para madaling tandaan. Palitan ng sariling salita kapag kaya."
)

# A
h2("A.  Kalikasan ng proyekto")

qa(
    "Ano ang TAA-App at bakit ito ginawa?",
    "Isang web-based HOA management system para sa Taguig Alliance of Associations. Ginawa ito dahil nakakalat sa Facebook group, Viber, Excel, at papel ang announcements, reklamo, at dues, kaya madaling mawala ang record at mahirap malaman kung sino ang updated. Isang system na lang ang source of truth, at role-based ang access ng resident, officer, at admin.",
)
qa(
    "Ano ang problema sa manual na proseso na na-solve ninyo?",
    "Tatlo: duplication, visibility, at accountability. Duplication dahil maraming listahan ng bayad; visibility dahil hindi alam ng resident ang standing niya; accountability dahil walang trail kung sino ang nag-verify. Naging isang record per household ang bayad, may sariling dashboard ang resident, at may audit log ang finance actions.",
)
qa(
    "Sino ang mga users at paano nila ito ginagamit?",
    "Tatlo: resident, HOA officer, at admin. Ang resident ay nagre-register, nagbabayad, nag-u-upload ng proof, at nagre-report ng incident. Ang officer ay nagbe-verify ng payment at account at humahawak ng incident. Ang admin ay may finance at user management. Iisang web app, pero iba ang dashboard at permissions.",
)
qa(
    "Ano ang saklaw at ano ang hindi saklaw ng sistema?",
    "Saklaw ang account verification, announcements, incident reporting, dues at proof of payment, finance records, officials directory, at dashboards. Hindi kasama ang online payment gateway, SMS at email notifications, native mobile app, at accounting-grade reports. Sinasadya ito para hindi lumaki nang labis ang scope.",
)
qa(
    "Paano naiiba ito sa Facebook group o GCash screenshot?",
    "Ang Facebook at GCash ay communication at payment tools, hindi record systems. Walang role, walang verification, walang audit trail, at walang sariling dashboard ang resident. Dito, ang bawat bayad ay may status, proof, at nag-verify, at ang bawat role ay limited sa kailangan lang niya.",
)
qa(
    "Ano ang pinakamalaking hamon sa pag-develop?",
    "Ang pag-align ng rules sa tatlong role at sa payment states. Maraming edge case: paano kung na-disable habang naka-login, paano kung na-verify na ang bayad, paano kung sabay ang dalawang officer. Naging solusyon ang paglalagay ng rules sa service at rules layer, at ang tokenVersion para agad na ma-invalidate ang session.",
)

# B
h2("B.  Arkitektura at pagpili ng stack")

qa(
    "Bakit three-tier at hindi isang Next.js app na may API routes lang?",
    "Kailangan naming hiwalay ang UI sa rules. Ang Express API ay pwedeng i-deploy at i-scale nang sarili, at hindi nagiging limitado sa serverless timeout kapag nagpoproseso ng image o maraming records. Mas malinaw din ang separation kapag nag-test at nag-debug: alam mo kung UI o API ang problema.",
)
qa(
    "Bakit Express at hindi Django, Laravel, o Spring?",
    "Isang wika ang buong stack, JavaScript at TypeScript, kaya pareho ang types at hindi kailangang mag-context switch. Mature at minimal ang Express, at kasya ang middleware model sa auth, validation, at rate limiting. Para sa laki ng sistema, ang built-in na admin at ORM ng Django ay hindi kailangan.",
)
qa(
    "Bakit REST at hindi GraphQL?",
    "Simple at predictable ang data needs. Bawat screen ay may malinaw na resource at action, kaya isang endpoint per action ang sapat at madaling i-cache at i-debug. Ang flexibility ng GraphQL ay hindi nagagamit, at dagdag na complexity lang ang schema at resolver layer.",
)
qa(
    "Bakit Next.js at hindi plain React na may Vite?",
    "Kailangan namin ng file-based routing, shared layouts per role, at proxy papunta sa backend. Built-in ang tatlo sa Next.js. Ang rewrites ay partikular na mahalaga dahil same-origin ang /api, kaya gumagana ang HttpOnly cookies nang walang CORS at walang exposed backend URL.",
)
qa(
    "Paano nag-uusap ang frontend at backend?",
    "Tinatawag ng Axios ang /api, at nire-rewrite ito ng Next.js papunta sa Express server gamit ang BACKEND_URL. Same-origin ito sa browser, kaya automatic na kasama ang cookies. Ang Express ay may CORS allowlist din para sa direktang access, at JSON ang palitan ng data.",
)
qa(
    "Saan naka-deploy ang bawat bahagi?",
    "Vercel ang Next.js frontend, isang Node host ang Express API, TiDB Cloud ang database, at Vercel Blob ang images. Environment variables ang nagdadala ng secrets, at HTTPS ang default sa frontend at sa managed database.",
)
qa(
    "Kung dumami ang users, saan ang bottleneck at ano ang una mong gagawin?",
    "Sa database reads ng dashboard at sa images. Unang hakbang, i-index ang filter columns at i-cache ang dashboard counts. Pangalawa, ilagay ang API sa mas maraming instance at gamitin ang connection pooling ng TiDB. Hindi kailangang i-rewrite ang architecture; horizontal scaling ang API at managed scaling ang database.",
)

# C
h2("C.  Frontend")

qa(
    "Bakit TypeScript? Hindi ba dagdag trabaho lang ito?",
    "Sa simula oo, pero bumabalik agad ang oras. Nahuhuli ang maling field name at maling status bago mag-run, at pareho ang type na ginagamit ng frontend at backend. Sa system na maraming status at role, malaking tulong na sinasabi ng compiler kung saan ka masisira kapag nag-refactor.",
)
qa(
    "Bakit Tailwind at hindi Bootstrap o Material UI?",
    "Kailangan namin ng custom na itsura na tugma sa HOA branding at mobile layout na hindi mukhang template. Ang Tailwind ay utilities lang, kaya walang unused CSS at consistent ang spacing at colors. Ang Radix ang nagbibigay ng behavior, at Tailwind ang styling, kaya magaan at kontrolado.",
)
qa(
    "Bakit Radix at hindi isang buong component library?",
    "Accessibility ang pangunahing dahilan. Ang focus trap, keyboard navigation, at ARIA labels sa dialog at select ay mahirap gawin nang tama. Ang Radix ang humahawak niyon, at hindi kami naka-lock sa isang design language na mahirap i-customize.",
)
qa(
    "Paano mo sinisiguro na mobile-friendly ang system?",
    "Mobile-first ang Tailwind classes at may responsive breakpoints sa mga table at card. Ang sidebar ay nagiging drawer sa maliit na screen, at may bottom navigation. Dahil cellphone ang pangunahing device ng resident, mas madalas i-test ang mobile view kaysa desktop.",
)
qa(
    "Bakit may validation sa frontend at backend? Hindi ba doble?",
    "Sadyang doble, at tama iyon. Ang frontend validation ay para sa mabilis na feedback at magandang UX. Ang backend validation ang tunay na security, dahil pwedeng i-bypass ang browser gamit ang Postman. Pareho ang Zod schema, kaya hindi nagkakalayo ang rules.",
)
qa(
    "Paano hinahandle ang loading at error states?",
    "May loading state sa bawat async action, disable ang submit button habang nagpadala para hindi madoble, at toast o inline message ang error. Ang Axios interceptor ay may central handling para sa 401 at network error, kaya hindi bawat page ang nag-iimbento ng sariling mensahe.",
)

# D
h2("D.  Backend at API")

qa(
    "Ilan ang endpoints at paano naka-organize ang backend?",
    "May siyam na feature modules: auth, users, residents, announcements, incidents, payments, finance, officials, at dashboard, na may 47 route handlers sa kabuuan. Bawat module ay may routes, controller, service, schema, at rules. Ang routes ang naka-deklara ng role, ang controller ang nagbabasa ng request, at ang service ang may business logic.",
)
qa(
    "Ano ang pinagkaiba ng controller at service?",
    "Ang controller ay HTTP layer: binabasa ang request, tinatawag ang service, at nagbabalik ng response. Ang service ay business layer: nagpapatupad ng rules, nag-coordinate ng maraming queries, at nagma-manage ng transaction. Kaya kapag tinawag ang parehong rule mula sa dashboard, hindi ito dumadaan sa HTTP.",
)
qa(
    "Paano ninyo vinavalidation ang input?",
    "May Zod schema per endpoint, at ang validate() middleware ang tumatakbo bago ang controller. Chine-check ang body, params, at query: uri, haba, range, enum, at required fields. Kapag mali, 400 agad na may malinaw na field error, at hindi na umaabot sa database.",
)
qa(
    "Ano ang itsura ng response at bakit standardized?",
    "May success flag, message, at data. Pareho ito sa lahat ng endpoint, kaya isang helper lang ang gamit ng frontend para sa success at error. Hindi na kailangang mag-guess ng bawat page kung saan nakalagay ang payload.",
)
qa(
    "Paano ang error handling?",
    "May ApiError class na may status at message. Ang central error middleware ang nag-format ng JSON at nag-log ng detalye sa server. Hindi lumalabas ang stack trace sa user, pero may tamang status: 400 sa maling input, 401 sa expired session, 403 sa maling role, 404 sa wala, at 409 sa conflict.",
)
qa(
    "Bakit Prisma at hindi raw SQL?",
    "Type safety at relations. Ang generated client ay tugma sa schema, kaya hindi nagkakamali sa column name. Parameterized ang queries, kaya ligtas sa injection. May include at transaction support, at may migration history. Kapag may query na kailangang i-optimize, pwedeng gumamit ng raw SQL sa Prisma.",
)
qa(
    "Paano mo naiiwasan ang mabigat o paulit-ulit na query?",
    "Gumagamit ng select para sa kailangan lang na fields, include para sa related data sa isang query, at groupBy o aggregate para sa dashboard counts. Ang mga list page ay may pagination at filter sa database, hindi sa browser. Ang dashboard ay isang endpoint na may role-based branch, kaya hindi tatlong beses na tawag.",
)

# E
h2("E.  Database at data modeling")

qa(
    "Bakit relational database at hindi MongoDB?",
    "Relasyon ang natural na hugis ng data: user, resident, payments, audit logs. Kailangan ng foreign key, unique constraint, at transaction para hindi magdoble ang reference at hindi maging kalahati ang billing. Sa document store, kailangang i-duplicate o i-embed, at manual ang consistency.",
)
qa(
    "Bakit TiDB Cloud?",
    "MySQL-compatible, kaya gumagana ang Prisma at pamilyar ang SQL. Managed, kaya may backup at availability na hindi namin kailangang i-maintain. May serverless tier na sakto sa budget, at kayang lumaki nang hindi nire-rewrite ang schema.",
)
qa(
    "Bakit UUID at hindi auto-increment?",
    "Hindi mahuhulaan ang ID, kaya hindi madaling mag-enumerate ng records. Pwede ring gumawa ng ID sa application bago mag-commit, at hindi nagkakaproblema sa sabay-sabay na writes. Ang trade-off ay mas malaking index, pero hindi ito problema sa laki ng data namin.",
)
qa(
    "Ipaliwanag ang relations sa schema.",
    "Isang User ay may isang Resident profile. Isang Resident ay may maraming Payment. Isang Payment ay may isang proof reference na unique. Isang User ay may maraming Announcement at Incident, at ang Incident ay may reportedBy at handledBy. Ang AuditLog at FinanceEntry ay naka-link sa actor na User.",
)
qa(
    "Bakit enum sa database at hindi free text?",
    "Para hindi makapasok ang invalid state. Kung text ang status, pwedeng maging 'confirm', 'Confirmed', o 'paid' ang isang record at hindi na tugma ang filters. Ang enum ay nagbibigay ng fixed na set na pareho sa Prisma at sa UI.",
)
qa(
    "Saan may indexes at bakit?",
    "Sa role, status, dueDate, userId, at iba pang madalas filter. Ang dashboard ay nagbibilang ng pending at overdue, at ang resident page ay naghahanap ng payments ng isang user. Kung walang index, full table scan ang bawat isa at bumabagal habang dumadami ang records.",
)
qa(
    "Bakit hindi binubura ang user?",
    "May payments at incidents na naka-link sa kanya. Kapag binura, mawawala ang trail at masisira ang foreign key. Ang disable ay nagbabawal ng login pero pinapanatili ang records, at ang tokenVersion bump ay agad na nagpapatalsik sa active session.",
)

# F
h2("F.  Security at authentication")

qa(
    "Paano naka-secure ang passwords?",
    "bcryptjs na may 12 salt rounds. Hindi plaintext at hindi reversible. Bawat password ay may sariling salt, kaya magkaiba ang hash kahit pareho ang password. Sadyang mabagal ang bcrypt, kaya mahal ang brute force kapag nakuha ang database.",
)
qa(
    "Bakit JWT at hindi server-side session?",
    "Stateless ang JWT, kaya walang session store na kailangang i-maintain at hindi bottleneck ang bawat request. Ang trade-off ay hindi kayang bawiin agad, at iyon ang sinosolusyunan ng tokenVersion. Para sa isang deployment at isang database, mas simple ito kaysa Redis session store.",
)
qa(
    "Bakit cookies at hindi localStorage?",
    "Ang HttpOnly cookie ay hindi kayang basahin ng JavaScript, kaya kahit may XSS, hindi nakukuha ang token. Ang localStorage ay accessible sa script. Same-origin ang API dahil sa Next rewrites, kaya automatic na ipinapadala ang cookie.",
)
qa(
    "Ipaliwanag ang refresh flow.",
    "15 minuto ang access token at 7 araw ang refresh token. Kapag nag-401 dahil expired ang access, ang Axios interceptor ay tumatawag ng isang refresh request, hinihintay ito, tapos nire-retry ang mga naka-queue na request. Kung invalid na rin ang refresh, force logout at balik sa login.",
)
qa(
    "Paano mo puwersahang ipapa-logout ang isang user?",
    "Ini-increment ang tokenVersion sa database. Nakalagay ang version sa token, at bawat authenticated request ay nagko-compare ng version sa database. Kapag hindi tugma, 401 agad. Ginagawa ito kapag logout, password change, disable, suspend, o status change.",
)
qa(
    "Paano ang RBAC? Paano kung i-edit ng resident ang URL?",
    "Nasa API ang tunay na check. Ang route ay may authorize('hoa_officer', 'admin'), at may ownership checks sa service. Kapag pinalitan ng resident ang URL para pumasok sa admin page, 403 ang API at walang data na babalik. Ang frontend guard ay UX lang, hindi security.",
)
qa(
    "Paano mo pinipigilan ang brute force?",
    "May rate limiter sa login na 10 attempts kada 15 minuto kada IP, at 5 registrations kada oras. May 1000 requests kada 15 minuto sa general API. Ang password ay bcrypt, kaya mabagal din ang bawat attempt kahit walang limiter.",
)
qa(
    "Paano ka ligtas sa SQL injection?",
    "Parameterized ang queries ng Prisma, kaya hindi isinasama ang user input sa SQL string. May Zod validation din sa uri at hugis ng input, at hindi kami nagko-concat ng raw SQL para sa user-supplied values.",
)
qa(
    "Paano ang XSS at CSRF?",
    "XSS: hindi nire-render ang user input bilang raw HTML, at HttpOnly ang tokens kaya hindi nakukuha ang session. CSRF: SameSite=Lax ang cookies at exact origin ang CORS, kaya hindi basta makakapagpadala ng state-changing request ang ibang site. Sa production naka-Secure din ang cookie.",
)
qa(
    "Ano ang hindi pa covered sa security?",
    "Walang email verification, walang two-factor authentication, walang IP allowlist para sa admin, at walang security audit mula sa third party. May basic limits at headers na, pero para sa production-grade HOA, ang susunod ay 2FA at audit ng dependencies.",
)

# G
h2("G.  Payments at finance")

qa(
    "Ipaliwanag ang payment flow end-to-end.",
    "Gumagawa ang officer o admin ng dues para sa household, pending ang status. Makikita ito ng resident sa dashboard. Nagbabayad siya sa GCash o bank, tapos isinusubmit ang reference at proof. Pending pa rin ito hanggang ma-review. Kapag na-verify ng officer, confirmed na at may verifiedBy at timestamp. Kapag mali, rejected na may dahilan.",
)
qa(
    "Bakit derived ang overdue at hindi naka-store?",
    "Dahil nagbabago ang overdue habang tumatakbo ang oras. Kung naka-store, kailangang may cron job na mag-a-update araw-araw, at kapag nabigo ito, mali ang status. Isang function ang nagko-compute ng pending + walang reference + lampas sa due date, kaya laging tama kahit walang scheduled job.",
)
qa(
    "Paano ang partial payments?",
    "Bawat payment record ay isang buong amount para sa isang period; hindi pa kami nagre-record ng partial sa isang record. Kung kailangan ng partial, ang approach ay hatiin sa dalawang payment record o magdagdag ng amountPaid field at ilipat ang rule sa remaining balance. Sinasadya naming sabihin ito bilang limitasyon.",
)
qa(
    "Bakit may hiwalay na PaymentReference?",
    "Ang reference number ang identifier mula sa GCash o bank. Unique ito para hindi magamit ang isang resibo sa dalawang payment. Hiwalay na table para may sariling submittedAt at para madaling i-audit ang submission history.",
)
qa(
    "Paano ang bulk dues at bakit kailangan ng transaction?",
    "Isang action ang gumagawa ng dues para sa maraming household. Kung mabibigo sa ika-walong household at hindi transaction, kalahati lang ang nabigyan ng bayad at mahirap ayusin. Ang $transaction ay nagsisigurong lahat o wala, kasama ang audit entry.",
)
qa(
    "Ano ang audit log at bakit finance lang ang sakop?",
    "Sinusundan nito ang actor, entity, action, details, at oras. Sinakop nito ang payment at finance actions dahil doon ang pinakamalaking risk: pera at dispute. Ang admin lang ang pwedeng tumingin, at isinusulat ito kasabay ng pagbabago para hindi magkahiwalay ang record at trail.",
)
qa(
    "Ano ang finance setting at paano ito gumagana?",
    "Isang global na setting na nagsasabi kung suspended ang dues. Kapag suspended, hindi pwedeng gumawa ng bagong dues, at may audit entry ang pagbabago. Iisang record lang ito kaya madaling i-check bago mag-generate.",
)
qa(
    "Paano mo sinisiguro na tama ang totals?",
    "Ang total due ay suma ng amounts, ang total paid ay suma ng confirmed lang, at ang outstanding ay max ng zero at difference. Galing sa isang function ang lahat ng page, kaya pareho ang number sa dashboard, list, at detail. Ang confirmed lang ang binibilang na bayad.",
)

# H
h2("H.  Features at workflows")

qa(
    "Bakit pending muna ang bagong account?",
    "Dahil hindi pwedeng magtiwala sa self-registration. Kailangang i-check ng officer o admin na totoong resident ng association ang nagrehistro. Habang pending, hindi pa makakapasok sa community data. Kapag rejected, may dahilan; kapag verified, may verifiedAt at verifiedBy.",
)
qa(
    "Bakit hindi pwedeng i-disable ang sarili o ang admin?",
    "Ang self-disable ay nagbubukod sa user sa sariling account at maaaring maging denial of service sa kanya. Ang admin disable ay pwedeng mag-iwan ng system na walang tagapamahala. May guard sa controller na humaharang sa dalawa, at role at status changes ay admin lang.",
)
qa(
    "Paano ang announcements at images?",
    "Ang officer at admin ay pwedeng mag-post. May title, body, at optional na image. Ang image ay dumadaan sa 5MB cap, type whitelist, resize sa 1200×675, at JPEG re-encode bago i-upload sa Blob. Ang resident ay read-only sa announcements.",
)
qa(
    "Paano ang incident reporting?",
    "Ang resident ay gumagawa ng report na may title, description, at details. Pending ito sa simula. Ang officer ang nagbabago ng status sa investigating, resolved, o rejected, at may handledBy at resolution. Nakikita ng resident ang progress sa sariling listahan.",
)
qa(
    "Ano ang officials page at bakit kailangan?",
    "Directory ng mga opisyales na may position, term, at contact. Madalas itanong ng resident kung sino ang kakausapin para sa isang isyu, at dati nakakalat ito sa group chat. Read-only ito sa resident at manage sa officer at admin.",
)
qa(
    "Paano nag-iiba ang dashboard per role?",
    "Isang endpoint ang may branch sa role. Ang resident ay nakakakita ng sariling balance at incidents. Ang officer ay nakakakita ng pending verifications at incident queue. Ang admin ay may dagdag na finance totals at user counts. Ang server ang nag-a-aggregate, hindi ang browser.",
)

# I
h2("I.  Testing, limitations, at future work")

qa(
    "Paano ninyo ni-test ang sistema?",
    "May manual functional testing per role at per status transition, may UAT sa mga gagamit, at may checks sa API gamit ang Postman para sa auth at permissions. Sinubukan din ang negative cases: maling password, expired token, maling role, sobrang laking file, at duplicate reference.",
)
qa(
    "Ano ang resulta ng UAT?",
    "Ang mga respondent ay nakagawa ng end-to-end na task: register, verify, post ng announcement, bayad at proof, at incident. Ang feedback ay nakatuon sa linaw ng dashboard at bilis ng verification. Ang detalyadong talahanayan ng resulta ay nasa Chapter 4 ng papel.",
)
qa(
    "Ano ang mga limitasyon ng sistema?",
    "Walang online payment gateway, walang SMS at email notification, walang native mobile app, walang partial payment sa isang record, at hindi pa kasama ang accounting-grade reports. Manual pa rin ang verification ng bayad dahil iyon ang actual na proseso ng HOA.",
)
qa(
    "Ano ang future work?",
    "Una, notification para hindi kailangang mag-refresh. Pangalawa, payment gateway integration para awtomatiko ang confirmation. Pangatlo, mobile app o PWA at offline support. Pang-apat, mas detalyadong finance reports at export. Panglima, two-factor authentication para sa admin.",
)
qa(
    "Paano kung walang internet ang resident?",
    "Hindi magagamit ang online features. Ito ang limitasyon ng web-based na sistema. Ang mitigation ay PWA caching para sa babasahin, at ang officer ay may access sa parehong records para ma-assist ang resident sa opisina.",
)
qa(
    "Paano kung mawala o mag-fail ang database?",
    "Managed ang TiDB at may backup at recovery. Sa app side, may connection pooling at error handling, at hindi nagsasagawa ng write kung walang database. Ang tunay na disaster plan ay i-restore ang backup at i-verify ang audit trail pagkatapos.",
)
qa(
    "Paano mo masasabing successful ang sistema?",
    "Kapag natapos ng resident ang bayad at incident report nang walang chat o tawag, kapag ang officer ay naka-verify sa isang screen, at kapag ang admin ay may audit trail. Sa UAT, ang sukatan ay task completion at bilang ng errors, hindi lamang kagandahan ng UI.",
)

# J
h2("J.  Mga curveball")

qa(
    "Ginamit ba ninyo ang AI sa pag-develop?",
    "Ginamit namin ito bilang assistant sa documentation at pagsuri ng syntax, pero kami ang nagdesisyon sa architecture at nagsulat ng rules. Bawat linya ay kaya naming ipaliwanag at binago namin kapag mali. Ang mahalagang punto, hindi tool ang basehan ng grade kundi ang pag-unawa sa sistema.",
)
qa(
    "Ilang lines of code at ilang oras ang ginugol?",
    "Hindi namin ito ginawang sukatan. Ang mahalaga ay natapos ang lahat ng core feature at may audit trail. Kung tatanungin, mas mabuting sabihin ang bilang ng modules at endpoints kaysa sa lines, dahil ang lines ay hindi nagpapakita ng quality.",
)
qa(
    "Bakit walang mobile app?",
    "Web-based ang pinili dahil isang codebase lang, agad na updated ang lahat, at walang app store review. Responsive ang UI at mobile-first, kaya gumagana sa cellphone. Kung kailangan ng native features tulad ng push notification, PWA o mobile app ang next step.",
)
qa(
    "Bakit walang SMS o email notification?",
    "Dagdag na service at gastos ito, at hindi pa kasama sa scope. Ang dashboard at toast ang unang feedback. Ang notification service ay nasa future work, at ang design ay handa dahil nasa service layer ang mga event na pwedeng pagmulan nito.",
)
qa(
    "Bakit walang online payment gateway?",
    "Wala pang merchant account ang HOA at manual ang actual na verification. Ang unang problema ay record at transparency, hindi ang paglilipat ng pera. Ang gateway ay next step kapag may merchant account at pumayag ang association.",
)
qa(
    "Ano ang pinakamalaking pagkakamali na naayos ninyo?",
    "Ang pagsunod sa lumang chat flow at ang hindi pagkakapareho ng overdue status sa iba't ibang page. Naging solusyon ang paglalagay ng isang function para sa status at pag-redraw ng flow para tumugma sa totoong proseso. Mas mahalaga ang natutunan kaysa sa error mismo.",
)
qa(
    "Kung bibigyan ka ng isang buwan, ano ang unahin mo?",
    "Notification at payment gateway. Ang notification ay nag-aalis ng manual na pag-check, at ang gateway ay nag-aalis ng manual na verification. Pareho silang direktang nagpapababa ng trabaho ng officer, kaya pinakamalaking epekto.",
)
qa(
    "Bakit walang delete?",
    "Sa finance at accounts, delikado ang delete. Ang disable at status ang tamang paraan para mapanatili ang trail at foreign key. May delete sa mga draft o payment na mali ang entry, pero may audit log at limitado sa tamang role.",
)

# ------------------------------------------------------------
# PART 5 numbers
# ------------------------------------------------------------
h1("PART 5 — NUMBERS CHEAT SHEET")

p(
    "Ito ang mga numerong madalas itanong at madaling makalimutan. Basahin ito nang tatlong beses sa gabi "
    "bago ang defense. Huwag mag-imbento kapag hindi sigurado; sabihin ang range at ang dahilan."
)
table(
    ["Item", "Value", "Bakit ito ang value"],
    [
        ("Roles", "3 — resident, hoa_officer, admin", "Sakto sa actual na hierarchy ng HOA; hindi kailangang gumawa ng custom role."),
        ("User statuses", "5 — pending, verified, rejected, suspended, disabled", "Sakop ang buong buhay ng account mula registration hanggang paghinto."),
        ("Incident statuses", "4 — pending, investigating, resolved, rejected", "Malinaw na state machine, walang ambiguous na 'closed'."),
        ("Payment statuses", "4 — pending, confirmed, rejected, overdue", "Overdue ay derived, hindi stored."),
        ("Finance entry types", "2 — income, expense", "Dalawang direksyon lang ng cash flow."),
        ("Database models", "10", "User, Resident, Announcement, Incident, Payment, PaymentReference, AuditLog, FinanceEntry, FinanceSetting, Official."),
        ("Enums", "5", "UserRole, UserStatus, IncidentStatus, PaymentStatus, FinanceEntryType."),
        ("Feature modules", "9", "auth, users, residents, announcements, incidents, payments, finance, officials, dashboard."),
        ("Route handlers", "47", "Kasama ang CRUD, verification, finance, at dashboard."),
        ("Access token", "15 minutes", "Maikli ang exposure kapag nanakaw; auto-refresh ang UX."),
        ("Refresh token", "7 days", "Isang linggo bago kailangang mag-login muli."),
        ("bcrypt rounds", "12", "Balanse ng security at login latency."),
        ("Login limit", "10 / 15 min / IP", "Pinipigilan ang password guessing."),
        ("Register limit", "5 / hour / IP", "Pinipigilan ang spam accounts."),
        ("API limit", "1000 / 15 min / IP", "Mataas dahil isang proxy IP ang frontend."),
        ("Max upload", "5 MB", "Sapat sa litrato, hindi sumasabog ang memory."),
        ("Image output", "1200 × 675 JPEG, quality 82", "16:9, pareho ang laki, mabilis mag-load."),
        ("Paper figures / tables", "7 figures, 3 tables", "Figures 1–7 at Tables 1–3, sequential ang caption."),
        ("Paper pages", "31", "1 cover, 2 TOC, 28 numbered body pages."),
    ],
    [4.3, 5.0, 7.3],
    font=9,
)

callout(
    "KUNG TATANUNGIN 'BAKIT 15 MINUTES?'",
    "Sapat ito para sa isang session ng pagbabasa at pag-fill ng form, pero sapat na maikli para limitado "
    "ang damage kapag nanakaw. Kapag mas mahaba, mas malaki ang window; kapag mas maikli, mas maraming "
    "refresh at mas maraming failure point. Ang 15 at 7 days ay standard na balanse.",
)

# ------------------------------------------------------------
# PART 6
# ------------------------------------------------------------
h1("PART 6 — KAPAG HINDI MO ALAM ANG SAGOT")

p(
    "May mga tanong na hindi mo kayang sagutin, at normal iyon. Ang mali ay ang mag-imbento. Kapag "
    "nahuli ng panel na nag-imbento ka, lahat ng sinabi mo ay pagdududahan. Kapag sinabi mong hindi mo "
    "alam pero alam mo kung paano hahanapin, respeto ang makukuha mo."
)

h2("Protocol na apat na hakbang")
numbered([
    "Aminin nang maikli: 'Hindi ko pa po na-explore ang parteng iyon.' Isang pangungusap lang; huwag magdahilan ng mahaba.",
    "Ilagay sa konteksto kung ano ang alam mo: 'Pero ang alam ko, ang nangyayari sa bahaging iyon ay...' Iugnay sa isang component na naintindihan mo.",
    "Sabihin ang paraan ng pag-verify: 'Kapag kailangan, titingnan ko ang logs at ang implementation sa [file/module].' Ipinapakita nitong may process ka.",
    "Mag-alok ng follow-up: 'Pwede ko pong i-demo o i-share ang screenshot pagkatapos.' Hindi mo sinasabing tapos ka na sa usapan; binibigyan mo ito ng susunod na hakbang.",
])

h2("Limang linyang pwedeng gamitin")
bullets([
    ("\"That's outside what I implemented directly, but the closest part I can explain is...\"", " — kapag malayo ang tanong sa scope."),
    ("\"I'd have to check the implementation to be accurate, but my understanding is...\"", " — kapag 80% sure ka."),
    ("\"We considered that, and we deliberately left it out because...\"", " — kapag feature na hindi kasama."),
    ("\"That's a valid gap. If we extend the system, the first step would be...\"", " — kapag limitasyon."),
    ("\"Can I clarify which part you'd like me to go deeper on?\"", " — kapag malabo ang tanong at kailangan ng oras."),
])

h2("Mga karaniwang bitag")
table(
    ["Huwag sabihin", "Bakit delikado", "Sabihin ito sa halip"],
    [
        ("'100% secure ang system.'", "Walang system ang 100% secure. Maghahanap agad ng butas ang panel.", "'May baseline controls kami: hashed passwords, HttpOnly cookies, RBAC, rate limits. Ang susunod na layer ay 2FA at dependency audit.'"),
        ("'AI ang gumawa ng lahat.'", "Binabalewala ang sariling pag-unawa at nag-aanyaya ng mas mahirap na tanong.", "'Ginamit namin ang AI bilang assistant, pero kami ang nagdesisyon sa architecture at nag-verify ng code.'"),
        ("'Scalable ito.'", "Walang benchmark o load test na sumusuporta.", "'Horizontal ang API at managed ang database, kaya may path to scale. Hindi pa namin na-load test.'"),
        ("'Wala kaming bug.'", "Imposible at agad na mapapatunayan ng isang demo.", "'May mga edge case pa, at ito ang mga alam naming limitasyon.'"),
        ("'Ginaya lang namin sa tutorial.'", "Binabalewala ang original na desisyon at context ng HOA.", "'Nag-refer kami sa documentation, pero ang rules at data model ay base sa actual na proseso ng association.'"),
    ],
    [4.4, 6.4, 5.8],
    font=9,
)

# ------------------------------------------------------------
# PART 7
# ------------------------------------------------------------
h1("PART 7 — TWO-MINUTE DEMO SCRIPT")

p(
    "Ang demo ay hindi page tour. Bawat click ay may isang linyang paliwanag. Dalawang minuto lang, "
    "pitong hakbang, isang kuwento: resident nagbayad, officer nag-verify, admin may record."
)
table(
    ["Time", "Gagawin", "Sasabihin"],
    [
        ("0:00–0:15", "Buksan ang login page", "'Ito ang entry point. Isang web app, tatlong role. Ang access ay nakabase sa account status at role.'"),
        ("0:15–0:35", "Login bilang resident, ipakita ang dashboard", "'Makikita ng resident ang sariling balance, announcements, at incidents. Hindi niya nakikita ang records ng iba.'"),
        ("0:35–1:00", "Buksan ang Payments, submit ng proof", "'Pending ang dues. Nagbabayad siya sa GCash, tapos ipinapasok ang reference at proof. Hindi pa confirmed; naghihintay ng review.'"),
        ("1:00–1:20", "Logout, login bilang officer, verify payment", "'Dito pumapasok ang human verification. Kapag confirmed, may verifiedBy at timestamp, at may audit entry.'"),
        ("1:20–1:35", "Mag-post ng announcement na may image", "'Ang image ay nire-resize at ni-re-encode bago i-upload, kaya pareho ang laki at walang script na nakapasok.'"),
        ("1:35–1:50", "Ipalit ang incident status", "'Pending, investigating, resolved. Nakikita ng resident ang progress sa sariling dashboard.'"),
        ("1:50–2:00", "Admin: finance at audit log", "'Ang admin lang ang may finance at audit. Bawat money action ay may actor, action, at oras.'"),
    ],
    [2.5, 6.3, 7.8],
    font=9,
)

callout(
    "BAGO MAG-DEMO",
    "I-login ang tamang account bago magsimula, i-clear ang notifications, at ihanda ang isang test payment "
    "na pending. Huwag mag-de-demo ng bulk dues o file upload na malaki; pwedeng magtagal at mawala ang momentum.",
    fill="EAF1FB",
    border="2E5496",
)

# ------------------------------------------------------------
# PART 8
# ------------------------------------------------------------
h1("PART 8 — FINAL CHECKLIST")

h2("Isang araw bago")
bullets([
    "Basahin ang Part 1 nang malakas nang dalawang beses. I-time ito; dapat 55–70 segundo.",
    "Repasuhin ang Part 5 numbers. Isulat sa isang index card ang 10 pinaka-madaling makalimutan.",
    "I-run ang demo mula login hanggang audit log nang walang tigil. Itala kung saan ka nagkakamali.",
    "I-check ang deployment: gumagana ba ang login, upload, at verify? May test data ba?",
    "I-prepare ang isang slide o papel na may architecture diagram at ERD para may reference ka.",
])

h2("Habang naghihintay")
bullets([
    "Huminga nang mabagal. Ang unang 30 segundo ang pinaka-nakakakaba; normal iyon.",
    "Alalahanin ang tatlong layer: client, application, data. Kapag nalito, bumalik sa tatlong iyon.",
    "Huwag magsalita nang mabilis. Ang mabagal at malinaw ay mas kapani-paniwala kaysa sa mabilis at magulo.",
])

h2("Habang sumasagot")
bullets([
    "Ulitin ang tanong sa sariling salita bago sumagot. Ito ay bumibili ng oras at nagpapakita ng pakikinig.",
    "Sagot muna sa isang pangungusap, tapos ang dahilan. Huwag mag-umpisa sa background.",
    "Kapag naputol o nalito, huminto, sabihin 'Let me answer that again', at mag-umpisa sa direkta.",
    "Kapag hindi alam, gamitin ang apat na hakbang sa Part 6. Huwag mag-imbento.",
])

h2("Ang tatlong bagay na dapat maalala kahit wala nang iba")
numbered([
    "Ang problema: nakakalat na record at walang accountability. Ang solusyon: isang role-based system na may audit trail.",
    "Ang architecture: Next.js client, Express API, Prisma at TiDB data. Ang client ay hindi directly nagdudugtong sa database.",
    "Ang security: bcrypt, HttpOnly JWT na may tokenVersion, RBAC sa API, at rate limits. Ang tunay na check ay server-side.",
])

# ------------------------------------------------------------
# keep each Ano 'to / Para saan / Bakit block on one page
# ------------------------------------------------------------
for par in doc.paragraphs:
    text = par.text
    if text.startswith("Ano 'to:") or text.startswith("Para saan:"):
        par.paragraph_format.keep_with_next = True

# ------------------------------------------------------------
# save
# ------------------------------------------------------------
settings = doc.settings.element
update = OxmlElement("w:updateFields")
update.set(qn("w:val"), "true")
settings.append(update)

doc.core_properties.title = "TAA-App Technical Defense Reviewer"
doc.core_properties.subject = "Capstone defense companion: technical explanations and Q&A bank"
doc.core_properties.author = "Bulahan Capstone Project"
doc.core_properties.comments = "Companion document to the TAA-App capstone paper."

doc.save(OUT)
print("saved", OUT)
