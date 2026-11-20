#!/usr/bin/env python3
"""Build the paper, convert to PDF, measure real TOC page numbers, rebuild, verify."""

import json
import os
import re
import subprocess
import sys
import pprint

BASE = "/Users/venice/taa-app-fullstack/docs/capstone"
DOCX = f"{BASE}/TAA-App_Capstone_Paper.docx"
PDF = f"{BASE}/TAA-App_Capstone_Paper.pdf"
SCRIPT = f"{BASE}/build_capstone.py"


def run(cmd):
    subprocess.run(cmd, shell=True, check=True, cwd=BASE)


def convert():
    if os.path.exists(PDF):
        os.remove(PDF)
    run(f"/opt/homebrew/bin/soffice --headless --convert-to pdf {DOCX} >/dev/null 2>&1")


def measure():
    import pymupdf

    doc = pymupdf.open(PDF)
    pages = [" ".join(p.get_text("text").split()) for p in doc]
    start = next(i for i, t in enumerate(pages) if t.startswith("Chapter 1"))

    from docx import Document

    d = Document(DOCX)
    entries, inside = [], False
    for p in d.paragraphs:
        t = p.text.strip()
        if t == "TABLE OF CONTENTS":
            inside = True
            continue
        if inside:
            if not t:
                break
            if len(p.runs) < 2:
                break
            title = "".join(r.text for r in p.runs[:-1]).strip()
            page = p.runs[-1].text.strip().lstrip("\t")
            if not page.isdigit():
                break
            entries.append(title)

    assert len(entries) > 40, f"TOC parse failed: {len(entries)} entries"
    mapping = {}
    for e in entries:
        key = " ".join(e.split())
        mapping[e] = next((i - start + 1 for i in range(start, len(pages)) if key in pages[i]), None)
    return doc.page_count, mapping


def patch(mapping):
    body = "TOC_PAGES = " + pprint.pformat(mapping, indent=4, width=96, sort_dicts=False) + "\n"
    s = open(SCRIPT).read()
    s = re.sub(r"TOC_PAGES = \{.*?\n\n", body + "\n", s, count=1, flags=re.S)
    open(SCRIPT, "w").write(s)


def main():
    run(f"/private/var/folders/1r/fd2m0cvn34q7sp2l3m6ktd600000gp/T/uatvenv/bin/python {SCRIPT}")
    convert()
    n1, m1 = measure()
    assert None not in m1.values(), f"unresolved: {[k for k, v in m1.items() if v is None]}"
    patch(m1)
    run(f"/private/var/folders/1r/fd2m0cvn34q7sp2l3m6ktd600000gp/T/uatvenv/bin/python {SCRIPT}")
    convert()
    n2, m2 = measure()
    print("pages:", n1, "->", n2)
    bad = {k: (m1[k], m2.get(k)) for k in m1 if m1[k] != m2.get(k)}
    print("drift:", bad if bad else "none")
    if bad:
        patch(m2)
        run(f"/private/var/folders/1r/fd2m0cvn34q7sp2l3m6ktd600000gp/T/uatvenv/bin/python {SCRIPT}")
        convert()
        n3, m3 = measure()
        print("after third pass, pages:", n3, "drift:", {k: (m2[k], m3.get(k)) for k in m2 if m2[k] != m3.get(k)} or "none")
    json.dump(m2, open(f"{BASE}/toc_pages.json", "w"), indent=1, ensure_ascii=False)
    print("done")


if __name__ == "__main__":
    main()
