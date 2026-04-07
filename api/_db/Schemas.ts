import mongoose from 'mongoose';

const opts = { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } };

const addIdVirtual = (schema: mongoose.Schema) => {
  schema.virtual('id').get(function () {
    return (this as any)._id.toHexString();
  });
};

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    companyCode: { type: String },
    gstNumber: { type: String, required: true },
    pointOfContact: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    creditLimit: { type: Number, default: 0 },
    availableCredit: { type: Number, default: 0 },
    lastReconciledAt: { type: String },
    pricingTier: { type: String },
    discountMultiplier: { type: Number },
    defaultWarehouseId: { type: String },
    branding: {
       logoUrl: { type: String },
       primaryColor: { type: String }
    },
    approvalThreshold: { type: Number },
    status: { type: String, default: 'active' },
  },
  opts
);
addIdVirtual(CompanySchema);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String },
    imageUrl: { type: String },
    uom: { type: String },
    basePrice: { type: Number, default: 0 },
    gstRate: { type: Number, default: 18 },
    hsnCode: { type: String },
    category: { type: String },
    active: { type: Boolean, default: true },
    eligibleCompanies: [{ type: String }]
  },
  opts
);
addIdVirtual(ProductSchema);

const LocationSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String },
    state: { type: String },
    contactPerson: { type: String },
    contactPhone: { type: String },
    defaultWarehouseId: { type: String },
    monthlyBudget: { type: Number, default: 0 },
    currentMonthSpend: { type: Number, default: 0 },
    latitude: { type: Number },
    longitude: { type: Number },
    qrToken: { type: String },
    qrStatus: { type: String, default: 'inactive' },
  },
  opts
);
addIdVirtual(LocationSchema);

const WarehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true },
    address: { type: String },
    state: { type: String },
    documentUrl: { type: String },
    tallyExported: { type: Boolean, default: false }
  },
  opts
);
addIdVirtual(WarehouseSchema);

const InventorySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    warehouseId: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    inTransitQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 }
  },
  opts
);
addIdVirtual(InventorySchema);

const EmployeeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    companyId: { type: String },
    locationId: { type: String },
    role: { type: String },
  },
  opts
);
addIdVirtual(EmployeeSchema);

const AttendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    locationId: { type: String },
    checkIn: { type: String }, // ISO string
    checkOut: { type: String }, // ISO string
    timestamp: { type: String }, // ISO string
    photoUrl: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    status: { type: String, default: 'pending' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  opts
);
addIdVirtual(AttendanceSchema);

const TimeOffRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    userId: { type: String },
    type: { type: String },
    startDate: { type: String },
    endDate: { type: String },
    reason: { type: String },
    status: { type: String, default: 'pending' },
    adminRemarks: { type: String },
  },
  { ...opts, collection: 'time_off_requests' }
);
addIdVirtual(TimeOffRequestSchema);

const WorkReportSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    userId: { type: String },
    locationId: { type: String },
    remarks: { type: String },
    imageUrl: { type: String },
    photoUrls: [{ type: String }],
    latitude: { type: Number },
    longitude: { type: Number },
    status: { type: String, default: 'pending' },
    approvedBy: { type: String },
    timestamp: { type: String },
  },
  opts
);
addIdVirtual(WorkReportSchema);

const IncidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    userId: { type: String, required: true },
    locationId: { type: String },
    type: { type: String },
    severity: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    status: { type: String, default: 'Open' },
    adminRemarks: { type: String }
  },
  opts
);
addIdVirtual(IncidentSchema);

const OrderSchema = new mongoose.Schema(
  {
    customId: { type: String, required: true, unique: true },
    companyId: { type: String, required: true },
    locationId: { type: String },
    placedBy: { type: String },
    status: { type: String, default: 'pending' },
    totalAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    tdsDeducted: { type: Number, default: 0 },
    poDocumentUrl: { type: String },
    costCenter: { type: String },
    warehouseId: { type: String },
    tallyExported: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    items: [
      {
        productId: { type: String },
        quantity: { type: Number },
        unitPrice: { type: Number },
        gstAmount: { type: Number },
        total: { type: Number },
      },
    ],
    approvalChain: [
      {
        role: { type: String },
        userId: { type: String },
        userName: { type: String },
        action: { type: String },
        timestamp: { type: String }
      }
    ],
    splits: [
      {
        department: { type: String },
        percentage: { type: Number }
      }
    ]
  },
  opts
);
addIdVirtual(OrderSchema);

const TicketSchema = new mongoose.Schema(
  {
    customId: { type: String, sparse: true, unique: true },
    companyId: { type: String },
    userId: { type: String },
    title: { type: String },
    description: { type: String },
    category: { type: String },
    priority: { type: String },
    status: { type: String, default: 'Open' },
    assignedTo: { type: String },
    relatedOrderId: { type: String },
    relatedLocationId: { type: String },
    sentimentScore: { type: Number },
    messages: [
      {
        senderId: { type: String },
        message: { type: String },
        imageUrl: { type: String },
        isStaff: { type: Boolean },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  opts
);
addIdVirtual(TicketSchema);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, required: true },
    companyId: { type: String },
    locationId: { type: String },
    username: { type: String },
    status: { type: String, default: 'active' },
    faceImageUrl: { type: String },
    lastLoginAt: { type: Date },
    lastActionAt: { type: Date },
    invitedBy: { type: String }
  },
  opts
);
addIdVirtual(UserSchema);

export const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);
export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export const TimeOffRequest =
  mongoose.models.TimeOffRequest || mongoose.model('TimeOffRequest', TimeOffRequestSchema);
export const WorkReport = mongoose.models.WorkReport || mongoose.model('WorkReport', WorkReportSchema);
export const Incident = mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
