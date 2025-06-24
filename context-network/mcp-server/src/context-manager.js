import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ContextNetworkManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.conversationsDir = path.join(this.dataDir, 'conversations');
    this.projectsDir = path.join(this.dataDir, 'projects');
    this.preferencesDir = path.join(this.dataDir, 'preferences');
    this.decisionsDir = path.join(this.dataDir, 'decisions');
    this.threadsDir = path.join(this.dataDir, 'threads');
  }

  async initialize() {
    // Ensure all directories exist
    const dirs = [
      this.dataDir,
      this.conversationsDir,
      this.projectsDir,
      this.preferencesDir,
      this.decisionsDir,
      this.threadsDir
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Initialize index files if they don't exist
    await this.ensureIndexFile(path.join(this.conversationsDir, 'index.json'), []);
    await this.ensureIndexFile(path.join(this.projectsDir, 'index.json'), {});
    await this.ensureIndexFile(path.join(this.preferencesDir, 'preferences.json'), {});
    await this.ensureIndexFile(path.join(this.decisionsDir, 'index.json'), []);
    await this.ensureIndexFile(path.join(this.threadsDir, 'index.json'), []);
  }

  async ensureIndexFile(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }

  generateId() {
    return crypto.randomUUID();
  }

  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Helper function for safe JSON parsing with better error messages
  safeJSONParse(jsonString, context = 'unknown') {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error(`JSON parsing error in ${context}:`, error.message);
      console.error('Problematic JSON content preview:', jsonString.substring(0, 200) + '...');
      
      // Try to identify problematic characters
      const problematicChars = jsonString.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
      if (problematicChars) {
        console.error('Found emojis that might cause issues:', problematicChars.slice(0, 10));
      }
      
      throw new Error(`JSON parsing failed in ${context}: ${error.message}`);
    }
  }

  // Conversation Context Management
  async recordConversationContext({ summary, keyPoints = [], topic, tags = [], relatedConversations = [] }) {
    const conversationId = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const conversationRecord = {
      id: conversationId,
      timestamp,
      summary,
      keyPoints,
      topic,
      tags,
      relatedConversations,
      metadata: {
        created: timestamp,
        lastAccessed: timestamp,
        accessCount: 0
      }
    };

    // Save individual conversation file
    const conversationFile = path.join(this.conversationsDir, `${conversationId}.json`);
    await fs.writeFile(conversationFile, JSON.stringify(conversationRecord, null, 2));

    // Update index
    await this.updateConversationIndex(conversationRecord);

    return {
      success: true,
      conversationId,
      message: `Conversation context recorded with ID: ${conversationId}`
    };
  }

  async updateConversationIndex(conversationRecord) {
    const indexFile = path.join(this.conversationsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'conversation index');

    index.push({
      id: conversationRecord.id,
      timestamp: conversationRecord.timestamp,
      summary: conversationRecord.summary,
      topic: conversationRecord.topic,
      tags: conversationRecord.tags
    });

    // Keep only last 1000 conversations in index
    if (index.length > 1000) {
      index.splice(0, index.length - 1000);
    }

    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
  }

  async queryConversationHistory({ query, topic, timeframe = 'all_time', limit = 10 }) {
    const indexFile = path.join(this.conversationsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'conversation history query');

    let filtered = [...index];

    // Filter by timeframe
    if (timeframe !== 'all_time') {
      const timeMap = {
        'last_week': 7 * 24 * 60 * 60 * 1000,
        'last_month': 30 * 24 * 60 * 60 * 1000,
        'last_3_months': 90 * 24 * 60 * 60 * 1000
      };

      const cutoffTime = new Date(Date.now() - timeMap[timeframe]);
      filtered = filtered.filter(conv => new Date(conv.timestamp) > cutoffTime);
    }

    // Filter by topic
    if (topic) {
      filtered = filtered.filter(conv => 
        conv.topic?.toLowerCase().includes(topic.toLowerCase())
      );
    }

    // Search by query
    if (query) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.summary?.toLowerCase().includes(queryLower) ||
        conv.topic?.toLowerCase().includes(queryLower) ||
        conv.tags?.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // Sort by recency and limit
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    filtered = filtered.slice(0, limit);

    // Load full conversation details for results
    const results = [];
    for (const indexEntry of filtered) {
      try {
        const conversationFile = path.join(this.conversationsDir, `${indexEntry.id}.json`);
        const conversation = this.safeJSONParse(await fs.readFile(conversationFile, 'utf-8'), `conversation file ${indexEntry.id}`);
        
        // Update access metadata
        conversation.metadata.lastAccessed = this.getCurrentTimestamp();
        conversation.metadata.accessCount++;
        await fs.writeFile(conversationFile, JSON.stringify(conversation, null, 2));
        
        results.push(conversation);
      } catch (error) {
        console.error(`Error loading conversation ${indexEntry.id}:`, error);
      }
    }

    return {
      query,
      totalFound: filtered.length,
      results
    };
  }

  // User Preferences Management
  async updateUserPreferences({ category, key, value, description }) {
    const preferencesFile = path.join(this.preferencesDir, 'preferences.json');
    const preferences = this.safeJSONParse(await fs.readFile(preferencesFile, 'utf-8'), 'user preferences update');

    if (!preferences[category]) {
      preferences[category] = {};
    }

    preferences[category][key] = {
      value,
      description: description || '',
      updated: this.getCurrentTimestamp()
    };

    await fs.writeFile(preferencesFile, JSON.stringify(preferences, null, 2));

    return {
      success: true,
      message: `Preference ${category}.${key} updated`
    };
  }

  async getUserPreferences({ category, key }) {
    const preferencesFile = path.join(this.preferencesDir, 'preferences.json');
    const preferences = this.safeJSONParse(await fs.readFile(preferencesFile, 'utf-8'), 'user preferences get');

    if (category && key) {
      return {
        category,
        key,
        preference: preferences[category]?.[key] || null
      };
    } else if (category) {
      return {
        category,
        preferences: preferences[category] || {}
      };
    } else {
      return {
        allPreferences: preferences
      };
    }
  }

  // Project Context Management
  async recordProjectContext({ projectName, context, type, tags = [], relatedItems = [] }) {
    const projectDir = path.join(this.projectsDir, projectName);
    await fs.mkdir(projectDir, { recursive: true });

    const contextId = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const contextRecord = {
      id: contextId,
      projectName,
      context,
      type,
      tags,
      relatedItems,
      timestamp,
      metadata: {
        created: timestamp,
        lastAccessed: timestamp
      }
    };

    // Save context record
    const contextFile = path.join(projectDir, `${contextId}.json`);
    await fs.writeFile(contextFile, JSON.stringify(contextRecord, null, 2));

    // Update project index
    await this.updateProjectIndex(projectName, contextRecord);

    return {
      success: true,
      contextId,
      message: `Project context recorded for ${projectName}`
    };
  }

  // Helper function to safely truncate text with emojis
  safeTruncate(text, maxLength = 100) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Use Array.from to handle multi-byte characters properly
    const characters = Array.from(text);
    if (characters.length <= maxLength) {
      return text;
    }
    
    return characters.slice(0, maxLength).join('') + '...';
  }

  async updateProjectIndex(projectName, contextRecord) {
    const indexFile = path.join(this.projectsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'project index update');

    if (!index[projectName]) {
      index[projectName] = [];
    }

    index[projectName].push({
      id: contextRecord.id,
      type: contextRecord.type,
      context: this.safeTruncate(contextRecord.context, 100),
      tags: contextRecord.tags,
      timestamp: contextRecord.timestamp
    });

    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
  }

  async getProjectContext({ projectName, type, query }) {
    const projectDir = path.join(this.projectsDir, projectName);
    const indexFile = path.join(this.projectsDir, 'index.json');

    try {
      const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'project context get');
      let projectContexts = index[projectName] || [];

      // Filter by type
      if (type) {
        projectContexts = projectContexts.filter(ctx => ctx.type === type);
      }

      // Search by query
      if (query) {
        const queryLower = query.toLowerCase();
        projectContexts = projectContexts.filter(ctx =>
          ctx.context.toLowerCase().includes(queryLower) ||
          ctx.tags.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }

      // Load full context details
      const results = [];
      for (const indexEntry of projectContexts) {
        try {
          const contextFile = path.join(projectDir, `${indexEntry.id}.json`);
          const context = this.safeJSONParse(await fs.readFile(contextFile, 'utf-8'), `project context file ${indexEntry.id}`);
          results.push(context);
        } catch (error) {
          console.error(`Error loading context ${indexEntry.id}:`, error);
        }
      }

      return {
        projectName,
        totalFound: results.length,
        results
      };
    } catch (error) {
      return {
        projectName,
        totalFound: 0,
        results: [],
        message: `Project ${projectName} not found or no context available`
      };
    }
  }

  // Context Threading
  async createContextThread({ threadId, title, description, conversationIds, tags = [] }) {
    if (!threadId) {
      threadId = this.generateId();
    }

    const timestamp = this.getCurrentTimestamp();

    const thread = {
      id: threadId,
      title,
      description,
      conversationIds,
      tags,
      created: timestamp,
      lastUpdated: timestamp
    };

    // Save thread file
    const threadFile = path.join(this.threadsDir, `${threadId}.json`);
    await fs.writeFile(threadFile, JSON.stringify(thread, null, 2));

    // Update thread index
    await this.updateThreadIndex(thread);

    return {
      success: true,
      threadId,
      message: `Context thread created: ${title}`
    };
  }

  async updateThreadIndex(thread) {
    const indexFile = path.join(this.threadsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'thread index update');

    // Remove existing entry if updating
    const existingIndex = index.findIndex(t => t.id === thread.id);
    if (existingIndex !== -1) {
      index.splice(existingIndex, 1);
    }

    index.push({
      id: thread.id,
      title: thread.title,
      tags: thread.tags,
      conversationCount: thread.conversationIds.length,
      lastUpdated: thread.lastUpdated
    });

    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
  }

  async getContextThreads({ threadId, query, tag }) {
    const indexFile = path.join(this.threadsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'context threads get');

    let filtered = [...index];

    // Filter by specific thread ID
    if (threadId) {
      filtered = filtered.filter(thread => thread.id === threadId);
    }

    // Filter by tag
    if (tag) {
      filtered = filtered.filter(thread => 
        thread.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    // Search by query
    if (query) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(thread =>
        thread.title.toLowerCase().includes(queryLower) ||
        thread.tags.some(t => t.toLowerCase().includes(queryLower))
      );
    }

    // Load full thread details
    const results = [];
    for (const indexEntry of filtered) {
      try {
        const threadFile = path.join(this.threadsDir, `${indexEntry.id}.json`);
        const thread = this.safeJSONParse(await fs.readFile(threadFile, 'utf-8'), `thread file ${indexEntry.id}`);
        results.push(thread);
      } catch (error) {
        console.error(`Error loading thread ${indexEntry.id}:`, error);
      }
    }

    return {
      totalFound: results.length,
      results
    };
  }

  // Decision Recording
  async recordDecision({ decision, context, alternatives = [], impact = 'medium', project, tags = [] }) {
    const decisionId = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const decisionRecord = {
      id: decisionId,
      decision,
      context,
      alternatives,
      impact,
      project,
      tags,
      timestamp,
      metadata: {
        created: timestamp,
        lastAccessed: timestamp
      }
    };

    // Save decision file
    const decisionFile = path.join(this.decisionsDir, `${decisionId}.json`);
    await fs.writeFile(decisionFile, JSON.stringify(decisionRecord, null, 2));

    // Update decision index
    await this.updateDecisionIndex(decisionRecord);

    return {
      success: true,
      decisionId,
      message: `Decision recorded with ID: ${decisionId}`
    };
  }

  async updateDecisionIndex(decisionRecord) {
    const indexFile = path.join(this.decisionsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'decision index update');

    index.push({
      id: decisionRecord.id,
      decision: this.safeTruncate(decisionRecord.decision, 100),
      impact: decisionRecord.impact,
      project: decisionRecord.project,
      tags: decisionRecord.tags,
      timestamp: decisionRecord.timestamp
    });

    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
  }

  async getDecisions({ query, project, impact, timeframe = 'all_time' }) {
    const indexFile = path.join(this.decisionsDir, 'index.json');
    const index = this.safeJSONParse(await fs.readFile(indexFile, 'utf-8'), 'decisions get');

    let filtered = [...index];

    // Filter by timeframe
    if (timeframe !== 'all_time') {
      const timeMap = {
        'last_week': 7 * 24 * 60 * 60 * 1000,
        'last_month': 30 * 24 * 60 * 60 * 1000,
        'last_3_months': 90 * 24 * 60 * 60 * 1000
      };

      const cutoffTime = new Date(Date.now() - timeMap[timeframe]);
      filtered = filtered.filter(decision => new Date(decision.timestamp) > cutoffTime);
    }

    // Filter by project
    if (project) {
      filtered = filtered.filter(decision => decision.project === project);
    }

    // Filter by impact
    if (impact) {
      filtered = filtered.filter(decision => decision.impact === impact);
    }

    // Search by query
    if (query) {
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(decision =>
        decision.decision.toLowerCase().includes(queryLower) ||
        decision.tags.some(tag => tag.toLowerCase().includes(queryLower))
      );
    }

    // Load full decision details
    const results = [];
    for (const indexEntry of filtered) {
      try {
        const decisionFile = path.join(this.decisionsDir, `${indexEntry.id}.json`);
        const decision = this.safeJSONParse(await fs.readFile(decisionFile, 'utf-8'), `decision file ${indexEntry.id}`);
        results.push(decision);
      } catch (error) {
        console.error(`Error loading decision ${indexEntry.id}:`, error);
      }
    }

    return {
      totalFound: results.length,
      results
    };
  }
}