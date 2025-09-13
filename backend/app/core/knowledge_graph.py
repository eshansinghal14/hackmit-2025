"""
Knowledge Graph Implementation
NetworkX-based concept mastery tracking and relationship modeling
"""
import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Set
import networkx as nx

@dataclass
class ConceptNode:
    """Represents a mathematical concept with mastery tracking"""
    id: str
    mastery: float = 0.5  # 0.0 = no understanding, 1.0 = complete mastery
    importance: float = 0.5  # 0.0 = low importance, 1.0 = critical concept
    last_updated: float = field(default_factory=time.time)
    practice_count: int = 0
    success_count: int = 0
    error_count: int = 0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate for this concept"""
        if self.practice_count == 0:
            return 0.5
        return self.success_count / self.practice_count
    
    def update_from_interaction(self, outcome: str, learning_rate: float = 0.1):
        """Update mastery based on interaction outcome"""
        self.practice_count += 1
        self.last_updated = time.time()
        
        if outcome == "success":
            self.success_count += 1
            delta = learning_rate * (1.0 - self.mastery)  # Diminishing returns
        elif outcome == "error":
            self.error_count += 1
            delta = -learning_rate * 0.5  # Smaller penalty
        else:  # neutral
            delta = learning_rate * 0.1  # Small positive bias
        
        self.mastery = max(0.0, min(1.0, self.mastery + delta))

@dataclass 
class KnowledgeGraph:
    """NetworkX-based knowledge graph for concept relationships"""
    
    nodes: Dict[str, ConceptNode] = field(default_factory=dict)
    edges: Dict[Tuple[str, str], float] = field(default_factory=dict)  # strength of relationship
    graph: nx.DiGraph = field(default_factory=nx.DiGraph)
    
    def add_concept(self, concept_id: str, importance: float = 0.5) -> ConceptNode:
        """Add a new concept node"""
        if concept_id not in self.nodes:
            node = ConceptNode(id=concept_id, importance=importance)
            self.nodes[concept_id] = node
            self.graph.add_node(concept_id, **{
                'mastery': node.mastery,
                'importance': node.importance,
                'last_updated': node.last_updated
            })
            return node
        return self.nodes[concept_id]
    
    def add_relationship(self, source: str, target: str, strength: float = 0.5, relationship_type: str = "requires"):
        """Add a relationship between concepts"""
        # Ensure both concepts exist
        self.add_concept(source)
        self.add_concept(target)
        
        edge_key = (source, target)
        self.edges[edge_key] = strength
        
        self.graph.add_edge(source, target, 
                          strength=strength, 
                          type=relationship_type,
                          created_at=time.time())
    
    def update_from_interaction(self, concepts: List[str], outcome: str):
        """Update graph based on student interaction"""
        # Add concepts if they don't exist
        for concept in concepts:
            self.add_concept(concept)
        
        # Update individual concept masteries
        for concept in concepts:
            self.nodes[concept].update_from_interaction(outcome)
            
            # Update graph node attributes
            node = self.nodes[concept]
            self.graph.nodes[concept].update({
                'mastery': node.mastery,
                'last_updated': node.last_updated,
                'practice_count': node.practice_count
            })
        
        # Strengthen relationships between co-occurring concepts
        for i in range(len(concepts) - 1):
            for j in range(i + 1, len(concepts)):
                source, target = concepts[i], concepts[j]
                edge_key = tuple(sorted((source, target)))
                
                current_strength = self.edges.get(edge_key, 0.2)
                new_strength = min(1.0, current_strength + 0.05)
                self.edges[edge_key] = new_strength
                
                # Update in NetworkX graph
                if self.graph.has_edge(source, target):
                    self.graph[source][target]['strength'] = new_strength
                else:
                    self.add_relationship(source, target, new_strength, "co_occurs")
    
    def weak_concepts(self, threshold: float = 0.4) -> List[str]:
        """Get concepts with low mastery scores"""
        return [
            node.id for node in self.nodes.values()
            if node.mastery < threshold
        ]
    
    def strong_concepts(self, threshold: float = 0.7) -> List[str]:
        """Get concepts with high mastery scores"""
        return [
            node.id for node in self.nodes.values()
            if node.mastery >= threshold
        ]
    
    def suggest_practice_concepts(self, limit: int = 5) -> List[Dict[str, any]]:
        """Suggest concepts for practice based on mastery and importance"""
        suggestions = []
        
        for node in self.nodes.values():
            # Score based on low mastery + high importance + recency
            recency_bonus = 1.0 if (time.time() - node.last_updated) > 3600 else 0.5  # 1 hour
            practice_score = (1.0 - node.mastery) * node.importance * recency_bonus
            
            suggestions.append({
                'concept': node.id,
                'mastery': node.mastery,
                'importance': node.importance,
                'practice_score': practice_score,
                'success_rate': node.success_rate,
                'last_practiced': node.last_updated
            })
        
        # Sort by practice score and return top suggestions
        suggestions.sort(key=lambda x: x['practice_score'], reverse=True)
        return suggestions[:limit]
    
    def find_prerequisite_gaps(self, target_concept: str) -> List[str]:
        """Find prerequisite concepts that need strengthening"""
        if target_concept not in self.nodes:
            return []
        
        gaps = []
        
        # Find all nodes that have edges to the target (prerequisites)
        for source, target in self.edges:
            if target == target_concept:
                source_node = self.nodes.get(source)
                if source_node and source_node.mastery < 0.5:
                    gaps.append(source)
        
        return gaps
    
    def get_learning_path(self, target_concept: str) -> List[str]:
        """Generate a learning path to master a target concept"""
        if target_concept not in self.nodes:
            return [target_concept]
        
        path = []
        visited = set()
        
        def dfs_prerequisites(concept: str):
            if concept in visited:
                return
            
            visited.add(concept)
            
            # Find prerequisites (concepts this one depends on)
            prerequisites = []
            for source, target in self.edges:
                if target == concept and self.nodes[source].mastery < 0.7:
                    prerequisites.append(source)
            
            # Sort prerequisites by mastery (weakest first)
            prerequisites.sort(key=lambda c: self.nodes[c].mastery)
            
            # Recursively add prerequisites
            for prereq in prerequisites:
                dfs_prerequisites(prereq)
            
            # Add current concept if it needs work
            if self.nodes[concept].mastery < 0.7:
                path.append(concept)
        
        dfs_prerequisites(target_concept)
        return path
    
    def detect_knowledge_clusters(self) -> List[List[str]]:
        """Detect clusters of related concepts"""
        # Use community detection on the underlying graph
        try:
            # Convert to undirected graph for community detection
            undirected = self.graph.to_undirected()
            
            # Simple clustering based on connected components
            components = list(nx.connected_components(undirected))
            return [list(component) for component in components if len(component) > 1]
            
        except Exception:
            # Fallback: return empty clusters
            return []
    
    def get_mastery_distribution(self) -> Dict[str, int]:
        """Get distribution of mastery levels"""
        distribution = {"low": 0, "medium": 0, "high": 0}
        
        for node in self.nodes.values():
            if node.mastery < 0.4:
                distribution["low"] += 1
            elif node.mastery < 0.7:
                distribution["medium"] += 1
            else:
                distribution["high"] += 1
        
        return distribution
    
    def export_for_visualization(self) -> Dict[str, any]:
        """Export graph data for frontend visualization"""
        nodes_data = []
        edges_data = []
        
        # Export nodes
        for node in self.nodes.values():
            nodes_data.append({
                'id': node.id,
                'mastery': node.mastery,
                'importance': node.importance,
                'practice_count': node.practice_count,
                'success_rate': node.success_rate,
                'color': self._get_node_color(node.mastery),
                'size': self._get_node_size(node.importance)
            })
        
        # Export edges
        for (source, target), strength in self.edges.items():
            edges_data.append({
                'source': source,
                'target': target,
                'strength': strength,
                'width': max(1, int(strength * 5))  # Visual width
            })
        
        return {
            'nodes': nodes_data,
            'edges': edges_data,
            'stats': {
                'total_concepts': len(self.nodes),
                'weak_concepts': len(self.weak_concepts()),
                'strong_concepts': len(self.strong_concepts()),
                'mastery_distribution': self.get_mastery_distribution(),
                'clusters': len(self.detect_knowledge_clusters())
            }
        }
    
    def _get_node_color(self, mastery: float) -> str:
        """Get color based on mastery level"""
        if mastery < 0.3:
            return "#ff4444"  # Red for low mastery
        elif mastery < 0.7:
            return "#ffaa44"  # Orange for medium mastery
        else:
            return "#44ff44"  # Green for high mastery
    
    def _get_node_size(self, importance: float) -> int:
        """Get node size based on importance"""
        return int(10 + importance * 20)  # Size between 10-30
    
    def get_stats(self) -> Dict[str, any]:
        """Get comprehensive graph statistics"""
        if not self.nodes:
            return {"total_concepts": 0}
        
        masteries = [node.mastery for node in self.nodes.values()]
        importances = [node.importance for node in self.nodes.values()]
        
        return {
            "total_concepts": len(self.nodes),
            "total_relationships": len(self.edges),
            "average_mastery": sum(masteries) / len(masteries),
            "average_importance": sum(importances) / len(importances),
            "weak_concepts": len(self.weak_concepts()),
            "strong_concepts": len(self.strong_concepts()),
            "mastery_distribution": self.get_mastery_distribution(),
            "clusters": len(self.detect_knowledge_clusters()),
            "graph_density": nx.density(self.graph) if len(self.nodes) > 1 else 0.0
        }

# Predefined concept relationships for common math topics
MATH_CONCEPT_RELATIONSHIPS = {
    # Algebra relationships
    ("basic_arithmetic", "linear_equations"): 0.8,
    ("linear_equations", "quadratic_equations"): 0.7,
    ("quadratic_equations", "polynomial_equations"): 0.6,
    ("fractions", "rational_expressions"): 0.7,
    
    # Calculus relationships  
    ("functions", "limits"): 0.9,
    ("limits", "derivatives"): 0.8,
    ("derivatives", "integrals"): 0.7,
    ("algebra", "calculus"): 0.6,
    
    # Geometry relationships
    ("basic_geometry", "triangles"): 0.8,
    ("triangles", "trigonometry"): 0.7,
    ("coordinate_geometry", "analytic_geometry"): 0.9,
}

def create_default_math_graph() -> KnowledgeGraph:
    """Create a knowledge graph with common math concepts pre-loaded"""
    kg = KnowledgeGraph()
    
    # Add common math concepts
    concepts = [
        ("basic_arithmetic", 0.9),
        ("fractions", 0.8),
        ("linear_equations", 0.7),
        ("quadratic_equations", 0.7),
        ("functions", 0.8),
        ("limits", 0.6),
        ("derivatives", 0.7),
        ("integrals", 0.6),
        ("basic_geometry", 0.8),
        ("triangles", 0.7),
        ("trigonometry", 0.6),
    ]
    
    for concept_id, importance in concepts:
        kg.add_concept(concept_id, importance)
    
    # Add predefined relationships
    for (source, target), strength in MATH_CONCEPT_RELATIONSHIPS.items():
        kg.add_relationship(source, target, strength, "prerequisite")
    
    return kg
