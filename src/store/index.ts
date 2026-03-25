import { create } from 'zustand';
import type { 
  User, Product, InventoryItem, Order, Company, RecurringOrder, FavoriteProduct, 
  Budget, AuditLog, ProductBundle, Notification, Location, Contract, 
  GlobalSettings, ClientPricing, Webhook, QRLogin, AttendanceRecord, Role,
  InventoryLog, ForecastData, ReturnRequest, PhotoVerification, APIKey,
  Batch, AppException, FraudFlag, ComplianceDoc, AttendanceImage, SupportTicket, TicketMessage, Toast, Warehouse,
  Employee, WorkReport, FieldIncident, EmployeeShift, CustomRole, WorkAssignment, SiteProtocol, TimeOffRequest, Quotation
} from '../types';
import { sendTransactionalSMS, SMS_TEMPLATES } from '../utils/sms';
import { EmailTemplates } from '../lib/emailNotifications';
import { mockUsers, mockProducts, mockInventory, mockOrders, mockCompanies, mockBundles, mockPricing, mockEmployees, mockWorkReports, mockAttendance, mockReturnRequests, mockInventoryLogs } from '../mockData';
import { secureToken, hashPassword, verifyPassword, sanitizeUser } from '../utils/security';
import { generateUUID } from '../lib/supabaseUtils';
import { calculateIndianGST } from '../utils/gst';
import { SupabaseService } from '../lib/supabaseService';

interface CartItem {
  productId: string;
  quantity: number;
}

interface AppState {
  // Auth
  currentUser: User | null;
  login: (companyIdentifier: string, userIdentifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // App initialization
  initSupabase: () => Promise<void>;

  // Data
  users: User[];
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  companies: Company[];
  recurringOrders: RecurringOrder[];
  favorites: FavoriteProduct[];
  budgets: Budget[];
  auditLogs: AuditLog[];
  productBundles: ProductBundle[];
  notifications: Notification[];
  locations: Location[];
  contracts: Contract[];
  settings: GlobalSettings;
  clientPricing: ClientPricing[];
  webhooks: Webhook[];
  qrLogins: QRLogin[];
  attendanceRecords: AttendanceRecord[];
  inventoryLogs: InventoryLog[];
  warehouses: Warehouse[];
  alerts: Toast[];
  employees: Employee[];
  workReports: WorkReport[];
  timeOffRequests: TimeOffRequest[];
  quotations: Quotation[];

  // Client specifics
  getClientPrice: (productId: string, companyId?: string) => number;

  // Cart
  cart: CartItem[];
  addToCart: (productId: string, quantity: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  
  // Save for Later
  savedItems: CartItem[];
  saveForLater: (productId: string) => void;
  moveToCart: (productId: string) => void;
  removeFromSaved: (productId: string) => void;

  // Orders Admin
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  placeOrder: (orderStart: Partial<Order>) => Promise<void>;

  // New Actions
  toggleFavorite: (productId: string, companyId: string) => void;
  logAction: (userId: string, action: string, details: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  
  // Alerts (Toasts)
  addAlert: (alert: Omit<Toast, 'id'>) => void;
  dismissAlert: (id: string) => void;
  
  // Recurring Orders
  addRecurringOrder: (order: Omit<RecurringOrder, 'id' | 'createdAt'>) => void;
  toggleRecurringOrderStatus: (id: string) => void;
  deleteRecurringOrder: (id: string) => void;

  // Management CRUD
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addProductBundle: (bundle: Omit<ProductBundle, 'id'>) => Promise<void>;
  updateProductBundle: (id: string, updates: Partial<ProductBundle>) => Promise<void>;
  deleteProductBundle: (id: string) => Promise<void>;
  addCompany: (company: Omit<Company, 'id'>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'status'> & { username?: string, password?: string }) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  addLocation: (location: Omit<Location, 'id'>) => Promise<void>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addContract: (contract: Omit<Contract, 'id' | 'status'>) => Promise<void>;
  updateContract: (id: string, updates: Partial<Contract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  addQuotation: (quotation: Omit<Quotation, 'id' | 'customId' | 'createdAt' | 'status'>) => Promise<void>;
  updateQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>;
  convertToContract: (quotationId: string) => Promise<void>;
  setClientPrice: (companyId: string, productId: string, price: number) => Promise<void>;

  // Inventory
  updateInventoryQuantity: (productId: string, warehouseId: string, quantityDelta: number, reason?: string, batchId?: string) => void;
  transferStock: (productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
  processInventoryMovement: (orderId: string, fromStatus: Order['status'], toStatus: Order['status']) => void;
  calculateDemandForecast: (productId: string) => ForecastData[];
  
  // Batches
  addBatch: (batch: Omit<Batch, 'id'>) => Promise<void>;
  getBatchesForProduct: (productId: string) => Batch[];

  // Exceptions & Fraud
  triggerException: (exception: Omit<AppException, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  resolveException: (id: string) => Promise<void>;
  flagFraud: (flag: Omit<FraudFlag, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateFraudStatus: (id: string, status: FraudFlag['status']) => Promise<void>;

  // Compliance
  addComplianceDoc: (doc: Omit<ComplianceDoc, 'id' | 'createdAt'>) => Promise<void>;
  deleteComplianceDoc: (id: string) => Promise<void>;

  // Finance
  markAsReconciled: (companyId: string, orderIds: string[]) => Promise<void>;
  bulkMarkAsReconciled: (orderIds: string[]) => Promise<void>;
  payOutstandingInvoices: (companyId: string) => Promise<void>;
  markOrdersAsTallyExported: (orderIds: string[]) => Promise<void>;
  generateTallyXML: (orderIds: string[]) => string;

  // Webhooks
  addWebhook: (webhook: Omit<Webhook, 'id' | 'createdAt'>) => Promise<void>;
  updateWebhook: (id: string, updates: Partial<Webhook>) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  toggleWebhookActive: (id: string) => Promise<void>;
  
  // QR Logins
  generateQRToken: (companyId: string, userId?: string, locationId?: string) => Promise<string>;
  revokeQRToken: (id: string) => Promise<void>;
  loginWithQR: (token: string) => Promise<boolean>;
  resetPassword: (userId: string) => string;
  deleteUser: (id: string) => Promise<void>;

  // Enterprise Actions
   bulkAddUsers: (companyId: string, users: Partial<User>[]) => Promise<void>;
   updateCompanyBranding: (companyId: string, branding: Company['branding']) => Promise<void>;
   updateCompanySettings: (companyId: string, settings: Partial<Company>) => Promise<void>;
   inviteCorporateUser: (companyId: string, userData: Partial<User>) => Promise<void>;
   approveOrder: (orderId: string, userId: string, role: Role) => Promise<void>;
   updateLocationBudget: (locationId: string, budget: number) => Promise<void>;
   updateAttendanceTag: (recordId: string, tag: string) => void;
   canRecordAttendance: (userId: string, type: 'check-in' | 'check-out' | 'work_update') => { canProceed: boolean; reason?: string };

   // Biometric & Validation
   updateUserFaceImage: (userId: string, imageUrl: string) => void;

   // Phase 7 States
  returnRequests: ReturnRequest[];
  photos: PhotoVerification[];
  apiKeys: APIKey[];
  attendanceImages: AttendanceImage[];

  // Phase 8 States
  batches: Batch[];
  exceptions: AppException[];
  fraudFlags: FraudFlag[];
  complianceDocs: ComplianceDoc[];
  fieldIncidents: FieldIncident[];
  employeeShifts: EmployeeShift[];

  // Phase 7 Actions
  createReturn: (req: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateReturnStatus: (id: string, status: ReturnRequest['status']) => void;
  generateAPIKey: (companyId: string, permissions: APIKey['permissions']) => APIKey;
  revokeAPIKey: (id: string) => void;
  uploadVerificationPhoto: (photo: Partial<PhotoVerification>) => void;

  // Settings
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;

  // New Performance & Safety Logic
  lowStockNotifiedProducts: string[];
  checkLowStock: () => Promise<void>;

  // Support Ticketing (Phase 5)
  supportTickets: SupportTicket[];
  createTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages' | 'status' | 'customId'> & { attachments?: string[] }) => Promise<void>;
  updateTicketStatus: (id: string, status: SupportTicket['status'], assignedTo?: string) => Promise<void>;
  addTicketMessage: (ticketId: string, senderId: string, message: string, isStaff: boolean, imageUrl?: string) => Promise<void>;
  autoTriageAll: () => Promise<void>;

  // Employee Module (Phase 32)
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  submitWorkReport: (report: Omit<WorkReport, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  approveWorkReport: (reportId: string, supervisorId: string) => Promise<void>;
  rejectWorkReport: (reportId: string, supervisorId: string) => Promise<void>;
  submitTimeOffRequest: (request: Omit<TimeOffRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateTimeOffStatus: (id: string, status: TimeOffRequest['status'], adminRemarks?: string) => Promise<void>;
  submitAttendance: (record: { employeeId: string; imageUrl: string; checkOut?: string; locationId?: string; type?: 'in' | 'out'; latitude?: number; longitude?: number; metadata?: any }) => Promise<void>;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  deleteAttendanceRecord: (id: string) => void;
  createManualTimesheet: (record: Omit<AttendanceRecord, 'id'>) => void;

  // Phase 49: GPS & QR Management
  generateLocationQR: (locationId: string) => void;
  updateLocationCoordinates: (locationId: string, latitude: number, longitude: number) => void;
  
  // Phase 38 Actions
  submitIncident: (incident: Omit<FieldIncident, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  updateIncidentStatus: (id: string, status: FieldIncident['status'], adminRemarks?: string) => Promise<void>;
  updateShiftStatus: (id: string, status: EmployeeShift['status']) => Promise<void>;

  // Workforce Tasks
  dailyTaskProgress: Record<string, string[]>; // employeeId -> task list
  updateTaskProgress: (employeeId: string, tasks: string[]) => void;
  reassignShift: (shiftId: string, locationId: string) => Promise<void>;
  addEmployeeShift: (shift: Omit<EmployeeShift, 'id'>) => Promise<void>;
  deleteEmployeeShift: (shiftId: string) => Promise<void>;

  // Phase 47: Work Assignments & Roles
  customRoles: CustomRole[];
  workAssignments: WorkAssignment[];
  
  addCustomRole: (role: Omit<CustomRole, 'id'>) => Promise<void>;
  updateCustomRole: (id: string, updates: Partial<CustomRole>) => Promise<void>;
  deleteCustomRole: (id: string) => Promise<void>;
  
  addWorkAssignment: (assignment: Omit<WorkAssignment, 'id' | 'createdAt'>) => Promise<void>;
  updateWorkAssignment: (id: string, updates: Partial<WorkAssignment>) => Promise<void>;
  deleteWorkAssignment: (id: string) => Promise<void>;

  // Phase 47: Site Protocols
  siteProtocols: SiteProtocol[];
  addSiteProtocol: (protocol: Omit<SiteProtocol, 'id'>) => Promise<void>;
  deleteSiteProtocol: (id: string) => Promise<void>;

  // Phase 48: Localization & Experience
  language: 'en' | 'hi' | 'mr';
  setLanguage: (lang: 'en' | 'hi' | 'mr') => void;
}




export const useStore = create<AppState>()((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  
  addQuotation: async (quotation) => {
    const newQuotation: Quotation = {
      ...quotation,
      id: generateUUID(),
      customId: `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Draft',
      createdAt: new Date().toISOString()
    };
    set(state => ({ quotations: [newQuotation, ...state.quotations] }));
    get().addAlert({ message: 'Quotation generated successfully!', type: 'success' });
  },

  updateQuotationStatus: async (id, status) => {
    set(state => ({
      quotations: state.quotations.map(q => q.id === id ? { ...q, status } : q)
    }));
    get().addAlert({ message: `Quotation status updated to ${status}`, type: 'info' });
  },

  convertToContract: async (quotationId) => {
    const { quotations, addContract, addAlert, updateQuotationStatus } = get();
    const q = quotations.find(quo => quo.id === quotationId);
    if (!q) return;

    if (!q.companyId) {
       addAlert({ message: 'Quotation must be linked to a client company before conversion.', type: 'error' });
       return;
    }

    await addContract({
      companyId: q.companyId,
      type: 'Service Agreement',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      value: q.netAmount,
      renewalTerms: 'Annual Auto-Renewal'
    });

    await updateQuotationStatus(quotationId, 'Converted');
    addAlert({ message: 'Quotation successfully executed as Corporate Agreement!', type: 'success' });
  },

  currentUser: null,
  login: async (companyIdentifier, userIdentifier, password) => {
    // 1. Try Supabase Auth
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        const client = (await import('../lib/supabase')).supabase;
        const { data, error } = await client.auth.signInWithPassword({
          email: userIdentifier,
          password: password
        });
        if (error) throw error;
        if (data.user) {
          const profile = await SupabaseService.getCurrentUser();
          if (profile) {
            set({ currentUser: profile });
            get().addAlert({ message: `Access Authorized: ${profile.name}`, type: 'success' });
            return true;
          }
        }
      }
    } catch (e: any) {
      console.warn('Supabase login failed, falling back to mock:', e.message);
    }

    // 2. Fallback to mock logic (same as before)
    let targetCompanyId: string | undefined;
    const isSystemAdmin = companyIdentifier.toUpperCase() === 'SYSTEM' || !companyIdentifier;
    if (!isSystemAdmin) {
      const company = get().companies.find(c => 
        c.companyCode?.toUpperCase() === companyIdentifier.toUpperCase() || 
        c.name.toLowerCase().includes(companyIdentifier.toLowerCase())
      );
      if (!company) return false;
      targetCompanyId = company.id;
    }
    const user = get().users.find((u) => {
      const matchesIdentifier = u.email === userIdentifier || u.username === userIdentifier;
      if (isSystemAdmin) return matchesIdentifier && u.role === 'admin';
      return matchesIdentifier && u.companyId === targetCompanyId;
    });
    if (user && await verifyPassword(password, user.password || '')) {
      set({ currentUser: sanitizeUser(user) as User });
      get().addAlert({ message: `Access Authorized: ${user.name}${isSystemAdmin ? ' (System)' : ''}`, type: 'success' });
      return true;
    }
    return false;
  },
  logout: async () => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await (get() as any)._supabaseLogout();
    }
    get().addAlert({ message: 'Logged out successfully.', type: 'info' });
    set({ currentUser: null, cart: [] });
  },
  _supabaseLogout: async () => {
    // Hidden helper since we don't want to expose supabase client too much
    const client = (await import('../lib/supabase')).supabase;
    await client.auth.signOut();
  },

  initSupabase: async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) return;
    try {
      const [
        products, companies, orders, locations, inventory, 
        contracts, bundles, exceptions, fraudFlags, 
        complianceDocs, incidents, workReports, attendance,
        users, employees, timeOff, roles, assignments, protocols
      ] = await Promise.all([
        SupabaseService.getProducts(),
        SupabaseService.getCompanies(),
        SupabaseService.getOrders(),
        SupabaseService.getLocations(),
        SupabaseService.getInventory(),
        SupabaseService.getContracts(),
        SupabaseService.getProductBundles(),
        SupabaseService.getExceptions(),
        SupabaseService.getFraudFlags(),
        SupabaseService.getComplianceDocs(),
        SupabaseService.getIncidents(),
        SupabaseService.getWorkReports(),
        SupabaseService.getAttendance(),
        SupabaseService.getUsers(),
        SupabaseService.getEmployees(),
        SupabaseService.getTimeOffRequests(),
        SupabaseService.getCustomRoles(),
        SupabaseService.getWorkAssignments(),
        SupabaseService.getSiteProtocols()
      ]);
      
      set({ 
        products, companies, orders, locations, inventory, 
        contracts, productBundles: bundles, exceptions, fraudFlags, 
        complianceDocs, fieldIncidents: incidents, workReports, 
        attendanceRecords: attendance,
        users, employees, 
        timeOffRequests: timeOff,
        customRoles: roles,
        workAssignments: assignments,
        siteProtocols: protocols
      });
      
      // If we have a session, set current user
      const currentUser = await SupabaseService.getCurrentUser();
      if (currentUser) set({ currentUser });

    } catch (err) {
      console.error('Failed to init Supabase data', err);
    }
  },

  users: mockUsers,
  products: mockProducts,
  inventory: mockInventory,
  orders: mockOrders,
  companies: mockCompanies,
  recurringOrders: [],
  favorites: [],
  budgets: [],
  auditLogs: [],
  productBundles: mockBundles,
  locations: [
    { id: '11111111-2222-4000-8000-000000000001', companyId: '11111111-1111-4111-8111-111111111111', name: 'HQ Mumbai', address: 'Bandra Kurla Complex', state: 'Maharashtra', defaultWarehouseId: 'w1', latitude: 19.0760, longitude: 72.8777 },
    { id: '11111111-2222-4000-8000-000000000002', companyId: '22222222-2222-4222-8222-222222222222', name: 'Pune Factory', address: 'MIDC', state: 'Maharashtra', defaultWarehouseId: 'w1', latitude: 18.5204, longitude: 73.8567 }
  ],
  notifications: [],
  contracts: [],
  quotations: [],
  clientPricing: mockPricing,
  webhooks: [],
   qrLogins: [],
    attendanceRecords: mockAttendance,
    attendanceImages: [],
    inventoryLogs: mockInventoryLogs,
  warehouses: [
    { id: 'wh-1', name: 'Mumbai Primary Center', code: 'MUM-01', address: 'Bhiwandi Logistics Park', state: 'Maharashtra' },
    { id: 'wh-2', name: 'Delhi Satellite Hub', code: 'DEL-02', address: 'Okhla Phase III', state: 'Delhi' },
    { id: 'wh-3', name: 'Bangalore fulfillment', code: 'BLR-01', address: 'Peenya Industrial Area', state: 'Karnataka' }
  ],
  alerts: [],
   returnRequests: mockReturnRequests,
   photos: [],
    apiKeys: [],
    employees: mockEmployees,
    workReports: mockWorkReports,
    
    // Phase 8 Initial States
    batches: [],
    exceptions: [],
    fraudFlags: [],
    complianceDocs: [],
    lowStockNotifiedProducts: [],
    supportTickets: [],
    fieldIncidents: [
      { id: 'inc-1', title: 'Maintenance Incident Reported', employeeId: 'emp-001', locationId: '11111111-2222-4000-8000-000000000001', type: 'Maintenance', severity: 'Medium', description: 'Leaking pipe in the main cafeteria area.', status: 'Open', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'inc-2', title: 'Safety Incident Reported', employeeId: 'emp-002', locationId: '11111111-2222-4000-8000-000000000002', type: 'Safety', severity: 'High', description: 'Slippery floor near the loading bay, no warning signs found.', status: 'In Progress', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ],
    employeeShifts: [
      { id: 'sh-1', employeeId: 'emp-001', locationId: '11111111-2222-4000-8000-000000000001', startTime: '2026-03-22T09:00:00Z', endTime: '2026-03-22T17:00:00Z', role: 'Cleaner', status: 'In Progress' },
      { id: 'sh-2', employeeId: 'emp-001', locationId: '11111111-2222-4000-8000-000000000001', startTime: '2026-03-23T09:00:00Z', endTime: '2026-03-23T17:00:00Z', role: 'Cleaner', status: 'Scheduled' },
      { id: 'sh-3', employeeId: 'emp-002', locationId: '11111111-2222-4000-8000-000000000002', startTime: '2026-03-22T08:00:00Z', endTime: '2026-03-22T16:00:00Z', role: 'Stock Handler', status: 'In Progress' }
    ],
  settings: {
    companyName: 'Pyramid FM Pvt Ltd',
    supportEmail: 'support@pyramidfm.com',
    officeAddress: 'Headquarters, Mumbai',
    defaultGstRate: 18,
    tdsDeduction: 2.0,
    notifyOnNewClient: true,
    notifyWarehouseOnApproval: true,
    dailyLowStockDigest: false,
    gstNumber: '',
    contactPhone: '',
    logoPosition: 'left',
    logoUrl: '',
    footerText: 'This is a computer generated document and does not require a signature.',
    // Security
    securityPolicy: {
      enforceBiometricMFA: false,
      sessionTimeoutMinutes: 60,
      passwordComplexity: 'standard'
    },
    // Integrations
    integrationConfig: {
      smsEnabled: true,
      emailEnabled: true,
      tallyEndpoint: 'https://api.tally-solutions.com/v1',
      lastSyncTimestamp: new Date().toISOString()
    },
    // Operational
    regionalSLAs: {
      'Maharashtra': 2,
      'Karnataka': 3,
      'Delhi': 3,
      'Tamil Nadu': 4,
      'Other': 5
    },
    pricingTiers: {
      'standard': { global: 0 },
      'gold': { global: 10 },
      'platinum': { global: 25 }
    }
  },
  dailyTaskProgress: {},
  timeOffRequests: [],
  siteProtocols: [],
  customRoles: [
    { id: 'role-1', name: 'Cleaner', permissions: ['view_schedule'], isSystem: true },
    { id: 'role-2', name: 'Supervisor', permissions: ['view_schedule', 'view_reports', 'manage_attendance'], isSystem: true },
    { id: 'role-3', name: 'Security Guard', permissions: ['view_schedule', 'manage_incidents'], isSystem: false }
  ],
  workAssignments: [
    { id: 'wa-1', title: 'Daily Facility Sweep', description: 'Clean primary concourse and restock supplies.', assignedRole: 'Cleaner', recurrence: 'daily', status: 'active', createdAt: new Date().toISOString() },
    { id: 'wa-2', title: 'Perimeter Security Check', description: 'Ensure all gates are locked after 10PM.', assignedRole: 'Security Guard', recurrence: 'daily', status: 'active', createdAt: new Date().toISOString() }
  ],  

  getClientPrice: (productId, companyId) => {
    const product = get().products.find(p => p.id === productId);
    if (!product) return 0;
    if (!companyId) return product.basePrice;
    
    // Check for negotiated price
    const pricing = get().clientPricing.find(p => p.productId === productId && p.companyId === companyId);
    if (pricing) return pricing.negotiatedPrice;
    
    // Check for company pricing tier
    const company = get().companies.find(c => c.id === companyId);
    if (!company) return product.basePrice;
    
    if (company.discountMultiplier) {
      return product.basePrice * company.discountMultiplier;
    }
    
    // Default tier discounts from config
    const tierName = company.pricingTier || 'standard';
    const tierConfig = get().settings.pricingTiers[tierName] || { global: 0 };
    
    // Check for category-specific override
    const discountPercent = (tierConfig.categoryOverrides && tierConfig.categoryOverrides[product.category]) ?? tierConfig.global;
    
    return product.basePrice * (1 - discountPercent / 100);
  },

  savedItems: [],
  saveForLater: (productId) => set((state) => {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return state;
    return {
      cart: state.cart.filter(i => i.productId !== productId),
      savedItems: [...state.savedItems.filter(i => i.productId !== productId), item]
    };
  }),
  moveToCart: (productId) => set((state) => {
    const item = state.savedItems.find(i => i.productId === productId);
    if (!item) return state;
    return {
      savedItems: state.savedItems.filter(i => i.productId !== productId),
      cart: [...state.cart.filter(i => i.productId !== productId), item]
    };
  }),
  removeFromSaved: (productId) => set((state) => ({
    savedItems: state.savedItems.filter(i => i.productId !== productId)
  })),

  cart: [],
  addToCart: (productId, quantity) => set((state) => {
    const existing = state.cart.find(item => item.productId === productId);
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (newQuantity <= 0) {
        return { cart: state.cart.filter(item => item.productId !== productId) };
      }
      return { cart: state.cart.map(item => item.productId === productId ? { ...item, quantity: newQuantity } : item) };
    }
    if (quantity <= 0) return state;
    return { cart: [...state.cart, { productId, quantity }] };
  }),
  updateCartQuantity: (productId, quantity) => set((state) => {
    if (quantity <= 0) {
      return { cart: state.cart.filter(item => item.productId !== productId) };
    }
    const existing = state.cart.find(item => item.productId === productId);
    const product = get().products.find(p => p.id === productId);
    if (existing) {
      get().addAlert({ message: `Updated ${product?.name || 'item'} quantity to ${quantity}.`, type: 'success', duration: 3000 });
      return { cart: state.cart.map(item => item.productId === productId ? { ...item, quantity } : item) };
    }
    get().addAlert({ message: `Added ${product?.name || 'item'} to cart.`, type: 'success', duration: 3000 });
    return { cart: [...state.cart, { productId, quantity }] };
  }),
  removeFromCart: (productId) => set((state) => ({ cart: state.cart.filter(item => item.productId !== productId) })),
  clearCart: () => set({ cart: [] }),

  // Phase 7 Actions
  createReturn: (req) => set(state => {
    const newReturn = {
      ...req,
      id: `RET-${Date.now()}`,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      SupabaseService.createReturnRequest(newReturn).then();
    }
    get().addAlert({ message: 'Return request submitted successfully!', type: 'success' });
    return { returnRequests: [newReturn, ...state.returnRequests] };
  }),
  updateReturnStatus: (id, status) => set(state => {
    const request = state.returnRequests.find(r => r.id === id);
    if (!request || request.status === status) return state;

    let newState = { ...state };

    if (status === 'approved' && request.status === 'pending') {
      // 1. Process Credits
      const company = state.companies.find(c => c.id === request.companyId);
      const order = state.orders.find(o => o.customId === request.orderId);
      
      if (company && order) {
        let totalReturnVal = 0;
        request.items.forEach(retItem => {
          const orderItem = order.items.find(oi => oi.productId === retItem.productId);
          if (orderItem) {
            totalReturnVal += (orderItem.unitPrice * retItem.quantity) * (1 + (state.products.find(p => p.id === retItem.productId)?.gstRate || 0) / 100);
          }
        });

        newState.companies = state.companies.map(c => 
          c.id === company.id 
            ? { ...c, availableCredit: (c.availableCredit || 0) + totalReturnVal } 
            : c
        );

        get().logAction('admin', 'return_approved', `Approved return ${id}. Credited ₹${totalReturnVal.toFixed(2)} to ${company.name}`);
        
        get().addNotification({
          userId: request.requestedBy,
          title: 'Return Approved',
          message: `Your return request for order ${request.orderId} was approved. ₹${totalReturnVal.toFixed(2)} has been credited back to your account.`,
          type: 'success'
        });
        get().addAlert({ message: `Return ${id} approved. Credit issued.`, type: 'success' });
      }

      // 2. Process Inventory (optional: only if not damaged)
      if (request.reason !== 'Damaged') {
        request.items.forEach(item => {
          // Add back to default warehouse for simplicity or use the one from the order
          const warehouseId = order?.warehouseId || 'w1';
          get().updateInventoryQuantity(item.productId, warehouseId, item.quantity, `Return Restock (${id})`);
        });
      }
    } else if (status === 'rejected') {
      get().addAlert({ message: `Return ${id} rejected.`, type: 'error' });
    }

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      SupabaseService.updateReturnStatus(id, status).then();
    }

    return {
      ...newState,
      returnRequests: state.returnRequests.map(r => r.id === id ? { ...r, status } : r)
    };
  }),
  generateAPIKey: (companyId, permissions) => {
    // SEC-06: use secureToken() — never Math.random() for API keys
    const newKey = {
      id: `AK-${Date.now()}`,
      companyId,
      key: `sk_live_${secureToken(24)}`,
      permissions,
      createdAt: new Date().toISOString()
    };
    set(state => ({ apiKeys: [...state.apiKeys, newKey] }));
    get().addAlert({ message: 'New API key generated!', type: 'success' });
    return newKey as any;
  },
  revokeAPIKey: (id) => set(state => {
    get().addAlert({ message: 'API key revoked.', type: 'info' });
    return {
      apiKeys: state.apiKeys.filter(k => k.id !== id)
    };
  }),
   uploadVerificationPhoto: (photo: any) => set(state => {
    get().addAlert({ message: 'Verification photo uploaded. Awaiting approval.', type: 'info' });
    return {
    photos: [{
      ...photo,
      id: `PHO-${Date.now()}`,
      status: 'pending' as const,
      timestamp: new Date().toISOString()
    }, ...state.photos]
  };
}),

  updateOrderStatus: async (orderId, status) => {
    const { orders, users, addNotification, logAction, addAlert } = get();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // SMS Notifications
    if (status === 'approved' || status === 'dispatched' || status === 'delivered') {
      const msg = status === 'approved' ? SMS_TEMPLATES.orderApproved(order.customId) :
                  status === 'dispatched' ? SMS_TEMPLATES.orderDispatched(order.customId) :
                  SMS_TEMPLATES.orderDelivered(order.customId);
      sendTransactionalSMS({ to: '+919876543210', message: msg });
      addNotification({ userId: order.placedBy, title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`, message: msg, type: status === 'dispatched' ? 'info' : 'success' });
    }

    // Email Notification
    const user = users.find(u => u.id === order.placedBy);
    if (user) {
      const statusColors: any = { approved: '#3b82f6', packed: '#8b5cf6', dispatched: '#2563eb', delivered: '#10b981', cancelled: '#ef4444' };
      EmailTemplates.orderStatusUpdate(user.email, order.customId, status, statusColors[status] || '#94a3b8').then();
    }

    logAction(order.placedBy, 'update_order_status', `Order ${order.customId} updated to ${status}`);
    addAlert({ message: `Order ${order.customId} status updated to ${status}.`, type: 'success' });

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateOrderStatus(orderId, status);
    }

    set((state) => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
    }));
  },

  placeOrder: async (orderStart) => {
    const { inventory, locations, companies, users, processInventoryMovement, addNotification, triggerException, addAlert } = get();
    const location = locations.find(l => l.id === orderStart.locationId);
    const defaultWarehouseId = location?.defaultWarehouseId || 'w1';

    // Group items by fulfilling warehouse
    const warehouseGroups: Record<string, typeof orderStart.items> = {};

    orderStart.items?.forEach(item => {
      const stockInDefault = inventory.find(i => i.productId === item.productId && i.warehouseId === defaultWarehouseId);
      let fulfillingWarehouse = defaultWarehouseId;

      if (!stockInDefault || stockInDefault.quantity < item.quantity) {
         const alternativeStock = inventory.find(i => i.productId === item.productId && i.quantity >= item.quantity);
         if (alternativeStock) fulfillingWarehouse = alternativeStock.warehouseId;
      }

      if (!warehouseGroups[fulfillingWarehouse]) warehouseGroups[fulfillingWarehouse] = [];
      warehouseGroups[fulfillingWarehouse]!.push(item);
    });

    const newOrders: Order[] = [];
    const baseOrderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const splitNeeded = Object.keys(warehouseGroups).length > 1;

    try {
      for (const [wId, items] of Object.entries(warehouseGroups)) {
        if (!items) continue;
        const { products } = get();
        const index = newOrders.length;
        const sourceState = 'MH'; 
        const destState = location?.state || 'MH';

        // Re-calculate totals per split order
        let netAmount = 0;
        let gstAmount = 0;
        let totalAmount = 0;

        items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          const gstResult = calculateIndianGST(item.unitPrice * item.quantity, sourceState, destState, product?.gstRate || 18);
          netAmount += gstResult.netAmount;
          gstAmount += gstResult.totalGst;
          totalAmount += gstResult.baseAmount;
        });

        const suffix = splitNeeded ? `-${String.fromCharCode(65 + index)}` : '';
        const company = companies.find(c => c.id === orderStart.companyId);
        const threshold = company?.approvalThreshold || 0;
        const budget = location?.monthlyBudget || 0;
        const currentSpend = location?.currentMonthSpend || 0;
        
        const isOverThreshold = threshold > 0 && netAmount > threshold;
        const isOverBudget = budget > 0 && (currentSpend + netAmount) > budget;
        const isOverLimit = !!(company?.creditLimit && netAmount > (company.availableCredit || 0));

        const orderStatus: Order['status'] = (isOverThreshold || isOverBudget || isOverLimit || netAmount > 50000) 
          ? 'pending_approval' 
          : (orderStart.status || 'pending');

        // Exception Handling
        if (netAmount > 25000) {
          triggerException({
            type: 'Order Spike',
            severity: netAmount > 100000 ? 'high' : 'low',
            description: `${netAmount > 100000 ? 'Extremely large order' : 'Order spike'} of ₹${netAmount.toLocaleString()} from ${company?.name || orderStart.companyId}.`,
            relatedEntityId: baseOrderId
          });
        }

        const newOrd: Order = {
          ...orderStart,
          id: generateUUID(),
          customId: `${baseOrderId}${suffix}`,
          status: orderStatus,
          createdAt: new Date().toISOString(),
          items: items.map(it => ({ ...it, id: generateUUID() })),
          totalAmount,
          gstAmount,
          netAmount,
          warehouseId: wId,
        } as Order;

        // Persist to Supabase if config is live
        if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
          await SupabaseService.placeOrder(newOrd);
        }

        newOrders.push(newOrd);

        // confirmation email
        const user = users.find(u => u.id === orderStart.placedBy);
        if (user) EmailTemplates.orderConfirmation(user.email, newOrd.customId, `₹${newOrd.netAmount}`).then();
      }

      set((state) => ({ 
        orders: [...newOrders, ...state.orders],
        cart: []
      }));

      newOrders.forEach(o => processInventoryMovement(o.id, 'pending', o.status));

      if (splitNeeded) {
        addNotification({
          userId: orderStart.placedBy || 'u1',
          title: 'Order Split',
          message: `Your order was split into ${newOrders.length} shipments for faster delivery.`,
          type: 'info'
        });
      }
      
      addAlert({ message: 'Order request submitted successfully.', type: 'success' });
    } catch (err: any) {
      addAlert({ message: `Order placement failed: ${err.message}`, type: 'error' });
    }
  },



    updateUserFaceImage: async (userId, imageUrl) => {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        await SupabaseService.updateUserFaceImage(userId, imageUrl);
      }
      set(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, faceImageUrl: imageUrl } : u)
      }));
      get().logAction('admin', 'biometric_enrollment', `Registered face image for user ${userId}`);
    },

   toggleFavorite: (productId, companyId) => set((state) => {
    const existing = state.favorites.find(f => f.productId === productId && f.companyId === companyId);
    if (existing) {
      return { favorites: state.favorites.filter(f => f.id !== existing.id) };
    }
    return {
      favorites: [...state.favorites, { id: `fav-${Date.now()}`, productId, companyId }]
    };
  }),

  logAction: (userId, action, details) => set((state) => ({
    auditLogs: [{
      id: `log-${Date.now()}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    }, ...state.auditLogs]
  })),

  addNotification: (notification) => set((state) => ({
    notifications: [{
      ...notification,
      id: `notif-${Date.now()}`,
      read: false,
      timestamp: new Date().toISOString()
    }, ...state.notifications]
  })),

  markNotificationAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),

  addRecurringOrder: (orderStart) => set((state) => ({
    recurringOrders: [{
      ...orderStart,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString()
    }, ...state.recurringOrders]
  })),

  toggleRecurringOrderStatus: (id) => set((state) => ({
    recurringOrders: state.recurringOrders.map(r => r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r)
  })),

  deleteRecurringOrder: (id) => set((state) => ({
    recurringOrders: state.recurringOrders.filter(r => r.id !== id)
  })),

  addProduct: async (productStart) => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        const product = await SupabaseService.addProduct(productStart);
        set((state) => ({ products: [product, ...state.products] }));
      } else {
        set((state) => ({ products: [{ ...productStart, id: generateUUID() } as Product, ...state.products] }));
      }
      get().addAlert({ message: 'Product successfully indexed.', type: 'success' });
    } catch (err: any) {
      get().addAlert({ message: `Failed to add product: ${err.message}`, type: 'error' });
    }
  },

  updateProduct: async (id, updates) => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        await SupabaseService.updateProduct(id, updates);
      }
      set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }));
      get().addAlert({ message: 'Product record updated.', type: 'info' });
    } catch (err: any) {
      get().addAlert({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  },

  deleteProduct: async (id) => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        await SupabaseService.deleteProduct(id);
      }
      set((state) => ({ products: state.products.filter(p => p.id !== id) }));
      get().addAlert({ message: 'Product decommissioned from catalog.', type: 'warning' });
    } catch (err: any) {
      get().addAlert({ message: `Deletion failed: ${err.message}`, type: 'error' });
    }
  },

  addCompany: async (companyStart) => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        const company = await SupabaseService.addCompany(companyStart);
        set((state) => ({ companies: [company, ...state.companies] }));
      } else {
        set((state) => ({ companies: [{ ...companyStart, id: generateUUID() } as Company, ...state.companies] }));
      }
      get().addAlert({ message: 'Company registry finalized.', type: 'success' });
    } catch (err: any) {
      get().addAlert({ message: `Failed to add company: ${err.message}`, type: 'error' });
    }
  },

  updateCompany: async (id, updates) => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        await SupabaseService.updateCompany(id, updates);
      }
      set((state) => ({ companies: state.companies.map(c => c.id === id ? { ...c, ...updates } : c) }));
      get().addAlert({ message: 'Company governance updated.', type: 'info' });
    } catch (err: any) {
      get().addAlert({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  },

  deleteCompany: async (id) => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        await SupabaseService.deleteCompany(id);
      }
      set((state) => ({ companies: state.companies.filter(c => c.id !== id) }));
      get().addAlert({ message: 'Company record expunged.', type: 'warning' });
    } catch (err: any) {
      get().addAlert({ message: `Deletion failed: ${err.message}`, type: 'error' });
    }
  },

  addUser: async (userStart) => {
    try {
      const { username, password, ...rest } = userStart;
      const hashedPassword = await hashPassword(password || 'pyramid123');
      const newUser = { ...rest, id: generateUUID(), username, password: hashedPassword, status: 'active' as const };
      
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
         await SupabaseService.addUser(newUser);
      }

      set((state) => ({ users: [sanitizeUser(newUser) as User, ...state.users] }));
      get().addAlert({ message: 'User identity provisioned.', type: 'success' });
    } catch (err: any) {
      get().addAlert({ message: `Creation failed: ${err.message}`, type: 'error' });
    }
  },

  addProductBundle: async (bundleStart) => {
    const { logAction } = get();
    const newBundle = { ...bundleStart, id: generateUUID() };
    logAction('admin', 'create_bundle', `Created new bundle: ${bundleStart.name} (${bundleStart.sku})`);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addProductBundle(newBundle);
    }

    set((state) => ({ productBundles: [newBundle, ...state.productBundles] }));
  },

  updateProductBundle: async (id, updates) => {
    const { productBundles, logAction } = get();
    const bundle = productBundles.find(b => b.id === id);
    logAction('admin', 'update_bundle', `Updated bundle: ${bundle?.name || id}`);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateProductBundle(id, updates);
    }

    set((state) => ({
      productBundles: state.productBundles.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  },

  deleteProductBundle: async (id) => {
    const { productBundles, logAction } = get();
    const bundle = productBundles.find(b => b.id === id);
    logAction('admin', 'delete_bundle', `Deleted bundle: ${bundle?.name || id}`);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteProductBundle(id);
    }

    set((state) => ({
      productBundles: state.productBundles.filter(b => b.id !== id)
    }));
  },

  processInventoryMovement: (orderId, fromStatus, toStatus) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return;

    set((state) => ({
      inventory: state.inventory.map(inv => {
        const orderItem = order.items.find(oi => oi.productId === inv.productId && inv.warehouseId === order.warehouseId);
        if (!orderItem) return inv;

        const qty = orderItem.quantity;
        let { availableQuantity, reservedQuantity, inTransitQuantity, quantity } = inv;

        // Initialize if undefined (for existing items that might not have these fields yet)
        availableQuantity = availableQuantity ?? inv.quantity;
        reservedQuantity = reservedQuantity ?? 0;
        inTransitQuantity = inTransitQuantity ?? 0;

        // Transition Logic
        // 1. Placement (Available -> Reserved)
        if ((toStatus as string) === 'pending' || toStatus === 'pending_approval' || (toStatus as string) === 'pending_director') {
           availableQuantity -= qty;
           reservedQuantity += qty;
        } 
        // 2. Approval (Usually stays reserved, but if it was cancelled, move back)
        else if (fromStatus === 'cancelled' && (toStatus === 'pending' || toStatus === 'approved')) {
           availableQuantity -= qty;
           reservedQuantity += qty;
        }
        // 3. Dispatch (Reserved -> In-Transit)
        else if (toStatus === 'dispatched') {
           const previousQuantity = quantity;
           reservedQuantity -= qty;
           inTransitQuantity += qty;
           quantity -= qty; // Physical stock leaves warehouse
           
           // Log the movement
           state.inventoryLogs = [{
             id: `log-${Date.now()}-${inv.productId}`,
             productId: inv.productId,
             warehouseId: inv.warehouseId,
             type: 'SALE' as any,
             change: -qty,
             previousQuantity,
             newQuantity: quantity,
             referenceId: order.customId,
             performedBy: 'SYSTEM',
             timestamp: new Date().toISOString(),
             notes: `Order ${order.customId} dispatched.`
           }, ...state.inventoryLogs].slice(0, 1000);
        }
        // 4. Delivery (In-Transit -> Finalized)
        else if (toStatus === 'delivered') {
           inTransitQuantity -= qty;
        }
        // 5. Cancellation (Reserved/In-Transit -> Available)
        else if (toStatus === 'cancelled' || toStatus === 'rejected') {
          if (fromStatus === 'dispatched') {
            const previousQuantity = quantity;
            inTransitQuantity -= qty;
            quantity += qty; // Physical stock returns to warehouse
            availableQuantity += qty; // And becomes available
            
            // Log the return to stock
            state.inventoryLogs = [{
              id: `log-${Date.now()}-${inv.productId}`,
              productId: inv.productId,
              warehouseId: inv.warehouseId,
              type: 'RETURN' as any,
              change: qty,
              previousQuantity,
              newQuantity: quantity,
              referenceId: order.customId,
              performedBy: 'SYSTEM',
              timestamp: new Date().toISOString(),
              notes: `Order ${order.customId} ${toStatus}. Stock returned.`
            }, ...state.inventoryLogs].slice(0, 1000);
          } else if (fromStatus !== 'delivered') { // If not yet dispatched or delivered
            reservedQuantity -= qty;
            availableQuantity += qty;
          }
        }

        return { ...inv, availableQuantity, reservedQuantity, inTransitQuantity, quantity };
      })
    }));
  },

  updateUser: async (id, updates) => {
    // SEC-09: prevent non-admin users from elevating their own role or editing others
    const { users, currentUser } = get();
    const actor = users.find(u => u.id === currentUser?.id);
    if (!actor) return;
    const isSelf = actor.id === id;
    const isAdmin = actor.role === 'admin';
    if (!isAdmin && !isSelf) return; // can only edit yourself unless admin
    if (!isAdmin && updates.role && updates.role !== actor.role) {
      console.warn('SEC-09: Role self-elevation blocked.');
      return; // block role escalation
    }

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateUser(id, updates);
    }
    set((state) => ({
      users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
    }));
  },

  resetPassword: (userId) => {
    // SEC-04: use cryptographically secure token, not Math.random()
    const newPassword = secureToken(8);
    hashPassword(newPassword).then(hashed => {
      set((state) => ({
        users: state.users.map(u => u.id === userId ? { ...u, password: hashed } : u)
      }));
    });
    get().logAction('admin', 'reset_password', `Reset password for user ${userId}`);
    get().addNotification({
      userId: get().currentUser?.id || 'admin',
      title: 'Credential Reset',
      message: `Access key rotated for user identity ${userId}.`,
      type: 'success'
    });
    // Return plain password once for admin to communicate to user
    return newPassword;
  },

  deleteUser: async (id) => {
    const { users, logAction, currentUser } = get();
    const user = users.find(u => u.id === id);
    if (!user || user.id === currentUser?.id) return; // Cannot delete self

    logAction('admin', 'delete_user', `Removed user: ${user.name} (${user.email})`);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteUser(id);
    }

    set((state) => ({
      users: state.users.filter(u => u.id !== id)
    }));

    get().addAlert({ message: `User ${user.name} removed from registry.`, type: 'info' });
  },

  addLocation: async (locationStart) => {
    const company = get().companies.find(c => c.id === locationStart.companyId);
    get().logAction('admin', 'create_location', `Added location ${locationStart.name} for ${company?.name || locationStart.companyId}`);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      const newLoc = await SupabaseService.addLocation(locationStart);
      set((state) => ({ locations: [newLoc, ...state.locations] }));
    } else {
      const newLoc = { ...locationStart, id: generateUUID() };
      set((state) => ({ locations: [newLoc, ...state.locations] }));
    }
  },

  addContract: async (contractStart) => {
    const { companies, logAction } = get();
    const company = companies.find(c => c.id === contractStart.companyId);
    logAction('admin', 'create_contract', `Established ${contractStart.type} contract for ${company?.name || 'unknown client'}.`);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      const newContract = await SupabaseService.addContract(contractStart) as Contract;
      set(state => ({ contracts: [newContract, ...state.contracts] }));
    } else {
      const newContract: Contract = { ...contractStart, id: generateUUID(), status: 'Active' };
      set(state => ({ contracts: [newContract, ...state.contracts] }));
    }
  },

  deleteLocation: async (id) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteLocation(id);
    }
    set((state) => ({
      locations: state.locations.filter(l => l.id !== id)
    }));
  },

  updateLocation: async (id, updates) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateLocation(id, updates);
    }
    set((state) => ({
      locations: state.locations.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
    get().logAction('admin', 'update_location', `Updated site specifications for ${id}`);
  },

  updateContract: async (id, updates) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      const updated = await SupabaseService.updateContract(id, updates);
      set(state => ({
        contracts: state.contracts.map(c => c.id === id ? updated : c)
      }));
    } else {
      set(state => ({
        contracts: state.contracts.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
    }
  },

  deleteContract: async (id) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteContract(id);
    }
    set((state) => ({
      contracts: state.contracts.filter(c => c.id !== id)
    }));
  },

  setClientPrice: async (companyId, productId, price) => {
    const { clientPricing } = get();
    const existingIndex = clientPricing.findIndex(p => p.companyId === companyId && p.productId === productId);
    let newPricing = [...clientPricing];
    
    if (existingIndex >= 0) {
      newPricing[existingIndex] = { ...newPricing[existingIndex], negotiatedPrice: price };
    } else {
      newPricing.push({ id: generateUUID(), companyId, productId, negotiatedPrice: price });
    }

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.upsertClientPricing({
        companyId, productId, negotiatedPrice: price
      });
    }

    set({ clientPricing: newPricing });
  },

  updateInventoryQuantity: (productId, warehouseId, quantityDelta, reason = 'Adjustment', batchId) => {
    const userId = get().currentUser?.id || 'admin';
    set((state) => {
      const item = state.inventory.find(i => i.productId === productId && i.warehouseId === warehouseId);
      const previousQty = item?.quantity || 0;
      // - [x] Phase 10: Debugging & Performance Optimization
      // - [x] Resolve "Maximum update depth exceeded" infinite loop
      // - [x] Refactor Layouts to use Zustand selectors
      // - [x] Move global business rules (low stock alerts) to the store
      const newQty = Math.max(0, previousQty + quantityDelta);

      // If batch included, update batch too
      let newBatches = state.batches;
      if (batchId) {
        newBatches = state.batches.map(b => 
          b.id === batchId ? { ...b, quantity: Math.max(0, b.quantity + quantityDelta) } : b
        );
      }

      const newLog: InventoryLog = {
        id: `log-${Date.now()}`,
        productId,
        warehouseId,
        type: (quantityDelta > 0 ? 'REFILL' : 'ADJUSTMENT') as any, // Simple mapping for now
        change: quantityDelta,
        previousQuantity: previousQty,
        newQuantity: newQty,
        referenceId: batchId || 'MANUAL',
        performedBy: userId,
        timestamp: new Date().toISOString(),
        notes: reason
      };

      return {
        inventory: state.inventory.map(i => 
          i.productId === productId && i.warehouseId === warehouseId 
            ? { 
                ...i, 
                quantity: newQty, 
                availableQuantity: (i.availableQuantity ?? i.quantity) + quantityDelta 
              } 
            : i
        ),
        batches: newBatches,
        inventoryLogs: [newLog, ...state.inventoryLogs].slice(0, 1000) // Keep last 1000 logs
      };
    });
    
    // Trigger internal check instead of relying on component effects
    get().checkLowStock();

    const product = get().products.find(p => p.id === productId); // Re-added this line as it was used below
    get().logAction(userId, 'inventory_adjustment', `Adjusted ${product?.name || productId} stock in ${warehouseId} by ${quantityDelta}. Reason: ${reason}`);

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      const item = get().inventory.find(i => i.productId === productId && i.warehouseId === warehouseId);
      if (item) {
        SupabaseService.updateStock(productId, warehouseId, quantityDelta).then();
      }
    }

    // Check for Low Stock Email Alert
    const item = get().inventory.find(i => i.productId === productId && i.warehouseId === warehouseId);
    if (item && item.quantity <= item.lowStockThreshold) {
      EmailTemplates.lowStockAlert(
        'admin@pyramidfm.com', 
        product?.name || productId, 
        item.quantity, 
        item.lowStockThreshold
      ).then();
    }
  },

  calculateDemandForecast: (productId) => {
    const orders = get().orders;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth();
    
    // Simple heuristic: Take last 3 months average volume and add a 5-10% growth trend
    const relevantOrders = orders.filter(o => o.items.some(i => i.productId === productId));
    
    // Group volume by month
    const monthlyVolume: Record<number, number> = {};
    relevantOrders.forEach(o => {
      const month = new Date(o.createdAt).getMonth();
      const qty = o.items.find(i => i.productId === productId)?.quantity || 0;
      monthlyVolume[month] = (monthlyVolume[month] || 0) + qty;
    });

    const forecast: ForecastData[] = [];
    for (let i = -2; i <= 3; i++) {
        const targetMonthIdx = (currentMonthIndex + i + 12) % 12;
        const actual = monthlyVolume[targetMonthIdx] || 0;
        
        // Predict: previous month + some noise/trend
        const prevMonthIdx = (targetMonthIdx - 1 + 12) % 12;
        const prevVolume = monthlyVolume[prevMonthIdx] || actual || 50;
        const prediction = Math.round(prevVolume * (1 + (Math.random() * 0.15)));

        forecast.push({
            productId,
            month: months[targetMonthIdx],
            actualDemand: i <= 0 ? actual : 0,
            predictedForecast: prediction,
            confidenceScore: 0.85 - (i > 0 ? i * 0.1 : 0)
        });
    }

    return forecast;
  },

  addBatch: async (batchStart) => {
    const newBatch: Batch = { ...batchStart, id: generateUUID() };
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addBatch(newBatch);
    }
    set(state => ({ 
      batches: [newBatch, ...state.batches]
    }));
    // Also update total inventory for that product/warehouse
    await get().updateInventoryQuantity(newBatch.productId, newBatch.warehouseId, newBatch.quantity, 'Manual Batch Entry');
  },

  transferStock: (productId, fromWarehouseId, toWarehouseId, quantity) => {
    const userId = get().currentUser?.id || 'admin';
    const timestamp = new Date().toISOString();
    
    set((state) => {
      const fromItem = state.inventory.find(i => i.productId === productId && i.warehouseId === fromWarehouseId);
      const toItem = state.inventory.find(i => i.productId === productId && i.warehouseId === toWarehouseId);
      
      if (!fromItem || fromItem.quantity < quantity) {
        console.error('Insufficient stock for transfer');
        return {};
      }

      const prevFromQty = fromItem.quantity;
      const newFromQty = fromItem.quantity - quantity;
      const prevToQty = toItem?.quantity || 0;
      const newToQty = prevToQty + quantity;

      // Create Logs
      const logOut: InventoryLog = {
        id: `trans-out-${Date.now()}`,
        productId,
        warehouseId: fromWarehouseId,
        type: 'TRANSFER_OUT',
        change: -quantity,
        previousQuantity: prevFromQty,
        newQuantity: newFromQty,
        referenceId: `TRF-${fromWarehouseId}-${toWarehouseId}`,
        performedBy: userId,
        timestamp,
        notes: `Transfer to ${toWarehouseId}`
      };

      const logIn: InventoryLog = {
        id: `trans-in-${Date.now()}`,
        productId,
        warehouseId: toWarehouseId,
        type: 'TRANSFER_IN',
        change: quantity,
        previousQuantity: prevToQty,
        newQuantity: newToQty,
        referenceId: `TRF-${fromWarehouseId}-${toWarehouseId}`,
        performedBy: userId,
        timestamp,
        notes: `Transfer from ${fromWarehouseId}`
      };

      return {
        inventory: state.inventory.map(i => {
          if (i.productId === productId && i.warehouseId === fromWarehouseId) {
            return { ...i, quantity: newFromQty, availableQuantity: (i.availableQuantity ?? i.quantity) - quantity };
          }
          if (i.productId === productId && i.warehouseId === toWarehouseId) {
            return { ...i, quantity: newToQty, availableQuantity: (i.availableQuantity ?? i.quantity) + quantity };
          }
          return i;
        }),
        inventoryLogs: [logIn, logOut, ...state.inventoryLogs].slice(0, 1000)
      };
    });

    const product = get().products.find(p => p.id === productId);
    get().logAction(userId, 'inventory_transfer', `Transferred ${quantity} ${product?.uom || 'units'} of ${product?.name} from ${fromWarehouseId} to ${toWarehouseId}`);
  },

  getBatchesForProduct: (productId) => {
    return get().batches.filter(b => b.productId === productId);
  },

  triggerException: async (excStart) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.reportException(excStart);
    }
    const newExc: AppException = {
      ...excStart,
      id: generateUUID(),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    set(state => ({ exceptions: [newExc, ...state.exceptions] }));
    get().addNotification({
      userId: 'admin',
      title: `Exception Flagged: ${excStart.type}`,
      message: excStart.description,
      type: excStart.severity === 'high' ? 'error' : 'warning'
    });
  },

  resolveException: async (id) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.resolveException(id);
    }
    set(state => ({
      exceptions: state.exceptions.map(e => e.id === id ? { ...e, status: 'resolved' } : e)
    }));
  },

  flagFraud: async (flagStart) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.flagFraud(flagStart);
    }
    const newFlag: FraudFlag = {
      ...flagStart,
      id: generateUUID(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    set(state => ({ fraudFlags: [newFlag, ...state.fraudFlags] }));
    get().addNotification({
      userId: 'admin',
      title: 'Suspicious Activity Detected',
      message: flagStart.reason,
      type: 'error'
    });
  },

  updateFraudStatus: async (id, status) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateFraudStatus(id, status);
    }
    set(state => ({
      fraudFlags: state.fraudFlags.map(f => f.id === id ? { ...f, status } : f)
    }));
  },

  addComplianceDoc: async (docStart) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addComplianceDoc(docStart);
    }
    const newDoc: ComplianceDoc = {
      ...docStart,
      id: generateUUID(),
      createdAt: new Date().toISOString()
    };
    set(state => ({ complianceDocs: [newDoc, ...state.complianceDocs] }));
    get().logAction(docStart.uploadedBy, 'upload_compliance_doc', `Uploaded ${docStart.type} document: ${docStart.title}`);
  },

  deleteComplianceDoc: async (id) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteComplianceDoc(id);
    }
    set(state => ({
      complianceDocs: state.complianceDocs.filter(d => d.id !== id)
    }));
  },

  payOutstandingInvoices: async (companyId) => {
    const { orders, logAction } = get();
    const unpaidOrderIds = orders
      .filter(o => o.companyId === companyId && !o.isPaid && ['dispatched', 'delivered'].includes(o.status))
      .map(o => o.id);

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_') && unpaidOrderIds.length > 0) {
      await SupabaseService.updateOrdersPaid(unpaidOrderIds, true);
    }
    
    logAction('system', 'pay_invoices', `Corporate payment received for company ${companyId}`);
    set((state) => ({
      orders: state.orders.map(o => 
        unpaidOrderIds.includes(o.id) ? { ...o, isPaid: true } : o
      )
    }));
  },

  markAsReconciled: async (companyId, orderIds) => {
    const { orders, logAction } = get();
    const settledOrders = orders.filter(o => orderIds.includes(o.id));
    const totalSettled = settledOrders.reduce((sum, o) => sum + o.netAmount, 0);

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateOrdersPaid(orderIds, true);
      await SupabaseService.updateCompanyCredit(companyId, totalSettled);
    }

    logAction('admin', 'reconciled_account', `Marked ${orderIds.length} orders for company ${companyId} as paid. Total Settled: ₹${totalSettled.toLocaleString()}`);

    set((state) => ({
      orders: state.orders.map(o => orderIds.includes(o.id) ? { ...o, isPaid: true } : o),
      companies: state.companies.map(c => 
        c.id === companyId 
          ? { ...c, availableCredit: (c.availableCredit || 0) + totalSettled } 
          : c
      )
    }));
  },

  bulkMarkAsReconciled: async (orderIds: string[]) => {
    const { orders, logAction } = get();
    const settledOrders = orders.filter(o => orderIds.includes(o.id));
    
    const settlementByCompany = settledOrders.reduce((acc, o) => {
      acc[o.companyId] = (acc[o.companyId] || 0) + o.netAmount;
      return acc;
    }, {} as Record<string, number>);

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateOrdersPaid(orderIds, true);
      for (const [companyId, amount] of Object.entries(settlementByCompany)) {
        await SupabaseService.updateCompanyCredit(companyId, amount);
      }
    }

    logAction('admin', 'bulk_reconciliation', `Global settlement: Marked ${orderIds.length} invoices as paid across ${Object.keys(settlementByCompany).length} clients.`);

    set((state) => ({
      orders: state.orders.map(o => orderIds.includes(o.id) ? { ...o, isPaid: true } : o),
      companies: state.companies.map(c => 
        settlementByCompany[c.id] 
          ? { ...c, availableCredit: (c.availableCredit || 0) + settlementByCompany[c.id] } 
          : c
      )
    }));
  },

  markOrdersAsTallyExported: async (orderIds) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.markOrdersTallyExported(orderIds);
    }
    set((state) => ({
      orders: state.orders.map(o => orderIds.includes(o.id) ? { ...o, tallyExported: true } : o)
    }));
  },

  generateTallyXML: (orderIds) => {
    const orders = get().orders.filter(o => orderIds.includes(o.id));
    const companies = get().companies;
    
    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;
    
    orders.forEach(order => {
      const company = companies.find(c => c.id === order.companyId);
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n            <DATE>${new Date(order.createdAt).toISOString().split('T')[0].replace(/-/g, '')}</DATE>\n            <VOUCHERNUMBER>${order.customId}</VOUCHERNUMBER>\n            <PARTYLEDGERNAME>${company?.name || 'Cash Sales'}</PARTYLEDGERNAME>\n            <STATENAME>${company?.gstNumber?.substring(0,2) === '27' ? 'Maharashtra' : 'Other'}</STATENAME>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>Sales Income</LEDGERNAME>\n              <AMOUNT>-${order.totalAmount}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>Output GST</LEDGERNAME>\n              <AMOUNT>-${order.gstAmount}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>${company?.name || 'Cash Sales'}</LEDGERNAME>\n              <AMOUNT>${order.netAmount}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n          </VOUCHER>\n        </TALLYMESSAGE>\n`;
    });
    
    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  },

  addWebhook: async (webhookStart) => {
    const newWh = { ...webhookStart, id: generateUUID(), createdAt: new Date().toISOString() };
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addWebhook(newWh);
    }
    set((state) => ({ webhooks: [newWh, ...state.webhooks] }));
  },

  submitIncident: async (incident) => {
    const newIncident: FieldIncident = {
      ...incident,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      status: 'Open',
      title: (incident as any).title || `${incident.type} Incident Reported`
    };
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.submitIncident(newIncident);
    }
    set(state => ({ fieldIncidents: [newIncident, ...state.fieldIncidents] }));
    get().addAlert({ message: 'Incident reported successfully.', type: 'warning' });
  },

  updateIncidentStatus: async (id, status, adminRemarks) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateIncidentStatus(id, { status, adminRemarks });
    }
    set(state => ({
      fieldIncidents: state.fieldIncidents.map(inc => 
        inc.id === id ? { ...inc, status, ...(adminRemarks ? { adminRemarks } : {}) } : inc
      )
    }));
    get().addAlert({ message: `Incident ${id} updated to ${status}`, type: 'info' });
  },

  updateShiftStatus: async (id, status) => {
    set(state => ({
      employeeShifts: state.employeeShifts.map(sh => sh.id === id ? { ...sh, status } : sh)
    }));
  },

  updateWebhook: async (id, updates) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateWebhook(id, updates);
    }
    set((state) => ({ webhooks: state.webhooks.map(w => w.id === id ? { ...w, ...updates } : w) }));
  },

  deleteWebhook: async (id) => {
    const { webhooks, logAction } = get();
    const wh = webhooks.find(w => w.id === id);
    logAction('admin', 'delete_webhook', `Removed webhook: ${wh?.name || id}`);
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteWebhook(id);
    }
    set((state) => ({ webhooks: state.webhooks.filter(w => w.id !== id) }));
  },

  toggleWebhookActive: async (id) => {
    const { webhooks, logAction } = get();
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    const newActive = !webhook.active;
    logAction('admin', 'toggle_webhook', `${newActive ? 'Enabled' : 'Disabled'} webhook: ${webhook?.name || id}`);
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
       await SupabaseService.toggleWebhookActive(id, newActive);
    }
    set((state) => ({
      webhooks: state.webhooks.map(w => w.id === id ? { ...w, active: newActive } : w)
    }));
  },

  updateSettings: async (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateSettings(newSettings);
    }
  },

  generateQRToken: async (companyId, userId, locationId) => {
    const newToken: QRLogin = {
      id: generateUUID(),
      companyId,
      userId,
      locationId,
      token: generateUUID(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      status: 'active'
    };
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addQRToken(newToken);
    }
    set(state => ({ qrLogins: [newToken, ...state.qrLogins] }));
    get().logAction('admin', 'generate_qr', `Generated QR token for ${userId ? 'user ' + userId : 'location ' + locationId}`);
    return newToken.token;
  },

  revokeQRToken: async (id) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.revokeQRToken(id);
    }
    set(state => ({
      qrLogins: state.qrLogins.map(t => t.id === id ? { ...t, active: false, status: 'revoked' } : t)
    }));
  },

  loginWithQR: async (token) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      const user = await SupabaseService.loginWithQR(token);
      if (user) {
        set({ currentUser: user });
        get().logAction(user.id, 'qr_login', `Logged in via QR code (Token: ${token.slice(0, 5)}...)`);
        return true;
      }
    }
    // Fallback to local
    const qr = get().qrLogins.find(t => t.token === token && t.active && new Date(t.expiresAt) > new Date());
    if (qr) {
      const user = get().users.find(u => u.id === qr.userId);
      if (user) {
        set({ currentUser: user });
        get().logAction(user.id, 'qr_login', `Logged in via QR code (Token: ${token.slice(0, 5)}...)`);
        return true;
      }
    }
    return false;
  },

  // Enterprise Implementations
  bulkAddUsers: async (companyId, usersArray) => {
    const { logAction, companies } = get();
    const newUsersPromises = usersArray.map(async (u) => {
      const name = u.name || 'Staff User';
      const username = u.username || name.toLowerCase().replace(/\s+/g, '.') + secureToken(1);
      const plainPassword = u.password || secureToken(8);
      const hashedPassword = await hashPassword(plainPassword);

      return {
        ...u,
        id: generateUUID(),
        companyId,
        username,
        password: hashedPassword,
        status: 'active' as const,
        role: u.role || 'client_staff',
        email: u.email || `${username}@client.com`,
        _plainPassword: plainPassword // Store temporarily for email, not persisted
      };
    });

    const newUsers = await Promise.all(newUsersPromises);
    
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.bulkAddUsers(newUsers.map(u => {
        const { _plainPassword: _, ...rest } = u; // eslint-disable-line @typescript-eslint/no-unused-vars
        return rest;
      }));
    }
    
    set(state => ({ users: [...state.users, ...newUsers.map(u => {
      const { _plainPassword: _, ...rest } = u; // eslint-disable-line @typescript-eslint/no-unused-vars
      return sanitizeUser(rest) as User;
    })] }));
    logAction('admin', 'bulk_user_import', `Imported ${usersArray.length} users for company ${companyId}`);

    const company = companies.find(c => c.id === companyId);
    newUsers.forEach(u => {
      // Use the temporary _plainPassword for the email template
      EmailTemplates.newClientWelcome(u.email, company?.name || 'Pyramid FM Partner', u.name || 'User', u._plainPassword).then();
    });
  },

  inviteCorporateUser: async (companyId: string, userData: Partial<User>) => {
    const { logAction, addAlert } = get();
    const tempPassword = secureToken(8);
    const hashedPassword = await hashPassword(tempPassword);
    
    if (!userData.email) {
      throw new Error("Email registry is mandatory for corporate invitations.");
    }
    
    const newUser: User = {
      ...userData,
      id: generateUUID(),
      companyId,
      status: 'active',
      password: hashedPassword,
      username: userData.username || userData.email.split('@')[0] + Math.floor(Math.random() * 100),
      lastActionAt: new Date().toISOString()
    } as User;

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addUser(newUser);
    }
    
    set(state => ({ users: [...state.users, sanitizeUser(newUser) as User] }));
    logAction(get().currentUser?.id || 'system', 'invite_user', `Invited ${newUser.name} to company ${companyId}`);
    addAlert({ message: `Invitation dispatched to ${newUser.email}.`, type: 'success' });
    
    // Simulate email dispatch
    EmailTemplates.newClientWelcome(newUser.email, 'Enterprise Portal', newUser.name, tempPassword).then();
  },

  updateCompanyBranding: async (companyId, branding) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateCompanyBranding(companyId, branding);
    }
    set(state => ({
      companies: state.companies.map(c => c.id === companyId ? { ...c, branding: { ...c.branding, ...branding } } : c)
    }));
  },

  updateCompanySettings: async (companyId, settings: Partial<Company>) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateCompanySettings(companyId, settings);
    }
    set(state => ({
      companies: state.companies.map(c => c.id === companyId ? { ...c, ...settings } : c)
    }));
    get().addAlert({ message: 'Company governance settings synchronized.', type: 'success' });
  },


  approveOrder: async (orderId, userId, role) => {
    const { orders, logAction } = get();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    // SEC-08: validate role against the actual logged-in user — do not trust the caller
    const actor = get().currentUser;
    if (!actor || actor.id !== userId) {
      console.warn('SEC-08: approveOrder blocked — userId mismatch with currentUser.');
      return;
    }
    if (actor.role !== role) {
      console.warn(`SEC-08: approveOrder blocked — role mismatch. Claimed: ${role}, Actual: ${actor.role}`);
      return;
    }

    const currentChain = order.approvalChain || [];
    const newSignature = { 
      role, 
      userId, 
      userName: actor.name,
      action: 'approved' as const, 
      timestamp: new Date().toISOString() 
    };
    const newChain = [...currentChain, newSignature];

    // Determine if manager or admin has approved
    const hasManager = newChain.some(c => c.role === 'client_manager' || c.role === 'admin');
    const hasDirector = newChain.some(c => c.role === 'client_director' || c.role === 'admin');
    const hasAdmin = newChain.some(c => c.role === 'admin');

    let newStatus: Order['status'] = order.status;
    let isFullyApproved = false;

    // Logic for tiered approval
    if (order.netAmount >= 100000) { // High value order requires director or admin
      if (hasDirector || hasAdmin) {
        newStatus = 'approved';
        isFullyApproved = true;
      } else if (hasManager) {
        newStatus = 'pending_director'; // Manager approved, now needs director
      } else {
        newStatus = 'pending_approval'; // Still needs manager approval
      }
    } else { // Standard order, manager or admin approval is sufficient
      if (hasManager || hasAdmin) {
        newStatus = 'approved';
        isFullyApproved = true;
      } else {
        newStatus = 'pending_approval';
      }
    }

    let updatedOrder: Order = {
      ...order,
      status: newStatus,
      approvalChain: newChain
    };

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateOrderStatus(orderId, newStatus);
    }

    set(state => ({
      orders: state.orders.map(o => o.id === orderId ? updatedOrder : o),
      // Deduct from company credit only upon final sign-off
      companies: isFullyApproved ? state.companies.map(c => 
        c.id === order.companyId 
          ? { ...c, availableCredit: (c.availableCredit || 0) - order.netAmount } 
          : c
      ) : state.companies,
      // Update location spend only upon final sign-off
      locations: isFullyApproved ? state.locations.map(l => 
        l.id === order.locationId 
          ? { ...l, currentMonthSpend: (l.currentMonthSpend || 0) + order.netAmount } 
          : l
      ) : state.locations
    }));

    if (isFullyApproved) {
      logAction(userId, 'order_approval', `Authorized order ${orderId} (₹${order.netAmount} deducted from credit)`);
    } else {
      logAction(userId, 'order_partial_approval', `Tier 1 Authorization complete for ${orderId}. Pending Director signature.`);
    }
  },

  updateLocationBudget: async (locationId, budget) => {
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateLocationBudget(locationId, budget);
    }
    set(state => ({
      locations: state.locations.map(l => l.id === locationId ? { ...l, monthlyBudget: budget } : l)
    }));
  },

  checkLowStock: async () => {
    const { inventory, products, currentUser, notifications, lowStockNotifiedProducts, addNotification } = get();
    if (!currentUser || currentUser.role !== 'admin') return;

    const lowStockItems = inventory.filter(i => i.quantity <= i.lowStockThreshold);
    
    const newNotifications: string[] = [];
    
    lowStockItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      const title = `Low Stock: ${product.name}`;
      // Check if already in notifications list OR already notified in this session
      const alreadyNotified = notifications.some(n => n.title === title && !n.read) || 
                             lowStockNotifiedProducts.includes(item.productId);

      if (!alreadyNotified) {
        addNotification({
          userId: currentUser.id,
          title,
          message: `Only ${item.quantity} ${product.uom}s remaining. Reorder needed.`,
          type: 'warning'
        });
        newNotifications.push(item.productId);
      }
    });

    if (newNotifications.length > 0) {
      set(state => ({
        lowStockNotifiedProducts: [...state.lowStockNotifiedProducts, ...newNotifications]
      }));
    }
  },

  // Support Ticketing Implementations
  createTicket: async (ticket) => {
    const sentimentScore = Math.random() * 0.4 + 0.3; // Simulate mid-range sentiment
    const isUrgent = ticket.priority === 'High' || sentimentScore < 0.4;
    
    const newTicket: SupportTicket = {
      ...ticket,
      id: generateUUID(),
      customId: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Open',
      messages: [],
      attachments: ticket.attachments || [],
      sentimentScore,
      relatedOrderId: ticket.relatedOrderId,
      relatedLocationId: ticket.relatedLocationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Auto-assign based on category
    if (newTicket.category === 'Order Issue' || newTicket.category === 'Damaged Product') {
      const warehouseStaff = get().users.find(u => u.role === 'warehouse_staff');
      if (warehouseStaff) newTicket.assignedTo = warehouseStaff.id;
    } else {
      const adminUser = get().users.find(u => u.role === 'admin');
      if (adminUser) newTicket.assignedTo = adminUser.id;
    }

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.createTicket(newTicket);
    }

    get().addAlert({ 
      message: isUrgent ? 'Urgent ticket registered. Triage active.' : 'Support ticket submitted.', 
      type: isUrgent ? 'warning' : 'success' 
    });
    set(state => ({ supportTickets: [newTicket, ...state.supportTickets] }));
  },
  
  updateTicketStatus: async (id, status, assignedTo) => {
    const updatedAt = new Date().toISOString();
    const updatePayload: any = { status, updatedAt };
    if (assignedTo) updatePayload.assignedTo = assignedTo;

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateTicketStatus(id, updatePayload);
    }
    set(state => ({
      supportTickets: state.supportTickets.map(t => 
        t.id === id 
          ? { ...t, status, assignedTo: assignedTo || t.assignedTo, updatedAt } 
          : t
      )
    }));
  },

  addTicketMessage: async (ticketId, senderId, message, isStaff, imageUrl) => {
    const createdAt = new Date().toISOString();
    const newMessage: TicketMessage = {
      id: generateUUID(),
      ticketId,
      senderId,
      message,
      isStaff,
      created_at: createdAt
    };
    if (imageUrl) newMessage.imageUrl = imageUrl;

    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addTicketMessage(newMessage);
    }
    set(state => ({
      supportTickets: state.supportTickets.map(t => 
        t.id === ticketId ? { ...t, messages: [...t.messages, newMessage], updatedAt: createdAt } : t
      )
    }));
  },

  autoTriageAll: async () => {
    const { supportTickets, users } = get();
    const adminId = users.find(u => u.role === 'admin')?.id;
    const staffId = users.find(u => u.role === 'warehouse_staff')?.id;

    const triaged = supportTickets.map(t => {
      if (t.assignedTo) return t;
      let assignedTo = adminId;
      if (t.category === 'Order Issue' || t.category === 'Damaged Product') assignedTo = staffId;
      return { ...t, assignedTo, updatedAt: new Date().toISOString() };
    });

    set({ supportTickets: triaged });
    get().addAlert({ message: 'Global triage complete. All incidents routed.', type: 'success' });
  },

  // Employee Module Implementations
  addEmployee: async (employee) => {
    const newEmployee: Employee = { ...employee, id: generateUUID() };
    set(state => ({ employees: [...state.employees, newEmployee] }));
    get().addAlert({ message: `Employee ${employee.name} added.`, type: 'success' });
  },

  updateEmployee: async (id, updates) => {
    set(state => ({
      employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  },

  deleteEmployee: async (id) => {
    set(state => ({ employees: state.employees.filter(e => e.id !== id) }));
  },

  submitWorkReport: async (report) => {
    const newReport: WorkReport = {
      ...report,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      // Assuming a generic add method for reports or specific one
      await (SupabaseService as any).submitWorkReport?.(newReport);
    }
    set(state => ({ workReports: [newReport, ...state.workReports] }));
    get().addAlert({ message: 'Work report submitted for review.', type: 'success' });
  },
  approveWorkReport: async (reportId, supervisorId) => {
    set(state => ({
      workReports: state.workReports.map(r => 
        r.id === reportId ? { ...r, status: 'approved', approvedBy: supervisorId } : r
      )
    }));
    get().addAlert({ message: 'Report Approved.', type: 'success' });
  },
  rejectWorkReport: async (reportId, supervisorId) => {
    set(state => ({
      workReports: state.workReports.map(r => 
        r.id === reportId ? { ...r, status: 'rejected', approvedBy: supervisorId } : r
      )
    }));
    get().addAlert({ message: 'Report Rejected.', type: 'info' });
  },

  submitAttendance: async (record) => {
    const { employeeId, locationId, imageUrl, checkOut, type, latitude, longitude, metadata } = record;
    const isOut = !!checkOut || type === 'out';
    const matchScore = metadata?.faceMatchScore || 100;
    const timestamp = new Date().toISOString();

    if (isOut) {
      const activeRecord = get().attendanceRecords.find(r => r.employeeId === employeeId && !r.checkOut);
      if (activeRecord) {
        const updated = {
          ...activeRecord,
          checkOut: checkOut || timestamp,
          type: 'out',
          photoUrl: imageUrl,
          latitude,
          longitude,
          status: matchScore >= 90 ? 'verified' : 'pending',
          metadata: { ...activeRecord.metadata, ...metadata }
        } as AttendanceRecord;
        set(state => ({
          attendanceRecords: state.attendanceRecords.map(r => r.id === activeRecord.id ? updated : r)
        }));
        if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
          await SupabaseService.updateAttendanceRecord(activeRecord.id, updated);
        }
      }
    } else {
      const newRecord: AttendanceRecord = {
        id: generateUUID(),
        employeeId,
        locationId,
        imageUrl,
        photoUrl: imageUrl,
        type: 'in',
        latitude,
        longitude,
        timestamp,
        checkIn: timestamp,
        status: matchScore >= 90 ? 'verified' : 'pending',
        metadata: metadata || {}
      };
      set(state => ({ attendanceRecords: [...state.attendanceRecords, newRecord] }));
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
        await SupabaseService.submitAttendance(newRecord);
      }
    }

    get().addAlert({ 
      message: isOut ? 'Secure Check-out Logged.' : 'Secure Check-in Verified.', 
      type: 'success' 
    });
  },

  // Phase 49 Actions
  generateLocationQR: (locationId) => {
    const token = generateUUID();
    set(state => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, qrToken: token, qrStatus: 'active' } : loc
      )
    }));
    get().addAlert({ message: 'Secure Site QR code generated.', type: 'success' });
  },

  updateLocationCoordinates: (locationId, latitude, longitude) => {
    set(state => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, latitude, longitude } : loc
      )
    }));
    get().addAlert({ message: 'Site telemetry coordinates locked.', type: 'info' });
  },

  updateAttendanceTag: (recordId: string, tag: string) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => 
        r.id === recordId ? { ...r, metadata: { ...r.metadata, workTag: tag } } : r
      )
    }));
  },

  approveAttendance: async (id: string) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => 
        r.id === id ? { ...r, status: 'verified', adminRemarks: 'Biometrically Authenticated' } : r
      )
    }));
    get().addAlert({ message: 'Attendance trace cryptographically verified.', type: 'success' });
  },

  flagAttendance: async (id: string, reason: string) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => 
        r.id === id ? { ...r, status: 'flagged', adminRemarks: reason } : r
      )
    }));
    get().addAlert({ message: 'Audit flag raised on attendance log.', type: 'warning' });
  },

  canRecordAttendance: (userId, type) => {
    const { attendanceRecords } = get();
    const activeRecord = attendanceRecords.find(r => r.employeeId === userId && !r.checkOut);

    if (type === 'check-in' && activeRecord) {
      return { canProceed: false, reason: 'Already checked in. Please check out first.' };
    }
    if (type === 'check-out' && !activeRecord) {
      return { canProceed: false, reason: 'No active check-in found.' };
    }
    return { canProceed: true };
  },

  addAlert: (alert) => {
    const id = generateUUID();
    set(state => ({
      alerts: [...state.alerts, { ...alert, id }]
    }));
    // Auto-dismiss after duration or 5s
    const duration = alert.duration || 5000;
    setTimeout(() => {
      set(state => ({
        alerts: state.alerts.filter(a => a.id !== id)
      }));
    }, duration);
  },
  dismissAlert: (id) => {
    set(state => ({
      alerts: state.alerts.filter(a => a.id !== id)
    }));
  },

  updateTaskProgress: (employeeId, tasks) => {
    set((state) => ({
      dailyTaskProgress: {
        ...state.dailyTaskProgress,
        [employeeId]: tasks
      }
    }));
  },

  reassignShift: async (shiftId, locationId) => {
    set(state => ({
      employeeShifts: state.employeeShifts.map(s => 
        s.id === shiftId ? { ...s, locationId } : s
      )
    }));
    
    get().addAlert({
      type: 'info',
      message: 'Staff unit deployment has been updated.'
    });
  },
  
  addEmployeeShift: async (shift) => {
    const newShift = { ...shift, id: generateUUID() };
    set(state => ({
      employeeShifts: [...state.employeeShifts, newShift as EmployeeShift]
    }));
    get().addAlert({ message: 'New shift successfully charted.', type: 'success' });
  },

  deleteEmployeeShift: async (shiftId) => {
    set(state => ({
      employeeShifts: state.employeeShifts.filter(s => s.id !== shiftId)
    }));
    get().addAlert({ message: 'Shift operation cancelled.', type: 'warning' });
  },

  
  addCustomRole: async (role) => {
    const newRole = { ...role, id: generateUUID() };
    set(state => ({ customRoles: [...state.customRoles, newRole] }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addCustomRole(newRole);
    }
    get().addAlert({ message: `Role ${newRole.name} established.`, type: 'success' });
  },
  
  updateCustomRole: async (id, updates) => {
    set(state => ({
      customRoles: state.customRoles.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateCustomRole(id, updates);
    }
    get().addAlert({ message: 'Role configurations updated.', type: 'info' });
  },
  
  deleteCustomRole: async (id) => {
    set(state => ({
      customRoles: state.customRoles.filter(r => r.id !== id)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteCustomRole(id);
    }
    get().addAlert({ message: 'Role permanently decommissioned.', type: 'warning' });
  },
  
  addWorkAssignment: async (assignment) => {
    const newAssignment = { ...assignment, id: generateUUID(), createdAt: new Date().toISOString() };
    set(state => ({ workAssignments: [...state.workAssignments, newAssignment] }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addWorkAssignment(newAssignment);
    }
    get().addAlert({ message: 'New work assignment deployed.', type: 'success' });
  },
  
  updateWorkAssignment: async (id, updates) => {
    set(state => ({
      workAssignments: state.workAssignments.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateWorkAssignment(id, updates);
    }
    get().addAlert({ message: 'Work assignment updated.', type: 'info' });
  },
  
  deleteWorkAssignment: async (id) => {
    set(state => ({
      workAssignments: state.workAssignments.map(a => 
        a.id === id ? { ...a, status: 'archived' } : a
      )
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateWorkAssignment(id, { status: 'archived' });
    }
    get().addAlert({ message: 'Work assignment recalled and archived.', type: 'warning' });
  },

  addSiteProtocol: async (protocol) => {
    const newProtocol = { ...protocol, id: generateUUID() };
    set(state => ({ siteProtocols: [...state.siteProtocols, newProtocol] }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.addSiteProtocol(newProtocol);
    }
    get().addAlert({ message: 'Site protocol successfully codified.', type: 'success' });
  },
  deleteSiteProtocol: async (id) => {
    set(state => ({
      siteProtocols: state.siteProtocols.filter(p => p.id !== id)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteSiteProtocol(id);
    }
    get().addAlert({ message: 'Site protocol decommissioned.', type: 'warning' });
  },

  submitTimeOffRequest: async (request) => {
    const newReq = { ...request, id: generateUUID(), status: 'pending', createdAt: new Date().toISOString() };
    set(state => ({ timeOffRequests: [newReq as TimeOffRequest, ...state.timeOffRequests] }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.submitTimeOffRequest(newReq);
    }
    get().addAlert({ message: 'Absence request submitted for HR authorization.', type: 'info' });
  },
  updateTimeOffStatus: async (id, status, adminRemarks) => {
    set(state => ({
      timeOffRequests: state.timeOffRequests.map(r => r.id === id ? { ...r, status, adminRemarks } : r)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateTimeOffStatus(id, { status, adminRemarks });
    }
    get().addAlert({ message: `Absence request ${status.toUpperCase()}.`, type: 'success' });
  },
  updateAttendanceRecord: async (id, updates) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.updateAttendanceRecord(id, updates);
    }
    get().addAlert({ message: 'Punch register heavily modified.', type: 'warning' });
  },
  deleteAttendanceRecord: async (id) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.filter(r => r.id !== id)
    }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.deleteAttendanceRecord(id);
    }
    get().addAlert({ message: 'Timesheet log violently expunged from database.', type: 'error' });
  },
  createManualTimesheet: async (record) => {
    const newRecord = { ...record, id: generateUUID() };
    set(state => ({ attendanceRecords: [newRecord as AttendanceRecord, ...state.attendanceRecords] }));
    if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      await SupabaseService.submitAttendance(newRecord);
    }
    get().addAlert({ message: 'Supervisor-originated manual shift shift entry accepted.', type: 'info' });
  }
}));
