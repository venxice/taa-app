#!/usr/bin/env python3
"""Redraw the two process-flow figures for the TAA-App capstone."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Ellipse
from matplotlib.lines import Line2D

from figures import box, arrow, NAVY, GRAY, LIGHT, BORDER


def terminator(ax, x, y, text, w=15, h=4.6, size=7.2):
    ax.add_patch(Ellipse((x, y), w, h, facecolor="#FFFFFF", edgecolor=GRAY, lw=1.0, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color="#1A1A1A", zorder=4)


def decision(ax, x, y, text, w=30, h=10, size=6.8):
    ax.add_patch(plt.Polygon([[x - w / 2, y], [x, y + h / 2], [x + w / 2, y], [x, y - h / 2]],
                             closed=True, facecolor="#FFFFFF", edgecolor=GRAY, lw=1.0, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color="#1A1A1A", zorder=4)


def step(ax, x, y, text, w=26, h=7.0, size=6.8, bold=False):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="square,pad=0", facecolor="#FFFFFF",
                                edgecolor=GRAY, lw=1.0, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color="#1A1A1A",
            fontweight="bold" if bold else "normal", zorder=4)


def elbow(ax, pts, label=None, at=0.5, lx=None, ly=None, size=6.6):
    for a, b in zip(pts, pts[1:-1]):
        ax.add_line(Line2D([a[0], b[0]], [a[1], b[1]], lw=1.0, color=GRAY, zorder=2))
    arrow(ax, pts[-2], pts[-1], lw=1.0)
    if label:
        i = 0
        ax.text(lx if lx is not None else pts[i][0],
                ly if ly is not None else pts[i][1],
                label, ha="center", va="center", fontsize=size, color=GRAY,
                style="italic", zorder=5,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))


# ------------------------------------------------------------------ figure 1
def current_flow(path):
    fig, ax = plt.subplots(figsize=(4.4, 7.4))
    ax.set_xlim(0, 78); ax.set_ylim(0, 106); ax.axis("off")

    cx, rx = 32, 64        # main column, right-hand column
    terminator(ax, cx, 101, "Start")
    step(ax, cx, 90, "Request Facebook\ngroup access and\ngroup chat", w=30, h=9)
    decision(ax, cx, 74, "Is the person a\nverified member of\nthe residence?", w=32, h=13)
    step(ax, rx, 74, "Complete all the\nrequested information", w=26, h=9)
    step(ax, cx, 58, "State issue or\nproblem", w=30, h=9)
    step(ax, cx, 45, "Have your request\naddressed", w=30, h=9)
    decision(ax, cx, 30, "Is the person\nsatisfied?", w=30, h=12)
    terminator(ax, cx, 15, "End")

    arrow(ax, (cx, 98.7), (cx, 94.5))
    arrow(ax, (cx, 85.5), (cx, 80.5))
    arrow(ax, (cx, 67.5), (cx, 62.5), "Yes", lx=cx + 5, ly=65)
    arrow(ax, (48, 74), (rx - 13, 74), "No", lx=46.2, ly=76.4)
    elbow(ax, [(rx, 78.5), (rx, 88.5), (cx + 15, 88.5)], "No", lx=rx - 4.5, ly=82.5)
    arrow(ax, (cx, 53.5), (cx, 49.5))
    arrow(ax, (cx, 40.5), (cx, 36))
    elbow(ax, [(47, 30), (rx, 30), (rx, 45), (47, 45)], "No", lx=56, ly=32.4)
    arrow(ax, (cx, 24), (cx, 17.4), "Yes", lx=cx + 5, ly=21)

    plt.tight_layout(pad=0.2)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ figure 2
def proposed_flow(path):
    fig, ax = plt.subplots(figsize=(7.6, 5.6))
    ax.set_xlim(0, 100); ax.set_ylim(-8, 88); ax.axis("off")

    lanes = [(20.5, "ADMINISTRATOR", [
        "Manage officer and\nresident accounts",
        "Change roles, disable or\nre-enable accounts",
        "Review escalated\nconcerns",
        "Review the audit log",
    ]), (50.0, "HOA OFFICER", [
        "Verify resident accounts\nand post announcements",
        "Create dues for\nthe households",
        "Confirm payments; record\nincome and expenses",
        "Update incident status\nand resolution",
    ]), (79.5, "RESIDENT", [
        "Register and wait for\naccount verification",
        "View announcements\nand the officials directory",
        "Report an incident and\ntrack its status",
        "View dues and submit a\npayment reference",
    ])]

    # lane panels
    for x, title, _ in lanes:
        ax.add_patch(FancyBboxPatch((x - 13.5, 3.5), 27, 55,
                                    boxstyle="square,pad=0", facecolor="#FFFFFF",
                                    edgecolor=BORDER, lw=0.9, linestyle=(0, (4, 3)), zorder=1))
        ax.add_patch(FancyBboxPatch((x - 13.5, 52.5), 27, 6,
                                    boxstyle="square,pad=0", facecolor=LIGHT,
                                    edgecolor=BORDER, lw=0.9, zorder=2))
        ax.text(x, 55.5, title, ha="center", va="center", fontsize=7.8,
                fontweight="bold", color=NAVY, zorder=3)

    terminator(ax, 50, 84, "Start", w=14, h=4.4, size=8.0)
    step(ax, 50, 75.5, "Sign in or register", w=26, h=5.4, size=7.6)
    decision(ax, 50, 66.5, "Which dashboard\nis opened?", w=24, h=8, size=7.2)

    arrow(ax, (50, 81.8), (50, 78.2))
    arrow(ax, (50, 72.8), (50, 70.5))

    arrow(ax, (50, 62.5), (50, 60.2))
    ax.add_line(Line2D([20.5, 79.5], [60.2, 60.2], lw=1.0, color=GRAY, zorder=2))
    for x, _, _ in lanes:
        arrow(ax, (x, 60.2), (x, 58.7))
        arrow(ax, (x, 52.5), (x, 49.7))

    for x, _, items in lanes:
        ys = [45.5, 34.5, 23.5, 12.5]
        for i, (y, text) in enumerate(zip(ys, items)):
            step(ax, x, y, text, w=24.5, h=8.2, size=7.3)
            if i:
                arrow(ax, (x, ys[i - 1] - 4.1), (x, y + 4.1))

    # bus to End
    ax.add_line(Line2D([20.5, 79.5], [5.6, 5.6], lw=1.0, color=GRAY, zorder=2))
    for x, _, _ in lanes:
        arrow(ax, (x, 8.4), (x, 5.6))
    arrow(ax, (50, 5.6), (50, -1.4))
    terminator(ax, 50, -3.5, "End", w=14, h=4.0, size=8.0)

    plt.tight_layout(pad=0.2)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# --------------------------------------------------------------- prototyping
def prototyping(path):
    fig, ax = plt.subplots(figsize=(6.4, 3.9))
    ax.set_xlim(-9, 101); ax.set_ylim(0, 74); ax.axis("off")

    colors = ["#7B3B52", "#6E4A8C", "#3355A8", "#2FA6A0", "#4FB84F", "#E8DE6A"]
    labels = ["Initiation", "Analysis", "Design",
              "Implementation", "Test", "Deployment"]
    pos = [(17, 55), (50, 55), (83, 55), (83, 24), (50, 24), (17, 24)]

    for (x, y), label, color in zip(pos, labels, colors):
        ax.add_patch(FancyBboxPatch((x - 13, y - 7), 26, 14,
                                    boxstyle="round,pad=0,rounding_size=2.2",
                                    facecolor=color, edgecolor="none", zorder=3))
        ax.text(x, y, label, ha="center", va="center", fontsize=8.4,
                color="white", fontweight="bold", zorder=4)

    arrow(ax, (30, 55), (36.4, 55), color="#3A3A3A", lw=1.4)
    arrow(ax, (63, 55), (69.4, 55), color="#3A3A3A", lw=1.4)
    arrow(ax, (83, 47.6), (83, 31.4), color="#3A3A3A", lw=1.4)
    arrow(ax, (69.4, 24), (63.4, 24), color="#3A3A3A", lw=1.4)
    arrow(ax, (36.4, 24), (30.4, 24), color="#3A3A3A", lw=1.4)

    # iteration back to the initiation stage
    ax.add_line(Line2D([4, -1], [24, 24], lw=1.2, color="#3A3A3A", linestyle=(0, (4, 3)), zorder=2))
    ax.add_line(Line2D([-1, -1], [24, 55], lw=1.2, color="#3A3A3A", linestyle=(0, (4, 3)), zorder=2))
    arrow(ax, (-1, 55), (3.9, 55), color="#3A3A3A", lw=1.2, ls=(0, (4, 3)))
    ax.text(-5.2, 39.5, "refine the prototype", rotation=90, ha="center", va="center",
            fontsize=6.6, color=GRAY, style="italic")

    plt.tight_layout(pad=0.2)
    fig.savefig(path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    base = "/Users/venice/taa-app-fullstack/docs/capstone"
    current_flow(f"{base}/fig_current_flow.png")
    proposed_flow(f"{base}/fig_proposed_flow.png")
    prototyping(f"{base}/fig_prototyping.png")
    print("flows written")
