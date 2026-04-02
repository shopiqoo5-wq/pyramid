const BASE_URL = '/api';

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('pyramid_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     throw new Error(errorData.message || 'API Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
};

export const ApiService: any = {
  // --- AUTH & CORE ---
  async signIn(email: string, pass: string) {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    localStorage.setItem('pyramid_auth_token', data.token);
    return data.user;
  },

  async signOut() {
    localStorage.removeItem('pyramid_auth_token');
  },

  async getCurrentUser() {
     try {
        return await fetchApi('/auth/me');
     } catch {
        return null;
     }
  },

  async checkConnection() {
     try {
        await fetchApi('/health');
        return true;
     } catch {
        return false;
     }
  },

  // --- GENERIC ENGINE ---
  async fetchData(table: string, filters: Record<string, string> = {}) {
    const query = new URLSearchParams(filters).toString();
    return fetchApi(`/data/${table}${query ? `?${query}` : ''}`);
  },

  async submitData(table: string, body: any) {
    return fetchApi(`/data/${table}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateData(table: string, id: string, body: any) {
    return fetchApi(`/data/${table}?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async deleteData(table: string, id: string) {
    return fetchApi(`/data/${table}?id=${id}`, { method: 'DELETE' });
  },

  // --- GENERATED HELPERS (Store Protocol) ---
  // Companies
  getCompanies() { return this.fetchData('companies'); },
  addCompany(d: any) { return this.submitData('companies', d); },
  updateCompany(id: string, d: any) { return this.updateData('companies', id, d); },
  deleteCompany(id: string) { return this.deleteData('companies', id); },
  updateCompanyBranding(id: string, b: any) { return this.updateData('companies', id, { branding: b }); },
  updateCompanySettings(id: string, s: any) { return this.updateData('companies', id, s); },
  updateCompanyCredit(id: string, amt: number) { return fetchApi(`/data/companies/credit?id=${id}`, { method: 'POST', body: JSON.stringify({ amount: amt }) }); },

  // Products
  getProducts() { return this.fetchData('products'); },
  addProduct(d: any) { return this.submitData('products', d); },
  updateProduct(id: string, d: any) { return this.updateData('products', id, d); },
  deleteProduct(id: string) { return this.deleteData('products', id); },
  getProductBundles() { return this.fetchData('product_bundles'); },
  addProductBundle(d: any) { return this.submitData('product_bundles', d); },
  updateProductBundle(id: string, d: any) { return this.updateData('product_bundles', id, d); },
  deleteProductBundle(id: string) { return this.deleteData('product_bundles', id); },

  // Locations
  getLocations() { return this.fetchData('locations'); },
  addLocation(d: any) { return this.submitData('locations', d); },
  updateLocation(id: string, d: any) { return this.updateData('locations', id, d); },
  deleteLocation(id: string) { return this.deleteData('locations', id); },
  updateLocationBudget(id: string, b: number) { return this.updateData('locations', id, { monthlyBudget: b }); },

  // Workforce
  getEmployees() { return this.fetchData('employees'); },
  addEmployee(d: any) { return this.submitData('employees', d); },
  updateEmployee(id: string, d: any) { return this.updateData('employees', id, d); },
  deleteEmployee(id: string) { return this.deleteData('employees', id); },
  getAttendance() { return this.fetchData('attendance_records'); },
  submitAttendance(d: any) { return this.submitData('attendance_records', d); },
  updateAttendanceRecord(id: string, d: any) { return this.updateData('attendance_records', id, d); },
  getWorkReports() { return this.fetchData('work_reports'); },
  submitWorkReport(d: any) { return this.submitData('work_reports', d); },
  updateWorkReport(id: string, d: any) { return this.updateData('work_reports', id, d); },
  getShifts() { return this.fetchData('employee_shifts'); },
  addShift(d: any) { return this.submitData('employee_shifts', d); },
  updateShift(id: string, d: any) { return this.updateData('employee_shifts', id, d); },
  getLeaves() { return this.fetchData('time_off_requests'); },
  getTimeOffRequests() { return this.fetchData('time_off_requests'); },
  submitTimeOffRequest(d: any) { return this.submitData('time_off_requests', d); },
  updateTimeOffStatus(id: string, d: any) { return this.updateData('time_off_requests', id, d); },

  // Orders
  getOrders() { return this.fetchData('orders'); },
  placeOrder(d: any) { return this.submitData('orders', d); },
  updateOrder(id: string, d: any) { return this.updateData('orders', id, d); },
  updateOrderStatus(id: string, s: string) { return this.updateData('orders', id, { status: s }); },
  getRecurringOrders() { return this.fetchData('recurring_orders'); },
  addRecurringOrder(d: any) { return this.submitData('recurring_orders', d); },
  updateRecurringOrderStatus(id: string, s: string) { return this.updateData('recurring_orders', id, { status: s }); },

  // Inventory
  getInventory() { return this.fetchData('inventory'); },
  updateStock(pid: string, wid: string, qty: number) { return fetchApi('/data/inventory/stock', { method: 'POST', body: JSON.stringify({ productId: pid, warehouseId: wid, quantity: qty }) }); },
  getInventoryLogs() { return this.fetchData('inventory_logs'); },
  addInventoryLog(d: any) { return this.submitData('inventory_logs', d); },
  getBatches() { return this.fetchData('batches'); },
  addBatch(d: any) { return this.submitData('batches', d); },

  // Admin & Infrastructure
  getUsers() { return this.fetchData('users'); },
  addUser(d: any) { return this.submitData('users', d); },
  updateUser(id: string, d: any) { return this.updateData('users', id, d); },
  deleteUser(id: string) { return this.deleteData('users', id); },
  updateUserFaceImage(id: string, url: string) { return this.updateData('users', id, { faceImageUrl: url }); },
  getAuditLogs() { return this.fetchData('audit_logs'); },
  logAction(uid: string, act: string, det: string) { return this.submitData('audit_logs', { userId: uid, action: act, details: det }); },
  getTickets() { return this.fetchData('tickets'); },
  createTicket(d: any) { return this.submitData('tickets', d); },
  updateTicketStatus(id: string, d: any) { return this.updateData('tickets', id, d); },
  addTicketMessage(d: any) { return fetchApi(`/data/tickets/message`, { method: 'POST', body: JSON.stringify(d) }); },
  getIncidents() { return this.fetchData('field_incidents'); },
  submitIncident(d: any) { return this.submitData('field_incidents', d); },
  updateIncidentStatus(id: string, d: any) { return this.updateData('field_incidents', id, d); },

  // Specials
  getQuotations() { return this.fetchData('quotations'); },
  addQuotation(d: any) { return this.submitData('quotations', d); },
  getFavorites(uid: string) { return this.fetchData('favorites', { userId: uid }); },
  addFavorite(d: any) { return this.submitData('favorites', d); },
  deleteFavorite(id: string) { return this.deleteData('favorites', id); },
  getAPIKeys(cid: string) { return this.fetchData('api_keys', { companyId: cid }); },
  addAPIKey(d: any) { return this.submitData('api_keys', d); },
  deleteAPIKey(id: string) { return this.deleteData('api_keys', id); },
  getNotifications(uid: string) { return this.fetchData('notifications', { userId: uid }); },
  addNotification(d: any) { return this.submitData('notifications', d); },
  markNotificationRead(id: string) { return this.updateData('notifications', id, { read: true }); },

  // Infrastructure Cont.
  getWebhooks() { return this.fetchData('webhooks'); },
  addWebhook(d: any) { return this.submitData('webhooks', d); },
  updateWebhook(id: string, d: any) { return this.updateData('webhooks', id, d); },
  deleteWebhook(id: string) { return this.deleteData('webhooks', id); },
  toggleWebhookActive(id: string, a: boolean) { return this.updateData('webhooks', id, { active: a }); },

  // --- UTILS ---
  base64ToBlob(base64: string) {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  },

  async uploadFile(_bucket: string, _path: string, body: File | Blob) {
    if (body instanceof Blob) {
       return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(body);
       });
    }
    return '';
  },

  async initApi() {
     const tables = [
        'companies', 'products', 'locations', 'warehouses', 'inventory', 
        'users', 'employees', 'attendance_records', 'work_reports', 
        'field_incidents', 'tickets', 'employee_shifts', 'time_off_requests'
     ];
     const data: Record<string, any> = {};
     for (const table of tables) {
        try {
           data[table] = await this.fetchData(table);
         } catch {
            data[table] = [];
         }
     }
     return data;
  }
};
