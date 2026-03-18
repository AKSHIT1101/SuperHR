"""
embeddings.py  —  Local sentence-transformers embeddings.

Model : all-MiniLM-L6-v2
Dims  : 384
Device: CPU (no GPU required)

The model is downloaded once on first use and cached by sentence-transformers
in ~/.cache/huggingface/. Subsequent calls load from cache instantly.
"""

import logging
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
#  Singleton model loader                                              #
# ------------------------------------------------------------------ #

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model loaded.")
    return _model


# ------------------------------------------------------------------ #
#  Public API                                                          #
# ------------------------------------------------------------------ #

def embed_text(text: str) -> List[float]:
    """
    Returns a single 384-dim embedding for the given text.
    Empty/whitespace-only input returns a zero vector.
    """
    if not text or not text.strip():
        return [0.0] * 384

    model = _get_model()
    vec: np.ndarray = model.encode(text.strip(), convert_to_numpy=True)
    return vec.tolist()


def embed_texts_batch(texts: List[str]) -> List[List[float]]:
    """
    Returns 384-dim embeddings for a list of texts in one batch call.
    Empty/None entries get zero vectors.
    """
    if not texts:
        return []

    zero = [0.0] * 384
    clean = [t.strip() if t and t.strip() else None for t in texts]
    non_empty_indices = [i for i, t in enumerate(clean) if t is not None]
    non_empty_texts   = [clean[i] for i in non_empty_indices]

    result = [zero[:] for _ in texts]
    if not non_empty_texts:
        return result

    model = _get_model()
    vecs: np.ndarray = model.encode(non_empty_texts, convert_to_numpy=True, batch_size=64)

    for idx, vec in zip(non_empty_indices, vecs):
        result[idx] = vec.tolist()

    return result