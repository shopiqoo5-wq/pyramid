const BASE_URL = '/api';

/** Map _id → id so admin UI and PUT /data/*?id= use stable string IDs */
function normalizeMongoDoc(doc: unknown): unknown {
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  const o = doc as Record<string, unknown>;
  const out = { ...o };
  const rawId = out.id != null ? out.id : out._id;
  if (rawId != null && String(rawId) !== '') {
    out.id = String(rawId);
  }
  delete out._id;
  delete out.__v;
  return out;
}

function normalizeApiPayload(data: unknown): unknown {
  if (Array.isArray(data)) return data.map((row) => normalizeMongoDoc(row) as object);
  return normalizeMongoDoc(data);
}

const VERCEL_JSON_BODY_SAFE_CHARS = 2_400_000;

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('pyramid_auth_token');
  
  // Guard: Don't call protected data routes without a token to avoid 401 spam.
  if (!token && (path.startsWith('/data/') || path === '/auth/me')) {
    if (path === '/auth/me') return null;
    throw new Error('Unauthorized: No session token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  const url = `${BASE_URL}${path}`;
  const runFetch = () => fetch(url, { ...options, headers });

  let response: Response;
  try {
    response = await runFetch();
  } catch (first: unknown) {
    // Retry on network error
    await new Promise((r) => setTimeout(r, 450));
    try {
      response = await runFetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      throw new Error(`${msg} (could not reach ${url})`);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('pyramid_auth_token');
    }
    const text = await response.text();
    let detail = '';
    try {
      const errorData = JSON.parse(text) as { message?: string; error?: string };
      detail = errorData.message || errorData.error || '';
    } catch {
      detail = text.replace(/\s+/g, ' ').trim().slice(0, 240);
      if (detail.startsWith('<!') || detail.includes('<html')) {
        detail =
          'Server returned a web page instead of JSON — the /api route may not be running (check Vercel deployment and vercel.json rewrites).';
      }
    }
    throw new Error(detail || `HTTP ${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return null;
  const bodyText = await response.text();
  if (!bodyText) return null;
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error('Invalid JSON from API');
  }
};

export const ApiService: any = {
  // --- AUTH & CORE ---
  hasAuthToken() {
    return !!localStorage.getItem('pyramid_auth_token');
  },

  async signIn(email: string, pass: string) {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
    localStorage.setItem('pyramid_auth_token', data.token);
    return normalizeMongoDoc(data.user) as typeof data.user;
  },

  async signOut() {
    localStorage.removeItem('pyramid_auth_token');
  },

  async getCurrentUser() {
    try {
      const user = await fetchApi('/auth/me');
      if (user == null) return null;
      return normalizeMongoDoc(user) as typeof user;
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
    const raw = await fetchApi(`/data/${table}${query ? `?${query}` : ''}`);
    return normalizeApiPayload(raw);
  },

  async submitData(table: string, body: any) {
    const serialized = JSON.stringify(body);
    if (serialized.length > VERCEL_JSON_BODY_SAFE_CHARS) {
      throw new Error(
        'Request too large for the server (try a smaller photo or shorter description).'
      );
    }
    const raw = await fetchApi(`/data/${table}`, {
      method: 'POST',
      body: serialized,
    });
    return normalizeApiPayload(raw);
  },

  async updateData(table: string, id: string, body: any) {
    const raw = await fetchApi(`/data/${table}?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeApiPayload(raw);
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

  // Workforce & Roles
  getCustomRoles() { return this.fetchData('custom_roles'); },
  addCustomRole(d: any) { return this.submitData('custom_roles', d); },
  getWorkAssignments() { return this.fetchData('work_assignments'); },
  addWorkAssignment(d: any) { return this.submitData('work_assignments', d); },
  getSiteProtocols() { return this.fetchData('site_protocols'); },
  addSiteProtocol(d: any) { return this.submitData('site_protocols', d); },

  // Compliance & Governance
  getComplianceDocs() { return this.fetchData('compliance_docs'); },
  addComplianceDoc(d: any) { return this.submitData('compliance_docs', d); },
  getFraudFlags() { return this.fetchData('fraud_flags'); },
  getExceptions() { return this.fetchData('exceptions'); },
  getDailyChecklists() { return this.fetchData('daily_checklists'); },
  getPhotoVerifications() { return this.fetchData('photo_verifications'); },

  // Infrastructure Cont.
  getWebhooks() { return this.fetchData('webhooks'); },
  addWebhook(d: any) { return this.submitData('webhooks', d); },
  updateWebhook(id: string, d: any) { return this.updateData('webhooks', id, d); },
  deleteWebhook(id: string) { return this.deleteData('webhooks', id); },
  toggleWebhookActive(id: string, a: boolean) { return this.updateData('webhooks', id, { active: a }); },

  // --- UTILS ---
  /** Downscale JPEG data URL so /api/data POST bodies stay under Vercel limits (~4MB) and mobile uploads succeed. */
  async imageToCompressedDataUrl(
    file: Blob,
    maxEdge = 1920,
    jpegQuality = 0.82
  ): Promise<string> {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        try {
          let w = bitmap.width;
          let h = bitmap.height;
          const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas');
          ctx.drawImage(bitmap, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', jpegQuality);
        } finally {
          bitmap.close();
        }
      } catch {
        /* fall through */
      }
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', jpegQuality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image decode failed'));
      };
      img.src = url;
    });
  },

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

  async uploadFile(
    _bucket: string,
    _path: string,
    body: File | Blob,
    opts?: { jpegQuality?: number; maxEdge?: number }
  ) {
    if (!(body instanceof Blob)) return '';
    const jpegQuality = opts?.jpegQuality ?? 0.82;
    const mime = body instanceof File ? body.type : body.type || '';
    const looksImage =
      mime.startsWith('image/') ||
      (body instanceof File && /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(body.name));

    const ensureUnderLimit = (dataUrl: string) => {
      if (dataUrl.length > VERCEL_JSON_BODY_SAFE_CHARS) {
        throw new Error('Compressed image still too large for upload');
      }
      return dataUrl;
    };

    if (looksImage) {
      const firstMax = opts?.maxEdge ?? 1280;
      const attempts: { max: number; q: number }[] = [
        { max: firstMax, q: jpegQuality },
        { max: 800, q: 0.65 },
        { max: 640, q: 0.55 },
        { max: 480, q: 0.52 },
      ];
      for (const { max, q } of attempts) {
        try {
          const dataUrl = await ApiService.imageToCompressedDataUrl(body, max, q);
          if (dataUrl.length <= VERCEL_JSON_BODY_SAFE_CHARS) return dataUrl;
        } catch {
          /* try next size */
        }
      }
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file for upload'));
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string' || !result.startsWith('data:')) {
          reject(new Error('Invalid upload payload generated'));
          return;
        }
        try {
          resolve(ensureUnderLimit(result));
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsDataURL(body);
    });
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
