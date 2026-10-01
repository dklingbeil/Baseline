"""Explanation layer: turn a detected deviation into human-readable text."""

from .base import Explainer
from .llm import LLMExplainer
from .template import TemplateExplainer

__all__ = ["Explainer", "LLMExplainer", "TemplateExplainer"]
