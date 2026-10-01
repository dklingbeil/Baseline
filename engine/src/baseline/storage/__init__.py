"""Two stores, kept apart: who someone is, and what Baseline knows about them.

They share only a pseudonymous subject id. In production they are separate
EU-hosted databases with separate credentials; these in-memory versions
define the interface.
"""

from .identity import IdentityStore
from .wellbeing import FeedbackRecord, WellbeingStore

__all__ = ["FeedbackRecord", "IdentityStore", "WellbeingStore"]
