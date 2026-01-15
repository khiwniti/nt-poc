import db from '../config/knex.js';

export interface Facility {
  id: string;
  name: string;
  location?: string;
  region?: string;
  lat?: number;
  lng?: number;
  status: 'active' | 'inactive' | 'maintenance';
  metrics?: {
    powerUsage?: number;
    temperature?: number;
    humidity?: number;
    serverLoad?: number;
    pue?: number;
    occupancy?: number;
  };
  created_at?: Date;
  updated_at?: Date;
}

export class FacilityService {
  /**
   * Get all facilities
   */
  async getAll(): Promise<Facility[]> {
    const facilities = await db('facilities').select('*');
    return facilities.map(this.transformFacility);
  }

  /**
   * Get facility by ID
   */
  async getById(id: string): Promise<Facility | null> {
    const facility = await db('facilities').where({ id }).first();
    if (!facility) {
      return null;
    }
    return this.transformFacility(facility);
  }

  /**
   * Update facility metrics (real-time data)
   */
  async updateMetrics(id: string, metrics: Facility['metrics']): Promise<Facility> {
    await db('facilities')
      .where({ id })
      .update({
        metrics: JSON.stringify(metrics),
        updated_at: db.fn.now(),
      });

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Facility ${id} not found after update`);
    }
    return updated;
  }

  /**
   * Transform database facility to API format
   */
  private transformFacility(facility: any): Facility {
    return {
      id: facility.id,
      name: facility.name,
      location: facility.location,
      region: facility.region,
      lat: facility.lat ? parseFloat(facility.lat) : undefined,
      lng: facility.lng ? parseFloat(facility.lng) : undefined,
      status: facility.status,
      metrics: facility.metrics ? (typeof facility.metrics === 'string' ? JSON.parse(facility.metrics) : facility.metrics) : undefined,
      created_at: facility.created_at,
      updated_at: facility.updated_at,
    };
  }
}

export const facilityService = new FacilityService();
