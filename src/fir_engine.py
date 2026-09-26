"""
fir_engine.py
-------------
Dedicated FIR (First Information Report) module for CNIS Phase 4.

Provides persistent, searchable, and auditable operational intake records.
Enforces strict epistemic boundaries:
  - FIR allegations are intake statements, NOT judicial findings of guilt.
  - Linked entities/evidence are investigator cross-references, NOT automated NLP extractions.
  - FIR mentions do NOT automatically create graph edges or criminal conspiracy findings.
  - Primary legal reference is BNS (Bharatiya Nyaya Sanhita, 2023) with legacy IPC cross-references.
  - All legal provisions are flagged as 'Pending Officer Review'.

Persistence:
  File-backed storage in data/fir_records.json using atomic file-writes (tempfile + os.replace).
  Architectural note: Single-node file-backed persistence. Does not provide distributed multi-process
  ACID locking.
"""

from __future__ import annotations

import os
import json
import uuid
import tempfile
import re
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple


# Default storage path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_FIR_STORAGE_PATH = os.path.join(BASE_DIR, "data", "fir_records.json")


# ─── BNS (Bharatiya Nyaya Sanhita, 2023) & IPC Canonical Catalog ────────────

BNS_IPC_CATALOG = [
    # 1. Conspiracy & Abetment
    {
        "bns_section": "BNS Section 61(2)",
        "ipc_legacy_section": "IPC Section 120B",
        "offense_name": "Criminal Conspiracy",
        "category": "Conspiracy",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life, rigorous imprisonment or fine as per offense",
        "description": "Criminal conspiracy to commit an offense punishable with death, life imprisonment, or rigorous imprisonment.",
        "keywords": ["conspiracy", "conspire", "shadyantra", "syndicate", "gang", "planning", "partner", "racket", "collusion", "conspirators"],
    },
    {
        "bns_section": "BNS Section 45",
        "ipc_legacy_section": "IPC Section 109",
        "offense_name": "Abetment of an Offence",
        "category": "Abetment",
        "bailable": "Depends on Offense",
        "cognizable": "Cognizable",
        "punishment": "Same punishment as the committed offense",
        "description": "Instigating, engaging in conspiracy, or intentionally aiding the commission of an offense.",
        "keywords": ["abetment", "abet", "instigate", "uksaana", "aiding", "helped commit", "facilitated", "accomplice"],
    },

    # 2. Financial Fraud, Breach of Trust & Cheating
    {
        "bns_section": "BNS Section 318(4)",
        "ipc_legacy_section": "IPC Section 420",
        "offense_name": "Cheating and Dishonestly Inducing Delivery of Property",
        "category": "Financial Fraud",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 7 years and fine",
        "description": "Cheating and thereby dishonestly inducing the person deceived to deliver property or alter valuable security.",
        "keywords": ["cheat", "cheating", "fraud", "scam", "dhokha", "dhokhadhadi", "fraudulent", "misrepresent", "invest", "ponzi", "fund diversion", "fake promise", "money scam", "lakh", "crore", "bank fraud", "hawala"],
    },
    {
        "bns_section": "BNS Section 319(2)",
        "ipc_legacy_section": "IPC Section 419",
        "offense_name": "Cheating by Personation",
        "category": "Financial Fraud",
        "bailable": "Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 5 years, or fine, or both",
        "description": "Cheating by pretending to be some other person, or knowingly substituting one person for another.",
        "keywords": ["impersonation", "personation", "impersonate", "fake identity", "poosing as officer", "nakli officer", "fake name", "identity fraud", "caller ID scam"],
    },
    {
        "bns_section": "BNS Section 316(2)",
        "ipc_legacy_section": "IPC Section 406",
        "offense_name": "Criminal Breach of Trust",
        "category": "Breach of Trust",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 5 years, or fine, or both",
        "description": "Dishonest misappropriation, conversion, or illegal use of entrusted property.",
        "keywords": ["breach of trust", "entrusted", "trust", "amanat me khayanat", "misappropriate", "funds held", "custody", "fiduciary"],
    },
    {
        "bns_section": "BNS Section 316(5)",
        "ipc_legacy_section": "IPC Section 409",
        "offense_name": "Criminal Breach of Trust by Public Servant, Banker, Merchant or Agent",
        "category": "Financial Fraud",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life, or up to 10 years and fine",
        "description": "Entrusted property dishonestly misappropriated by a banker, public servant, merchant, factor, broker, attorney, or agent.",
        "keywords": ["public servant", "banker", "merchant", "agent", "bank manager", "official funds", "treasury", "corporate officer", "breach of trust"],
    },
    {
        "bns_section": "BNS Section 314",
        "ipc_legacy_section": "IPC Section 403",
        "offense_name": "Dishonest Misappropriation of Property",
        "category": "Property Crime",
        "bailable": "Bailable",
        "cognizable": "Non-Cognizable",
        "punishment": "Imprisonment up to 2 years, or fine, or both",
        "description": "Dishonestly misappropriating or converting to own use any movable property.",
        "keywords": ["misappropriation", "conversion", "found property", "keeps money", "unclaimed funds", "pocketed money"],
    },

    # 3. Document Fraud, Forgery & Counterfeiting
    {
        "bns_section": "BNS Section 336(3)",
        "ipc_legacy_section": "IPC Section 465",
        "offense_name": "Forgery",
        "category": "Document Fraud",
        "bailable": "Bailable",
        "cognizable": "Non-Cognizable",
        "punishment": "Imprisonment up to 2 years, or fine, or both",
        "description": "Making false documents or electronic records with intent to cause damage or conduct fraud.",
        "keywords": ["forgery", "forged", "fake document", "fake certificate", "nakli kaagaz", "farzi document", "tampered", "altered signature", "fabricated"],
    },
    {
        "bns_section": "BNS Section 338",
        "ipc_legacy_section": "IPC Section 468",
        "offense_name": "Forgery for Purpose of Cheating",
        "category": "Document Fraud",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 7 years and fine",
        "description": "Committing forgery intending that the forged document or electronic record shall be used for cheating.",
        "keywords": ["forgery cheating", "forged for cheat", "fake stamp", "fake seal", "fake degree", "fake loan document", "fake invoice", "farzi bill"],
    },
    {
        "bns_section": "BNS Section 340(2)",
        "ipc_legacy_section": "IPC Section 471",
        "offense_name": "Using as Genuine a Forged Document or Electronic Record",
        "category": "Document Fraud",
        "bailable": "Depends on Forged Document",
        "cognizable": "Cognizable",
        "punishment": "Same punishment as if the document was forged by the user",
        "description": "Fraudulently or dishonestly using any document or electronic record known to be forged.",
        "keywords": ["used forged document", "submitted fake paper", "fake id submitted", "forged passbook", "fake land paper", "fake registry"],
    },
    {
        "bns_section": "BNS Section 178",
        "ipc_legacy_section": "IPC Section 489A",
        "offense_name": "Counterfeiting Currency Notes or Bank Notes (FICN)",
        "category": "Document Fraud",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life, or up to 10 years and fine",
        "description": "Counterfeiting or knowingly performing any part of the process of counterfeiting currency notes or bank notes.",
        "keywords": ["counterfeit", "fake currency", "fake note", "ficn", "nakli note", "fake Indian currency", "printing notes", "fake notes"],
    },

    # 4. Property Crimes, Theft, Robbery & Dacoity
    {
        "bns_section": "BNS Section 303(2)",
        "ipc_legacy_section": "IPC Section 379",
        "offense_name": "Theft",
        "category": "Property Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 3 years, or fine, or both",
        "description": "Dishonestly taking any movable property out of the possession of any person without consent.",
        "keywords": ["theft", "stolen", "thief", "chori", "chor", "stole", "pocketed", "stole vehicle", "bike theft", "car theft", "jewelry theft"],
    },
    {
        "bns_section": "BNS Section 305",
        "ipc_legacy_section": "IPC Section 380",
        "offense_name": "Theft in Dwelling House, Building, or Vessel",
        "category": "Property Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 7 years and fine",
        "description": "Committing theft in any building, tent, vessel used as a human dwelling or for custody of property.",
        "keywords": ["house theft", "burglary theft", "stolen from house", "ghar me chori", "shop theft", "store robbery", "cash counter theft"],
    },
    {
        "bns_section": "BNS Section 317",
        "ipc_legacy_section": "IPC Section 411",
        "offense_name": "Dishonestly Receiving Stolen Property",
        "category": "Stolen Property",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 3 years, or fine, or both",
        "description": "Dishonestly receiving or retaining stolen property, knowing or having reason to believe it to be stolen.",
        "keywords": ["stolen property", "bought stolen item", "chori ka samaan", "received stolen goods", "fencing stolen goods"],
    },
    {
        "bns_section": "BNS Section 309(4)",
        "ipc_legacy_section": "IPC Section 392",
        "offense_name": "Robbery",
        "category": "Property & Violent Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Rigorous imprisonment up to 10 years and fine",
        "description": "Theft accompanied by hurt, wrongful restraint, or fear of instant death/hurt.",
        "keywords": ["robbery", "robbed", "loott", "loot", "snatching at gunpoint", "knife robbery", "highway robbery", "looted cash"],
    },
    {
        "bns_section": "BNS Section 310(2)",
        "ipc_legacy_section": "IPC Section 395",
        "offense_name": "Dacoity",
        "category": "Property & Violent Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life, or rigorous imprisonment up to 10 years and fine",
        "description": "Robbery committed jointly by five or more persons.",
        "keywords": ["dacoity", "dakaiti", "gang robbery", "armed gang", "5 persons robbery", "bank dacoity", "cash van attack"],
    },

    # 5. Extortion, Threat & Violent Crimes
    {
        "bns_section": "BNS Section 308(2)",
        "ipc_legacy_section": "IPC Section 384",
        "offense_name": "Extortion",
        "category": "Violent / Threat Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 7 years, or fine, or both",
        "description": "Intentionally putting any person in fear of injury to dishonestly induce delivery of property or valuable security.",
        "keywords": ["extortion", "extort", "ransom", "hafta", "extortion call", "protection money", "threat call", "demanded ransom", "firoti"],
    },
    {
        "bns_section": "BNS Section 351(2)",
        "ipc_legacy_section": "IPC Section 506",
        "offense_name": "Criminal Intimidation",
        "category": "Violent / Threat Crime",
        "bailable": "Bailable",
        "cognizable": "Non-Cognizable",
        "punishment": "Imprisonment up to 2 years, or fine, or both (up to 7 years if threat to cause death)",
        "description": "Threatening another person with injury to their person, reputation, or property to cause alarm.",
        "keywords": ["threat", "dhamki", "intimidation", "death threat", "threatened to kill", "life threat", "abuse threat", "scared complainant"],
    },
    {
        "bns_section": "BNS Section 103(1)",
        "ipc_legacy_section": "IPC Section 302",
        "offense_name": "Murder",
        "category": "Violent Crime / Homicide",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Death or imprisonment for life, and fine",
        "description": "Intentionally causing death of a human being or causing bodily injury sufficient in the ordinary course of nature to cause death.",
        "keywords": ["murder", "killed", "killing", "hatya", "death", "laash", "dead body", "homicide", "fatal attack", "murdered"],
    },
    {
        "bns_section": "BNS Section 105",
        "ipc_legacy_section": "IPC Section 304",
        "offense_name": "Culpable Homicide Not Amounting to Murder",
        "category": "Violent Crime / Homicide",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life, or imprisonment up to 10 years and fine",
        "description": "Causing death with intention or knowledge, without premeditated intention required for murder.",
        "keywords": ["culpable homicide", "unintentional killing", "accidental death violence", "brawl death", "fatality in fight"],
    },
    {
        "bns_section": "BNS Section 109",
        "ipc_legacy_section": "IPC Section 307",
        "offense_name": "Attempt to Murder",
        "category": "Violent Crime / Homicide",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 10 years and fine (life imprisonment if hurt is caused)",
        "description": "Doing an act with intent and under circumstances that if death was caused, the accused would be guilty of murder.",
        "keywords": ["attempt to murder", "attempted murder", "fired shot", "shot at victim", "stabbed neck", "hatya ki koshish", "near fatal attack"],
    },
    {
        "bns_section": "BNS Section 115(2)",
        "ipc_legacy_section": "IPC Section 323",
        "offense_name": "Voluntarily Causing Hurt",
        "category": "Violent Crime / Assault",
        "bailable": "Bailable",
        "cognizable": "Non-Cognizable",
        "punishment": "Imprisonment up to 1 year, or fine up to Rs. 10,000, or both",
        "description": "Doing any act with the intention of causing hurt or knowledge that hurt is likely to be caused.",
        "keywords": ["hurt", "assault", "beating", "marpeet", "slapped", "punched", "minor injury", "thappad", "simple hurt"],
    },
    {
        "bns_section": "BNS Section 117(2)",
        "ipc_legacy_section": "IPC Section 325",
        "offense_name": "Voluntarily Causing Grievous Hurt",
        "category": "Violent Crime / Assault",
        "bailable": "Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 7 years and fine",
        "description": "Voluntarily causing severe injury including fractures, loss of sight/hearing, or life-threatening harm.",
        "keywords": ["grievous hurt", "severe injury", "bone fracture", "haddi todi", "head injury", "internal bleeding", "critical condition"],
    },
    {
        "bns_section": "BNS Section 118(1)",
        "ipc_legacy_section": "IPC Section 324/326",
        "offense_name": "Causing Hurt by Dangerous Weapons or Means",
        "category": "Violent Crime / Assault",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 10 years and fine",
        "description": "Causing hurt or grievous hurt using shooting, stabbing, cutting instruments, fire, poison, or corrosive substances.",
        "keywords": ["weapon attack", "dangerous weapon", "chaku", "knife attack", "acid attack", "iron rod", "talwar", "stabbing", "sword attack"],
    },
    {
        "bns_section": "BNS Section 137(2)",
        "ipc_legacy_section": "IPC Section 363",
        "offense_name": "Kidnapping",
        "category": "Violent Crime / Abduction",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 7 years and fine",
        "description": "Conveying any person beyond the limits of India or taking a minor out of lawful guardianship without consent.",
        "keywords": ["kidnapping", "kidnapped", "abduction", "abducted", "apharan", "missing child", "minor taken", "kidnap"],
    },
    {
        "bns_section": "BNS Section 140(2)",
        "ipc_legacy_section": "IPC Section 364A",
        "offense_name": "Kidnapping for Ransom",
        "category": "Violent Crime / Abduction",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Death or imprisonment for life, and fine",
        "description": "Kidnapping or detaining any person and threatening death or hurt to compel payment of ransom.",
        "keywords": ["kidnapping ransom", "ransom kidnap", "firoti apharan", "hostage ransom", "ransom call", "demanded 50 lakh ransom"],
    },

    # 6. Offenses Against Women & Children
    {
        "bns_section": "BNS Section 64",
        "ipc_legacy_section": "IPC Section 376",
        "offense_name": "Punishment for Rape / Sexual Assault",
        "category": "Offenses Against Women",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Rigorous imprisonment not less than 10 years extending to life, and fine",
        "description": "Committing sexual assault / rape as defined under BNS 63.",
        "keywords": ["sexual assault", "rape", "dushkaram", "forced physical relation", "molestation assault", "sexual violence"],
    },
    {
        "bns_section": "BNS Section 74",
        "ipc_legacy_section": "IPC Section 354",
        "offense_name": "Assault or Criminal Force to Woman with Intent to Outrage Modesty",
        "category": "Offenses Against Women",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment not less than 1 year extending up to 5 years, and fine",
        "description": "Assaulting or using criminal force against any woman intending to outrage her modesty.",
        "keywords": ["modesty outrage", " छेड़छाड़ ", "eve teasing", "harassment woman", "touching inappropriately", "stalking assault"],
    },
    {
        "bns_section": "BNS Section 85",
        "ipc_legacy_section": "IPC Section 498A",
        "offense_name": "Cruelty by Husband or Relatives of Husband",
        "category": "Offenses Against Women",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 3 years and fine",
        "description": "Subjecting a married woman to physical or mental cruelty by husband or in-laws.",
        "keywords": ["cruelty husband", "domestic violence", "patni harassment", "in laws torture", "498a cruelty", "marital abuse"],
    },
    {
        "bns_section": "BNS Section 86",
        "ipc_legacy_section": "IPC Section 304B",
        "offense_name": "Dowry Death",
        "category": "Offenses Against Women",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment not less than 7 years extending to life",
        "description": "Death of a woman caused by burns or bodily injury occurring within 7 years of marriage accompanied by dowry demand.",
        "keywords": ["dowry death", "dahej hatya", "dowry demand death", "in laws dowry", "suspicious death marriage"],
    },

    # 7. Organised Crime, Cyber Crime & Terrorism
    {
        "bns_section": "BNS Section 111",
        "ipc_legacy_section": "Special Legislation / IPC 120B",
        "offense_name": "Organised Crime Syndicate",
        "category": "Organised Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life or death, and fine not less than Rs. 5 Lakhs",
        "description": "Continuing unlawful activity including extortion, land grabbing, contract killing, economic offenses, cyber-crimes by syndicates.",
        "keywords": ["organised crime", "organized crime", "syndicate", "gangster", "mafia", "contract killing", "land grabbing", "crime syndicate", "underworld"],
    },
    {
        "bns_section": "BNS Section 112",
        "ipc_legacy_section": "IPC Special",
        "offense_name": "Petty Organised Crime",
        "category": "Organised Crime",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment not less than 1 year up to 7 years, and fine",
        "description": "Snatching, touting, illegal betting, unauthorized ticket sales, paper leaks committed by organized groups.",
        "keywords": ["petty organized crime", "snatching gang", "chain snatching", "illegal betting", "paper leak", "touting gang", "satta racket"],
    },
    {
        "bns_section": "BNS Section 113",
        "ipc_legacy_section": "UAPA / Special Acts",
        "offense_name": "Terrorist Act",
        "category": "Terrorist / State Security",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Death or life imprisonment, and fine",
        "description": "Acts threatening the unity, integrity, security, or sovereignty of India or striking terror in people.",
        "keywords": ["terrorist", "terrorism", "bomb blast", "explosive", "uapa", "terror funding", "anti national", "insurgency"],
    },
    {
        "bns_section": "IT Act Section 66D",
        "ipc_legacy_section": "IT Act 2000",
        "offense_name": "Cheating by Personation using Computer Resource",
        "category": "Cyber Crime",
        "bailable": "Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 3 years and fine up to 1 Lakh Rupees",
        "description": "Cheating by personation using any communication device or computer resource (cyber phishing, online scams).",
        "keywords": ["cyber crime", "online fraud", "otp scam", "phishing", "fake website", "apk scam", "whatsapp scam", "upi fraud", "cyber cheating", "computer fraud"],
    },
    {
        "bns_section": "IT Act Section 66C",
        "ipc_legacy_section": "IT Act 2000",
        "offense_name": "Identity Theft & Credential Hacking",
        "category": "Cyber Crime",
        "bailable": "Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 3 years and fine up to 1 Lakh Rupees",
        "description": "Fraudulently making use of electronic signature, password, or unique identification feature of any person.",
        "keywords": ["identity theft", "hacking", "password theft", "unauthorized access", "hacked account", "stolen credentials", "sim swap"],
    },

    # 8. Public Order & State Authority
    {
        "bns_section": "BNS Section 189(2)",
        "ipc_legacy_section": "IPC Section 143/147",
        "offense_name": "Unlawful Assembly & Rioting",
        "category": "Public Order",
        "bailable": "Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 2 years, or fine, or both",
        "description": "Member of an unlawful assembly or committing rioting.",
        "keywords": ["unlawful assembly", "rioting", "danga", "mob attack", "stone pelting", "public disturbance", "crowd violence", "protest riot"],
    },
    {
        "bns_section": "BNS Section 191(2)",
        "ipc_legacy_section": "IPC Section 148",
        "offense_name": "Rioting Armed with Deadly Weapon",
        "category": "Public Order",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment up to 3 years, or fine, or both",
        "description": "Guilty of rioting while armed with a deadly weapon or anything likely to cause death.",
        "keywords": ["armed rioting", "deadly weapon mob", "lathi attack mob", "weapon mob", "hathiyar danga"],
    },
    {
        "bns_section": "BNS Section 221",
        "ipc_legacy_section": "IPC Section 186",
        "offense_name": "Obstructing Public Servant in Discharge of Public Functions",
        "category": "Public Order",
        "bailable": "Bailable",
        "cognizable": "Non-Cognizable",
        "punishment": "Imprisonment up to 3 months, or fine up to Rs. 2,500, or both",
        "description": "Voluntarily obstructing any public servant in the discharge of public functions.",
        "keywords": ["obstructing police", "public servant obstruction", "sarkari kaam me badha", "prevented officer", "attacked police duty"],
    },
    {
        "bns_section": "BNS Section 152",
        "ipc_legacy_section": "IPC Section 124A (Sedition equivalent)",
        "offense_name": "Act Endangering Sovereignty, Unity and Integrity of India",
        "category": "Offenses Against State",
        "bailable": "Non-Bailable",
        "cognizable": "Cognizable",
        "punishment": "Imprisonment for life, or up to 7 years and fine",
        "description": "Purposely or knowingly exciting secession, armed rebellion, subversive activities, or encouraging feelings of separatist activities.",
        "keywords": ["sovereignty act", "subversive", "secessionist", "armed rebellion", "anti national act", "separatist"],
    },
]


# ─── Data Models ─────────────────────────────────────────────────────────────

@dataclass
class FIRAdministrativeInfo:
    fir_number: str
    police_station: str
    district: str
    state: str = "Maharashtra"
    registration_date: str = ""
    occurrence_date_from: str = ""
    occurrence_date_to: str = ""
    general_diary_ref: str = ""
    investigating_officer: str = ""
    officer_rank: str = "Inspector"
    officer_id: str = ""


@dataclass
class FIRComplainant:
    name: str
    contact_number: str = ""
    address: str = ""
    relationship_to_victim: str = "Self"
    complainant_role: str = "Aggrieved Person"


@dataclass
class FIRAccusedPerson:
    accused_id: str
    name: str
    alias: str = ""
    status: str = "Suspect"  # "Identified", "Unknown", "Suspect", "Named in FIR"
    identifiers: Dict[str, str] = field(default_factory=dict)
    alleged_role: str = ""
    epistemic_notice: str = (
        "Allegation recorded at intake; non-conclusive and subject to investigation. "
        "Presumption of innocence applies."
    )


@dataclass
class FIRIncidentInfo:
    incident_location: str
    jurisdiction: str
    incident_date: str
    incident_category: str
    summary: str


@dataclass
class FIRVictim:
    victim_id: str
    name: str
    contact: str = ""
    injuries_or_loss: str = ""


@dataclass
class FIRWitness:
    witness_id: str
    name: str
    contact: str = ""
    statement_summary: str = ""


@dataclass
class FIRPropertyEvidence:
    property_id: str
    item_type: str
    description: str
    seizure_memo_ref: str = ""
    linked_evidence_id: Optional[str] = None


@dataclass
class FIRLegalProvision:
    provision_id: str
    bns_section: str
    ipc_legacy_section: str
    offense_name: str
    review_status: str = "Pending Officer Review"  # "Pending Officer Review" | "Reviewed & Verified" | "Rejected"
    officer_notes: str = ""
    epistemic_notice: str = (
        "Provisional legal section recorded at intake; subject to judicial framing and police charge-sheet. "
        "Does not constitute legal finding of guilt."
    )


@dataclass
class FIRIntelligenceLinks:
    case_id: Optional[str] = None
    linked_entity_ids: List[str] = field(default_factory=list)
    linked_evidence_ids: List[str] = field(default_factory=list)
    linked_record_ids: List[str] = field(default_factory=list)
    provenance_note: str = (
        "Manual operational cross-reference. Does not represent automated NLP extraction or confirmed relational edge."
    )


@dataclass
class FIRAuditEntry:
    timestamp: str
    action: str  # "CREATED", "UPDATED", "STATUS_CHANGE", "REVIEWED"
    user: str = "Investigator"
    summary: str = ""


@dataclass
class FIRRecord:
    fir_id: str
    fir_number: str
    status: str = "Registered"  # "Registered", "Under Investigation", "Chargesheeted", "Disposed", "Transferred"
    created_at: str = ""
    updated_at: str = ""
    administrative: Dict[str, Any] = field(default_factory=dict)
    complainant: Dict[str, Any] = field(default_factory=dict)
    accused: List[Dict[str, Any]] = field(default_factory=list)
    incident: Dict[str, Any] = field(default_factory=dict)
    victims: List[Dict[str, Any]] = field(default_factory=list)
    witnesses: List[Dict[str, Any]] = field(default_factory=list)
    property_evidence: List[Dict[str, Any]] = field(default_factory=list)
    narrative: str = ""
    legal_provisions: List[Dict[str, Any]] = field(default_factory=list)
    intelligence_links: Dict[str, Any] = field(default_factory=dict)
    audit_trail: List[Dict[str, Any]] = field(default_factory=list)
    epistemic_guardrail: str = (
        "FIR records are statutory intake allegations submitted for police investigation. "
        "In accordance with Indian criminal jurisprudence, an FIR is not substantive evidence of guilt "
        "and cannot be treated as verified proof of conspiracy, syndication, or culpability."
    )
    epistemic_notice: str = (
        "FIR records reflect reported complaints and initial police registration. "
        "They do not constitute judicial determination of guilt."
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─── FIR Engine & Store ──────────────────────────────────────────────────────

class FIREngine:
    """
    Persistent, searchable FIR engine for CNIS Phase 4.

    Features:
      - Atomic JSON persistence via tempfile + os.replace.
      - Safe empty registry initialization (no synthetic records pre-seeded).
      - Inverted indexes for exact-match O(1) lookup (FIR ID, FIR #, Station, District, Case ID).
      - Bounded linear filtering for date range and full-text substring queries (O(N) over stored FIRs).
      - Strict epistemic notices preventing automatic guilt inferences or graph edge generation.
    """

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or DEFAULT_FIR_STORAGE_PATH
        self._records: Dict[str, FIRRecord] = {}  # fir_id -> FIRRecord
        self._index_by_number: Dict[str, str] = {}  # normalized fir_number -> fir_id
        self._index_by_station: Dict[str, List[str]] = {}
        self._index_by_district: Dict[str, List[str]] = {}
        self._index_by_case: Dict[str, List[str]] = {}
        self._index_by_category: Dict[str, List[str]] = {}
        self._index_by_accused: Dict[str, List[str]] = {}

        self._ensure_storage_and_load()

    # ─── Persistence Layer ───────────────────────────────────────────────────

    def _ensure_storage_and_load(self) -> None:
        """Initializes storage file safely if missing and loads existing records."""
        storage_dir = os.path.dirname(self.storage_path)
        if storage_dir and not os.path.exists(storage_dir):
            os.makedirs(storage_dir, exist_ok=True)

        if not os.path.exists(self.storage_path):
            # Initialize empty store per Phase 4 Refinement 1
            empty_payload = {
                "version": "1.0",
                "storage_type": "file_backed_json",
                "epistemic_limitation": (
                    "File-backed persistence layer for operational FIR intake records. "
                    "Not equivalent to an ACID distributed enterprise database; does not support multi-process concurrent write locking."
                ),
                "records": [],
            }
            self._write_file_atomically(empty_payload)

        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Reads persisted records and compiles in-memory indexes."""
        self._records.clear()
        self._index_by_number.clear()
        self._index_by_station.clear()
        self._index_by_district.clear()
        self._index_by_case.clear()
        self._index_by_category.clear()
        self._index_by_accused.clear()

        if not os.path.exists(self.storage_path):
            return

        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as exc:
            print(f"[FIREngine] Warning: failed to load FIR records from {self.storage_path}: {exc}")
            return

        records_raw = data.get("records", [])
        for r_data in records_raw:
            try:
                rec = FIRRecord(**r_data)
                self._records[rec.fir_id] = rec
                self._index_record(rec)
            except Exception as exc:
                print(f"[FIREngine] Warning: skipping invalid record: {exc}")

    def _write_file_atomically(self, payload: Dict[str, Any]) -> None:
        """
        Atomic write implementation: writes to temporary file in the same directory,
        flushes, and replaces target destination file atomically.
        """
        storage_dir = os.path.dirname(self.storage_path) or "."
        with tempfile.NamedTemporaryFile("w", dir=storage_dir, delete=False, encoding="utf-8") as tf:
            temp_name = tf.name
            json.dump(payload, tf, indent=2, ensure_ascii=False)
            tf.flush()
            os.fsync(tf.fileno())

        os.replace(temp_name, self.storage_path)

    def _persist(self) -> None:
        """Serializes current in-memory records to disk."""
        payload = {
            "version": "1.0",
            "storage_type": "file_backed_json",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "epistemic_limitation": (
                "File-backed persistence layer for operational FIR intake records. "
                "Not equivalent to an ACID distributed enterprise database; does not support multi-process concurrent write locking."
            ),
            "records": [rec.to_dict() for rec in self._records.values()],
        }
        self._write_file_atomically(payload)

    def to_dict(self) -> Dict[str, Any]:
        """Returns the full serialization dictionary of the FIR store."""
        return {
            "version": "1.0",
            "storage_type": "file_backed_json",
            "records": [rec.to_dict() for rec in self._records.values()],
        }

    # ─── Indexing ────────────────────────────────────────────────────────────

    def _index_record(self, rec: FIRRecord) -> None:
        """Indexes an FIR record for fast lookup."""
        fid = rec.fir_id
        fn_norm = rec.fir_number.strip().upper()
        self._index_by_number[fn_norm] = fid

        # Station
        st = (rec.administrative.get("police_station") or "").strip().lower()
        if st:
            self._index_by_station.setdefault(st, []).append(fid)

        # District
        dist = (rec.administrative.get("district") or "").strip().lower()
        if dist:
            self._index_by_district.setdefault(dist, []).append(fid)

        # Case ID
        cid = (rec.intelligence_links.get("case_id") or "").strip()
        if cid:
            self._index_by_case.setdefault(cid, []).append(fid)

        # Category
        cat = (rec.incident.get("incident_category") or "").strip().lower()
        if cat:
            self._index_by_category.setdefault(cat, []).append(fid)

        # Accused names
        for acc in rec.accused:
            aname = (acc.get("name") or "").strip().lower()
            if aname:
                self._index_by_accused.setdefault(aname, []).append(fid)

    def _rebuild_indexes(self) -> None:
        """Full index rebuild."""
        self._index_by_number.clear()
        self._index_by_station.clear()
        self._index_by_district.clear()
        self._index_by_case.clear()
        self._index_by_category.clear()
        self._index_by_accused.clear()
        for rec in self._records.values():
            self._index_record(rec)

    # ─── CRUD Operations ─────────────────────────────────────────────────────

    def create_fir(self, data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], Optional[str]]:
        """
        Creates a new FIR record with validation and atomic persistence.
        Returns: (success, record_dict, error_message)
        """
        admin = data.get("administrative", {})
        fir_number = (admin.get("fir_number") or data.get("fir_number") or "").strip()
        police_station = (admin.get("police_station") or "").strip()
        district = (admin.get("district") or "").strip()

        if not fir_number:
            return False, {}, "Validation Error: 'fir_number' is required in administrative info."
        if not police_station:
            return False, {}, "Validation Error: 'police_station' is required."
        if not district:
            return False, {}, "Validation Error: 'district' is required."

        if fir_number.upper() in self._index_by_number:
            return False, {}, f"Conflict: FIR with number '{fir_number}' already exists."

        now_iso = datetime.now(timezone.utc).isoformat()
        year = datetime.now(timezone.utc).strftime("%Y")
        unique_suffix = uuid.uuid4().hex[:6].upper()
        fir_id = f"FIR-{year}-{unique_suffix}"

        # Clean/Format legal provisions
        raw_provisions = data.get("legal_provisions", [])
        cleaned_provisions = []
        for idx, lp in enumerate(raw_provisions):
            prov_id = lp.get("provision_id") or f"LP-{idx+1:02d}"
            bns = lp.get("bns_section") or "BNS Section Pending"
            ipc = lp.get("ipc_legacy_section") or "IPC Reference Pending"
            offense = lp.get("offense_name") or "Alleged Offense"
            status = lp.get("review_status") or "Pending Officer Review"
            notes = lp.get("officer_notes") or ""

            cleaned_provisions.append({
                "provision_id": prov_id,
                "bns_section": bns,
                "ipc_legacy_section": ipc,
                "offense_name": offense,
                "review_status": status,
                "officer_notes": notes,
                "epistemic_notice": (
                    "Provisional legal section recorded at intake; subject to judicial framing and police charge-sheet. "
                    "Does not constitute legal finding of guilt."
                ),
            })

        # Complainant
        comp = data.get("complainant", {})

        # Accused
        raw_accused = data.get("accused", [])
        cleaned_accused = []
        for acc in raw_accused:
            name = (acc.get("name") or "").strip()
            role = (acc.get("alleged_role") or acc.get("role") or "").strip()
            alias = (acc.get("alias") or "").strip()
            if not name and not role and not alias:
                continue
            if not name:
                name = "Unknown Accused"
            acc_id = acc.get("accused_id") or f"ACC-{len(cleaned_accused)+1:02d}"
            status = acc.get("status") or "Suspect"
            cleaned_accused.append({
                "accused_id": acc_id,
                "name": name,
                "alias": alias,
                "status": status,
                "identifiers": acc.get("identifiers", {}),
                "alleged_role": role,
                "epistemic_notice": (
                    "Allegation recorded at intake; non-conclusive and subject to investigation. "
                    "Presumption of innocence applies."
                ),
            })

        # Incident
        incident = data.get("incident", {})
        if not incident.get("incident_category"):
            incident["incident_category"] = "General Investigation"

        # Intelligence links
        ilinks = data.get("intelligence_links", {})
        cleaned_ilinks = {
            "case_id": ilinks.get("case_id"),
            "linked_entity_ids": ilinks.get("linked_entity_ids", []),
            "linked_evidence_ids": ilinks.get("linked_evidence_ids", []),
            "linked_record_ids": ilinks.get("linked_record_ids", []),
            "provenance_note": (
                "Manual operational cross-reference. Does not represent automated NLP extraction or confirmed relational edge."
            ),
        }

        # Audit trail
        audit = [
            {
                "timestamp": now_iso,
                "action": "CREATED",
                "user": data.get("registered_by") or admin.get("investigating_officer") or "Investigator",
                "summary": f"Initial FIR registration under {police_station} PS.",
            }
        ]

        rec = FIRRecord(
            fir_id=fir_id,
            fir_number=fir_number,
            status=data.get("status", "Registered"),
            created_at=now_iso,
            updated_at=now_iso,
            administrative=admin,
            complainant=comp,
            accused=cleaned_accused,
            incident=incident,
            victims=data.get("victims", []),
            witnesses=data.get("witnesses", []),
            property_evidence=data.get("property_evidence", []),
            narrative=data.get("narrative", ""),
            legal_provisions=cleaned_provisions,
            intelligence_links=cleaned_ilinks,
            audit_trail=audit,
        )

        self._records[fir_id] = rec
        self._index_record(rec)
        self._persist()

        return True, rec.to_dict(), None

    def get_fir(self, fir_id: str) -> Optional[Dict[str, Any]]:
        """Average-case O(1) retrieval of FIR by ID."""
        rec = self._records.get(fir_id)
        if not rec:
            fid = self._index_by_number.get(fir_id.strip().upper())
            if fid:
                rec = self._records.get(fid)
        return rec.to_dict() if rec else None

    def update_fir(self, fir_id: str, updates: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], Optional[str]]:
        """
        Updates an existing FIR record and records an audit trail entry.
        Returns: (success, updated_record_dict, error_message)
        """
        rec = self._records.get(fir_id)
        if not rec:
            return False, {}, f"Not Found: FIR '{fir_id}' does not exist."

        now_iso = datetime.now(timezone.utc).isoformat()
        user = updates.get("updated_by", "Investigator")
        action = updates.get("audit_action", "UPDATED")
        summary = updates.get("audit_summary", "Record details updated by investigator.")

        if "administrative" in updates:
            rec.administrative.update(updates["administrative"])
        if "status" in updates:
            rec.status = updates["status"]
        if "complainant" in updates:
            rec.complainant.update(updates["complainant"])
        if "accused" in updates:
            rec.accused = updates["accused"]
        if "incident" in updates:
            rec.incident.update(updates["incident"])
        if "victims" in updates:
            rec.victims = updates["victims"]
        if "witnesses" in updates:
            rec.witnesses = updates["witnesses"]
        if "property_evidence" in updates:
            rec.property_evidence = updates["property_evidence"]
        if "narrative" in updates:
            rec.narrative = updates["narrative"]
        if "legal_provisions" in updates:
            rec.legal_provisions = updates["legal_provisions"]
        if "intelligence_links" in updates:
            rec.intelligence_links.update(updates["intelligence_links"])

        rec.updated_at = now_iso
        rec.audit_trail.append({
            "timestamp": now_iso,
            "action": action,
            "user": user,
            "summary": summary,
        })

        self._rebuild_indexes()
        self._persist()

        return True, rec.to_dict(), None

    def delete_fir(self, fir_id: str) -> bool:
        """Deletes an FIR record from store."""
        if fir_id in self._records:
            del self._records[fir_id]
            self._rebuild_indexes()
            self._persist()
            return True
        return False

    # ─── Search & Filtering ──────────────────────────────────────────────────

    def list_firs(
        self,
        status: Optional[str] = None,
        police_station: Optional[str] = None,
        district: Optional[str] = None,
        case_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Lists FIRs with optional exact-match filters and pagination."""
        candidates = list(self._records.values())

        if status:
            candidates = [r for r in candidates if r.status.lower() == status.strip().lower()]
        if police_station:
            candidates = [r for r in candidates if (r.administrative.get("police_station") or "").lower() == police_station.strip().lower()]
        if district:
            candidates = [r for r in candidates if (r.administrative.get("district") or "").lower() == district.strip().lower()]
        if case_id:
            candidates = [r for r in candidates if (r.intelligence_links.get("case_id") or "") == case_id.strip()]
        if category:
            candidates = [r for r in candidates if (r.incident.get("incident_category") or "").lower() == category.strip().lower()]

        candidates.sort(key=lambda r: r.administrative.get("registration_date") or r.created_at, reverse=True)

        total = len(candidates)
        paginated = candidates[offset : offset + limit]

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "firs": [r.to_dict() for r in paginated],
        }

    def search_firs(
        self,
        query: Optional[str] = None,
        police_station: Optional[str] = None,
        district: Optional[str] = None,
        accused_name: Optional[str] = None,
        complainant_name: Optional[str] = None,
        category: Optional[str] = None,
        case_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        review_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Multi-field bounded search over persisted FIR records.
        Exact indexed lookups use O(1) dictionary lookups.
        Multi-field text substrings and arbitrary date ranges execute bounded linear scans O(N).
        """
        records = list(self._records.values())

        if query and query.strip().upper() in self._index_by_number:
            matched_rec = self._records[self._index_by_number[query.strip().upper()]]
            return {
                "total": 1,
                "limit": limit,
                "offset": offset,
                "search_mode": "exact_fir_number_index",
                "firs": [matched_rec.to_dict()],
            }

        if police_station:
            target_st = police_station.strip().lower()
            records = [r for r in records if target_st in (r.administrative.get("police_station") or "").lower()]

        if district:
            target_dist = district.strip().lower()
            records = [r for r in records if target_dist in (r.administrative.get("district") or "").lower()]

        if case_id:
            cid = case_id.strip()
            records = [r for r in records if (r.intelligence_links.get("case_id") or "") == cid]

        if category:
            target_cat = category.strip().lower()
            records = [r for r in records if target_cat in (r.incident.get("incident_category") or "").lower()]

        if accused_name:
            aname = accused_name.strip().lower()
            records = [
                r for r in records
                if any(aname in (acc.get("name") or "").lower() or aname in (acc.get("alias") or "").lower() for acc in r.accused)
            ]

        if complainant_name:
            cname = complainant_name.strip().lower()
            records = [r for r in records if cname in (r.complainant.get("name") or "").lower()]

        if review_status:
            rst = review_status.strip().lower()
            records = [
                r for r in records
                if any(rst in (lp.get("review_status") or "").lower() for lp in r.legal_provisions)
            ]

        if start_date:
            records = [
                r for r in records
                if (r.administrative.get("registration_date") or r.incident.get("incident_date") or r.created_at[:10]) >= start_date
            ]
        if end_date:
            records = [
                r for r in records
                if (r.administrative.get("registration_date") or r.incident.get("incident_date") or r.created_at[:10]) <= end_date
            ]

        if query and query.strip():
            tokens = [t.strip().lower() for t in query.strip().split() if t.strip()]
            filtered = []
            for r in records:
                blob_parts = [
                    r.fir_number,
                    r.administrative.get("police_station", ""),
                    r.administrative.get("district", ""),
                    r.complainant.get("name", ""),
                    r.incident.get("incident_location", ""),
                    r.incident.get("incident_category", ""),
                    r.incident.get("summary", ""),
                    r.narrative,
                ]
                for acc in r.accused:
                    blob_parts.append(acc.get("name", ""))
                    blob_parts.append(acc.get("alias", ""))
                for lp in r.legal_provisions:
                    blob_parts.append(lp.get("bns_section", ""))
                    blob_parts.append(lp.get("ipc_legacy_section", ""))
                    blob_parts.append(lp.get("offense_name", ""))

                blob = " ".join(blob_parts).lower()
                if all(tok in blob for tok in tokens):
                    filtered.append(r)
            records = filtered

        records.sort(key=lambda r: r.administrative.get("registration_date") or r.created_at, reverse=True)

        total = len(records)
        paginated = records[offset : offset + limit]

        return {
            "total": total,
            "total_matches": total,
            "limit": limit,
            "offset": offset,
            "search_mode": "bounded_scan_and_index",
            "firs": [r.to_dict() for r in paginated],
            "results": [r.to_dict() for r in paginated],
        }

    search = search_firs

    # ─── Reference Catalog ───────────────────────────────────────────────────

    @classmethod
    def get_legal_provisions_catalog(cls) -> Dict[str, Any]:
        """Returns the canonical modern BNS with IPC legacy cross-reference catalog."""
        return {
            "primary_framework": "Bharatiya Nyaya Sanhita (BNS), 2023",
            "legacy_framework": "Indian Penal Code (IPC), 1860",
            "statutory_effective_date": "2024-07-01",
            "total_provisions": len(BNS_IPC_CATALOG),
            "provisions": BNS_IPC_CATALOG,
            "epistemic_notice": (
                "Legal sections are provided for reference and officer-assisted drafting. "
                "The system does not automatically determine criminal liability or guilt."
            ),
        }

    def get_summary_kpis(self) -> Dict[str, Any]:
        """Returns KPI statistics for the FIR workspace."""
        total = len(self._records)
        by_status = {}
        by_category = {}
        linked_case_count = 0
        total_accused_count = 0
        pending_review_provisions = 0

        for r in self._records.values():
            st = r.status
            by_status[st] = by_status.get(st, 0) + 1

            cat = r.incident.get("incident_category") or "General"
            by_category[cat] = by_category.get(cat, 0) + 1

            if r.intelligence_links.get("case_id"):
                linked_case_count += 1

            total_accused_count += len(r.accused)

            for lp in r.legal_provisions:
                if "pending" in (lp.get("review_status") or "").lower():
                    pending_review_provisions += 1

        return {
            "total_firs": total,
            "by_status": by_status,
            "by_category": by_category,
            "linked_case_count": linked_case_count,
            "total_accused_count": total_accused_count,
            "pending_review_provisions": pending_review_provisions,
        }

    @classmethod
    def suggest_bns_provisions(cls, category: str = "", narrative: str = "") -> Dict[str, Any]:
        """
        High-Precision BNS (2023) Legal Provision Recommendation Engine.
        Analyzes incident narrative and category using multi-layer NLP keyword extraction,
        Hinglish/Hindustani legal synonym expansion, and n-gram phrase scoring against 
        the canonical 40+ statutory BNS/IPC catalog.
        
        Returns precision-ranked suggestions with confidence scores, match rationale,
        bailable/cognizable classification, and statutory punishment details.
        Does NOT establish guilt or auto-commit provisions.
        """
        category_clean = (category or "").strip().lower()
        narrative_clean = (narrative or "").strip().lower()
        full_text = f"{category_clean} {narrative_clean}".strip()

        if not full_text:
            return {
                "status": "success",
                "category": category,
                "total_suggestions": 0,
                "suggestions": [],
                "epistemic_notice": "Suggestions are advisory for officer review. Officer selection is required.",
            }

        # Hindustani/Hinglish & Legal domain synonym normalization dictionary
        hinglish_mappings = {
            "chori": ["theft", "stolen", "thief", "chura", "stole"],
            "chor": ["theft", "stolen", "thief"],
            "dhokha": ["cheat", "cheating", "fraud", "scam", "deceive"],
            "dhokhadhadi": ["cheat", "cheating", "fraud", "scam"],
            "shadyantra": ["conspiracy", "conspire", "syndicate", "gang", "plan"],
            "marpeet": ["hurt", "assault", "beating", "attack", "injury", "slapped", "punched"],
            "hatya": ["murder", "killed", "killing", "death", "laash"],
            "goli": ["firearm", "gun", "bullet", "shoot", "murder", "hurt"],
            "chaku": ["knife", "weapon", "hurt", "stab", "dangerous weapon"],
            "dhamki": ["threat", "intimidation", "extortion", "ransom", "hafta"],
            "hafta": ["extortion", "ransom", "protection money"],
            "firoti": ["ransom", "kidnapping", "extortion"],
            "apharan": ["kidnapping", "abduction", "kidnapped"],
            "nakli": ["fake", "forged", "counterfeit", "farzi"],
            "farzi": ["fake", "forged", "fraudulent", "fabricated"],
            "kaagaz": ["document", "paper", "record", "certificate"],
            "lakh": ["funds", "money", "fraud", "cheating", "lakhs"],
            "crore": ["funds", "money", "fraud", "cheating", "crores"],
            "online": ["cyber", "phishing", "computer", "otp", "internet"],
            "scam": ["cheat", "cheating", "fraud", "financial fraud"],
            "dahej": ["dowry", "cruelty", "harassment"],
            "danga": ["rioting", "unlawful assembly", "mob"],
            "loott": ["robbery", "robbed", "snatching"],
            "loot": ["robbery", "robbed", "snatching"],
            "dakaiti": ["dacoity", "gang robbery"],
            "sarkari": ["public servant", "officer", "government"],
        }

        # Tokenize text
        raw_tokens = re.findall(r"\b[a-zA-Z0-9_\-\u0900-\u097F]+\b", full_text.lower())
        expanded_tokens = set(raw_tokens)
        
        for tok in raw_tokens:
            if tok in hinglish_mappings:
                expanded_tokens.update(hinglish_mappings[tok])

        # Generate 2-word & 3-word n-grams for exact phrase matching
        bigrams = set()
        for i in range(len(raw_tokens) - 1):
            bigrams.add(f"{raw_tokens[i]} {raw_tokens[i+1]}")
            
        trigrams = set()
        for i in range(len(raw_tokens) - 2):
            trigrams.add(f"{raw_tokens[i]} {raw_tokens[i+1]} {raw_tokens[i+2]}")

        suggestions = []

        for item in BNS_IPC_CATALOG:
            sec_category = item["category"].lower()
            offense_name = item["offense_name"].lower()
            desc = item["description"].lower()
            item_keywords = [k.lower() for k in item.get("keywords", [])]

            # Category Alignment Score
            category_score = 0.0
            if category_clean:
                if sec_category in category_clean or category_clean in sec_category:
                    category_score = 4.0
                elif any(word in sec_category for word in category_clean.split()):
                    category_score = 2.0

            # Offense Title & Description Direct Match Score
            title_score = 0.0
            for tok in raw_tokens:
                if len(tok) > 3 and tok in offense_name:
                    title_score += 1.5
                if len(tok) > 3 and tok in desc:
                    title_score += 0.5

            # Keyword Overlap Score
            matched_kw_list = []
            kw_score = 0.0
            
            for kw in item_keywords:
                kw_lower = kw.lower()
                # Check trigrams/bigrams first
                if kw_lower in trigrams:
                    kw_score += 4.0
                    matched_kw_list.append(kw)
                elif kw_lower in bigrams:
                    kw_score += 3.0
                    matched_kw_list.append(kw)
                elif kw_lower in expanded_tokens or any(kw_lower in tok for tok in expanded_tokens if len(kw_lower) > 3):
                    kw_score += 1.5
                    matched_kw_list.append(kw)

            total_raw_score = category_score + title_score + kw_score

            if total_raw_score > 0 and (kw_score > 0 or category_score >= 3.0):
                # Calculate normalized Precision Confidence (0.0 to 0.99)
                # Formula balances raw keyword match density and category alignment
                confidence = min(0.99, (total_raw_score / (total_raw_score + 3.5)) * 0.65 + min(0.35, len(matched_kw_list) * 0.10))
                
                # Boost confidence for direct phrase & category overlap
                if category_score > 0 and kw_score >= 3.0:
                    confidence = min(0.99, confidence + 0.15)

                confidence_level = "HIGH" if confidence >= 0.70 else ("MEDIUM" if confidence >= 0.45 else "LOW")

                # Construct clear match rationale
                matched_str = ", ".join(list(dict.fromkeys(matched_kw_list))[:4]) if matched_kw_list else ""
                if category_score > 0 and matched_str:
                    reason = f"Matched '{item['category']}' category & narrative keywords ({matched_str})"
                elif matched_str:
                    reason = f"Matched narrative keywords ({matched_str})"
                elif category_score > 0:
                    reason = f"Matched operational category '{item['category']}'"
                else:
                    reason = "Matched general statutory offense context"

                suggestions.append({
                    "bns_section": item["bns_section"],
                    "ipc_legacy_section": item["ipc_legacy_section"],
                    "offense_name": item["offense_name"],
                    "category": item["category"],
                    "bailable": item.get("bailable", "Non-Bailable"),
                    "cognizable": item.get("cognizable", "Cognizable"),
                    "punishment": item.get("punishment", "As per court proceedings"),
                    "description": item["description"],
                    "confidence": round(confidence, 2),
                    "confidence_percentage": f"{int(round(confidence * 100))}%",
                    "confidence_level": confidence_level,
                    "reason": reason,
                    "match_reason": reason,
                    "matched_keywords": list(dict.fromkeys(matched_kw_list))[:6],
                    "review_status": "Suggested — Officer Review Required",
                    "officer_review_notice": "Suggested provision based on intake narrative; officer review required.",
                })

        # Sort by confidence score descending
        suggestions.sort(key=lambda s: (s["confidence"], len(s["matched_keywords"])), reverse=True)

        # Fallback if no match scored
        if not suggestions and full_text:
            first = BNS_IPC_CATALOG[0]
            suggestions.append({
                "bns_section": first["bns_section"],
                "ipc_legacy_section": first["ipc_legacy_section"],
                "offense_name": first["offense_name"],
                "category": first["category"],
                "bailable": first.get("bailable", "Non-Bailable"),
                "cognizable": first.get("cognizable", "Cognizable"),
                "punishment": first.get("punishment", "As per court proceedings"),
                "description": first["description"],
                "confidence": 0.40,
                "confidence_percentage": "40%",
                "confidence_level": "LOW",
                "reason": "General reference provision for officer review",
                "match_reason": "General reference provision for officer review",
                "matched_keywords": [],
                "review_status": "Suggested — Officer Review Required",
                "officer_review_notice": "Suggested provision based on intake narrative; officer review required.",
            })

        return {
            "status": "success",
            "category": category,
            "total_suggestions": len(suggestions),
            "suggestions": suggestions[:12],  # Return top 12 precision matches
            "epistemic_notice": "Suggestions are advisory for officer review. Officer selection is required.",
        }


_global_fir_engine: Optional[FIREngine] = None


def get_fir_engine(storage_path: Optional[str] = None) -> FIREngine:
    """Returns the singleton FIREngine instance."""
    global _global_fir_engine
    if _global_fir_engine is None or storage_path is not None:
        _global_fir_engine = FIREngine(storage_path=storage_path)
    return _global_fir_engine

