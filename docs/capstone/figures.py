#!/usr/bin/env python3
"""Draw the TAA-App capstone diagrams (architecture, use case, ERD)."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse, Rectangle, Circle, Polygon
from matplotlib.lines import Line2D

NAVY = "#1F3864"
BLUE = "#2E5C9A"
GRAY = "#595959"
LIGHT = "#EAF0F9"
BORDER = "#8EA9C9"


def box(ax, x, y, w, h, title, lines=(), fc="#FFFFFF", ec=BORDER, lw=1.0,
        title_size=8.5, body_size=6.8, align="center"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6,rounding_size=1.2",
                                linewidth=lw, edgecolor=ec, facecolor=fc, zorder=2))
    cy = y + h - 3.4
    ax.text(x + w / 2, cy, title, ha="center", va="center", fontsize=title_size,
            fontweight="bold", color=NAVY, zorder=3)
    for i, line in enumerate(lines):
        ax.text(x + w / 2, cy - 4.6 - i * 3.5, line, ha="center", va="center",
                fontsize=body_size, color=GRAY, zorder=3)


def arrow(ax, p1, p2, label=None, style="-|>", ls="-", color=GRAY, lw=1.1,
          lx=None, ly=None, size=6.8, rad=0.0):
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=9,
                                 linewidth=lw, color=color, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", zorder=2,
                                 shrinkA=1, shrinkB=1))
    if label:
        mx = lx if lx is not None else (p1[0] + p2[0]) / 2
        my = ly if ly is not None else (p1[1] + p2[1]) / 2
        ax.text(mx, my, label, ha="center", va="center", fontsize=size,
                color=GRAY, style="italic", zorder=4,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))


# ---------------------------------------------------------------- architecture
def architecture(path):
    fig, ax = plt.subplots(figsize=(6.6, 3.7))
    ax.set_xlim(0, 100); ax.set_ylim(0, 56); ax.axis("off")

    # clients
    ax.add_patch(FancyBboxPatch((1.5, 6), 18, 44, boxstyle="round,pad=0.5,rounding_size=1.5",
                                fill=False, edgecolor=BORDER, linestyle=(0, (3, 2)), lw=0.9))
    ax.text(10.5, 47, "USERS", ha="center", fontsize=7, color=GRAY, fontweight="bold")
    box(ax, 3, 34, 15, 9, "Resident", ("desktop / mobile",))
    box(ax, 3, 22, 15, 9, "HOA Officer", ("desktop / mobile",))
    box(ax, 3, 10, 15, 9, "Administrator", ("desktop / mobile",))

    # frontend
    box(ax, 25, 8, 21, 42, "Next.js 15 Frontend",
        ("React + TypeScript", "Tailwind CSS", "", "Role-based navigation",
         "Announcement feed", "Dues and payments", "Dashboards"),
        fc=LIGHT, title_size=8.5)

    # api
    box(ax, 51, 8, 21, 42, "Express REST API",
        ("Node.js + TypeScript", "JWT authentication", "Role authorization",
         "Zod validation", "", "auth  ·  users", "residents  ·  announcements",
         "incidents  ·  payments", "finance  ·  officials"), fc=LIGHT)

    # data
    box(ax, 77, 30, 20, 20, "Prisma ORM", ("typed data access", "migrations"), fc="#FFFFFF")
    box(ax, 77, 6, 20, 20, "TiDB Cloud", ("MySQL-compatible", "managed database"), fc="#FFFFFF")

    arrow(ax, (19, 38.5), (25, 38.5), "HTTPS", ly=41)
    arrow(ax, (46, 32), (51, 32), "REST /api", ly=34.2)
    arrow(ax, (72, 40), (77, 40), "queries", ly=42.2)
    arrow(ax, (87, 30), (87, 26.2), color=GRAY)

    # blob
    ax.add_patch(FancyBboxPatch((51, 0.5), 21, 5.6, boxstyle="round,pad=0.4,rounding_size=1",
                                facecolor="#FFFFFF", edgecolor=BORDER, lw=0.9))
    ax.text(61.5, 3.3, "Vercel Blob  ·  announcement images", ha="center",
            va="center", fontsize=6.6, color=GRAY)
    arrow(ax, (61.5, 8), (61.5, 6.2), style="<|-|>", lw=0.9)

    plt.tight_layout(pad=0.2)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------- use case
def actor(ax, x, y, label, size=1.0):
    s = size
    ax.add_patch(Circle((x, y + 3.2 * s), 1.5 * s, fill=False, lw=1.1, ec="#1A1A1A"))
    ax.add_line(Line2D([x, x], [y + 1.7 * s, y - 1.6 * s], lw=1.1, color="#1A1A1A"))
    ax.add_line(Line2D([x - 2.4 * s, x + 2.4 * s], [y + 0.7 * s, y + 0.7 * s], lw=1.1, color="#1A1A1A"))
    ax.add_line(Line2D([x, x - 2.0 * s], [y - 1.6 * s, y - 4.4 * s], lw=1.1, color="#1A1A1A"))
    ax.add_line(Line2D([x, x + 2.0 * s], [y - 1.6 * s, y - 4.4 * s], lw=1.1, color="#1A1A1A"))
    ax.text(x, y - 7.0 * s, label, ha="center", va="top", fontsize=7.2, color="#1A1A1A")


def usecase(ax, x, y, text, w=25, h=7.4, size=6.6):
    ax.add_patch(Ellipse((x, y), w, h, facecolor="#FFFFFF", edgecolor=BORDER, lw=1.0, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color="#1A1A1A", zorder=4)


def use_case(path):
    fig, ax = plt.subplots(figsize=(6.6, 7.7))
    ax.set_xlim(0, 100); ax.set_ylim(9, 106); ax.axis("off")

    ax.add_patch(Rectangle((26, 13.5), 62, 90.5, fill=False, lw=1.1, ec="#1A1A1A"))
    ax.text(57, 100.5, "TAA-App: Subdivision Assistance System", ha="center",
            va="center", fontsize=7.6, fontweight="bold", color=NAVY)

    left = [
        (92, "Register an account"),
        (83, "Sign in / sign out"),
        (74, "View announcements"),
        (65, "Report an incident"),
        (56, "Track incident status"),
        (47, "View dues and submit\npayment reference"),
        (37, "View HOA officials"),
        (28, "Update profile"),
    ]
    right = [
        (92, "Verify resident accounts"),
        (83, "Post and pin announcements"),
        (74, "Update incident status"),
        (65, "Create dues"),
        (56, "Confirm or reject payments"),
        (47, "Record income and expenses"),
        (38, "Manage officials"),
        (29, "Manage roles and accounts"),
        (20, "Delete records, view audit log"),
    ]

    for y, text in left:
        usecase(ax, 43, y, text)
    for y, text in right:
        usecase(ax, 72, y, text)

    actor(ax, 8, 66, "Resident", 1.05)
    actor(ax, 95, 66, "HOA Officer", 1.0)
    actor(ax, 95, 26, "Administrator", 1.0)

    for y, _ in left:
        arrow(ax, (11.5, 64), (30.8, y), style="-", lw=0.75, color="#7A7A7A")
    for y, _ in right[:7]:
        arrow(ax, (91.5, 68), (84.5, y), style="-", lw=0.75, color="#7A7A7A")
    for y, _ in right[7:]:
        arrow(ax, (91.5, 24), (84.5, y), style="-", lw=0.75, color="#7A7A7A")

    plt.tight_layout(pad=0.2)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------------ ERD
def entity(ax, x, y, name, fields, w=28, color=LIGHT):
    h = 7.2 + 3.4 * len(fields)
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.2",
                                facecolor="#FFFFFF", edgecolor=BORDER, lw=1.0, zorder=3))
    ax.add_patch(FancyBboxPatch((x, y + h - 6.2), w, 6.2, boxstyle="round,pad=0.4,rounding_size=1.2",
                                facecolor=color, edgecolor=BORDER, lw=1.0, zorder=4))
    ax.text(x + w / 2, y + h - 3.1, name, ha="center", va="center", fontsize=7.4,
            fontweight="bold", color=NAVY, zorder=5)
    for i, f in enumerate(fields):
        ax.text(x + 2.2, y + h - 9.0 - i * 3.4, f, ha="left", va="center",
                fontsize=6.3, color="#1A1A1A", zorder=5)
    return (x, y, w, h)


def erd(path):
    fig, ax = plt.subplots(figsize=(6.6, 6.9))
    ax.set_xlim(0, 100); ax.set_ylim(0, 116); ax.axis("off")

    ent = {}
    ent["USER"] = entity(ax, 36, 44, "USER", [
        "id  (PK)", "username  (unique)", "email  (unique)",
        "password  (bcrypt)", "role  ·  status", "tokenVersion",
    ])
    ent["RESIDENT"] = entity(ax, 36, 88, "RESIDENT", [
        "id  (PK)", "userId  (FK, unique)", "address  ·  householdSize",
        "householdRole", "emergencyContact",
    ])
    ent["ANNOUNCEMENT"] = entity(ax, 1, 80, "ANNOUNCEMENT", [
        "id  (PK)", "title  ·  content", "isPublished  ·  isPinned",
        "imageUrl", "authorId  (FK)",
    ])
    ent["INCIDENT"] = entity(ax, 71, 66, "INCIDENT", [
        "id  (PK)", "title  ·  status", "dateIncident", "actionTaken  ·  remarks",
        "reportedById  (FK)", "residentId  (FK)",
    ])
    ent["PAYMENT"] = entity(ax, 1, 12, "PAYMENT", [
        "id  (PK)", "residentId  (FK)", "amount  ·  dueDate", "status",
        "receiptNumber  (unique)", "verifiedById  (FK)",
    ])
    ent["OFFICIAL"] = entity(ax, 71, 12, "OFFICIAL", [
        "id  (PK)", "firstName  ·  lastName", "position  ·  positionOrder",
        "termFrom  ·  termTo", "isActive", "createdById  (FK)",
    ])
    ent["FINANCEENTRY"] = entity(ax, 36, 6, "FINANCEENTRY", [
        "id  (PK)", "type  ·  category", "amount  ·  entryDate",
        "recordedById  (FK)",
    ])

    def center(name):
        x, y, w, h = ent[name]
        return (x + w / 2, y + h / 2)

    def edge(name, tx, ty):
        """Point where the segment from the box centre to (tx, ty) leaves the box."""
        x, y, w, h = ent[name]
        cx, cy = x + w / 2, y + h / 2
        dx, dy = tx - cx, ty - cy
        sx = (w / 2) / abs(dx) if dx else float("inf")
        sy = (h / 2) / abs(dy) if dy else float("inf")
        s = min(sx, sy)
        return (cx + dx * s, cy + dy * s), (dx, dy)

    def link(a, b, la, lb, rad=0.0, oa=4.2, ob=4.2):
        ca, cb = center(a), center(b)
        pa, (dxa, dya) = edge(a, *cb)
        pb, (dxb, dyb) = edge(b, *ca)
        arrow(ax, pa, pb, style="-", lw=0.95, color="#5E7A9B", rad=rad)
        # cardinality labels sit just outside each box edge
        for p, (dx, dy), lab, off in ((pa, (dxa, dya), la, oa), (pb, (dxb, dyb), lb, ob)):
            n = (dx ** 2 + dy ** 2) ** 0.5
            lx = p[0] + (dx / n) * off
            ly = p[1] + (dy / n) * off
            ax.text(lx, ly, lab, ha="center", va="center", fontsize=7,
                    color=NAVY, fontweight="bold", zorder=6,
                    bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none"))

    link("USER", "RESIDENT", "1", "1")
    link("USER", "ANNOUNCEMENT", "1", "N")
    link("USER", "INCIDENT", "1", "N")
    link("RESIDENT", "INCIDENT", "1", "N")
    link("USER", "FINANCEENTRY", "1", "N")

    # RESIDENT 1..N PAYMENT, routed to the left of the USER box
    pts = [(36, 96), (32.5, 96), (32.5, 35), (29.4, 35)]
    for a, b in zip(pts, pts[1:-1]):
        ax.add_line(Line2D([a[0], b[0]], [a[1], b[1]], lw=0.95, color="#5E7A9B", zorder=2))
    arrow(ax, pts[-2], pts[-1], style="-", lw=0.95, color="#5E7A9B")
    for x, y, lab in ((34.6, 93.0, "1"), (30.7, 31.5, "N")):
        ax.text(x, y, lab, ha="center", va="center", fontsize=7, color=NAVY,
                fontweight="bold", zorder=6,
                bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none"))

    # explicit anchors keep the two cardinality labels apart on the short diagonal
    pa, pb = (64, 51), (85, 39.6)
    arrow(ax, pa, pb, style="-", lw=0.95, color="#5E7A9B")
    n = ((pb[0] - pa[0]) ** 2 + (pb[1] - pa[1]) ** 2) ** 0.5
    ux, uy = (pb[0] - pa[0]) / n, (pb[1] - pa[1]) / n
    ax.text(pa[0] + ux * 4.5, pa[1] + uy * 4.5, "1", ha="center", va="center", fontsize=7,
            color=NAVY, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none"))
    ax.text(pb[0] - ux * 4.5, pb[1] - uy * 4.5, "N", ha="center", va="center", fontsize=7,
            color=NAVY, fontweight="bold", zorder=6,
            bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none"))

    ax.text(50, 1.5, "Additional tables: PaymentReference, AuditLog, FinanceSetting",
            ha="center", fontsize=6.4, color=GRAY, style="italic")

    plt.tight_layout(pad=0.2)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    base = "/Users/venice/taa-app-fullstack/docs/capstone"
    import os
    os.makedirs(base, exist_ok=True)
    architecture(f"{base}/fig_architecture.png")
    use_case(f"{base}/fig_usecase.png")
    erd(f"{base}/fig_erd.png")
    print("figures written")
