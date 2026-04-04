import json
from mistralai import Mistral
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

CLASSIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "document_type": {
            "type": "string",
            "enum": [
                "Facture", "Devis", "Contrat", "Relevé Bancaire",
                "Bulletin de Paie", "Avis d'Imposition", "Attestation",
                "Kbis", "RIB", "Ordonnance", "Courrier", "Autre"
            ]
        },
        "date": {"type": ["string", "null"]},
        "client_name": {"type": ["string", "null"]},
        "confidence_score": {"type": "number", "minimum": 0, "maximum": 1},
        "summary": {"type": "string", "maxLength": 100}
    },
    "required": ["document_type", "date", "client_name", "confidence_score", "summary"]
}

MAX_TEXT_LENGTH = 4000


def _get_client() -> Mistral:
    return Mistral(api_key=settings.mistral_api_key)


async def classify_document(ocr_text: str) -> dict:
    """Classify a document using Mistral AI based on its OCR text.

    Returns a dict with: document_type, date, client_name, confidence_score, summary.
    """
    if not settings.mistral_api_key:
        raise RuntimeError("Mistral API key not configured")

    # Truncate text to limit token usage
    truncated = ocr_text[:MAX_TEXT_LENGTH] if len(ocr_text) > MAX_TEXT_LENGTH else ocr_text

    client = _get_client()

    response = await client.chat.complete_async(
        model="mistral-small-latest",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Voici le texte extrait du document:\n\n{truncated}"},
        ],
        response_format={
            "type": "json_object",
        },
        temperature=0.1,
    )

    content = response.choices[0].message.content
    result = json.loads(content)

    # Validate required fields
    required = ["document_type", "date", "client_name", "confidence_score", "summary"]
    for field in required:
        if field not in result:
            result[field] = None if field != "confidence_score" else 0.5

    if result.get("document_type") not in [
        "Facture", "Devis", "Contrat", "Relevé Bancaire",
        "Bulletin de Paie", "Avis d'Imposition", "Attestation",
        "Kbis", "RIB", "Ordonnance", "Courrier", "Autre"
    ]:
        result["document_type"] = "Autre"

    return result
