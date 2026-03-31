import { supabase } from './supabase';
import { snakeToCamel, camelToSnake } from './supabaseUtils';
import type { Product, Order, Company, InventoryItem, User } from '../types';

/**
 * SUPABASE SERVICE
 * Native integration for PostgreSQL operations via PostgREST.
 */
export const SupabaseService = {
  // --- AUTH ---
  async checkConnection() {
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      return !error;
    } catch (_e) {
      return false;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      return profile ? snakeToCamel(profile) : null;
    } catch (_e) {
      return null;
    }
  },

  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  // --- PRODUCTS ---
  async getProducts() {
    const { data, error } = await supabase.from('products').select('*').eq('active', true);
    if (error) throw error;
    return snakeToCamel(data || []) as Product[];
  },

  async addProduct(product: Omit<Product, 'id'>) {
    const { data } = await supabase.from('products').insert(camelToSnake(product)).select().single();
    return snakeToCamel(data) as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const { data } = await supabase.from('products').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data) as Product;
  },

  async deleteProduct(id: string) {
    await supabase.from('products').delete().eq('id', id);
  },

  // --- COMPANIES ---
  async getCompanies() {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;
    return snakeToCamel(data || []) as Company[];
  },

  async addCompany(company: Omit<Company, 'id'>) {
    const { data } = await supabase.from('companies').insert(camelToSnake(company)).select().single();
    return snakeToCamel(data) as Company;
  },

  async updateCompany(id: string, updates: Partial<Company>) {
    const { data } = await supabase.from('companies').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data) as Company;
  },

  async deleteCompany(id: string) {
    await supabase.from('companies').delete().eq('id', id);
  },

  // --- LOCATIONS ---
  async getLocations(companyId?: string) {
    let query = supabase.from('locations').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async addLocation(location: any) {
    const { data } = await supabase.from('locations').insert(camelToSnake(location)).select().single();
    return snakeToCamel(data);
  },

  async updateLocation(id: string, updates: any) {
    const { data } = await supabase.from('locations').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data);
  },

  async deleteLocation(id: string) {
    await supabase.from('locations').delete().eq('id', id);
  },

  // --- ORDERS ---
  async getOrders(companyId?: string) {
    let query = supabase.from('orders').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data || []) as Order[];
  },

  async placeOrder(order: any) {
    const { data } = await supabase.from('orders').insert(camelToSnake(order)).select().single();
    return snakeToCamel(data) as Order;
  },

  async updateOrderStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId);
  },

  // --- INVENTORY ---
  async getInventory() {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) throw error;
    return snakeToCamel(data || []) as InventoryItem[];
  },

  async updateStock(productId: string, warehouseId: string, quantity: number) {
    await supabase.from('inventory').update({ quantity }).match({ product_id: productId, warehouse_id: warehouseId });
  },

  // --- CONTRACTS ---
  async getContracts(companyId?: string) {
    let query = supabase.from('contracts').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    return snakeToCamel(data || []);
  },

  async addContract(contract: any) {
    const { data } = await supabase.from('contracts').insert(camelToSnake(contract)).select().single();
    return snakeToCamel(data);
  },

  async updateContract(id: string, updates: any) {
    const { data } = await supabase.from('contracts').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data);
  },

  async deleteContract(id: string) {
    await supabase.from('contracts').delete().eq('id', id);
  },

  // --- SUPPORT ---
  async getTickets(companyId?: string) {
    let query = supabase.from('tickets').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    return snakeToCamel(data || []);
  },

  async createTicket(ticket: any) {
    const { data } = await supabase.from('tickets').insert(camelToSnake(ticket)).select().single();
    return snakeToCamel(data);
  },

  async updateTicketStatus(id: string, updates: any) {
    const { data } = await supabase.from('tickets').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data);
  },

  async addTicketMessage(message: any) {
    const { data } = await supabase.from('ticket_messages').insert(camelToSnake(message)).select().single();
    return snakeToCamel(data);
  },

  // --- AUDIT & EXCEPTIONS ---
  async logAction(action: string, details: any) {
    await supabase.from('audit_logs').insert({ action, details });
  },

  async reportException(exception: any) {
    await supabase.from('exceptions').insert(camelToSnake(exception));
  },

  async resolveException(id: string) {
    await supabase.from('exceptions').update({ resolved_at: new Date().toISOString() }).eq('id', id);
  },

  async getExceptions() {
    const { data } = await supabase.from('exceptions').select('*');
    return snakeToCamel(data || []);
  },

  // --- FRAUD ---
  async flagFraud(flag: any) {
    await supabase.from('fraud_flags').insert(camelToSnake(flag));
  },

  async updateFraudStatus(id: string, status: string) {
    await supabase.from('fraud_flags').update({ status }).eq('id', id);
  },

  async getFraudFlags() {
    const { data } = await supabase.from('fraud_flags').select('*');
    return snakeToCamel(data || []);
  },

  // --- COMPLIANCE ---
  async addComplianceDoc(doc: any) {
    await supabase.from('compliance_docs').insert(camelToSnake(doc));
  },

  async deleteComplianceDoc(id: string) {
    await supabase.from('compliance_docs').delete().eq('id', id);
  },

  async getComplianceDocs(companyId?: string) {
    let query = supabase.from('compliance_docs').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    return snakeToCamel(data || []);
  },

  // --- FINANCE ---
  async updateOrdersPaid(orderIds: string[], isPaid: boolean) {
    await supabase.from('orders').update({ is_paid: isPaid }).in('id', orderIds);
  },

  async updateCompanyCredit(companyId: string, amountDelta: number) {
    await supabase.rpc('update_company_credit', { company_id: companyId, delta: amountDelta });
  },

  async markOrdersTallyExported(orderIds: string[]) {
    await supabase.from('orders').update({ tally_exported: true }).in('id', orderIds);
  },

  // --- USERS ---
  async addUser(user: any) {
    const { data } = await supabase.from('users').insert(camelToSnake(user)).select().single();
    return snakeToCamel(data);
  },

  async bulkAddUsers(users: any[]) {
    return supabase.from('users').insert(users.map(u => camelToSnake(u)));
  },

  async updateUser(id: string, updates: any) {
    const { data } = await supabase.from('users').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data);
  },

  async deleteUser(id: string) {
    await supabase.from('users').delete().eq('id', id);
  },

  async updateUserFaceImage(userId: string, imageUrl: string) {
    await supabase.from('users').update({ face_image_url: imageUrl }).eq('id', userId);
  },

  // --- EMPLOYEES & WORKFORCE ---
  async getEmployees() {
    const { data } = await supabase.from('employees').select('*');
    return snakeToCamel(data || []);
  },

  async addEmployee(employee: any) {
    const { data } = await supabase.from('employees').insert(camelToSnake(employee)).select().single();
    return snakeToCamel(data);
  },

  async updateEmployee(id: string, updates: any) {
    const { data } = await supabase.from('employees').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data);
  },

  async deleteEmployee(id: string) {
    await supabase.from('employees').delete().eq('id', id);
  },

  // --- BUNDLES ---
  async getProductBundles() {
    const { data } = await supabase.from('product_bundles').select('*');
    return snakeToCamel(data || []);
  },

  async addProductBundle(bundle: any) {
    const { data } = await supabase.from('product_bundles').insert(camelToSnake(bundle)).select().single();
    return snakeToCamel(data);
  },

  async updateProductBundle(id: string, updates: any) {
    const { data } = await supabase.from('product_bundles').update(camelToSnake(updates)).eq('id', id).select().single();
    return snakeToCamel(data);
  },

  async deleteProductBundle(id: string) {
    await supabase.from('product_bundles').delete().eq('id', id);
  },

  // --- RETURNS ---
  async createReturnRequest(req: any) {
    const { data } = await supabase.from('return_requests').insert(camelToSnake(req)).select().single();
    return snakeToCamel(data);
  },

  async updateReturnStatus(id: string, status: string) {
    await supabase.from('return_requests').update({ status }).eq('id', id);
  },

  // --- FIELD OPS ---
  async getIncidents() {
    const { data, error } = await supabase.from('field_incidents').select('*');
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async submitIncident(incident: any) {
    await supabase.from('field_incidents').insert(camelToSnake(incident));
  },

  async updateIncidentStatus(id: string, updates: any) {
    await supabase.from('field_incidents').update(camelToSnake(updates)).eq('id', id);
  },

  async getWorkReports() {
    const { data, error } = await supabase.from('work_reports').select('*');
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async submitWorkReport(report: any) {
    await supabase.from('work_reports').insert(camelToSnake(report));
  },

  async getAttendance(locationId?: string) {
    let query = supabase.from('attendance_records').select('*');
    if (locationId) query = query.eq('location_id', locationId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async submitAttendance(record: any) {
    await supabase.from('attendance_records').insert(camelToSnake(record));
  },

  async submitDailyChecklist(employeeId: string, completedTasks: string[]) {
    await supabase.from('daily_checklists').insert({ employee_id: employeeId, completed_tasks: completedTasks });
  },

  async updateAttendanceRecord(id: string, updates: any) {
    await supabase.from('attendance_records').update(camelToSnake(updates)).eq('id', id);
  },

  async deleteAttendanceRecord(id: string) {
    await supabase.from('attendance_records').delete().eq('id', id);
  },

  // --- TIME OFF ---
  async getTimeOffRequests() {
    const { data } = await supabase.from('time_off_requests').select('*');
    return snakeToCamel(data || []);
  },

  async submitTimeOffRequest(request: any) {
    await supabase.from('time_off_requests').insert(camelToSnake(request));
  },

  async updateTimeOffStatus(id: string, updates: any) {
    await supabase.from('time_off_requests').update(camelToSnake(updates)).eq('id', id);
  },

  // --- PROTOCOLS ---
  async getSiteProtocols() {
    const { data } = await supabase.from('site_protocols').select('*');
    return snakeToCamel(data || []);
  },

  async addSiteProtocol(protocol: any) {
    const { data } = await supabase.from('site_protocols').insert(camelToSnake(protocol)).select().single();
    return snakeToCamel(data);
  },

  async deleteSiteProtocol(id: string) {
    await supabase.from('site_protocols').delete().eq('id', id);
  },

  // --- ROLES & ASSIGNMENTS ---
  async getCustomRoles() {
    const { data } = await supabase.from('custom_roles').select('*');
    return snakeToCamel(data || []);
  },

  async addCustomRole(role: any) {
    await supabase.from('custom_roles').insert(camelToSnake(role));
  },

  async updateCustomRole(id: string, updates: any) {
    await supabase.from('custom_roles').update(camelToSnake(updates)).eq('id', id);
  },

  async deleteCustomRole(id: string) {
    await supabase.from('custom_roles').delete().eq('id', id);
  },

  async getWorkAssignments() {
    const { data } = await supabase.from('work_assignments').select('*');
    return snakeToCamel(data || []);
  },

  async addWorkAssignment(assignment: any) {
    await supabase.from('work_assignments').insert(camelToSnake(assignment));
  },

  async updateWorkAssignment(id: string, updates: any) {
    await supabase.from('work_assignments').update(camelToSnake(updates)).eq('id', id);
  },

  async deleteWorkAssignment(id: string) {
    await supabase.from('work_assignments').delete().eq('id', id);
  },

  // --- PRICING & SETTINGS ---
  async upsertClientPricing(pricing: any) {
    await supabase.from('client_pricing').upsert(camelToSnake(pricing));
  },

  async updateSettings(settings: any) {
    await supabase.from('settings').upsert(camelToSnake(settings));
  },

  async updateLocationBudget(locationId: string, budget: number) {
    await supabase.from('locations').update({ monthly_budget: budget }).eq('id', locationId);
  },

  async updateCompanyBranding(companyId: string, branding: any) {
    await supabase.from('companies').update({ branding }).eq('id', companyId);
  },

  async updateCompanySettings(companyId: string, settings: any) {
    await supabase.from('companies').update({ settings }).eq('id', companyId);
  },

  // --- QR LOGINS ---
  async addQRToken(token: any) {
    await supabase.from('qr_tokens').insert(camelToSnake(token));
  },

  async revokeQRToken(id: string) {
    await supabase.from('qr_tokens').update({ revoked: true }).eq('id', id);
  },

  async loginWithQR(token: string) {
    const { data } = await supabase.rpc('login_with_qr', { token_str: token });
    return data ? snakeToCamel(data) : null;
  },

  // --- BATCHES ---
  async addBatch(batch: any) {
    await supabase.from('batches').insert(camelToSnake(batch));
  },

  // --- WEBHOOKS ---
  async addWebhook(webhook: any) {
    await supabase.from('webhooks').insert(camelToSnake(webhook));
  },

  async updateWebhook(id: string, updates: any) {
    await supabase.from('webhooks').update(camelToSnake(updates)).eq('id', id);
  },

  async deleteWebhook(id: string) {
    await supabase.from('webhooks').delete().eq('id', id);
  },

  async toggleWebhookActive(id: string, active: boolean) {
    await supabase.from('webhooks').update({ active }).eq('id', id);
  },

  // --- STORAGE & UTILS ---
  async uploadFile(bucket: string, path: string, file: File | Blob) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  },

  base64ToBlob(base64: string, type: string = 'image/jpeg') {
    const binStr = atob(base64.split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type });
  }
};
