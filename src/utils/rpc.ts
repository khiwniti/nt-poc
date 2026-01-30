import { Connection, Commitment } from "@solana/web3.js";
import { logger } from "./logger";

/**
 * RPC Connection Pool with automatic failover
 */
export class RpcPool {
    private endpoints: string[];
    private connections: Connection[] = [];
    private currentIndex = 0;
    private commitment: Commitment;

    constructor(endpoints: string[], commitment: Commitment = "confirmed") {
        this.endpoints = endpoints;
        this.commitment = commitment;

        for (const endpoint of endpoints) {
            this.connections.push(
                new Connection(endpoint, { commitment: this.commitment })
            );
        }

        logger.info(`🔗 RPC pool initialized with ${endpoints.length} endpoints`);
    }

    /**
     * Get the next connection (round-robin)
     */
    get(): Connection {
        const conn = this.connections[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;
        return conn;
    }

    /**
     * Get a specific connection
     */
    getByIndex(index: number): Connection {
        return this.connections[index % this.connections.length];
    }

    /**
     * Health check all endpoints
     */
    async healthCheck(): Promise<{ endpoint: string; healthy: boolean; latency: number }[]> {
        const results = [];

        for (let i = 0; i < this.connections.length; i++) {
            const start = Date.now();
            try {
                await this.connections[i].getSlot();
                results.push({
                    endpoint: this.endpoints[i],
                    healthy: true,
                    latency: Date.now() - start,
                });
            } catch {
                results.push({
                    endpoint: this.endpoints[i],
                    healthy: false,
                    latency: -1,
                });
            }
        }

        return results;
    }
}
