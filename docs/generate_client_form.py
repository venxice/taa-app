#!/usr/bin/env python3
"""Generate the client-facing TAA-App Acceptance Form (.docx).

Written for a non-technical reader (HOA president / resident representative):
short sentences, plain words, one Pass/Fail box per feature, and space for
comments on the same page.
"""

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
RED = RGBColor(0xB3, 0x1B, 0x1B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

NAVY_HEX = "1F3864"
BLUE_HEX = "2E5C9A"
PALE_BLUE_HEX = "EAF0F9"
BORDER_HEX = "BFBFBF"
GRAY_FILL_HEX = "F7F8FA"

BODY_FONT = "Calibri"
BODY_SIZE = 10.5

# ----------------------------------------------------------------------------
# Helpers
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
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rFonts.set(qn(attr), name)


def shade_cell(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_margins(cell, top=80, bottom=80, left=130, right=130):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for tag, value in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{tag}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_table_borders(table, color=BORDER_HEX, size=4):
    tblPr = table._tbl.tblPr
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


def set_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def set_row_height(row, cm, exact=False):
    trPr = row._tr.get_or_add_trPr()
    trHeight = OxmlElement("w:trHeight")
    trHeight.set(qn("w:val"), str(int(Cm(cm).twips)))
    trHeight.set(qn("w:hRule"), "exact" if exact else "atLeast")
    trPr.append(trHeight)


def add_rich_text(paragraph, text, size=BODY_SIZE, color=None, bold=False, align=None):
    if align is not None:
        paragraph.alignment = align
    lines = str(text).split("\n")
    for idx, line in enumerate(lines):
        if idx > 0:
            paragraph.add_run().add_break()
        for part in re.split(r"(\*\*.*?\*\*)", line):
            if not part:
                continue
            is_bold = part.startswith("**") and part.endswith("**") and len(part) > 4
            run = paragraph.add_run(part[2:-2] if is_bold else part)
            set_run_font(run, size=size, bold=bold or is_bold, color=color)


def add_body(doc, text, size=BODY_SIZE, space_after=7, color=None, italic=False, bold=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    add_rich_text(p, text, size=size, color=color, bold=bold)
    if italic:
        for run in p.runs:
            run.italic = True
    return p


def add_bullet(doc, text, size=BODY_SIZE):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(3.5)
    p.paragraph_format.line_spacing = 1.1
    add_rich_text(p, text, size=size)
    return p


def add_spacer(doc, points=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    set_run_font(p.add_run(""), size=points)


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


def add_section_title(doc, title, kicker=None, page_break=False):
    if page_break:
        p = doc.add_paragraph()
        p.paragraph_format.page_break_before = True
        p.paragraph_format.space_after = Pt(0)
        set_run_font(p.add_run(""), size=1)
    if kicker:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(kicker.upper())
        set_run_font(run, size=8.5, bold=True, color=BLUE)
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0 if kicker else 14)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(title)
    set_run_font(run, size=17, bold=True, color=NAVY)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "8")
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), BLUE_HEX)
    pBdr.append(bottom)
    pPr.append(pBdr)


def add_subhead(doc, text, space_before=12):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_run_font(run, size=11.5, bold=True, color=BLUE)
    return p


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

normal = doc.styles["Normal"]
normal.font.name = BODY_FONT
normal.font.size = Pt(BODY_SIZE)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15
rPr = normal.element.get_or_add_rPr()
rFonts = rPr.find(qn("w:rFonts"))
if rFonts is None:
    rFonts = OxmlElement("w:rFonts")
    rPr.append(rFonts)
for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
    rFonts.set(qn(attr), BODY_FONT)

doc.core_properties.title = "TAA-App Client Acceptance Form"
doc.core_properties.author = "Venice Don"
doc.core_properties.subject = "Client review and acceptance - TAA-App v1.0.0"
doc.core_properties.comments = "Prepared for Teremil Subdivision Homeowners Association"

# Header / footer (suppressed on the cover)
section.different_first_page_header_footer = True

header = section.header
hp = header.paragraphs[0]
hp.style = doc.styles["Normal"]
hp.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
hp.paragraph_format.space_after = Pt(0)
run = hp.add_run("TAA-App  |  Client Acceptance Form")
set_run_font(run, size=8, color=GRAY)
run = hp.add_run("\tTeremil Subdivision HOA")
set_run_font(run, size=8, color=GRAY)
set_paragraph_border_bottom(hp, BORDER_HEX, 4)

footer = section.footer
fp = footer.paragraphs[0]
fp.style = doc.styles["Normal"]
fp.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
fp.paragraph_format.space_before = Pt(0)
run = fp.add_run("Please return this form to the project team.")
set_run_font(run, size=8, color=GRAY)
run = fp.add_run("\tPage ")
set_run_font(run, size=8, color=GRAY)

fld = OxmlElement("w:fldSimple")
fld.set(qn("w:instr"), " PAGE ")
r = OxmlElement("w:r")
rPr = OxmlElement("w:rPr")
sz = OxmlElement("w:sz")
sz.set(qn("w:val"), "16")
rPr.append(sz)
color = OxmlElement("w:color")
color.set(qn("w:val"), "595959")
rPr.append(color)
r.append(rPr)
t = OxmlElement("w:t")
t.text = "1"
r.append(t)
fld.append(r)
fp._p.append(fld)

run = fp.add_run(" of ")
set_run_font(run, size=8, color=GRAY)

fld2 = OxmlElement("w:fldSimple")
fld2.set(qn("w:instr"), " NUMPAGES ")
r2 = OxmlElement("w:r")
rPr2 = OxmlElement("w:rPr")
sz2 = OxmlElement("w:sz")
sz2.set(qn("w:val"), "16")
rPr2.append(sz2)
color2 = OxmlElement("w:color")
color2.set(qn("w:val"), "595959")
rPr2.append(color2)
r2.append(rPr2)
t2 = OxmlElement("w:t")
t2.text = "7"
r2.append(t2)
fld2.append(r2)
fp._p.append(fld2)

# ----------------------------------------------------------------------------
# COVER
# ----------------------------------------------------------------------------
add_spacer(doc, 30)

cover = doc.add_table(rows=1, cols=1)
cover.alignment = WD_TABLE_ALIGNMENT.CENTER
cover.autofit = False
set_table_fixed(cover, 17.0)
set_table_borders(cover, NAVY_HEX, 8)
cell = cover.rows[0].cells[0]
cell.width = Cm(17.0)
shade_cell(cell, NAVY_HEX)
set_cell_margins(cell, top=600, bottom=600, left=520, right=520)

p = cell.paragraphs[0]
p.paragraph_format.space_before = Pt(10)
p.paragraph_format.space_after = Pt(4)
run = p.add_run("TEREMIL SUBDIVISION HOMEOWNERS ASSOCIATION")
set_run_font(run, size=9, bold=True, color=RGBColor(0xBD, 0xD7, 0xEE))

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(30)
p.paragraph_format.space_after = Pt(2)
run = p.add_run("TAA-App")
set_run_font(run, size=40, bold=True, color=WHITE)

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(0)
p.paragraph_format.space_after = Pt(18)
run = p.add_run("Client Acceptance Form")
set_run_font(run, size=24, bold=True, color=RGBColor(0xD9, 0xE2, 0xF3))

p = cell.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(0)
run = p.add_run(
    "Please try the system, tick Pass or Fail on each item,\n"
    "and tell us if it is ready for the HOA."
)
set_run_font(run, size=11.5, color=RGBColor(0xDE, 0xE8, 0xF5))

add_spacer(doc, 26)

info_rows = [
    ("Prepared for", "Teremil Subdivision Homeowners Association"),
    ("Prepared by", "Venice Don, Quality Assurance Officer"),
    ("System version", "TAA-App v1.0.0"),
    ("Date", "November 6, 2026"),
    ("Time needed", "About 45 to 60 minutes"),
    ("What you need", "The account we provided, and a phone (optional)"),
]
info = doc.add_table(rows=0, cols=2)
info.alignment = WD_TABLE_ALIGNMENT.CENTER
info.autofit = False
set_table_fixed(info, 17.0)
set_table_borders(info, BORDER_HEX, 4)
for label, value in info_rows:
    row = info.add_row()
    set_cant_split(row)
    c0, c1 = row.cells
    c0.width = Cm(4.6)
    c1.width = Cm(12.4)
    for c in (c0, c1):
        set_cell_margins(c, top=100, bottom=100, left=130, right=130)
    shade_cell(c0, "EDF1F8")
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_after = Pt(0)
    run = p0.add_run(label)
    set_run_font(run, size=9.5, bold=True, color=NAVY)
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(0)
    run = p1.add_run(value)
    set_run_font(run, size=10, color=RGBColor(0x26, 0x26, 0x26))
for i, width in enumerate([4.6, 12.4]):
    info.columns[i].width = Cm(width)

add_spacer(doc, 24)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(0)
run = p.add_run("Thank you for your time.")
set_run_font(run, size=11, bold=True, color=NAVY)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(2)
run = p.add_run(
    "There are no wrong answers. If something is confusing or does not work,\n"
    "please write it down. That is exactly what we need to know."
)
set_run_font(run, size=9.5, italic=True, color=GRAY)

# ----------------------------------------------------------------------------
# BEFORE YOU START
# ----------------------------------------------------------------------------
add_section_title(doc, "Before You Start", kicker="Read this first", page_break=True)

add_body(
    doc,
    "This form is a short list of the things TAA-App should do. You do not need to test "
    "everything in one sitting. Go through the checks in order, and take a break whenever you need to.",
)

add_subhead(doc, "How to use this form", space_before=8)
steps = [
    "**Open the website.** Use the link and the account we sent you.",
    "**Read each check.** It tells you what to click and what you should see.",
    "**Tick Pass** if it works the way it is described.",
    "**Tick Fail** if it does not. Write what happened in the box below it.",
    "**Sign the last page** and send the form back to us.",
]
for i, step in enumerate(steps, 1):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.left_indent = Cm(0.75)
    p.paragraph_format.first_line_indent = Cm(-0.75)
    run = p.add_run(f"{i}.  ")
    set_run_font(run, size=10.5, bold=True, color=BLUE)
    add_rich_text(p, step, size=10.5)

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.left_indent = Cm(0.4)
add_rich_text(
    p,
    "**A tip:** if something fails, a screenshot helps us a lot. Press "
    "**Windows + Shift + S** on a PC, or **Cmd + Shift + 4** on a Mac.",
    size=9.5,
)

add_subhead(doc, "What TAA-App does, in plain words")
for item in [
    "**One account per resident.** Residents sign up, and the HOA approves the account before it can be used.",
    "**Community news.** The HOA posts announcements with photos. Residents see them on their home page.",
    "**Concerns and incidents.** Residents report a problem and can follow its status until it is resolved.",
    "**Dues and payments.** The HOA posts dues, residents submit their proof of payment, and the HOA confirms it.",
    "**Money records.** The HOA records income and expenses, and can download a summary for each household.",
    "**Officials directory.** Residents can see who the current HOA officers are.",
]:
    add_bullet(doc, item, size=10)

add_subhead(doc, "What it does not do yet")
for item in [
    "**It does not receive online payments.** Residents still pay through GCash, the bank, or the treasurer. "
    "They only type the reference number into the system.",
    "**It does not send text or email alerts.** All updates appear inside the website.",
]:
    add_bullet(doc, item, size=10)

add_spacer(doc, 14)

help_box = doc.add_table(rows=1, cols=1)
help_box.alignment = WD_TABLE_ALIGNMENT.CENTER
help_box.autofit = False
set_table_fixed(help_box, 17.0)
set_table_borders(help_box, BLUE_HEX, 6)
hcell = help_box.rows[0].cells[0]
hcell.width = Cm(17.0)
shade_cell(hcell, PALE_BLUE_HEX)
set_cell_margins(hcell, top=200, bottom=200, left=200, right=200)
p = hcell.paragraphs[0]
p.paragraph_format.space_after = Pt(4)
run = p.add_run("Need help?")
set_run_font(run, size=11, bold=True, color=NAVY)
p = hcell.add_paragraph()
p.paragraph_format.space_after = Pt(3)
run = p.add_run("If you get stuck, or an account does not work, please contact:")
set_run_font(run, size=10, color=RGBColor(0x1A, 0x1A, 0x1A))
p = hcell.add_paragraph()
p.paragraph_format.space_after = Pt(0)
run = p.add_run("[Name of contact person]   ·   [mobile number]   ·   [email address]")
set_run_font(run, size=10, bold=True, color=BLUE)
p = hcell.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(0)
run = p.add_run("For your safety, please do not share your password with anyone.")
set_run_font(run, size=9, italic=True, color=GRAY)

# ----------------------------------------------------------------------------
# THE CHECKLIST
# ----------------------------------------------------------------------------
add_section_title(doc, "Your Checklist", kicker="12 checks", page_break=True)
add_body(
    doc,
    "Each check takes about two to five minutes. Tick one box per check. "
    "If you tick Fail, please tell us what you saw so we can fix it.",
    space_after=10,
)

checks = [
    (
        "Creating an account",
        "Open the website and click Register. Fill in your details in the two steps, then submit.",
        "Your account is created and marked Pending. The HOA still has to approve it before you can sign in.",
    ),
    (
        "Signing in and signing out",
        "Sign in with your account. Look at your home page, then click Logout. Try to open a page again.",
        "You land on the home page for your role. After logging out, the system asks you to sign in again.",
    ),
    (
        "Your profile",
        "Open My Profile. Change your contact number or home address, then save. Open the page again.",
        "Your changes are saved, and they are still there when you come back.",
    ),
    (
        "Announcements",
        "As an officer, post an announcement with a photo. Then sign in as a resident and open Announcements.",
        "Residents see only published posts. Pinned posts appear first. Only an administrator can delete a post.",
    ),
    (
        "Reporting a concern",
        "As a resident, open Incidents and click Report Incident. Fill in the details and submit.",
        "The report is saved and marked Pending. The resident can see their own reports, but not those of other residents.",
    ),
    (
        "Handling a concern",
        "As an officer, open that report. Set it to Investigating, then to Resolved, and write what was done.",
        "The resident sees the new status and the note. The date it was resolved is also shown.",
    ),
    (
        "Dues and proof of payment",
        "As an officer, create a due for one household. As a resident, open the due and type your GCash or OR reference number.",
        "The due moves to Pending review. The same reference number cannot be used for two different dues.",
    ),
    (
        "Confirming a payment",
        "As an officer, open Dues and review the payment. Confirm one payment, then reject another and write a reason.",
        "The resident sees Confirmed or Rejected, with the reason. The totals on the dashboard update.",
    ),
    (
        "Money records",
        "As an officer, add one income and one expense. Open the household statement and download the CSV file.",
        "The balance is correct, and the CSV file opens in Excel with the right amounts.",
    ),
    (
        "HOA officials",
        "Open Officials. Add an official, edit one, and mark one as inactive.",
        "The list is in the correct order and residents can view it. Only an administrator can delete an official.",
    ),
    (
        "Who can do what",
        "Sign in as a resident, then as an officer, then as an administrator. Compare the menu and the buttons.",
        "Each role sees only what it should. A resident cannot do officer or administrator tasks.",
    ),
    (
        "Using a phone or tablet",
        "Open the website on your phone. Use the menu, open a form, and scroll through a long list.",
        "The screen fits without sideways scrolling, and the buttons are easy to tap.",
    ),
]


def add_check_card(num, title, do_text, see_text):
    table = doc.add_table(rows=3, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_fixed(table, 17.0)
    set_table_borders(table, BORDER_HEX, 4)

    header_cell = table.cell(0, 0)
    header_cell.width = Cm(17.0)
    shade_cell(header_cell, NAVY_HEX)
    set_cell_margins(header_cell, top=95, bottom=95, left=150, right=150)
    p = header_cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(f"Check {num} of 12")
    set_run_font(run, size=8.5, bold=True, color=RGBColor(0xBD, 0xD7, 0xEE))
    run = p.add_run("     ")
    set_run_font(run, size=8.5)
    run = p.add_run(title)
    set_run_font(run, size=11.5, bold=True, color=WHITE)

    body_cell = table.cell(1, 0)
    body_cell.width = Cm(17.0)
    set_cell_margins(body_cell, top=110, bottom=100, left=170, right=170)
    p = body_cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.12
    run = p.add_run("What to do:  ")
    set_run_font(run, size=9.5, bold=True, color=NAVY)
    run = p.add_run(do_text)
    set_run_font(run, size=10.5, color=RGBColor(0x1A, 0x1A, 0x1A))

    p = body_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.12
    run = p.add_run("What you should see:  ")
    set_run_font(run, size=9.5, bold=True, color=NAVY)
    run = p.add_run(see_text)
    set_run_font(run, size=10.5, color=RGBColor(0x1A, 0x1A, 0x1A))

    result_cell = table.cell(2, 0)
    result_cell.width = Cm(17.0)
    shade_cell(result_cell, GRAY_FILL_HEX)
    set_cell_margins(result_cell, top=100, bottom=110, left=170, right=170)

    p = result_cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run("☐  ")
    set_run_font(run, size=14, color=GREEN)
    run = p.add_run("Pass")
    set_run_font(run, size=10.5, bold=True, color=GREEN)
    run = p.add_run("        ☐  ")
    set_run_font(run, size=14, color=RED)
    run = p.add_run("Fail")
    set_run_font(run, size=10.5, bold=True, color=RED)

    p = result_cell.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(1)
    run = p.add_run("If Fail, what happened?")
    set_run_font(run, size=8.5, italic=True, color=LIGHT_GRAY)

    p = result_cell.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    set_run_font(p.add_run(""), size=10)

    for row in table.rows:
        set_cant_split(row)
    set_row_height(table.rows[0], 0.85)
    set_row_height(table.rows[2], 2.8)

    # Keep the whole card together on one page.
    for row in table.rows[:-1]:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.keep_with_next = True
                paragraph.paragraph_format.keep_together = True
    for paragraph in table.rows[-1].cells[0].paragraphs:
        paragraph.paragraph_format.keep_together = True

    # spacing between cards
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(0)
    sp.paragraph_format.keep_with_next = True
    set_run_font(sp.add_run(""), size=8)
    return table


for idx, (title, do_text, see_text) in enumerate(checks, 1):
    add_check_card(idx, title, do_text, see_text)
    if idx % 3 == 0 and idx < len(checks):
        doc.add_page_break()

add_spacer(doc, 14)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(2)
run = p.add_run("That is the end of the checklist.")
set_run_font(run, size=10.5, bold=True, color=NAVY)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Please turn to the next page to count your answers and sign.")
set_run_font(run, size=9.5, italic=True, color=GRAY)

# ----------------------------------------------------------------------------
# SUMMARY AND DECISION
# ----------------------------------------------------------------------------
add_section_title(doc, "Summary and Decision", kicker="Last step", page_break=True)

add_body(
    doc,
    "Please count your answers below, then choose one decision and sign.",
    space_after=8,
)

tally = doc.add_table(rows=2, cols=4)
tally.alignment = WD_TABLE_ALIGNMENT.CENTER
tally.autofit = False
set_table_fixed(tally, 17.0)
set_table_borders(tally, BORDER_HEX, 4)
tally_widths = [5.6, 3.8, 3.8, 3.8]
labels = ["Total checks", "Passed", "Failed", "Not tested"]
for i, label in enumerate(labels):
    cell = tally.cell(0, i)
    cell.width = Cm(tally_widths[i])
    shade_cell(cell, NAVY_HEX)
    set_cell_margins(cell, top=90, bottom=90, left=100, right=100)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(label)
    set_run_font(run, size=9, bold=True, color=WHITE)
for i, value in enumerate(["12", "", "", ""]):
    cell = tally.cell(1, i)
    cell.width = Cm(tally_widths[i])
    set_cell_margins(cell, top=140, bottom=140, left=100, right=100)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(value)
    set_run_font(run, size=16, bold=True, color=NAVY)
for i, width in enumerate(tally_widths):
    tally.columns[i].width = Cm(width)
set_row_height(tally.rows[1], 1.2)

add_subhead(doc, "How would you rate TAA-App overall?")
p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(2)
run = p.add_run("☐ 1        ☐ 2        ☐ 3        ☐ 4        ☐ 5")
set_run_font(run, size=14, color=NAVY)
p = doc.add_paragraph()
p.paragraph_format.space_after = Pt(2)
run = p.add_run("Poor  —  Needs work  —  Acceptable  —  Good  —  Excellent")
set_run_font(run, size=8.5, italic=True, color=GRAY)

add_subhead(doc, "Your decision")
decision = [
    ("Yes, I accept TAA-App.", "It is ready for the HOA to use."),
    ("Yes, with comments.", "We can start using it. The items I listed can be fixed in the next update."),
    ("Not yet.", "Please fix the items I listed and let me test again."),
]
dt = doc.add_table(rows=0, cols=2)
dt.alignment = WD_TABLE_ALIGNMENT.CENTER
dt.autofit = False
set_table_fixed(dt, 17.0)
set_table_borders(dt, BORDER_HEX, 4)
for title, desc in decision:
    row = dt.add_row()
    set_cant_split(row)
    row.cells[0].width = Cm(1.6)
    row.cells[1].width = Cm(15.4)
    set_cell_margins(row.cells[0], top=130, bottom=130, left=120, right=60)
    set_cell_margins(row.cells[1], top=130, bottom=130, left=60, right=150)
    p0 = row.cells[0].paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p0.paragraph_format.space_after = Pt(0)
    run = p0.add_run("☐")
    set_run_font(run, size=18, color=NAVY)
    p1 = row.cells[1].paragraphs[0]
    p1.paragraph_format.space_after = Pt(0)
    run = p1.add_run(title + "  ")
    set_run_font(run, size=10.5, bold=True, color=RGBColor(0x1A, 0x1A, 0x1A))
    run = p1.add_run(desc)
    set_run_font(run, size=10, color=GRAY)
    set_row_height(row, 1.35)
for i, width in enumerate([1.6, 15.4]):
    dt.columns[i].width = Cm(width)

add_subhead(doc, "Anything else you want to tell us?")
box = doc.add_table(rows=1, cols=1)
box.alignment = WD_TABLE_ALIGNMENT.CENTER
box.autofit = False
set_table_fixed(box, 17.0)
set_table_borders(box, BORDER_HEX, 4)
cell = box.rows[0].cells[0]
cell.width = Cm(17.0)
set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
p = cell.paragraphs[0]
p.paragraph_format.space_after = Pt(0)
set_run_font(p.add_run(""), size=22)
p = cell.add_paragraph()
p.paragraph_format.space_after = Pt(0)
set_run_font(p.add_run(""), size=22)
set_row_height(box.rows[0], 5.0)

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(0)
run = p.add_run(
    "Not sure about an item? Tick Fail and write “not sure”. We will walk you through it."
)
set_run_font(run, size=9, italic=True, color=GRAY)

add_spacer(doc, 8)
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(4)
run = p.add_run("What happens next")
set_run_font(run, size=11, bold=True, color=BLUE)
for item in [
    "We read every comment you send, and we reply within three working days.",
    "Anything marked Fail is fixed and tested again. We will show you the fix.",
    "Once you are satisfied, we schedule the training and the turnover of the system.",
]:
    add_bullet(doc, item, size=10)



# ----------------------------------------------------------------------------
# SIGN-OFF
# ----------------------------------------------------------------------------
add_section_title(doc, "Sign-Off", kicker="Please sign here", page_break=True)

add_body(
    doc,
    "By signing below, you confirm that you have reviewed TAA-App and that the decision "
    "you marked on the previous page reflects your review.",
    space_after=10,
)

sigs = ["Client Representative", "Resident Representative", "Project Lead"]
sig_table = doc.add_table(rows=0, cols=1)
sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
sig_table.autofit = False
set_table_fixed(sig_table, 17.0)
set_table_borders(sig_table, BORDER_HEX, 4)
for role in sigs:
    row = sig_table.add_row()
    set_cant_split(row)
    cell = row.cells[0]
    cell.width = Cm(17.0)
    set_cell_margins(cell, top=150, bottom=150, left=180, right=180)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(role)
    set_run_font(run, size=10, bold=True, color=NAVY)
    for label, gap in (("Name", 0), ("Position", 0), ("Signature", 0), ("Date", 0)):
        fp2 = cell.add_paragraph()
        fp2.paragraph_format.space_before = Pt(0)
        fp2.paragraph_format.space_after = Pt(10)
        fp2.paragraph_format.line_spacing = 1.0
        fp2.paragraph_format.tab_stops.add_tab_stop(Cm(3.2), WD_TAB_ALIGNMENT.LEFT)
        run = fp2.add_run(f"{label}:")
        set_run_font(run, size=9.5, color=GRAY)
        run = fp2.add_run("\t")
        set_run_font(run, size=9.5, color=GRAY)
        run = fp2.add_run("_" * 68)
        set_run_font(run, size=9.5, color=LIGHT_GRAY)
    set_row_height(row, 4.6)
sig_table.columns[0].width = Cm(17.0)

add_spacer(doc, 12)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Salamat po sa inyong oras at tiwala.")
set_run_font(run, size=10, italic=True, color=GRAY)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Thank you for your time and trust.")
set_run_font(run, size=9, italic=True, color=LIGHT_GRAY)

# ----------------------------------------------------------------------------
# Save
# ----------------------------------------------------------------------------
output = "/Users/venice/taa-app-fullstack/docs/TAA-App_Client_Acceptance_Form.docx"
doc.save(output)
print(f"Saved: {output}")
