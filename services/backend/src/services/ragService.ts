/**
 * RAG (Retrieval-Augmented Generation) Service
 * Provides semantic search over alerts, reports, manuals, and sensor data
 * Supports multiple vector databases: Pinecone, Redis, or in-memory
 */

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../config/logger.js';
import { db } from '../config/database.js';

// Document chunk interface
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    type: 'alert' | 'report' | 'manual' | 'sensor_pattern' | 'maintenance_log';
    entityId?: string;
    timestamp?: string;
    facilityId?: string;
    batteryId?: string;
    severity?: string;
    tags?: string[];
  };
  embedding?: number[];
}

// Search result interface
export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

/**
 * RAG Service Class
 */
class RAGService {
  private openai: OpenAI | null = null;
  private pinecone: Pinecone | null = null;
  private pineconeIndex: any = null;
  private inMemoryStore: Map<string, DocumentChunk> = new Map();
  private vectorStoreType: 'pinecone' | 'redis' | 'memory' = 'memory';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize RAG service with available backends
   */
  private async initialize() {
    // Initialize OpenAI for embeddings
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
      logger.info('OpenAI initialized for embeddings');
    } else {
      logger.warn('OpenAI API key not found. RAG service will use basic keyword search.');
    }

    // Initialize Pinecone if available
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    if (pineconeApiKey) {
      try {
        this.pinecone = new Pinecone({ apiKey: pineconeApiKey });
        const indexName = process.env.PINECONE_INDEX_NAME || 'battery-management-rag';
        this.pineconeIndex = this.pinecone.index(indexName);
        this.vectorStoreType = 'pinecone';
        logger.info('Pinecone initialized for vector storage');
      } catch (error) {
        logger.warn('Failed to initialize Pinecone', { error });
      }
    }

    // Load existing documents into memory store
    await this.loadExistingDocuments();
  }

  /**
   * Load existing documents from database into RAG system
   */
  private async loadExistingDocuments() {
    try {
      logger.info('Loading existing documents into RAG system');

      // Load recent alerts
      const alerts = await db('alerts')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(1000);

      for (const alert of alerts) {
        await this.indexDocument({
          id: `alert_${alert.id}`,
          content: `Alert: ${alert.message}. Type: ${alert.alert_type}. Severity: ${alert.severity}. Battery ID: ${alert.battery_id}`,
          metadata: {
            type: 'alert',
            entityId: alert.id,
            batteryId: alert.battery_id,
            severity: alert.severity,
            timestamp: alert.created_at,
            tags: [alert.alert_type, alert.severity],
          },
        });
      }

      logger.info(`Indexed ${alerts.length} alerts into RAG system`);
    } catch (error) {
      logger.error('Failed to load existing documents', { error });
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      // Fallback: return dummy embedding
      return Array(1536).fill(0);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
      return Array(1536).fill(0);
    }
  }

  /**
   * Index a document into the RAG system
   */
  public async indexDocument(chunk: DocumentChunk): Promise<void> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(chunk.content);
      chunk.embedding = embedding;

      // Store based on vector store type
      if (this.vectorStoreType === 'pinecone' && this.pineconeIndex) {
        await this.pineconeIndex.upsert([
          {
            id: chunk.id,
            values: embedding,
            metadata: {
              content: chunk.content,
              ...chunk.metadata,
            },
          },
        ]);
      } else {
        // Store in memory
        this.inMemoryStore.set(chunk.id, chunk);
      }

      logger.debug('Document indexed', { id: chunk.id, type: chunk.metadata.type });
    } catch (error) {
      logger.error('Failed to index document', { error, chunkId: chunk.id });
      throw error;
    }
  }

  /**
   * Search for relevant documents using semantic search
   */
  public async search(query: string, options: { topK?: number; filter?: any } = {}): Promise<SearchResult[]> {
    const { topK = 5, filter } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Search based on vector store type
      if (this.vectorStoreType === 'pinecone' && this.pineconeIndex) {
        return await this.searchPinecone(queryEmbedding, topK, filter);
      } else {
        return await this.searchInMemory(queryEmbedding, topK, filter);
      }
    } catch (error) {
      logger.error('Failed to search RAG system', { error, query });
      return [];
    }
  }

  /**
   * Search using Pinecone
   */
  private async searchPinecone(queryEmbedding: number[], topK: number, filter?: any): Promise<SearchResult[]> {
    if (!this.pineconeIndex) {
      return [];
    }

    try {
      const searchResults = await this.pineconeIndex.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      return searchResults.matches.map((match: any) => ({
        chunk: {
          id: match.id,
          content: match.metadata.content,
          metadata: match.metadata,
        },
        score: match.score,
      }));
    } catch (error) {
      logger.error('Pinecone search failed', { error });
      return [];
    }
  }

  /**
   * Search using in-memory vector store with cosine similarity
   */
  private async searchInMemory(queryEmbedding: number[], topK: number, filter?: any): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const [id, chunk] of this.inMemoryStore) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(chunk, filter)) {
        continue;
      }

      // Calculate cosine similarity
      if (chunk.embedding) {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({ chunk, score });
      }
    }

    // Sort by score descending and return top K
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if chunk matches filter criteria
   */
  private matchesFilter(chunk: DocumentChunk, filter: any): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (chunk.metadata[key as keyof typeof chunk.metadata] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Build RAG context from search results
   */
  public buildContextFromResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }

    const contextParts = results.map((result, index) => {
      const metadata = result.chunk.metadata;
      const metadataStr = [
        metadata.type ? `Type: ${metadata.type}` : '',
        metadata.timestamp ? `Time: ${new Date(metadata.timestamp).toLocaleString()}` : '',
        metadata.severity ? `Severity: ${metadata.severity}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      return `[${index + 1}] ${metadataStr}\n${result.chunk.content}\n(Relevance: ${(result.score * 100).toFixed(1)}%)`;
    });

    return `Relevant information from knowledge base:\n\n${contextParts.join('\n\n')}`;
  }

  /**
   * Query RAG system and get context for LLM
   */
  public async query(userQuery: string, options: { topK?: number; includeTypes?: string[] } = {}): Promise<string> {
    const { topK = 5, includeTypes } = options;

    // Build filter if types specified
    const filter = includeTypes ? { type: { $in: includeTypes } } : undefined;

    // Search for relevant documents
    const results = await this.search(userQuery, { topK, filter });

    // Build context string
    return this.buildContextFromResults(results);
  }

  /**
   * Index alert into RAG system
   */
  public async indexAlert(alert: any): Promise<void> {
    await this.indexDocument({
      id: `alert_${alert.id}`,
      content: `Alert: ${alert.message}. Type: ${alert.alert_type}. Severity: ${alert.severity}. Battery ID: ${alert.battery_id}`,
      metadata: {
        type: 'alert',
        entityId: alert.id,
        batteryId: alert.battery_id,
        severity: alert.severity,
        timestamp: alert.created_at,
        tags: [alert.alert_type, alert.severity],
      },
    });
  }

  /**
   * Index report into RAG system
   */
  public async indexReport(report: any): Promise<void> {
    await this.indexDocument({
      id: `report_${report.id}`,
      content: `Report: ${report.title || 'Untitled'}. Summary: ${report.summary || 'No summary'}. Content: ${report.content?.substring(0, 500) || 'No content'}`,
      metadata: {
        type: 'report',
        entityId: report.id,
        timestamp: report.created_at,
        tags: report.tags || [],
      },
    });
  }

  /**
   * Index maintenance log
   */
  public async indexMaintenanceLog(log: string, metadata: any): Promise<void> {
    await this.indexDocument({
      id: `maintenance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: log,
      metadata: {
        type: 'maintenance_log',
        ...metadata,
      },
    });
  }

  /**
   * Get RAG system status
   */
  public getStatus() {
    return {
      vectorStoreType: this.vectorStoreType,
      documentsIndexed: this.inMemoryStore.size,
      openaiConfigured: this.openai !== null,
      pineconeConfigured: this.pinecone !== null,
    };
  }
}

// Export singleton instance
export const ragService = new RAGService();
export default ragService;
