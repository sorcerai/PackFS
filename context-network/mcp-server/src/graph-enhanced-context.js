import { ContextNetworkManager } from './context-manager.js';
import crypto from 'crypto';

/**
 * GraphRAG-enhanced context network implementation
 * Adds entity extraction, relationship mapping, and semantic clustering
 */
export class GraphEnhancedContextManager extends ContextNetworkManager {
  constructor() {
    super();
    this.entityGraph = new Map(); // entity_id -> entity details
    this.relationshipGraph = new Map(); // entity_id -> Set of relationships
    this.semanticClusters = new Map(); // cluster_id -> entity_ids
    this.entityIndex = new Map(); // entity_name -> entity_id for fast lookup
  }

  /**
   * Extract entities from context deterministically
   * Uses pattern matching and metadata analysis
   */
  extractEntities(content, metadata = {}) {
    const entities = new Set();
    
    // Extract from structured metadata
    if (metadata.projectName) entities.add({ type: 'project', name: metadata.projectName });
    if (metadata.topic) entities.add({ type: 'topic', name: metadata.topic });
    if (metadata.tags) {
      metadata.tags.forEach(tag => entities.add({ type: 'tag', name: tag }));
    }
    
    // Extract tool mentions (MCP tools)
    const toolPattern = /mcp__([a-zA-Z0-9-]+)__([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = toolPattern.exec(content)) !== null) {
      entities.add({ type: 'tool', name: match[0], server: match[1], method: match[2] });
    }
    
    // Extract file paths
    const pathPattern = /\/[A-Za-z0-9_/.-]+\.[a-z]{2,4}/g;
    while ((match = pathPattern.exec(content)) !== null) {
      entities.add({ type: 'file', name: match[0] });
    }
    
    // Extract quoted terms (likely important concepts)
    const quotedPattern = /"([^"]+)"/g;
    while ((match = quotedPattern.exec(content)) !== null) {
      if (match[1].length > 3 && match[1].length < 50) {
        entities.add({ type: 'concept', name: match[1] });
      }
    }
    
    // Extract decision keywords
    const decisionKeywords = ['decided', 'chose', 'selected', 'implementing', 'using'];
    decisionKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}\\s+([a-zA-Z0-9-_]+)`, 'gi');
      while ((match = regex.exec(content)) !== null) {
        entities.add({ type: 'decision', name: match[1] });
      }
    });
    
    return Array.from(entities);
  }

  /**
   * Build relationships between entities based on co-occurrence and metadata
   */
  buildRelationships(entities, contextId, metadata = {}) {
    const relationships = [];
    
    // Project-to-entity relationships
    if (metadata.projectName) {
      entities.forEach(entity => {
        if (entity.type !== 'project') {
          relationships.push({
            from: { type: 'project', name: metadata.projectName },
            to: entity,
            type: 'contains',
            contextId
          });
        }
      });
    }
    
    // Tag relationships (tags connect to all other entities in the context)
    const tags = entities.filter(e => e.type === 'tag');
    const nonTags = entities.filter(e => e.type !== 'tag');
    
    tags.forEach(tag => {
      nonTags.forEach(entity => {
        relationships.push({
          from: tag,
          to: entity,
          type: 'tags',
          contextId
        });
      });
    });
    
    // Tool-to-file relationships (tools that operate on files)
    const tools = entities.filter(e => e.type === 'tool');
    const files = entities.filter(e => e.type === 'file');
    
    if (tools.length > 0 && files.length > 0) {
      tools.forEach(tool => {
        files.forEach(file => {
          relationships.push({
            from: tool,
            to: file,
            type: 'operates_on',
            contextId,
            strength: 0.7 // Inferred relationship
          });
        });
      });
    }
    
    // Decision relationships
    const decisions = entities.filter(e => e.type === 'decision');
    decisions.forEach(decision => {
      entities.filter(e => e !== decision).forEach(entity => {
        relationships.push({
          from: decision,
          to: entity,
          type: 'impacts',
          contextId,
          strength: 0.8
        });
      });
    });
    
    // Temporal relationships (if multiple contexts reference same entities)
    if (metadata.previousContextId) {
      relationships.push({
        from: { type: 'context', name: metadata.previousContextId },
        to: { type: 'context', name: contextId },
        type: 'evolves_to',
        timestamp: metadata.timestamp
      });
    }
    
    return relationships;
  }

  /**
   * Cluster entities using a simplified Leiden-inspired algorithm
   * Groups entities by type and connectivity
   */
  async clusterEntities() {
    const clusters = new Map();
    
    // First pass: Group by entity type
    for (const [entityId, entity] of this.entityGraph) {
      const clusterKey = `${entity.type}_cluster`;
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, new Set());
      }
      clusters.get(clusterKey).add(entityId);
    }
    
    // Second pass: Refine clusters based on connectivity
    for (const [entityId, relationships] of this.relationshipGraph) {
      const entity = this.entityGraph.get(entityId);
      
      // Find the most connected cluster for this entity
      const clusterConnections = new Map();
      
      for (const rel of relationships) {
        const targetId = this.getEntityId(rel.to);
        for (const [clusterId, members] of clusters) {
          if (members.has(targetId)) {
            clusterConnections.set(clusterId, (clusterConnections.get(clusterId) || 0) + 1);
          }
        }
      }
      
      // Move entity to most connected cluster if significantly better
      if (clusterConnections.size > 0) {
        const currentCluster = Array.from(clusters.entries())
          .find(([_, members]) => members.has(entityId))?.[0];
        
        const bestCluster = Array.from(clusterConnections.entries())
          .sort((a, b) => b[1] - a[1])[0];
        
        if (bestCluster && bestCluster[1] > 3 && bestCluster[0] !== currentCluster) {
          // Remove from current cluster
          clusters.get(currentCluster)?.delete(entityId);
          // Add to best cluster
          clusters.get(bestCluster[0])?.add(entityId);
        }
      }
    }
    
    // Store clusters
    this.semanticClusters = clusters;
    
    return {
      clusterCount: clusters.size,
      clusters: Array.from(clusters.entries()).map(([id, members]) => ({
        id,
        size: members.size,
        samples: Array.from(members).slice(0, 5).map(id => this.entityGraph.get(id))
      }))
    };
  }

  /**
   * Get or create entity ID
   */
  getEntityId(entity) {
    const key = `${entity.type}:${entity.name}`;
    if (!this.entityIndex.has(key)) {
      const id = crypto.randomUUID();
      this.entityIndex.set(key, id);
      this.entityGraph.set(id, entity);
      this.relationshipGraph.set(id, new Set());
    }
    return this.entityIndex.get(key);
  }

  /**
   * Enhanced conversation recording with entity extraction
   */
  async recordConversationContext(args) {
    // First, use parent method to store the conversation
    const result = await super.recordConversationContext(args);
    
    // Extract entities from the conversation
    const entities = this.extractEntities(
      `${args.summary} ${args.keyPoints?.join(' ')} ${args.tags?.join(' ')}`,
      {
        topic: args.topic,
        tags: args.tags,
        projectName: args.projectName
      }
    );
    
    // Store entities in graph
    entities.forEach(entity => {
      const entityId = this.getEntityId(entity);
      // Track which contexts mention this entity
      const entityData = this.entityGraph.get(entityId);
      if (!entityData.contexts) entityData.contexts = new Set();
      entityData.contexts.add(result.conversationId);
    });
    
    // Build relationships
    const relationships = this.buildRelationships(entities, result.conversationId, {
      projectName: args.projectName,
      timestamp: new Date().toISOString()
    });
    
    // Store relationships in graph
    relationships.forEach(rel => {
      const fromId = this.getEntityId(rel.from);
      const toId = this.getEntityId(rel.to);
      
      this.relationshipGraph.get(fromId).add({
        to: rel.to,
        type: rel.type,
        contextId: rel.contextId,
        strength: rel.strength || 1.0
      });
    });
    
    // Update clusters periodically
    if (this.entityGraph.size % 10 === 0) {
      await this.clusterEntities();
    }
    
    return {
      ...result,
      entitiesExtracted: entities.length,
      relationshipsCreated: relationships.length
    };
  }

  /**
   * Multi-hop graph traversal for complex queries
   */
  async traverseGraph(startEntity, maxHops = 3, relationTypes = null) {
    const visited = new Set();
    const results = [];
    const queue = [{ entity: startEntity, hops: 0, path: [] }];
    
    while (queue.length > 0) {
      const { entity, hops, path } = queue.shift();
      const entityId = this.getEntityId(entity);
      
      if (visited.has(entityId) || hops > maxHops) continue;
      visited.add(entityId);
      
      const relationships = this.relationshipGraph.get(entityId) || new Set();
      
      for (const rel of relationships) {
        if (relationTypes && !relationTypes.includes(rel.type)) continue;
        
        const newPath = [...path, { from: entity, to: rel.to, type: rel.type }];
        results.push({
          path: newPath,
          distance: hops + 1,
          strength: newPath.reduce((s, r) => s * (r.strength || 1), 1)
        });
        
        if (hops < maxHops) {
          queue.push({
            entity: rel.to,
            hops: hops + 1,
            path: newPath
          });
        }
      }
    }
    
    // Sort by relevance (shorter paths with higher strength first)
    results.sort((a, b) => {
      const scoreA = a.strength / a.distance;
      const scoreB = b.strength / b.distance;
      return scoreB - scoreA;
    });
    
    return results.slice(0, 10); // Top 10 paths
  }

  /**
   * Enhanced semantic query with graph traversal
   */
  async queryWithGraph(query, options = {}) {
    // First, identify entities in the query
    const queryEntities = this.extractEntities(query);
    
    // Find which clusters are most relevant
    const relevantClusters = new Set();
    queryEntities.forEach(entity => {
      const entityId = this.getEntityId(entity);
      for (const [clusterId, members] of this.semanticClusters) {
        if (members.has(entityId)) {
          relevantClusters.add(clusterId);
        }
      }
    });
    
    // If we found relevant clusters, prioritize searching within them
    const clusterEntityIds = new Set();
    relevantClusters.forEach(clusterId => {
      const members = this.semanticClusters.get(clusterId);
      members?.forEach(id => clusterEntityIds.add(id));
    });
    
    // Perform multi-hop traversal from query entities
    const graphResults = [];
    for (const entity of queryEntities) {
      const paths = await this.traverseGraph(entity, options.maxHops || 2);
      graphResults.push(...paths);
    }
    
    // Combine with traditional search
    const traditionalResults = await super.queryConversationHistory({
      query,
      limit: options.limit || 10
    });
    
    // Merge and rank results
    const contextScores = new Map();
    
    // Score from graph traversal
    graphResults.forEach(({ path, strength }) => {
      path.forEach(edge => {
        if (edge.contextId) {
          const currentScore = contextScores.get(edge.contextId) || 0;
          contextScores.set(edge.contextId, currentScore + strength);
        }
      });
    });
    
    // Boost scores for traditional matches
    traditionalResults.results.forEach(result => {
      const currentScore = contextScores.get(result.id) || 0;
      contextScores.set(result.id, currentScore + 2); // Traditional match bonus
    });
    
    // Get top scored contexts
    const topContextIds = Array.from(contextScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, options.limit || 10)
      .map(([id]) => id);
    
    return {
      query,
      graphNodesTraversed: graphResults.length,
      relevantClusters: Array.from(relevantClusters),
      topContextIds,
      contextScores: Object.fromEntries(contextScores)
    };
  }

  /**
   * Get graph statistics
   */
  getGraphStats() {
    const stats = {
      totalEntities: this.entityGraph.size,
      totalRelationships: Array.from(this.relationshipGraph.values())
        .reduce((sum, rels) => sum + rels.size, 0),
      totalClusters: this.semanticClusters.size,
      entityTypes: {},
      relationshipTypes: {},
      clusterSizes: {}
    };
    
    // Count entity types
    for (const entity of this.entityGraph.values()) {
      stats.entityTypes[entity.type] = (stats.entityTypes[entity.type] || 0) + 1;
    }
    
    // Count relationship types
    for (const relationships of this.relationshipGraph.values()) {
      for (const rel of relationships) {
        stats.relationshipTypes[rel.type] = (stats.relationshipTypes[rel.type] || 0) + 1;
      }
    }
    
    // Cluster sizes
    for (const [clusterId, members] of this.semanticClusters) {
      stats.clusterSizes[clusterId] = members.size;
    }
    
    return stats;
  }
}