import type { Company, User, Product, InventoryItem, ClientPricing, Order, ProductBundle, Employee, WorkReport, AttendanceRecord } from '../types';
import { mockHash } from '../utils/security';
import { generateUUID } from '../lib/supabaseUtils';

export const mockCompanies: Company[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Alpha Corp (Gold Tier)', companyCode: 'ALPHA', gstNumber: '27AABBCC1234F1Z1', pointOfContact: 'John Doe', creditLimit: 50000, availableCredit: 45000, status: 'active' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Beta Industries (Standard)', companyCode: 'BETA', gstNumber: '27XYZABC8765G2Y2', pointOfContact: 'Jane Smith', creditLimit: 100000, availableCredit: 12000, status: 'active' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Gamma Enterprises (Platinum)', companyCode: 'GAMMA', gstNumber: '29ASDFGH9876Q3W3', pointOfContact: 'Robert Chen', creditLimit: 250000, availableCredit: 250000, status: 'active' },
  { id: 'd4444444-6666-4666-8666-000000000004', name: 'Pyramid Workforce', companyCode: 'PYRAMID', gstNumber: '27PYRAMID1234F1Z1', pointOfContact: 'Operations Manager', creditLimit: 0, availableCredit: 0, status: 'active' }
];

export const mockUsers: User[] = [
  { id: 'd1111111-3333-4333-8333-000000000001', name: 'Pyramid FMS Master', email: 'master@pyramidfms.com', phone: '9999988888', role: 'admin', password: mockHash('master2026'), status: 'active' },
  { id: '11111111-0000-4000-8000-000000000001', name: 'Admin Sameer', email: 'admin@pyramidfm.com', phone: '9876543210', role: 'admin', password: mockHash('admin123'), status: 'active' },
  { id: '11111111-0000-4000-8000-000000000002', name: 'John Doe', email: 'john@alphacorp.com', phone: '9123456780', role: 'client_manager', companyId: '11111111-1111-4111-8111-111111111111', password: mockHash('pass123'), status: 'active' },
  { id: 'd2222222-4444-4444-8444-000000000002', name: 'Sameer Employee', email: 'sameer@pyramidfm.com', phone: '9876543211', role: 'employee', companyId: 'd4444444-6666-4666-8666-000000000004', password: mockHash('emp123'), status: 'active' },
  { id: 'd3333333-5555-4555-8555-000000000003', name: 'Vikram Supervisor', email: 'vikram@pyramidfm.com', phone: '9876543212', role: 'employee', companyId: 'd4444444-6666-4666-8666-000000000004', password: mockHash('sup123'), status: 'active' }
];

export const mockProducts: Product[] = [
  { id: '11111111-1111-4000-8000-000000000001', name: 'Floor Cleaner (5L)', sku: 'FC-001', description: 'Industrial grade floor cleaner', imageUrl: 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=400&h=400&fit=crop', uom: 'Can', basePrice: 250, gstRate: 18, hsnCode: '3402', active: true, category: 'Cleaning Chemicals' },
  { id: '11111111-1111-4000-8000-000000000002', name: 'Glass Cleaner (500ml)', sku: 'GC-002', description: 'Streak-free glass cleaner spray', imageUrl: 'https://images.unsplash.com/photo-1585834892497-7e61da128913?w=400&h=400&fit=crop', uom: 'Bottle', basePrice: 85, gstRate: 18, hsnCode: '3402', active: true, category: 'Cleaning Chemicals' },
  { id: '11111111-1111-4000-8000-000000000003', name: 'Microfiber Cloth', sku: 'MC-003', description: 'Pack of 5 premium microfiber cloths', imageUrl: 'https://images.unsplash.com/photo-1585429158300-844c802e3bcf?w=400&h=400&fit=crop', uom: 'Pack', basePrice: 120, gstRate: 12, hsnCode: '6307', active: true, category: 'Accessories' },
  { id: '11111111-1111-4000-8000-000000000004', name: 'Nitrile Gloves (Box of 100)', sku: 'GL-004', description: 'Powder-free safety gloves', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=400&fit=crop', uom: 'Box', basePrice: 450, gstRate: 5, hsnCode: '4015', active: true, category: 'Safety Gear' },
  { id: '11111111-1111-4000-8000-000000000005', name: 'Hand Sanitizer (1L)', sku: 'HS-005', description: '70% Alcohol based sanitizer', imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', uom: 'Bottle', basePrice: 180, gstRate: 18, hsnCode: '3808', active: true, category: 'Personal Hygiene' },
];

export const mockPricing: ClientPricing[] = [
  { id: generateUUID(), companyId: '11111111-1111-4111-8111-111111111111', productId: '11111111-1111-4000-8000-000000000001', negotiatedPrice: 220 },
];

export const mockInventory: InventoryItem[] = [
  { id: generateUUID(), productId: '11111111-1111-4000-8000-000000000001', warehouseId: 'w1', quantity: 150, availableQuantity: 150, reservedQuantity: 0, inTransitQuantity: 0, lowStockThreshold: 20 },
  { id: generateUUID(), productId: '11111111-1111-4000-8000-000000000002', warehouseId: 'w1', quantity: 200, availableQuantity: 200, reservedQuantity: 0, inTransitQuantity: 0, lowStockThreshold: 50 },
  { id: generateUUID(), productId: '11111111-1111-4000-8000-000000000003', warehouseId: 'w1', quantity: 500, availableQuantity: 500, reservedQuantity: 0, inTransitQuantity: 0, lowStockThreshold: 100 },
];

export const mockOrders: Order[] = [
  {
    id: generateUUID(), customId: 'ORD-2026-001', companyId: '11111111-1111-4111-8111-111111111111', locationId: '11111111-2222-4000-8000-000000000001', placedBy: '11111111-0000-4000-8000-000000000002', status: 'delivered',
    items: [{ id: generateUUID(), productId: '11111111-1111-4000-8000-000000000001', quantity: 10, unitPrice: 220, gstAmount: 396, total: 2596 }],
    totalAmount: 2200, gstAmount: 396, netAmount: 2596, tdsDeducted: 0, createdAt: '2026-01-15T10:30:00Z'
  },
  {
    id: generateUUID(), customId: 'ORD-2026-002', companyId: '22222222-2222-4222-8222-222222222222', locationId: '11111111-2222-4000-8000-000000000002', placedBy: '11111111-0000-4000-8000-000000000003', status: 'delivered',
    items: [{ id: generateUUID(), productId: '11111111-1111-4000-8000-000000000002', quantity: 50, unitPrice: 85, gstAmount: 765, total: 5015 }],
    totalAmount: 4250, gstAmount: 765, netAmount: 5015, tdsDeducted: 0, createdAt: '2026-02-10T14:45:00Z'
  },
  {
    id: generateUUID(), customId: 'ORD-2026-003', companyId: '33333333-3333-4333-8333-333333333333', locationId: '11111111-2222-4000-8000-000000000001', placedBy: '11111111-0000-4000-8000-000000000001', status: 'dispatched',
    items: [
      { id: generateUUID(), productId: '11111111-1111-4000-8000-000000000001', quantity: 20, unitPrice: 250, gstAmount: 900, total: 5900 },
      { id: generateUUID(), productId: '11111111-1111-4000-8000-000000000003', quantity: 100, unitPrice: 120, gstAmount: 1440, total: 13440 }
    ],
    totalAmount: 17000, gstAmount: 2340, netAmount: 19340, tdsDeducted: 0, createdAt: '2026-03-05T09:15:00Z'
  },
  {
    id: generateUUID(), customId: 'ORD-2026-004', companyId: '11111111-1111-4111-8111-111111111111', locationId: '11111111-2222-4000-8000-000000000001', placedBy: '11111111-0000-4000-8000-000000000002', status: 'approved',
    items: [{ id: generateUUID(), productId: '11111111-1111-4000-8000-000000000004', quantity: 50, unitPrice: 450, gstAmount: 1125, total: 23625 }],
    totalAmount: 22500, gstAmount: 1125, netAmount: 23625, tdsDeducted: 0, createdAt: '2026-03-20T16:20:00Z'
  },
  {
    id: generateUUID(), customId: 'ORD-2026-005', companyId: '22222222-2222-4222-8222-222222222222', locationId: '11111111-2222-4000-8000-000000000002', placedBy: '11111111-0000-4000-8000-000000000003', status: 'delivered',
    items: [{ id: generateUUID(), productId: '11111111-1111-4000-8000-000000000001', quantity: 40, unitPrice: 250, gstAmount: 1800, total: 11800 }],
    totalAmount: 10000, gstAmount: 1800, netAmount: 11800, tdsDeducted: 0, createdAt: '2025-11-20T11:00:00Z'
  },
  {
    id: generateUUID(), customId: 'ORD-2026-006', companyId: '33333333-3333-4333-8333-333333333333', locationId: '11111111-2222-4000-8000-000000000001', placedBy: '11111111-0000-4000-8000-000000000001', status: 'delivered',
    items: [{ id: generateUUID(), productId: '11111111-1111-4000-8000-000000000005', quantity: 100, unitPrice: 180, gstAmount: 3240, total: 21240 }],
    totalAmount: 18000, gstAmount: 3240, netAmount: 21240, tdsDeducted: 0, createdAt: '2025-12-15T15:30:00Z'
  }
];

export const mockBundles: ProductBundle[] = [
  {
    id: generateUUID(),
    name: 'New Office Starter Kit',
    description: 'Essential cleaning and hygiene supplies.',
    sku: 'BNDL-OFFICE-01',
    items: [{ productId: '11111111-1111-4000-8000-000000000001', quantity: 2 }],
    price: 1800,
    active: true
  }
];

export const mockEmployees: Employee[] = [
  { id: 'e1111111-1111-4111-8111-000000000001', userId: 'd2222222-4444-4444-8444-000000000002', name: 'Sameer Kumar', companyId: 'd4444444-6666-4666-8666-000000000004', locationId: '11111111-2222-4000-8000-000000000001', role: 'Cleaner' },
  { id: 'e2222222-2222-4222-8222-000000000002', userId: 'd3333333-5555-4555-8555-000000000003', name: 'Vikram Singh', companyId: 'd4444444-6666-4666-8666-000000000004', locationId: '11111111-2222-4000-8000-000000000001', role: 'Supervisor' }
];

export const mockAttendance: AttendanceRecord[] = [
  { id: 'att-001', employeeId: 'e1111111-1111-4111-8111-000000000001', checkIn: new Date(Date.now() - 3600000).toISOString(), imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' }
];

export const mockWorkReports: WorkReport[] = [
  { 
    id: 'rep-001', 
    employeeId: 'e1111111-1111-4111-8111-000000000001', 
    imageUrl: 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=200&h=200&fit=crop', 
    remarks: 'Main lobby area sanitized.', 
    timestamp: new Date().toISOString(),
    status: 'pending'
  }
];

export const mockReturnRequests: any[] = [
  {
    id: 'RET-001',
    orderId: 'ORD-2026-001',
    companyId: '11111111-1111-4111-8111-111111111111',
    reason: 'Damaged during transit - Box was crushed.',
    status: 'pending',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    requestedBy: '11111111-0000-4000-8000-000000000002',
    items: [{ productId: '11111111-1111-4000-8000-000000000001', quantity: 2 }],
    imageUrl: 'https://images.unsplash.com/photo-1542312167-738153b87214?w=400&h=400&fit=crop'
  },
  {
    id: 'RET-002',
    orderId: 'ORD-2026-002',
    companyId: '22222222-2222-4222-8222-222222222222',
    reason: 'Wrong Item received - Ordered 5L, got 500ml.',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    requestedBy: '11111111-0000-4000-8000-000000000003',
    items: [{ productId: '11111111-1111-4000-8000-000000000002', quantity: 5 }]
  }
];

export const mockInventoryLogs: any[] = [
  {
    id: 'LOG-001',
    productId: '11111111-1111-4000-8000-000000000001',
    warehouseId: 'w1',
    type: 'REFILL',
    change: 500,
    previousQuantity: 0,
    newQuantity: 500,
    referenceId: 'BAT-2024-001',
    performedBy: 'ADMIN-001',
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    notes: 'Initial stock injection.'
  },
  {
    id: 'LOG-002',
    productId: '11111111-1111-4000-8000-000000000001',
    warehouseId: 'w1',
    type: 'SALE',
    change: -24,
    previousQuantity: 500,
    newQuantity: 476,
    referenceId: 'ORD-2026-001',
    performedBy: 'SYSTEM',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    notes: 'Outbound order fulfillment.'
  },
  {
    id: 'LOG-003',
    productId: '11111111-1111-4000-8000-000000000002',
    warehouseId: 'w2',
    type: 'ADJUSTMENT',
    change: -2,
    previousQuantity: 154,
    newQuantity: 152,
    referenceId: 'ADJ-102',
    performedBy: 'WH-STAFF-02',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    notes: 'Damaged during handling.'
  }
];
