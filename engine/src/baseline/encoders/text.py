from ..schemas import TextEntry


def encode_text(t: TextEntry) -> dict[str, float]:
    """Placeholder language features.

    TODO: replace with a pretrained multilingual (EN/DE) sentence encoder,
    reduced to a few per-user dimensions, and register those dimensions in
    `state.FEATURES`. The raw text is not persisted after encoding.
    """
    return {"text_words": float(len(t.text.split()))}
