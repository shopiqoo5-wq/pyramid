import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
import { supabase } from '../lib/supabase';


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
  isSupabaseConnected: boolean;
  
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
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
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
  updateStock: (productId: string, warehouseId: string, quantityDelta: number, reason?: string, userId?: string, batchId?: string) => Promise<void>;
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
  submitWorkReport: (report: Omit<WorkReport, 'id' | 'createdAt' | 'status'>, file?: File) => Promise<void>;
  approveWorkReport: (reportId: string, supervisorId: string) => Promise<void>;
  rejectWorkReport: (reportId: string, supervisorId: string) => Promise<void>;
  submitTimeOffRequest: (request: Omit<TimeOffRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateTimeOffStatus: (id: string, status: TimeOffRequest['status'], adminRemarks?: string) => Promise<void>;
  submitAttendance: (record: { employeeId: string; photoUrl: string; checkOut?: string; locationId?: string; type?: 'in' | 'out'; latitude?: number; longitude?: number; metadata?: any }, isBase64?: boolean) => Promise<void>;
  recordAttendance: (record: { employeeId: string; photoUrl: string; checkOut?: string; locationId?: string; type?: 'in' | 'out'; latitude?: number; longitude?: number; metadata?: any }, isBase64?: boolean) => Promise<void>;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  deleteAttendanceRecord: (id: string) => void;
  createManualTimesheet: (record: Omit<AttendanceRecord, 'id'>) => void;

  // Phase 49: GPS & QR Management
  generateLocationQR: (locationId: string) => void;
  rotateLocationToken: (locationId: string) => void;
  updateLocationCoordinates: (locationId: string, latitude: number, longitude: number) => void;
  
  // Phase 38 Actions
  submitIncident: (incident: Omit<FieldIncident, 'id' | 'createdAt' | 'status'>, file?: File) => Promise<void>;
  updateIncidentStatus: (id: string, status: FieldIncident['status'], adminRemarks?: string) => Promise<void>;
  updateShiftStatus: (id: string, status: EmployeeShift['status']) => Promise<void>;

  // Workforce Tasks
  dailyTaskProgress: Record<string, string[]>; // employeeId -> task list
  submittedChecklists: Record<string, string>; // employeeId -> ISO date of submission
  updateTaskProgress: (employeeId: string, tasks: string[]) => void;
  submitDailyChecklist: (employeeId: string) => Promise<void>;
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




export const useStore = create<AppState>()(
  persist(
    (set, get) => ({

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
    if (get().isSupabaseConnected) {
      await SupabaseService.addQuotation(newQuotation);
    }
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

  isSupabaseConnected: false,
  currentUser: null,
  login: async (companyIdentifier, userIdentifier, password) => {
    // 1. Try Supabase Auth if connected
    if (get().isSupabaseConnected) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: userIdentifier,
          password: password,
        });

        if (!error && data.user) {
          const profile = await SupabaseService.getCurrentUser();
          if (profile) {
            set({ currentUser: profile });
            get().addAlert({ message: `Access Authorized: ${profile.name}`, type: 'success' });
            
            // Hydrate data immediately
            await get().initSupabase();
            return true;
          }
        }
      } catch (err: any) {
        console.warn('Supabase Auth failed, falling back to mock:', err.message);
      }
    }

    // 2. Fallback to mock logic
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
      const sanitized = sanitizeUser(user);
      set({ currentUser: sanitized as User });
      get().addAlert({ message: `Access Authorized: ${user.name}${isSystemAdmin ? ' (System)' : ''}`, type: 'success' });
      
      // Hydrate even for mock login to sync whatever is available
      await get().initSupabase();
      return true;
    }
    return false;
  },
  logout: async () => {
    // In Supabase mode, we use supabase.auth.signOut()
    await supabase.auth.signOut();
    get().addAlert({ message: 'Logged out successfully.', type: 'info' });
    
    // Clear all operational state on logout to prevent data leakage between sessions
    set({ 
      currentUser: null, 
      cart: [],
      orders: [],
      attendanceRecords: [],
      workReports: [],
      fieldIncidents: [],
      auditLogs: [],
      inventoryLogs: [],
      timeOffRequests: [],
      employeeShifts: [],
      notifications: [],
    });
    
    // Re-run init to restore base state
    await get().initSupabase();
  },

  initSupabase: async () => {
    const { addAlert } = get();
    
    // Check if Supabase keys exist
    const isConfigured = !!import.meta.env.VITE_SUPABASE_URL && 
                       !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_');
                       
    if (!isConfigured) {
      console.log('ℹ️ Supabase not configured. Using local persistence only.');
      set({ isSupabaseConnected: false });
      return;
    }

    try {
      const isReachable = await SupabaseService.checkConnection();
      if (!isReachable) {
        set({ isSupabaseConnected: false });
        console.warn('⚠️ Supabase unreachable. Falling back to local cache.');
        return;
      }

      set({ isSupabaseConnected: true });
      console.log('⚡ Digital Nexus: Cloud Sync Active');

      const fetchData = async <K extends keyof AppState>(
        label: string, 
        fetcher: () => Promise<any>, 
        setter: (data: any) => void,
        _stateKey: K
      ) => {
        try {
          const cloudData = await fetcher();
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            setter(cloudData);
            console.log(`✅ Synced: ${label}`);
          } else {
            console.log(`ℹ️ Cloud ${label} empty. Retaining local cache.`);
          }
        } catch (err: any) {
          console.error(`❌ Sync Failed [${label}]:`, err.message || err);
        }
      };

      // Atomic hydration sequence
      await Promise.all([
        fetchData('Products', SupabaseService.getProducts, (d) => set({ products: d }), 'products'),
        fetchData('Companies', SupabaseService.getCompanies, (d) => set({ companies: d }), 'companies'),
        fetchData('Locations', () => SupabaseService.getLocations(), (d) => set({ locations: d }), 'locations'),
        fetchData('Orders', () => SupabaseService.getOrders(), (d) => set({ orders: d }), 'orders'),
        fetchData('Inventory', SupabaseService.getInventory, (d) => set({ inventory: d }), 'inventory'),
        fetchData('Users', SupabaseService.getUsers, (d) => set({ users: d }), 'users'),
        fetchData('Attendance', () => SupabaseService.getAttendance(), (d) => set({ attendanceRecords: d }), 'attendanceRecords'),
        fetchData('Work Reports', SupabaseService.getWorkReports, (d) => set({ workReports: d }), 'workReports'),
        fetchData('Incidents', SupabaseService.getIncidents, (d) => set({ fieldIncidents: d }), 'fieldIncidents'),
        fetchData('Time Off', SupabaseService.getTimeOffRequests, (d) => set({ timeOffRequests: d }), 'timeOffRequests'),
        fetchData('Shifts', SupabaseService.getShifts, (d) => set({ employeeShifts: d }), 'employeeShifts'),
        fetchData('Employees', SupabaseService.getEmployees, (d) => set({ employees: d }), 'employees'),
        fetchData('Protocols', SupabaseService.getSiteProtocols, (d) => set({ siteProtocols: d }), 'siteProtocols'),
        fetchData('Assignments', SupabaseService.getWorkAssignments, (d) => set({ workAssignments: d }), 'workAssignments'),
        fetchData('Bundles', SupabaseService.getProductBundles, (d) => set({ productBundles: d }), 'productBundles'),
        fetchData('Roles', SupabaseService.getCustomRoles, (d) => set({ customRoles: d }), 'customRoles'),
        fetchData('Audit Logs', SupabaseService.getAuditLogs, (d) => set({ auditLogs: d }), 'auditLogs'),
        fetchData('Inventory Logs', SupabaseService.getInventoryLogs, (d) => set({ inventoryLogs: d }), 'inventoryLogs'),
        fetchData('Quotations', SupabaseService.getQuotations, (d) => set({ quotations: d }), 'quotations'),
        fetchData('Tickets', () => SupabaseService.getTickets(), (d) => set({ supportTickets: d }), 'supportTickets'),
        fetchData('Recurring Orders', () => SupabaseService.getRecurringOrders(), (d) => set({ recurringOrders: d }), 'recurringOrders'),
        fetchData('Webhooks', SupabaseService.getWebhooks, (d) => set({ webhooks: d }), 'webhooks'),
        fetchData('Compliance Docs', () => SupabaseService.getComplianceDocs(), (d) => set({ complianceDocs: d }), 'complianceDocs'),
        fetchData('Fraud Flags', SupabaseService.getFraudFlags, (d) => set({ fraudFlags: d }), 'fraudFlags'),
        fetchData('Exceptions', SupabaseService.getExceptions, (d) => set({ exceptions: d }), 'exceptions'),
        fetchData('Daily Checklists', SupabaseService.getDailyChecklists, (d) => {
          const progress: Record<string, string[]> = {};
          const status: Record<string, string> = {};
          d.forEach((item: any) => {
            progress[item.employeeId] = item.completedTasks;
            status[item.employeeId] = item.timestamp;
          });
          set({ dailyTaskProgress: progress, submittedChecklists: status });
        }, 'submittedChecklists'),
        fetchData('Batches', SupabaseService.getBatches, (d) => set({ batches: d }), 'batches'),
      ]);

      const user = get().currentUser;
      if (user) {
        await fetchData(`${user.name} Notifications`, () => SupabaseService.getNotifications(user.id), (d) => set({ notifications: d }), 'notifications');
      }

      // Attempt to restore session
      try {
        const currentUser = await SupabaseService.getCurrentUser();
        if (currentUser) {
          set({ currentUser });
          console.log(`👤 Auth Verified: ${currentUser.name}`);
        }
      } catch {
        console.warn('Current user verification skipped.');
      }

    } catch (err: any) {
      console.error('CRITICAL: Supabase hydration crashed:', err);
      addAlert({ message: 'Cloud sync interrupted. Running in local-only mode.', type: 'warning' });
      set({ isSupabaseConnected: false });
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
      { id: 'inc-1', userId: 'd2222222-4444-4444-8444-000000000002', locationId: '11111111-2222-4000-8000-000000000001', type: 'Safety', severity: 'Medium', title: 'Wet floor in lobby', description: 'Careful of slipping', status: 'Resolved', createdAt: new Date().toISOString() },
      { id: 'inc-2', userId: 'emp-002', locationId: '11111111-2222-4000-8000-000000000002', type: 'Safety', severity: 'High', title: 'Safety Incident Reported', description: 'Slippery floor near the loading bay, no warning signs found.', status: 'In Progress', createdAt: new Date(Date.now() - 3600000).toISOString() }
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
  submittedChecklists: {},
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
    if (get().isSupabaseConnected) {
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
          get().updateStock(item.productId, warehouseId, item.quantity, `Return Restock (${id})`, 'system');
        });
      }
    } else if (status === 'rejected') {
      get().addAlert({ message: `Return ${id} rejected.`, type: 'error' });
    }

    if (get().isSupabaseConnected) {
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
        imageUrl: 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=200&h=200&fit=crop', 
        remarks: 'Main lobby area sanitized.', 
        status: 'pending' as const,
        createdAt: new Date().toISOString()
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

      if (get().isSupabaseConnected) {
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

  logAction: async (userId, action, details) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.logAction(userId, action, details);
    }
    set((state) => ({
      auditLogs: [{
        id: `log-${Date.now()}`,
        userId,
        action,
        details,
        createdAt: new Date().toISOString()
      }, ...state.auditLogs]
    }));
  },

  addNotification: async (notification) => {
    const newNotif = {
      ...notification,
      id: generateUUID(),
      read: false,
      createdAt: new Date().toISOString()
    };
    if (get().isSupabaseConnected) {
      await SupabaseService.addNotification(newNotif);
    }
    set((state) => ({
      notifications: [newNotif as Notification, ...state.notifications]
    }));
  },

  markNotificationAsRead: async (id) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.markNotificationRead(id);
    }
    set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  },

  addRecurringOrder: async (orderStart) => {
    const newOrder = {
      ...orderStart,
      id: generateUUID(),
      createdAt: new Date().toISOString()
    };
    if (get().isSupabaseConnected) {
      await SupabaseService.addRecurringOrder(newOrder);
    }
    set((state) => ({
      recurringOrders: [newOrder as RecurringOrder, ...state.recurringOrders]
    }));
    get().addAlert({ message: 'Recurring mandate established.', type: 'success' });
  },

  toggleRecurringOrderStatus: async (id) => {
    const { recurringOrders } = get();
    const order = recurringOrders.find(r => r.id === id);
    if (!order) return;
    
    const newStatus = order.status === 'active' ? 'paused' : 'active';
    if (get().isSupabaseConnected) {
      await SupabaseService.updateRecurringOrderStatus(id, newStatus);
    }
    set((state) => ({
      recurringOrders: state.recurringOrders.map(r => r.id === id ? { ...r, status: newStatus } : r)
    }));
  },

  deleteRecurringOrder: async (id) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteRecurringOrder(id);
    }
    set((state) => ({
      recurringOrders: state.recurringOrders.filter(r => r.id !== id)
    }));
    get().addAlert({ message: 'Recurring mandate terminated.', type: 'warning' });
  },

  addProduct: async (productStart) => {
    try {
      if (get().isSupabaseConnected) {
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
      if (get().isSupabaseConnected) {
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
      if (get().isSupabaseConnected) {
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
      if (get().isSupabaseConnected) {
        const company = await SupabaseService.addCompany(companyStart);
        set((state) => ({ companies: [company, ...state.companies] }));
      } else {
        set((state) => ({ companies: [{ ...companyStart, id: generateUUID() } as Company, ...state.companies] }));
      }
      get().addAlert({ message: 'Company registry finalized.', type: 'success' });
    } catch (_e: any) {
      get().addAlert({ message: `Failed to add company: ${_e.message}`, type: 'error' });
    }
  },

  updateCompany: async (id, updates) => {
    try {
      if (get().isSupabaseConnected) {
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
      if (get().isSupabaseConnected) {
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
      
      if (get().isSupabaseConnected) {
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
    
    if (get().isSupabaseConnected) {
      await SupabaseService.addProductBundle(newBundle);
    }

    set((state) => ({ productBundles: [newBundle, ...state.productBundles] }));
  },

  updateProductBundle: async (id, updates) => {
    const { productBundles, logAction } = get();
    const bundle = productBundles.find(b => b.id === id);
    logAction('admin', 'update_bundle', `Updated bundle: ${bundle?.name || id}`);
    
    if (get().isSupabaseConnected) {
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
    
    if (get().isSupabaseConnected) {
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
             createdAt: new Date().toISOString(),
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
              createdAt: new Date().toISOString(),
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

    if (get().isSupabaseConnected) {
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
    
    if (get().isSupabaseConnected) {
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
    
    if (get().isSupabaseConnected) {
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
    
    if (get().isSupabaseConnected) {
      const newContract = await SupabaseService.addContract(contractStart) as Contract;
      set(state => ({ contracts: [newContract, ...state.contracts] }));
    } else {
      const newContract: Contract = { ...contractStart, id: generateUUID(), status: 'Active' };
      set(state => ({ contracts: [newContract, ...state.contracts] }));
    }
  },

  deleteLocation: async (id) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteLocation(id);
    }
    set((state) => ({
      locations: state.locations.filter(l => l.id !== id)
    }));
  },

  updateLocation: async (id, updates) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateLocation(id, updates);
    }
    set((state) => ({
      locations: state.locations.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
    get().logAction('admin', 'update_location', `Updated site specifications for ${id}`);
  },

  updateContract: async (id, updates) => {
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
      await SupabaseService.upsertClientPricing({
           companyId, productId, negotiatedPrice: price
      });
    }

    set({ clientPricing: newPricing });
  },

  updateStock: async (productId: string, warehouseId: string, quantityDelta: number, reason?: string, userId?: string, batchId?: string) => {
    const actorId = userId || get().currentUser?.id || 'system';
    const state = get();
    const item = state.inventory.find(i => i.productId === productId && i.warehouseId === warehouseId);
    const previousQty = item?.quantity || 0;
    const newQty = Math.max(0, previousQty + quantityDelta);
    const timestamp = new Date().toISOString();

    const newLog: InventoryLog = {
      id: generateUUID(),
      productId,
      warehouseId,
      type: quantityDelta > 0 ? 'REFILL' : 'SALE',
      change: Math.abs(quantityDelta),
      previousQuantity: previousQty,
      newQuantity: newQty,
      referenceId: batchId || 'MANUAL',
      performedBy: actorId,
      createdAt: timestamp,
      notes: reason || 'Manual adjustment'
    };

    set((state) => {
      let newBatches = state.batches;
      if (batchId) {
        newBatches = state.batches.map(b => 
          b.id === batchId ? { ...b, quantity: Math.max(0, b.quantity + quantityDelta) } : b
        );
      }

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
        inventoryLogs: [newLog, ...state.inventoryLogs].slice(0, 1000)
      };
    });
    
    get().checkLowStock();
    const product = get().products.find(p => p.id === productId);
    get().logAction(actorId, 'inventory_adjustment', `Adjusted ${product?.name || productId} stock in ${warehouseId} by ${quantityDelta}. Reason: ${reason}`);

    if (get().isSupabaseConnected) {
      SupabaseService.updateStock(productId, warehouseId, newQty).then();
      SupabaseService.addInventoryLog(newLog).then();
    }

    if (newQty <= (item?.lowStockThreshold || 0)) {
       const adminEmail = get().settings.supportEmail || 'admin@pyramidfm.com';
       EmailTemplates.lowStockAlert(adminEmail, product?.name || productId, newQty, item?.lowStockThreshold || 0).then();
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
    if (get().isSupabaseConnected) {
      await SupabaseService.addBatch(newBatch);
    }
    set(state => ({ 
      batches: [newBatch, ...state.batches]
    }));
    // Also update total inventory for that product/warehouse
    await get().updateStock(newBatch.productId, newBatch.warehouseId, newBatch.quantity, 'Manual Batch Entry');
  },

  transferStock: (productId, fromWarehouseId, toWarehouseId, quantity) => {
    const userId = get().currentUser?.id || 'admin';
    const timestamp = new Date().toISOString();
    const state = get();
    
    const fromItem = state.inventory.find(i => i.productId === productId && i.warehouseId === fromWarehouseId);
    const toItem = state.inventory.find(i => i.productId === productId && i.warehouseId === toWarehouseId);
    
    if (!fromItem || fromItem.quantity < quantity) {
      console.error('Insufficient stock for transfer');
      return;
    }

    const prevFromQty = fromItem.quantity;
    const newFromQty = fromItem.quantity - quantity;
    const prevToQty = toItem?.quantity || 0;
    const newToQty = prevToQty + quantity;

    const logOut: InventoryLog = {
      id: generateUUID(),
      productId,
      warehouseId: fromWarehouseId,
      type: 'TRANSFER_OUT',
      change: -quantity,
      previousQuantity: prevFromQty,
      newQuantity: newFromQty,
      referenceId: `TRF-${fromWarehouseId}-${toWarehouseId}`,
      performedBy: userId,
      createdAt: timestamp,
      notes: `Transfer to ${toWarehouseId}`
    };

    const logIn: InventoryLog = {
      id: generateUUID(),
      productId,
      warehouseId: toWarehouseId,
      type: 'TRANSFER_IN',
      change: quantity,
      previousQuantity: prevToQty,
      newQuantity: newToQty,
      referenceId: `TRF-${fromWarehouseId}-${toWarehouseId}`,
      performedBy: userId,
      createdAt: timestamp,
      notes: `Transfer from ${fromWarehouseId}`
    };

    set((state) => ({
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
    }));

    if (get().isSupabaseConnected) {
      Promise.all([
        SupabaseService.updateStock(productId, fromWarehouseId, newFromQty),
        SupabaseService.updateStock(productId, toWarehouseId, newToQty),
        SupabaseService.addInventoryLog(logOut),
        SupabaseService.addInventoryLog(logIn)
      ]).catch(err => console.error('Transfer Sync Failed:', err));
    }

    const product = get().products.find(p => p.id === productId);
    get().logAction(userId, 'inventory_transfer', `Transferred ${quantity} ${product?.uom || 'units'} of ${product?.name} from ${fromWarehouseId} to ${toWarehouseId}`);
  },

  getBatchesForProduct: (productId) => {
    return get().batches.filter(b => b.productId === productId);
  },

  triggerException: async (excStart) => {
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
      await SupabaseService.resolveException(id);
    }
    set(state => ({
      exceptions: state.exceptions.map(e => e.id === id ? { ...e, status: 'resolved' } : e)
    }));
  },

  flagFraud: async (flagStart) => {
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
      await SupabaseService.updateFraudStatus(id, status);
    }
    set(state => ({
      fraudFlags: state.fraudFlags.map(f => f.id === id ? { ...f, status } : f)
    }));
  },

  addComplianceDoc: async (docStart) => {
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
      await SupabaseService.addWebhook(newWh);
    }
    set((state) => ({ webhooks: [newWh, ...state.webhooks] }));
  },

  submitIncident: async (incident, file) => {
    let finalImageUrl = incident.imageUrl || '';
    
    // Hardening Section: If a real file is provided, upload it to Supabase Storage
    if (file && get().isSupabaseConnected) {
      try {
        const path = `incidents/${generateUUID()}-${file.name}`;
        finalImageUrl = await SupabaseService.uploadFile('incidents', path, file);
      } catch {
        get().addAlert({ message: 'Incident evidence upload deferred. Metadata persisted.', type: 'info' });
      }
    }

    const newIncident: FieldIncident = {
      ...incident,
      id: generateUUID(),
      userId: incident.userId, // Standardized
      createdAt: new Date().toISOString(),
      status: 'Open',
      imageUrl: finalImageUrl,
      title: (incident as any).title || `${incident.type} Incident Reported`
    };

    try {
      if (get().isSupabaseConnected) {
        await SupabaseService.submitIncident(newIncident);
      }
      set(state => ({ fieldIncidents: [newIncident, ...state.fieldIncidents] }));
      get().addAlert({ message: 'Transmission Successful: Incident reported to Command.', type: 'success' });
    } catch (err: any) {
      console.error('Critical sync failure:', err);
      get().addAlert({ message: `Sync Failure: ${err.message}`, type: 'error' });
      throw err; // Bubbling up to component for UI handling
    }
  },

  updateIncidentStatus: async (id, status, adminRemarks) => {
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
      await SupabaseService.updateWebhook(id, updates);
    }
    set((state) => ({ webhooks: state.webhooks.map(w => w.id === id ? { ...w, ...updates } : w) }));
  },

  deleteWebhook: async (id) => {
    const { webhooks, logAction } = get();
    const wh = webhooks.find(w => w.id === id);
    logAction('admin', 'delete_webhook', `Removed webhook: ${wh?.name || id}`);
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
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
    
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
      await SupabaseService.addQRToken(newToken);
    }
    set(state => ({ qrLogins: [newToken, ...state.qrLogins] }));
    get().logAction('admin', 'generate_qr', `Generated QR token for ${userId ? 'user ' + userId : 'location ' + locationId}`);
    return newToken.token;
  },

  revokeQRToken: async (id) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.revokeQRToken(id);
    }
    set(state => ({
      qrLogins: state.qrLogins.map(t => t.id === id ? { ...t, active: false, status: 'revoked' } : t)
    }));
  },

  loginWithQR: async (token) => {
    if (get().isSupabaseConnected) {
      const user = await SupabaseService.loginWithQR(token);
      if (user) {
        set({ currentUser: user as User });
        get().logAction(user.id, 'qr_login', `Logged in via QR code (Token: ${token.slice(0, 5)}...)`);
        
        // Hydrate data immediately
        await get().initSupabase();
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
        
        // Refresh session data
        await get().initSupabase();
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
    
    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
      await SupabaseService.addUser(newUser);
    }
    
    set(state => ({ users: [...state.users, sanitizeUser(newUser) as User] }));
    logAction(get().currentUser?.id || 'system', 'invite_user', `Invited ${newUser.name} to company ${companyId}`);
    addAlert({ message: `Invitation dispatched to ${newUser.email}.`, type: 'success' });
    
    // Simulate email dispatch
    EmailTemplates.newClientWelcome(newUser.email, 'Enterprise Portal', newUser.name, tempPassword).then();
  },

  updateCompanyBranding: async (companyId, branding) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateCompanyBranding(companyId, branding);
    }
    set(state => ({
      companies: state.companies.map(c => c.id === companyId ? { ...c, branding: { ...c.branding, ...branding } } : c)
    }));
  },

  updateCompanySettings: async (companyId, settings: Partial<Company>) => {
    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
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

    if (get().isSupabaseConnected) {
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
      createdAt
    };
    if (imageUrl) newMessage.imageUrl = imageUrl;

    if (get().isSupabaseConnected) {
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
    const { isSupabaseConnected } = get();
    if (isSupabaseConnected) {
      const newEmp = await SupabaseService.addEmployee(employee);
      set(state => ({ employees: [...state.employees, newEmp] }));
    } else {
      const newEmployee: Employee = { ...employee, id: generateUUID() };
      set(state => ({ employees: [...state.employees, newEmployee] }));
    }
    get().addAlert({ message: `Employee ${employee.name} added.`, type: 'success' });
  },

  updateEmployee: async (id, updates) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateEmployee(id, updates);
    }
    set(state => ({
      employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  },

  deleteEmployee: async (id) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteEmployee(id);
    }
    set(state => ({ employees: state.employees.filter(e => e.id !== id) }));
  },

  submitWorkReport: async (report, file) => {
    let finalImageUrl = report.imageUrl || '';

    // 1. Handle File Upload if present
    if (file && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_')) {
      try {
        const path = `work-reports/${generateUUID()}-${file.name}`;
        finalImageUrl = await SupabaseService.uploadFile('work-reports', path, file);
      } catch (e) {
        console.error('File upload failed:', e);
        get().addAlert({ message: 'Evidence upload failed. Proceeding with metadata only.', type: 'warning' });
      }
    }

    const now = new Date().toISOString();
    const newReport: WorkReport = {
      ...report,
      id: generateUUID(),
      createdAt: now,
      timestamp: now,
      status: 'pending',
      imageUrl: finalImageUrl
    };

    // 2. Optimistic Local Update
    set(state => ({ workReports: [newReport, ...state.workReports] }));
    get().addAlert({ message: 'Work report logged locally.', type: 'info' });

    // 3. Background Sync
    if (get().isSupabaseConnected) {
      try {
        await SupabaseService.submitWorkReport(newReport);
        get().addAlert({ message: 'Work report synchronized with cloud.', type: 'success' });
      } catch (e) {
        console.error('Supabase Sync Failed [WorkReport]:', e);
        get().addAlert({ message: 'Sync failed. Data stored in local cache.', type: 'error' });
      }
    }
  },
  approveWorkReport: async (reportId, supervisorId) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateWorkReport(reportId, { status: 'approved', approvedBy: supervisorId });
    }
    set(state => ({
      workReports: state.workReports.map(r => 
        r.id === reportId ? { ...r, status: 'approved', approvedBy: supervisorId } : r
      )
    }));
    get().addAlert({ message: 'Report Approved.', type: 'success' });
  },
  rejectWorkReport: async (reportId, supervisorId) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateWorkReport(reportId, { status: 'rejected', approvedBy: supervisorId });
    }
    set(state => ({
      workReports: state.workReports.map(r => 
        r.id === reportId ? { ...r, status: 'rejected', approvedBy: supervisorId } : r
      )
    }));
    get().addAlert({ message: 'Report Rejected.', type: 'info' });
  },

  submitAttendance: async (record, isBase64) => {
    return get().recordAttendance(record, isBase64);
  },

  recordAttendance: async (record, isBase64) => {
    const { employeeId, locationId, photoUrl, checkOut, type, latitude, longitude, metadata } = record;
    const isOut = !!checkOut || type === 'out';
    const matchScore = metadata?.faceMatchScore || 100;
    const timestamp = new Date().toISOString();
    let finalImageUrl = photoUrl;

    // Hardening Section: Convert Base64 identity captures to persistent Storage Blobs
    if (isBase64 && photoUrl.startsWith('data:') && get().isSupabaseConnected) {
      try {
        const blob = SupabaseService.base64ToBlob(photoUrl);
        const path = `attendance/${employeeId}-${Date.now()}.jpg`;
        finalImageUrl = await SupabaseService.uploadFile('attendance', path, blob);
      } catch {
        get().addAlert({ message: 'Identity photo persistence failed. Manual verification required.', type: 'error' });
      }
    }

    if (isOut) {
      const activeRecord = get().attendanceRecords.find(r => r.employeeId === employeeId && !r.checkOut);
      if (activeRecord) {
        const updated = {
          ...activeRecord,
          checkOut: checkOut || timestamp,
          type: 'out',
          photoUrl: finalImageUrl,
          latitude,
          longitude,
          status: matchScore >= 90 ? 'verified' : 'pending',
          metadata: { ...activeRecord.metadata, ...metadata }
        } as AttendanceRecord;
        
        set(state => ({
          attendanceRecords: state.attendanceRecords.map(r => r.id === activeRecord.id ? updated : r)
        }));

        if (get().isSupabaseConnected) {
          SupabaseService.updateAttendanceRecord(activeRecord.id, updated).catch(e => {
            console.error('Attendance Sync Failed [Out]:', e);
            get().addAlert({ message: 'Offline: Attendance sync deferred.', type: 'warning' });
          });
        }
      }
    } else {
      const now = new Date().toISOString();
      const newRecord: AttendanceRecord = {
        id: generateUUID(),
        employeeId,
        locationId,
        photoUrl: finalImageUrl,
        type: 'in',
        latitude,
        longitude,
        timestamp: now,
        checkIn: now,
        status: matchScore >= 90 ? 'verified' : 'pending',
        metadata: metadata || {}
      };
      
      set(state => ({ attendanceRecords: [...state.attendanceRecords, newRecord] }));

      if (get().isSupabaseConnected) {
        SupabaseService.submitAttendance(newRecord).catch(e => {
          console.error('Attendance Sync Failed [In]:', e);
          get().addAlert({ message: 'Offline: Attendance sync deferred.', type: 'warning' });
        });
      }
    }

    get().addAlert({ 
      message: isOut ? 'Secure Check-out Logged.' : 'Secure Check-in Verified.', 
      type: 'success' 
    });
  },

  // Phase 49 Actions
  generateLocationQR: async (locationId) => {
    const token = generateUUID();
    if (get().isSupabaseConnected) {
      await SupabaseService.updateLocation(locationId, { qrToken: token, qrStatus: 'active' });
    }
    set(state => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, qrToken: token, qrStatus: 'active' } : loc
      )
    }));
    get().addAlert({ message: 'Secure Site QR code generated.', type: 'success' });
  },

  rotateLocationToken: async (locationId) => {
    const token = generateUUID();
    if (get().isSupabaseConnected) {
      await SupabaseService.updateLocation(locationId, { qrToken: token, qrStatus: 'active' });
    }
    set(state => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, qrToken: token, qrStatus: 'active' } : loc
      )
    }));
  },

  updateLocationCoordinates: async (locationId, latitude, longitude) => {
    if (get().isSupabaseConnected) {
       await SupabaseService.updateLocation(locationId, { latitude, longitude });
    }
    set(state => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, latitude, longitude } : loc
      )
    }));
    get().addAlert({ message: 'Site telemetry coordinates locked.', type: 'info' });
  },

  updateAttendanceTag: async (recordId: string, tag: string) => {
    if (get().isSupabaseConnected) {
      const record = get().attendanceRecords.find(r => r.id === recordId);
      if (record) {
        await SupabaseService.updateAttendanceRecord(recordId, { metadata: { ...record.metadata, workTag: tag } });
      }
    }
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => 
        r.id === recordId ? { ...r, metadata: { ...r.metadata, workTag: tag } } : r
      )
    }));
  },

  approveAttendance: async (id: string) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateAttendanceRecord(id, { status: 'verified', adminRemarks: 'Biometrically Authenticated' });
    }
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => 
        r.id === id ? { ...r, status: 'verified', adminRemarks: 'Biometrically Authenticated' } : r
      )
    }));
    get().addAlert({ message: 'Attendance trace cryptographically verified.', type: 'success' });
  },

  flagAttendance: async (id: string, reason: string) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateAttendanceRecord(id, { status: 'flagged', adminRemarks: reason });
    }
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
    const today = new Date().toISOString().split('T')[0];
    const submissionDate = get().submittedChecklists[employeeId];
    if (submissionDate && submissionDate.startsWith(today)) {
      get().addAlert({ message: 'Cannot modify a submitted checklist.', type: 'warning' });
      return;
    }

    set((state) => ({
      dailyTaskProgress: {
        ...state.dailyTaskProgress,
        [employeeId]: tasks
      }
    }));
  },

  submitDailyChecklist: async (employeeId) => {
    const today = new Date().toISOString();
    const completedTasks = get().dailyTaskProgress[employeeId] || [];
    
    set(state => ({
      submittedChecklists: {
        ...state.submittedChecklists,
        [employeeId]: today
      }
    }));

    if (get().isSupabaseConnected) {
      try {
        await SupabaseService.submitDailyChecklist(employeeId, completedTasks);
      } catch (e) {
        console.error('Failed to sync checklist to Supabase:', e);
      }
    }

    get().addAlert({ message: 'Daily Operations Checklist Submitted Successfully!', type: 'success' });
  },

  reassignShift: async (shiftId, locationId) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.updateShift(shiftId, { locationId });
    }
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
    if (get().isSupabaseConnected) {
       const newShift = await SupabaseService.addShift(shift);
       set(state => ({
         employeeShifts: [...state.employeeShifts, newShift as EmployeeShift]
       }));
    } else {
      const newShift = { ...shift, id: generateUUID() };
      set(state => ({
        employeeShifts: [...state.employeeShifts, newShift as EmployeeShift]
      }));
    }
    get().addAlert({ message: 'New shift successfully charted.', type: 'success' });
  },

  deleteEmployeeShift: async (shiftId) => {
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteShift(shiftId);
    }
    set(state => ({
      employeeShifts: state.employeeShifts.filter(s => s.id !== shiftId)
    }));
    get().addAlert({ message: 'Shift operation cancelled.', type: 'warning' });
  },

  
  addCustomRole: async (role) => {
    const newRole = { ...role, id: generateUUID() };
    set(state => ({ customRoles: [...state.customRoles, newRole] }));
    if (get().isSupabaseConnected) {
      await SupabaseService.addCustomRole(newRole);
    }
    get().addAlert({ message: `Role ${newRole.name} established.`, type: 'success' });
  },
  
  updateCustomRole: async (id, updates) => {
    set(state => ({
      customRoles: state.customRoles.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    if (get().isSupabaseConnected) {
      await SupabaseService.updateCustomRole(id, updates);
    }
    get().addAlert({ message: 'Role configurations updated.', type: 'info' });
  },
  
  deleteCustomRole: async (id) => {
    set(state => ({
      customRoles: state.customRoles.filter(r => r.id !== id)
    }));
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteCustomRole(id);
    }
    get().addAlert({ message: 'Role permanently decommissioned.', type: 'warning' });
  },
  
  addWorkAssignment: async (assignment) => {
    const newAssignment = { ...assignment, id: generateUUID(), createdAt: new Date().toISOString() };
    set(state => ({ workAssignments: [...state.workAssignments, newAssignment] }));
    if (get().isSupabaseConnected) {
      await SupabaseService.addWorkAssignment(newAssignment);
    }
    get().addAlert({ message: 'New work assignment deployed.', type: 'success' });
  },
  
  updateWorkAssignment: async (id, updates) => {
    set(state => ({
      workAssignments: state.workAssignments.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
    if (get().isSupabaseConnected) {
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
    if (get().isSupabaseConnected) {
      await SupabaseService.updateWorkAssignment(id, { status: 'archived' });
    }
    get().addAlert({ message: 'Work assignment recalled and archived.', type: 'warning' });
  },

  addSiteProtocol: async (protocol) => {
    const newProtocol = { ...protocol, id: generateUUID() };
    set(state => ({ siteProtocols: [...state.siteProtocols, newProtocol] }));
    if (get().isSupabaseConnected) {
      await SupabaseService.addSiteProtocol(newProtocol);
    }
    get().addAlert({ message: 'Site protocol successfully codified.', type: 'success' });
  },
  deleteSiteProtocol: async (id) => {
    set(state => ({
      siteProtocols: state.siteProtocols.filter(p => p.id !== id)
    }));
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteSiteProtocol(id);
    }
    get().addAlert({ message: 'Site protocol decommissioned.', type: 'warning' });
  },

  submitTimeOffRequest: async (request) => {
    const newReq = { ...request, id: generateUUID(), status: 'pending', createdAt: new Date().toISOString() };
    set(state => ({ timeOffRequests: [newReq as TimeOffRequest, ...state.timeOffRequests] }));
    if (get().isSupabaseConnected) {
      await SupabaseService.submitTimeOffRequest(newReq);
    }
    get().addAlert({ message: 'Absence request submitted for HR authorization.', type: 'info' });
  },
  updateTimeOffStatus: async (id, status, adminRemarks) => {
    set(state => ({
      timeOffRequests: state.timeOffRequests.map(r => r.id === id ? { ...r, status, adminRemarks } : r)
    }));
    if (get().isSupabaseConnected) {
      await SupabaseService.updateTimeOffStatus(id, { status, adminRemarks });
    }
    get().addAlert({ message: `Absence request ${status.toUpperCase()}.`, type: 'success' });
  },
  updateAttendanceRecord: async (id, updates) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    if (get().isSupabaseConnected) {
      await SupabaseService.updateAttendanceRecord(id, updates);
    }
    get().addAlert({ message: 'Punch register heavily modified.', type: 'warning' });
  },
  deleteAttendanceRecord: async (id) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.filter(r => r.id !== id)
    }));
    if (get().isSupabaseConnected) {
      await SupabaseService.deleteAttendanceRecord(id);
    }
    get().addAlert({ message: 'Timesheet log violently expunged from database.', type: 'error' });
  },
  createManualTimesheet: async (record) => {
    const newRecord = { ...record, id: generateUUID(), createdAt: new Date().toISOString() };
    set(state => ({ attendanceRecords: [newRecord as AttendanceRecord, ...state.attendanceRecords] }));
    if (get().isSupabaseConnected) {
      await SupabaseService.submitAttendance(newRecord);
    }
    get().addAlert({ message: 'Supervisor-originated manual shift shift entry accepted.', type: 'info' });
  }
}),
    {
      name: 'pyramid-fm-nexus-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // We exclude volatile runtime states like connection flags and active toasts
        const { isSupabaseConnected: _, alerts: __, ...rest } = state;
        return rest;
      },
    }
  )
);

