import os
import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from google import genai
except ImportError:
    genai = None  # type: ignore

from src.infrastructure.database.models.incident_embedding import IncidentEmbeddingRecord

logger = logging.getLogger(__name__)


class IncidentRAGService:
    """
    Retrieval-Augmented Generation (RAG) Service for AI Logistics Brain.
    Stores and queries vector embeddings in PostgreSQL (PgVector) using
    Google's text-embedding-004 model.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.client = None
        if genai and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client for RAG embeddings: {e}")
        self.embedding_model = "text-embedding-004"

    async def _get_embedding(self, text: str) -> list[float]:
        """Calls Gemini API to convert text into a 768-dim vector."""
        if self.client:
            try:
                response = await self.client.aio.models.embed_content(
                    model=self.embedding_model,
                    contents=text,
                )
                if response.embeddings and len(response.embeddings) > 0:
                    return response.embeddings[0].values
            except Exception as e:
                logger.warning(f"Gemini embedding API call failed: {e}. Using deterministic fallback vector.")

        # Deterministic 768-dim fallback vector for testing & offline mode
        seed_hash = sum(ord(c) for c in text) % 1000
        return [((i + seed_hash) % 100) / 100.0 for i in range(768)]

    async def store_incident_memory(
        self,
        session: AsyncSession,
        incident_id: str,
        context_summary: str,
        resolution_notes: str,
    ):
        """
        Called when an incident is successfully resolved.
        Embeds the incident details and stores it in PgVector.
        """
        full_text = f"Incident Context: {context_summary}\nResolution: {resolution_notes}"

        try:
            vector = await self._get_embedding(full_text)

            record = IncidentEmbeddingRecord(
                incident_id=incident_id,
                incident_summary=full_text,
                embedding=vector,
            )
            # Merge or add to avoid duplicate key error
            await session.merge(record)
            await session.commit()
            logger.info(f"Stored RAG memory for incident {incident_id}")
        except Exception as e:
            logger.warning(f"Failed to store incident memory for {incident_id}: {e}")

    async def get_similar_historical_incidents(
        self,
        session: AsyncSession,
        current_context_text: str,
        limit: int = 3,
    ) -> List[str]:
        """
        Takes the current live incident, vectorizes it, and performs a 
        Cosine Distance (<=>) search in PostgreSQL to find past matches.
        """
        try:
            query_vector = await self._get_embedding(current_context_text)

            # Check if running against SQLite or Postgres
            bind = session.bind
            if bind and bind.dialect.name != "postgresql":
                # SQLite fallback
                stmt = select(IncidentEmbeddingRecord).limit(limit)
                result = await session.scalars(stmt)
                records = result.all()
                return [r.incident_summary for r in records]

            # PostgreSQL PgVector Cosine Distance search
            stmt = (
                select(IncidentEmbeddingRecord)
                .order_by(IncidentEmbeddingRecord.embedding.cosine_distance(query_vector))
                .limit(limit)
            )
            result = await session.scalars(stmt)
            records = result.all()
            return [record.incident_summary for record in records]
        except Exception as e:
            logger.warning(f"RAG retrieval query error: {e}")
            return []


# Singleton instantiation
rag_service = IncidentRAGService()
