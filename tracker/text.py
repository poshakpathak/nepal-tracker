"""Small text helpers: Devanagari digits, whitespace, numbers."""
import re

_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def ascii_digits(s: str) -> str:
    return (s or "").translate(_DIGITS)


def clean(s) -> str:
    if s is None:
        return ""
    return " ".join(str(s).split())


def to_int(s):
    m = re.search(r"-?\d+", ascii_digits(clean(s)).replace(",", ""))
    return int(m.group()) if m else None


def strip_honorific(name: str) -> str:
    """'Hon. Dr. Jane Doe' -> 'Jane Doe'; 'मा. डा. ...' -> '...'."""
    name = clean(name)
    name = re.sub(r"^(Rt\.\s*)?Hon(ourable|\.)?\s*", "", name)
    name = re.sub(r"^(सम्माननीय|मा\.)\s*", "", name)
    return name
