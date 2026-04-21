import asyncio
import json
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 2.0

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


class OllamaUnavailableError(RuntimeError):
    """Raised when Ollama cannot be reached after retries."""


async def classify_document(ocr_text: str) -> dict:
    """Classify a document using a local Ollama model based on its OCR text.

    Retries transient connection errors with exponential backoff before
    surfacing a human-readable failure.

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

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{settings.ollama_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
            content = response.json()["message"]["content"]
            result = json.loads(content)
            break
        except (httpx.ConnectError, httpx.ReadError, httpx.RemoteProtocolError) as e:
            last_error = e
            logger.warning(
                "Ollama connection failed (attempt %d/%d): %s",
                attempt, MAX_RETRIES, e,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * attempt)
        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500 and attempt < MAX_RETRIES:
                last_error = e
                logger.warning(
                    "Ollama 5xx (attempt %d/%d): %s",
                    attempt, MAX_RETRIES, e,
                )
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            raise
    else:
        raise OllamaUnavailableError(
            f"Moteur IA local injoignable après {MAX_RETRIES} tentatives. "
            f"Vérifiez qu'Ollama tourne ({settings.ollama_url})."
        ) from last_error

    # Ensure required fields exist
    required = ["document_type", "date", "client_name", "confidence_score", "summary"]
    for field in required:
        if field not in result:
            result[field] = None if field != "confidence_score" else 0.5

    if result.get("document_type") not in VALID_TYPES:
        result["document_type"] = "Autre"

    return result
