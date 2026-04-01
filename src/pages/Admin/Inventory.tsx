import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { 
  LuWarehouse, 
  LuSearch, 
  LuTriangle, 
  LuPlus, 
  LuMinus, 
  LuDownload, 
  LuCheck, 
  LuHistory,
  LuLayoutGrid,
  LuDatabase,
  LuClock,
  LuArrowRight,
  LuPrinter
} from 'react-icons/lu';
import { Card, Table, Button, EmptyState } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';

const AdminInventory: React.FC = () => {
  const { inventory, products, updateInventoryQuantity, inventoryLogs, users } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<{ productId: string, warehouseId: string, quantity: number, lowStockThreshold: number } | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Cycle Count');

  const warehouses = Array.from(new Set(inventory.map(i => i.warehouseId)));

  const inventoryView = useMemo(() => {
    return inventory.map(item => {
      const product = products.find(p => p.id === item.productId);
      // Simulate shelf life for demo purposes
      const shelfLifeDays = (item.productId.length * 10) % 180 + 1;
      const expiryRisk = shelfLifeDays < 30 ? 'high' : shelfLifeDays < 90 ? 'medium' : 'low';
      
      return {
        ...item,
        productName: product?.name || 'Unknown',
        sku: product?.sku || 'N/A',
        uom: product?.uom || 'N/A',
        status: item.quantity <= item.lowStockThreshold ? 'Low Stock' : 'Optimal',
        shelfLifeDays,
        expiryRisk
      };
    });
  }, [inventory, products]);

  const filteredInventory = inventoryView.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = filterWarehouse === 'all' || item.warehouseId === filterWarehouse;
    const matchesLowStock = !lowStockOnly || item.status === 'Low Stock';
    return matchesSearch && matchesWarehouse && matchesLowStock;
  });

  const stats = [
    { label: 'Units in WH', value: inventory.reduce((sum, item) => sum + item.quantity, 0), icon: <LuDatabase />, color: 'var(--primary)', bg: 'var(--primary-light)' },
    { label: 'Active SKUs', value: new Set(inventory.map(i => i.productId)).size, icon: <LuLayoutGrid />, color: 'var(--info)', bg: 'var(--info-bg-light)' },
    { label: 'Low Stock Alerts', value: inventoryView.filter(i => i.status === 'Low Stock').length, icon: <LuTriangle />, color: 'var(--warning)', bg: 'var(--warning-light)' },
  ];

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateInventoryQuantity(selectedItem.productId, selectedItem.warehouseId, adjustmentQty, adjustmentReason);
      setIsAdjustModalOpen(false);
      setSelectedItem(null);
      setAdjustmentQty(0);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Optimal') return <span className="status-badge success"><LuCheck size={12}/>Optimal</span>;
    if (status === 'Low Stock') return <span className="status-badge warning"><LuTriangle size={12}/>Low Stock</span>;
    return <span className="status-badge default">{status}</span>;
  };

  const getExpiryBadge = (risk: string, days: number) => {
    const color = risk === 'high' ? 'var(--danger)' : risk === 'medium' ? 'var(--warning)' : 'var(--success)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color, fontWeight: 700, fontSize: '0.85rem' }}>
        <LuClock size={14} />
        {days} Days
        {risk === 'high' && <LuTriangle size={14} />}
      </div>
    );
  };

  const columns = [
    { 
      key: 'product', 
      header: 'Product Detail', 
      render: (row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{row.productName}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SKU: {row.sku}</span>
        </div>
      )
    },
    { 
      key: 'warehouseId', 
      header: 'WH Location', 
      render: (row: any) => (
        <div className="status-badge info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', fontWeight: 800, fontSize: '0.75rem' }}>
          {row.warehouseId.toUpperCase()}
        </div>
      )
    },
    { 
      key: 'quantity', 
      header: 'Net Availability', 
      render: (row: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-main)' }}>{row.quantity}</span>
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{row.uom}</span>
          </div>
          <div style={{ width: '80px', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
             <div style={{ width: `${Math.min((row.quantity / 500) * 100, 100)}%`, height: '100%', background: row.quantity < 50 ? 'var(--danger)' : 'var(--primary)' }} />
          </div>
        </div>
      )
    },
    { key: 'status', header: 'Vitals', render: (row: any) => getStatusBadge(row.status) },
    { key: 'expiry', header: 'Shelf Life', render: (row: any) => getExpiryBadge(row.expiryRisk, row.shelfLifeDays) },
    { 
      key: 'actions', 
      header: '', 
      render: (row: any) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button 
            className="icon-btn-premium sm primary" 
            onClick={() => {
              setSelectedItem(row);
              setIsHistoryModalOpen(true);
            }}
            title="View History"
          >
            <LuHistory size={16} />
          </button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => {
              setSelectedItem(row);
              setAdjustmentQty(0);
              setIsAdjustModalOpen(true);
            }}
            className="lift"
            style={{ borderRadius: '10px' }}
          >
            Adjust
          </Button>
        </div>
      ) 
    }
  ];

  const selectedItemLogs = useMemo(() => {
    if (!selectedItem) return [];
    return inventoryLogs.filter(log => log.productId === selectedItem.productId && log.warehouseId === selectedItem.warehouseId);
  }, [selectedItem, inventoryLogs]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Inventory Intelligence</h2>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>Sovereign multi-warehouse coordination and real-time stock orchestration.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <Button variant="secondary" onClick={() => {}} className="lift"><LuPrinter size={18} /> Print Manifest</Button>
           <Button variant="primary" onClick={() => {
            const headers = ['SKU', 'Product Name', 'Warehouse', 'Quantity', 'UOM', 'Status', 'Shelf Life (Days)'];
            const rows = inventoryView.map(i => [i.sku, i.productName, i.warehouseId.toUpperCase(), i.quantity, i.uom, i.status, i.shelfLifeDays].join(','));
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
            const link = document.createElement("a");
            link.href = encodeURI(csvContent);
            link.download = `Global_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
          }} className="lift">
            <LuDownload size={18} /> Export Deep Log
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {stats.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="quick-stat lift glass-surface"
            style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.75rem' }}
          >
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '18px', 
              background: kpi.bg, color: kpi.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem'
            }}>
              {kpi.icon}
            </div>
            <div>
              <div className="quick-stat-label" style={{ fontSize: '0.95rem', fontWeight: 700 }}>{kpi.label}</div>
              <div className="quick-stat-value" style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 800 }}>{kpi.value.toLocaleString()}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <Card className="glass-surface" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '350px' }}>
            <LuSearch className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Query by Master SKU, Serial Number, or Asset ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-select-wrap-premium">
            <select 
              className="select-premium"
              value={filterWarehouse} 
              onChange={(e) => setFilterWarehouse(e.target.value)}
            >
              <option value="all">Global Hub View</option>
              {warehouses.map(w => <option key={w} value={w}>{w.toUpperCase()} Center</option>)}
            </select>
            <LuWarehouse className="select-icon" />
          </div>

          <button 
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`tag-btn ${lowStockOnly ? 'active danger' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 1.5rem', height: '48px', borderRadius: '12px' }}
          >
            <LuTriangle size={16} /> Critical Stock Only
          </button>
        </div>
      </Card>

      {/* Main Table */}
      {filteredInventory.length === 0 ? (
        <EmptyState 
          icon={LuWarehouse}
          title="Warehouse segment is empty"
          description="No inventory matches your current query. Synchronize with regional hubs to fetch latest telemetry."
          action={
            <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterWarehouse('all'); setLowStockOnly(false); }}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <Card className="glass-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ui-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <Table columns={columns as any} data={filteredInventory} />
          </div>
        </Card>
      )}

      {/* History Detail Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedItem && (
          <Modal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            title={`Telemetry Audit: ${selectedItem.productId}`}
            className="glass-surface"
            style={{ maxWidth: '900px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', background: 'var(--surface-hover)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Hub Assigned</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedItem.warehouseId.toUpperCase()} Center</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Qty</div>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>{selectedItem.quantity} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>UNITS</span></div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Health State</div>
                    <div>{getStatusBadge((selectedItem as any).status)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fulfillment Threshold</div>
                    <div style={{ fontWeight: 700 }}>{selectedItem.lowStockThreshold} Units</div>
                  </div>
               </div>

               <div>
                 <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><LuHistory className="text-primary" /> Movement Lifecycle Audit</h4>
                 {selectedItemLogs.length > 0 ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedItemLogs.map((log, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                           <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: log.change > 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: log.change > 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {log.change > 0 ? <LuPlus /> : <LuMinus />}
                           </div>
                           <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800 }}>{log.type.replace(/_/g, ' ')}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt || (log as any).timestamp || '').toLocaleString()} | Officer: {users.find(u => u.id === log.performedBy)?.name || 'System'}</div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                 {Math.abs(log.change)} <LuArrowRight size={14} className="text-muted" /> {log.newQuantity}
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>Units Post-Action</div>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                      <p className="text-muted">No historical movement telemetry for this specific hub segment.</p>
                   </div>
                 )}
               </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                  <Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>Close Audit</Button>
               </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {isAdjustModalOpen && selectedItem && (
          <Modal 
            isOpen={isAdjustModalOpen} 
            onClose={() => setIsAdjustModalOpen(false)}
            title="Sovereign Stock Correction"
            className="glass-surface"
          >
            <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--primary-light)', padding: '2rem', borderRadius: '24px', color: 'var(--primary)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Regional Hub</div>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{selectedItem.warehouseId.toUpperCase()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', marginBottom: '0.5rem' }}>On-Hand Telemetry</div>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{selectedItem.quantity}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                <label style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Adjust Balance Manually</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', justifyContent: 'center' }}>
                  <button type="button" onClick={() => setAdjustmentQty(prev => prev - 1)} className="icon-btn-circle hover-danger" style={{ width: '48px', height: '48px' }}><LuMinus /></button>
                  <input 
                    type="number" 
                    value={adjustmentQty} 
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    style={{ width: '150px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', outline: 'none' }}
                  />
                  <button type="button" onClick={() => setAdjustmentQty(prev => prev + 1)} className="icon-btn-circle hover-success" style={{ width: '48px', height: '48px' }}><LuPlus /></button>
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                  Projected Segment Balance: <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.3rem' }}>{selectedItem.quantity + adjustmentQty}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorization Reason</label>
                <select 
                  className="input"
                  style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '16px', fontSize: '1rem', fontWeight: 700, border: '1px solid var(--border)' }}
                  value={adjustmentReason} 
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  required
                >
                  <option value="Cycle Count">Cycle Count Verification</option>
                  <option value="Stock Received">Inbound Fulfillment Received</option>
                  <option value="Damaged Goods">Quarantine / Defective Removal</option>
                  <option value="Lost / Missing">Shrinkage Mitigation</option>
                  <option value="Correction">Administrative Correction</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <Button type="button" variant="ghost" onClick={() => setIsAdjustModalOpen(false)} style={{ flex: 1, padding: '1rem' }}>Discard Action</Button>
                <Button type="submit" variant="primary" style={{ flex: 1, padding: '1rem' }} className="pulse">Commit Telemetry Change</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminInventory;
