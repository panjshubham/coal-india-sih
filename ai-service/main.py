"""
Khanan-Net AI Service — FastAPI Microservice
SIH 2026 Problem Statement ID: 26024
Central Intelligence Engine for Coal Mine Governance Platform

Extended with 7 Hugging Face model integrations via HF Inference API.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import datetime
import re
import math
import io
import os
import base64
import httpx
from dotenv import load_dotenv

load_dotenv()

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_BASE = "https://api-inference.huggingface.co/models"

app = FastAPI(
    title="Khanan-Net AI Service",
    description="AI/ML engine for the Coal Mine Smart Governance Platform (SIH 2026 - PS ID 26024)",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────
# HELPER: Call Hugging Face Inference API
# ─────────────────────────────────────────────────

async def hf_post(model: str, payload: dict | bytes, is_binary: bool = False, timeout: int = 60) -> Any:
    """
    Posts to the HF Inference API.
    If no token is set, raises 503 with instructions.
    """
    if not HF_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail=(
                "Hugging Face API token not configured. "
                "Get a free token at https://huggingface.co/settings/tokens "
                "and set HF_API_TOKEN in ai-service/.env"
            )
        )

    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    url = f"{HF_BASE}/{model}"

    async with httpx.AsyncClient(timeout=timeout) as client:
        if is_binary:
            headers["Content-Type"] = "application/octet-stream"
            response = await client.post(url, content=payload, headers=headers)
        else:
            response = await client.post(url, json=payload, headers=headers)

    if response.status_code == 503:
        raise HTTPException(status_code=503, detail=f"Model '{model}' is loading on HF servers. Please wait 20-30 seconds and retry.")
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid Hugging Face API token. Check your HF_API_TOKEN in .env")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"HF API error: {response.text[:300]}")

    return response.json()


# ─────────────────────────────────────────────────
# 1. PREDICTIVE MINE RISK INDEX  (/api/predict-risk)
# ─────────────────────────────────────────────────

class RiskFeatures(BaseModel):
    mine_id: int
    historical_violations: int           # total recorded violations past 12 months
    high_severity_violations: int        # subset marked 'high' or 'critical'
    recent_incidents: int                # incidents past 30 days
    overdue_compliance_items: int        # compliance items past due date
    ventilation_o2_pct: float            # oxygen concentration % (normal ≥ 19.5)
    inspection_overdue_days: int         # days since last statutory inspection
    contractor_cert_expired: bool        # any contractor has expired safety certificate
    production_variance_pct: float       # abs % difference: extraction vs logistics weight

def _logistic(x: float) -> float:
    """Sigmoid function mapping a linear score to 0-100."""
    return 100.0 / (1.0 + math.exp(-0.05 * (x - 50)))

@app.post("/api/predict-risk", summary="Predict Mine Safety Risk Score (0-100)")
def predict_mine_risk(req: RiskFeatures):
    """
    Predictive Mine Risk Index using a weighted linear model + sigmoid normalisation.
    Weights are calibrated based on DGMS Coal Mines Regulations risk parameters.
    A risk_score > 70 → HIGH. Between 40–70 → MEDIUM. Below 40 → LOW.
    """
    factors: Dict[str, float] = {}
    score = 10.0  # baseline

    viol_w = min(req.historical_violations * 1.5, 20)
    factors["historical_violations"] = round(viol_w, 1)
    score += viol_w

    high_viol_w = min(req.high_severity_violations * 4.5, 25)
    factors["high_severity_violations"] = round(high_viol_w, 1)
    score += high_viol_w

    incident_w = min(req.recent_incidents * 6, 24)
    factors["recent_incidents"] = round(incident_w, 1)
    score += incident_w

    comp_w = min(req.overdue_compliance_items * 2, 12)
    factors["overdue_compliance"] = round(comp_w, 1)
    score += comp_w

    if req.ventilation_o2_pct < 17.0:
        vent_w = 25.0
    elif req.ventilation_o2_pct < 19.5:
        vent_w = 15.0
    else:
        vent_w = 0.0
    factors["ventilation_penalty"] = round(vent_w, 1)
    score += vent_w

    if req.inspection_overdue_days > 90:
        insp_w = 15.0
    elif req.inspection_overdue_days > 30:
        insp_w = 7.0
    else:
        insp_w = 0.0
    factors["inspection_overdue"] = round(insp_w, 1)
    score += insp_w

    cert_w = 10.0 if req.contractor_cert_expired else 0.0
    factors["contractor_cert_expired"] = round(cert_w, 1)
    score += cert_w

    if req.production_variance_pct > 10:
        prod_w = 12.0
    elif req.production_variance_pct > 5:
        prod_w = 5.0
    else:
        prod_w = 0.0
    factors["production_anomaly"] = round(prod_w, 1)
    score += prod_w

    normalised = round(min(_logistic(score), 99.9), 1)
    risk_level = "LOW"
    if normalised > 70:
        risk_level = "HIGH"
    elif normalised >= 40:
        risk_level = "MEDIUM"

    top_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)
    top_factors_list = [f"{k.replace('_', ' ').title()} (+{v})" for k, v in top_factors if v > 0][:3]

    return {
        "mine_id": req.mine_id,
        "risk_score": normalised,
        "risk_level": risk_level,
        "ml_confidence": round(0.75 + (normalised / 1000), 3),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "contributing_factors": factors,
        "top_factors": top_factors_list,
        "recommendation": (
            "Immediate site inspection and escalation to General Manager recommended."
            if risk_level == "HIGH"
            else "Schedule preventive inspection within 7 days."
            if risk_level == "MEDIUM"
            else "Continue standard monitoring protocol."
        )
    }


# ─────────────────────────────────────────────────
# 2. OPERATIONAL ANOMALY DETECTOR (/api/detect-anomaly)
# ─────────────────────────────────────────────────

class AnomalyRequest(BaseModel):
    mine_id: int
    extraction_weight_tons: float
    logistics_weight_tons: float
    shift: Optional[str] = "general"
    previous_extraction_tons: Optional[float] = None

@app.post("/api/detect-anomaly", summary="Detect Production vs Logistics Weight Discrepancy")
def detect_logistics_anomaly(req: AnomalyRequest):
    alerts = []
    if req.extraction_weight_tons <= 0:
        raise HTTPException(status_code=400, detail="extraction_weight_tons must be > 0")

    variance = abs(req.extraction_weight_tons - req.logistics_weight_tons)
    pct_diff = round((variance / req.extraction_weight_tons) * 100, 2)
    primary_anomaly = pct_diff > 5.0

    if primary_anomaly:
        alerts.append({
            "type": "WEIGHT_DISCREPANCY",
            "severity": "high" if pct_diff > 15 else "medium",
            "message": f"Weight discrepancy of {pct_diff:.1f}% detected between extraction ({req.extraction_weight_tons}T) and logistics ({req.logistics_weight_tons}T)."
        })

    production_drop_anomaly = False
    if req.previous_extraction_tons and req.previous_extraction_tons > 0:
        day_drop = ((req.previous_extraction_tons - req.extraction_weight_tons) / req.previous_extraction_tons) * 100
        if day_drop > 30:
            production_drop_anomaly = True
            alerts.append({
                "type": "PRODUCTION_DROP",
                "severity": "medium",
                "message": f"Sudden production drop of {day_drop:.1f}% compared to previous period."
            })

    return {
        "mine_id": req.mine_id,
        "shift": req.shift,
        "extraction_weight_tons": req.extraction_weight_tons,
        "logistics_weight_tons": req.logistics_weight_tons,
        "variance_tons": round(variance, 2),
        "percentage_diff": pct_diff,
        "is_anomaly": primary_anomaly or production_drop_anomaly,
        "anomaly_alerts": alerts,
        "status": "ANOMALY_DETECTED" if (primary_anomaly or production_drop_anomaly) else "NOMINAL",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# 3. BATCH MINE RISK ANALYSIS (/analyze/all)
# ─────────────────────────────────────────────────

@app.post("/analyze/all", summary="Batch risk recalculation for all mines")
def analyze_all_mines():
    mines = [
        {"mine_id": 1, "name": "Tetaria Khar (ECL)", "historical_violations": 12, "high_severity_violations": 4, "recent_incidents": 3, "overdue_compliance_items": 2, "ventilation_o2_pct": 18.2, "inspection_overdue_days": 45, "contractor_cert_expired": True, "production_variance_pct": 7.1},
        {"mine_id": 2, "name": "Dhori Khas (CCL)", "historical_violations": 8, "high_severity_violations": 2, "recent_incidents": 2, "overdue_compliance_items": 3, "ventilation_o2_pct": 19.1, "inspection_overdue_days": 20, "contractor_cert_expired": False, "production_variance_pct": 3.2},
        {"mine_id": 3, "name": "Govindpur Colliery (BCCL)", "historical_violations": 4, "high_severity_violations": 1, "recent_incidents": 0, "overdue_compliance_items": 1, "ventilation_o2_pct": 20.1, "inspection_overdue_days": 10, "contractor_cert_expired": False, "production_variance_pct": 1.2},
    ]
    results = []
    for m in mines:
        req = RiskFeatures(**{k: v for k, v in m.items() if k != "name"})
        result = predict_mine_risk(req)
        result["mine_name"] = m["name"]
        results.append(result)

    return {
        "status": "completed",
        "mines_analysed": len(results),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "results": results
    }


# ═══════════════════════════════════════════════════════════
# HUGGING FACE AI MODEL INTEGRATIONS
# ═══════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────
# HF-1: TrOCR — OCR on printed documents
#        Model: microsoft/trocr-large-printed
# ─────────────────────────────────────────────────

@app.post("/api/ocr-trocr", summary="TrOCR: Extract printed text from document image")
async def ocr_trocr(file: UploadFile = File(...)):
    """
    Uses microsoft/trocr-large-printed to extract printed text from document images.
    Best for: DGMS forms, safety certificates, Form V scans.
    Accepts: PNG, JPEG, TIFF
    """
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/tiff"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported type: {file.content_type}. Use PNG, JPEG, or TIFF.")

    content = await file.read()
    result = await hf_post("microsoft/trocr-large-printed", content, is_binary=True, timeout=90)

    text = result.get("generated_text", "") if isinstance(result, dict) else (result[0].get("generated_text", "") if result else "")

    # Extract dates and compliance keywords from the OCR'd text
    date_hits = re.findall(r"\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b", text)
    deadline_hits = re.findall(r"(?:due|expiry|valid till|valid until|deadline)[:\s]+([^\n]{5,30})", text, re.IGNORECASE)

    return {
        "model": "microsoft/trocr-large-printed",
        "filename": file.filename,
        "extracted_text": text,
        "detected_dates": list(set(date_hits)),
        "detected_deadlines": [d.strip() for d in deadline_hits],
        "character_count": len(text),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF-2: Donut — Document → Structured Data
#        Model: naver-clova-ix/donut-base
# ─────────────────────────────────────────────────

@app.post("/api/donut-extract", summary="Donut: Document image → structured JSON data")
async def donut_extract(file: UploadFile = File(...)):
    """
    Uses Donut (Document Understanding Transformer) to convert document images
    directly into structured JSON without OCR pre-processing.
    Best for: structured forms, tables, certificates.
    """
    allowed = {"image/png", "image/jpeg", "image/jpg"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported type. Use PNG or JPEG.")

    content = await file.read()
    result = await hf_post("naver-clova-ix/donut-base", content, is_binary=True, timeout=120)

    return {
        "model": "naver-clova-ix/donut-base",
        "filename": file.filename,
        "structured_output": result,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF-3: BART Zero-Shot — Classify Compliance Category
#        Model: facebook/bart-large-mnli
# ─────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    text: str
    candidate_labels: Optional[List[str]] = [
        "Safety & Health Compliance",
        "Environmental Clearance",
        "Production & Logistics",
        "Worker Welfare & Wages",
        "Equipment Certification",
        "Explosive & Blasting Permit",
        "DGMS Statutory Inspection",
        "Labour Law Compliance"
    ]

@app.post("/api/classify-compliance", summary="BART: Zero-shot compliance category classification")
async def classify_compliance(req: ClassifyRequest):
    """
    Uses facebook/bart-large-mnli (zero-shot NLI) to classify any text
    into Coal Mine compliance categories without fine-tuning.
    """
    if len(req.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short. Minimum 10 characters.")

    result = await hf_post("facebook/bart-large-mnli", {
        "inputs": req.text,
        "parameters": {"candidate_labels": req.candidate_labels}
    })

    labels = result.get("labels", [])
    scores = result.get("scores", [])
    ranked = [{"label": l, "score": round(s, 4)} for l, s in zip(labels, scores)]

    return {
        "model": "facebook/bart-large-mnli",
        "input_text": req.text[:200],
        "top_category": labels[0] if labels else "Unknown",
        "confidence": round(scores[0], 4) if scores else 0,
        "all_scores": ranked,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF-4: BERT NER — Extract Entities (Names/Dates/Orgs)
#        Model: dslim/bert-base-NER
# ─────────────────────────────────────────────────

class NERRequest(BaseModel):
    text: str

@app.post("/api/extract-entities", summary="BERT NER: Extract names, dates, orgs from document text")
async def extract_entities(req: NERRequest):
    """
    Uses dslim/bert-base-NER to identify and extract named entities:
    persons (officer names), organisations (mine subsidiaries),
    locations, and dates/deadlines.
    """
    if len(req.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short.")

    result = await hf_post("dslim/bert-base-NER", {"inputs": req.text})

    entities: List[Dict] = result if isinstance(result, list) else []

    # Group by entity type
    grouped: Dict[str, List[str]] = {}
    for ent in entities:
        label = ent.get("entity_group", ent.get("entity", "MISC"))
        word = ent.get("word", "").strip()
        if word and not word.startswith("##"):
            grouped.setdefault(label, [])
            if word not in grouped[label]:
                grouped[label].append(word)

    return {
        "model": "dslim/bert-base-NER",
        "input_text": req.text[:300],
        "entities_raw": entities,
        "entities_grouped": grouped,
        "persons": grouped.get("PER", []),
        "organisations": grouped.get("ORG", []),
        "locations": grouped.get("LOC", []),
        "misc": grouped.get("MISC", []),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF-5: IndicTrans2 — Multilingual Translation
#        Model: ai4bharat/indictrans2-en-indic-dist-200M
# ─────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    target_language: str = "Hindi"   # Hindi | Bengali | Telugu | Marathi | Odia | ...

LANG_CODES = {
    "Hindi": "hin_Deva",
    "Bengali": "ben_Beng",
    "Telugu": "tel_Telu",
    "Marathi": "mar_Deva",
    "Odia": "ory_Orya",
    "Tamil": "tam_Taml",
    "Punjabi": "pan_Guru",
    "Gujarati": "guj_Gujr",
}

@app.post("/api/translate", summary="IndicTrans2: English → Indian language translation")
async def translate_text(req: TranslateRequest):
    """
    Uses ai4bharat/indictrans2-en-indic-dist-200M to translate English text to
    Indian regional languages — critical for multilingual field workers.
    """
    if len(req.text.strip()) < 2:
        raise HTTPException(status_code=400, detail="Text too short.")

    tgt_lang = LANG_CODES.get(req.target_language, "hin_Deva")

    result = await hf_post("ai4bharat/indictrans2-en-indic-dist-200M", {
        "inputs": req.text,
        "parameters": {"src_lang": "eng_Latn", "tgt_lang": tgt_lang}
    })

    translated = ""
    if isinstance(result, list) and result:
        translated = result[0].get("translation_text", "")
    elif isinstance(result, dict):
        translated = result.get("translation_text", str(result))

    return {
        "model": "ai4bharat/indictrans2-en-indic-dist-200M",
        "source_text": req.text,
        "target_language": req.target_language,
        "target_lang_code": tgt_lang,
        "translated_text": translated,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF-6: Whisper — Voice Reporting (Speech-to-Text)
#        Model: openai/whisper-large-v3
# ─────────────────────────────────────────────────

@app.post("/api/transcribe", summary="Whisper: Voice memo → text (multilingual)")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Uses openai/whisper-large-v3 to transcribe audio recordings of field
    violation reports or inspection notes into text. Supports Hindi & English.
    Accepts: WAV, MP3, OGG, FLAC, M4A, WEBM
    """
    allowed = {
        "audio/wav", "audio/wave", "audio/x-wav",
        "audio/mpeg", "audio/mp3",
        "audio/ogg", "audio/flac",
        "audio/x-m4a", "audio/m4a",
        "audio/webm", "video/webm"
    }
    if file.content_type not in allowed and not (file.filename or "").lower().endswith(('.wav', '.mp3', '.ogg', '.flac', '.m4a', '.webm')):
        raise HTTPException(status_code=400, detail=f"Unsupported audio format. Use WAV, MP3, OGG, FLAC, or M4A.")

    content = await file.read()
    result = await hf_post("openai/whisper-large-v3", content, is_binary=True, timeout=120)

    text = result.get("text", "") if isinstance(result, dict) else ""

    return {
        "model": "openai/whisper-large-v3",
        "filename": file.filename,
        "transcribed_text": text,
        "file_size_kb": round(len(content) / 1024, 1),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF-7: YOLOv8 — PPE Detection from Site Photo
#        Model: keremberke/yolov8n-ppe-detection
# ─────────────────────────────────────────────────

@app.post("/api/ppe-detect", summary="YOLOv8: Detect PPE compliance in site photo")
async def ppe_detect(file: UploadFile = File(...)):
    """
    Uses keremberke/yolov8n-ppe-detection to detect Personal Protective Equipment
    (hard hats, safety vests, gloves, goggles) in site photographs.
    Returns bounding boxes and confidence for each detected item.
    Accepts: JPEG, PNG
    """
    allowed = {"image/jpeg", "image/jpg", "image/png"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Use JPEG or PNG image.")

    content = await file.read()

    # keremberke YOLOv8 uses the object-detection pipeline endpoint
    result = await hf_post("keremberke/yolov8n-ppe-detection", content, is_binary=True, timeout=60)

    detections: List[Dict] = result if isinstance(result, list) else []

    ppe_classes = [d.get("label", "") for d in detections]
    required_ppe = ["hard-hat", "safety-vest", "mask"]
    missing = [r for r in required_ppe if not any(r in c.lower() for c in ppe_classes)]

    compliance_status = "COMPLIANT" if not missing else "NON_COMPLIANT"
    confidence_avg = round(
        sum(d.get("score", 0) for d in detections) / len(detections), 3
    ) if detections else 0

    return {
        "model": "keremberke/yolov8n-ppe-detection",
        "filename": file.filename,
        "compliance_status": compliance_status,
        "detected_items": detections,
        "detected_ppe_classes": list(set(ppe_classes)),
        "missing_ppe": missing,
        "total_detections": len(detections),
        "avg_confidence": confidence_avg,
        "alert": (
            f"⚠️ Missing PPE detected: {', '.join(missing)}. Halt operation immediately."
            if missing else
            "✅ All required PPE detected. Worker appears compliant."
        ),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


# ─────────────────────────────────────────────────
# HF STATUS: Check if token is configured
# ─────────────────────────────────────────────────

@app.get("/api/hf-status", summary="Check Hugging Face API token configuration")
def hf_status():
    return {
        "hf_token_configured": bool(HF_API_TOKEN),
        "available_models": [
            {"endpoint": "/api/ocr-trocr", "model": "microsoft/trocr-large-printed", "task": "OCR on printed documents"},
            {"endpoint": "/api/donut-extract", "model": "naver-clova-ix/donut-base", "task": "Document → structured JSON"},
            {"endpoint": "/api/classify-compliance", "model": "facebook/bart-large-mnli", "task": "Zero-shot compliance classification"},
            {"endpoint": "/api/extract-entities", "model": "dslim/bert-base-NER", "task": "Extract names/dates/organisations"},
            {"endpoint": "/api/translate", "model": "ai4bharat/indictrans2-en-indic-dist-200M", "task": "English → Indian languages"},
            {"endpoint": "/api/transcribe", "model": "openai/whisper-large-v3", "task": "Audio → text (voice reporting)"},
            {"endpoint": "/api/ppe-detect", "model": "keremberke/yolov8n-ppe-detection", "task": "PPE safety compliance from photos"},
        ]
    }


# ─────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────

@app.get("/", summary="Health Check")
def root():
    return {
        "service": "Khanan-Net AI Engine",
        "version": "3.0.0",
        "status": "operational",
        "endpoints": [
            "/api/predict-risk", "/api/detect-anomaly", "/analyze/all",
            "/api/ocr-trocr", "/api/donut-extract", "/api/classify-compliance",
            "/api/extract-entities", "/api/translate", "/api/transcribe", "/api/ppe-detect",
            "/api/hf-status"
        ],
        "sih_problem_id": "26024"
    }
