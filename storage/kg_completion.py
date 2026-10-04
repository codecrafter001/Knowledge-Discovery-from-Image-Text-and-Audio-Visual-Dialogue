"""
Knowledge Graph Completion Module
Implements TransE for link prediction and knowledge graph completion.
"""

import math
from typing import Dict, List, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim


class TransE(nn.Module):
    """
    TransE Model for Knowledge Graph Embeddings.
    Learns entity and relation embeddings such that h + r \approx t.
    """
    def __init__(self, num_entities: int, num_relations: int, embedding_dim: int = 50, margin: float = 1.0):
        super(TransE, self).__init__()
        self.num_entities = num_entities
        self.num_relations = num_relations
        self.embedding_dim = embedding_dim
        self.margin = margin

        # Initialize embeddings uniformly
        bound = 6.0 / math.sqrt(embedding_dim)
        self.entity_embeddings = nn.Embedding(num_entities, embedding_dim)
        self.entity_embeddings.weight.data.uniform_(-bound, bound)

        self.relation_embeddings = nn.Embedding(num_relations, embedding_dim)
        self.relation_embeddings.weight.data.uniform_(-bound, bound)
        
        # Relation embeddings are normalized to length 1
        self.relation_embeddings.weight.data = F.normalize(self.relation_embeddings.weight.data, p=2, dim=1)

    def forward(self, h: torch.Tensor, r: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        """
        Calculates the distance score: ||h + r - t||_2
        Smaller scores indicate a higher probability of the triple being true.
        """
        # Normalize entity embeddings to length 1 before calculating score
        e_h = F.normalize(self.entity_embeddings(h), p=2, dim=1)
        e_t = F.normalize(self.entity_embeddings(t), p=2, dim=1)
        e_r = self.relation_embeddings(r)
        
        score = torch.norm(e_h + e_r - e_t, p=2, dim=1)
        return score

    def loss(self, pos_h: torch.Tensor, pos_r: torch.Tensor, pos_t: torch.Tensor,
                   neg_h: torch.Tensor, neg_r: torch.Tensor, neg_t: torch.Tensor) -> torch.Tensor:
        """
        Calculates margin-based ranking loss: max(0, d_pos - d_neg + margin).
        """
        pos_score = self.forward(pos_h, pos_r, pos_t)
        neg_score = self.forward(neg_h, neg_r, neg_t)
        
        target = torch.tensor([-1.0], dtype=torch.float32, device=pos_score.device)
        return F.margin_ranking_loss(pos_score, neg_score, target, margin=self.margin)


class KGTrainer:
    """Trains the TransE model and maps text IDs to tensor indices."""
    
    def __init__(self, embedding_dim: int = 50, margin: float = 1.0, learning_rate: float = 0.01):
        self.embedding_dim = embedding_dim
        self.margin = margin
        self.lr = learning_rate
        
        self.entity_to_id: Dict[str, int] = {}
        self.id_to_entity: Dict[int, str] = {}
        self.relation_to_id: Dict[str, int] = {}
        self.id_to_relation: Dict[int, str] = {}
        
        self.model: TransE = None
        self.optimizer = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    def _add_entity(self, entity: str) -> int:
        if entity not in self.entity_to_id:
            idx = len(self.entity_to_id)
            self.entity_to_id[entity] = idx
            self.id_to_entity[idx] = entity
        return self.entity_to_id[entity]
        
    def _add_relation(self, relation: str) -> int:
        if relation not in self.relation_to_id:
            idx = len(self.relation_to_id)
            self.relation_to_id[relation] = idx
            self.id_to_relation[idx] = relation
        return self.relation_to_id[relation]

    def prepare_data(self, triples: List[Tuple[str, str, str]]) -> List[Tuple[int, int, int]]:
        """Maps string triples to integer ID triples."""
        indexed_triples = []
        for h, r, t in triples:
            h_idx = self._add_entity(h)
            r_idx = self._add_relation(r)
            t_idx = self._add_entity(t)
            indexed_triples.append((h_idx, r_idx, t_idx))
        return indexed_triples

    def train(self, triples: List[Tuple[str, str, str]], epochs: int = 100) -> None:
        """Trains the TransE model on the provided knowledge graph triples."""
        if not triples:
            print("No triples provided for training.")
            return

        print(f"Preparing to train TransE with {len(triples)} triples...")
        indexed_triples = self.prepare_data(triples)
        
        # Initialize model
        self.model = TransE(
            num_entities=len(self.entity_to_id),
            num_relations=len(self.relation_to_id),
            embedding_dim=self.embedding_dim,
            margin=self.margin
        ).to(self.device)
        
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        
        # Simple training loop with random negative sampling
        self.model.train()
        for epoch in range(epochs):
            total_loss = 0.0
            
            # Batch size could be added, but keeping it simple for small initial graphs
            for pos_h, pos_r, pos_t in indexed_triples:
                self.optimizer.zero_grad()
                
                # Create a corrupted (negative) triple by randomly replacing the tail
                neg_t = torch.randint(0, len(self.entity_to_id), (1,)).item()
                while neg_t == pos_t and len(self.entity_to_id) > 1:
                    neg_t = torch.randint(0, len(self.entity_to_id), (1,)).item()
                    
                ph_t = torch.tensor([pos_h], device=self.device)
                pr_t = torch.tensor([pos_r], device=self.device)
                pt_t = torch.tensor([pos_t], device=self.device)
                nt_t = torch.tensor([neg_t], device=self.device)
                
                loss = self.model.loss(ph_t, pr_t, pt_t, ph_t, pr_t, nt_t)
                loss.backward()
                self.optimizer.step()
                
                total_loss += loss.item()
                
            if (epoch + 1) % 20 == 0 or epoch == 0:
                print(f"Epoch {epoch + 1}/{epochs}, Loss: {total_loss / len(triples):.4f}")

    def predict_tail(self, head: str, relation: str, top_k: int = 3) -> List[Tuple[str, float]]:
        """Predicts the most likely tail entity for a given head and relation."""
        if self.model is None:
            return []
            
        if head not in self.entity_to_id or relation not in self.relation_to_id:
            return []
            
        self.model.eval()
        h_idx = torch.tensor([self.entity_to_id[head]], device=self.device)
        r_idx = torch.tensor([self.relation_to_id[relation]], device=self.device)
        
        scores = []
        with torch.no_grad():
            for t_idx in range(len(self.entity_to_id)):
                t_tensor = torch.tensor([t_idx], device=self.device)
                score = self.model(h_idx, r_idx, t_tensor).item()
                scores.append((self.id_to_entity[t_idx], score))
                
        # Lower score means closer distance in embedding space
        scores.sort(key=lambda x: x[1])
        return scores[:top_k]


if __name__ == "__main__":
    print("Testing TransE KG Completion...")
    
    mock_triples = [
        ("Dr. Sharma", "WORKS_FOR", "Project KD"),
        ("Project KD", "USES", "Neo4j"),
        ("Project KD", "USES", "React"),
        ("Dr. Sharma", "LOCATED_IN", "London"),
        ("Neo4j", "IS_A", "Database")
    ]
    
    trainer = KGTrainer(embedding_dim=20, margin=1.0, learning_rate=0.05)
    trainer.train(mock_triples, epochs=60)
    
    print("\n--- Predictions ---")
    query_head = "Dr. Sharma"
    query_relation = "USES"
    print(f"Query: {query_head} - {query_relation} - ?")
    
    predictions = trainer.predict_tail(query_head, query_relation, top_k=3)
    for tail, score in predictions:
        print(f"  -> {tail} (distance score: {score:.4f})")
