import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../_db/mongodb.js';
import { castModel } from '../_db/castModel.js';
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
    'time_off_requests': Models.TimeOffRequest,
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
  const ActiveModel = castModel(DynamicModel);

  const collectionName =
    typeof (ActiveModel as any)?.collection?.collectionName === 'string'
      ? (ActiveModel as any).collection.collectionName
      : tableName;

  const findViaNativeDriver = async (filter: Record<string, any>) => {
    const db = mongoose.connection.db;
    if (!db) return [];
    return db.collection(collectionName).find(filter).toArray();
  };

  const findOneViaNativeDriver = async (filter: Record<string, any>) => {
    const db = mongoose.connection.db;
    if (!db) return null;
    return db.collection(collectionName).findOne(filter);
  };

  try {
    // All data routes require auth (read + write)
    requireAuth(req);
    await connectToDatabase();

    if (req.method === 'GET') {
      const q = req.query as Record<string, string | string[] | undefined>;
      const { id, table: _routeTable, ...filters } = q;
      if (id) {
        try {
          const item = await ActiveModel.findById(id).lean().exec();
          return res.status(200).json(item);
        } catch (e: any) {
          if (e?.name === 'CastError') return res.status(200).json(null);
          try {
            let oid: mongoose.Types.ObjectId;
            try {
              oid = new mongoose.Types.ObjectId(String(id));
            } catch {
              return res.status(200).json(null);
            }
            const one = await findOneViaNativeDriver({ _id: oid });
            return res.status(200).json(one ?? null);
          } catch {
            return res.status(200).json(null);
          }
        }
      }
      const mongoFilters: Record<string, any> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (typeof v === 'undefined') continue;
        if (Array.isArray(v)) mongoFilters[k] = v[0];
        else mongoFilters[k] = v;
      }
      try {
        const data = await ActiveModel.find(mongoFilters).lean().exec();
        return res.status(200).json(data);
      } catch (e: any) {
        if (e?.name === 'CastError') return res.status(200).json([]);
        try {
          const raw = await findViaNativeDriver(mongoFilters);
          return res.status(200).json(raw);
        } catch (e2) {
          console.error(`[data/${tableName}] GET list failed:`, e?.message || e, (e2 as any)?.message || e2);
          return res.status(200).json([]);
        }
      }
    }

    if (req.method === 'POST') {
      try {
        const newItem = await ActiveModel.create(req.body);
        return res.status(201).json(newItem);
      } catch (createErr: any) {
        if (createErr?.name === 'ValidationError') {
          return res.status(400).json({ message: createErr.message || 'Validation failed' });
        }
        throw createErr;
      }
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
    const msg = error?.message || String(error);
    const lower = msg.toLowerCase();
    const isAuth =
      lower.includes('token') ||
      lower.includes('jwt') ||
      lower.includes('unauthorized') ||
      lower.includes('authorization');
    const status = isAuth ? 401 : 500;
    res.status(status).json({ message: msg });
  }
}
