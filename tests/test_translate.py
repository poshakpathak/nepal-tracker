from tracker.translate import english, segments


def test_segments_split_on_danda_and_lines():
    text = "आज बैठक बस्यो । विधेयक पारित भयो।\n२. अन्य"
    assert segments(text) == ["आज बैठक बस्यो ।", "विधेयक पारित भयो।", "२. अन्य"]


def test_english_needs_every_sentence():
    text = "आज बैठक बस्यो । विधेयक पारित भयो।\n२. अन्य"
    cache = {"आज बैठक बस्यो ।": "The meeting sat today.", "विधेयक पारित भयो।": "The bill passed."}
    assert english(text, cache) is None
    cache["२. अन्य"] = "2. Other"
    assert english(text, cache) == "The meeting sat today. The bill passed.\n2. Other"


def test_english_skips_text_without_nepali():
    assert english("Already English", {}) is None
    assert english(None, {}) is None
