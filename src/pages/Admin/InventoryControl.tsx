import React, { useState } from 'react';
import { useStore } from '../../store';
import { motion } from 'framer-motion';
import {
  LuSearch, LuPackage, LuWarehouse, LuClock, LuArrowUpDown, LuZap, LuBox, LuPlus, LuTriangle
} from 'react-icons/lu';
import { Button, Modal, Input, Card, Badge } from '../../components/ui';
import './InventoryControl.css';

const InventoryControl: React.FC = () => {
  const { inventory, batches, products, addBatch, inventoryLogs, transferStock } = useStore();
  const [activeTab, setActiveTab] = useState<'batches' | 'reserved' | 'insights' | 'logs' | 'transfers' | 'low_stock'>('batches');
  const [search, setSearch] = useState('');

  // Add Batch Modal State
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    productId: '',
    warehouseId: 'w1',
    batchNumber: '',
    manufactureDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quantity: 0
  });

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    productId: '',
    fromWarehouseId: 'w1',
    toWarehouseId: 'w2',
    quantity: 0
  });

  const warehouses = [
    { id: 'w1', name: 'Main Distribution Center' },
    { id: 'w2', name: 'South Regional Hub' },
    { id: 'w3', name: 'West Zone Facility' }
  ];

  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const handleAddBatch = () => {
    if (!newBatch.productId || !newBatch.batchNumber || newBatch.quantity <= 0) {
      alert('Please fill all required fields correctly.');
      return;
    }
    addBatch(newBatch);
    setIsAddBatchModalOpen(false);
    setNewBatch({
      productId: '',
      warehouseId: 'w1',
      batchNumber: '',
      manufactureDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: 0
    });
  };

  const handleTransfer = () => {
    if (!transferData.productId || !transferData.fromWarehouseId || !transferData.toWarehouseId || transferData.quantity <= 0) {
      alert('Invalid transfer details.');
      return;
    }
    if (transferData.fromWarehouseId === transferData.toWarehouseId) {
      alert('Source and destination cannot be the same.');
      return;
    }
    transferStock(transferData.productId, transferData.fromWarehouseId, transferData.toWarehouseId, transferData.quantity);
    setIsTransferModalOpen(false);
    setTransferData({ ...transferData, quantity: 0 });
  };

  const expiringBatches = batches.filter(b => b.expiryDate && new Date(b.expiryDate) < soon);

  const filteredBatches = batches.filter(b => {
    const prod = products.find(p => p.id === b.productId);
    return !search || prod?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.batchNumber?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredInventory = inventory.filter(item => {
    if (!item.reservedQuantity && !item.inTransitQuantity) return false;
    const prod = products.find(p => p.id === item.productId);
    return !search || prod?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const lowStockItems = inventory.filter(i => (i.quantity <= (i.lowStockThreshold || 5)));

  const totalStock = inventory.reduce((s, i) => s + i.quantity, 0);
  const totalReserved = inventory.reduce((s, i) => s + (i.reservedQuantity || 0), 0);
  const totalTransit = inventory.reduce((s, i) => s + (i.inTransitQuantity || 0), 0);

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'REFILL': return 'var(--success)';
      case 'SALE': return 'var(--info)';
      case 'ADJUSTMENT': return 'var(--warning)';
      case 'RETURN': return 'var(--primary)';
      case 'DAMAGE': return 'var(--error)';
      default: return 'var(--text-sub)';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontWeight: 950, letterSpacing: '-0.04em', fontSize: '2.5rem' }}>Inventory <span style={{ color: 'var(--primary)' }}>Control</span></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem' }}>
            <Badge variant="info" style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: 900 }}>
              AUTO-PURCHASE: ENABLED
            </Badge>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>Global Logistics Framework • Multi-Site Deployment</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" className="lift shadow-sm" onClick={() => setIsTransferModalOpen(true)}>
             <LuArrowUpDown size={16} /> New Transfer
          </Button>
          <Button variant="primary" className="lift shadow-glow" onClick={() => setIsAddBatchModalOpen(true)}>
            <LuPlus size={16} /> Register Batch
          </Button>
        </div>
      </div>

      <Modal 
        isOpen={isAddBatchModalOpen} 
        onClose={() => setIsAddBatchModalOpen(false)}
        title="Register New Inventory Batch"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div className="input-group">
            <label className="input-label">Select Product</label>
            <select 
              className="input-field select-premium"
              value={newBatch.productId}
              onChange={e => setNewBatch({ ...newBatch, productId: e.target.value })}
            >
              <option value="">Choose item from catalog...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Target Warehouse</label>
              <select 
                className="input-field select-premium"
                value={newBatch.warehouseId}
                onChange={e => setNewBatch({ ...newBatch, warehouseId: e.target.value })}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Quantity (Units)</label>
              <Input 
                type="number" 
                className="input-field"
                value={newBatch.quantity} 
                onChange={e => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Batch Number / Lot ID</label>
            <Input 
              className="input-field"
              value={newBatch.batchNumber} 
              onChange={e => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
              placeholder="e.g. BAT-2024-OX-001"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Manufacture Date</label>
              <Input 
                type="date" 
                className="input-field"
                value={newBatch.manufactureDate} 
                onChange={e => setNewBatch({ ...newBatch, manufactureDate: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Expiration Date</label>
              <Input 
                type="date" 
                className="input-field"
                value={newBatch.expiryDate} 
                onChange={e => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button variant="ghost" onClick={() => setIsAddBatchModalOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" onClick={handleAddBatch} style={{ flex: 2 }} className="btn-lg shadow-glow">Confirm Registry</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Inter-Warehouse Stock Transfer"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div className="input-group">
            <label className="input-label">Item for Re-location</label>
            <select 
              className="input-field select-premium"
              value={transferData.productId}
              onChange={e => setTransferData({ ...transferData, productId: e.target.value })}
            >
              <option value="">Choose product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Origin Warehouse</label>
              <select 
                className="input-field select-premium"
                value={transferData.fromWarehouseId}
                onChange={e => setTransferData({ ...transferData, fromWarehouseId: e.target.value })}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Destination Hub</label>
              <select 
                className="input-field select-premium"
                value={transferData.toWarehouseId}
                onChange={e => setTransferData({ ...transferData, toWarehouseId: e.target.value })}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Transfer Quantity</label>
            <Input 
              type="number" 
              className="input-field"
              value={transferData.quantity} 
              onChange={e => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)} style={{ flex: 1 }}>Discard</Button>
            <Button variant="primary" onClick={handleTransfer} style={{ flex: 2 }} className="btn-lg shadow-glow">Execute Transfer</Button>
          </div>
        </div>
      </Modal>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Batches', value: batches.length, color: 'var(--primary)', icon: <LuBox size={18} /> },
          { label: 'Expiring ≤ 30 Days', value: expiringBatches.length, color: expiringBatches.length > 0 ? 'var(--warning)' : 'var(--success)', icon: <LuTriangle size={18} /> },
          { label: 'Total Stock Units', value: totalStock.toLocaleString(), color: 'var(--text-main)', icon: <LuWarehouse size={18} /> },
          { label: 'Reserved / In-Transit', value: `${totalReserved} / ${totalTransit}`, color: 'var(--info)', icon: <LuArrowUpDown size={18} /> },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="quick-stat lift" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: 'row' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-light)', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div className="quick-stat-label">{stat.label}</div>
              <div className="quick-stat-value" style={{ color: stat.color, fontSize: '1.3rem' }}>{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expiring Alert Banner */}
      {expiringBatches.length > 0 && (
        <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--warning)', fontWeight: 600, fontSize: '0.875rem' }}>
          <LuTriangle size={18} />
          {expiringBatches.length} batch{expiringBatches.length > 1 ? 'es are' : ' is'} expiring within 30 days. Review and take action.
        </div>
      )}

      {/* Tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="tabs-row" style={{ borderBottom: 'none' }}>
          <button className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`} onClick={() => setActiveTab('batches')}>
            Active Batches ({batches.length})
          </button>
          <button className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')}>
            Transfers
          </button>
          <button className={`tab-btn ${activeTab === 'low_stock' ? 'active' : ''}`} onClick={() => setActiveTab('low_stock')}>
            <span style={{ color: lowStockItems.length > 0 ? 'var(--error)' : 'inherit' }}>Low Stock ({lowStockItems.length})</span>
          </button>
          <button className={`tab-btn ${activeTab === 'reserved' ? 'active' : ''}`} onClick={() => setActiveTab('reserved')}>
            Reserved
          </button>
          <button className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
            Insights
          </button>
          <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            Audit Trail
          </button>
        </div>
        <div className="search-box" style={{ maxWidth: '300px' }}>
          <LuSearch size={15} className="search-icon" />
          <input type="text" placeholder="Search products or batches..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'batches' ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                {['Batch #', 'Product', 'Hub', 'Quantity', 'Expiry Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No batches found.</td></tr>
              ) : filteredBatches.map((batch, i) => {
                const product = products.find(p => p.id === batch.productId);
                const isExpiring = batch.expiryDate && new Date(batch.expiryDate) < soon;
                return (
                  <motion.tr key={batch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)', fontFamily: 'monospace' }}>{batch.batchNumber}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <LuPackage size={15} style={{ color: 'var(--text-muted)' }} />
                        {product?.name || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><LuWarehouse size={13} />{batch.warehouseId}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', fontWeight: 700, fontSize: '0.95rem' }}>{batch.quantity}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: isExpiring ? 'var(--warning)' : 'var(--text-sub)', fontWeight: isExpiring ? 700 : 400 }}>
                      {batch.expiryDate ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isExpiring && <LuClock size={13} />}
                          {new Date(batch.expiryDate).toLocaleDateString()}
                          {isExpiring && <span style={{ fontSize: '0.68rem', background: 'var(--warning-bg)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)' }}>Soon</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span className="status-badge success" style={{ fontSize: '0.68rem' }}>In Stock</span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="icon-btn-premium sm danger" 
                          title="Mark as Damaged / Write-off"
                          onClick={() => {
                            if (confirm(`Mark ${batch.quantity} units of batch ${batch.batchNumber} as damaged?`)) {
                              useStore.getState().updateInventoryQuantity(batch.productId, batch.warehouseId, -batch.quantity, 'Damaged Inventory Write-off', batch.id);
                            }
                          }}
                        >
                          <LuTriangle size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'transfers' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Product', 'Route', 'Quantity', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventoryLogs.filter(l => l.type.includes('TRANSFER')).map((log) => {
                  const product = products.find(p => p.id === log.productId);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-sub)' }}>{new Date(log.createdAt || (log as any).timestamp || '').toLocaleDateString()}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>{product?.name}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <span style={{ color: 'var(--primary)' }}>{log.type === 'TRANSFER_OUT' ? log.warehouseId : log.notes?.split('from ')[1] || 'Hub'}</span>
                           <LuArrowUpDown size={12} style={{ transform: 'rotate(90deg)', color: 'var(--text-muted)' }} />
                           <span style={{ color: 'var(--success)' }}>{log.type === 'TRANSFER_IN' ? log.warehouseId : log.notes?.split('to ')[1] || 'Dest'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 800 }}>{Math.abs(log.change)}</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <Badge variant="success">Completed</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'low_stock' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card className="glass-surface" style={{ padding: '1.5rem', background: 'var(--error-bg)', color: 'var(--error)' }}>
             <h4 style={{ margin: 0 }}>Critical Replenishment Required</h4>
             <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>{lowStockItems.length} items have fallen below their safety threshold. Automated procurement triggers are pending.</p>
          </Card>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  {['Product', 'Warehouse', 'Current Stock', 'Threshold', 'Gap', ''].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  const threshold = item.lowStockThreshold || 5;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>{product?.name}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>{item.warehouseId}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 800, color: 'var(--error)' }}>{item.quantity}</td>
                      <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-muted)' }}>{threshold}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--warning)' }}>-{threshold - item.quantity}</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <Button variant="primary" size="sm" className="shadow-sm">Quick Reorder</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  {['Timestamp', 'Type', 'Product', 'Movement', 'Stock State', 'Reference', 'User'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventoryLogs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No audit logs recorded.</td></tr>
                ) : inventoryLogs.map((log, i) => {
                  const product = products.find(p => p.id === log.productId);
                  return (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                        {new Date(log.createdAt || (log as any).timestamp || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 900, 
                          color: getLogTypeColor(log.type), 
                          background: `${getLogTypeColor(log.type)}15`,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          border: `1px solid ${getLogTypeColor(log.type)}30`
                        }}>
                          {log.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600 }}>{product?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.warehouseId}</div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.9rem', fontWeight: 800, color: log.change > 0 ? 'var(--success)' : 'var(--error)' }}>
                        {log.change > 0 ? `+${log.change}` : log.change}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{log.previousQuantity}</span>
                            <LuArrowUpDown size={10} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 700 }}>{log.newQuantity}</span>
                         </div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-sub)', fontFamily: 'monospace' }}>
                        {log.referenceId}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {log.performedBy}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'insights' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Stock Distribution Heatmap */}
          <Card className="glass-surface" style={{ padding: '2rem' }}>
             <h3 style={{ margin: '0 0 1.5rem 0' }}>Stock Distribution Heatmap</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {warehouses.map(w => (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)' }}>{w.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                       {products.slice(0, 20).map((p) => {
                          const level = inventory.find(i => i.productId === p.id && i.warehouseId === w.id)?.quantity || 0;
                          const opacity = Math.min(level / 500, 1);
                          return (
                            <div 
                              key={p.id} 
                              title={`${p.name}: ${level} units`}
                              style={{ 
                                height: '20px', 
                                background: level > 0 ? `rgba(var(--primary-rgb, 99, 102, 241), ${0.2 + opacity * 0.8})` : 'var(--surface-hover)',
                                borderRadius: '3px',
                                border: level > 100 ? '1px solid var(--primary)' : 'none'
                              }} 
                            />
                          );
                       })}
                    </div>
                  </div>
                ))}
             </div>
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>Low Density</span>
                <div style={{ width: '40px', height: '10px', background: 'var(--primary-light)', borderRadius: '2px' }} />
                <div style={{ width: '40px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
                <span>High Density</span>
             </div>
          </Card>

          {/* Velocity Tracker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
             <Card className="glass-surface" style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0' }}>Velocity Tracker (Weekly Throughput)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                   {products.slice(0, 5).map((p, i) => (
                     <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                           <span style={{ fontWeight: 600 }}>{p.name}</span>
                           <span style={{ fontWeight: 800, color: 'var(--success)' }}>{85 - i * 12}% Velocity</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                           <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${85 - i * 12}%` }} 
                              style={{ height: '100%', background: 'linear-gradient(to right, var(--primary), var(--info))' }} 
                           />
                        </div>
                     </div>
                   ))}
                </div>
             </Card>
             
             <Card className="glass-surface" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                <LuZap size={40} style={{ color: 'var(--warning)' }} />
                <div>
                   <h4 style={{ margin: 0 }}>Auto-Reorder Intelligence</h4>
                   <p className="text-muted" style={{ fontSize: '0.85rem' }}>The system is tracking 12 high-velocity SKUs for predictive procurement.</p>
                </div>
                <Button variant="secondary" size="sm">View Recommendations</Button>
             </Card>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                {['Product', 'Warehouse', 'Total Stock', 'Available', 'Reserved', 'In-Transit'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No reserved or in-transit items found.</td></tr>
              ) : filteredInventory.map((item, i) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>{product?.name || '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-sub)' }}>{item.warehouseId}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ padding: '0.875rem 1.25rem', color: 'var(--success)', fontWeight: 600 }}>{item.availableQuantity}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      {item.reservedQuantity
                        ? <span style={{ background: 'var(--warning-bg)', color: 'var(--warning)', fontWeight: 700, fontSize: '0.85rem', padding: '0.2rem 0.7rem', borderRadius: 'var(--radius-full)' }}>{item.reservedQuantity}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      {item.inTransitQuantity
                        ? <span style={{ background: 'var(--info-bg, var(--primary-light))', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', padding: '0.2rem 0.7rem', borderRadius: 'var(--radius-full)' }}>{item.inTransitQuantity}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryControl;
