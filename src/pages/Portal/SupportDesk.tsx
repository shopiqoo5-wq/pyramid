import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { 
  LuLifeBuoy, LuPlus, LuMessageSquare, LuClock, 
  LuCheck, LuInfo, LuSend, LuTag, LuImage, LuX, LuChevronRight
} from 'react-icons/lu';
import { Button, Input, Modal, Table, Badge, Card, EmptyState } from '../../components/ui';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Order Issue', 'Return Request', 'Damaged Product', 'Payment Issue', 'General Support'] as const;
const PRIORITIES = ['Low', 'Medium', 'High'] as const;

const SupportDesk: React.FC = () => {
  const { supportTickets, createTicket, addTicketMessage, currentUser, orders, locations } = useStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const [newTicket, setNewTicket] = useState({ 
    title: '', 
    description: '', 
    category: 'General Support' as typeof CATEGORIES[number], 
    priority: 'Medium' as typeof PRIORITIES[number],
    relatedOrderId: '',
    relatedLocationId: ''
  });
  
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [createAttachment, setCreateAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const myTickets = supportTickets.filter(t => t.companyId === currentUser?.companyId);
  const selectedTicket = supportTickets.find(t => t.id === selectedTicketId);

  const handleCreate = async () => {
    if (!newTicket.title || !newTicket.description) return;
    await createTicket({
      companyId: currentUser!.companyId!,
      userId: currentUser!.id,
      ...newTicket,
      attachments: createAttachment ? [createAttachment] : []
    });
    setIsCreateModalOpen(false);
    setCreateAttachment(null);
    setNewTicket({ 
      title: '', 
      description: '', 
      category: 'General Support', 
      priority: 'Medium',
      relatedOrderId: '',
      relatedLocationId: ''
    });
  };

  const handleSendMessage = () => {
    if ((!newMessage.trim() && !attachment) || !selectedTicketId) return;
    addTicketMessage(selectedTicketId, currentUser!.id, newMessage, false, attachment || undefined);
    setNewMessage('');
    setAttachment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCreateMode: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isCreateMode) setCreateAttachment(reader.result as string);
        else setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusBadge = (status: string, createdAt?: string) => {
    const isAtRisk = status === 'Open' && createdAt && (new Date().getTime() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000);
    
    if (isAtRisk) return <Badge variant="danger" className="animate-pulse shadow-glow-danger"><LuClock size={12}/> SLA AT RISK</Badge>;

    switch(status) {
      case 'Open': return <Badge variant="warning"><LuInfo size={12}/> Open</Badge>;
      case 'In Progress': return <Badge variant="info"><LuClock size={12}/> In Progress</Badge>;
      case 'Resolved': return <Badge variant="success"><LuCheck size={12}/> Resolved</Badge>;
      case 'Rejected': return <Badge variant="danger"><LuX size={12}/> Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Corporate Support Hub</h2>
          <p className="text-muted">Direct assistance for logistics, billing, and procurement anomalies.</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} className="lift">
          <LuPlus size={18} /> Raise Support Ticket
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Pending Response', value: myTickets.filter(t => t.status === 'Open').length, color: 'var(--primary)' },
          { label: 'Active Issues', value: myTickets.filter(t => t.status === 'In Progress').length, color: 'var(--info)' },
          { label: 'SLA Resolved', value: myTickets.filter(t => t.status === 'Resolved').length, color: 'var(--success)' },
          { label: 'Total Requests', value: myTickets.length, color: 'var(--text-main)' }
        ].map((stat, i) => (
          <Card key={i} className="glass-surface" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</span>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: stat.color, marginTop: '0.5rem' }}>{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="glass-surface" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '20px' }}>
        <Table 
          columns={[
            { key: 'id', header: 'Ticket #', render: (t) => <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{t.customId}</strong> },
            { key: 'title', header: 'Subject', render: (t) => (
              <div>
                <div style={{ fontWeight: 800 }}>{t.title}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                  <LuTag size={12}/> {t.category} 
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: t.priority === 'High' ? 'var(--danger)' : 'var(--text-muted)' }}>{t.priority} Priority</span>
                </div>
              </div>
            )},
            { key: 'status', header: 'Status', render: (t) => getStatusBadge(t.status, t.createdAt) },
            { key: 'updated', header: 'Last Update', render: (t) => <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(t.updatedAt).toLocaleDateString()}</span> },
            { key: 'actions', header: '', render: (t) => (
                <button 
                  className="icon-btn-premium sm" 
                  onClick={() => setSelectedTicketId(t.id)}
                  title="View Discussion Thread"
                  style={{ width: 'auto', padding: '0 0.75rem', gap: '0.4rem', borderRadius: '10px' }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Vitals</span>
                  <LuChevronRight size={14} />
                </button>
            )}
          ]}
          data={myTickets}
        />
        {myTickets.length === 0 && (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              icon={LuLifeBuoy}
              title="No Support History"
              description="Need help? Submit a ticket and our team will assist you within SLA limits. Our dispatchers are standing by."
              variant="glass"
              action={
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                  <LuPlus size={18} /> Raise First Ticket
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Submit Support Request">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <Input 
             label="What's the issue? (Broad Subject)" 
             placeholder="e.g. Shipment #ORD-2024-X missing 2 units"
             value={newTicket.title} 
             onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
           />
           
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Category</label>
                <div className="filter-select-wrap-premium">
                  <select className="select-premium" value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value as any})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Priority</label>
                <div className="filter-select-wrap-premium">
                  <select className="select-premium" value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p} Priority</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Link to Order (Internal Protocol)</label>
                <div className="filter-select-wrap-premium">
                  <select 
                    className="select-premium" 
                    value={newTicket.relatedOrderId} 
                    onChange={e => setNewTicket({...newTicket, relatedOrderId: e.target.value})}
                  >
                    <option value="">No linked order</option>
                    {orders.filter(o => o.companyId === currentUser?.companyId).map(o => (
                      <option key={o.id} value={o.id}>Order #{o.customId || o.id.slice(0,8)} (₹{o.netAmount})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Related Site (Node)</label>
                <div className="filter-select-wrap-premium">
                  <select 
                    className="select-premium" 
                    value={newTicket.relatedLocationId} 
                    onChange={e => setNewTicket({...newTicket, relatedLocationId: e.target.value})}
                  >
                    <option value="">No linked site</option>
                    {locations.filter(l => l.companyId === currentUser?.companyId).map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

           <div>
             <label className="label">Detailed Background</label>
             <textarea 
               className="input" 
               style={{ width: '100%', minHeight: '140px', padding: '1rem', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }} 
               placeholder="Please provide order numbers, specific SKU names, and timestamps for faster resolution..."
               value={newTicket.description}
               onChange={e => setNewTicket({...newTicket, description: e.target.value})}
             />
           </div>
           
           <div>
             <label className="label">Evidence & Documentation</label>
             <div 
               onClick={() => createFileInputRef.current?.click()}
               style={{ 
                 padding: '2rem', border: '2px dashed var(--border)', borderRadius: '16px', 
                 textAlign: 'center', background: 'rgba(var(--primary-rgb), 0.02)', 
                 cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
               }}
               className="lift-sm"
             >
                <input 
                  type="file" 
                  ref={createFileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, true)}
                />
                {createAttachment ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={createAttachment} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '1px solid var(--border)' }} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCreateAttachment(null); }}
                      style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}
                    >
                      <LuX size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <LuImage size={32} style={{ color: 'var(--primary)', opacity: 0.6, marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Upload Incident Documentation</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Supports high-resolution PNG, JPG (Max 5.0 MB)</div>
                  </>
                )}
             </div>
           </div>

           <Button 
             variant="primary" 
             onClick={handleCreate} 
             disabled={!newTicket.title || !newTicket.description}
             style={{ marginTop: '0.5rem', fontWeight: 800 }}
           >
             Confirm Submission
           </Button>
        </div>
      </Modal>

      {/* Ticket Details / Chat Modal */}
      <Modal 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicketId(null)} 
        title={`Support Thread: ${selectedTicket?.customId}`} 
        className="glass-surface"
        style={{ maxWidth: '800px' }}
      >
        {selectedTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', gap: '1.5rem' }}>
            <div style={{ flexShrink: 0, background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedTicket.title}</h3>
                  {selectedTicket.assignedTo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
                       <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>Dispatcher Online</span>
                    </div>
                  )}
                </div>
                {getStatusBadge(selectedTicket.status, selectedTicket.createdAt)}
              </div>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.8 }}>{selectedTicket.description}</p>
              
              {/* Audit Timeline */}
              <div style={{ display: 'flex', gap: '2rem', padding: '1rem 0', borderTop: '1px dashed var(--border)' }}>
                 {[
                   { label: 'Created', state: 'completed', time: new Date(selectedTicket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
                   { label: 'Assigned', state: selectedTicket.assignedTo ? 'completed' : 'pending', time: selectedTicket.assignedTo ? 'Verified' : 'In Queue' },
                   { label: 'Resolved', state: selectedTicket.status === 'Resolved' ? 'completed' : 'active', time: selectedTicket.status === 'Resolved' ? 'Success' : 'Active' },
                 ].map((step, idx) => (
                   <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', opacity: step.state === 'pending' ? 0.4 : 1 }}>
                      <div style={{ 
                        width: '24px', height: '24px', borderRadius: '50%', 
                        background: step.state === 'completed' ? 'var(--success)' : (step.state === 'active' ? 'var(--primary)' : 'var(--border)'),
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                      }}>
                        {step.state === 'completed' ? <LuCheck size={14} /> : idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>{step.label}</div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.6 }}>{step.time}</div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <AnimatePresence>
                {selectedTicket.messages?.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      alignSelf: msg.isStaff ? 'flex-start' : 'flex-end', 
                      maxWidth: '85%', 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      alignItems: msg.isStaff ? 'flex-start' : 'flex-end'
                    }}
                  >
                    <div style={{ 
                      background: msg.isStaff ? 'var(--surface-hover)' : 'var(--primary)',
                      color: msg.isStaff ? 'var(--text-main)' : '#fff',
                      padding: '1.25rem',
                      borderRadius: msg.isStaff ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: '0.95rem',
                      lineHeight: 1.5
                    }}>
                      {msg.message}
                      {msg.imageUrl && (
                        <div style={{ marginTop: '1rem', borderRadius: '12px', overflow: 'hidden' }}>
                          <img src={msg.imageUrl} alt="Proof" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {msg.isStaff ? 'Dispatch Support Team' : 'You'} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {selectedTicket.status === 'In Progress' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}
                >
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'typing 1.4s infinite' }} />
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'typing 1.4s infinite 0.2s' }} />
                  <div className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'typing 1.4s infinite 0.4s' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', marginLeft: '4px' }}>Support is typing...</span>
                </motion.div>
              )}

              {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <LuMessageSquare size={40} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Awaiting Support Pulse</div>
                  <div style={{ fontSize: '0.8rem' }}>Your ticket is in the dispatch queue.</div>
                </div>
              )}
            </div>

            {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                {attachment && (
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={attachment} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                    <button onClick={() => setAttachment(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <LuX size={14} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Input 
                    placeholder="Provide additional details or respond to support team..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    autoFocus
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <LuImage size={20} />
                  </Button>
                  <Button variant="primary" onClick={handleSendMessage} className="lift" style={{ padding: '0 2rem' }}>
                    <LuSend size={20} />
                  </Button>
                </div>
              </div>
            )}
            
            {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed') && (
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--success-bg)', borderRadius: '16px', color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <LuCheck size={20} /> This incident has been marked as {selectedTicket.status}.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SupportDesk;
