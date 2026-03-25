export type Role = 'admin' | 'procurement_manager' | 'facility_manager' | 'finance' | 'warehouse_staff' | 'client_director' | 'client_manager' | 'client_staff' | 'employee';

export type EmployeeRole = 'Cleaner' | 'Stock Handler' | 'Delivery Staff' | 'Supervisor' | (string & {});

export interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  isSystem: boolean;
}

export interface WorkAssignment {
  id: string;
  title: string;
  description: string;
  assignedRole?: EmployeeRole | 'All';
  assignedEmployeeId?: string;
  locationId?: string;
  recurrence: 'daily' | 'weekly' | 'one-off';
  status: 'active' | 'archived';
  createdAt: string;
}

export interface SiteProtocol {
  id: string;
  locationId: string;
  title: string;
  content: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  companyId?: string;
  locationId?: string;
  username?: string;
  password?: string; // Stored as plain text for this mock/demo, would be hashed in prod
   status: 'active' | 'inactive';
   lastLogin?: string;
   faceImageUrl?: string; // Registered biometric profile
   lastActionAt?: string;
   invitedBy?: string;
 }

export interface Company {
  id: string;
  name: string;
  companyCode?: string; // Short code for corporate identifier
  gstNumber: string;
  pointOfContact: string;
  contactEmail?: string;
  contactPhone?: string;
  creditLimit?: number;
  availableCredit?: number;
  lastReconciledAt?: string;
  pricingTier?: string;
  discountMultiplier?: number;
  defaultWarehouseId?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  approvalThreshold?: number;
  status: 'active' | 'inactive';
}

export interface Location {
  id: string;
  companyId: string;
  name: string;
  address: string;
  state?: string;
  contactPerson?: string;
  contactPhone?: string;
  defaultWarehouseId?: string;
  monthlyBudget?: number;
  currentMonthSpend?: number;
  
  // Phase 49: GPS Geofencing & QR
  latitude?: number;
  longitude?: number;
  qrToken?: string;
  qrStatus?: 'active' | 'inactive';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  uom: string;
  basePrice: number;
  gstRate: number;
  hsnCode: string;
  active: boolean;
  category: string;
  eligibleCompanies?: string[]; // Array of company IDs that can see this product
}

export interface ClientPricing {
  id: string;
  companyId: string;
  productId: string;
  negotiatedPrice: number;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  state: string;
  documentUrl?: string; // e.g. signed POD or invoice PDF
  tallyExported?: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number; // Total physical count
  availableQuantity: number; // For selling
  reservedQuantity: number; // Placed or Approved orders
  inTransitQuantity: number; // Dispatched orders
  lowStockThreshold: number;
}

export type InventoryLogType = 'REFILL' | 'ADJUSTMENT' | 'SALE' | 'RETURN' | 'DAMAGE' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface InventoryLog {
  id: string;
  productId: string;
  warehouseId: string;
  type: InventoryLogType;
  change: number; // e.g. +50 or -10
  previousQuantity: number;
  newQuantity: number;
  referenceId: string; // Order ID, Batch ID, or Ticket ID
  performedBy: string; // User ID
  timestamp: string;
  notes?: string;
}

export type OrderStatus = 'pending' | 'pending_approval' | 'pending_director' | 'approved' | 'packed' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  gstAmount: number;
  total: number;
}

export interface Order {
  id: string;
  customId: string;
  companyId: string;
  locationId: string;
  placedBy: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  gstAmount: number;
  netAmount: number;
  tdsDeducted: number;
  poDocumentUrl?: string; // Appended for PO uploads
  costCenter?: string; // Added for Client UX
  splits?: { department: string; percentage: number }[]; // For Split-Bill feature
  createdAt: string;
  warehouseId?: string;
  tallyExported?: boolean;
  isPaid?: boolean;
  approvalChain?: { role: Role; userId: string; userName?: string; action: 'approved' | 'rejected'; timestamp: string }[];
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  pdfUrl?: string;
  generatedAt: string;
}

export interface QuotationItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  customId: string;
  companyId?: string;
  prospectName?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  items: QuotationItem[];
  totalAmount: number;
  gstAmount: number;
  netAmount: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted';
  validUntil: string;
  createdAt: string;
  notes?: string;
}

export interface RecurringOrder {
  id: string;
  companyId: string;
  locationId: string;
  placedBy: string;
  items: OrderItem[];
  frequencyDays: number;
  nextDeliveryDate: string;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: string;
}

export interface FavoriteProduct {
  id: string;
  companyId: string;
  productId: string;
}

export interface Budget {
  id: string;
  companyId: string;
  monthlyLimit: number;
  currentSpend: number;
  alertThreshold: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  type?: 'security' | 'system' | 'standard';
  timestamp: string;
}

export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  sku: string;
  items: { productId: string; quantity: number }[];
  price: number;
  active: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface Contract {
  id: string;
  companyId: string;
  startDate: string;
  endDate: string;
  type: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  value?: number;
  renewalTerms?: string;
  documentUrl?: string;
}

export interface GlobalSettings {
  companyName: string;
  supportEmail: string;
  officeAddress: string;
  defaultGstRate: number;
  tdsDeduction: number;
  notifyOnNewClient: boolean;
  notifyWarehouseOnApproval: boolean;
  dailyLowStockDigest: boolean;
  // Security
  securityPolicy: {
    enforceBiometricMFA: boolean;
    sessionTimeoutMinutes: number;
    passwordComplexity: 'standard' | 'high';
  };
  // Integrations
  integrationConfig: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    tallyEndpoint?: string;
    lastSyncTimestamp?: string;
  };
  // Operational
  regionalSLAs: Record<string, number>; // Zone -> Days
  // Branding & Documents
  logoUrl?: string;
  gstNumber?: string;
  contactPhone?: string;
  logoPosition?: 'left' | 'center';
  footerText?: string;
  pricingTiers: Record<string, {
    global: number;
    categoryOverrides?: Record<string, number>;
  }>;
}

export interface QRLogin {
  id: string;
  companyId: string;
  userId?: string;
  locationId?: string;
  token: string;
  status: 'active' | 'revoked';
  active: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secretKey?: string;
  event: 'order.created' | 'order.delivered';
  active: boolean;
  createdAt: string;
}

 
 
 export interface AttendanceImage {
   id: string;
   attendanceId: string;
   imageUrl: string;
   faceMatchScore: number;
   workTag: string;
   confidenceScore: number;
   timestamp: string;
 }

export interface Employee {
  id: string; // employee_id
  userId: string;
  name: string;
  companyId: string;
  locationId: string;
  role: EmployeeRole;
}

export interface AttendanceRecord {
  id: string; // attendance_id
  employeeId: string;
  checkIn: string;
  checkOut?: string;
  imageUrl: string;
  metadata?: {
    faceMatchScore?: number;
    workTag?: string;
    confidenceScore?: number;
  };
  
  // Phase 49: Geofenced Data Capture
  locationId?: string;
  type?: 'in' | 'out';
  timestamp?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  status?: 'present' | 'absent' | 'late' | 'half-day' | 'pending' | 'verified' | 'flagged';
  verified?: boolean;
  geofenceVerified?: boolean;
  adminRemarks?: string;
}

export interface WorkReport {
  id: string; // report_id
  employeeId: string;
  userId?: string;
  locationId?: string;
  imageUrl: string;
  remarks: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // supervisor_id
}

export const ROLE_TASKS: Record<EmployeeRole, string[]> = {
  'Cleaner': ['Clean floor', 'Clean washroom', 'Dusting'],
  'Stock Handler': ['Arrange stock', 'Refill products', 'Check stock levels'],
  'Delivery Staff': ['Deliver products', 'Upload delivery proof'],
  'Supervisor': ['Review employee work', 'Approve or reject reports']
};


export interface ForecastData {
  productId: string;
  month: string;
  actualDemand: number;
  predictedForecast: number;
  confidenceScore: number;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  companyId: string;
  reason: 'Damaged' | 'Wrong Item' | 'Excess Quantity' | 'Other';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  imageUrl?: string;
  createdAt: string;
  requestedBy: string;
  items: { productId: string; quantity: number }[];
}

export interface PhotoVerification {
  id: string;
  relatedId: string; // OrderId, ReturnId, etc.
  type: 'delivery' | 'return' | 'stock';
  imageUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedBy: string;
  timestamp: string;
}

export interface APIKey {
  id: string;
  companyId: string;
  key: string;
  permissions: ('orders' | 'products' | 'inventory' | 'invoices')[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  warehouseId: string;
}

export interface AppException {
  id: string;
  type: 'Order Spike' | 'Stock Mismatch' | 'Delayed Delivery' | 'System Error';
  severity: 'low' | 'medium' | 'high';
  description: string;
  relatedEntityId: string;
  status: 'active' | 'resolved';
  createdAt: string;
}

export interface FraudFlag {
  id: string;
  userId?: string;
  companyId: string;
  riskLevel: 'safe' | 'suspicious' | 'high_risk';
  reason: string;
  status: 'pending' | 'reviewed' | 'blocked';
  createdAt: string;
}

export interface ComplianceDoc {
  id: string;
  companyId: string;
  title: string;
  type: 'GST' | 'Agreement' | 'Contract' | 'License' | 'Other';
  fileUrl: string;
  uploadedBy: string;
  category: 'Legal' | 'Tax' | 'Product' | 'Operations';
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  imageUrl?: string;
  created_at: string;
  isStaff: boolean;
}

export interface SupportTicket {
  id: string;
  customId: string;
  companyId: string;
  userId: string;
  title: string;
  description: string;
  category: 'Order Issue' | 'Return Request' | 'Damaged Product' | 'Payment Issue' | 'General Support';
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Rejected';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  relatedOrderId?: string;
  relatedLocationId?: string;
  sentimentScore?: number; // 0.0 (Irritated) to 1.0 (Positive), used for priority boosting
  messages: TicketMessage[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface FieldIncident {
  id: string;
  title: string;
  employeeId: string;
  userId?: string;
  locationId: string;
  type: 'Maintenance' | 'Safety' | 'Supply' | 'Other';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  imageUrl?: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  timestamp: string;
  adminRemarks?: string;
}

export interface EmployeeShift {
  id: string;
  employeeId: string;
  locationId: string;
  startTime: string;
  endTime: string;
  role: EmployeeRole;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  type: 'Sick' | 'Vacation' | 'Unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminRemarks?: string;
  createdAt: string;
}
