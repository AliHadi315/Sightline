"""Last-N observation memory with change detection and repetition suppression."""
import difflib
import re
from collections import deque

import config


def normalize(text: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", (text or "").lower()).split())


def similarity(a: str, b: str) -> float:
    """0..1 similarity of two descriptions after normalization."""
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


class Memory:
    """Remembers the last few observations per mode. Deep-copyable, no external deps."""

    def __init__(self, size: int = config.MEMORY_SIZE):
        self._items = deque(maxlen=size)

    def context(self, mode: str) -> list[dict]:
        """Observations of this mode, oldest first, for the model prompt."""
        return [dict(i) for i in self._items if i["mode"] == mode]

    def last(self, mode: str) -> dict | None:
        items = self.context(mode)
        return items[-1] if items else None

    def is_repeat(self, result: dict, mode: str, threshold: float = config.SIMILARITY_THRESHOLD) -> bool:
        """True if the model reported no change or the description is nearly identical to the last one."""
        description = (result.get("description") or "").strip()
        if not description:
            return True
        prev = self.last(mode)
        if prev is None:
            return False
        return similarity(description, prev["description"]) >= threshold

    def remember(self, result: dict, mode: str) -> None:
        self._items.append({
            "mode": mode,
            "description": (result.get("description") or "").strip(),
            "objects": [str(o) for o in (result.get("objects") or [])],
        })

    def clear(self) -> None:
        self._items.clear()


if __name__ == "__main__":
    m = Memory(size=3)
    first = {"description": "A laptop sits on the desk in front of you, with a mug to the right.", "objects": ["laptop", "mug"]}
    assert not m.is_repeat(first, "scene")
    m.remember(first, "scene")
    assert m.is_repeat({"description": ""}, "scene"), "empty description must count as no change"
    assert m.is_repeat({"description": "A laptop sits on the desk in front of you with a mug to the right"}, "scene")
    assert not m.is_repeat({"description": "The mug is gone. A phone now lies to your left."}, "scene")
    assert not m.is_repeat(first, "read"), "modes are tracked separately"
    for i in range(5):
        m.remember({"description": f"observation {i}", "objects": []}, "scene")
    assert len(m.context("scene")) == 3, "only the last three are kept"
    assert m.context("read") == []
    print("memory ok")
