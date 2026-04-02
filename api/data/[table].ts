import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../../src/lib/mongodb';
import * as Models from '../../src/models/Schemas';

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
  if (!Model) {
    return res.status(404).json({ message: 'Table not found' });
  }

  try {
    const conn = await connectToDatabase();
    const isMock = (conn as any).mock;

    if (isMock) {
       // Cloud Recall Fallback: Return empty or mock based on table
       if (req.method === 'GET') return res.status(200).json([]);
       return res.status(201).json(req.body);
    }

    if (req.method === 'GET') {
      const { id, ...filters } = req.query;
      if (id) {
        const item = await Model.findById(id);
        return res.status(200).json(item);
      }
      const data = await Model.find(filters);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const newItem = await Model.create(req.body);
      return res.status(201).json(newItem);
    }

    if (req.method === 'PUT') {
       const { id } = req.query;
       const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
       return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
       const { id } = req.query;
       await Model.findByIdAndDelete(id);
       return res.status(204).end();
    }

    res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
