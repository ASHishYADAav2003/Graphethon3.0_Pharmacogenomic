from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from logic import process_vcf, detect_available_drugs
from pydantic import BaseModel
from typing import List
import os
import tempfile

# FastAPI app instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Variant(BaseModel):
    rsid: str

class RiskAssessmentResponse(BaseModel):
    risk_label: str
    confidence_score: float   # ❗ required
    severity: str
    
class PharmacogenomicProfileResponse(BaseModel):
    primary_gene: str
    diplotype: str
    phenotype: str
    detected_variants: List[Variant]

class ClinicalRecommendationResponse(BaseModel):
    recommendation: str

class LLMExplanationResponse(BaseModel):
    summary: str
    mechanism: str
    clinical_impact: str
    guideline_basis: str

class PharmaGuardResponse(BaseModel):
    patient_id: str
    drug: str
    timestamp: str
    risk_assessment: RiskAssessmentResponse
    pharmacogenomic_profile: List[PharmacogenomicProfileResponse]  # FIXED
    clinical_recommendation: ClinicalRecommendationResponse
    llm_generated_explanation: LLMExplanationResponse
    quality_metrics: dict

@app.post("/process_vcf/")
async def process(file: UploadFile = File(...), drug: str = "CODEINE"):

    contents = await file.read()

    # Use a cross-platform temp file (works on Windows and Linux)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".vcf", mode="wb") as tmp:
        tmp.write(contents)
        temp_path = tmp.name

    try:
        result = process_vcf(temp_path, drug)
    finally:
        os.unlink(temp_path)  # always clean up

    if result is None:
        raise HTTPException(status_code=400, detail=f"Unsupported drug: {drug}")

    return result

@app.post("/detect_drugs/")
async def detect_drugs(file: UploadFile = File(...)):
    contents = await file.read()
    vcf_content = contents.decode("utf-8")
    
    try:
        patient_id, available, unavailable, detected_genes = detect_available_drugs(vcf_content)
        
        return {
            "patient_id": patient_id,
            "detected_genes": detected_genes,
            "available_drugs": available,
            "unavailable_drugs": unavailable,
            "vcf_scan_success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
