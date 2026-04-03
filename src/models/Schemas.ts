import mongoose from 'mongoose';

const opts = { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } };

// --- HELPERS ---
const addIdVirtual = (schema: mongoose.Schema) => {
  schema.virtual('id').get(function() { return (this as any)._id.toHexString(); });
};

// --- SCHEMAS ---

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstNumber: { type: String, required: true },
  pointOfContact: { type: String },
  contactEmail: { type: String },
  creditLimit: { type: Number, default: 0 },
  availableCredit: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
}, opts);
addIdVirtual(CompanySchema);

const ProductSchema = new mongoose.Schema({
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
}, opts);
addIdVirtual(ProductSchema);

const LocationSchema = new mongoose.Schema({
  companyId: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String },
  state: { type: String },
  monthlyBudget: { type: Number, default: 0 },
  currentMonthSpend: { type: Number, default: 0 },
}, opts);
addIdVirtual(LocationSchema);

const WarehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true },
  address: { type: String },
  state: { type: String },
}, opts);
addIdVirtual(WarehouseSchema);

const InventorySchema = new mongoose.Schema({
  productId: { type: String, required: true },
  warehouseId: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
}, opts);
addIdVirtual(InventorySchema);

const EmployeeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  companyId: { type: String },
  locationId: { type: String },
  role: { type: String },
}, opts);
addIdVirtual(EmployeeSchema);

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  locationId: { type: String },
  checkIn: { type: Date },
  checkOut: { type: Date },
  photoUrl: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  status: { type: String, default: 'pending' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, opts);
addIdVirtual(AttendanceSchema);

const WorkReportSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  userId: { type: String },
  locationId: { type: String },
  remarks: { type: String },
  imageUrl: { type: String },
  photoUrls: [{ type: String }],
  latitude: { type: Number },
  longitude: { type: Number },
  status: { type: String, default: 'pending' },
  approvedBy: { type: String }, // supervisor_id
}, opts);
addIdVirtual(WorkReportSchema);

const IncidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: String, required: true },
  locationId: { type: String },
  type: { type: String },
  severity: { type: String },
  description: { type: String },
  imageUrl: { type: String },
  status: { type: String, default: 'Open' },
}, opts);
addIdVirtual(IncidentSchema);

const OrderSchema = new mongoose.Schema({
  customId: { type: String, required: true, unique: true },
  companyId: { type: String, required: true },
  locationId: { type: String },
  placedBy: { type: String },
  status: { type: String, default: 'pending' },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  items: [{
    productId: { type: String },
    quantity: { type: Number },
    unitPrice: { type: Number },
    total: { type: Number },
  }],
}, opts);
addIdVirtual(OrderSchema);

const TicketSchema = new mongoose.Schema({
  customId: { type: String, sparse: true, unique: true },
  companyId: { type: String },
  userId: { type: String },
  title: { type: String },
  description: { type: String },
  category: { type: String },
  priority: { type: String },
  status: { type: String, default: 'Open' },
  messages: [{
    senderId: { type: String },
    message: { type: String },
    imageUrl: { type: String },
    isStaff: { type: Boolean },
    createdAt: { type: Date, default: Date.now },
  }],
}, opts);
addIdVirtual(TicketSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, required: true },
  companyId: { type: String },
  locationId: { type: String },
  status: { type: String, default: 'active' },
  faceImageUrl: { type: String },
  lastLoginAt: { type: Date },
}, opts);
addIdVirtual(UserSchema);

// --- EXPORTS ---

export const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Location = mongoose.models.Location || mongoose.model('Location', LocationSchema);
export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export const WorkReport = mongoose.models.WorkReport || mongoose.model('WorkReport', WorkReportSchema);
export const Incident = mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
