import { supabase } from './supabase';
import { snakeToCamel, camelToSnake } from './supabaseUtils';
import type { Product, Order, Company, InventoryItem } from '../types';

export const SupabaseService = {
  // --- AUTH ---
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', user.id)
      .single();
    return profile ? snakeToCamel(profile) : null;
  },

  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return snakeToCamel(data) as any[];
  },

  // --- PRODUCTS ---
  async getProducts() {
    const { data, error } = await supabase.from('products').select('*').eq('active', true);
    if (error) throw error;
    return snakeToCamel(data) as Product[];
  },

  async addProduct(product: Omit<Product, 'id'>) {
    const { data, error } = await supabase.from('products').insert(camelToSnake(product)).select().single();
    if (error) throw error;
    return snakeToCamel(data) as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase.from('products').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data) as Product;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // --- COMPANIES ---
  async getCompanies() {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;
    return snakeToCamel(data) as Company[];
  },

  async addCompany(company: Omit<Company, 'id'>) {
    const { data, error } = await supabase.from('companies').insert(camelToSnake(company)).select().single();
    if (error) throw error;
    return snakeToCamel(data) as Company;
  },

  async updateCompany(id: string, updates: Partial<Company>) {
    const { data, error } = await supabase.from('companies').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data) as Company;
  },

  async deleteCompany(id: string) {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) throw error;
  },

  // --- LOCATIONS ---
  async getLocations(companyId?: string) {
    let query = supabase.from('locations').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data) as any[];
  },

  async addLocation(location: any) {
    const { data, error } = await supabase.from('locations').insert(camelToSnake(location)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async updateLocation(id: string, updates: any) {
    const { data, error } = await supabase.from('locations').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async deleteLocation(id: string) {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ORDERS ---
  async getOrders(companyId?: string) {
    let query = supabase.from('orders').select('*, order_items(*, product:products(*))');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data) as Order[];
  },

  async placeOrder(order: any) {
    // 1. Insert Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(camelToSnake({
        ...order,
        items: undefined // items go to order_items
      }))
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert Order Items
    const items = order.items.map((item: any) => camelToSnake({
      ...item,
      orderId: orderData.id
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(items);
    if (itemsError) throw itemsError;

    return snakeToCamel(orderData) as Order;
  },

  async updateOrderStatus(orderId: string, status: string) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) throw error;
  },

  // --- INVENTORY ---
  async getInventory() {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) throw error;
    return snakeToCamel(data) as InventoryItem[];
  },

  async updateStock(productId: string, warehouseId: string, quantity: number) {
    const { error } = await supabase.rpc('increment_inventory', { 
      p_id: productId, 
      w_id: warehouseId, 
      delta: quantity 
    });
    if (error) throw error;
  },

  // --- CONTRACTS ---
  async getContracts(companyId?: string) {
    let query = supabase.from('contracts').select('*');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data);
  },

  async addContract(contract: any) {
    const { data, error } = await supabase.from('contracts').insert(camelToSnake(contract)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async updateContract(id: string, updates: any) {
    const { data, error } = await supabase.from('contracts').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async deleteContract(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
  },

  // --- SUPPORT ---
  async getTickets(companyId?: string) {
    let query = supabase.from('support_tickets').select('*, messages:ticket_messages(*)');
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data);
  },

  async createTicket(ticket: any) {
    const { data, error } = await supabase.from('support_tickets').insert(camelToSnake(ticket)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  // --- AUDIT & EXCEPTIONS ---
  async logAction(action: string, details: any) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action,
      details
    });
  },

  async reportException(exception: any) {
    await supabase.from('app_exceptions').insert(camelToSnake(exception));
  },

  async resolveException(id: string) {
    await supabase.from('app_exceptions').update({ status: 'resolved' }).eq('id', id);
  },

  async getExceptions() {
    const { data, error } = await supabase.from('app_exceptions').select('*');
    if (error) throw error;
    return snakeToCamel(data);
  },

  // --- FRAUD ---
  async flagFraud(flag: any) {
    await supabase.from('fraud_flags').insert(camelToSnake(flag));
  },

  async updateFraudStatus(id: string, status: string) {
    await supabase.from('fraud_flags').update({ status }).eq('id', id);
  },

  async getFraudFlags() {
    const { data, error } = await supabase.from('fraud_flags').select('*');
    if (error) throw error;
    return snakeToCamel(data);
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
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data);
  },

  // --- FINANCE ---
  async updateOrdersPaid(orderIds: string[], isPaid: boolean) {
    await supabase.from('orders').update({ is_paid: isPaid }).in('id', orderIds);
  },

  async updateCompanyCredit(companyId: string, amountDelta: number) {
    const { data: company } = await supabase.from('companies').select('available_credit').eq('id', companyId).single();
    if (company) {
      await supabase.from('companies').update({ 
        available_credit: Number(company.available_credit) + amountDelta 
      }).eq('id', companyId);
    }
  },

  async markOrdersTallyExported(orderIds: string[]) {
    await supabase.from('orders').update({ tally_exported: true }).in('id', orderIds);
  },

  // --- USERS ---
  async addUser(user: any) {
    const { data, error } = await supabase.from('users').insert(camelToSnake(user)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async bulkAddUsers(users: any[]) {
    const { data, error } = await supabase.from('users').insert(users.map(u => camelToSnake(u)));
    if (error) throw error;
    return data;
  },

  // --- TICKETS ---
  async updateTicketStatus(id: string, updates: any) {
    const { data, error } = await supabase.from('support_tickets').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async addTicketMessage(message: any) {
    const { data, error } = await supabase.from('ticket_messages').insert(camelToSnake(message)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  // --- CORPORATE GOVERNANCE ---
  async updateLocationBudget(locationId: string, budget: number) {
    await supabase.from('locations').update({ monthly_budget: budget }).eq('id', locationId);
  },

  async updateCompanyBranding(companyId: string, branding: any) {
    await supabase.from('companies').update({ branding: camelToSnake(branding) }).eq('id', companyId);
  },

  async updateCompanySettings(companyId: string, settings: any) {
    await supabase.from('companies').update(camelToSnake(settings)).eq('id', companyId);
  },

  async getEmployees() {
    const { data, error } = await supabase.from('employees').select('*, company:companies(*), user:users(*)');
    if (error) throw error;
    return snakeToCamel(data) as any[];
  },

  async getProductBundles() {
    const { data, error } = await supabase.from('product_bundles').select('*, items:bundle_items(*, product:products(*))');
    if (error) throw error;
    return snakeToCamel(data);
  },

  // --- BUNDLES ---
  async addProductBundle(bundle: any) {
    const { items, ...bundleData } = bundle;
    const { data, error } = await supabase.from('product_bundles').insert(camelToSnake(bundleData)).select().single();
    if (error) throw error;
    
    if (items && items.length > 0) {
      const dbItems = items.map((item: any) => camelToSnake({ ...item, bundleId: data.id }));
      await supabase.from('bundle_items').insert(dbItems);
    }
    return snakeToCamel(data);
  },

  async updateProductBundle(id: string, updates: any) {
    const { data, error } = await supabase.from('product_bundles').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async deleteProductBundle(id: string) {
    const { error } = await supabase.from('product_bundles').delete().eq('id', id);
    if (error) throw error;
  },

  // --- RETURNS ---
  async createReturnRequest(req: any) {
    const { data, error } = await supabase.from('return_requests').insert(camelToSnake(req)).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  async updateReturnStatus(id: string, status: string) {
    const { error } = await supabase.from('return_requests').update({ status }).eq('id', id);
    if (error) throw error;
  },

  // --- BIOMETRICS ---
  async updateUserFaceImage(userId: string, imageUrl: string) {
    const { error } = await supabase.from('users').update({ face_image_url: imageUrl }).eq('id', userId);
    if (error) throw error;
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  async updateSettings(settings: any) {
    const { error } = await supabase.from('global_settings').upsert({ id: 'system', ...camelToSnake(settings) });
    if (error) throw error;
  },

  async addQRToken(token: any) {
    const { error } = await supabase.from('qr_logins').insert(camelToSnake(token));
    if (error) throw error;
  },

  async revokeQRToken(id: string) {
    const { error } = await supabase.from('qr_logins').update({ active: false, status: 'revoked' }).eq('id', id);
    if (error) throw error;
  },

  async loginWithQR(token: string) {
    const { data, error } = await supabase.from('qr_logins')
      .select('*')
      .eq('token', token)
      .eq('active', true)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (data && !error) {
      const { data: user } = await supabase.from('users').select('*').eq('id', data.user_id).single();
      return user ? snakeToCamel(user) : null;
    }
    return null;
  },

  async updateUser(id: string, updates: any) {
    const { data, error } = await supabase.from('users').update(camelToSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return snakeToCamel(data);
  },

  // --- PRICING ---
  async upsertClientPricing(pricing: any) {
    const { error } = await supabase.from('client_pricing').upsert(camelToSnake(pricing), { onConflict: 'company_id,product_id' });
    if (error) throw error;
  },

  // --- BATCHES ---
  async addBatch(batch: any) {
    const { error } = await supabase.from('batches').insert(camelToSnake(batch));
    if (error) throw error;
  },

  // --- WEBHOOKS ---
  async addWebhook(webhook: any) {
    const { error } = await supabase.from('webhooks').insert(camelToSnake(webhook));
    if (error) throw error;
  },

  async updateWebhook(id: string, updates: any) {
    const { error } = await supabase.from('webhooks').update(camelToSnake(updates)).eq('id', id);
    if (error) throw error;
  },

  async deleteWebhook(id: string) {
    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleWebhookActive(id: string, active: boolean) {
    const { error } = await supabase.from('webhooks').update({ active }).eq('id', id);
    if (error) throw error;
  },

  // --- FIELD OPS ---
  async submitIncident(incident: any) {
    const { error } = await supabase.from('field_incidents').insert(camelToSnake(incident));
    if (error) throw error;
  },

  async updateIncidentStatus(id: string, updates: any) {
    const { error } = await supabase.from('field_incidents').update(camelToSnake(updates)).eq('id', id);
    if (error) throw error;
  },

  async getIncidents() {
    let query = supabase.from('field_incidents').select('*');
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data);
  },

  async submitWorkReport(report: any) {
    const { error } = await supabase.from('work_reports').insert(camelToSnake(report));
    if (error) throw error;
  },

  async submitAttendance(record: any) {
    const { error } = await supabase.from('attendance_records').insert(camelToSnake(record));
    if (error) throw error;
  },

  async getAttendance(locationId?: string) {
    let query = supabase.from('attendance_records').select('*');
    if (locationId) query = query.eq('location_id', locationId);
    const { data, error } = await query;
    if (error) throw error;
    return snakeToCamel(data);
  },

  async getWorkReports() {
    const { data, error } = await supabase.from('work_reports').select('*');
    if (error) throw error;
    return snakeToCamel(data);
  }
};
