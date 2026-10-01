import uuid


class IdentityStore:
    """Account identity -> pseudonymous subject id. Nothing else lives here."""

    def __init__(self) -> None:
        self._subject_by_email: dict[str, str] = {}

    def subject_for(self, email: str) -> str:
        key = email.strip().lower()
        if key not in self._subject_by_email:
            self._subject_by_email[key] = uuid.uuid4().hex
        return self._subject_by_email[key]

    def delete(self, subject_id: str) -> None:
        self._subject_by_email = {
            e: s for e, s in self._subject_by_email.items() if s != subject_id
        }
