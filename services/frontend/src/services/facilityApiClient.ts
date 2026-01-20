/**
 * NT Facility Management - API Client
 *
 * This service replaces the localStorage-based database with real backend API calls.
 * It provides a clean abstraction layer for all facility management operations.
 *
 * Now with production-ready features:
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern
 * - Request deduplication
 * - Token refresh
 * - Error tracking with Sentry
 */

import { AxiosInstance } from 'axios';
import { apiClient, makeRequest } from '../utils/apiClient.js';
import {
  Branch,
  Alert,
  ReportDocument,
  LeaseContract,
  WorkOrder,
  AssetLifecycle,
  PredictiveAsset,
  SparePart,
  Supplier,
  PurchaseOrder,
} from '../types';

class FacilityAPIClient {
  private client: AxiosInstance;

  constructor() {
    // Use production-ready API client with retry, circuit breaker, etc.
    this.client = apiClient;
  }

  // ============================================================================
  // FACILITIES API
  // ============================================================================

  async getFacilities(): Promise<Branch[]> {
    const response = await this.client.get('/facilities');
    return response.data;
  }

  async getFacility(id: string): Promise<Branch> {
    const response = await this.client.get(`/facilities/${id}`);
    return response.data;
  }

  async updateFacilityMetrics(id: string, metrics: any): Promise<Branch> {
    const response = await this.client.patch(`/facilities/${id}/metrics`, metrics);
    return response.data;
  }

  // ============================================================================
  // ALERTS API
  // ============================================================================

  async getAlerts(filters?: { severity?: string; read?: boolean }): Promise<Alert[]> {
    const response = await this.client.get('/alerts', { params: filters });
    return response.data;
  }

  async createAlert(alert: Omit<Alert, 'id'>): Promise<Alert> {
    const response = await this.client.post('/alerts', alert);
    return response.data;
  }

  async markAlertRead(id: string): Promise<void> {
    await this.client.patch(`/alerts/${id}/read`);
  }

  async clearAllAlerts(): Promise<void> {
    await this.client.delete('/alerts');
  }

  async getAlertSummary(): Promise<{ critical: number; warning: number; info: number }> {
    const response = await this.client.get('/alerts/summary');
    return response.data;
  }

  // ============================================================================
  // REPORTS API
  // ============================================================================

  async getReports(): Promise<ReportDocument[]> {
    const response = await this.client.get('/reports');
    return response.data;
  }

  async getReport(id: string): Promise<ReportDocument> {
    const response = await this.client.get(`/reports/${id}`);
    return response.data;
  }

  async createReport(report: Omit<ReportDocument, 'id'>): Promise<ReportDocument> {
    const response = await this.client.post('/reports', report);
    return response.data;
  }

  async updateReport(id: string, report: Partial<ReportDocument>): Promise<ReportDocument> {
    const response = await this.client.put(`/reports/${id}`, report);
    return response.data;
  }

  async deleteReport(id: string): Promise<void> {
    await this.client.delete(`/reports/${id}`);
  }

  async generateReportFromAlert(alertId: string): Promise<ReportDocument> {
    const response = await this.client.post('/reports/generate', { alertId });
    return response.data;
  }

  // ============================================================================
  // LEASES API
  // ============================================================================

  async getLeases(): Promise<LeaseContract[]> {
    const response = await this.client.get('/leases');
    return response.data;
  }

  async getLease(id: string): Promise<LeaseContract> {
    const response = await this.client.get(`/leases/${id}`);
    return response.data;
  }

  async createLease(lease: Omit<LeaseContract, 'id'>): Promise<LeaseContract> {
    const response = await this.client.post('/leases', lease);
    return response.data;
  }

  async updateLease(id: string, lease: Partial<LeaseContract>): Promise<LeaseContract> {
    const response = await this.client.put(`/leases/${id}`, lease);
    return response.data;
  }

  async deleteLease(id: string): Promise<void> {
    await this.client.delete(`/leases/${id}`);
  }

  async getExpiringLeases(daysThreshold: number = 90): Promise<LeaseContract[]> {
    const response = await this.client.get('/leases/expiring', {
      params: { days: daysThreshold },
    });
    return response.data;
  }

  // ============================================================================
  // WORK ORDERS API
  // ============================================================================

  async getWorkOrders(filters?: { status?: string; priority?: string }): Promise<WorkOrder[]> {
    const response = await this.client.get('/work-orders', { params: filters });
    return response.data;
  }

  async getWorkOrder(id: string): Promise<WorkOrder> {
    const response = await this.client.get(`/work-orders/${id}`);
    return response.data;
  }

  async createWorkOrder(workOrder: Omit<WorkOrder, 'id'>): Promise<WorkOrder> {
    const response = await this.client.post('/work-orders', workOrder);
    return response.data;
  }

  async updateWorkOrder(id: string, workOrder: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await this.client.put(`/work-orders/${id}`, workOrder);
    return response.data;
  }

  async updateWorkOrderStatus(id: string, status: string): Promise<WorkOrder> {
    const response = await this.client.patch(`/work-orders/${id}/status`, { status });
    return response.data;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    await this.client.delete(`/work-orders/${id}`);
  }

  // ============================================================================
  // ASSETS API
  // ============================================================================

  async getAssets(): Promise<AssetLifecycle[]> {
    const response = await this.client.get('/assets');
    return response.data;
  }

  async getAsset(id: string): Promise<AssetLifecycle> {
    const response = await this.client.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(asset: Omit<AssetLifecycle, 'id'>): Promise<AssetLifecycle> {
    const response = await this.client.post('/assets', asset);
    return response.data;
  }

  async updateAsset(id: string, asset: Partial<AssetLifecycle>): Promise<AssetLifecycle> {
    const response = await this.client.put(`/assets/${id}`, asset);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/assets/${id}`);
  }

  async getAssetRiskReport(): Promise<{ highRisk: AssetLifecycle[]; summary: any }> {
    const response = await this.client.get('/assets/risk-report');
    return response.data;
  }

  // ============================================================================
  // PREDICTIVE MAINTENANCE API
  // ============================================================================

  async getPredictiveAssets(): Promise<PredictiveAsset[]> {
    const response = await this.client.get('/predictive-assets');
    return response.data;
  }

  async getPredictiveAsset(id: string): Promise<PredictiveAsset> {
    const response = await this.client.get(`/predictive-assets/${id}`);
    return response.data;
  }

  async analyzePredictiveAsset(id: string): Promise<PredictiveAsset> {
    const response = await this.client.post(`/predictive-assets/${id}/analyze`);
    return response.data;
  }

  // ============================================================================
  // SPARE PARTS API
  // ============================================================================

  async getSpareParts(): Promise<SparePart[]> {
    const response = await this.client.get('/spare-parts');
    return response.data;
  }

  async getSparePart(id: string): Promise<SparePart> {
    const response = await this.client.get(`/spare-parts/${id}`);
    return response.data;
  }

  async createSparePart(part: Omit<SparePart, 'id'>): Promise<SparePart> {
    const response = await this.client.post('/spare-parts', part);
    return response.data;
  }

  async updateSparePart(id: string, part: Partial<SparePart>): Promise<SparePart> {
    const response = await this.client.put(`/spare-parts/${id}`, part);
    return response.data;
  }

  async deleteSparePart(id: string): Promise<void> {
    await this.client.delete(`/spare-parts/${id}`);
  }

  async getLowStockParts(): Promise<SparePart[]> {
    const response = await this.client.get('/spare-parts/low-stock');
    return response.data;
  }

  // ============================================================================
  // SUPPLIERS API
  // ============================================================================

  async getSuppliers(): Promise<Supplier[]> {
    const response = await this.client.get('/suppliers');
    return response.data;
  }

  async getSupplier(id: string): Promise<Supplier> {
    const response = await this.client.get(`/suppliers/${id}`);
    return response.data;
  }

  async createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    const response = await this.client.post('/suppliers', supplier);
    return response.data;
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    const response = await this.client.put(`/suppliers/${id}`, supplier);
    return response.data;
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.client.delete(`/suppliers/${id}`);
  }

  // ============================================================================
  // PURCHASE ORDERS API
  // ============================================================================

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const response = await this.client.get('/purchase-orders');
    return response.data;
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const response = await this.client.get(`/purchase-orders/${id}`);
    return response.data;
  }

  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    const response = await this.client.post('/purchase-orders', po);
    return response.data;
  }

  async updatePurchaseOrder(id: string, po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const response = await this.client.put(`/purchase-orders/${id}`, po);
    return response.data;
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<PurchaseOrder> {
    const response = await this.client.patch(`/purchase-orders/${id}/status`, { status });
    return response.data;
  }

  // ============================================================================
  // SETTINGS API
  // ============================================================================

  async getSettings(): Promise<any> {
    const response = await this.client.get('/settings');
    return response.data;
  }

  async updateSettings(settings: any): Promise<any> {
    const response = await this.client.put('/settings', settings);
    return response.data;
  }
}

// Export singleton instance
export const api = new FacilityAPIClient();
export default api;
