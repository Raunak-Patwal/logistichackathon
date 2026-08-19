from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from src.infrastructure.database.models.base import Base


class IncidentEmbeddingRecord(Base):
    """
    Stores vector embeddings of resolved incidents for AI RAG memory.
    Uses a 768-dimensional vector matching Google text-embedding-004.
    """
    __tablename__ = "incident_embeddings"

    incident_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    incident_summary: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(768))
