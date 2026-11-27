"""Tag bills, meetings and floor statements with policy topics.

Matching is by keyword on the English text (the portal's own English, or the
machine translation), with a few Nepali stems as a fallback for text that is
not translated yet. A text can have several topics.
"""
import re

# slug: (label, English keywords, Nepali stems)
TOPICS = {
    "health": ("Health", ["health", "hospital", "medic", "disease", "motherhood", "reproductive", "nurse", "doctor", "pharma", "drug", "epidemic", "infant", "milk substitute"],
               ["स्वास्थ्य", "अस्पताल", "रोग", "औषधि", "मातृत्व"]),
    "education": ("Education", ["education", "school", "universit", "student", "teacher", "academ", "examination", "scholarship"],
                  ["शिक्षा", "विद्यालय", "विश्वविद्यालय", "विद्यार्थी", "शिक्षक"]),
    "economy": ("Economy and budget", ["budget", "appropriation", "tax", "revenue", "loan", "debt", "investment", "financ", "bank", "cooperative",
                                        "economic", "fiscal", "monetary", "trade", "industr", "insurance", "capital market", "inflation", "fund", "mine", "mineral", "payment", "provident"],
                ["बजेट", "विनियोजन", "कर ", "राजस्व", "ऋण", "लगानी", "वित्त", "बैंक", "सहकारी", "आर्थिक", "उद्योग", "बीमा"]),
    "agriculture": ("Agriculture and food", ["agricultur", "farm", "livestock", "animal", "crop", "fertili", "irrigation", "food", "seed", "dairy"],
                    ["कृषि", "किसान", "पशु", "मल", "सिँचाइ", "सिंचाइ", "खाद्य", "बीउ"]),
    "justice": ("Law and justice", ["justice", "court", "judici", "crime", "criminal", "penal", "prosecut", "prison", "human rights", "constitution", "legal aid", "laundering"],
                ["न्याय", "अदालत", "अपराध", "फौजदारी", "कारागार", "मानव अधिकार", "संविधान"]),
    "security": ("Security and defence", ["defen", "army", "military", "police", "(?<!social )security", "armed", "border", "disaster"],
                 ["रक्षा", "सेना", "प्रहरी", "सुरक्षा", "सीमा", "विपद्"]),
    "foreign": ("Foreign affairs and treaties", ["foreign affairs", "external affairs", "treaty", "convention", "international", "united nations", "diplomat",
                                                  "india", "china", "bilateral", "agreement on", "protocol"],
                ["परराष्ट्र", "सन्धि", "महासन्धि", "अन्तर्राष्ट्रिय", "भारत", "चीन", "कूटनीति"]),
    "labour": ("Jobs and migration", ["labour", "labor", "worker", "employment", "job", "migrant", "migration", "passport", "remittance", "wage", "trade union"],
               ["श्रम", "श्रमिक", "रोजगार", "वैदेशिक", "राहदानी", "पारिश्रमिक", "ज्याला"]),
    "social": ("Women, children and inclusion", ["women", "child", "girl", "gender", "trafficking", "dalit", "disab", "senior citizen", "elderly",
                                                 "social security", "indigenous", "minorit", "inclusion", "marginal", "untouchab", "discrimination"],
               ["महिला", "बालबालिका", "बाल ", "लैङ्गिक", "बेचबिखन", "दलित", "अपाङ्ग", "ज्येष्ठ नागरिक", "सामाजिक सुरक्षा", "आदिवासी", "छुवाछुत", "भेदभाव"]),
    "environment": ("Environment and climate", ["environment", "climate", "forest", "waste", "pollution", "biodiversity", "marine", "wildlife", "conservation", "river"],
                    ["वातावरण", "जलवायु", "वन ", "फोहोर", "प्रदूषण", "जैविक विविधता", "संरक्षण", "नदी"]),
    "infrastructure": ("Roads, transport and building", ["road", "transport\\b", "public transport", "highway", "bridge", "railway", "aviation", "airport", "air service", "airline", "engineering", "vehicle",
                                                          "construction", "building", "housing", "urban", "traffic\\b"],
                       ["सडक", "यातायात", "राजमार्ग", "पुल", "रेल", "हवाई", "विमानस्थल", "वायुसेवा", "सवारी", "निर्माण", "भवन", "आवास", "शहरी"]),
    "energy": ("Energy and water", ["energy", "electricity", "hydro", "power", "drinking water", "water supply", "fuel", "petroleum", "solar"],
               ["ऊर्जा", "उर्जा", "विद्युत", "बिजुली", "जलविद्युत", "खानेपानी", "इन्धन", "पेट्रोलियम"]),
    "governance": ("Governance and corruption", ["corruption", "governance", "accountab", "transparen", "civil service", "public office", "ordinance",
                                                  "commission", "audit", "public procurement", "bureaucra", "misuse"],
                   ["भ्रष्टाचार", "सुशासन", "जवाफदेही", "पारदर्शी", "निजामती", "अध्यादेश", "आयोग", "लेखापरीक्षण", "खरिद"]),
    "federalism": ("Provinces and local government", ["province", "provincial", "local level", "local government", "municipal", "federal", "ward"],
                   ["प्रदेश", "स्थानीय तह", "स्थानीय सरकार", "नगरपालिका", "गाउँपालिका", "सङ्घीय", "संघीय"]),
    "technology": ("Technology and media", ["digital", "technolog", "internet", "cyber", "telecom", "information technology", "social media", "media\\b", "press\\b", "broadcast"],
                   ["डिजिटल", "प्रविधि", "इन्टरनेट", "साइबर", "दूरसञ्चार", "सञ्चार", "पत्रकार"]),
    "tourism": ("Tourism and culture", ["touris", "culture", "heritage", "sport", "religio", "festival", "language"],
                ["पर्यटन", "संस्कृति", "सम्पदा", "खेलकुद", "धर्म", "भाषा"]),
    "elections": ("Elections", ["election", "electoral", "voter", "ballot", "polling"], ["निर्वाचन", "मतदाता", "मतदान"]),
    "parliament": ("How parliament runs", ["house rules", "rules of procedure", "house of representatives rules", "parliamentary", "committee report", "speaker", "rules drafting committee"],
                   ["नियमावली", "संसदीय", "सभामुख"]),
}
LABELS = {k: v[0] for k, v in TOPICS.items()}
LABELS_NE = {
    "health": "स्वास्थ्य", "education": "शिक्षा", "economy": "अर्थतन्त्र र बजेट", "agriculture": "कृषि र खाद्य",
    "justice": "कानुन र न्याय", "security": "सुरक्षा र रक्षा", "foreign": "परराष्ट्र र सन्धि", "labour": "रोजगार र वैदेशिक रोजगारी",
    "social": "महिला, बालबालिका र समावेशिता", "environment": "वातावरण र जलवायु", "infrastructure": "सडक, यातायात र भवन",
    "energy": "ऊर्जा र खानेपानी", "governance": "सुशासन र भ्रष्टाचार", "federalism": "प्रदेश र स्थानीय तह",
    "technology": "प्रविधि र सञ्चार", "tourism": "पर्यटन र संस्कृति", "elections": "निर्वाचन", "parliament": "संसद सञ्चालन",
}

# English keywords may carry a little regex (\\b, a lookbehind); everything else is literal.
_EN = {k: re.compile(r"\b(?:" + "|".join(w if "\\" in w or "(?" in w else re.escape(w) for w in en) + ")", re.I)
       for k, (_, en, _) in TOPICS.items()}
_NE = {k: re.compile("|".join(re.escape(w) for w in ne)) for k, (_, _, ne) in TOPICS.items()}


def tag(en=None, ne=None):
    """Topic slugs, in TOPICS order. en: English text (or texts); ne: the Nepali,
    used only when there is no English to go on."""
    en = " ".join(t for t in ([en] if isinstance(en, str) else en or []) if t)
    if en:
        return [k for k in TOPICS if _EN[k].search(en)]
    ne = " ".join(t for t in ([ne] if isinstance(ne, str) else ne or []) if t)
    return [k for k in TOPICS if ne and _NE[k].search(ne + " ")]
