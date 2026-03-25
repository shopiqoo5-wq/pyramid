import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { Card, Table, Button, Input } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { 
  LuSignature, 
  LuClock, 
  LuPen, 
  LuFileText,
  LuFileCheck,
  LuTrendingUp,
  LuShield,
  LuPlus,
  LuTrash2,
  LuDownload,
  LuRefreshCw,
  LuUserPlus
} from 'react-icons/lu';
// Static import removed to fix INEFFECTIVE_DYNAMIC_IMPORT warning.
// generateQuotationPDF is now imported dynamically within the action handler.

const Contracts: React.FC = () => {
  const { companies, products, contracts, quotations, settings, addContract, updateContract, deleteContract, addQuotation, updateQuotationStatus, convertToContract } = useStore();
  const [activeView, setActiveView] = useState<'agreements' | 'quotations'>('agreements');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuoModalOpen, setIsQuoModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [newContract, setNewContract] = useState({ companyId: '', type: '', startDate: '', endDate: '', value: '', renewalTerms: '', documentUrl: '' });
  const [newQuo, setNewQuo] = useState<any>(() => ({
    companyId: '',
    prospectName: '',
    prospectEmail: '',
    prospectPhone: '',
    items: [],
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  }));

  const contractsData = contracts.map(c => {
    const company = companies.find(comp => comp.id === c.companyId);
    return {
      ...c,
      clientName: company?.name || 'Unknown Client',
      formattedStartDate: new Date(c.startDate).toLocaleDateString(),
      formattedEndDate: new Date(c.endDate).toLocaleDateString(),
    };
  });

  const handleCreateContract = () => {
    if (!newContract.companyId || !newContract.type || !newContract.startDate || !newContract.endDate) {
      return alert('All fields are required.');
    }
    addContract({
      companyId: newContract.companyId,
      type: newContract.type,
      startDate: new Date(newContract.startDate).toISOString(),
      endDate: new Date(newContract.endDate).toISOString(),
      value: newContract.value ? Number(newContract.value) : undefined,
      renewalTerms: newContract.renewalTerms,
      documentUrl: newContract.documentUrl
    });
    setIsAddModalOpen(false);
    setNewContract({ companyId: '', type: '', startDate: '', endDate: '', value: '', renewalTerms: '', documentUrl: '' });
  };

  const handleOpenEdit = (contract: any) => {
    setEditingContract({
      ...contract,
      startDate: new Date(contract.startDate).toISOString().split('T')[0],
      endDate: new Date(contract.endDate).toISOString().split('T')[0],
      value: contract.value || '',
      renewalTerms: contract.renewalTerms || '',
      documentUrl: contract.documentUrl || ''
    });
    setIsEditModalOpen(true);
    setIsViewModalOpen(false);
  };

  const handleUpdateContract = () => {
    if (!editingContract.startDate || !editingContract.endDate) return alert('Dates are required.');
    updateContract(editingContract.id, {
      type: editingContract.type,
      startDate: new Date(editingContract.startDate).toISOString(),
      endDate: new Date(editingContract.endDate).toISOString(),
      value: editingContract.value ? Number(editingContract.value) : undefined,
      renewalTerms: editingContract.renewalTerms,
      documentUrl: editingContract.documentUrl
    });
    setIsEditModalOpen(false);
    setEditingContract(null);
  };

  const handleAddQuoItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || newQuo.items.find((i: any) => i.productId === productId)) return;
    setNewQuo({
      ...newQuo,
      items: [...newQuo.items, {
        id: Math.random().toString(36).substring(7),
        productId,
        quantity: 1,
        unitPrice: product.basePrice,
        total: product.basePrice
      }]
    });
  };

  const handleUpdateQuoItem = (productId: string, quantity: number) => {
    setNewQuo({
      ...newQuo,
      items: newQuo.items.map((i: any) => 
        i.productId === productId 
          ? { ...i, quantity, total: i.unitPrice * quantity } 
          : i
      )
    });
  };

  const handleRemoveQuoItem = (productId: string) => {
    setNewQuo({ ...newQuo, items: newQuo.items.filter((i: any) => i.productId !== productId) });
  };

  const calculateQuoTotals = () => {
    const totalAmount = newQuo.items.reduce((s: number, i: any) => s + i.total, 0);
    const gstAmount = totalAmount * 0.18;
    return { totalAmount, gstAmount, netAmount: totalAmount + gstAmount };
  };

  const handleCreateQuotation = () => {
    const { totalAmount, gstAmount, netAmount } = calculateQuoTotals();
    if (!newQuo.companyId && !newQuo.prospectName) return alert('Select a client or enter prospect name.');
    if (newQuo.items.length === 0) return alert('Add at least one item.');

    addQuotation({
      ...newQuo,
      totalAmount,
      gstAmount,
      netAmount,
      validUntil: new Date(newQuo.validUntil).toISOString()
    });
    setIsQuoModalOpen(false);
    setNewQuo({ companyId: '', prospectName: '', prospectEmail: '', prospectPhone: '', items: [], validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: '' });
  };

  const handleRenewContract = (contract: any) => {
    const nextStartDate = new Date(contract.endDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
    setEditingContract({
      ...contract,
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    });
    setIsEditModalOpen(true);
    setIsViewModalOpen(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Corporate Registry & Quotation Command</h2>
          <p className="text-muted">Orchestrate SLAs, generate legal quotations, and manage strategic lock-ins.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={() => setIsQuoModalOpen(true)} className="lift" style={{ border: '1px solid var(--border)' }}>
            <LuFileText size={18} /> Generate Quote
          </Button>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="lift">
            <LuSignature size={18} /> New SLA Agreement
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveView('agreements')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: activeView === 'agreements' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeView === 'agreements' ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.3s' }}
        >
          MASTER AGREEMENTS ({contracts.length})
        </button>
        <button 
          onClick={() => setActiveView('quotations')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: activeView === 'quotations' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeView === 'quotations' ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.3s' }}
        >
          SALES QUOTATIONS ({quotations.length})
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Active Contracts', value: contracts.filter(c => c.status === 'Active').length, icon: <LuFileCheck />, color: 'var(--success)' },
          { label: 'Pending Renewals', value: contracts.filter(c => c.status === 'Expiring Soon').length, icon: <LuClock />, color: 'var(--warning)' },
          { label: 'Total Value Locked', value: `₹${(contracts.reduce((s, c) => s + (c.value || 0), 0) / 1000000).toFixed(1)}M`, icon: <LuTrendingUp />, color: 'var(--primary)' },
          { label: 'Legal Compliance', value: '100%', icon: <LuShield />, color: 'var(--info)' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="quick-stat lift glass-surface"
          >
             <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
               {stat.icon}
             </div>
             <div>
               <div className="quick-stat-label">{stat.label}</div>
               <div className="quick-stat-value" style={{ color: stat.color, fontSize: '1.5rem' }}>{stat.value}</div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      {activeView === 'agreements' ? (
        <Card className="glass-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <Table 
            columns={[
              { 
                key: 'clientName', 
                header: 'Client Associate', 
                render: (r) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                     <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{r.clientName.charAt(0)}</div>
                     <span style={{ fontWeight: 700 }}>{r.clientName}</span>
                  </div>
                ) 
              },
              { key: 'type', header: 'Registry Type', render: (r) => <span className="status-badge info" style={{ border: '1px solid var(--border)' }}>{r.type.toUpperCase()}</span> },
              { 
                  key: 'dates', 
                  header: 'Validity Period', 
                  render: (r) => (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Until {r.formattedEndDate}</span>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>Started {r.formattedStartDate}</span>
                      </div>
                  )
              },
              { 
                key: 'status', 
                header: 'Compliance State', 
                render: (r) => (
                  <span className={`status-badge ${r.status === 'Active' ? 'success' : 'warning'}`}>
                    {r.status === 'Active' ? <LuSignature size={12} /> : <LuClock size={12} />}
                    {r.status.toUpperCase()}
                  </span>
                ) 
              },
              { 
                key: 'actions', 
                header: '', 
                render: (r) => (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" className="lift" style={{ border: '1px solid var(--border)' }} onClick={() => { setSelectedContract(r); setIsViewModalOpen(true); }}>View Ledger</Button>
                    <Button size="sm" variant="ghost" className="lift" style={{ border: '1px solid var(--border)' }} onClick={() => handleOpenEdit(r)}><LuPen size={14} /></Button>
                  </div>
                ) 
              }
            ]} 
            data={contractsData} 
          />
        </Card>
      ) : (
        <Card className="glass-surface" style={{ padding: 0, overflow: 'hidden' }}>
          <Table 
            columns={[
              { 
                key: 'client', 
                header: 'Recipient Entity', 
                render: (r: any) => {
                  const company = companies.find(c => c.id === r.companyId);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: r.companyId ? 'var(--primary-light)' : 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: r.companyId ? 'var(--primary)' : 'var(--warning)' }}>{r.companyId ? 'C' : 'P'}</div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{company?.name || r.prospectName}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{r.prospectEmail || 'System Associate'}</div>
                      </div>
                    </div>
                  );
                }
              },
              { key: 'id', header: 'Reference', render: (r: any) => <code style={{ fontWeight: 800 }}>{r.customId}</code> },
              { key: 'value', header: 'Quote Value', render: (r: any) => <strong style={{ color: 'var(--primary)' }}>₹{r.netAmount.toLocaleString()}</strong> },
              { key: 'expires', header: 'Expires', render: (r: any) => <span style={{ fontSize: '0.85rem' }}>{new Date(r.validUntil).toLocaleDateString()}</span> },
              { key: 'status', header: 'Status', render: (r: any) => <span className={`status-badge ${r.status === 'Draft' ? 'ghost' : r.status === 'Accepted' || r.status === 'Converted' ? 'success' : 'info'}`}>{r.status.toUpperCase()}</span> },
              { 
                key: 'actions', 
                header: '', 
                render: (r: any) => (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="lift" 
                      style={{ border: '1px solid var(--border)' }} 
                      onClick={async () => {
                        const { generateQuotationPDF } = await import('../../lib/pdfGenerator');
                        generateQuotationPDF(r, companies.find(c => c.id === r.companyId), products, settings);
                      }}
                    >
                      <LuDownload size={14} />
                    </Button>
                    {r.status === 'Accepted' && (
                       <Button size="sm" variant="primary" className="lift" onClick={() => convertToContract(r.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}><LuRefreshCw size={12} /> Convert to SLA</Button>
                    )}
                    {r.status === 'Draft' && (
                       <Button size="sm" variant="secondary" className="lift" onClick={() => updateQuotationStatus(r.id, 'Sent')} style={{ fontSize: '0.7rem' }}>Issue</Button>
                    )}
                  </div>
                ) 
              }
            ]} 
            data={quotations} 
          />
        </Card>
      )}

      {/* Quotation Creator Modal */}
      <Modal isOpen={isQuoModalOpen} onClose={() => setIsQuoModalOpen(false)} title="Corporate Quotation Engine" className="glass-surface" style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
             <Card style={{ padding: '1.5rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                <h5 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LuSignature size={16}/> Entity Identification</h5>
                <select 
                  value={newQuo.companyId} onChange={e => setNewQuo({...newQuo, companyId: e.target.value, prospectName: '', prospectEmail: '', prospectPhone: ''})}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', marginBottom: '1rem' }}
                >
                  <option value="">Select Existing Client...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                
                {!newQuo.companyId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800 }}><LuUserPlus size={14}/> OR ENTER NEW PROSPECT</div>
                    <Input label="Prospect Name" value={newQuo.prospectName} onChange={e => setNewQuo({...newQuo, prospectName: e.target.value})} placeholder="e.g. Acme Corp Lead" />
                    <Input label="Direct Email" value={newQuo.prospectEmail} onChange={e => setNewQuo({...newQuo, prospectEmail: e.target.value})} placeholder="poc@example.com" />
                  </div>
                )}
             </Card>

             <Card style={{ padding: '1.5rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                <h5 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LuClock size={16}/> Proposal Lifecycle</h5>
                <Input label="Validity End Date" type="date" value={newQuo.validUntil} onChange={e => setNewQuo({...newQuo, validUntil: e.target.value})} />
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>INTERNAL NOTES</label>
                  <textarea 
                    value={newQuo.notes} onChange={e => setNewQuo({...newQuo, notes: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', minHeight: '100px', resize: 'none' }}
                    placeholder="Enter strategic context or private deal terms..."
                  />
                </div>
             </Card>
          </div>

          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LuPlus size={18} className="text-primary"/> Proposal Line Items</h5>
                <select 
                  onChange={e => { if(e.target.value) handleAddQuoItem(e.target.value); e.target.value = ''; }}
                  style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--primary)', background: 'rgba(var(--primary-rgb), 0.05)', color: 'var(--primary)', fontWeight: 700 }}
                >
                  <option value="">Add Product...</option>
                  {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.basePrice}</option>)}
                </select>
             </div>

             <div style={{ background: 'var(--surface)', borderRadius: '18px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead style={{ background: 'var(--surface-hover)', fontSize: '0.75rem', textAlign: 'left' }}>
                      <tr>
                        <th style={{ padding: '1rem' }}>DESCRIPTION</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>QUANTITY</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>UNIT PRICE</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>LINE TOTAL</th>
                        <th style={{ padding: '1rem' }}></th>
                      </tr>
                   </thead>
                   <tbody>
                      {newQuo.items.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>No items added to proposal yet.</td></tr>
                      ) : newQuo.items.map((item: any) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                             <td style={{ padding: '1rem' }}>
                                <div style={{ fontWeight: 800 }}>{product?.name}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{product?.sku}</div>
                             </td>
                             <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <input 
                                  type="number" value={item.quantity} min={1}
                                  onChange={e => handleUpdateQuoItem(item.productId, parseInt(e.target.value) || 1)}
                                  style={{ width: '70px', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}
                                />
                             </td>
                             <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>₹{item.unitPrice.toLocaleString()}</td>
                             <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800 }}>₹{item.total.toLocaleString()}</td>
                             <td style={{ padding: '1rem', textAlign: 'right' }}>
                                <Button size="sm" variant="ghost" onClick={() => handleRemoveQuoItem(item.productId)} style={{ color: 'var(--danger)' }}><LuTrash2 size={16}/></Button>
                             </td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '2rem', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '18px' }}>
                <div style={{ textAlign: 'right' }}>
                   <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>TAXABLE GPV</div>
                   <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{calculateQuoTotals().totalAmount.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>GST (18%)</div>
                   <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{calculateQuoTotals().gstAmount.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right', color: 'var(--primary)' }}>
                   <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>TOTAL QUOTE</div>
                   <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>₹{calculateQuoTotals().netAmount.toLocaleString()}</div>
                </div>
             </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
             <Button variant="ghost" onClick={() => setIsQuoModalOpen(false)} style={{ borderRadius: '12px' }}>Discard Proposal</Button>
             <Button variant="primary" onClick={handleCreateQuotation} className="lift shadow-glow" style={{ padding: '0.8rem 2.5rem', borderRadius: '14px', fontWeight: 900 }}>EXECUTE & ISSUE QUOTATION</Button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Provision New SLA Agreement" className="glass-surface">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>Corporate Associate</label>
            <select 
              value={newContract.companyId} onChange={e => setNewContract({...newContract, companyId: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
            >
              <option value="">Select Target Client...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input label="Agreement Classification" value={newContract.type} onChange={e => setNewContract({...newContract, type: e.target.value})} placeholder="e.g. Master Supply Agreement" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Input label="Activation Date" type="date" value={newContract.startDate} onChange={e => setNewContract({...newContract, startDate: e.target.value})} />
            <Input label="Termination Date" type="date" value={newContract.endDate} onChange={e => setNewContract({...newContract, endDate: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Input label="Estimated Value (₹)" type="number" value={newContract.value} onChange={e => setNewContract({...newContract, value: e.target.value})} />
            <Input label="Governance Terms" value={newContract.renewalTerms} onChange={e => setNewContract({...newContract, renewalTerms: e.target.value})} placeholder="e.g. Annual Auto-Renewal" />
          </div>
          <Button variant="primary" onClick={handleCreateContract} className="lift" style={{ marginTop: '1rem' }}>Execute Agreement</Button>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modify Agreement Terms" className="glass-surface">
        {editingContract && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <LuFileText className="text-primary" size={24} />
               <div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>Authorized Associate</div>
                  <div style={{ fontWeight: 800 }}>{editingContract.clientName}</div>
               </div>
            </div>
            <Input label="Agreement Type" value={editingContract.type} onChange={e => setEditingContract({...editingContract, type: e.target.value})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <Input label="Activation" type="date" value={editingContract.startDate} onChange={e => setEditingContract({...editingContract, startDate: e.target.value})} />
              <Input label="Termination" type="date" value={editingContract.endDate} onChange={e => setEditingContract({...editingContract, endDate: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem' }}>
               <Button variant="ghost" onClick={() => { if(confirm('Purge mapping?')) deleteContract(editingContract.id); setIsEditModalOpen(false); }} style={{ color: 'var(--danger)' }}>Purge Record</Button>
               <Button variant="primary" onClick={handleUpdateContract} className="lift">Commit Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Agreement Ledger" className="glass-surface">
        {selectedContract && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <Card style={{ padding: '1.25rem', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Agreement ID</div>
                  <code style={{ fontWeight: 800 }}>{selectedContract.id}</code>
               </Card>
               <Card style={{ padding: '1.25rem', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                  <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Estimated GPV</div>
                  <strong style={{ fontSize: '1.1rem' }}>₹{selectedContract.value?.toLocaleString() || 'N/A'}</strong>
               </Card>
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                   <span className="text-muted">Lifecycle State</span>
                   <span className={`status-badge ${selectedContract.status === 'Active' ? 'success' : 'warning'}`}>{selectedContract.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                   <span className="text-muted">Commencement</span>
                   <span style={{ fontWeight: 600 }}>{selectedContract.formattedStartDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                   <span className="text-muted">Expiration</span>
                   <span style={{ fontWeight: 600 }}>{selectedContract.formattedEndDate}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                   <span className="text-muted">Governance Terms</span>
                   <p style={{ fontWeight: 600, margin: 0 }}>{selectedContract.renewalTerms || 'Standard Annual Review'}</p>
                </div>
             </div>
             
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => handleOpenEdit(selectedContract)} className="lift" style={{ flex: 1, border: '1px solid var(--border)' }}>Adjust Terms</Button>
                <Button variant="primary" onClick={() => handleRenewContract(selectedContract)} className="lift" style={{ flex: 1 }}>1-Click Renewal</Button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contracts;
