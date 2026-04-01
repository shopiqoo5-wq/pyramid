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
    } catch {
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
    } catch {
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
    let query = supabase.from('orders').select('*, order_items(*)');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data || []) as Order[];
  },

  async placeOrder(order: any) {
    const { items, ...orderData } = order;
    const { data: ord, error: ordErr } = await supabase.from('orders').insert(camelToSnake(orderData)).select().single();
    if (ordErr) throw ordErr;

    if (items && items.length > 0) {
      const itemsToInsert = items.map((it: any) => ({
        ...camelToSnake(it),
        order_id: ord.id
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;
    }

    return snakeToCamel({ ...ord, items }) as Order;
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
    const { error } = await supabase.from('inventory').update({ quantity }).match({ product_id: productId, warehouse_id: warehouseId });
    if (error) throw error;
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
    let query = supabase.from('tickets').select('*, ticket_messages(*)');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async createTicket(ticket: any) {
    const { messages, ...ticketData } = ticket;
    const { data: t, error } = await supabase.from('tickets').insert(camelToSnake(ticketData)).select().single();
    if (error) throw error;
    
    if (messages && messages.length > 0) {
      await supabase.from('ticket_messages').insert(
        messages.map((m: any) => ({ ...camelToSnake(m), ticket_id: t.id }))
      );
    }
    return snakeToCamel({ ...t, messages });
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
  async getAuditLogs() {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    return snakeToCamel(data || []);
  },

  async logAction(userId: string, action: string, details: any) {
    await supabase.from('audit_logs').insert({ user_id: userId, action, details });
  },

  async getInventoryLogs() {
    const { data } = await supabase.from('inventory_logs').select('*').order('timestamp', { ascending: false });
    return snakeToCamel(data || []);
  },
  
  async addInventoryLog(log: any) {
    const { error } = await supabase.from('inventory_logs').insert(camelToSnake(log));
    if (error) throw error;
  },

  async reportException(exception: any) {
    const { error } = await supabase.from('exceptions').insert(camelToSnake(exception));
    if (error) throw error;
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
    const { error } = await supabase.from('fraud_flags').insert(camelToSnake(flag));
    if (error) throw error;
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
    const { error } = await supabase.from('compliance_docs').insert(camelToSnake(doc));
    if (error) throw error;
  },

  async deleteComplianceDoc(id: string) {
    await supabase.from('compliance_docs').delete().eq('id', id);
  },

  async getComplianceDocs(companyId?: string) {
    let query = supabase.from('compliance_docs').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query.order('created_at', { ascending: false });
    return snakeToCamel(data || []);
  },

  async getNotifications(userId: string) {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return snakeToCamel(data || []);
  },

  async addNotification(notification: any) {
    const { error } = await supabase.from('notifications').insert(camelToSnake(notification));
    if (error) throw error;
  },

  async markNotificationRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
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
    const { data, error } = await supabase.from('field_incidents').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async submitIncident(incident: any) {
    const { error } = await supabase.from('field_incidents').insert(camelToSnake(incident));
    if (error) throw error;
  },

  async updateIncidentStatus(id: string, updates: any) {
    await supabase.from('field_incidents').update(camelToSnake(updates)).eq('id', id);
  },

  async getWorkReports() {
    const { data, error } = await supabase.from('work_reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async submitWorkReport(report: any) {
    const { error } = await supabase.from('work_reports').insert(camelToSnake(report));
    if (error) throw error;
  },

  async updateWorkReport(id: string, updates: any) {
    await supabase.from('work_reports').update(camelToSnake(updates)).eq('id', id);
  },

  async getAttendance(locationId?: string) {
    let query = supabase.from('attendance_records').select('*').order('timestamp', { ascending: false });
    if (locationId) query = query.eq('location_id', locationId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async submitAttendance(record: any) {
    await supabase.from('attendance_records').insert(camelToSnake(record));
  },

  async getDailyChecklists() {
    const { data } = await supabase.from('daily_checklists').select('*');
    return snakeToCamel(data || []);
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

  // --- SHIFTS ---
  async getShifts() {
    const { data } = await supabase.from('employee_shifts').select('*');
    return snakeToCamel(data || []);
  },

  async addShift(shift: any) {
    const { data } = await supabase.from('employee_shifts').insert(camelToSnake(shift)).select().single();
    return snakeToCamel(data);
  },

  async updateShift(id: string, updates: any) {
    await supabase.from('employee_shifts').update(camelToSnake(updates)).eq('id', id);
  },

  async deleteShift(id: string) {
    await supabase.from('employee_shifts').delete().eq('id', id);
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
    const { data } = await supabase.from('custom_roles').insert(camelToSnake(role)).select().single();
    return snakeToCamel(data);
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
    const { data } = await supabase.from('work_assignments').insert(camelToSnake(assignment)).select().single();
    return snakeToCamel(data);
  },

  async updateWorkAssignment(id: string, updates: any) {
    await supabase.from('work_assignments').update(camelToSnake(updates)).eq('id', id);
  },

  async deleteWorkAssignment(id: string) {
    await supabase.from('work_assignments').delete().eq('id', id);
  },

  // --- QUOTATIONS ---
  async getQuotations() {
    const { data, error } = await supabase.from('quotations').select('*, quotation_items(*)');
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async addQuotation(quotation: any) {
    const { items, ...quotData } = quotation;
    const { data: q, error: qErr } = await supabase.from('quotations').insert(camelToSnake(quotData)).select().single();
    if (qErr) throw qErr;

    if (items && items.length > 0) {
      const { error: itemsErr } = await supabase.from('quotation_items').insert(
        items.map((it: any) => ({ ...camelToSnake(it), quotation_id: q.id }))
      );
      if (itemsErr) throw itemsErr;
    }
    return snakeToCamel({ ...q, items });
  },

  async getRecurringOrders(companyId?: string) {
    let query = supabase.from('recurring_orders').select('*, recurring_order_items(*)');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async addRecurringOrder(order: any) {
    const { items, ...orderData } = order;
    const { data: ro, error } = await supabase.from('recurring_orders').insert(camelToSnake(orderData)).select().single();
    if (error) throw error;

    if (items && items.length > 0) {
      await supabase.from('recurring_order_items').insert(
        items.map((it: any) => ({ ...camelToSnake(it), recurring_order_id: ro.id }))
      );
    }
    return snakeToCamel({ ...ro, items });
  },

  async updateRecurringOrderStatus(id: string, status: string) {
    await supabase.from('recurring_orders').update({ status }).eq('id', id);
  },

  async deleteRecurringOrder(id: string) {
    await supabase.from('recurring_orders').delete().eq('id', id);
  },

  // --- PRICING & SETTINGS ---
  async getClientPricing(companyId?: string) {
    let query = supabase.from('client_pricing').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    return snakeToCamel(data || []);
  },

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

  async getWebhooks() {
    const { data } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
    return snakeToCamel(data || []);
  },

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

  // --- BATCHES ---
  async getBatches() {
    const { data } = await supabase.from('batches').select('*');
    return snakeToCamel(data || []);
  },

  async addBatch(batch: any) {
    await supabase.from('batches').insert(camelToSnake(batch));
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
  },

  // --- FAVORITES ---
  async getFavorites(companyId: string) {
    const { data, error } = await supabase.from('favorites').select('*').eq('company_id', companyId);
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async addFavorite(favorite: any) {
    const { error } = await supabase.from('favorites').insert(camelToSnake(favorite));
    if (error) throw error;
  },

  async deleteFavorite(id: string) {
    const { error } = await supabase.from('favorites').delete().eq('id', id);
    if (error) throw error;
  },

  // --- API KEYS ---
  async getAPIKeys(companyId: string) {
    const { data, error } = await supabase.from('api_keys').select('*').eq('company_id', companyId);
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async addAPIKey(key: any) {
    const { error } = await supabase.from('api_keys').insert(camelToSnake(key));
    if (error) throw error;
  },

  async deleteAPIKey(id: string) {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) throw error;
  },

  // --- PHOTO VERIFICATIONS ---
  async getPhotoVerifications() {
    const { data, error } = await supabase.from('photo_verifications').select('*');
    if (error) throw error;
    return snakeToCamel(data || []);
  },

  async addPhotoVerification(photo: any) {
    const { error } = await supabase.from('photo_verifications').insert(camelToSnake(photo));
    if (error) throw error;
  },

  async updatePhotoVerification(id: string, updates: any) {
    const { error } = await supabase.from('photo_verifications').update(camelToSnake(updates)).eq('id', id);
    if (error) throw error;
  }
};
