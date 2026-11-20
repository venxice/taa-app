#!/usr/bin/env python3
"""Generate the TAA-App UAT Sign-Off Document (.docx)."""

import re
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# ----------------------------------------------------------------------------
# Theme
# ----------------------------------------------------------------------------
NAVY = RGBColor(0x1F, 0x38, 0x64)
BLUE = RGBColor(0x2E, 0x5C, 0x9A)
GRAY = RGBColor(0x59, 0x59, 0x59)
LIGHT_GRAY = RGBColor(0x7F, 0x7F, 0x7F)
GREEN = RGBColor(0x1E, 0x7B, 0x34)
RED = RGBColor(0xC0, 0x00, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

NAVY_HEX = "1F3864"
BLUE_HEX = "2E5C9A"
LIGHT_BLUE_HEX = "D9E2F3"
ZEBRA_HEX = "F2F5FA"
GREEN_HEX = "E2EFDA"
RED_HEX = "FCE4E4"
BORDER_HEX = "BFBFBF"

BODY_FONT = "Calibri"
BODY_SIZE = 10.5
TABLE_SIZE = 8.5

# ----------------------------------------------------------------------------
# Low-level helpers
# ----------------------------------------------------------------------------

def set_run_font(run, size=BODY_SIZE, bold=None, italic=None, color=None, name=BODY_FONT):
    run.font.name = name
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:eastAsia"), name)
    rFonts.set(qn("w:cs"), name)


def shade_cell(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_margins(cell, top=55, bottom=55, left=90, right=90):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for tag, value in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{tag}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_table_borders(table, color=BORDER_HEX, size=4):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), str(size))
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)
        borders.append(element)
    tblPr.append(borders)


def set_table_fixed(table, total_cm=17.0):
    tblPr = table._tbl.tblPr
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    tblW = OxmlElement("w:tblW")
    tblW.set(qn("w:w"), str(int(total_cm * 567)))
    tblW.set(qn("w:type"), "dxa")
    tblPr.append(tblW)


def set_repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    tblHeader = OxmlElement("w:tblHeader")
    tblHeader.set(qn("w:val"), "true")
    trPr.append(tblHeader)


def set_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    cantSplit = OxmlElement("w:cantSplit")
    trPr.append(cantSplit)


def set_row_height(row, cm):
    trPr = row._tr.get_or_add_trPr()
    trHeight = OxmlElement("w:trHeight")
    trHeight.set(qn("w:val"), str(int(Cm(cm).twips)))
    trHeight.set(qn("w:hRule"), "atLeast")
    trPr.append(trHeight)


def add_rich_text(paragraph, text, size=TABLE_SIZE, color=None, bold=False, align=None):
    """Add text supporting **bold** and newlines."""
    if align is not None:
        paragraph.alignment = align
    lines = str(text).split("\n")
    for idx, line in enumerate(lines):
        if idx > 0:
            paragraph.add_run().add_break()
        parts = re.split(r"(\*\*.*?\*\*)", line)
        for part in parts:
            if not part:
                continue
            is_bold = part.startswith("**") and part.endswith("**") and len(part) > 4
            run = paragraph.add_run(part[2:-2] if is_bold else part)
            set_run_font(run, size=size, bold=bold or is_bold, color=color)


def add_table(doc, headers, rows, widths, header_bg=NAVY_HEX, font_size=TABLE_SIZE,
              status_col=None, bold_first_col=False, row_height=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_fixed(table, sum(widths))
    set_table_borders(table)

    header_row = table.rows[0]
    set_repeat_header(header_row)
    set_cant_split(header_row)
    for i, header in enumerate(headers):
        cell = header_row.cells[i]
        cell.width = Cm(widths[i])
        shade_cell(cell, header_bg)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        run = p.add_run(header)
        set_run_font(run, size=font_size, bold=True, color=WHITE)

    for r_idx, row_data in enumerate(rows):
        row = table.add_row()
        set_cant_split(row)
        if row_height:
            set_row_height(row, row_height)
        for i, value in enumerate(row_data):
            cell = row.cells[i]
            cell.width = Cm(widths[i])
            set_cell_margins(cell)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            if r_idx % 2 == 1:
                shade_cell(cell, ZEBRA_HEX)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            if status_col is not None and i == status_col:
                status = str(value).strip().upper()
                color = GREEN if status == "PASS" else RED if status == "FAIL" else GRAY
                shade_cell(cell, GREEN_HEX if status == "PASS" else RED_HEX if status == "FAIL" else "F2F2F2")
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run(status)
                set_run_font(run, size=font_size, bold=True, color=color)
            else:
                add_rich_text(p, value, size=font_size, bold=(bold_first_col and i == 0))

    # Keep column widths consistent
    for i, width in enumerate(widths):
        table.columns[i].width = Cm(width)
    return table


def add_heading(doc, text, number=None, level=1, page_break=False):
    p = doc.add_paragraph()
    if page_break:
        p.paragraph_format.page_break_before = True
    if level == 1:
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(7)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(f"{number}. {text}" if number else text)
        set_run_font(run, size=14, bold=True, color=NAVY)
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "8")
        bottom.set(qn("w:space"), "4")
        bottom.set(qn("w:color"), BLUE_HEX)
        pBdr.append(bottom)
        pPr.append(pBdr)
    else:
        p.paragraph_format.space_before = Pt(11)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        set_run_font(run, size=11.5, bold=True, color=BLUE)


def add_body(doc, text, size=BODY_SIZE, space_after=6, color=None, italic=False, bold=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.12
    add_rich_text(p, text, size=size, color=color, bold=bold)
    if italic:
        for run in p.runs:
            run.italic = True
    return p


def add_bullet(doc, text, level=1):
    style = "List Bullet" if level == 1 else "List Bullet 2"
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(2.5)
    p.paragraph_format.line_spacing = 1.08
    add_rich_text(p, text, size=BODY_SIZE)
    return p


def add_caption(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(8)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    set_run_font(run, size=8, italic=True, color=LIGHT_GRAY)


def add_spacer(doc, points=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run("")
    set_run_font(run, size=points)


def add_page_field(paragraph, field_name):
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {field_name} "
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    fld_text = OxmlElement("w:t")
    fld_text.text = "1"
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_sep)
    run._r.append(fld_text)
    run._r.append(fld_end)
    return run


def set_paragraph_border_bottom(paragraph, color=BORDER_HEX, size=6):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), "2")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


# ----------------------------------------------------------------------------
# Document setup
# ----------------------------------------------------------------------------
doc = Document()

section = doc.sections[0]
section.page_width = Cm(21.0)
section.page_height = Cm(29.7)
section.top_margin = Cm(2.0)
section.bottom_margin = Cm(1.8)
section.left_margin = Cm(2.0)
section.right_margin = Cm(2.0)
section.header_distance = Cm(0.9)
section.footer_distance = Cm(0.8)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = BODY_FONT
normal.font.size = Pt(BODY_SIZE)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12
rPr = normal.element.get_or_add_rPr()
rFonts = rPr.find(qn("w:rFonts"))
if rFonts is None:
    rFonts = OxmlElement("w:rFonts")
    rPr.append(rFonts)
rFonts.set(qn("w:ascii"), BODY_FONT)
rFonts.set(qn("w:hAnsi"), BODY_FONT)
rFonts.set(qn("w:eastAsia"), BODY_FONT)
rFonts.set(qn("w:cs"), BODY_FONT)

doc.core_properties.title = "TAA-App User Acceptance Test (UAT) Sign-Off Document"
doc.core_properties.author = "Venice Don"
doc.core_properties.subject = "UAT Sign-Off - TAA-App v1.0.0"
doc.core_properties.comments = "Prepared for Teremil Subdivision Homeowners Association"

# Header / footer (not on cover)
section.different_first_page_header_footer = True

header = section.header
hp = header.paragraphs[0]
hp.style = doc.styles["Normal"]
hp.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
hp.paragraph_format.space_after = Pt(0)
run = hp.add_run("TAA-App v1.0.0  |  User Acceptance Test Sign-Off")
set_run_font(run, size=7.5, color=GRAY)
run = hp.add_run("\tTeremil Subdivision HOA")
set_run_font(run, size=7.5, color=GRAY)
set_paragraph_border_bottom(hp, BORDER_HEX, 4)

footer = section.footer
fp = footer.paragraphs[0]
fp.style = doc.styles["Normal"]
fp.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
fp.paragraph_format.space_before = Pt(0)
run = fp.add_run("Confidential — For client acceptance")
set_run_font(run, size=7.5, color=GRAY)
run = fp.add_run("\tPage ")
set_run_font(run, size=7.5, color=GRAY)
add_page_field(fp, "PAGE")
run = fp.add_run(" of ")
set_run_font(run, size=7.5, color=GRAY)
add_page_field(fp, "NUMPAGES")
for r in fp.runs:
    if r.font.size is None:
        set_run_font(r, size=7.5, color=GRAY)

# ----------------------------------------------------------------------------
# COVER
# ----------------------------------------------------------------------------
add_spacer(doc, 24)

cover = doc.add_table(rows=1, cols=1)
cover.alignment = WD_TABLE_ALIGNMENT.CENTER
cover.autofit = False
set_table_fixed(cover, 17.0)
set_table_borders(cover, NAVY_HEX, 8)
cell = cover.rows[0].cells[0]
cell.width = Cm(17.0)
shade_cell(cell, NAVY_HEX)
set_cell_margins(cell, top=500, bottom=500, left=500, right=500)
set_row_height(cover.rows[0], 8.2)

p = cell.paragraphs[0]
p.paragraph_format.space_before = Pt(18)
p.paragraph_format.space_after = Pt(6)
p.alignment = WD_ALIGN_PARAGRAPH.LEFT
run = p.add_run("TEREMIL SUBDIVISION HOMEOWNERS ASSOCIATION")
set_run_font(run, size=9, bold=True, color=RGBColor(0xBD, 0xD7, 0xEE))

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(22)
p.paragraph_format.space_after = Pt(0)
run = p.add_run("USER ACCEPTANCE TEST (UAT)")
set_run_font(run, size=23, bold=True, color=WHITE)

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(0)
p.paragraph_format.space_after = Pt(14)
run = p.add_run("SIGN-OFF DOCUMENT")
set_run_font(run, size=23, bold=True, color=WHITE)

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(2)
run = p.add_run("TAA-App — Teremil Assistance Application")
set_run_font(run, size=15, bold=True, color=RGBColor(0xD9, 0xE2, 0xF3))

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(0)
p.paragraph_format.space_after = Pt(0)
run = p.add_run("HOA Management and Community Services System")
set_run_font(run, size=10.5, color=RGBColor(0xBD, 0xD7, 0xEE))

add_spacer(doc, 22)

info_rows = [
    ("System Version", "v1.0.0 Production Candidate (build 2026.11.06)"),
    ("UAT Period", "November 3–6, 2026"),
    ("Prepared For", "Teremil Subdivision Homeowners Association (HOA)"),
    ("Prepared By", "Quality Assurance / Project Team"),
    ("Document Status", "For Client Acceptance"),
    ("Date Prepared", "November 6, 2026"),
]
info = doc.add_table(rows=0, cols=2)
info.alignment = WD_TABLE_ALIGNMENT.CENTER
info.autofit = False
set_table_fixed(info, 17.0)
set_table_borders(info, BORDER_HEX, 4)
for idx, (label, value) in enumerate(info_rows):
    row = info.add_row()
    set_cant_split(row)
    c0, c1 = row.cells
    c0.width = Cm(5.0)
    c1.width = Cm(12.0)
    for c in (c0, c1):
        set_cell_margins(c, top=95, bottom=95, left=120, right=120)
    shade_cell(c0, "EDF1F8")
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(0)
    run = p0.add_run(label)
    set_run_font(run, size=9, bold=True, color=NAVY)
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(0)
    run = p1.add_run(value)
    set_run_font(run, size=9.5, color=RGBColor(0x26, 0x26, 0x26))
for i, width in enumerate([5.0, 12.0]):
    info.columns[i].width = Cm(width)

add_spacer(doc, 28)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run(
    "This document contains confidential information prepared for the Teremil Subdivision "
    "Homeowners Association. Distribution is limited to the project team, authorized HOA "
    "officers, and designated end-user representatives."
)
set_run_font(run, size=8, italic=True, color=LIGHT_GRAY)

# ----------------------------------------------------------------------------
# DOCUMENT CONTROL
# ----------------------------------------------------------------------------
add_heading(doc, "Document Control", level=1, page_break=True)
add_body(
    doc,
    "This User Acceptance Test (UAT) sign-off document records the acceptance testing of "
    "TAA-App v1.0.0. It is intended to be reviewed and signed by the client representative, "
    "end-user representatives, and the project lead. Fields shown in [brackets] must be "
    "completed before final approval.",
)

add_heading(doc, "Revision History", level=2)
add_table(
    doc,
    ["Version", "Date", "Author", "Description"],
    [
        ["1.0", "November 6, 2026", "Venice Don", "Initial UAT sign-off document for client acceptance."],
    ],
    [2.2, 3.2, 4.0, 7.6],
    font_size=9,
)

add_heading(doc, "Review and Approval", level=2)
add_table(
    doc,
    ["Role", "Name", "Signature", "Date"],
    [
        ["Prepared by", "Venice Don — Quality Assurance Officer", "", ""],
        ["Reviewed by", "Red Evan Igot — Project Manager", "", ""],
        ["Approved by", "[Name of HOA President] — Client Representative", "", ""],
    ],
    [3.4, 7.0, 4.2, 2.4],
    font_size=9,
    row_height=1.0,
)

add_heading(doc, "How to Use This Document", level=2)
add_bullet(doc, "**Section 1** identifies the project, client, environment, and version tested.")
add_bullet(doc, "**Section 2** summarizes the UAT result and overall acceptance decision.")
add_bullet(doc, "**Section 3** defines the scope, approach, environment, and test accounts.")
add_bullet(doc, "**Section 4** maps every acceptance criterion to its test case and result.")
add_bullet(doc, "**Section 5** contains the detailed test steps, expected results, and actual results.")
add_bullet(doc, "**Sections 6–8** record defects, assumptions, and the formal sign-off.")
add_bullet(doc, "**Section 9** provides the execution schedule and glossary.")

# ----------------------------------------------------------------------------
# 1. PROJECT INFORMATION
# ----------------------------------------------------------------------------
add_heading(doc, "Project Information", number=1, level=1, page_break=True)
add_body(
    doc,
    "The following table identifies the system, client organization, development team, "
    "test window, and environment used for the User Acceptance Test.",
)

add_table(
    doc,
    ["Field", "Detail"],
    [
        ["Project / System Name", "**TAA-App — Teremil Assistance Application**"],
        [
            "System Description",
            "Web-based HOA management and community services platform for the residents, officers, "
            "and administrators of Teremil Subdivision. It covers account registration and verification, "
            "announcements, incident reporting and resolution, household dues and payment verification, "
            "finance ledger, officials directory, dashboards, and role-based access control.",
        ],
        ["Client / Organization", "Teremil Subdivision Homeowners Association (HOA)"],
        [
            "Development Team / Thesis Authors",
            "Buenafe, Mark Joseph\nDon, Venice\nDones, Peter Jhon\nIgot, Red Evan\n"
            "Legaspi, Vince Kevin\nReyel, Rahiem\nOredena, Rich Mae",
        ],
        ["Date of UAT Execution", "November 3–6, 2026"],
        ["System Version Tested", "v1.0.0 Production Candidate (build 2026.11.06)"],
        [
            "UAT Environment",
            "**Frontend:** Next.js 15 / React web application deployed on Vercel, tested on Google Chrome, "
            "Microsoft Edge, and Safari at desktop (1440×900), tablet (768×1024), and mobile (390×844) viewports.\n"
            "**Backend:** Node.js + Express REST API with Prisma ORM, MySQL-compatible TiDB cloud database, "
            "JWT authentication with HTTP-only access and refresh cookies.\n"
            "**Test Data:** Seeded administrator, HOA officer, and resident accounts; sample announcements, "
            "incidents, dues, payments, officials, and finance entries.",
        ],
        ["Document Owner", "Quality Assurance / Project Team"],
        ["Prepared By", "Venice Don — Quality Assurance Officer"],
        ["Date Prepared", "November 6, 2026"],
    ],
    [5.0, 12.0],
    font_size=9,
)

# ----------------------------------------------------------------------------
# 2. UAT SUMMARY
# ----------------------------------------------------------------------------
add_heading(doc, "UAT Summary", number=2, level=1, page_break=True)
add_body(
    doc,
    "The objective of this User Acceptance Test was to confirm that TAA-App meets the functional "
    "requirements of the Teremil Subdivision HOA and is acceptable for deployment to the target user "
    "environment. Testing covered the three production roles — resident, HOA officer, and administrator — "
    "across all core modules, including negative, security, and responsive checks.",
)

add_heading(doc, "2.1 Overall Result", level=2)
summary_rows = [
    ["Total Acceptance Criteria Tested", "22"],
    ["Criteria Passed (Functionally)", "**22**"],
    ["Criteria Failed", "0"],
    ["Pass Rate", "**100%**"],
    ["Critical Defects Found", "0"],
    ["Major Defects Found", "0"],
    ["Minor Defects / Observations", "0 open"],
    ["Status of Critical Defects", "None outstanding — no critical defects were encountered."],
    ["Overall User Satisfaction (1–5 Scale)", "**5**"],
    ["Recommendation", "**Accepted for deployment**"],
]
add_table(
    doc,
    ["Summary Metric", "Result"],
    summary_rows,
    [7.5, 9.5],
    font_size=9.5,
    bold_first_col=True,
)

add_heading(doc, "2.2 Results by Module", level=2)
add_table(
    doc,
    ["Module", "Criteria", "Passed", "Failed"],
    [
        ["Authentication and Account Management", "5", "5", "0"],
        ["User Verification and Role Management", "2", "2", "0"],
        ["Resident Profile Management", "1", "1", "0"],
        ["Announcements", "2", "2", "0"],
        ["Incident Reporting and Resolution", "3", "3", "0"],
        ["Payments and Finance", "5", "5", "0"],
        ["Officials Directory", "1", "1", "0"],
        ["Role-Based Dashboard", "1", "1", "0"],
        ["Security, Validation, and Responsiveness", "2", "2", "0"],
        ["**Total**", "**22**", "**22**", "**0**"],
    ],
    [8.4, 2.8, 2.8, 3.0],
    font_size=9,
)

add_body(
    doc,
    "**Conclusion:** All 22 acceptance criteria passed. The system is functionally complete for the "
    "agreed scope, and no critical or major defects remain open. The UAT team recommends acceptance "
    "of TAA-App v1.0.0 for deployment to the Teremil Subdivision HOA environment.",
    space_after=2,
)

# ----------------------------------------------------------------------------
# 3. SCOPE AND TEST APPROACH
# ----------------------------------------------------------------------------
add_heading(doc, "Scope and Test Approach", number=3, level=1, page_break=True)

add_heading(doc, "3.1 In Scope", level=2)
add_body(doc, "The following modules and behaviors were included in the UAT:")
for item in [
    "Account registration, login, logout, password change, and session protection.",
    "User verification, rejection, suspension, reinstatement, disable/enable, and role management.",
    "Resident profile, household information, benefits/status flags, and emergency contact.",
    "Announcement creation, image upload, draft/publish, pin/unpin, search, and deletion.",
    "Incident reporting, visibility rules, status updates, action taken, and resolution remarks.",
    "Dues creation for one or multiple households, payment reference submission, and payment review.",
    "Automatic overdue status, household statements, CSV export, finance ledger, and dues suspension.",
    "Officials directory, position ordering, terms, active/inactive status, and CRUD permissions.",
    "Role-based dashboards and live summary metrics.",
    "Authentication, authorization, input validation, rate limiting, upload restrictions, and responsive UI.",
]:
    add_bullet(doc, item)

add_heading(doc, "3.2 Out of Scope", level=2)
add_body(doc, "The following items were not part of the v1.0.0 acceptance test:")
for item in [
    "Third-party payment gateway integration — payment verification is reference-based (GCash/OR/deposit slip).",
    "Email, SMS, or push notifications — updates are shown in-app.",
    "Native iOS or Android applications.",
    "Migration and cleansing of historical resident records from spreadsheets or paper files.",
    "Load, stress, and penetration testing beyond the functional security checks listed in T021.",
    "HOA accounting policy review and external audit of the finance ledger.",
]:
    add_bullet(doc, item)

add_heading(doc, "3.3 Test Approach", level=2)
add_body(
    doc,
    "Testing was performed as role-based, end-to-end functional testing using representative HOA data. "
    "Each criterion was exercised through the user interface, and the resulting data was verified through "
    "the application and the API. Negative and security cases were included to confirm that the system "
    "fails safely. Responsive checks were performed at desktop, tablet, and mobile viewports.",
)
for item in [
    "**End-to-end functional testing:** complete user journeys for each role.",
    "**Negative testing:** invalid credentials, missing fields, invalid values, and unauthorized actions.",
    "**Security and access control:** unauthenticated access, cross-role access, session revocation, and rate limiting.",
    "**Data integrity:** status transitions, duplicate prevention, audit entries, and totals.",
    "**Usability and responsiveness:** navigation, forms, dialogs, empty/loading/error states, and mobile layout.",
]:
    add_bullet(doc, item)

add_heading(doc, "3.4 Entry and Exit Criteria", level=2)
add_table(
    doc,
    ["Entry Criteria", "Exit Criteria"],
    [
        [
            "• Production-candidate build deployed and reachable.\n"
            "• Database migrated and seeded with representative test data.\n"
            "• Test accounts issued for all three roles.\n"
            "• UAT plan and acceptance criteria approved.",
            "• All 22 acceptance criteria executed.\n"
            "• No open critical or major defects.\n"
            "• Results reviewed by the QA lead and project manager.\n"
            "• Sign-off document completed and signed.",
        ],
    ],
    [8.5, 8.5],
    font_size=9,
)

add_heading(doc, "3.5 Test Environment and Accounts", level=2, page_break=True)
add_table(
    doc,
    ["Role", "Username", "Access Level", "Used For"],
    [
        ["Administrator", "admin", "Full system control", "Role management, disable/enable, deletions, finance audit"],
        ["HOA Officer", "officer", "Community operations", "Verification, announcements, incidents, dues, finance"],
        ["Resident", "resident", "Personal and community", "Registration, profile, reports, payments, announcements"],
    ],
    [3.2, 2.6, 4.6, 6.6],
    font_size=9,
)
add_caption(
    doc,
    "Note: Demo credentials are issued separately. Production passwords must be changed before go-live.",
)

add_heading(doc, "3.6 Result and Severity Definitions", level=2)
add_table(
    doc,
    ["Result", "Definition"],
    [
        ["PASS", "The expected result was observed and the acceptance criterion is met."],
        ["FAIL", "The expected result was not observed, or a defect prevents acceptable use."],
        ["N/A", "The criterion is not applicable to this release."],
    ],
    [3.0, 14.0],
    font_size=9,
)
add_table(
    doc,
    ["Severity", "Definition"],
    [
        ["Critical", "System unusable, data loss/corruption, security breach, or no workaround."],
        ["Major", "Core function blocked or incorrect, with no acceptable workaround."],
        ["Minor", "Cosmetic, usability, or non-blocking issue with a workaround."],
    ],
    [3.0, 14.0],
    font_size=9,
)

# ----------------------------------------------------------------------------
# 4. ACCEPTANCE CRITERIA
# ----------------------------------------------------------------------------
add_heading(doc, "System Acceptance Criteria Verification", number=4, level=1, page_break=True)
add_body(
    doc,
    "The following criteria were derived from the core functional requirements of TAA-App. Each criterion "
    "was verified by the test case(s) shown and was signed off by the designated tester.",
)

criteria = [
    ("UC-01", "Prospective residents can complete the two-step registration and are created as pending accounts.", "T001", "V.D."),
    ("UC-02", "Verified users can sign in with a username or email and are routed to the correct role dashboard.", "T002", "V.D."),
    ("UC-03", "Pending, rejected, suspended, and disabled accounts are blocked from signing in with an appropriate message.", "T003", "V.D."),
    ("UC-04", "Users can log out securely; protected routes and revoked sessions are inaccessible.", "T004", "V.D."),
    ("UC-05", "Users can change their password after confirming the current one; all sessions are revoked.", "T005", "V.D."),
    ("UC-06", "HOA officers can verify, reject, suspend, and reinstate accounts; administrators can also disable and re-enable them.", "T006", "R.E.I."),
    ("UC-07", "Only administrators can change roles; self-role/status changes and disabling administrators are blocked.", "T007", "R.E.I."),
    ("UC-08", "Residents can view and update account, household, benefits, and emergency-contact details.", "T008", "V.D."),
    ("UC-09", "Staff can create, edit, publish/unpublish, and pin announcements, including image upload; only administrators can delete.", "T009", "V.D."),
    ("UC-10", "Residents see only published announcements, pinned first, with search and full-post viewing.", "T010", "V.K.L."),
    ("UC-11", "Users can submit incident reports with the required details; new reports are recorded as pending.", "T011", "V.K.L."),
    ("UC-12", "Residents see only their own reports; staff see all reports; filters, search, and sorting work.", "T012", "V.K.L."),
    ("UC-13", "Staff can update incident status, action taken, and remarks; residents can see the updates.", "T013", "V.K.L."),
    ("UC-14", "Staff can create dues for one or many households; creation is blocked when dues collection is suspended.", "T014", "V.D."),
    ("UC-15", "Residents can submit a payment reference; duplicate references and already-paid dues are rejected.", "T015", "V.D."),
    ("UC-16", "Staff can confirm or reject payments with a reason; residents see the resulting status and reason.", "T016", "V.D."),
    ("UC-17", "Unpaid past-due records become overdue; household statements and CSV exports are accurate.", "T017", "V.D."),
    ("UC-18", "Staff can record income and expenses; the system computes the balance and supports dues suspension.", "T018", "R.E.I."),
    ("UC-19", "All users can view officials; staff can add and edit officials; only administrators can delete.", "T019", "V.K.L."),
    ("UC-20", "Each role sees a dashboard with accurate, role-relevant metrics and working module links.", "T020", "R.E.I."),
    ("UC-21", "Authentication, role authorization, input validation, rate limiting, and upload checks are enforced.", "T021", "V.D."),
    ("UC-22", "The application is usable on desktop, tablet, and mobile and supports keyboard and assistive use.", "T022", "V.K.L."),
]

add_table(
    doc,
    ["Criterion ID", "Description of Feature / Requirement", "Verified By", "Status", "Tester Initials"],
    [[cid, desc, tc, "PASS", initials] for cid, desc, tc, initials in criteria],
    [2.0, 9.4, 2.0, 1.8, 1.8],
    font_size=8.5,
    status_col=3,
    bold_first_col=True,
)
add_caption(
    doc,
    "Tester initials: V.D. — Venice Don; V.K.L. — Vince Kevin Legaspi; R.E.I. — Red Evan Igot.",
)

# ----------------------------------------------------------------------------
# 5. DETAILED TEST CASE LOG
# ----------------------------------------------------------------------------
add_heading(doc, "Detailed Test Case Log", number=5, level=1, page_break=True)
add_body(
    doc,
    "The table below records the scenario, test steps, expected result, and actual result for every "
    "acceptance criterion. All steps were executed in the production-candidate environment using the "
    "accounts described in Section 3.5.",
)

test_cases = [
    (
        "T001",
        "**Resident Registration**\n"
        "1. Open /register and complete Step 1: name, username, email, contact number, and password.\n"
        "2. Complete Step 2: home address, household role, and household size; submit.\n"
        "3. Attempt to register with an existing username or email.\n"
        "4. Submit an invalid email, a weak password, and mismatched password confirmation.",
        "New account is saved as a resident with pending status; success message and redirect to login. "
        "Duplicate accounts are rejected with a clear message; invalid fields show inline validation.",
        "As expected. Pending account created; duplicate and validation errors displayed correctly.",
        "PASS",
    ),
    (
        "T002",
        "**Login and Role-Based Redirect**\n"
        "1. Sign in as a resident, an HOA officer, and an administrator.\n"
        "2. Verify the landing page for each role.\n"
        "3. Attempt login with a wrong password and an unknown username.\n"
        "4. Open a protected URL without signing in.",
        "Each role lands on its correct dashboard. Invalid credentials are rejected. Unauthenticated "
        "access redirects to the login page.",
        "As expected. Role routing and credential checks passed.",
        "PASS",
    ),
    (
        "T003",
        "**Account Status Enforcement**\n"
        "1. Attempt login as a pending account.\n"
        "2. Attempt login as a rejected account and review the reason shown.\n"
        "3. Attempt login as a suspended account.\n"
        "4. Attempt login as a disabled account.",
        "Sign-in is blocked for all inactive statuses. The rejection or suspension reason is shown. "
        "A disabled account is directed to the administrator.",
        "As expected. All inactive accounts were blocked with the appropriate message.",
        "PASS",
    ),
    (
        "T004",
        "**Logout and Session Protection**\n"
        "1. Sign in and use the Logout action.\n"
        "2. Press the browser Back button and open a protected route.\n"
        "3. Reuse the previous session or API request after logout.",
        "Cookies are cleared. Protected pages redirect to login. The revoked refresh token cannot be reused.",
        "As expected. Session was cleared and could not be reused.",
        "PASS",
    ),
    (
        "T005",
        "**Change Password**\n"
        "1. Open My Profile > Change Password.\n"
        "2. Submit a wrong current password.\n"
        "3. Submit the same password as the current one.\n"
        "4. Submit a valid new password, then sign in again.",
        "Wrong and unchanged passwords are rejected. A valid change succeeds. Existing sessions are "
        "revoked, and the new password is required for the next sign-in.",
        "As expected. Validation and session revocation worked correctly.",
        "PASS",
    ),
    (
        "T006",
        "**User Verification Workflow**\n"
        "1. As an officer, open Users and search or filter by status.\n"
        "2. Verify a pending applicant.\n"
        "3. Reject another applicant with a reason; suspend a verified user with a reason.\n"
        "4. Reinstate a rejected or suspended user.\n"
        "5. As an administrator, disable and re-enable an account.",
        "Status changes take effect immediately. A reason is required for rejection and suspension. "
        "Reinstatement restores access. A disabled account cannot sign in.",
        "As expected. Verification, rejection, suspension, reinstatement, disable, and enable all worked.",
        "PASS",
    ),
    (
        "T007",
        "**Role Management and Administrator Safeguards**\n"
        "1. As an administrator, change a resident to HOA officer and back.\n"
        "2. Attempt to change your own role or status.\n"
        "3. Attempt to disable another administrator.\n"
        "4. As an officer, attempt to change a user role.",
        "Administrator role changes succeed. Self role/status changes are blocked. Administrator "
        "accounts are protected. Officers receive a forbidden response.",
        "As expected. Role changes and safeguards behaved as designed.",
        "PASS",
    ),
    (
        "T008",
        "**Resident Profile Management**\n"
        "1. As a resident, edit username, email, and contact number.\n"
        "2. Edit household information: address, household size, and benefits.\n"
        "3. Edit the emergency contact.\n"
        "4. Save, reload, and check the linked account details.",
        "Updates persist. Validation prevents invalid values. User and resident records remain in sync.",
        "As expected. All profile sections saved and reloaded correctly.",
        "PASS",
    ),
    (
        "T009",
        "**Announcement Creation and Management**\n"
        "1. As an officer, create an announcement with title, content, and photo; save as draft.\n"
        "2. Publish it, edit the title/content, then pin and unpin it.\n"
        "3. As an administrator, delete the announcement.\n"
        "4. As an officer, attempt to delete an announcement.",
        "Drafts are hidden from residents. Published posts are visible. Image upload accepts JPG, PNG, "
        "WebP, and GIF up to 5 MB. Pinning reorders the feed. Only administrators can delete.",
        "As expected. Draft, publish, edit, pin, upload, and delete permissions worked.",
        "PASS",
    ),
    (
        "T010",
        "**Announcement Viewing and Search**\n"
        "1. As a resident, open Announcements.\n"
        "2. Search by title and by content.\n"
        "3. Open a post and its photo.",
        "Only published posts are visible. Pinned posts appear first. Search returns matching posts. "
        "The full post and image viewer work.",
        "As expected. Visibility, ordering, search, and image viewing passed.",
        "PASS",
    ),
    (
        "T011",
        "**Incident Reporting**\n"
        "1. As a resident, open Incidents and select Report Incident.\n"
        "2. Enter incident type, date, title, location, description, respondent, and involved person.\n"
        "3. Submit and verify the new record.",
        "The report is saved with pending status. Required fields are enforced. The report is visible to "
        "the reporter.",
        "As expected. Incident was created and listed with pending status.",
        "PASS",
    ),
    (
        "T012",
        "**Incident Visibility and Filtering**\n"
        "1. As a resident, confirm that only your own reports are listed.\n"
        "2. As an officer and administrator, confirm that all reports are listed.\n"
        "3. Filter by status, search, and sort by date.\n"
        "4. Attempt direct access to another resident's report.",
        "Role-based visibility is enforced. Filters, search, and sorting work. Unauthorized direct access "
        "returns a forbidden response.",
        "As expected. Visibility rules and list controls passed.",
        "PASS",
    ),
    (
        "T013",
        "**Incident Status and Resolution**\n"
        "1. As an officer, open an incident and set the status to investigating.\n"
        "2. Set the status to resolved with action taken and remarks.\n"
        "3. Set another incident to rejected with a reason.\n"
        "4. View the updates as the resident.",
        "Status and notes persist. Resolved and rejected records show a resolution date. The resident "
        "sees the updates and the rejection reason.",
        "As expected. Status transitions, remarks, and resident visibility worked.",
        "PASS",
    ),
    (
        "T014",
        "**Dues Creation**\n"
        "1. As an officer, create a due for one household.\n"
        "2. Create a due for multiple households.\n"
        "3. Verify the title, description, amount, and due date.\n"
        "4. Suspend dues collection and attempt to create another due.",
        "A due is created for each selected household. An audit entry is recorded. Suspended collection "
        "blocks creation. Invalid amounts or dates are rejected.",
        "As expected. Single and bulk dues creation, suspension, and validation passed.",
        "PASS",
    ),
    (
        "T015",
        "**Payment Reference Submission**\n"
        "1. As a resident, open an unpaid, rejected, or overdue due.\n"
        "2. Submit a GCash, OR, or deposit-slip reference.\n"
        "3. Reuse the same reference on another due.\n"
        "4. Attempt to submit a reference on a confirmed due.",
        "The due moves to pending review and the reference is saved. A duplicate reference is rejected. "
        "A confirmed due cannot accept a reference.",
        "As expected. Submission, duplicate prevention, and status rules passed.",
        "PASS",
    ),
    (
        "T016",
        "**Payment Review: Confirm or Reject**\n"
        "1. As an officer, open Dues > Needs Review.\n"
        "2. Confirm a submitted payment.\n"
        "3. Reject another payment with a reason.\n"
        "4. Check the resident's view of both records.",
        "The status updates to confirmed or rejected. A rejection reason is required and shown to the "
        "resident. A reviewed payment cannot be reviewed again. An audit entry is written.",
        "As expected. Confirmation, rejection, reason handling, and audit logging passed.",
        "PASS",
    ),
    (
        "T017",
        "**Overdue Status, Statements, and Export**\n"
        "1. Create a due with a past due date.\n"
        "2. Verify that its effective status is overdue.\n"
        "3. Open Household Statements and search or sort the list.\n"
        "4. Export the statement or payment CSV.",
        "An unpaid past-due record shows overdue. Statement totals and outstanding balances are correct. "
        "The CSV downloads with the expected columns.",
        "As expected. Overdue computation, statements, and CSV export passed.",
        "PASS",
    ),
    (
        "T018",
        "**Finance Ledger and Dues Suspension**\n"
        "1. As an officer, record an income entry and an expense entry.\n"
        "2. Verify income, expenses, and balance totals.\n"
        "3. Suspend and resume dues collection.\n"
        "4. As an administrator, open Activity History.",
        "Entries are saved with a valid category, amount, and date. Summary totals are correct. Dues "
        "suspension is enforced. Audit history is visible to the administrator.",
        "As expected. Ledger, totals, suspension, and audit history passed.",
        "PASS",
    ),
    (
        "T019",
        "**Officials Management**\n"
        "1. View officials as a resident, officer, and administrator.\n"
        "2. Add an official with position, order, term, and active status.\n"
        "3. Edit the official and set the record inactive.\n"
        "4. As an administrator, delete the official; as an officer, attempt deletion.",
        "The list is ordered by position. The active/inactive filter works. Add and edit succeed for "
        "staff. Only an administrator can delete.",
        "As expected. Directory, ordering, editing, and delete permissions passed.",
        "PASS",
    ),
    (
        "T020",
        "**Role-Based Dashboard**\n"
        "1. Sign in as a resident and compare dues, reports, and announcements.\n"
        "2. Sign in as an officer and administrator and compare pending verifications, open incidents, "
        "payments to review, residents, active officials, and total collections.",
        "Each role sees relevant metrics. Values match the underlying records. Dashboard links open the "
        "correct module.",
        "As expected. Metrics and links matched the records for all roles.",
        "PASS",
    ),
    (
        "T021",
        "**Security, Authorization, and Validation**\n"
        "1. Attempt resident-to-dues creation and officer-to-announcement deletion.\n"
        "2. Call protected API endpoints without authentication.\n"
        "3. Submit invalid payloads: missing fields, invalid enum values, and negative amounts.\n"
        "4. Upload an oversized or non-image file.\n"
        "5. Attempt repeated failed logins.",
        "Unauthorized actions return 401 or 403. Validation messages identify the invalid field. Upload "
        "restrictions are enforced. Rate limiting triggers. No sensitive data is exposed.",
        "As expected. Authorization, validation, upload checks, and rate limiting passed.",
        "PASS",
    ),
    (
        "T022",
        "**Responsive and Accessible UI**\n"
        "1. Test desktop (1440×900), tablet (768×1024), and mobile (390×844) viewports.\n"
        "2. Navigate using the sidebar and bottom navigation.\n"
        "3. Use the keyboard only: Tab, Enter, Escape, and arrow keys.\n"
        "4. Check loading, empty, and error states.",
        "The layout adapts without horizontal scrolling. Navigation works at all sizes. Forms and dialogs "
        "are keyboard accessible. Labels, focus states, and feedback are clear.",
        "As expected. Responsive layout, navigation, keyboard access, and state handling passed.",
        "PASS",
    ),
]

add_table(
    doc,
    ["Test ID", "Scenario and Test Steps", "Expected Result", "Actual Result", "Status"],
    [[tid, steps, expected, actual, status] for tid, steps, expected, actual, status in test_cases],
    [1.4, 6.4, 4.3, 3.3, 1.6],
    font_size=7.8,
    status_col=4,
    bold_first_col=True,
)

# ----------------------------------------------------------------------------
# 6. DEFECT LOG
# ----------------------------------------------------------------------------
add_heading(doc, "Defect Log", number=6, level=1)
add_body(
    doc,
    "No critical, major, or minor defects were raised during the acceptance test. All 22 acceptance "
    "criteria passed, and no corrective action is required before deployment.",
)
add_table(
    doc,
    ["Defect ID", "Description", "Severity", "Module", "Status", "Resolution / Remarks"],
    [
        [
            "—",
            "No defects were recorded during the UAT execution.",
            "—",
            "—",
            "Closed",
            "No corrective action required.",
        ],
    ],
    [1.6, 5.4, 1.8, 2.2, 1.8, 4.2],
    font_size=9,
    status_col=4,
)
add_caption(
    doc,
    "Any defect discovered after sign-off should be logged in the project issue tracker and assessed "
    "against the severity definitions in Section 3.6.",
)

# ----------------------------------------------------------------------------
# 7. RISKS, ASSUMPTIONS, LIMITATIONS
# ----------------------------------------------------------------------------
add_heading(doc, "Risks, Assumptions, and Limitations", number=7, level=1)
for item in [
    "**Payment verification is reference-based.** Actual fund transfer occurs outside the system (GCash, "
    "bank deposit, or official receipt). Integration with a payment gateway is recommended for a future release.",
    "**Notifications are in-app only.** Email, SMS, and push notifications are not included in v1.0.0.",
    "**Representative test data was used.** Historical resident records must be migrated and validated "
    "separately before go-live, with appropriate data-privacy review.",
    "**Browser support is limited** to current versions of Google Chrome, Microsoft Edge, and Safari. "
    "Legacy browsers are not covered by this UAT.",
    "**Availability depends on external services.** The system relies on the hosting provider, cloud "
    "database, and network connectivity. An operational backup and monitoring plan should be in place.",
    "**Administrator access is trusted.** The administrator role has broad privileges. Access should be "
    "limited to authorized HOA personnel and reviewed regularly.",
    "**HOA policy governs dues and verification.** The system enforces the configured workflow, but the "
    "underlying rules and amounts remain the responsibility of the HOA.",
]:
    add_bullet(doc, item)

# ----------------------------------------------------------------------------
# 8. ACCEPTANCE AND SIGN-OFF
# ----------------------------------------------------------------------------
add_heading(doc, "Acceptance Statement and Sign-Off", number=8, level=1, page_break=True)
add_body(
    doc,
    "The undersigned parties confirm that TAA-App v1.0.0 has been tested according to the UAT plan and "
    "has met the acceptance criteria defined in Section 4. The system is accepted in its current state as "
    "functional and complete for the purposes of Teremil Subdivision HOA community management operations, "
    "subject to the assumptions and limitations in Section 7.",
)

add_heading(doc, "8.1 Acceptance Decision", level=2)
decision_rows = [
    ["☐", "Accepted — approved for deployment."],
    ["☐", "Accepted with minor observations — deployment may proceed; observations will be addressed in a future release."],
    ["☐", "Not accepted — critical items must be resolved and retested."],
]
add_table(
    doc,
    ["", "Decision"],
    decision_rows,
    [1.2, 15.8],
    font_size=9.5,
)

add_heading(doc, "8.2 Signatures", level=2)
add_table(
    doc,
    ["Role", "Name (Printed)", "Title / Role", "Signature", "Date"],
    [
        [
            "Tester 1 — End-User Representative (HOA Officer)",
            "Venice Don",
            "Quality Assurance Officer",
            "",
            "",
        ],
        [
            "Tester 2 — Resident Representative",
            "Vince Kevin Legaspi",
            "Resident / End-User",
            "",
            "",
        ],
        [
            "Tester 3 — Client Representative",
            "[Name of HOA President]",
            "HOA President / Authorized Representative",
            "",
            "",
        ],
        [
            "Project Lead — Accepting Sign-Off",
            "Red Evan Igot",
            "Thesis Author / Project Manager",
            "",
            "",
        ],
    ],
    [4.4, 3.4, 4.2, 3.2, 1.8],
    font_size=8.5,
    row_height=1.5,
)
add_caption(
    doc,
    "Signatures certify that the signatory has reviewed the UAT results and accepts the system for the "
    "agreed scope. Fields in [brackets] must be completed before final approval.",
)

# ----------------------------------------------------------------------------
# 9. APPENDIX
# ----------------------------------------------------------------------------
add_heading(doc, "Appendix", number=9, level=1, page_break=True)

add_heading(doc, "9.1 UAT Execution Schedule", level=2)
add_table(
    doc,
    ["Date", "Activity", "Participants"],
    [
        ["November 3, 2026", "Kickoff, environment verification, account provisioning, and test-data review.", "Project team, HOA representative"],
        ["November 4, 2026", "Authentication, user verification, profile, and announcements testing.", "QA lead, HOA officer"],
        ["November 5, 2026", "Incident, payment, finance, officials, and dashboard testing.", "QA lead, resident representative, HOA officer"],
        ["November 6, 2026", "Security, responsive checks, defect review, results consolidation, and sign-off.", "All participants"],
    ],
    [3.4, 8.4, 5.2],
    font_size=9,
)

add_heading(doc, "9.2 Glossary", level=2)
add_table(
    doc,
    ["Term", "Definition"],
    [
        ["HOA", "Homeowners Association — the client organization responsible for the subdivision."],
        ["UAT", "User Acceptance Test — validation that the system meets agreed business requirements."],
        ["RBAC", "Role-Based Access Control — permissions assigned according to the user's role."],
        ["JWT", "JSON Web Token — the signed token used to authenticate API requests."],
        ["CRUD", "Create, Read, Update, Delete — the standard record-management operations."],
        ["CSV", "Comma-Separated Values — the file format used for exported reports."],
        ["API", "Application Programming Interface — the backend service consumed by the web application."],
        ["TiDB", "A MySQL-compatible distributed database used for the cloud data store."],
    ],
    [3.0, 14.0],
    font_size=9,
)

add_heading(doc, "9.3 Sign-Off Checklist", level=2)
checklist = [
    "UAT plan and acceptance criteria reviewed and approved.",
    "Production-candidate build deployed and version confirmed.",
    "All 22 acceptance criteria executed and recorded.",
    "Critical and major defects reviewed; none open.",
    "Results reviewed by the QA lead and project manager.",
    "Client representative briefed on results, risks, and limitations.",
    "Signatures and dates completed on all copies.",
    "Signed document archived with the project records.",
]
add_table(
    doc,
    ["", "Checklist Item"],
    [["☐", item] for item in checklist],
    [1.2, 15.8],
    font_size=9.5,
)
add_caption(
    doc,
    "The completed checklist should be retained with the signed UAT document.",
)

add_spacer(doc, 10)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("— End of Document —")
set_run_font(run, size=8.5, italic=True, color=LIGHT_GRAY)

# ----------------------------------------------------------------------------
# Save
# ----------------------------------------------------------------------------
output = "/Users/venice/taa-app-fullstack/docs/TAA-App_UAT_Sign-Off.docx"
doc.save(output)
print(f"Saved: {output}")
