/**
 * Graph visualization utilities for the context network
 * Generates Mermaid diagrams for entity relationships
 */
export class GraphVisualizer {
  /**
   * Generate a Mermaid graph diagram from entity relationships
   */
  static generateMermaidGraph(entities, relationships, options = {}) {
    const { maxNodes = 50, focusEntity = null, showClusters = true } = options;
    
    let mermaid = 'graph TD\n';
    
    // Track which entities to include
    const includedEntities = new Set();
    
    if (focusEntity) {
      // If focusing on an entity, only include it and its direct connections
      includedEntities.add(this.getEntityKey(focusEntity));
      relationships.forEach(rel => {
        if (this.getEntityKey(rel.from) === this.getEntityKey(focusEntity)) {
          includedEntities.add(this.getEntityKey(rel.to));
        }
        if (this.getEntityKey(rel.to) === this.getEntityKey(focusEntity)) {
          includedEntities.add(this.getEntityKey(rel.from));
        }
      });
    } else {
      // Include top entities by connection count
      const connectionCounts = new Map();
      relationships.forEach(rel => {
        const fromKey = this.getEntityKey(rel.from);
        const toKey = this.getEntityKey(rel.to);
        connectionCounts.set(fromKey, (connectionCounts.get(fromKey) || 0) + 1);
        connectionCounts.set(toKey, (connectionCounts.get(toKey) || 0) + 1);
      });
      
      const topEntities = Array.from(connectionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxNodes)
        .map(([key]) => key);
      
      topEntities.forEach(key => includedEntities.add(key));
    }
    
    // Define nodes with styling based on type
    const nodeDefinitions = new Map();
    entities.forEach(entity => {
      const key = this.getEntityKey(entity);
      if (includedEntities.has(key)) {
        const nodeId = this.sanitizeNodeId(key);
        const label = this.truncateLabel(entity.name);
        const style = this.getNodeStyle(entity.type);
        
        nodeDefinitions.set(key, nodeId);
        mermaid += `    ${nodeId}[${label}]${style}\n`;
      }
    });
    
    // Add relationships
    const addedRelationships = new Set();
    relationships.forEach(rel => {
      const fromKey = this.getEntityKey(rel.from);
      const toKey = this.getEntityKey(rel.to);
      
      if (includedEntities.has(fromKey) && includedEntities.has(toKey)) {
        const fromId = nodeDefinitions.get(fromKey);
        const toId = nodeDefinitions.get(toKey);
        const relKey = `${fromId}-${toId}-${rel.type}`;
        
        // Avoid duplicate relationships
        if (!addedRelationships.has(relKey)) {
          addedRelationships.add(relKey);
          const arrow = this.getArrowStyle(rel.type);
          const label = rel.type.replace(/_/g, ' ');
          mermaid += `    ${fromId} ${arrow}|${label}| ${toId}\n`;
        }
      }
    });
    
    // Add cluster subgraphs if requested
    if (showClusters && options.clusters) {
      mermaid += '\n';
      options.clusters.forEach((cluster, idx) => {
        mermaid += `    subgraph cluster${idx}[${cluster.name}]\n`;
        cluster.members.forEach(entityKey => {
          if (nodeDefinitions.has(entityKey)) {
            mermaid += `        ${nodeDefinitions.get(entityKey)}\n`;
          }
        });
        mermaid += '    end\n';
      });
    }
    
    // Add styling
    mermaid += this.getGraphStyling();
    
    return mermaid;
  }
  
  /**
   * Generate a timeline view of context evolution
   */
  static generateTimelineGraph(contexts, relationships) {
    let mermaid = 'gantt\n';
    mermaid += '    title Context Evolution Timeline\n';
    mermaid += '    dateFormat YYYY-MM-DD HH:mm\n';
    mermaid += '    axisFormat %H:%M\n\n';
    
    // Group contexts by project or topic
    const grouped = new Map();
    contexts.forEach(ctx => {
      const group = ctx.projectName || ctx.topic || 'General';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group).push(ctx);
    });
    
    // Generate timeline entries
    grouped.forEach((ctxList, groupName) => {
      mermaid += `    section ${groupName}\n`;
      ctxList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      ctxList.forEach((ctx, idx) => {
        const label = this.truncateLabel(ctx.summary || ctx.id, 30);
        const startTime = new Date(ctx.timestamp).toISOString().slice(0, 16).replace('T', ' ');
        
        if (idx < ctxList.length - 1) {
          const endTime = new Date(ctxList[idx + 1].timestamp).toISOString().slice(0, 16).replace('T', ' ');
          mermaid += `    ${label} :${startTime}, ${endTime}\n`;
        } else {
          mermaid += `    ${label} :${startTime}, 1h\n`;
        }
      });
    });
    
    return mermaid;
  }
  
  /**
   * Generate a cluster visualization
   */
  static generateClusterDiagram(clusters, entityGraph) {
    let mermaid = 'graph TB\n';
    
    clusters.forEach((members, clusterId) => {
      const clusterName = this.getClusterName(clusterId);
      mermaid += `    subgraph ${clusterId}["${clusterName}"]\n`;
      
      // Add top entities from each cluster
      const topEntities = Array.from(members).slice(0, 10);
      topEntities.forEach(entityId => {
        const entity = entityGraph.get(entityId);
        if (entity) {
          const nodeId = this.sanitizeNodeId(entityId);
          const label = this.truncateLabel(entity.name, 20);
          mermaid += `        ${nodeId}[${label}]\n`;
        }
      });
      
      mermaid += '    end\n';
    });
    
    // Add inter-cluster relationships
    mermaid += '\n    %% Inter-cluster relationships\n';
    mermaid += '    classDef cluster fill:#f9f9f9,stroke:#333,stroke-width:2px\n';
    
    return mermaid;
  }
  
  // Helper methods
  static getEntityKey(entity) {
    return `${entity.type}:${entity.name}`;
  }
  
  static sanitizeNodeId(key) {
    return key.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }
  
  static truncateLabel(text, maxLen = 30) {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
  }
  
  static getNodeStyle(type) {
    const styles = {
      project: ':::project',
      tool: ':::tool',
      file: ':::file',
      decision: ':::decision',
      tag: ':::tag',
      concept: ':::concept'
    };
    return styles[type] || '';
  }
  
  static getArrowStyle(relationType) {
    const arrows = {
      contains: '-->',
      tags: '-.->',
      operates_on: '==>',
      impacts: '==>', 
      evolves_to: '-->>',
      references: '-->'
    };
    return arrows[relationType] || '-->';
  }
  
  static getClusterName(clusterId) {
    // Extract meaningful name from cluster ID
    if (clusterId.includes('_cluster')) {
      return clusterId.replace('_cluster', '').charAt(0).toUpperCase() + 
             clusterId.replace('_cluster', '').slice(1) + 's';
    }
    return clusterId;
  }
  
  static getGraphStyling() {
    return `
    classDef project fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef tool fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef file fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef decision fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef tag fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef concept fill:#fafafa,stroke:#424242,stroke-width:1px
    classDef default fill:#f5f5f5,stroke:#616161,stroke-width:1px`;
  }
  
  /**
   * Generate a simple text-based graph summary
   */
  static generateTextSummary(stats, topEntities, topRelationships) {
    let summary = '## Context Network Graph Summary\n\n';
    
    summary += '### Overview\n';
    summary += `- Total Entities: ${stats.totalEntities}\n`;
    summary += `- Total Relationships: ${stats.totalRelationships}\n`;
    summary += `- Semantic Clusters: ${stats.totalClusters}\n\n`;
    
    summary += '### Entity Distribution\n';
    Object.entries(stats.entityTypes).forEach(([type, count]) => {
      summary += `- ${type}: ${count}\n`;
    });
    
    summary += '\n### Relationship Types\n';
    Object.entries(stats.relationshipTypes).forEach(([type, count]) => {
      summary += `- ${type}: ${count}\n`;
    });
    
    summary += '\n### Top Connected Entities\n';
    topEntities.forEach((entity, idx) => {
      summary += `${idx + 1}. ${entity.name} (${entity.type}) - ${entity.connections} connections\n`;
    });
    
    summary += '\n### Cluster Sizes\n';
    Object.entries(stats.clusterSizes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cluster, size]) => {
        summary += `- ${this.getClusterName(cluster)}: ${size} entities\n`;
      });
    
    return summary;
  }
}