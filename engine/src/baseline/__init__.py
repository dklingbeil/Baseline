"""Baseline: a multimodal personal baseline engine.

Data flow: sources -> encoders -> fusion -> daily state z(t) -> temporal
baseline B(t) -> change detector -> explainer -> user feedback.
"""
