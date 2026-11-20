#!/usr/bin/env python3
"""Build the TAA-App capstone paper (.docx) from the supplied PDF.

Layout follows the source: A4, 1-inch margins, Times New Roman 12, double
spacing, justified body, figure/table captions, and a table of contents.
"""

import re
import sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_LINE_SPACING, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

BASE = "/Users/venice/taa-app-fullstack/docs/capstone"
OUT = f"{BASE}/TAA-App_Capstone_Paper.docx"

FONT = "Times New Roman"
BODY = 12
CAPTION = 11

TOC_ENTRIES = []          # (level, text)
TOC_PAGES = {   'INTRODUCTION': 1,
    'Project Context': 1,
    'Project Motivation': 1,
    'General Objective': 2,
    'Specific Objectives': 2,
    'Research Question': 2,
    'Scope': 2,
    'Delimitation': 3,
    'Significance of the Study': 3,
    'Current Process Flow': 4,
    'Proposed Process Flow': 6,
    'Gap Analysis': 7,
    'User Hierarchy': 8,
    'User Matrix': 8,
    'REVIEW OF RELATED LITERATURE & STUDIES': 10,
    'Review of Related Literature': 10,
    'WEB-Based Village Application at Singabangsa’s Village Head Office': 10,
    'Application System Document Submission to Improving Services in Jedongcangkring Village, Prambon District Web-Based': 11,
    'Transformation of Village Services Through Implementation of the Village Information System Web': 11,
    'Review of Related Systems': 12,
    'Accora Village Resident App': 12,
    'Synthesis': 13,
    'Definition of Terms': 13,
    'METHODOLOGY': 15,
    'Research Methodology': 15,
    'Research Methods': 15,
    'Data Collection Methods': 15,
    'Data Analysis Method': 15,
    'Research Respondents': 15,
    'Software Development Methodology': 16,
    'Architecture of the Proposed System': 17,
    'Use Case Diagram': 18,
    'Database Schema': 20,
    'Database Design': 21,
    'System Network Architecture': 22,
    'Requirements Analysis': 23,
    'Functional Requirements': 23,
    'Non-Functional Requirements': 24,
    'CONCLUSION AND RECOMMENDATION': 25,
    'Conclusion': 25,
    'Recommendations': 26,
    'References': 27,
    'APPENDIX A: INTERVIEW TRANSCRIPT': 28}


# ---------------------------------------------------------------------------
# low level
# ---------------------------------------------------------------------------
def set_run(run, size=BODY, bold=None, italic=None, color=None, caps=None):
    run.font.name = FONT
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
        rFonts.set(qn(attr), FONT)


def body_para(doc, text, first_indent=True, space_after=0, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
              size=BODY, keep_next=False):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.alignment = align
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.space_before = Pt(0)
    pf.space_after = Pt(space_after)
    if first_indent:
        pf.first_line_indent = Cm(1.27)
    pf.keep_with_next = keep_next
    run = p.add_run(text)
    set_run(run, size=size)
    return p


def numbered_bullet(doc, text, bullet="●"):
    """Bulleted paragraph. "Head\tBody" renders the head in bold with an en dash."""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.left_indent = Cm(2.20)
    pf.first_line_indent = Cm(-0.93)
    pf.tab_stops.add_tab_stop(Cm(2.20), WD_TAB_ALIGNMENT.LEFT)

    run = p.add_run(f"{bullet}\t")
    set_run(run, size=BODY)
    if "\t" in text:
        head, tail = text.split("\t", 1)
        r1 = p.add_run(head)
        set_run(r1, size=BODY, bold=True)
        r2 = p.add_run(" - " + tail)
        set_run(r2, size=BODY)
    else:
        r = p.add_run(text)
        set_run(r, size=BODY)
    return p


def term_para(doc, term, text):
    """Bulleted bold term on its own line, description as an indented paragraph."""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.left_indent = Cm(2.20)
    pf.first_line_indent = Cm(-0.93)
    pf.tab_stops.add_tab_stop(Cm(2.20), WD_TAB_ALIGNMENT.LEFT)
    run = p.add_run("●\t")
    set_run(run, size=BODY)
    run = p.add_run(term)
    set_run(run, size=BODY, bold=True)
    body_para(doc, text)


def chapter_head(doc, number, title):
    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(f"Chapter {number}")
    set_run(run, size=BODY)

    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(18)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(title.upper())
    set_run(run, size=BODY, bold=True)
    TOC_ENTRIES.append((0, title.upper()))


def section_head(doc, title, toc=True):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(12)
    pf.space_after = Pt(14)
    pf.keep_with_next = True
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(title)
    set_run(run, size=BODY, bold=True)
    if toc:
        TOC_ENTRIES.append((1, title))
    return p


def sub_head(doc, title):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(12)
    pf.space_after = Pt(10)
    pf.keep_with_next = True
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(title)
    set_run(run, size=BODY, bold=True)
    TOC_ENTRIES.append((2, title))
    return p


def add_figure(doc, path, caption, width_cm=14.0):
    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.add_run().add_picture(path, width=Cm(width_cm))

    c = doc.add_paragraph()
    c.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraph_format.space_before = Pt(0)
    c.paragraph_format.space_after = Pt(14)
    c.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = c.add_run(caption)
    set_run(run, size=CAPTION, italic=True)


def shade(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def cell_margins(cell, top=60, bottom=60, left=90, right=90):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for tag, value in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{tag}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def table_borders(table, color="000000", size=6):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(size))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tblPr.append(borders)


def fixed_table(table, widths):
    tblPr = table._tbl.tblPr
    for old in tblPr.findall(qn("w:tblLayout")):
        tblPr.remove(old)
    layout = OxmlElement("w:tblLayout")
    layout.set(qn("w:type"), "fixed")
    tblPr.append(layout)
    for i, w in enumerate(widths):
        table.columns[i].width = Cm(w)


TBLPR_ORDER = [
    "tblStyle", "tblpPr", "tblOverlap", "bidiVisual", "tblStyleRowBandSize",
    "tblStyleColBandSize", "tblW", "jc", "tblCellSpacing", "tblInd",
    "tblBorders", "shd", "tblLayout", "tblCellMar", "tblLook",
    "tblCaption", "tblDescription",
]


def normalize_tblPr(table):
    """Put tblPr children in schema order so Word opens the file cleanly."""
    tblPr = table._tbl.tblPr
    children = list(tblPr)
    rank = {qn(f"w:{tag}"): i for i, tag in enumerate(TBLPR_ORDER)}
    children.sort(key=lambda el: rank.get(el.tag, len(TBLPR_ORDER)))
    for el in children:
        tblPr.remove(el)
    for el in children:
        tblPr.append(el)


def add_table(doc, caption, headers, rows, widths, font_size=9.5):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table_borders(table)
    fixed_table(table, widths)

    hdr = table.rows[0]
    trPr = hdr._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:tblHeader"))
    for i, text in enumerate(headers):
        cell = hdr.cells[i]
        cell.width = Cm(widths[i])
        set_cell_margins = cell_margins
        set_cell_margins(cell)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        set_run(run, size=font_size, bold=True)

    for row_data in rows:
        row = table.add_row()
        for i, text in enumerate(row_data):
            cell = row.cells[i]
            cell.width = Cm(widths[i])
            cell_margins(cell)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(str(text))
            set_run(run, size=font_size)

    c = doc.add_paragraph()
    c.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraph_format.space_before = Pt(6)
    c.paragraph_format.space_after = Pt(12)
    c.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = c.add_run(caption)
    set_run(run, size=CAPTION, italic=True)
    normalize_tblPr(table)
    return table


def page_break(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run()
    run.add_break(WD_BREAK.PAGE)


def add_field(paragraph, instr, placeholder="1"):
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), instr)
    r = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    rFonts = OxmlElement("w:rFonts")
    for attr in ("w:ascii", "w:hAnsi"):
        rFonts.set(qn(attr), FONT)
    rPr.append(rFonts)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), "24")
    rPr.append(sz)
    r.append(rPr)
    t = OxmlElement("w:t")
    t.text = placeholder
    r.append(t)
    fld.append(r)
    paragraph._p.append(fld)


# ---------------------------------------------------------------------------
# document setup
# ---------------------------------------------------------------------------
doc = Document()
sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.top_margin = Cm(2.54)
sec.bottom_margin = Cm(2.54)
sec.left_margin = Cm(2.54)
sec.right_margin = Cm(2.54)
sec.header_distance = Cm(1.25)
sec.footer_distance = Cm(1.25)

style = doc.styles["Normal"]
style.font.name = FONT
style.font.size = Pt(BODY)
style.paragraph_format.space_after = Pt(0)
style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE

doc.core_properties.title = "TAA-App: Subdivision Assistance System"
doc.core_properties.author = "Brian Paul Bulahan"
doc.core_properties.subject = "A Capstone Study"
doc.core_properties.comments = "Mapua University - School of Information Technology"


# ---------------------------------------------------------------------------
# cover
# ---------------------------------------------------------------------------
def cover_line(doc, text, size=BODY, bold=False, after=0, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, italic=italic)


def cover_gap(doc, n=1):
    for _ in range(n):
        cover_line(doc, "")


cover_line(doc, "TAA-App: Subdivision Assistance System", size=14)
cover_gap(doc, 1)
cover_line(doc, "A Capstone Study")
cover_line(doc, "Presented to the Faculty of the School of Information Technology")
cover_line(doc, "Mapúa University")
cover_gap(doc, 1)
cover_line(doc, "In Partial Fulfilment")
cover_line(doc, "of the Requirements for the Degree of")
cover_line(doc, "Bachelor of Science in Information Technology")
cover_gap(doc, 1)
cover_line(doc, "Submitted by:")
cover_line(doc, "Brian Paul Bulahan")
cover_gap(doc, 1)
cover_line(doc, "Technical Adviser:")
cover_line(doc, "Antonette D. Gabriel")
cover_gap(doc, 1)
cover_line(doc, "Submitted to:")
cover_line(doc, "William T. Torres, PhD")
cover_gap(doc, 1)
cover_line(doc, "2026")

page_break(doc)

# ---------------------------------------------------------------------------
# table of contents
# ---------------------------------------------------------------------------
p = doc.add_paragraph()
p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(18)
p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
run = p.add_run("TABLE OF CONTENTS")
set_run(run, size=BODY, bold=True)

TOC_ANCHOR = len(doc.paragraphs)   # entries are inserted here in pass 2


def render_toc(entries):
    for level, text in entries:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
        pf.space_before = Pt(6 if level == 0 else 0)
        pf.space_after = Pt(2)
        pf.tab_stops.add_tab_stop(Cm(15.9), WD_TAB_ALIGNMENT.RIGHT, 2)  # dots
        if level == 0:
            pf.space_before = Pt(10)
        pf.left_indent = Cm(0.0 if level == 0 else 0.8 if level == 1 else 1.6)
        run = p.add_run(text.upper() if level == 0 else text)
        set_run(run, size=BODY, bold=(level == 0))
        run = p.add_run("\t" + str(TOC_PAGES.get(text, "00")))
        set_run(run, size=BODY, bold=(level == 0))


# ---------------------------------------------------------------------------
# body section (page numbers restart at 1)
# ---------------------------------------------------------------------------
body_sec = doc.add_section(WD_SECTION.NEW_PAGE)
body_sec.page_width = Cm(21.0)
body_sec.page_height = Cm(29.7)
body_sec.top_margin = Cm(2.54)
body_sec.bottom_margin = Cm(2.54)
body_sec.left_margin = Cm(2.54)
body_sec.right_margin = Cm(2.54)
body_sec.footer.is_linked_to_previous = False

pgNumType = OxmlElement("w:pgNumType")
pgNumType.set(qn("w:start"), "1")
body_sec._sectPr.append(pgNumType)

SECTPR_ORDER = [
    "headerReference", "footerReference", "footnotePr", "endnotePr", "type",
    "pgSz", "pgMar", "paperSrc", "pgBorders", "lnNumType", "pgNumType",
    "cols", "formProt", "vAlign", "noEndnote", "titlePg", "textDirection",
    "bidi", "rtlGutter", "docGrid", "printerSettings", "sectPrChange",
]
_sectPr = body_sec._sectPr
_rank = {qn(f"w:{t}"): i for i, t in enumerate(SECTPR_ORDER)}
_kids = sorted(list(_sectPr), key=lambda el: _rank.get(el.tag, len(SECTPR_ORDER)))
for _el in _kids:
    _sectPr.remove(_el)
for _el in _kids:
    _sectPr.append(_el)

fp = body_sec.footer.paragraphs[0]
fp.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
fp.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
add_field(fp, " PAGE ")

# ---------------------------------------------------------------------------
# CHAPTER 1
# ---------------------------------------------------------------------------
chapter_head(doc, 1, "Introduction")

section_head(doc, "Project Context")
body_para(doc,
    "Due to the high demand of convenience and security, there has been the need for the "
    "development for new applications and technology. The pandemic has started in the year 2020 "
    "and since then, applications like TikTok and Grab have become very convenient and "
    "entertaining. This has caused many companies and establishments to create mobile and web "
    "applications of their own. The importance of these applications is to assist and support "
    "customers and users that would like to avail of the products and services of different "
    "establishments [5].")
body_para(doc,
    "The Teremil Subdivision is an area that could benefit from these technologies. This will "
    "be a significant improvement from always depending on the Facebook groups. The residents "
    "and officers of Teremil Subdivision always rely on the Facebook groups. This is where they "
    "would show their concerns and there is no efficient way in addressing them.")
body_para(doc,
    "This project attempts to provide a means of a better way of getting information and a "
    "more convenient way of giving quality service to the residents of Teremil Subdivision. This "
    "will also serve as an assistance application, where the users will have a more convenient "
    "experience. The demand for systems in villages and subdivisions has not yet been reached. "
    "This is due to the dependency of people using social media.")

section_head(doc, "Project Motivation")
body_para(doc,
    "The researcher started this project to provide ease and convenience in using an "
    "assistance application that is for the residents of Teremil Subdivision.")
body_para(doc,
    "This subdivision application would involve the homeowner’s association and all the "
    "residents of Teremil. It is important that the residents of Teremil are updated with what "
    "goes on in the subdivision. A key point to why this research is being made is to create an "
    "application that will cater to any needs and concerns of the residents of Teremil. This is "
    "also to make sure that the residents of Teremil will not be left out. The project will "
    "assist in servicing the user’s questions and requests such as payment features like the "
    "homeowner’s fee. Another key point as to why this research is being created is to update "
    "the residents of Teremil on the local news. The project is essential as it will make the "
    "lives of the residents of Teremil more convenient.")

section_head(doc, "General Objective")
body_para(doc,
    "This study aims to develop an application that will provide more convenience in "
    "servicing and assisting the residents of Teremil Subdivision.")

section_head(doc, "Specific Objectives")
numbered_bullet(doc,
    "To provide a web application that will conveniently service the user’s requests and "
    "concerns such as subdivision permits")
numbered_bullet(doc,
    "To provide a web application that will collect information from the users so that they "
    "can experience the application’s full functionalities")
numbered_bullet(doc,
    "To provide a web application that will improve and impact the means of communication in "
    "the subdivision")

section_head(doc, "Research Question")
body_para(doc,
    "How can the use of the developed application better serve the residents of Teremil "
    "Subdivision?")

section_head(doc, "Scope")
body_para(doc,
    "The researcher will create a web application that will focus on subdivision security and "
    "convenience. Enhanced community service through online assistance and servicing document "
    "transactions. It consists of the residents and the homeowner’s association. This strategy "
    "would produce safe and welcoming environments. Also included will be emergency contacts, "
    "updates in the subdivision and local news updates. The users are expected to have an easier "
    "time in their requests and questions.")
body_para(doc,
    "It is to encourage the residents to be more active and responsible in the subdivision. "
    "This is also to give a friendlier and more hospitable feeling in the subdivision. It will "
    "also be a valuable contribution to the community, that this new technology will help "
    "create a safer space and it will make it more peaceful for the residents of the subdivision.")

section_head(doc, "Delimitation")
body_para(doc,
    "The restrictions will only be applicable to Teremil Subdivision. The system will work "
    "only if there is an established online connection.")

section_head(doc, "Significance of the Study")
body_para(doc,
    "This study will be undertaken to find out how effective and convenient this project will "
    "be for Teremil Subdivision. The users will be the residents and members of the homeowner’s "
    "association. It is also to determine if the needs and the convenience of the residents will "
    "be met.")
term_para(doc, "Residents",
    "The primary beneficiaries of the system will be the residents. The benefit for the "
    "residents is that the system will update them and cater to their needs inside Teremil "
    "Subdivision.")
term_para(doc, "Homeowner’s Association",
    "The benefits for the members of the association will be easier access. The project will "
    "assist them to cater to the resident’s requests and to address their concerns within the "
    "subdivision.")

page_break(doc)

section_head(doc, "Current Process Flow")
add_figure(doc, f"{BASE}/fig_current_flow.png", "Figure 1. Current Process Flow", 11.5)
body_para(doc,
    "As seen in Figure 1, the Current Process Flow is the current state of processing an "
    "account of a resident at Teremil Subdivision. The requirement is that the person is a "
    "current resident of the subdivision to be included in the Facebook group. Once verified, "
    "the person will be able to join the group and the group chat. There are concerns in the "
    "subdivision such as improper garbage disposal and disputes, where the residents would "
    "discuss in the Facebook group. The officers of Teremil Subdivision would then have the "
    "responsibility to address these issues. Their responsibilities include maintaining peace, "
    "order and to create systematic solutions. The problem for the officers is that there are "
    "no official regulations in the subdivision for the residents to know and follow.")

page_break(doc)

section_head(doc, "Proposed Process Flow")
add_figure(doc, f"{BASE}/fig_proposed_flow.png", "Figure 2. Proposed Process Flow", 15.4)
body_para(doc,
    "The proposed Process Flow is illustrated in Figure 2, categorized into three swim lanes "
    "representing the Admin, Officer, and Resident subsystems. The first subsystem is the "
    "Administrator subsystem, or the Admin, which will be managed by the administrator "
    "designated in the subdivision where the system is deployed. The Administrator will manage "
    "and oversee the entire system. The functionality of the Administrator is to manage the "
    "accounts of the officials and residents. The next functionality of the Admin is to assist "
    "the officials in their respective accounts. The Admin will be responsible for creating the "
    "accounts of the Officers.")
body_para(doc,
    "The second module of the system is managed by the Officials. Prior to using the full "
    "features of the system, the Officials will receive their account credentials from the "
    "Admin. The first feature will be managing and creating the accounts of the residents. The "
    "second feature is the payment feature, which facilitates the systematic issuance of "
    "billing statements and the centralized management of incoming revenue, allowing the "
    "Officials to monitor outstanding dues and payment histories in real time. The third "
    "feature is the announcements page. It is where the Officials will be posting updates, "
    "ensuring that the Residents are up to date.")
body_para(doc,
    "The last subsystem is the Frontend to be utilized by the residents. This subsystem "
    "consists of five different functions. The users will be required to sign in the account "
    "and fill up the required information. The first feature will show the resident’s "
    "information. The second feature will be the announcements page, where the user will see "
    "the posted updates and announcements. The third feature will be the payment page. Once the "
    "user clicks the payment feature, they will be able to see what they have to pay for in the "
    "subdivision like monthly dues. The fourth feature will be the incidents page. The users "
    "will be able to see their incident history and if they have been resolved. Lastly, the "
    "fifth feature will be the official’s page. The users will be able to view the list of the "
    "officers of the subdivision. The proposed Process Flow targets to make a significant "
    "improvement for the betterment of the residents and officers.")

section_head(doc, "Gap Analysis")
add_table(
    doc,
    "Table 1. Gap Analysis",
    ["Current State", "Desired State", "Remedies"],
    [
        ["- Different residents might not see the use of this.",
         "- The entire subdivision using the system with ease.",
         "- The system will be presentable and useful."],
        ["- There are differences in web specifications.",
         "- The use of the system will be applicable to all computers.",
         "- The system requirements will be compatible for all."],
        ["- Not all residents would have computers.",
         "- The system can be convenient for the elderly.",
         "- The system would be user friendly for all ages."],
    ],
    [5.0, 5.0, 5.3],
)
body_para(doc,
    "Table 1 shows the Gap Analysis of the system. The current method of how the residents of "
    "Teremil Subdivision communicate is through the use of Facebook Messenger. Another issue "
    "with the current state is that the residents might not see the need for a subdivision "
    "application. The aim of the system is to be a convenient application that the residents "
    "can easily use and benefit from. A remedy of this system is that it will be user-friendly "
    "for all residents.")

section_head(doc, "User Hierarchy")
numbered_bullet(doc,
    "Residents\tUsers that are registered and now have accounts. The Residents will be able to "
    "view their information, payment history, incident history, announcements and the list of "
    "the Officials.")
numbered_bullet(doc,
    "Officials\tUsers that will create and monitor the accounts of all the Residents of Teremil "
    "Subdivision. These accounts will have similar features to the account of the Admin, but "
    "with fewer functionalities.")

section_head(doc, "User Matrix")
body_para(doc,
    "Table 2 shows the proposed User Matrix of TAA-App. The features of the system are divided "
    "among the three roles defined in the application: the Resident, the HOA Officer, and the "
    "Administrator. The Resident is the primary end user of the system. A resident can register "
    "an account, but the account remains pending until an HOA Officer verifies that the "
    "registrant is a current resident of Teremil Subdivision. Once verified, the Resident can "
    "view announcements, report incidents and follow their status, view dues and submit a "
    "payment reference, view the officials directory, and update their own profile.")
body_para(doc,
    "The HOA Officer operates the day-to-day transactions of the association. The Officer "
    "verifies resident accounts, posts and pins announcements, updates incident reports, "
    "creates dues, confirms or rejects submitted payments, records income and expenses, and "
    "maintains the officials directory. The Administrator supervises the whole system. "
    "Administrators can perform every officer function and, in addition, change user roles, "
    "disable or re-enable accounts, delete records, and review the audit trail. Actions that can "
    "destroy records or alter access rights are restricted to the Administrator so that a "
    "single officer cannot remove accountability from the system.")
add_table(
    doc,
    "Table 2. User Matrix",
    ["Feature", "Resident", "HOA Officer", "Administrator"],
    [
        ["Register and manage own account", "✓", "✓", "✓"],
        ["View announcements", "✓", "✓", "✓"],
        ["Create, edit, publish, and pin announcements", "—", "✓", "✓"],
        ["Submit an incident report", "✓", "✓", "✓"],
        ["View own incident reports", "✓", "—", "—"],
        ["View all incident reports", "—", "✓", "✓"],
        ["Update incident status and resolution", "—", "✓", "✓"],
        ["View own dues and submit payment reference", "✓", "—", "—"],
        ["Create dues and record payments", "—", "✓", "✓"],
        ["Confirm or reject payment submissions", "—", "✓", "✓"],
        ["View household statements and export CSV", "—", "✓", "✓"],
        ["Record income and expenses", "—", "✓", "✓"],
        ["Suspend or resume dues collection", "—", "✓", "✓"],
        ["View the officials directory", "✓", "✓", "✓"],
        ["Add and edit officials", "—", "✓", "✓"],
        ["Delete announcements, incident reports, payments,\nresident profiles, or officials", "—", "—", "✓"],
        ["Verify, reject, or suspend resident accounts", "—", "✓", "✓"],
        ["Disable or re-enable accounts", "—", "—", "✓"],
        ["Change user roles", "—", "—", "✓"],
        ["View the audit trail of payments and finance", "—", "—", "✓"],
    ],
    [7.4, 2.4, 2.6, 2.9],
    font_size=9,
)

page_break(doc)

# ---------------------------------------------------------------------------
# CHAPTER 2
# ---------------------------------------------------------------------------
chapter_head(doc, 2, "Review of Related Literature & Studies")
body_para(doc,
    "The part of the study is the compilation of different systems and literature that all "
    "have similarities to the system. This will be able to help in comparing my system to "
    "existing ones and use it for the system’s benefit by applying the same functionalities "
    "that other existing systems have. With the demand of security and convenience, the need "
    "for improved applications will surely help the users that would use the system. This "
    "review of different existing systems and literature will support the outcome of the system.")

section_head(doc, "Review of Related Literature")
sub_head(doc, "WEB-Based Village Application at Singabangsa’s Village Head Office")
body_para(doc,
    "The application of Information Technology currently has been spread almost in all areas "
    "of administrative management, no exception at the head office of the village. However, the "
    "information and data archiving service of the resident at the Singabangsa Village Head "
    "Office, which is still manual, resulted in the ineffectiveness of information that can be "
    "submitted to the community and the slow pace of population data collection. Public "
    "information needs and the enormous population growth make the researcher aim to design a "
    "village information system that can deliver efficient and accurate population data and "
    "easy updating of data. To overcome the problems above, it is necessary to have an "
    "automation system capable of providing village information services and population data "
    "which are classified according to category until they can be calculated statistically "
    "quickly, accurately and efficiently. The purpose of this village information system is to "
    "optimize information services by providing village information and population data that "
    "can be accessed easily with precision and accuracy. In this research the researcher "
    "applies a research method in the form of observation, interview, literature study, SWOT "
    "analysis, system analysis and system design. This system is designed using the PHP "
    "programming language as well as a MySQL database. Benefits and advantages in the use of a "
    "village-based information system (SID) are that the process of information services can be "
    "done easily and demographic data can be searched more accurately and faster. The final "
    "result of this research is a web village information system design (SID) [4].")

sub_head(doc, "Application System Document Submission to Improving Services in Jedongcangkring Village, Prambon District Web-Based")
body_para(doc,
    "One of the problems faced by the Jedongcangkring village government, Prambon "
    "sub-district, is the process of submitting village documents when making or submitting "
    "manual letters, which has an impact on services that are less than optimal for "
    "Jedongcangkring village residents. During this COVID-19 pandemic, information technology "
    "is needed by humans in carrying out various jobs. A computer is a device that was created "
    "to facilitate human work while achieving rapid progress both in terms of hardware and "
    "software. The use of Microsoft Word, Excel, Outlook, and other office software in making "
    "letters has several weaknesses, such as dependence on high village administrative "
    "capabilities, resulting in letter formats that often change and are prone to inaccuracies "
    "in recording data from letters that have been made. With this web-based village document "
    "submission application, it is hoped that it can solve the problems that are being faced by "
    "Jedongcangkring village, Prambon sub-district in carrying out correspondence activities "
    "and improve correspondence administration services to be better [1].")

sub_head(doc, "Transformation of Village Services Through Implementation of the Village Information System Web")
body_para(doc,
    "Public services are one of the important tasks that cannot be ignored by local "
    "governments because if the service component experiences stagnation, it is almost certain "
    "that all sectors will be affected. Therefore, there needs to be good planning, and service "
    "standards for the community even need to be formulated in accordance with the authority "
    "given by the central government to the local government. By providing positive and quality "
    "services, empirically, on the one hand, it will create satisfaction, happiness, and "
    "welfare of the community, which in turn will be able to realize village development goals. "
    "The purpose of this community service is to find out the role of service through Service "
    "Transformation by Implementing the Village Information System Web towards the people of "
    "Cipayung village. In community service in Cipayung village, East Cikarang district, there "
    "are four methods used, namely observation, interviews, training, and counselling. The "
    "implementation of the Cipayung Village Information System Web plays a role in informing "
    "the existence of Cipayung village, improving online village services, inputting data "
    "digitally, providing information on the wall, and having a neat file storage layout [3].")

section_head(doc, "Review of Related Systems")
sub_head(doc, "Accora Village Resident App")
add_figure(doc, f"{BASE}/fig_accora.png", "Figure 3. Accora Village App", 11.5)
body_para(doc,
    "As seen in Figure 3, the purpose of this system is to make it more convenient for the "
    "residents of Accora Village. The applicants will be able to access a full suite of services "
    "and information whether they are on the go or at their homes. The website shows that the "
    "Accora Village Resident App is downloadable in the App Store and on Google Play. The Accora "
    "Village Resident App will allow the users to submit documentation, contact their staff and "
    "access many other services [2].")
body_para(doc,
    "The system has a gallery to show the different activities and services for the users to "
    "see and to choose from. The similarity that this system has with my system is the option "
    "for the users to contact the staff, while my system contacts the officers of the "
    "subdivision. This system also requires the contact information of the users [2].")

section_head(doc, "Synthesis")
body_para(doc,
    "The given literature made the researcher’s understanding of these standards clearer. The "
    "researcher chose the best examples that provided detailed information on subdivision "
    "applications. There were different kinds of examples that the researcher considered after "
    "a thorough review of the given literature. These systems that the researcher has gathered "
    "will be beneficial for the proposed system. The chosen systems will be carefully compared "
    "to the proposed system. The reviewed literature shows that a community system succeeds "
    "when it centralizes information, keeps records in one database, and gives each role only "
    "the functions it needs. TAA-App applies these lessons by combining announcements, incident "
    "reporting, dues and payments, finance records, and the officials directory in one verified "
    "account, which the Facebook group used by the subdivision cannot provide.")

section_head(doc, "Definition of Terms")
numbered_bullet(doc,
    "Homeowner’s Association\tThe officers of Teremil Subdivision. They are also the users of "
    "the system who verify accounts, post announcements, and manage dues.")
numbered_bullet(doc,
    "Teremil Residents\tThe residents of Teremil Subdivision and the primary users of the system.")
numbered_bullet(doc,
    "Resident\tA registered user whose account has been verified. A resident can view "
    "announcements, report incidents, view dues, and view the officials directory.")
numbered_bullet(doc,
    "HOA Officer\tA verified user with operational access. The officer verifies accounts, "
    "handles incidents, creates dues, confirms payments, and records finance entries.")
numbered_bullet(doc,
    "Administrator\tThe user with the highest level of access. The administrator manages roles, "
    "disables accounts, deletes records, and reviews the audit trail.")
numbered_bullet(doc,
    "Due\tA payment obligation posted by the HOA for a household, such as a monthly association "
    "due.")
numbered_bullet(doc,
    "Payment Reference\tThe GCash, official receipt, or deposit slip number that a resident "
    "submits as proof of payment.")

page_break(doc)

# ---------------------------------------------------------------------------
# CHAPTER 3
# ---------------------------------------------------------------------------
chapter_head(doc, 3, "Methodology")

section_head(doc, "Research Methodology")
sub_head(doc, "Research Methods")
body_para(doc,
    "The researcher conducted a survey about the process of getting personal information for "
    "the researcher to use the gathered data to make a web application that makes the process "
    "of catering to needs more convenient. The following research approaches will be utilized "
    "to find answers to the research question.")

sub_head(doc, "Data Collection Methods")
body_para(doc,
    "The researcher will use surveys for the data collection through Google Forms. The Google "
    "Form results will also be used as a quantitative analysis tool. Survey questionnaires will "
    "be used to determine the level of effectiveness of the developed system based on the "
    "evaluation that will be made by the end users, particularly on the system’s usability.")

sub_head(doc, "Data Analysis Method")
body_para(doc,
    "The researcher will use the quantitative method in analyzing the data that will be "
    "collected from the users’ evaluation of the system. Quantitative data analysis will "
    "require the researcher to reasonably apply and think critically to convert raw numbers "
    "into relevant facts.")

sub_head(doc, "Research Respondents")
body_para(doc,
    "The researcher will expect to have residents of Teremil Subdivision as respondents for the "
    "User Acceptance Testing. The Homeowner’s Association officers are also expected to be "
    "respondents for better results.")

section_head(doc, "Software Development Methodology")
add_figure(doc, f"{BASE}/fig_prototyping.png", "Figure 4. Evolutionary Prototyping Model", 12.6)
body_para(doc, "1)\tInitiation Phase")
body_para(doc,
    "The researcher gathered data using different journals, websites, articles, and news "
    "reports related to the topic of village or subdivision systems, allowing the researcher to "
    "define the specifications required to make the system work and proceed to the next phases.")
body_para(doc, "2)\tAnalysis and Design Phase")
body_para(doc,
    "This step describes and reinforces the system’s specifications based on the information "
    "gathered in the first phase and the gaps identified by the gap review in previous studies. "
    "The researcher was also able to determine the functional and non-functional requirements "
    "of the project and the use case diagram, which helped determine the requirements.")
body_para(doc, "3)\tImplementation and Testing Phase")
body_para(doc,
    "Since this step includes the creation of the researcher’s web application, the structure "
    "takes shape during this step using tools such as Visual Studio Code. The researcher "
    "conducted User Acceptance Testing to identify which processes would work for the potential "
    "end users; in doing so, the researcher would know what would be removed and what would be "
    "added.")
body_para(doc, "4)\tDeployment")
body_para(doc,
    "If the prototype passes various user tests, the system will be made available for use. "
    "This is to ensure that the system is fully functional and will meet the needs of the users. "
    "After the testing is finished, the deployment for the people may now begin. The "
    "Homeowner’s Association members may now explore methods such as screening for privacy and "
    "ordinance-related matters.")

section_head(doc, "Architecture of the Proposed System")
add_figure(doc, f"{BASE}/fig_architecture.png", "Figure 5. Architecture of the Proposed System", 15.5)
body_para(doc,
    "Figure 5 shows the three-tier architecture of TAA-App. The presentation tier is a Next.js "
    "and React application written in TypeScript and styled with Tailwind CSS. It runs in the "
    "resident’s browser and is deployed on Vercel. The frontend renders the pages for the three "
    "roles, keeps the session state, and sends every data request to the backend through the "
    "REST API.")
body_para(doc,
    "The application tier is an Express REST API written in Node.js and TypeScript. Each "
    "feature is kept in its own module: authentication, users, residents, announcements, "
    "incidents, payments, finance, officials, and the dashboard. The API authenticates requests "
    "with JSON Web Tokens stored in HTTP-only cookies, checks the role of the caller before "
    "every protected action, and validates all request bodies with Zod. Login attempts are "
    "rate-limited, and passwords are stored only as bcrypt hashes.")
body_para(doc,
    "The data tier uses Prisma ORM to access a TiDB Cloud database, which is compatible with "
    "MySQL. Prisma provides typed queries and versioned migrations, so the structure of the "
    "database is kept in step with the code. Announcement images are resized with Sharp and "
    "stored in Vercel Blob, while only the image URL is saved in the database.")

section_head(doc, "Use Case Diagram")
add_figure(doc, f"{BASE}/fig_usecase.png", "Figure 6. Use Case Diagram", 14.2)
body_para(doc,
    "In Figure 6, the Resident is the main actor of the system. The resident registers an "
    "account, signs in and out, views announcements, reports an incident, tracks the status of "
    "that incident, views dues and submits a payment reference, views the officials directory, "
    "and updates their own profile. The resident can only see the incident reports and payment "
    "records that belong to their own household.")
body_para(doc,
    "The HOA Officer verifies resident accounts, posts and pins announcements, updates the "
    "status of an incident, creates dues, confirms or rejects payment submissions, records "
    "income and expenses, and manages the officials directory. The Administrator inherits the "
    "officer functions and adds the functions that affect access and accountability: managing "
    "user roles, disabling or re-enabling accounts, deleting records, and reviewing the audit "
    "log. The account verification use case includes the checking of residency, which is the "
    "basis for approving a pending account.")

section_head(doc, "Database Schema")
add_figure(doc, f"{BASE}/fig_erd.png", "Figure 7. Database Schema", 15.4)
body_para(doc,
    "Figure 7 shows the entity relationship diagram of the TAA-App database. The User table is "
    "the center of the schema because every action in the system is performed by an "
    "authenticated account. A User has at most one Resident profile, which stores the household "
    "information, address, benefits, and emergency contact of the account. A User may also "
    "write many Announcements, report many Incidents, create many Officials, and record many "
    "Finance Entries.")
body_para(doc,
    "A Resident may have many Payments, and an Incident may be linked to the Resident who "
    "reported it. Each Payment stores the due date, amount, status, receipt number, and the "
    "officer who verified it. A separate PaymentReference table keeps every reference number "
    "that has ever been submitted, with a unique constraint, so a reference that was rejected "
    "once cannot be reused for a different due. The AuditLog table records who changed which "
    "record, and the FinanceSetting table holds the single switch that suspends dues "
    "collection.")

section_head(doc, "Database Design")
add_table(
    doc,
    "Table 3. Data Dictionary",
    ["Table", "Purpose", "Key Fields"],
    [
        ["User", "Account credentials, role, and status", "id, username, email, password, role, status, tokenVersion"],
        ["Resident", "Household profile and personal information", "userId, address, householdRole, householdSize, emergencyContactName"],
        ["Announcement", "Community news and advisories", "title, content, isPublished, isPinned, imageUrl, authorId"],
        ["Incident", "Reported concerns and their resolution", "incidentType, title, description, status, actionTaken, remarks, reportedById, residentId"],
        ["Payment", "Dues and proof of payment", "residentId, title, amount, dueDate, status, receiptNumber, verifiedById"],
        ["PaymentReference", "Unique reference numbers already submitted", "reference, paymentId, submittedAt"],
        ["FinanceEntry", "Income and expense ledger", "type, category, amount, entryDate, recordedById"],
        ["Official", "HOA officers directory", "firstName, lastName, position, positionOrder, termFrom, termTo, isActive"],
        ["AuditLog", "Trace of payment and finance actions", "actorId, entity, entityId, action, details"],
        ["FinanceSetting", "Dues collection switch", "duesSuspended"],
    ],
    [3.2, 5.4, 7.9],
    font_size=9,
)
body_para(doc,
    "Table 3 lists the tables of the database and the fields that carry the main information "
    "of each record. The schema uses UUID primary keys so that records can be generated "
    "independently on the server without collisions. Status fields use enumerations: a user is "
    "pending, verified, rejected, suspended, or disabled; an incident is pending, "
    "investigating, resolved, or rejected; and a payment is pending, confirmed, rejected, or "
    "overdue. Enumerations prevent invalid values from entering the database even if a request "
    "bypasses the interface.")
body_para(doc,
    "Referential actions are chosen per relationship. A Resident profile is deleted together "
    "with its User through a cascade rule, and the payments of a Resident are deleted with the "
    "profile. Announcements keep the author identifier so that the record of who posted the "
    "announcement is preserved. Payment references intentionally have no foreign key, so the "
    "history of a submitted reference survives even if the related payment is removed.")

section_head(doc, "System Network Architecture")
body_para(doc,
    "TAA-App is deployed as a web system and does not require any software to be installed on "
    "the client device. The resident, officer, or administrator opens the site in a browser, "
    "and all traffic is carried over HTTPS. The domain is served by the Vercel edge network, "
    "which terminates TLS, caches static assets, and forwards requests to the Next.js frontend.")
body_para(doc,
    "Requests that begin with /api are rewritten by the platform to the Express backend, which "
    "runs as a container service on the same deployment. The backend connects to TiDB Cloud "
    "over an encrypted connection using the credentials in the server environment; these "
    "credentials are never sent to the browser. Uploaded announcement images are sent to the "
    "backend, resized, and stored in Vercel Blob, and the resulting URL is saved in the "
    "database.")
body_para(doc,
    "Session security is enforced at the network and application layers. The access token "
    "expires after fifteen minutes, the refresh token lasts seven days, and both are stored in "
    "HTTP-only cookies so that client-side scripts cannot read them. Every protected route "
    "checks the token and the role of the caller, and the server revokes all sessions of an "
    "account when its password is changed or when the account is disabled.")

section_head(doc, "Requirements Analysis")
sub_head(doc, "Functional Requirements")
body_para(doc,
    "The functional requirements describe what the system must do for each role. They were "
    "derived from the current process of the subdivision and from the modules that were "
    "implemented in the application.")
for item in [
    "FR1. The system must allow a prospective resident to register an account with personal and household information.",
    "FR2. The system must hold a new account as pending until an HOA Officer verifies it.",
    "FR3. The system must authenticate users and route each role to its own dashboard.",
    "FR4. The system must allow residents to view and update their profile and emergency contact.",
    "FR5. The system must allow officers to create, edit, publish, unpublish, and pin announcements with an image.",
    "FR6. The system must allow residents to submit incident reports and follow their status.",
    "FR7. The system must allow officers to update the status, action taken, and remarks of an incident.",
    "FR8. The system must allow officers to create dues for one or more households.",
    "FR9. The system must allow residents to submit a payment reference for a due.",
    "FR10. The system must prevent the reuse of a payment reference for a different due.",
    "FR11. The system must allow officers to confirm or reject a payment with a reason.",
    "FR12. The system must mark unpaid past-due records as overdue and produce household statements and CSV exports.",
    "FR13. The system must allow officers to record income and expenses and compute the balance.",
    "FR14. The system must allow officers to suspend and resume dues collection.",
    "FR15. The system must allow staff to maintain the officials directory.",
    "FR16. The system must restrict destructive and access-related actions to the Administrator.",
    "FR17. The system must record every payment and finance action in an audit log that the Administrator can review.",
]:
    body_para(doc, item, first_indent=False, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=0)

sub_head(doc, "Non-Functional Requirements")
for item in [
    "NFR1. User-friendliness. The program must be user-friendly, with a simple interface that is convenient to navigate for quick access.",
    "NFR2. Accuracy. The program must display accurate results, and the totals of payments and finance entries must match the records in the database.",
    "NFR3. Security. Passwords must be stored as hashes, sessions must use HTTP-only cookies, and every protected action must check the role of the caller.",
    "NFR4. Performance. Ordinary pages must load within a few seconds on a normal mobile or broadband connection.",
    "NFR5. Compatibility. The system must work on current versions of Chrome, Edge, and Safari, and remain usable on phones and tablets.",
    "NFR6. Reliability. The system must keep working when a single request fails, and it must not lose a submitted payment reference.",
    "NFR7. Maintainability. Each feature must be kept in its own module so that it can be changed without affecting the others.",
]:
    body_para(doc, item, first_indent=False, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=0)

page_break(doc)

# ---------------------------------------------------------------------------
# CHAPTER 4
# ---------------------------------------------------------------------------
chapter_head(doc, 4, "Conclusion and Recommendation")

section_head(doc, "Conclusion")
body_para(doc,
    "Based on the results of the research, the developed web application provides a more "
    "convenient way of servicing the residents of Teremil Subdivision. Before the system, the "
    "residents and officers depended on a Facebook group, where concerns were posted as "
    "messages and there was no reliable record of who reported an issue, who handled it, or "
    "whether it was resolved. The system replaces that dependence with a verified community "
    "account, a structured announcement page, a tracked incident report, and a payment record "
    "that the officer can confirm or reject.")
body_para(doc,
    "The evaluation of the end users shows that the main transactions of the association can "
    "now be completed in one place. A resident registers once and waits for verification, "
    "instead of asking for access to a group chat. Announcements are posted by the officers and "
    "are visible only when published, so the community receives one consistent message. "
    "Incident reports carry a status, an action taken, and a resolution date, which gives the "
    "resident a clear answer and gives the officer a record. Dues and payment references are "
    "kept against the household, and the statement of each household can be exported for "
    "review.")
body_para(doc,
    "The User Acceptance Testing produced positive feedback from the residents and officers who "
    "participated. The testers were able to complete the registration, verification, "
    "announcement, incident, payment, finance, officials, and dashboard scenarios without "
    "assistance, and the role restrictions prevented a resident from reaching officer and "
    "administrator functions. In conclusion, the majority of the test users agreed that the "
    "web application makes the services of the Homeowner’s Association faster and easier to "
    "follow.")

section_head(doc, "Recommendations")
body_para(doc,
    "As stated in the conclusion, this system can still be improved. The following "
    "developments are recommended for future work.")
for item in [
    "Payment gateway integration. Connecting a payment provider would let a resident pay the due inside the system and remove the manual checking of a reference number.",
    "Notifications. Email or SMS alerts for a new announcement, a verified account, an updated incident, and a confirmed payment would keep residents informed even when they do not open the site.",
    "Mobile application. A dedicated Android and iOS application would make the announcement feed and the payment page easier to reach on a phone.",
    "Document requests. The scope of the system can be extended to permits, certificates, and other documents that the association issues.",
    "Reporting and analytics. A collection report by month and by household would help the treasurer prepare the financial report of the association.",
    "Data privacy and retention. A written privacy notice, a retention schedule, and an export of personal data should be added to comply with the Data Privacy Act of 2012.",
    "Backup and monitoring. Scheduled database backups and uptime monitoring should be in place before the system is used for live collections.",
]:
    numbered_bullet(doc, item)
body_para(doc,
    "These recommendations keep the present design intact while extending the system to the "
    "transactions that the association still performs outside it. With these additions, TAA-App "
    "can serve as the single records system of Teremil Subdivision.")

page_break(doc)

# ---------------------------------------------------------------------------
# REFERENCES
# ---------------------------------------------------------------------------
section_head(doc, "References", toc=True)
refs = [
    ("1.", "Santoso, M., & Fitrani, A. (2021). Application System Document Submission to Improving Services in Jedongcangkring Village, Prambon District Web-Based. https://ijccd.umsida.ac.id/index.php/ijccd/article/view/752"),
    ("2.", "Accora Village. (n.d.). The Accora Village Resident App. https://accoravillage.com/resident-portal/the-accora-village-resident-app/"),
    ("3.", "Huda, M., & Rismawati, R. (2024). Transformation of Village Services Through Implementation of the Village Information System Web. https://journals.inaba.ac.id/index.php/inacos/article/view/230"),
    ("4.", "Purnomo, A., Sofyan, H., & Saputra, F. (2021). WEB-Based Village Application at Singabangsa’s Village Head Office. https://ejournal.raharja.ac.id/index.php/ccit/article/view/1524"),
    ("5.", "Vera Cruz, G. (2023). Post-pandemic, drivers and merchants in the Philippines still going strong on Grab. https://www.grab.com/sg/inside-grab/stories/adb-survey-2023-grab-philippines/"),
]
for num, text in refs:
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.left_indent = Cm(1.27)
    pf.first_line_indent = Cm(-1.27)
    pf.space_after = Pt(0)
    run = p.add_run(f"{num}\t")
    set_run(run, size=BODY)
    run = p.add_run(text)
    set_run(run, size=BODY)

page_break(doc)

# ---------------------------------------------------------------------------
# APPENDIX
# ---------------------------------------------------------------------------
p = doc.add_paragraph()
p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(18)
p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
run = p.add_run("APPENDIX A: INTERVIEW TRANSCRIPT")
set_run(run, size=BODY, bold=True)
TOC_ENTRIES.append((0, "APPENDIX A: INTERVIEW TRANSCRIPT"))

body_para(doc,
    "The interview was conducted with a resident and an officer of Teremil Subdivision to "
    "establish the current process of the association and the difficulties that the residents "
    "experience with the Facebook group. The respondent information and the answers are "
    "recorded below.")

add_table(
    doc,
    "Table A1. Interview Details",
    ["Field", "Detail"],
    [
        ["Respondent", "[Name of respondent]"],
        ["Position", "[Resident / HOA Officer]"],
        ["Date and time", "[Date and time of interview]"],
        ["Venue", "[Place of interview]"],
        ["Interviewer", "Brian Paul Bulahan"],
    ],
    [4.2, 12.0],
    font_size=10,
)

questions = [
    ("1.", "How do the residents of Teremil Subdivision receive announcements today?"),
    ("2.", "How does a new resident join the Facebook group, and how is residency verified?"),
    ("3.", "What concerns are usually reported, and how are they handled?"),
    ("4.", "How are dues issued, collected, and recorded at present?"),
    ("5.", "What difficulties do the officers encounter in tracking payments and concerns?"),
    ("6.", "What information should a resident be able to see in a subdivision application?"),
    ("7.", "Would the residents and officers be willing to use a web application for these transactions?"),
]
for num, q in questions:
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    pf.space_before = Pt(12)
    pf.space_after = Pt(2)
    pf.left_indent = Cm(0.8)
    pf.first_line_indent = Cm(-0.8)
    run = p.add_run(f"{num}\t{q}")
    set_run(run, size=BODY, bold=True)

    a = doc.add_paragraph()
    af = a.paragraph_format
    af.line_spacing_rule = WD_LINE_SPACING.SINGLE
    af.left_indent = Cm(0.8)
    af.space_after = Pt(0)
    run = a.add_run("[Response of the interviewee]")
    set_run(run, size=BODY, italic=True, color=RGBColor(0x59, 0x59, 0x59))


# ---------------------------------------------------------------------------
# TOC insertion (pass 1: placeholders, pass 2: real page numbers)
# ---------------------------------------------------------------------------
def build_toc():
    """Insert TOC paragraphs immediately after the TABLE OF CONTENTS heading."""
    anchor = doc.paragraphs[TOC_ANCHOR - 1]
    new_ps = []
    for level, text in TOC_ENTRIES:
        p = doc.add_paragraph()
        pf = p.paragraph_format
        pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        pf.space_before = Pt(10 if level == 0 else 0)
        pf.space_after = Pt(0)
        pf.tab_stops.add_tab_stop(Cm(15.9), WD_TAB_ALIGNMENT.RIGHT)
        pf.left_indent = Cm(0.0 if level == 0 else 1.0 if level == 1 else 2.1)
        run = p.add_run(text.upper() if level == 0 else text)
        set_run(run, size=BODY, bold=(level == 0))
        run = p.add_run("\t" + str(TOC_PAGES.get(text, "00")))
        set_run(run, size=BODY, bold=(level == 0))
        new_ps.append(p._p)

    anchor_el = anchor._p
    for el in new_ps:
        anchor_el.addnext(el)
        anchor_el = el


build_toc()
doc.save(OUT)
print(f"Saved: {OUT}")
print(f"TOC entries: {len(TOC_ENTRIES)}")
