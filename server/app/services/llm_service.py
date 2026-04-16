import json
import httpx
from app.config import get_settings

settings = get_settings()

SYSTEM_PROMPT = """Tu es un assistant spécialisé dans la classification de documents administratifs français.

Analyse le texte OCR fourni et classifie le document. Tu dois identifier:
1. Le type de document parmi: Facture, Devis, Contrat, Relevé Bancaire, Bulletin de Paie, Avis d'Imposition, Attestation, Kbis, RIB, Ordonnance, Courrier, Autre
2. La date du document (format ISO: YYYY-MM-DD) si visible
3. Le nom du client, de l'entreprise ou de la personne concernée
4. Un résumé en 10 mots maximum

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "document_type": "string",
  "date": "YYYY-MM-DD ou null",
  "client_name": "string ou null",
  "confidence_score": 0.0 à 1.0,
  "summary": "string (max 10 mots)"
}"""

VALID_TYPES = [
    "Facture", "Devis", "Contrat", "Relevé Bancaire",
    "Bulletin de Paie", "Avis d'Imposition", "Attestation",
    "Kbis", "RIB", "Ordonnance", "Courrier", "Autre"
]

MAX_TEXT_LENGTH = 4000


async def classify_document(ocr_text: str) -> dict:
    """Classify a document using a local Ollama model based on its OCR text.

    Returns a dict with: document_type, date, client_name, confidence_score, summary.
    """
    truncated = ocr_text[:MAX_TEXT_LENGTH] if len(ocr_text) > MAX_TEXT_LENGTH else ocr_text

    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Voici le texte extrait du document:\n\n{truncated}"},
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.ollama_url}/api/chat",
            json=payload,
        )
        response.raise_for_status()

    content = response.json()["message"]["content"]
    result = json.loads(content)

    # Ensure required fields exist
    required = ["document_type", "date", "client_name", "confidence_score", "summary"]
    for field in required:
        if field not in result:
            result[field] = None if field != "confidence_score" else 0.5

    if result.get("document_type") not in VALID_TYPES:
        result["document_type"] = "Autre"

    return result
