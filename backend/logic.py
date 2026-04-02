from pydantic import BaseModel
from typing import List, Literal
from datetime import datetime
import json


# ===============================
# JSON MODELS
# ===============================

class RiskAssessment(BaseModel):
    risk_label: Literal["Safe", "Adjust Dosage", "Toxic", "Ineffective", "Unknown"]
    severity: Literal["none", "low", "moderate", "high", "critical"]


class DetectedVariant(BaseModel):
    rsid: str


class PharmacogenomicProfile(BaseModel):
    primary_gene: str
    diplotype: str
    phenotype: Literal["PM", "IM", "NM", "RM", "URM", "Unknown"]
    detected_variants: List[DetectedVariant]


class ClinicalRecommendation(BaseModel):
    recommendation: str


class LLMExplanation(BaseModel):
    summary: str
    mechanism: str
    clinical_impact: str
    guideline_basis: str


class QualityMetrics(BaseModel):
    vcf_parsing_success: bool


class PharmaGuardResponse(BaseModel):
    patient_id: str
    drug: str
    timestamp: str
    risk_assessment: RiskAssessment
    pharmacogenomic_profile: List[PharmacogenomicProfile]
    clinical_recommendation: ClinicalRecommendation
    llm_generated_explanation: LLMExplanation
    quality_metrics: QualityMetrics


# ===============================
# DRUG CONFIGURATION
# ===============================

DRUG_CONFIG = {
    "CODEINE": "CYP2D6",
    "WARFARIN": "CYP2C9",
    "CLOPIDOGREL": "CYP2C19",
    "SIMVASTATIN": "SLCO1B1",
    "AZATHIOPRINE": "TPMT",
    "FLUOROURACIL": "DPYD"
}


# ===============================
# PATIENT ID EXTRACTION
# ===============================

def extract_patient_id(vcf_file):
    with open(vcf_file) as f:
        for line in f:
            if line.startswith("#CHROM"):
                cols = line.strip().split()
                return cols[-1]   # last column = sample name
    return "UNKNOWN_PATIENT"

# ===============================
# PHENOTYPE LOGIC
# ===============================

def determine_phenotype(gene, diplotype):

    # CYP2C19 special case
    if gene == "CYP2C19":
        if "*2" in diplotype and "*17" in diplotype:
            return "IM"
        if "*2" in diplotype:
            return "PM"
        if "*17" in diplotype:
            return "RM"
        return "NM"

    # CYP2D6
    if gene == "CYP2D6":
        if "*4" in diplotype:
            if diplotype.count("*4") >= 2:
                return "PM"
            return "IM"
        return "NM"

    # CYP2C9
    if gene == "CYP2C9":
        if "*3/*3" in diplotype:
            return "PM"
        if "*2" in diplotype or "*3" in diplotype:
            return "IM"
        return "NM"

    # SLCO1B1
    if gene == "SLCO1B1":
        if "*5/*5" in diplotype:
            return "PM"
        if "*5" in diplotype:
            return "IM"
        return "NM"

    # TPMT
    if gene == "TPMT":
        if "*3A/*3A" in diplotype:
            return "PM"
        if "*3A" in diplotype:
            return "IM"
        return "NM"

    # DPYD
    if gene == "DPYD":
        if "*2A/*2A" in diplotype:
            return "PM"
        if "*2A" in diplotype:
            return "IM"
        return "NM"

    return "Unknown"


# ===============================
# RISK RULES
# ===============================

def determine_risk(drug, phenotype):

    RISK_MAP = {
        "CODEINE": {
            "PM": ("Ineffective", "high", "Avoid codeine."),
            "IM": ("Adjust Dosage", "moderate", "Consider alternative."),
            "NM": ("Safe", "none", "Standard dosing.")
        },
        "CLOPIDOGREL": {
            "PM": ("Ineffective", "high", "Use alternative therapy."),
            "IM": ("Adjust Dosage", "moderate", "Consider alternative."),
            "RM": ("Safe", "low", "Monitor."),
            "NM": ("Safe", "none", "Standard therapy.")
        },
        "WARFARIN": {
            "PM": ("Toxic", "critical", "Major dose reduction."),
            "IM": ("Adjust Dosage", "high", "Reduce dose."),
            "NM": ("Safe", "none", "Standard dosing.")
        },
        "SIMVASTATIN": {
            "PM": ("Toxic", "high", "Avoid high dose."),
            "IM": ("Adjust Dosage", "moderate", "Lower starting dose."),
            "NM": ("Safe", "none", "Standard dosing.")
        },
        "AZATHIOPRINE": {
            "PM": ("Toxic", "critical", "Avoid drug."),
            "IM": ("Adjust Dosage", "high", "Reduce dose."),
            "NM": ("Safe", "none", "Standard dosing.")
        },
        "FLUOROURACIL": {
            "PM": ("Toxic", "critical", "Avoid drug."),
            "IM": ("Adjust Dosage", "high", "Reduce dose."),
            "NM": ("Safe", "none", "Standard dosing.")
        }
    }

    return RISK_MAP.get(drug, {}).get(
        phenotype,
        ("Unknown", "moderate", "Insufficient data.")
    )


# ===============================
# VCF PARSER
# ===============================

def parse_vcf(file_path):

    variants = []

    with open(file_path, "r") as f:
        for line in f:
            if line.startswith("#"):
                continue

            parts = line.strip().split()
            if len(parts) < 8:
                continue

            rsid = parts[2]
            info = parts[7]

            info_dict = {}
            for item in info.split(";"):
                if "=" in item:
                    k, v = item.split("=")
                    info_dict[k] = v

            variants.append({
                "gene": info_dict.get("GENE"),
                "star": info_dict.get("STAR"),
                "rsid": rsid
            })

    return variants


# ===============================
# MAIN ENGINE
# ===============================

def process_vcf(vcf_file, drug):

    drug = drug.upper()

    if drug not in DRUG_CONFIG:
        print("Unsupported drug.")
        return

    primary_gene = DRUG_CONFIG[drug]
    patient_id = extract_patient_id(vcf_file)

    variants = parse_vcf(vcf_file)

    gene_variants = [v for v in variants if v["gene"] == primary_gene]

    stars = sorted(list(set([v["star"] for v in gene_variants if v["star"]])))

    if len(stars) == 0:
        diplotype = "*1/*1"
    elif len(stars) == 1:
        diplotype = f"{stars[0]}/{stars[0]}"
    else:
        diplotype = f"{stars[0]}/{stars[1]}"

    phenotype = determine_phenotype(primary_gene, diplotype)

    risk_label, severity, recommendation = determine_risk(drug, phenotype)

    result = PharmaGuardResponse(
        patient_id=patient_id,
        drug=drug,
        timestamp=datetime.utcnow().isoformat(),

        risk_assessment=RiskAssessment(
            risk_label=risk_label,
            severity=severity
        ),

        pharmacogenomic_profile=[PharmacogenomicProfile(
            primary_gene=primary_gene,
            diplotype=diplotype,
            phenotype=phenotype if phenotype in ["PM","IM","NM","RM","URM"] else "Unknown",
            detected_variants=[DetectedVariant(rsid=v["rsid"]) for v in gene_variants]
        )],

        clinical_recommendation=ClinicalRecommendation(
            recommendation=recommendation
        ),

        llm_generated_explanation=LLMExplanation(
            summary=f"{primary_gene} {diplotype} results in {phenotype} phenotype affecting {drug}.",
            mechanism=f"Variants alter enzyme activity of {primary_gene}.",
            clinical_impact=f"This may alter therapeutic response to {drug}.",
            guideline_basis="Aligned with CPIC guidelines."
        ),

        quality_metrics=QualityMetrics(
            vcf_parsing_success=True
        )
    )

    return result

# ===============================
# DRUG AUTO-DETECTION
# ===============================

def detect_available_drugs(vcf_content: str):
    GENE_DRUG_MAP = {
        "CYP2D6":  "CODEINE",
        "CYP2C19": "CLOPIDOGREL",
        "CYP2C9":  "WARFARIN",
        "SLCO1B1": "SIMVASTATIN",
        "TPMT":    "AZATHIOPRINE",
        "DPYD":    "FLUOROURACIL"
    }
    
    detected_genes = set()
    gene_variant_counts = {}
    
    patient_id = "UNKNOWN_PATIENT"
    
    for line in vcf_content.split('\n'):
        line = line.strip()
        # Skip empty lines    
        if not line:
            continue
            
        if line.startswith('#CHROM'):
            cols = line.split()
            patient_id = cols[-1]
            continue
            
        # Skip header lines
        if line.startswith('#'):
            continue
            
        # Parse INFO field
        parts = line.split('\t')
        if len(parts) < 8:
            continue
            
        info = parts[7]
        
        # Extract GENE tag from INFO field
        for tag in info.split(';'):
            if tag.startswith('GENE='):
                gene = tag.split('=')[1].strip()
                if gene in GENE_DRUG_MAP:
                    detected_genes.add(gene)
                    gene_variant_counts[gene] = gene_variant_counts.get(gene, 0) + 1
    
    available = []
    unavailable = []
    
    for gene, drug in GENE_DRUG_MAP.items():
        if gene in detected_genes:
            available.append({
                "drug": drug,
                "gene": gene,
                "variants_found": gene_variant_counts[gene],
                "has_actionable_variants": True
            })
        else:
            unavailable.append({
                "drug": drug,
                "gene": gene,
                "reason": f"{gene} variants not found in VCF"
            })
    
    return patient_id, available, unavailable, list(detected_genes)
