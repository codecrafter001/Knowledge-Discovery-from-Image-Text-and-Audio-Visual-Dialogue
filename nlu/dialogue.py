"""
Dialogue Act analysis module for speaker-attributed conversational transcripts.
Classifies utterances into dialogue acts: 'question', 'statement', 'command'.
"""

from typing import Any, Dict, List, Optional
import re

QUESTION_WORDS = {
    "what", "why", "how", "who", "whom", "whose", "where", "when", "which",
    "is", "are", "am", "was", "were", "do", "does", "did",
    "can", "could", "would", "should", "shall", "will", "may", "might", "must",
    "have", "has", "had", "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't",
    "can't", "couldn't", "won't", "wouldn't", "shouldn't"
}

COMMAND_VERBS = {
    "please", "tell", "show", "explain", "give", "create", "open", "find", "run",
    "stop", "check", "send", "make", "set", "download", "extract", "analyze",
    "start", "turn", "close", "bring", "look", "listen", "go", "write", "update",
    "delete", "remove", "add", "insert", "provide", "summarize", "describe"
}


def classify_utterance_act(text: str) -> str:
    """
    Classify a single utterance into a dialogue act ('question', 'statement', 'command').

    Args:
        text: Utterance text.

    Returns:
        Dialogue act string ('question', 'statement', or 'command').
    """
    if not text or not isinstance(text, str):
        return "statement"

    clean_text = text.strip()
    if not clean_text:
        return "statement"

    # 1. Punctuation cue for question
    if clean_text.endswith("?"):
        return "question"

    # Clean words
    words = re.findall(r"\b\w+\b", clean_text.lower())
    if not words:
        return "statement"

    first_word = words[0]

    # 2. Interrogative starter
    if first_word in QUESTION_WORDS:
        return "question"

    # 3. Imperative command starter
    if first_word in COMMAND_VERBS:
        return "command"

    if len(words) > 1 and first_word == "please" and words[1] in COMMAND_VERBS:
        return "command"

    # 4. Syntactic dependency check for imperative if spaCy available
    try:
        from .entities import get_nlp
        nlp = get_nlp()
        doc = nlp(clean_text)
        if len(doc) > 0:
            first_token = doc[0]
            # Imperative verbs often appear as root verbs with no nominal subject
            if first_token.pos_ == "VERB" and first_token.dep_ == "ROOT":
                has_nsubj = any(tok.dep_ in ["nsubj", "nsubjpass"] for tok in doc)
                if not has_nsubj:
                    return "command"
    except Exception:
        pass

    # Default to statement
    return "statement"


def analyze_dialogue(transcript: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze speaker-attributed transcript list and append 'dialogue_act' to each utterance.

    Args:
        transcript: List of dicts [{"speaker": str, "start": float, "end": float, "text": str}, ...].

    Returns:
        Same list with added 'dialogue_act' ('question', 'statement', 'command') field per item.
    """
    if not transcript or not isinstance(transcript, list):
        return []

    analyzed: List[Dict[str, Any]] = []
    for item in transcript:
        item_copy = dict(item)
        text = str(item_copy.get("text", ""))
        item_copy["dialogue_act"] = classify_utterance_act(text)
        analyzed.append(item_copy)

    return analyzed
