package knowledge_discovery.authz

# Default deny all requests
default allow = false

# Allow authenticated API clients with valid JWT claims
allow {
    input.auth.token_valid == true
    input.auth.role in ["admin", "researcher", "ingestion_service"]
    not is_rate_limited
    not contains_unmasked_pii
}

# Enforce rate limiting based on client tier
is_rate_limited {
    input.request.rate_per_minute > 120
    input.auth.role != "admin"
}

# Guardrail: Prevent unmasked PII in audio/video transcripts
contains_unmasked_pii {
    re_match("(?i)(ssn|credit[\\s_-]?card|password)", input.payload.text_content)
}

# Modality Access Control
allow_modality_ingestion {
    input.modality in ["image", "text", "audio", "video", "multimodal"]
    input.payload.file_size_bytes <= 104857600 # 100 MB max
}

# Knowledge Graph Mutability Rules
allow_graph_mutation {
    input.auth.role in ["admin", "lead_researcher"]
    input.action in ["create_triplet", "merge_entities", "delete_edge"]
}
