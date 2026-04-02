import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed in production
  phone: { type: String },
  role: { type: String, required: true },
  companyId: { type: String },
  locationId: { type: String },
  status: { type: String, default: 'active' },
  faceImageUrl: { type: String },
  lastLoginAt: { type: Date },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
