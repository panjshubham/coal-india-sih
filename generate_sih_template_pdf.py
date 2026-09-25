import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

PDF_OUTPUT_PATH = r"c:\Users\SHUBHAM PANJIYARA\Desktop\coal india\CoalGuard_SIH26024_Idea_Template.pdf"

class CleanNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        # Top Header line
        self.setStrokeColor(colors.HexColor('#0F172A'))
        self.setLineWidth(1.5)
        self.line(36, 11.69 * inch - 36, 8.27 * inch - 36, 11.69 * inch - 36)
        
        # Bottom Footer line & text
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.75)
        self.line(36, 36, 8.27 * inch - 36, 36)
        
        self.setFillColor(colors.HexColor('#64748B'))
        self.setFont('Helvetica', 8)
        self.drawString(36, 24, "Smart India Hackathon 2026 | Problem ID: SIH26024 | CoalGuard")
        self.drawRightString(8.27 * inch - 36, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_simple_pdf():
    doc = SimpleDocTemplate(
        PDF_OUTPUT_PATH,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        alignment=1,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        alignment=1,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=4,
        spaceAfter=2
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        spaceAfter=3
    )

    story = []

    # ==================== PAGE 1 ====================
    # Title & Metadata
    story.append(Paragraph("CoalGuard", title_style))
    story.append(Paragraph("AI-Based Smart Governance, Risk Prediction & Statutory Compliance System for Coal Mines", subtitle_style))

    meta_table_data = [
        [Paragraph("<b>Problem Statement ID:</b>", body_style), Paragraph("SIH26024", body_style)],
        [Paragraph("<b>Target Ministry / Org:</b>", body_style), Paragraph("Ministry of Coal / Coal India Limited (CIL) & DGMS", body_style)],
        [Paragraph("<b>Category & Theme:</b>", body_style), Paragraph("Software | Web Development, AI / Machine Learning & Data Analytics", body_style)],
        [Paragraph("<b>Project Summary:</b>", body_style), Paragraph("Offline-first digital safety platform with predictive AI and tamper-evident audit logging for coal mines.", body_style)]
    ]
    t_meta = Table(meta_table_data, colWidths=[140, 380])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # 1. Problem Statement
    story.append(Paragraph("1. Problem Statement", h1_style))
    story.append(Paragraph(
        "Indian coal mining operations operate under strict safety laws (Mines Act 1952 and Coal Mines Regulations 2017). "
        "However, operations still face critical safety and governance challenges:", body_style
    ))
    story.append(Paragraph("• <b>Paper-Based Registers:</b> Daily safety logs, Form IV (Accidents), and Form V (Dangerous Occurrences) are manually written, making them prone to physical damage, loss, and unauthorized post-incident alterations.", bullet_style))
    story.append(Paragraph("• <b>Underground Communication Void:</b> Deep seams lack internet connectivity, preventing field sirdars and inspectors from logging hazards and gas readings in real time.", bullet_style))
    story.append(Paragraph("• <b>Slow Water Inrush Detection:</b> Underground aquifer breaches can flood galleries within 15 minutes, but conventional laboratory testing takes 24 to 48 hours to identify the water source.", bullet_style))
    story.append(Paragraph("• <b>Opaque AI Decisions:</b> Traditional machine learning models lack transparency, leading safety officers to mistrust automated alerts.", bullet_style))

    story.append(Spacer(1, 8))

    # 2. Proposed Solution: CoalGuard
    story.append(Paragraph("2. Proposed Solution: CoalGuard", h1_style))
    story.append(Paragraph(
        "<b>CoalGuard</b> is an industrial-grade, offline-first digital safety governance platform. "
        "It replaces manual paper logs with a tamper-evident digital workflow and leverages AI to predict hazards before accidents happen.", body_style
    ))

    features_data = [
        [Paragraph("<b>Core Capability</b>", h2_style), Paragraph("<b>How It Works & Practical Impact</b>", h2_style)],
        [
            Paragraph("<b>Offline-First PWA</b>", body_style),
            Paragraph("Works deep underground without internet using local IndexedDB storage. Automatically synchronizes all logs, photos, and voice notes upon returning to the surface pithead.", body_style)
        ],
        [
            Paragraph("<b>Automated PPE Vision</b>", body_style),
            Paragraph("YOLOv8 computer vision analyzes pithead CCTV to detect helmets, reflective vests, and safety boots, auto-generating violation tickets for non-compliance.", body_style)
        ],
        [
            Paragraph("<b>Rapid Water Inrush AI</b>", body_style),
            Paragraph("CLSSA-XGBoost classifies breaching water sources across 8 chemical ions in under 1 second with 97.78% precision, replacing 48-hour laboratory delays.", body_style)
        ],
        [
            Paragraph("<b>Explainable AI (TreeSHAP)</b>", body_style),
            Paragraph("Provides clear visual factor attributions for every risk prediction, showing exactly which sensor readings drove the risk score.", body_style)
        ],
        [
            Paragraph("<b>Multilingual Voice Input</b>", body_style),
            Paragraph("Hands-free voice hazard reporting supporting 10+ Indian languages (Hindi, Bengali, Odia, Marathi, Telugu, English) for grassroots miners.", body_style)
        ],
        [
            Paragraph("<b>Tamper-Proof Audit Ledger</b>", body_style),
            Paragraph("SHA-256 cryptographic hash-chaining prevents backdating or retroactive alteration of statutory inspection records.", body_style)
        ]
    ]
    t_feat = Table(features_data, colWidths=[140, 380])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    for c in range(2):
        t_feat.setStyle(TableStyle([('TEXTCOLOR', (c, 0), (c, 0), colors.white)]))
    story.append(t_feat)

    story.append(PageBreak())

    # ==================== PAGE 2 ====================
    # 3. System Architecture & Tech Stack
    story.append(Paragraph("3. Technical Architecture & Technology Stack", h1_style))

    tech_table_data = [
        [Paragraph("<b>Component</b>", h2_style), Paragraph("<b>Technologies Used</b>", h2_style), Paragraph("<b>Function</b>", h2_style)],
        [
            Paragraph("<b>Frontend (Web & PWA)</b>", body_style),
            Paragraph("React 19, TypeScript, Vite, Tailwind CSS, Workbox, IndexedDB", body_style),
            Paragraph("Responsive, dark/light adaptive dashboard with full offline support and instant sync.", body_style)
        ],
        [
            Paragraph("<b>Backend & Database</b>", body_style),
            Paragraph("Supabase, PostgreSQL 15, Row-Level Security, Realtime Channels", body_style),
            Paragraph("Secure relational storage, live alerts via WebSockets, and SHA-256 audit ledger.", body_style)
        ],
        [
            Paragraph("<b>AI / ML Engine</b>", body_style),
            Paragraph("FastAPI, PyTorch, YOLOv8, XGBoost, SHAP, Hugging Face", body_style),
            Paragraph("Computer vision for PPE, gradient boosting for risk prediction, and NLP for voice.", body_style)
        ],
        [
            Paragraph("<b>Mapping & Reporting</b>", body_style),
            Paragraph("Leaflet GIS, Recharts, jsPDF", body_style),
            Paragraph("Geospatial colliery risk heatmaps and one-click certified DGMS Form V export.", body_style)
        ]
    ]
    t_tech = Table(tech_table_data, colWidths=[120, 180, 220])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
    ]))
    for c in range(3):
        t_tech.setStyle(TableStyle([('TEXTCOLOR', (c, 0), (c, 0), colors.white)]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    # 4. User Roles & Governance Portals
    story.append(Paragraph("4. Role-Based Portals", h1_style))
    story.append(Paragraph("• <b>Colliery Manager Portal:</b> Monitors active shift hazards, gas sensor feeds, worker strength, and blast zone status.", bullet_style))
    story.append(Paragraph("• <b>Corporate CIL Dashboard:</b> Subsidiary-wide risk comparison heatmaps (ECL, BCCL, CCL, SECL, WCL, MCL, NCL) and automated escalation timers.", bullet_style))
    story.append(Paragraph("• <b>DGMS Regulator Portal:</b> Statutory compliance inspection view, cryptographic hash verification, and one-click Form V generation.", bullet_style))
    story.append(Paragraph("• <b>Field Inspectors & Workers:</b> Offline-capable mobile view for rapid hazard reporting with photos and voice notes.", bullet_style))

    story.append(Spacer(1, 8))

    # 5. Statutory Compliance Alignment
    story.append(Paragraph("5. Statutory Compliance Alignment", h1_style))
    story.append(Paragraph("• <b>Coal Mines Regulations (CMR 2017) Reg 70:</b> Daily inspection logs and danger reporting digitized with verification.", bullet_style))
    story.append(Paragraph("• <b>CMR 2017 Reg 104 & 108:</b> Noxious gas registers (CO, CH4, CO2) and ventilation velocity monitoring.", bullet_style))
    story.append(Paragraph("• <b>CMR 2017 Reg 129:</b> Precaution against water inrush with sub-second hydrochemical classification.", bullet_style))
    story.append(Paragraph("• <b>Mines Act 1952 Section 23:</b> Automated digital Form IV reporting for serious incidents.", bullet_style))

    story.append(Spacer(1, 8))

    # 6. Implementation Roadmap & Impact
    story.append(Paragraph("6. Roadmap & Expected Impact", h1_style))
    roadmap_data = [
        [
            Paragraph("<b>Phase 1: Pilot (0-3 Months)</b>", h2_style),
            Paragraph("<b>Phase 2: Scale (3-6 Months)</b>", h2_style),
            Paragraph("<b>Phase 3: Nationwide (6-12 Months)</b>", h2_style)
        ],
        [
            Paragraph("Deploy in 5 underground mines; calibrate local water ion baselines; pithead PPE camera setup.", body_style),
            Paragraph("Expand to open-cast sites across SECL & MCL; integrate SCADA gas sensors; field training.", body_style),
            Paragraph("Full rollout across all CIL subsidiaries with direct DGMS audit portal federation.", body_style)
        ]
    ]
    t_road = Table(roadmap_data, colWidths=[170, 170, 180])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP')
    ]))
    story.append(t_road)
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<b>Impact:</b> Eliminates 24-48 hour delays in identifying water inrush sources, prevents register tampering through cryptographic audit logs, and significantly reduces preventable injuries toward a Zero-Harm mining culture.",
        body_style
    ))

    doc.build(story, canvasmaker=CleanNumberedCanvas)
    print("Simple Clean PDF generated successfully.")

if __name__ == "__main__":
    build_simple_pdf()
