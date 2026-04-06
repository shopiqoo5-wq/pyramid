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
import { generateUUID } from '../lib/uuid';
import { calculateIndianGST } from '../utils/gst';
import { ApiService } from '../lib/apiService';

/** Prevents overlapping hydrations (parallel /api/data/* without token + duplicate work). */
let initSupabaseInFlight: Promise<void> | null = null;

const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

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
  toggleFavorite: (productId: string, companyId: string) => Promise<void>;
  logAction: (userId: string, action: string, details: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  
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
  createReturn: (req: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateReturnStatus: (id: string, status: ReturnRequest['status']) => Promise<void>;
  generateAPIKey: (companyId: string, permissions: APIKey['permissions']) => Promise<APIKey>;
  revokeAPIKey: (id: string) => Promise<void>;
  uploadVerificationPhoto: (photo: Partial<PhotoVerification>) => Promise<void>;

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
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
  createManualTimesheet: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;

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
  
  // Cloud Disaster Recovery
  pushLocalToCloud: () => Promise<void>;
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
      await ApiService.addQuotation(newQuotation);
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
    // 1. Always try API auth first so JWT token is available for protected routes.
    try {
      const user = await ApiService.signIn(userIdentifier, password);
      if (user) {
        set({ currentUser: user, isSupabaseConnected: true });
        get().addAlert({ message: `Access Authorized: ${user.name}`, type: 'success' });
        await get().initSupabase();
        return true;
      }
    } catch (err: any) {
      console.warn('API Auth failed, falling back to local mode:', err.message);
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
      // Local fallback mode: keep user signed in locally, disable protected API writes.
      await ApiService.signOut();
      set({ currentUser: sanitized as User, isSupabaseConnected: false });
      get().addAlert({ message: `Access Authorized: ${user.name}${isSystemAdmin ? ' (System)' : ''}`, type: 'success' });
      get().addAlert({ message: 'Running in local mode. Cloud save is disabled until API login succeeds.', type: 'warning' });
      return true;
    }
    return false;
  },
  logout: async () => {
    // In Cloud mode, we use ApiService.signOut()
    await ApiService.signOut();
    get().addAlert({ message: 'Logged out successfully.', type: 'info' });
    
    // Signed out users see restricted view, but we keep the local state 
    // to fulfill the user's request for permanent historical visibility.
    set({ 
      currentUser: null, 
      cart: [],
      // We no longer nuke history here, as the user wants logs to be permanent.
      // Hydration from Supabase on next login will refresh these.
    });
  },

  initSupabase: async () => {
    if (initSupabaseInFlight) return initSupabaseInFlight;

    initSupabaseInFlight = (async () => {
    const { addAlert } = get();

    try {
      const isReachable = await ApiService.checkConnection();
      if (!isReachable) {
        set({ isSupabaseConnected: false });
        console.warn('⚠️ Backend unreachable. Falling back to local cache.');
        addAlert({ message: 'Backend unreachable. Saving is disabled until the database is online.', type: 'error' });
        return;
      }

      console.log('⚡ Backend reachable');

      let sessionUser = null;
      try {
        sessionUser = await ApiService.getCurrentUser();
        if (sessionUser) {
          set({ currentUser: null, isSupabaseConnected: false }); // Clear stale auth
          return;
        }
        
        // Only set connectivity true after session is confirmed
        set({ isSupabaseConnected: true });
        console.log(`👤 Session restored: ${sessionUser.name}`);
      } catch (err: any) {
        console.warn('Session restore failed:', err.message || err);
        set({ currentUser: null, isSupabaseConnected: false }); // Block unauthorized data flow
        return; // Stop here: avoids 401s
      }

      addAlert({ message: 'Backend connected. Synchronization online.', type: 'success' });

      const fetchData = async <K extends keyof AppState>(
        label: string,
        fetcher: () => Promise<any>,
        setter: (data: any) => void,
        _stateKey: K,
        allowEmptyReplace = false
      ) => {
        try {
          const cloudData = await fetcher();
          if (!Array.isArray(cloudData)) return;
          if (cloudData.length > 0 || allowEmptyReplace) {
            setter(cloudData);
            if (cloudData.length > 0) console.log(`✅ Synced: ${label}`);
            else console.log(`ℹ️ Cloud ${label} empty — replaced local list from server.`);
          } else {
            console.log(`ℹ️ Cloud ${label} empty. Retaining local cache.`);
          }
        } catch (err: any) {
          console.error(`❌ Sync Failed [${label}]:`, err.message || err);
        }
      };

      // Atomic hydration sequence
      await Promise.all([
        fetchData('Products', ApiService.getProducts, (d) => set({ products: d }), 'products'),
        fetchData('Companies', ApiService.getCompanies, (d) => set({ companies: d }), 'companies'),
        fetchData('Locations', () => ApiService.getLocations(), (d) => set({ locations: d }), 'locations'),
        fetchData('Orders', () => ApiService.getOrders(), (d) => set({ orders: d }), 'orders'),
        fetchData('Inventory', ApiService.getInventory, (d) => set({ inventory: d }), 'inventory'),
        fetchData('Users', ApiService.getUsers, (d) => set({ users: d }), 'users'),
        fetchData('Attendance', () => ApiService.getAttendance(), (d) => set({ attendanceRecords: d }), 'attendanceRecords', true),
        fetchData('Work Reports', ApiService.getWorkReports, (d) => set({ workReports: d }), 'workReports', true),
        fetchData('Incidents', ApiService.getIncidents, (d) => set({ fieldIncidents: d }), 'fieldIncidents', true),
        fetchData('Time Off', ApiService.getTimeOffRequests, (d) => set({ timeOffRequests: d }), 'timeOffRequests', true),
        fetchData('Shifts', ApiService.getShifts, (d) => set({ employeeShifts: d }), 'employeeShifts'),
        fetchData('Employees', ApiService.getEmployees, (d) => set({ employees: d }), 'employees'),
        fetchData('Protocols', ApiService.getSiteProtocols, (d) => set({ siteProtocols: d }), 'siteProtocols'),
        fetchData('Assignments', ApiService.getWorkAssignments, (d) => set({ workAssignments: d }), 'workAssignments'),
        fetchData('Bundles', ApiService.getProductBundles, (d) => set({ productBundles: d }), 'productBundles'),
        fetchData('Roles', ApiService.getCustomRoles, (d) => set({ customRoles: d }), 'customRoles'),
        fetchData('Audit Logs', ApiService.getAuditLogs, (d) => set({ auditLogs: d }), 'auditLogs'),
        fetchData('Inventory Logs', ApiService.getInventoryLogs, (d) => set({ inventoryLogs: d }), 'inventoryLogs'),
        fetchData('Quotations', ApiService.getQuotations, (d) => set({ quotations: d }), 'quotations'),
        fetchData('Tickets', () => ApiService.getTickets(), (d) => set({ supportTickets: d }), 'supportTickets', true),
        fetchData('Recurring Orders', () => ApiService.getRecurringOrders(), (d) => set({ recurringOrders: d }), 'recurringOrders'),
        fetchData('Webhooks', ApiService.getWebhooks, (d) => set({ webhooks: d }), 'webhooks'),
        fetchData('Compliance Docs', () => ApiService.getComplianceDocs(), (d) => set({ complianceDocs: d }), 'complianceDocs'),
        fetchData('Fraud Flags', ApiService.getFraudFlags, (d) => set({ fraudFlags: d }), 'fraudFlags'),
        fetchData('Exceptions', ApiService.getExceptions, (d) => set({ exceptions: d }), 'exceptions'),
        fetchData('Daily Checklists', ApiService.getDailyChecklists, (d) => {
          const progress: Record<string, string[]> = {};
          const status: Record<string, string> = {};
          d.forEach((item: any) => {
            progress[item.employeeId] = item.completedTasks;
            status[item.employeeId] = item.timestamp;
          });
          set({ dailyTaskProgress: progress, submittedChecklists: status });
        }, 'submittedChecklists'),
        fetchData('Batches', ApiService.getBatches, (d) => set({ batches: d }), 'batches'),
        fetchData('Favorites', () => get().currentUser ? ApiService.getFavorites(get().currentUser!.id) : Promise.resolve([]), (d) => set({ favorites: d }), 'favorites'),
        fetchData('API Keys', () => get().currentUser?.companyId ? ApiService.getAPIKeys(get().currentUser!.companyId!) : Promise.resolve([]), (d) => set({ apiKeys: d }), 'apiKeys'),
        fetchData('Photos', ApiService.getPhotoVerifications, (d) => set({ photos: d }), 'photos'),
      ]);

      const user = get().currentUser;
      if (user) {
        await fetchData(`${user.name} Notifications`, () => ApiService.getNotifications(user.id), (d) => set({ notifications: d }), 'notifications');
      }

    } catch (err: any) {
      console.error('CRITICAL: Supabase hydration crashed:', err);
      addAlert({ message: 'Cloud sync interrupted. Running in local-only mode.', type: 'warning' });
      set({ isSupabaseConnected: false });
    }
    })();

    try {
      await initSupabaseInFlight;
    } finally {
      initSupabaseInFlight = null;
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
  createReturn: async (req) => {
    const newReturn = {
      ...req,
      id: generateUUID(),
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    if (get().isSupabaseConnected) {
      await ApiService.createReturnRequest(newReturn);
    }
    get().addAlert({ message: 'Return request submitted successfully!', type: 'success' });
    set(state => ({ returnRequests: [newReturn, ...state.returnRequests] }));
  },
  updateReturnStatus: async (id, status) => {
    const { returnRequests, isSupabaseConnected, addNotification, logAction, addAlert, companies, orders, products } = get();
    const request = returnRequests.find(r => r.id === id);
    if (!request || request.status === status) return;

    if (status === 'approved' && request.status === 'pending') {
      // 1. Process Credits
      const company = companies.find(c => c.id === request.companyId);
      const order = orders.find(o => o.customId === request.orderId);
      
      if (company && order) {
        let totalReturnVal = 0;
        request.items.forEach(retItem => {
          const orderItem = order.items.find(oi => oi.productId === retItem.productId);
          if (orderItem) {
            totalReturnVal += (orderItem.unitPrice * retItem.quantity) * (1 + (products.find(p => p.id === retItem.productId)?.gstRate || 0) / 100);
          }
        });

        set(state => ({
          companies: state.companies.map(c => 
            c.id === company.id 
              ? { ...c, availableCredit: (c.availableCredit || 0) + totalReturnVal } 
              : c
          )
        }));

        await logAction('admin', 'return_approved', `Approved return ${id}. Credited ₹${totalReturnVal.toFixed(2)} to ${company.name}`);
        
        await addNotification({
          userId: request.requestedBy,
          title: 'Return Approved',
          message: `Your return request for order ${request.orderId} was approved. ₹${totalReturnVal.toFixed(2)} has been credited back to your account.`,
          type: 'success'
        });
        addAlert({ message: `Return ${id} approved. Credit issued.`, type: 'success' });
      }

      // 2. Process Inventory (optional: only if not damaged)
      if (request.reason !== 'Damaged') {
        for (const item of request.items) {
          // Add back to default warehouse for simplicity or use the one from the order
          const warehouseId = order?.warehouseId || 'w1';
          await get().updateStock(item.productId, warehouseId, item.quantity, `Return Restock (${id})`, 'system');
        }
      }
    } else if (status === 'rejected') {
      addAlert({ message: `Return ${id} rejected.`, type: 'error' });
    }

    if (isSupabaseConnected) {
      await ApiService.updateReturnStatus(id, status);
    }

    set(state => ({
      returnRequests: state.returnRequests.map(r => r.id === id ? { ...r, status } : r)
    }));
  },
  generateAPIKey: async (companyId, permissions) => {
    const newKey = {
      id: generateUUID(),
      companyId,
      key: `sk_live_${secureToken(24)}`,
      permissions,
      createdAt: new Date().toISOString()
    };
    if (get().isSupabaseConnected) {
      await ApiService.addAPIKey(newKey);
    }
    set(state => ({ apiKeys: [...state.apiKeys, newKey] }));
    get().addAlert({ message: 'New API key generated!', type: 'success' });
    return newKey as any;
  },
  revokeAPIKey: async (id) => {
    if (get().isSupabaseConnected) {
      await ApiService.deleteAPIKey(id);
    }
    set(state => ({
      apiKeys: state.apiKeys.filter(k => k.id !== id)
    }));
    get().addAlert({ message: 'API key revoked.', type: 'info' });
  },
  uploadVerificationPhoto: async (photo: any) => {
    const newPhoto = {
      ...photo,
      id: generateUUID(),
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    if (get().isSupabaseConnected) {
      await ApiService.addPhotoVerification(newPhoto);
    }
    set(state => ({
      photos: [newPhoto as PhotoVerification, ...state.photos]
    }));
    get().addAlert({ message: 'Verification photo uploaded. Awaiting approval.', type: 'info' });
  },

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
        await ApiService.updateOrderStatus(orderId, status);
      }

    set((state) => ({
      orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
    }));
    
    const oldStatus = order.status;
    get().processInventoryMovement(orderId, oldStatus, status);
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
          await ApiService.placeOrder(newOrd);
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
        await ApiService.updateUserFaceImage(userId, imageUrl);
      }
      set(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, faceImageUrl: imageUrl } : u)
      }));
      get().logAction('admin', 'biometric_enrollment', `Registered face image for user ${userId}`);
    },

   toggleFavorite: async (productId, companyId) => {
    const existing = get().favorites.find(f => f.productId === productId && f.companyId === companyId);
    if (existing) {
      if (get().isSupabaseConnected) {
        await ApiService.deleteFavorite(existing.id);
      }
      set(state => ({ favorites: state.favorites.filter(f => f.id !== existing.id) }));
    } else {
      const newFav = { id: generateUUID(), productId, companyId, userId: get().currentUser?.id };
      if (get().isSupabaseConnected) {
        await ApiService.addFavorite(newFav);
      }
      set(state => ({
        favorites: [...state.favorites, newFav]
      }));
    }
  },

  logAction: async (userId, action, details) => {
    if (get().isSupabaseConnected) {
      await ApiService.logAction(userId, action, details);
    }
    set((state) => ({
      auditLogs: [{
        id: generateUUID(),
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
      await ApiService.addNotification(newNotif);
    }
    set((state) => ({
      notifications: [newNotif as Notification, ...state.notifications]
    }));
  },

  markNotificationAsRead: async (id) => {
    if (get().isSupabaseConnected) {
      await ApiService.markNotificationRead(id);
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
      await ApiService.addRecurringOrder(newOrder);
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
      await ApiService.updateRecurringOrderStatus(id, newStatus);
    }
    set((state) => ({
      recurringOrders: state.recurringOrders.map(r => r.id === id ? { ...r, status: newStatus } : r)
    }));
  },

  deleteRecurringOrder: async (id) => {
    if (get().isSupabaseConnected) {
      await ApiService.deleteRecurringOrder(id);
    }
    set((state) => ({
      recurringOrders: state.recurringOrders.filter(r => r.id !== id)
    }));
    get().addAlert({ message: 'Recurring mandate terminated.', type: 'warning' });
  },

  addProduct: async (productStart) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot save: database is offline.', type: 'error' });
        return;
      }
      const product = await ApiService.addProduct(productStart);
      set((state) => ({ products: [product, ...state.products] }));
      get().addAlert({ message: 'Product successfully indexed.', type: 'success' });
    } catch (err: any) {
      get().addAlert({ message: `Failed to add product: ${err.message}`, type: 'error' });
    }
  },

  updateProduct: async (id, updates) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot save: database is offline.', type: 'error' });
        return;
      }
      await ApiService.updateProduct(id, updates);
      set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, ...updates } : p) }));
      get().addAlert({ message: 'Product record updated.', type: 'info' });
    } catch (err: any) {
      get().addAlert({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  },

  deleteProduct: async (id) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot delete: database is offline.', type: 'error' });
        return;
      }
      await ApiService.deleteProduct(id);
      set((state) => ({ products: state.products.filter(p => p.id !== id) }));
      get().addAlert({ message: 'Product decommissioned from catalog.', type: 'warning' });
    } catch (err: any) {
      get().addAlert({ message: `Deletion failed: ${err.message}`, type: 'error' });
    }
  },

  addCompany: async (companyStart) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot save: database is offline.', type: 'error' });
        return;
      }
      const company = await ApiService.addCompany(companyStart);
      set((state) => ({ companies: [company, ...state.companies] }));
      get().addAlert({ message: 'Company registry finalized.', type: 'success' });
    } catch (_e: any) {
      get().addAlert({ message: `Failed to add company: ${_e.message}`, type: 'error' });
    }
  },

  updateCompany: async (id, updates) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot save: database is offline.', type: 'error' });
        return;
      }
      await ApiService.updateCompany(id, updates);
      set((state) => ({ companies: state.companies.map(c => c.id === id ? { ...c, ...updates } : c) }));
      get().addAlert({ message: 'Company governance updated.', type: 'info' });
    } catch (err: any) {
      get().addAlert({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  },

  deleteCompany: async (id) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot delete: database is offline.', type: 'error' });
        return;
      }
      await ApiService.deleteCompany(id);
      set((state) => ({ companies: state.companies.filter(c => c.id !== id) }));
      get().addAlert({ message: 'Company record expunged.', type: 'warning' });
    } catch (err: any) {
      get().addAlert({ message: `Deletion failed: ${err.message}`, type: 'error' });
    }
  },

  addUser: async (userStart) => {
    try {
      if (!get().isSupabaseConnected) {
        get().addAlert({ message: 'Cannot save: database is offline.', type: 'error' });
        return;
      }
      const { username, password, ...rest } = userStart;
      const hashedPassword = await hashPassword(password || 'pyramid123');
      const newUser = { ...rest, id: generateUUID(), username, password: hashedPassword, status: 'active' as const };
      
      await ApiService.addUser(newUser);

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
      await ApiService.addProductBundle(newBundle);
    }

    set((state) => ({ productBundles: [newBundle, ...state.productBundles] }));
  },

  updateProductBundle: async (id, updates) => {
    const { productBundles, logAction } = get();
    const bundle = productBundles.find(b => b.id === id);
    logAction('admin', 'update_bundle', `Updated bundle: ${bundle?.name || id}`);
    
    if (get().isSupabaseConnected) {
      await ApiService.updateProductBundle(id, updates);
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
      await ApiService.deleteProductBundle(id);
    }

    set((state) => ({
      productBundles: state.productBundles.filter(b => b.id !== id)
    }));
  },

  updateStock: async (productId, warehouseId, quantityDelta, reason = 'Manual Adjustment', userId, batchId) => {
    const actorId = userId || get().currentUser?.id || SYSTEM_UUID;
    const { inventory, products, isSupabaseConnected } = get();
    const inv = inventory.find(i => i.productId === productId && i.warehouseId === warehouseId);
    if (!inv) return;

    const previousQuantity = inv.quantity;
    const newQuantity = Math.max(0, previousQuantity + quantityDelta);
    const availableQuantity = (inv.availableQuantity ?? previousQuantity) + quantityDelta;
    const timestamp = new Date().toISOString();

    const newLog: InventoryLog = {
      id: generateUUID(),
      productId,
      warehouseId,
      type: quantityDelta > 0 ? 'REFILL' : 'SALE',
      change: Math.abs(quantityDelta),
      previousQuantity,
      newQuantity,
      referenceId: batchId || 'MANUAL',
      performedBy: actorId,
      createdAt: timestamp,
      notes: reason
    };

    if (isSupabaseConnected) {
      ApiService.updateStock(productId, warehouseId, newQuantity).then();
      ApiService.addInventoryLog(newLog).then();
    }

    set(state => {
      let newBatches = state.batches;
      if (batchId) {
        newBatches = state.batches.map(b => 
          b.id === batchId ? { ...b, quantity: Math.max(0, b.quantity + quantityDelta) } : b
        );
      }

      return {
        inventory: state.inventory.map(i => 
          (i.productId === productId && i.warehouseId === warehouseId) 
            ? { ...i, quantity: newQuantity, availableQuantity } 
            : i
        ),
        batches: newBatches,
        inventoryLogs: [newLog, ...state.inventoryLogs].slice(0, 1000)
      };
    });

    get().checkLowStock().then();
    const product = products.find(p => p.id === productId);
    get().logAction(actorId, 'inventory_adjustment', `Adjusted ${product?.name || productId} stock in ${warehouseId} by ${quantityDelta}. Reason: ${reason}`);

    if (newQuantity <= (inv.lowStockThreshold || 0)) {
       const adminEmail = get().settings.supportEmail || 'admin@pyramidfm.com';
       EmailTemplates.lowStockAlert(adminEmail, product?.name || productId, newQuantity, inv.lowStockThreshold || 0).then();
    }
  },

  transferStock: async (productId, fromWarehouseId, toWarehouseId, quantity) => {
    const { updateStock } = get();
    await updateStock(productId, fromWarehouseId, -quantity, `Transfer to ${toWarehouseId}`);
    await updateStock(productId, toWarehouseId, quantity, `Transfer from ${fromWarehouseId}`);
  },

  processInventoryMovement: async (orderId, fromStatus, toStatus) => {
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
           const log: any = {
             productId: inv.productId,
             warehouseId: inv.warehouseId,
             type: 'SALE' as any,
             change: -qty,
             previousQuantity,
             newQuantity: quantity,
             referenceId: order.customId,
             performedBy: SYSTEM_UUID,
             notes: `Order ${order.customId} dispatched.`
           };

           if (get().isSupabaseConnected) {
             ApiService.addInventoryLog(log).then();
           }

           state.inventoryLogs = [{
             ...log,
             id: `log-${Date.now()}-${inv.productId}`,
             createdAt: new Date().toISOString()
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
            const log: any = {
              productId: inv.productId,
              warehouseId: inv.warehouseId,
              type: 'RETURN' as any,
              change: qty,
              previousQuantity,
              newQuantity: quantity,
              referenceId: order.customId,
              performedBy: SYSTEM_UUID,
              notes: `Order ${order.customId} ${toStatus}. Stock returned.`
            };

            if (get().isSupabaseConnected) {
              ApiService.addInventoryLog(log).then();
            }

            state.inventoryLogs = [{
              ...log,
              id: generateUUID(),
              createdAt: new Date().toISOString()
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
      await ApiService.updateUser(id, updates);
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
      await ApiService.deleteUser(id);
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
      const newLoc = await ApiService.addLocation(locationStart);
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
      const newContract = await ApiService.addContract(contractStart) as Contract;
      set(state => ({ contracts: [newContract, ...state.contracts] }));
    } else {
      const newContract: Contract = { ...contractStart, id: generateUUID(), status: 'Active' };
      set(state => ({ contracts: [newContract, ...state.contracts] }));
    }
  },

  deleteLocation: async (id) => {
    if (get().isSupabaseConnected) {
      await ApiService.deleteLocation(id);
    }
    set((state) => ({
      locations: state.locations.filter(l => l.id !== id)
    }));
  },

  updateLocation: async (id, updates) => {
    if (get().isSupabaseConnected) {
      await ApiService.updateLocation(id, updates);
    }
    set((state) => ({
      locations: state.locations.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
    get().logAction('admin', 'update_location', `Updated site specifications for ${id}`);
  },

  updateContract: async (id, updates) => {
    if (get().isSupabaseConnected) {
      const updated = await ApiService.updateContract(id, updates);
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
      await ApiService.deleteContract(id);
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
      await ApiService.upsertClientPricing({
           companyId, productId, negotiatedPrice: price
      });
    }

    set({ clientPricing: newPricing });
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
      await ApiService.addBatch(newBatch);
    }
    set(state => ({ 
      batches: [newBatch, ...state.batches]
    }));
    // Also update total inventory for that product/warehouse
    await get().updateStock(newBatch.productId, newBatch.warehouseId, newBatch.quantity, 'Manual Batch Entry');
  },


  getBatchesForProduct: (productId) => {
    return get().batches.filter(b => b.productId === productId);
  },

  triggerException: async (excStart) => {
    if (get().isSupabaseConnected) {
      await ApiService.reportException(excStart);
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
      await ApiService.resolveException(id);
    }
    set(state => ({
      exceptions: state.exceptions.map(e => e.id === id ? { ...e, status: 'resolved' } : e)
    }));
  },

  flagFraud: async (flagStart) => {
    if (get().isSupabaseConnected) {
      await ApiService.flagFraud(flagStart);
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
      await ApiService.updateFraudStatus(id, status);
    }
    set(state => ({
      fraudFlags: state.fraudFlags.map(f => f.id === id ? { ...f, status } : f)
    }));
  },

  addComplianceDoc: async (docStart) => {
    if (get().isSupabaseConnected) {
      await ApiService.addComplianceDoc(docStart);
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
      await ApiService.deleteComplianceDoc(id);
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
      await ApiService.updateOrdersPaid(unpaidOrderIds, true);
    }
    
    logAction(SYSTEM_UUID, 'pay_invoices', `Corporate payment received for company ${companyId}`);
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
      await ApiService.updateOrdersPaid(orderIds, true);
      await ApiService.updateCompanyCredit(companyId, totalSettled);
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
      await ApiService.updateOrdersPaid(orderIds, true);
      for (const [companyId, amount] of Object.entries(settlementByCompany)) {
        await ApiService.updateCompanyCredit(companyId, amount);
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
      await ApiService.markOrdersTallyExported(orderIds);
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
      await ApiService.addWebhook(newWh);
    }
    set((state) => ({ webhooks: [newWh, ...state.webhooks] }));
  },

  submitIncident: async (incident, file) => {
    const stockImage =
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800';
    let finalImageUrl = '';

    if (file) {
      try {
        const path = `incidents/${generateUUID()}-${file.name}`;
        finalImageUrl = await ApiService.uploadFile('incidents', path, file, {
          maxEdge: 1600,
          jpegQuality: 0.8,
        });
      } catch (e) {
        console.error('Incident file upload failed:', e);
        get().addAlert({
          message: 'Evidence upload failed. Try a smaller photo or a new picture.',
          type: 'warning',
        });
      }
    } else {
      const u = incident.imageUrl || '';
      finalImageUrl = u.startsWith('blob:') ? '' : u;
    }

    if (file && (!finalImageUrl || finalImageUrl.startsWith('blob:'))) {
      throw new Error('Could not process the photo (too large or unreadable). Try another picture.');
    }

    if (!finalImageUrl) {
      finalImageUrl = stockImage;
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
      if (ApiService.hasAuthToken()) {
        const { id: _iid, createdAt: _ca, ...payload } = newIncident as FieldIncident & { createdAt?: string };
        const created = await ApiService.submitIncident(payload);
        const merged =
          created && typeof created === 'object'
            ? { ...newIncident, ...created, id: String((created as any).id || newIncident.id) }
            : newIncident;
        set(state => ({ fieldIncidents: [merged, ...state.fieldIncidents] }));
        get().addAlert({ message: 'Incident saved to the database.', type: 'success' });
      } else {
        set(state => ({ fieldIncidents: [newIncident, ...state.fieldIncidents] }));
        get().addAlert({
          message: 'Incident saved on this device only. Sign in to store in the database.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      console.error('Critical sync failure:', err);
      get().addAlert({ message: `Sync Failure: ${err.message}`, type: 'error' });
      throw err; // Bubbling up to component for UI handling
    }
  },

  updateIncidentStatus: async (id, status, adminRemarks) => {
    if (get().isSupabaseConnected) {
      await ApiService.updateIncidentStatus(id, { status, adminRemarks });
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
      await ApiService.updateWebhook(id, updates);
    }
    set((state) => ({ webhooks: state.webhooks.map(w => w.id === id ? { ...w, ...updates } : w) }));
  },

  deleteWebhook: async (id) => {
    const { webhooks, logAction } = get();
    const wh = webhooks.find(w => w.id === id);
    logAction('admin', 'delete_webhook', `Removed webhook: ${wh?.name || id}`);
    if (get().isSupabaseConnected) {
      await ApiService.deleteWebhook(id);
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
       await ApiService.toggleWebhookActive(id, newActive);
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
      await ApiService.updateSettings(newSettings);
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
      await ApiService.addQRToken(newToken);
    }
    set(state => ({ qrLogins: [newToken, ...state.qrLogins] }));
    get().logAction('admin', 'generate_qr', `Generated QR token for ${userId ? 'user ' + userId : 'location ' + locationId}`);
    return newToken.token;
  },

  revokeQRToken: async (id) => {
    if (get().isSupabaseConnected) {
      await ApiService.revokeQRToken(id);
    }
    set(state => ({
      qrLogins: state.qrLogins.map(t => t.id === id ? { ...t, active: false, status: 'revoked' } : t)
    }));
  },

  loginWithQR: async (token) => {
    if (get().isSupabaseConnected) {
      const user = await ApiService.loginWithQR(token);
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
      await ApiService.bulkAddUsers(newUsers.map(u => {
        const { _plainPassword: _, ...rest } = u;
        return rest;
      }));
    }
    
    set(state => ({ users: [...state.users, ...newUsers.map(u => {
      const { _plainPassword: _, ...rest } = u;
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
      await ApiService.addUser(newUser);
    }
    
    set(state => ({ users: [...state.users, sanitizeUser(newUser) as User] }));
    logAction(get().currentUser?.id || 'system', 'invite_user', `Invited ${newUser.name} to company ${companyId}`);
    addAlert({ message: `Invitation dispatched to ${newUser.email}.`, type: 'success' });
    
    // Simulate email dispatch
    EmailTemplates.newClientWelcome(newUser.email, 'Enterprise Portal', newUser.name, tempPassword).then();
  },

  updateCompanyBranding: async (companyId, branding) => {
    if (get().isSupabaseConnected) {
      await ApiService.updateCompanyBranding(companyId, branding);
    }
    set(state => ({
      companies: state.companies.map(c => c.id === companyId ? { ...c, branding: { ...c.branding, ...branding } } : c)
    }));
  },

  updateCompanySettings: async (companyId, settings: Partial<Company>) => {
    if (get().isSupabaseConnected) {
      await ApiService.updateCompanySettings(companyId, settings);
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
      await ApiService.updateOrderStatus(orderId, newStatus);
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
      await ApiService.updateLocationBudget(locationId, budget);
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
      await ApiService.createTicket(newTicket);
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
      await ApiService.updateTicketStatus(id, updatePayload);
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
      await ApiService.addTicketMessage(newMessage);
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
      const newEmp = await ApiService.addEmployee(employee);
      set(state => ({ employees: [...state.employees, newEmp] }));
    } else {
      const newEmployee: Employee = { ...employee, id: generateUUID() };
      set(state => ({ employees: [...state.employees, newEmployee] }));
    }
    get().addAlert({ message: `Employee ${employee.name} added.`, type: 'success' });
  },

  updateEmployee: async (id, updates) => {
    if (get().isSupabaseConnected) {
      await ApiService.updateData('employees', id, updates);
    }
    set(state => ({
      employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  },

  deleteEmployee: async (id) => {
    if (get().isSupabaseConnected) {
      await ApiService.deleteEmployee(id);
    }
    set(state => ({ employees: state.employees.filter(e => e.id !== id) }));
  },

  submitWorkReport: async (report, file) => {
    let finalImageUrl = report.imageUrl || '';

    // Persist file as data URL so image survives reloads (online and local modes).
    if (file) {
      try {
        const path = `work-reports/${generateUUID()}-${file.name}`;
        finalImageUrl = await ApiService.uploadFile('work-reports', path, file);
      } catch (e) {
        console.error('File upload failed:', e);
        get().addAlert({ message: 'Evidence upload failed. Proceeding with metadata only.', type: 'warning' });
      }
    }

    if (file && (!finalImageUrl || finalImageUrl.startsWith('blob:'))) {
      throw new Error('Could not process the photo (too large or unreadable). Try another picture.');
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

    if (ApiService.hasAuthToken()) {
      const { id: _cid, timestamp: _ts, ...payload } = newReport as WorkReport & { timestamp?: string };
      const created = await ApiService.submitWorkReport(payload);
      const merged =
        created && typeof created === 'object'
          ? { ...newReport, ...created, id: String((created as any).id || newReport.id) }
          : newReport;
      set(state => ({ workReports: [merged, ...state.workReports] }));
      get().addAlert({ message: 'Work report saved to the database.', type: 'success' });
      return;
    }

    set(state => ({ workReports: [newReport, ...state.workReports] }));
    get().addAlert({
      message: 'Work report saved on this device only. Sign in to persist for admin review.',
      type: 'warning',
    });
  },
  approveWorkReport: async (reportId, supervisorId) => {
    if (ApiService.hasAuthToken()) {
      await ApiService.updateWorkReport(reportId, { status: 'approved', approvedBy: supervisorId });
    }
    set(state => ({
      workReports: state.workReports.map(r => 
        r.id === reportId ? { ...r, status: 'approved', approvedBy: supervisorId } : r
      )
    }));
    get().addAlert({ message: 'Report Approved.', type: 'success' });
  },
  rejectWorkReport: async (reportId, supervisorId) => {
    if (ApiService.hasAuthToken()) {
      await ApiService.updateWorkReport(reportId, { status: 'rejected', approvedBy: supervisorId });
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

    if (isBase64 && photoUrl && photoUrl.startsWith('data:') && ApiService.hasAuthToken()) {
      try {
        const blob = ApiService.base64ToBlob(photoUrl);
        const path = `attendance/${employeeId || 'anon'}-${Date.now()}.jpg`;
        finalImageUrl = await ApiService.uploadFile('attendance', path, blob);
      } catch (err: any) {
        console.error('Storage Upload Error:', err.message || err);
        get().addAlert({ message: 'Identity photo persistence failed. Manual verification required.', type: 'error' });
      }
    }

    const latestOpenPunch = () =>
      [...get().attendanceRecords]
        .filter((r) => r.employeeId === employeeId && !r.checkOut)
        .sort(
          (a, b) =>
            new Date(b.checkIn || (b as AttendanceRecord).timestamp || 0).getTime() -
            new Date(a.checkIn || (a as AttendanceRecord).timestamp || 0).getTime()
        )[0];

    if (isOut) {
      const activeRecord = latestOpenPunch();
      if (!activeRecord) {
        get().addAlert({ message: 'No open check-in found to close out.', type: 'warning' });
        return;
      }
      const updated = {
        ...activeRecord,
        checkOut: checkOut || timestamp,
        type: 'out' as const,
        photoUrl: finalImageUrl,
        latitude,
        longitude,
        status: matchScore >= 90 ? 'verified' : 'pending',
        metadata: { ...activeRecord.metadata, ...metadata },
      } as AttendanceRecord;

      set((state) => ({
        attendanceRecords: state.attendanceRecords.map((r) => (r.id === activeRecord.id ? updated : r)),
      }));

      if (ApiService.hasAuthToken()) {
        try {
          const { id: _oid, timestamp: _ts, type: _tp, ...body } = updated as AttendanceRecord & { type?: string };
          await ApiService.updateAttendanceRecord(activeRecord.id, body);
        } catch (e: any) {
          console.error('Attendance Sync Failed [Out]:', e);
          get().addAlert({
            message: e?.message || 'Check-out could not be saved to the database.',
            type: 'error',
          });
          return;
        }
      } else {
        get().addAlert({
          message: 'Not signed in — check-out updated locally only.',
          type: 'warning',
        });
      }

      get().addAlert({ message: 'Secure Check-out Logged.', type: 'success' });
      return;
    }

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
      metadata: metadata || {},
    };

    set((state) => ({ attendanceRecords: [...state.attendanceRecords, newRecord] }));

    if (!ApiService.hasAuthToken()) {
      get().addAlert({
        message: 'Sign in to save attendance to the database for admin reports.',
        type: 'warning',
      });
      get().addAlert({ message: 'Secure Check-in Verified (this device only).', type: 'success' });
      return;
    }

    try {
      const { id: _nid, timestamp: _nts, type: _ntp, ...body } = newRecord as AttendanceRecord & { type?: string };
      const created = await ApiService.submitAttendance(body);
      const merged =
        created && typeof created === 'object'
          ? ({
              ...newRecord,
              ...created,
              id: String((created as { id?: string }).id || newRecord.id),
            } as AttendanceRecord)
          : newRecord;
      set((state) => ({
        attendanceRecords: state.attendanceRecords.map((r) => (r.id === newRecord.id ? merged : r)),
      }));
    } catch (e: any) {
      console.error('Attendance Sync Failed [In]:', e);
      set((state) => ({
        attendanceRecords: state.attendanceRecords.filter((r) => r.id !== newRecord.id),
      }));
      get().addAlert({ message: e?.message || 'Check-in could not be saved to the database.', type: 'error' });
      return;
    }

    get().addAlert({ message: 'Secure Check-in Verified.', type: 'success' });
  },

  // Phase 49 Actions
  generateLocationQR: async (locationId) => {
    const token = generateUUID();
    if (get().isSupabaseConnected) {
      await ApiService.updateLocation(locationId, { qrToken: token, qrStatus: 'active' });
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
      await ApiService.updateLocation(locationId, { qrToken: token, qrStatus: 'active' });
    }
    set(state => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, qrToken: token, qrStatus: 'active' } : loc
      )
    }));
  },

  updateLocationCoordinates: async (locationId, latitude, longitude) => {
    if (get().isSupabaseConnected) {
       await ApiService.updateLocation(locationId, { latitude, longitude });
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
        await ApiService.updateAttendanceRecord(recordId, { metadata: { ...record.metadata, workTag: tag } });
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
      await ApiService.updateAttendanceRecord(id, { status: 'verified', adminRemarks: 'Biometrically Authenticated' });
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
      await ApiService.updateAttendanceRecord(id, { status: 'flagged', adminRemarks: reason });
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
        await ApiService.submitDailyChecklist(employeeId, completedTasks);
      } catch (e) {
        console.error('Failed to sync checklist to Supabase:', e);
      }
    }

    get().addAlert({ message: 'Daily Operations Checklist Submitted Successfully!', type: 'success' });
  },

  reassignShift: async (shiftId, locationId) => {
    if (get().isSupabaseConnected) {
      await ApiService.updateShift(shiftId, { locationId });
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
       const newShift = await ApiService.addShift(shift);
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
      await ApiService.deleteShift(shiftId);
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
      await ApiService.addCustomRole(newRole);
    }
    get().addAlert({ message: `Role ${newRole.name} established.`, type: 'success' });
  },
  
  updateCustomRole: async (id, updates) => {
    set(state => ({
      customRoles: state.customRoles.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    if (get().isSupabaseConnected) {
      await ApiService.updateCustomRole(id, updates);
    }
    get().addAlert({ message: 'Role configurations updated.', type: 'info' });
  },
  
  deleteCustomRole: async (id) => {
    set(state => ({
      customRoles: state.customRoles.filter(r => r.id !== id)
    }));
    if (get().isSupabaseConnected) {
      await ApiService.deleteCustomRole(id);
    }
    get().addAlert({ message: 'Role permanently decommissioned.', type: 'warning' });
  },
  
  addWorkAssignment: async (assignment) => {
    const newAssignment = { ...assignment, id: generateUUID(), createdAt: new Date().toISOString() };
    set(state => ({ workAssignments: [...state.workAssignments, newAssignment] }));
    if (get().isSupabaseConnected) {
      await ApiService.addWorkAssignment(newAssignment);
    }
    get().addAlert({ message: 'New work assignment deployed.', type: 'success' });
  },
  
  updateWorkAssignment: async (id, updates) => {
    set(state => ({
      workAssignments: state.workAssignments.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
    if (get().isSupabaseConnected) {
      await ApiService.updateWorkAssignment(id, updates);
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
      await ApiService.updateWorkAssignment(id, { status: 'archived' });
    }
    get().addAlert({ message: 'Work assignment recalled and archived.', type: 'warning' });
  },

  addSiteProtocol: async (protocol) => {
    const newProtocol = { ...protocol, id: generateUUID() };
    set(state => ({ siteProtocols: [...state.siteProtocols, newProtocol] }));
    if (get().isSupabaseConnected) {
      await ApiService.addSiteProtocol(newProtocol);
    }
    get().addAlert({ message: 'Site protocol successfully codified.', type: 'success' });
  },
  deleteSiteProtocol: async (id) => {
    set(state => ({
      siteProtocols: state.siteProtocols.filter(p => p.id !== id)
    }));
    if (get().isSupabaseConnected) {
      await ApiService.deleteSiteProtocol(id);
    }
    get().addAlert({ message: 'Site protocol decommissioned.', type: 'warning' });
  },

  submitTimeOffRequest: async (request) => {
    const newReq = {
      ...request,
      id: generateUUID(),
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    } as TimeOffRequest;

    set((state) => ({ timeOffRequests: [newReq, ...state.timeOffRequests] }));

    if (!ApiService.hasAuthToken()) {
      get().addAlert({
        message: 'Sign in to save leave requests to the database for admin approval.',
        type: 'warning',
      });
      return;
    }

    try {
      const { id: _tid, ...body } = newReq;
      const created = await ApiService.submitTimeOffRequest(body);
      const merged =
        created && typeof created === 'object'
          ? ({ ...newReq, ...created, id: String((created as any).id || newReq.id) } as TimeOffRequest)
          : newReq;
      set((state) => ({
        timeOffRequests: state.timeOffRequests.map((r) => (r.id === newReq.id ? merged : r)),
      }));
      get().addAlert({ message: 'Absence request submitted for HR authorization.', type: 'info' });
    } catch (e: any) {
      set((state) => ({
        timeOffRequests: state.timeOffRequests.filter((r) => r.id !== newReq.id),
      }));
      get().addAlert({
        message: e?.message || 'Leave request could not be saved to the server.',
        type: 'error',
      });
    }
  },
  updateTimeOffStatus: async (id, status, adminRemarks) => {
    set(state => ({
      timeOffRequests: state.timeOffRequests.map(r => r.id === id ? { ...r, status, adminRemarks } : r)
    }));
    if (ApiService.hasAuthToken()) {
      await ApiService.updateTimeOffStatus(id, { status, adminRemarks });
    }
    get().addAlert({ message: `Absence request ${status.toUpperCase()}.`, type: 'success' });
  },
  updateAttendanceRecord: async (id, updates) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    if (get().isSupabaseConnected) {
      await ApiService.updateAttendanceRecord(id, updates);
    }
    get().addAlert({ message: 'Punch register heavily modified.', type: 'warning' });
  },
  deleteAttendanceRecord: async (id) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.filter(r => r.id !== id)
    }));
    if (get().isSupabaseConnected) {
      await ApiService.deleteAttendanceRecord(id);
    }
    get().addAlert({ message: 'Timesheet log violently expunged from database.', type: 'error' });
  },
  createManualTimesheet: async (record) => {
    const newRecord = { ...record, id: generateUUID(), createdAt: new Date().toISOString() };
    set(state => ({ attendanceRecords: [newRecord as AttendanceRecord, ...state.attendanceRecords] }));
    if (ApiService.hasAuthToken()) {
      try {
        const { id: _mid, timestamp: _mts, type: _mtp, createdAt: _mca, ...body } = newRecord as AttendanceRecord & {
          createdAt?: string;
        };
        const created = await ApiService.submitAttendance(body);
        const merged =
          created && typeof created === 'object'
            ? ({
                ...(newRecord as AttendanceRecord),
                ...created,
                id: String((created as { id?: string }).id || newRecord.id),
              } as AttendanceRecord)
            : newRecord;
        set((state) => ({
          attendanceRecords: state.attendanceRecords.map((r) => (r.id === newRecord.id ? merged : r)),
        }));
      } catch (e: any) {
        get().addAlert({ message: e?.message || 'Manual timesheet could not be saved.', type: 'error' });
      }
    }
    get().addAlert({ message: 'Supervisor-originated manual shift shift entry accepted.', type: 'info' });
  },

  pushLocalToCloud: async () => {
    const { isSupabaseConnected, addAlert, ...state } = get();
    if (!isSupabaseConnected) {
       addAlert({ message: 'Cloud link mandatory for Global Push.', type: 'error' });
       return;
    }
    
    addAlert({ message: 'Initializing Disaster Recovery: Re-seeding Cloud...', type: 'info' });
    
    try {
      // Logic for pushing all local state to Supabase
      // NOTE: This uses upsert where possible to avoid duplicates
      
      const push = async (label: string, data: any[], pushMethod: (item: any) => Promise<any>) => {
        let count = 0;
        for (const item of data) {
           try {
             await pushMethod(item);
             count++;
           } catch (e) {
             console.warn(`Partial Push Failure [${label}]:`, e);
           }
        }
        console.log(`✅ Disaster Recovery: Pushed ${count} ${label} records.`);
      };

      await push('Products', state.products, (i) => ApiService.addProduct(i));
      await push('Inventory', state.inventory, (i) => ApiService.updateStock(i.productId, i.warehouseId, i.quantity));
      await push('Orders', state.orders, (i) => ApiService.placeOrder(i));
      await push('Inventory logs', state.inventoryLogs, (i) => ApiService.addInventoryLog(i));
      await push('Attendance', state.attendanceRecords, (i) => ApiService.submitAttendance(i));
      await push('Work Reports', state.workReports, (i) => ApiService.submitWorkReport(i));
      await push('Audits', state.auditLogs, (i) => ApiService.logAction(i.userId, i.action, i.details));

      addAlert({ message: 'Global Cloud Recall successfully executed. Database synchronized.', type: 'success' });
    } catch (e: any) {
      addAlert({ message: `Push failed: ${e.message}`, type: 'error' });
    }
  }
}),
    {
      name: 'pyramid-fm-nexus-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Do not persist server-canonical lists — rehydrate was overwriting fresh API sync
        // so admin/other devices never "saw" Mongo data after reload.
        const {
          isSupabaseConnected: _c,
          alerts: _a,
          workReports: _wr,
          attendanceRecords: _att,
          timeOffRequests: _to,
          fieldIncidents: _fi,
          supportTickets: _tk,
          ...rest
        } = state;
        return rest;
      },
    }
  )
);

