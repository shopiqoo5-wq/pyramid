import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import type { Product, Warehouse } from '../../types';
import  {
  LuSearch,
  LuPlus,
  LuQrCode,
  LuImage,
  LuTrendingDown,
  LuBoxes,
  LuLayoutGrid,
  LuPackageOpen,
  LuPen,
  LuTrash2
} from 'react-icons/lu';
import { Card, Button, Table, Input } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import BulkImportModal from './BulkImportModal';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
// generateMasterQRCodeCatalogPDF is now imported dynamically in the click handler.

const AdminProducts: React.FC = () => {
  const products = useStore(state => state.products);
  const settings = useStore(state => state.settings);
  const addProduct = useStore(state => state.addProduct);
  const updateProduct = useStore(state => state.updateProduct);
  const deleteProduct = useStore(state => state.deleteProduct);
  const inventory = useStore(state => state.inventory);
  const updateStock = useStore(state => state.updateStock);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  
  // New Product State
  const [newProduct, setNewProduct] = useState({ 
    name: '', sku: '', category: '', uom: 'Piece', basePrice: 0, 
    description: '', imageUrl: '', gstRate: 18, hsnCode: '', active: true 
  });

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Inventory State
  const [selectedProductForInventory, setSelectedProductForInventory] = useState<Product | null>(null);
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({}); 

  // Image upload state
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null);
  const [newProductImagePreview, setNewProductImagePreview] = useState<string>('');
  const [editProductImageFile, setEditProductImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  // Mock Warehouses
  const warehouses: Warehouse[] = [
    { id: 'w1', name: 'Main Distribution Center', code: 'W-MAIN', address: 'Delhi', state: 'Delhi' },
    { id: 'w2', name: 'South Regional Hub', code: 'W-SOUTH', address: 'Bangalore', state: 'Karnataka' },
    { id: 'w3', name: 'West Zone Facility', code: 'W-WEST', address: 'Mumbai', state: 'Maharashtra' }
  ];

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockThreshold = 20;
  const lowStockCount = products.filter(p => {
    const total = inventory.filter(i => i.productId === p.id).reduce((sum, item) => sum + item.quantity, 0);
    return total < lowStockThreshold;
  }).length;

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.sku) return alert("Name and SKU are required.");
    
    let finalImageUrl = newProduct.imageUrl || 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=200&h=200&fit=crop';
    
    if (newProductImageFile) {
      setIsUploadingImage(true);
      try {
        // Store inline as a Data URL so it persists via Mongo/API (no object storage)
        finalImageUrl = await fileToDataUrl(newProductImageFile);
      } catch (e) { console.error('Image upload error', e); }
      setIsUploadingImage(false);
    }
    
    addProduct({
      name: newProduct.name,
      sku: newProduct.sku,
      category: newProduct.category || 'General',
      basePrice: newProduct.basePrice || 0,
      uom: newProduct.uom || 'Piece',
      description: newProduct.description || 'New product added via admin.',
      imageUrl: finalImageUrl,
      gstRate: newProduct.gstRate || 18,
      hsnCode: newProduct.hsnCode || '0000',
      active: true
    });
    setIsAddModalOpen(false);
    setNewProduct({ name: '', sku: '', category: '', basePrice: 0, uom: 'Piece', description: '', imageUrl: '', gstRate: 18, hsnCode: '', active: true });
    setNewProductImageFile(null);
    setNewProductImagePreview('');
  };

  const handleEditProduct = async () => {
    if (!editingProduct?.id) return;
    let finalImageUrl = editingProduct.imageUrl;
    if (editProductImageFile) {
      setIsUploadingImage(true);
      try {
        finalImageUrl = await fileToDataUrl(editProductImageFile);
      } catch (e) { console.error('Image upload error', e); }
      setIsUploadingImage(false);
    }
    updateProduct(editingProduct.id, { ...editingProduct, imageUrl: finalImageUrl });
    setIsEditModalOpen(false);
    setEditProductImageFile(null);
  };

  const handleUpdateInventory = () => {
    if (!selectedProductForInventory) return;
    Object.entries(stockUpdates).forEach(([warehouseId, delta]) => {
      if (delta !== 0) {
        updateStock(selectedProductForInventory.id, warehouseId, delta);
      }
    });
    setIsInventoryModalOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getInventoryForProduct = (productId: string) => {
    return inventory.filter(i => i.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Master Global Catalog</h2>
          <p className="text-muted">Control your enterprise product matrix, tax rules, and multi-region stock availability.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button 
            variant="secondary" 
            onClick={async () => {
              const { generateMasterQRCodeCatalogPDF } = await import('../../lib/pdfGenerator');
              const items = products.map(p => {
                const img = document.getElementById(`qr-gen-${p.id}`) as HTMLCanvasElement;
                return {
                  name: p.name,
                  sku: p.sku,
                  qrDataUrl: img?.toDataURL('image/png') || ''
                };
              });
              generateMasterQRCodeCatalogPDF(items, settings);
            }} 
            className="lift"
          >
            <LuQrCode size={18} style={{ marginRight: '8px' }} />
            Print Master QR Sheet
          </Button>
          <Button variant="secondary" onClick={() => setIsBulkImportOpen(true)} className="lift">Bulk Import</Button>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="lift">
            <LuPlus size={18} /> New Integration
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Total Catalog Size', value: products.length, color: 'var(--primary)', icon: <LuLayoutGrid />, bg: 'var(--primary-light)' },
          { label: 'Low Stock Alerts', value: lowStockCount, color: 'var(--danger)', icon: <LuTrendingDown />, bg: 'var(--danger-bg)' },
          { label: 'Active Warehouses', value: warehouses.length, color: 'var(--success)', icon: <LuBoxes />, bg: 'var(--success-bg)' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="quick-stat lift glass-surface"
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              {stat.icon}
            </div>
            <div>
              <div className="quick-stat-label">{stat.label}</div>
              <div className="quick-stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-surface" style={{ padding: '1.25rem' }}>
        <div className="search-box">
          <LuSearch className="search-icon" size={22} />
          <input 
            type="text" 
            placeholder="Search master catalog by name, category, or SKU identifier..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      <Card className="glass-surface" style={{ padding: 0, overflow: 'hidden' }}>
        <Table 
          columns={[
            {
              key: 'product',
              header: 'Enterprise SKU',
              render: (row: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img src={row.imageUrl} alt={row.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                  <div>
                    <div style={{ fontWeight: 800 }}>{row.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>SKU: <span style={{ fontFamily: 'monospace' }}>{row.sku}</span></div>
                  </div>
                </div>
              )
            },
            { key: 'category', header: 'Segment' },
            { key: 'basePrice', header: 'MSRP', render: (row: any) => <span style={{ fontWeight: 800 }}>{formatCurrency(row.basePrice)}</span> },
            { 
              key: 'stock', 
              header: 'Global Stock', 
              render: (row: any) => {
                const totalStock = getInventoryForProduct(row.id);
                const isLow = totalStock < lowStockThreshold;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: isLow ? 'var(--danger)' : 'var(--success)', fontWeight: 800 }}>
                      {totalStock} {row.uom}
                    </span>
                    {isLow && <span style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 700 }}>REORDER REQ.</span>}
                  </div>
                );
              }
            },
            { key: 'status', header: 'Platform State', render: (row: any) => row.active ? <span className="status-badge success">ACTIVE</span> : <span className="status-badge">INACTIVE</span> },
            {
              key: 'actions',
              header: '',
              render: (row: any) => (
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="icon-btn-premium sm" 
                    onClick={() => { setSelectedProductForInventory(row); setIsInventoryModalOpen(true); }}
                    title="Stock Calibration"
                  >
                    <LuPackageOpen size={16} style={{ color: 'var(--success)' }} />
                  </button>
                  <button 
                    className="icon-btn-premium sm" 
                    onClick={() => { setSelectedProductForQR(row); setIsQRModalOpen(true); }}
                    title="Generate QR Label"
                  >
                    <LuQrCode size={16} />
                  </button>
                  <button 
                    className="icon-btn-premium sm" 
                    onClick={() => { setEditingProduct(row); setIsEditModalOpen(true); }}
                    title="Edit System Metadata"
                  >
                    <LuPen size={16} style={{ color: 'var(--primary)' }} />
                  </button>
                  <button 
                    className="icon-btn-premium sm danger" 
                    onClick={() => { if(confirm('Purge from catalog?')) deleteProduct(row.id); }}
                    title="Delete Permanent SKU"
                  >
                    <LuTrash2 size={16} />
                  </button>
                </div>
              )
            }
          ]} 
          data={filteredProducts} 
        />
      </Card>

      {/* Modals with Clean Layouts */}
      
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Provision New SKU Integration"
        style={{ '--primary': '#3b82f6' } as any}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <Input 
            label="System Display Name" 
            value={newProduct.name} 
            onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
            placeholder="e.g. Heavy Duty Degreaser (5L)" 
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input label="Registry SKU" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} placeholder="HD-100" />
            <Input label="Category Segment" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} placeholder="Chemicals" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input label="Standard MSRP (₹)" type="number" value={newProduct.basePrice} onChange={e => setNewProduct({...newProduct, basePrice: Number(e.target.value)})} />
            <Input label="Unit of Measure" value={newProduct.uom} onChange={e => setNewProduct({...newProduct, uom: e.target.value})} placeholder="e.g. Litre / Box" />
          </div>
          
          <div className="input-group">
            <label className="input-label">Product Visual Asset</label>
            <div 
              style={{ border: '2px dashed var(--border)', borderRadius: '16px', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', cursor: 'pointer', transition: 'all 0.2s' }} 
              onClick={() => document.getElementById('new-p-img')?.click()}
              className="hover-lift"
            >
              <input id="new-p-img" type="file" hidden onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setNewProductImageFile(file);
                  setNewProductImagePreview(URL.createObjectURL(file));
                }
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {newProductImagePreview ? <img src={newProductImagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <LuImage size={24} className="text-primary" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Upload Product Key Visual</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>PNG, JPG or WebP (Max 1MB)</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input label="GST Rate (%)" type="number" value={newProduct.gstRate} onChange={e => setNewProduct({...newProduct, gstRate: Number(e.target.value)})} />
            <Input label="HSN Code" value={newProduct.hsnCode} onChange={e => setNewProduct({...newProduct, hsnCode: e.target.value})} placeholder="3402" />
          </div>
          <Button variant="primary" onClick={handleCreateProduct} isLoading={isUploadingImage} className="w-full btn-lg shadow-glow" style={{ marginTop: '1rem' }}>
            Finalize SKU Provisioning
          </Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Catalog Item"
        className="glass-surface"
      >
        {editingProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
            <Input label="System Display Name" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Input label="MSRP (₹)" type="number" value={editingProduct.basePrice || 0} onChange={e => setEditingProduct({...editingProduct, basePrice: Number(e.target.value)})} />
              <Input label="UOM" value={editingProduct.uom || ''} onChange={e => setEditingProduct({...editingProduct, uom: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Input label="GST (%)" type="number" value={editingProduct.gstRate || 0} onChange={e => setEditingProduct({...editingProduct, gstRate: Number(e.target.value)})} />
              <Input label="HSN" value={editingProduct.hsnCode || ''} onChange={e => setEditingProduct({...editingProduct, hsnCode: e.target.value})} />
            </div>
            <Button variant="primary" onClick={handleEditProduct} isLoading={isUploadingImage} className="w-full btn-lg shadow-glow" style={{ marginTop: '1rem' }}>
              Synchronize Catalog Metadata
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Stock Level Calibration"
        className="glass-surface"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {warehouses.map(w => {
              const currentStock = inventory.find(i => i.productId === selectedProductForInventory?.id && i.warehouseId === w.id)?.quantity || 0;
              return (
                <div key={w.id} style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="lift">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{w.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Current Available Holding: {currentStock}</div>
                  </div>
                  <div style={{ width: '120px' }}>
                    <Input type="number" placeholder="+ / -" className="text-center" onChange={e => setStockUpdates({...stockUpdates, [w.id]: Number(e.target.value)})} />
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="primary" onClick={handleUpdateInventory} className="w-full btn-lg shadow-glow">
            Synchronize Distribution Ledger
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        title="Shelf Scanning Token"
      >
        {selectedProductForQR && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #000', textAlign: 'center' }}>
              <h3 style={{ color: '#000', margin: '0 0 1rem 0' }}>{selectedProductForQR.name}</h3>
              <QRCodeSVG value={`p:${selectedProductForQR.id}`} size={200} />
              <div style={{ marginTop: '1.5rem', fontWeight: 800, color: '#000', borderTop: '1px solid #000', paddingTop: '1rem' }}>SCAN TO REORDER</div>
            </div>
            <Button variant="primary" onClick={() => window.print()} className="lift">Print Supply Tag</Button>
          </div>
        )}
      </Modal>

      <BulkImportModal isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} />

      {/* Hidden QR Generation Layer (for PDF export) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {products.map(p => (
          <QRCodeCanvas 
            key={p.id} 
            id={`qr-gen-${p.id}`} 
            value={`p:${p.id}`} 
            size={128} 
            level="H"
          />
        ))}
      </div>
    </div>
  );
};

export default AdminProducts;
