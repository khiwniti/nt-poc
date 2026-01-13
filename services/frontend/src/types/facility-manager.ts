
export interface Branch {
  id: string;
  name: string;
  region: 'Northern' | 'Northeastern' | 'Central' | 'Eastern' | 'Southern';
  coordinates: { x: number; y: number };
  status: 'operational' | 'warning' | 'critical';
  metrics: {
    powerUsage: number;
    temperature: number;
    humidity: number;
    serverLoad: number;
    pue: number;
    occupancy: number;
  };
  lat: number;
  lng: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  uvIndex: number;
  precipitation: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  uiPayload?: GenerativeUIPayload;
}

export type UIComponentType = 'BRANCH_CARD' | 'ALERT_LIST' | 'BATTERY_STATUS' | 'FORECAST_WIDGET' | 'GENERATED_REPORT' | 'NONE';

export interface GenerativeUIPayload {
  type: UIComponentType;
  data: any;
}

export type ActionType = 'NAVIGATE_BRANCH' | 'CHANGE_VIEW' | 'OPEN_3D_MODE' | 'OPEN_ALERTS' | 'DRAFT_REPORT' | 'NONE';

export interface AIAction {
  type: ActionType;
  payload?: any;
}

export interface AIResponse {
  text: string;
  ui?: GenerativeUIPayload;
  actions?: AIAction[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  branchId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  read: boolean;
  category?: 'equipment' | 'energy' | 'security';
}

export enum ZoneStatus {
  OPTIMAL = 'OPTIMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface ZoneSensor {
  id: string;
  type: 'HVAC' | 'TEMP' | 'CO2' | 'OCCUPANCY';
  value: number;
  unit: string;
}

export interface ZoneData {
  id: string;
  name: string;
  status: ZoneStatus;
  coordinates: [number, number, number];
  dimensions: [number, number, number];
  color: string;
  sensors: ZoneSensor[];
}

export type ReportStatus = 'draft' | 'review' | 'approved' | 'published';
export type ClassificationLevel = 'Public' | 'Internal' | 'Confidential' | 'Restricted';
export type ISOStandard = 'ISO-27001' | 'ISO-22301' | 'ISO-50001' | 'GENERAL';

export interface ReportBlock {
    id: string;
    type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'todo' | 'code' | 'ai-insight';
    content: string;
    checked?: boolean;
}

export interface ReportDocument {
    id: string;
    title: string;
    standard: ISOStandard;
    isoControlId?: string;
    classification: ClassificationLevel;
    author: string;
    lastModified: Date;
    status: ReportStatus;
    blocks: ReportBlock[];
    version: string;
    linkedAlertId?: string;
}

export type LeaseStatus = 'Active' | 'Expiring' | 'Expired' | 'Pending';

export interface LeaseContract {
    id: string;
    tenantName: string;
    branchId: string;
    unitNumber: string;
    areaSqm: number;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    status: LeaseStatus;
    contactPerson: string;
    contactPhone: string;
    depositAmount: number;
    documents: { name: string; date: string; type: string }[];
}

export type WorkOrderPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type WorkOrderStatus = 'Open' | 'In_Progress' | 'On_Hold' | 'Completed';
export type WorkOrderType = 'Preventive' | 'Corrective' | 'Installation' | 'Inspection';

export interface WorkOrder {
    id: string;
    title: string;
    branchId: string;
    assetId?: string;
    priority: WorkOrderPriority;
    status: WorkOrderStatus;
    type: WorkOrderType;
    assignedTo: string; // Technician Name
    reportedBy: string;
    createdAt: Date;
    dueDate: Date;
    description: string;
    estimatedCost: number;
    checklist: { item: string; completed: boolean }[];
}

// Asset Lifecycle Types
export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'End-of-Life';
export type AssetCriticality = 'Mission Critical' | 'Business Critical' | 'Support';

export interface AssetLifecycle {
    id: string;
    name: string;
    category: 'HVAC' | 'Electrical' | 'Plumbing' | 'Safety' | 'IT Infra';
    branchId: string;
    installDate: Date;
    expectedLifeYears: number;
    purchaseCost: number;
    replacementCost: number; // Current Replacement Value (CRV)
    condition: AssetCondition;
    criticality: AssetCriticality;
    lastAssessmentDate: Date;
    riskScore: number; // 1-100 calculated
}

export interface PredictiveAsset {
    id: string;
    name: string;
    category: string;
    branchId: string;
    healthScore: number; // 0-100
    predictedFailureDate: string;
    confidence: number; // 0-100%
    telemetry: {
        vibration: number; // mm/s
        temperature: number; // C
        sound: number; // dB
        efficiency: number; // %
    };
    logs: {
        timestamp: string;
        code: string;
        message: string;
    }[];
    maintenanceSuggestion: string;
}

// Spare Parts Inventory Types
export type PartCategory = 'HVAC' | 'Electrical' | 'Plumbing' | 'General' | 'IT' | 'Tools' | 'Consumables';
export type PartStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Order';

export interface SparePart {
    id: string;
    name: string;
    sku: string;
    category: PartCategory;
    currentStock: number;
    minStock: number;
    maxStock: number;
    unit: string;
    costPerUnit: number;
    location: string; // Warehouse Location e.g. "WH-01-A2"
    supplier: string;
    leadTimeDays: number;
    lastUsed: string; // Date string
    status: PartStatus;
    compatibleModels: string[];
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    category: PartCategory[];
    rating: number; // 1-5
    activeContracts: number;
}

export type POStatus = 'Draft' | 'Pending' | 'Approved' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    createdDate: Date;
    expectedDate: Date;
    items: { partId: string; quantity: number; unitCost: number }[];
    totalAmount: number;
    status: POStatus;
    requestedBy: string;
}
