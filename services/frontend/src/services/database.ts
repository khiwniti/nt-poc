/**
 * Database Service - API Backend Integration
 *
 * This replaces the localStorage MockDatabase with real backend API calls.
 * Provides the same interface as the original database.ts but uses facilityApiClient.
 */

import { api } from './facilityApiClient';
import {
  ReportDocument,
  LeaseContract,
  WorkOrder,
  AssetLifecycle,
  PredictiveAsset,
  SparePart,
  Supplier,
  PurchaseOrder,
} from '../types';

class DatabaseService {
  // ============================================================================
  // SETTINGS
  // ============================================================================

  getSettings() {
    return api.getSettings();
  }

  updateSettings(settings: any) {
    return api.updateSettings(settings);
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  getReports(): Promise<ReportDocument[]> {
    return api.getReports();
  }

  getReport(id: string): Promise<ReportDocument> {
    return api.getReport(id);
  }

  createReport(report: Omit<ReportDocument, 'id'>): Promise<ReportDocument> {
    return api.createReport(report);
  }

  updateReport(id: string, updates: Partial<ReportDocument>): Promise<ReportDocument> {
    return api.updateReport(id, updates);
  }

  deleteReport(id: string): Promise<void> {
    return api.deleteReport(id);
  }

  // ============================================================================
  // LEASES
  // ============================================================================

  getLeases(): Promise<LeaseContract[]> {
    return api.getLeases();
  }

  getLease(id: string): Promise<LeaseContract> {
    return api.getLease(id);
  }

  createLease(lease: Omit<LeaseContract, 'id'>): Promise<LeaseContract> {
    return api.createLease(lease);
  }

  updateLease(id: string, updates: Partial<LeaseContract>): Promise<LeaseContract> {
    return api.updateLease(id, updates);
  }

  deleteLease(id: string): Promise<void> {
    return api.deleteLease(id);
  }

  // ============================================================================
  // WORK ORDERS
  // ============================================================================

  getWorkOrders(): Promise<WorkOrder[]> {
    return api.getWorkOrders();
  }

  getWorkOrder(id: string): Promise<WorkOrder> {
    return api.getWorkOrder(id);
  }

  createWorkOrder(workOrder: Omit<WorkOrder, 'id'>): Promise<WorkOrder> {
    return api.createWorkOrder(workOrder);
  }

  updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    return api.updateWorkOrder(id, updates);
  }

  deleteWorkOrder(id: string): Promise<void> {
    return api.deleteWorkOrder(id);
  }

  // ============================================================================
  // ASSETS
  // ============================================================================

  getAssets(): Promise<AssetLifecycle[]> {
    return api.getAssets();
  }

  getAsset(id: string): Promise<AssetLifecycle> {
    return api.getAsset(id);
  }

  createAsset(asset: Omit<AssetLifecycle, 'id'>): Promise<AssetLifecycle> {
    return api.createAsset(asset);
  }

  updateAsset(id: string, updates: Partial<AssetLifecycle>): Promise<AssetLifecycle> {
    return api.updateAsset(id, updates);
  }

  deleteAsset(id: string): Promise<void> {
    return api.deleteAsset(id);
  }

  // ============================================================================
  // PREDICTIVE ASSETS
  // ============================================================================

  getPredictiveAssets(): Promise<PredictiveAsset[]> {
    return api.getPredictiveAssets();
  }

  getPredictiveAsset(id: string): Promise<PredictiveAsset> {
    return api.getPredictiveAsset(id);
  }

  // ============================================================================
  // SPARE PARTS
  // ============================================================================

  getSpareParts(): Promise<SparePart[]> {
    return api.getSpareParts();
  }

  getSparePart(id: string): Promise<SparePart> {
    return api.getSparePart(id);
  }

  createSparePart(part: Omit<SparePart, 'id'>): Promise<SparePart> {
    return api.createSparePart(part);
  }

  updateSparePart(id: string, updates: Partial<SparePart>): Promise<SparePart> {
    return api.updateSparePart(id, updates);
  }

  deleteSparePart(id: string): Promise<void> {
    return api.deleteSparePart(id);
  }

  // ============================================================================
  // SUPPLIERS
  // ============================================================================

  getSuppliers(): Promise<Supplier[]> {
    return api.getSuppliers();
  }

  getSupplier(id: string): Promise<Supplier> {
    return api.getSupplier(id);
  }

  createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    return api.createSupplier(supplier);
  }

  updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    return api.updateSupplier(id, updates);
  }

  deleteSupplier(id: string): Promise<void> {
    return api.deleteSupplier(id);
  }

  // ============================================================================
  // PURCHASE ORDERS
  // ============================================================================

  getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return api.getPurchaseOrders();
  }

  getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return api.getPurchaseOrder(id);
  }

  createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    return api.createPurchaseOrder(po);
  }

  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return api.updatePurchaseOrder(id, updates);
  }
}

// Export singleton instance
export const db = new DatabaseService();
export default db;
