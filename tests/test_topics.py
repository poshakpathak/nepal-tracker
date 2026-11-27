from tracker.topics import tag


def test_english_keywords():
    assert tag("Safe Motherhood and Reproductive Health Rights Bill") == ["health"]
    assert tag("Appropriation Bill, 2083") == ["economy"]


def test_false_friends_are_avoided():
    assert tag("Human Trafficking and Transportation (Control) Bill") == ["social"]
    assert "security" not in tag("Women, Children and Social Security Act")
    assert tag("Mediation (Second Amendment) Bill") == []


def test_nepali_only_when_no_english():
    assert tag(None, "सङ्क्रामक पशु रोग (नियन्त्रण) विधेयक") == ["health", "agriculture"]
    assert tag("Road Safety Act", "राष्ट्रिय सडक सुरक्षा ऐन") == ["infrastructure"]
