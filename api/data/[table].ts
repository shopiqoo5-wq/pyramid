import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../_db/mongodb.js';
import * as Models from '../_db/Schemas.js';
import mongoose from 'mongoose';
import { requireAuth } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { table } = req.query;
  const tableName = String(table);

  // Map table names to Mongoose models
  const modelMap: Record<string, any> = {
    'companies': Models.Company,
    'products': Models.Product,
    'locations': Models.Location,
    'warehouses': Models.Warehouse,
    'inventory': Models.Inventory,
    'users': Models.User,
    'employees': Models.Employee,
    'attendance_records': Models.Attendance,
    'work_reports': Models.WorkReport,
    'field_incidents': Models.Incident,
    'orders': Models.Order,
    'tickets': Models.Ticket,
  };

  const Model = modelMap[tableName];
  const DynamicModel =
    Model ||
    (mongoose.models[`Dynamic_${tableName}`] ||
      mongoose.model(
        `Dynamic_${tableName}`,
        new mongoose.Schema({}, { strict: false, timestamps: true })
      ));
  const ActiveModel = DynamicModel;

  try {
    // All data routes require auth (read + write)
    requireAuth(req);
    await connectToDatabase();

    if (req.method === 'GET') {
      const { id, ...filters } = req.query;
      if (id) {
        const item = await ActiveModel.findById(id);
        return res.status(200).json(item);
      }
      const mongoFilters: Record<string, any> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (typeof v === 'undefined') continue;
        if (Array.isArray(v)) mongoFilters[k] = v[0];
        else mongoFilters[k] = v;
      }
      const data = await ActiveModel.find(mongoFilters);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const newItem = await ActiveModel.create(req.body);
      return res.status(201).json(newItem);
    }

    if (req.method === 'PUT') {
       const { id } = req.query;
       const updated = await ActiveModel.findByIdAndUpdate(id, req.body, { new: true });
       return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
       const { id } = req.query;
       await ActiveModel.findByIdAndDelete(id);
       return res.status(204).end();
    }

    res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
