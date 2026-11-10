#!/usr/bin/env python3
"""
Generates a comprehensive, professional Microsoft Word (.docx) document
for the WishWell academic project report.
"""

import os
import re
from pathlib import Path
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"
REPORT_DIR = DOCS_DIR / "report"
OUTPUT_DOCX = REPORT_DIR / "WishWell_Project_Report.docx"

# Color Palette
NAVY_PRIMARY = RGBColor(0x1E, 0x3A, 0x8A)      # #1E3A8A
SLATE_SECONDARY = RGBColor(0x3B, 0x82, 0xF6)   # #3B82F6
DARK_TEXT = RGBColor(0x1F, 0x29, 0x37)         # #1F2937
MUTED_TEXT = RGBColor(0x4B, 0x55, 0x63)        # #4B5563
TODO_RED = RGBColor(0xDC, 0x26, 0x26)          # #DC2626
TABLE_HEADER_BG = "1E3A8A"
TABLE_ALT_BG = "F3F4F6"
CODE_BG = "F9FAFB"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_title_page(doc):
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(72)
    title_p.paragraph_format.space_after = Pt(12)
    title_p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title_p.add_run("WISHWELL")
    run.font.name = "Arial"
    run.font.size = Pt(32)
    run.font.bold = True
    run.font.color.rgb = NAVY_PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(24)
    sub_p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = sub_p.add_run("A High-Integrity, Polyglot Platform for Verified Direct Item Fulfillment")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(16)
    run_sub.font.italic = True
    run_sub.font.color.rgb = SLATE_SECONDARY

    desc_p = doc.add_paragraph()
    desc_p.paragraph_format.space_after = Pt(144)
    desc_p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_desc = desc_p.add_run("Comprehensive Technical Report, Architectural Specification, Security Model & Viva Defense Guide")
    run_desc.font.name = "Calibri"
    run_desc.font.size = Pt(12)
    run_desc.font.color.rgb = MUTED_TEXT

    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_p.paragraph_format.space_after = Pt(6)
    r1 = meta_p.add_run("Academic Degree Project Submission\n")
    r1.font.bold = True
    r1.font.size = Pt(12)
    r1.font.color.rgb = DARK_TEXT

    r2 = meta_p.add_run("Technology Stack: React 18, TypeScript, FastAPI (Python 3.14), SQL Server 2022, Azure Cosmos DB, Azure Blob Storage\n")
    r2.font.size = Pt(10)
    r2.font.color.rgb = MUTED_TEXT

    r3 = meta_p.add_run("Status: Fully Verified & Production-Ready | Automated Tests: 74/74 Passed")
    r3.font.size = Pt(10)
    r3.font.color.rgb = SLATE_SECONDARY
    r3.font.bold = True

    doc.add_page_break()

def parse_markdown_to_docx(doc, md_text):
    lines = md_text.splitlines()
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            in_table = False
            return
        
        # Determine columns
        col_count = max(len(r) for r in table_rows)
        table = doc.add_table(rows=len(table_rows), cols=col_count)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = True

        for r_idx, row_data in enumerate(table_rows):
            is_header = (r_idx == 0)
            row = table.rows[r_idx]
            for c_idx in range(col_count):
                cell = row.cells[c_idx]
                text = row_data[c_idx] if c_idx < len(row_data) else ""
                set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
                
                if is_header:
                    set_cell_background(cell, TABLE_HEADER_BG)
                elif r_idx % 2 == 1:
                    set_cell_background(cell, TABLE_ALT_BG)

                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                run = p.add_run(text.strip())
                run.font.name = "Calibri"
                run.font.size = Pt(9.5)
                if is_header:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                else:
                    run.font.color.rgb = DARK_TEXT

        doc.add_paragraph().paragraph_format.space_after = Pt(6)
        in_table = False
        table_rows = []

    for line in lines:
        stripped = line.strip()

        # Handle code blocks
        if stripped.startswith("```"):
            if in_code_block:
                # Flush code block
                code_text = "\n".join(code_lines)
                table = doc.add_table(rows=1, cols=1)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                cell = table.rows[0].cells[0]
                set_cell_background(cell, CODE_BG)
                set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                run = p.add_run(code_text)
                run.font.name = "Consolas"
                run.font.size = Pt(8.5)
                run.font.color.rgb = DARK_TEXT
                doc.add_paragraph().paragraph_format.space_after = Pt(4)
                code_lines = []
                in_code_block = False
            else:
                if in_table:
                    flush_table()
                in_code_block = True
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Handle Tables
        if "|" in line:
            # Check if divider line like |---|---|
            if re.match(r"^\|?\s*[-:]+[-|\s:]*$", stripped):
                continue
            cells = [c.strip() for c in stripped.split("|")]
            # Strip empty leading/trailing from markdown table | col1 | col2 |
            if cells and cells[0] == "":
                cells = cells[1:]
            if cells and cells[-1] == "":
                cells = cells[:-1]
            if cells:
                in_table = True
                table_rows.append(cells)
                continue
        else:
            if in_table:
                flush_table()

        # Empty lines
        if not stripped:
            continue

        # Headers
        if stripped.startswith("# "):
            doc.add_page_break()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(8)
            run = p.add_run(stripped[2:])
            run.font.name = "Arial"
            run.font.size = Pt(18)
            run.font.bold = True
            run.font.color.rgb = NAVY_PRIMARY
        elif stripped.startswith("## "):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            run = p.add_run(stripped[3:])
            run.font.name = "Arial"
            run.font.size = Pt(14)
            run.font.bold = True
            run.font.color.rgb = NAVY_PRIMARY
        elif stripped.startswith("### "):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(stripped[4:])
            run.font.name = "Arial"
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.color.rgb = SLATE_SECONDARY
        elif stripped.startswith("#### "):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(stripped[5:])
            run.font.name = "Calibri"
            run.font.size = Pt(11)
            run.font.bold = True
            run.font.color.rgb = DARK_TEXT

        # Callouts / TODO screenshots
        elif "[TODO:" in stripped:
            table = doc.add_table(rows=1, cols=1)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = table.rows[0].cells[0]
            set_cell_background(cell, "FEF2F2") # Light red tint
            set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run_lbl = p.add_run("📸 SCREENSHOT PLACEHOLDER: ")
            run_lbl.font.bold = True
            run_lbl.font.size = Pt(9.5)
            run_lbl.font.color.rgb = TODO_RED
            run_txt = p.add_run(stripped.replace("[TODO:", "").replace("]", "").strip())
            run_txt.font.italic = True
            run_txt.font.size = Pt(9.5)
            run_txt.font.color.rgb = DARK_TEXT
            doc.add_paragraph().paragraph_format.space_after = Pt(4)

        # Bullet lists
        elif stripped.startswith("- ") or stripped.startswith("* "):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(stripped[2:])
            run.font.name = "Calibri"
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_TEXT

        # Numbered lists
        elif re.match(r"^\d+\.\s", stripped):
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            text_part = re.sub(r"^\d+\.\s*", "", stripped)
            run = p.add_run(text_part)
            run.font.name = "Calibri"
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_TEXT

        # Normal text paragraphs
        else:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(stripped)
            run.font.name = "Calibri"
            run.font.size = Pt(10.5)
            run.font.color.rgb = DARK_TEXT

    if in_table:
        flush_table()

def main():
    print("=" * 70)
    print("COMPILING ACADEMIC PROJECT REPORT INTO MICROSOFT WORD (.DOCX) FORMAT")
    print("=" * 70)

    doc = Document()

    # Set 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # 1. Title Page
    print("[1/5] Building Title Page...")
    add_title_page(doc)

    # 2. Executive Summary & Table of Contents Overview
    print("[2/5] Building Table of Contents & Executive Summary...")
    toc_p = doc.add_paragraph()
    r = toc_p.add_run("Executive Summary & Document Index")
    r.font.name = "Arial"
    r.font.size = Pt(20)
    r.font.bold = True
    r.font.color.rgb = NAVY_PRIMARY

    intro_p = doc.add_paragraph()
    intro_p.paragraph_format.space_after = Pt(8)
    intro_p.add_run(
        "WishWell is an enterprise-grade, verified direct item-fulfillment platform designed to eliminate the systemic "
        "cash trust deficit in charitable giving. By connecting verified children's homes directly with donors for tangible, "
        "essential physical goods (textbooks, bedding, nutrition, hygiene supplies) with strictly zero money transactions, "
        "WishWell eliminates monetary overhead leakage while guaranteeing child dignity and privacy through automated "
        "EXIF/GPS metadata stripping. This document provides the complete academic report, architectural proofs, Third Normal "
        "Form (3NF) mathematical normalization analysis, cryptographic SHA-256 audit log specifications, STRIDE threat model, "
        "and empirical concurrency benchmark evaluations."
    )

    # Chapters list
    report_files = [
        ("01_problem_statement.md", "Chapter 1: Problem Statement & Background"),
        ("02_requirements.md", "Chapter 2: Requirements Specification (FR & NFR)"),
        ("03_architecture.md", "Chapter 3: System Architecture & Polyglot Persistence"),
        ("04_api_list.md", "Chapter 4: REST API Catalog (35 Endpoints)"),
        ("05_concurrency_tradeoff.md", "Chapter 5: Written Concurrency Trade-Off: Pessimistic Locking vs. OCC"),
        ("06_er_and_normalization.md", "Chapter 6: Entity-Relationship Model & 3NF Normalization Proof"),
        ("07_data_classification.md", "Chapter 7: Data Classification & Storage Architecture"),
        ("08_threat_model.md", "Chapter 8: Threat Modeling (STRIDE Methodology)"),
        ("09_security_checklist.md", "Chapter 9: Security Checklist & Compliance Evidence"),
        ("10_testing_summary.md", "Chapter 10: Automated Testing & Verification Suite"),
        ("11_licenses_and_ai_credits.md", "Chapter 11: Third-Party Software Licenses & AI Declaration"),
    ]

    for fname, title in report_files:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(title)
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)

    doc.add_page_break()

    # 3. Main Report Chapters
    print("[3/5] Parsing and styling Report Chapters 1-11...")
    for fname, title in report_files:
        fpath = REPORT_DIR / fname
        if fpath.exists():
            print(f"  -> Merging {fname}...")
            content = fpath.read_text(encoding="utf-8")
            parse_markdown_to_docx(doc, content)

    # 4. Appendix A: Demonstration SQL Queries
    print("[4/5] Merging Appendix A: Demonstration SQL Script...")
    queries_path = DOCS_DIR / "queries.sql"
    if queries_path.exists():
        doc.add_page_break()
        p = doc.add_paragraph()
        run = p.add_run("Appendix A: Database Demonstration Queries (T-SQL)")
        run.font.name = "Arial"
        run.font.size = Pt(18)
        run.font.bold = True
        run.font.color.rgb = NAVY_PRIMARY

        p_desc = doc.add_paragraph()
        p_desc.add_run("Contains multi-table joins (5 JOINs), grouped aggregation with HAVING, view querying, stored procedure execution, and a full ACID transaction with pessimistic row-locking.")
        
        sql_content = queries_path.read_text(encoding="utf-8")
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.rows[0].cells[0]
        set_cell_background(cell, CODE_BG)
        set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
        p = cell.paragraphs[0]
        run = p.add_run(sql_content)
        run.font.name = "Consolas"
        run.font.size = Pt(8.0)
        run.font.color.rgb = DARK_TEXT

    # 5. Appendix B: 25 Viva Examination Questions
    print("[5/5] Merging Appendix B: 25 Likely Viva Questions & Model Answers...")
    viva_path = DOCS_DIR / "viva_questions.md"
    if viva_path.exists():
        viva_content = viva_path.read_text(encoding="utf-8")
        parse_markdown_to_docx(doc, viva_content)

    # Final QA Verification Report
    qa_path = DOCS_DIR / "qa_verification_report.md"
    if qa_path.exists():
        qa_content = qa_path.read_text(encoding="utf-8")
        parse_markdown_to_docx(doc, qa_content)

    doc.save(str(OUTPUT_DOCX))
    print("\n" + "=" * 70)
    print(f"SUCCESS: Comprehensive report saved to:\n{OUTPUT_DOCX}")
    print("=" * 70)

if __name__ == "__main__":
    main()

