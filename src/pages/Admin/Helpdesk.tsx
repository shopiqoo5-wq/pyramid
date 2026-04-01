import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { 
  LuSearch, LuTag, LuUser, 
  LuClock, LuX, LuImage, LuCheck
} from 'react-icons/lu';
import { Button, Input, Modal, Table, Badge, Card } from '../../components/ui';

const Helpdesk: React.FC = () => {
  const { supportTickets, companies, users, updateTicketStatus, addTicketMessage, currentUser, autoTriageAll } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTicket = supportTickets.find(t => t.id === selectedTicketId);
  
  const staffs = users.filter(u => ['admin', 'warehouse_staff'].includes(u.role));

  const filteredTickets = supportTickets.filter(t => {
    const company = companies.find(c => c.id === t.companyId);
    const matchesSearch = t.customId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendMessage = () => {
    if ((!newMessage.trim() && !attachment) || !selectedTicketId) return;
    addTicketMessage(selectedTicketId, currentUser!.id, newMessage, true, attachment || undefined);
    setNewMessage('');
    setAttachment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachment(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getStatusBadge = (status: string, createdAt?: string, sentimentScore?: number) => {
    const isAtRisk = status === 'Open' && createdAt && (new Date().getTime() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000);

    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isAtRisk ? (
          <Badge variant="danger" className="animate-pulse shadow-glow-danger">SLA AT RISK</Badge>
        ) : (
          <>
            {status === 'Open' && <Badge variant="warning">New Issue</Badge>}
            {status === 'In Progress' && <Badge variant="info">Active</Badge>}
            {status === 'Resolved' && <Badge variant="success">Resolved</Badge>}
            {status === 'Rejected' && <Badge variant="danger">Rejected</Badge>}
          </>
        )}
        {sentimentScore !== undefined && status !== 'Resolved' && (
          <div 
            title={`Sentiment Pulse: ${Math.round(sentimentScore * 100)}% Positive`}
            style={{ 
              width: '12px', height: '12px', borderRadius: '50%', 
              background: sentimentScore < 0.4 ? 'var(--danger)' : (sentimentScore < 0.7 ? 'var(--warning)' : 'var(--success)'),
              boxShadow: `0 0 10px ${sentimentScore < 0.4 ? 'var(--danger)' : (sentimentScore < 0.7 ? 'var(--warning)' : 'var(--success)')}`
            }} 
          />
        )}
      </div>
    );
  };

  const QUICK_RESPONSES = [
    { label: 'Acknowledge', text: 'We have received your request and a specialist has been assigned to investigate this immediately.' },
    { label: 'Out of Stock', text: 'We apologize, but this specific SKU is currently out of stock due to a surge in demand. We are prioritizing your backorder.' },
    { label: 'Resolved (Standard)', text: 'The issue has been successfully resolved. Please verify on your end and let us know if you need anything else.' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '4rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Helpdesk Terminal</h2>
          <p className="text-muted">Global support triage and enterprise SLA management.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" onClick={autoTriageAll} className="lift">Run Auto-Triage</Button>
          <Button variant="primary" className="lift shadow-glow">Audit Resolution Log</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Incident Volume', value: supportTickets.length, icon: <LuTag />, color: 'var(--primary)' },
          { label: 'Open Triage', value: supportTickets.filter(t => t.status === 'Open').length, icon: <LuClock />, color: 'var(--warning)' },
          { label: 'Avg Resolution', value: '4.2h', icon: <LuUser />, color: 'var(--success)' },
          { label: 'SLA Breach Risk', value: supportTickets.filter(t => t.status === 'Open' && t.priority === 'High').length, icon: <LuX />, color: 'var(--danger)' }
        ].map((stat, i) => (
          <Card key={i} className="glass-surface lift" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-hover)', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              {stat.icon}
            </div>
            <div>
               <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="glass-surface" style={{ padding: '1.25rem', borderRadius: '20px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <LuSearch className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Search by ID, Status, or Corporate Entity..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: '220px', background: 'var(--surface)' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Priority Feed (All)</option>
          <option value="Open">Unassigned / Open</option>
          <option value="In Progress">Actively Resolving</option>
          <option value="Resolved">Finalized</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="glass-surface" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '20px' }}>
        <Table 
          columns={[
            { key: 'id', header: 'Incident #', render: (t) => <strong style={{ fontFamily: 'monospace' }}>{t.customId}</strong> },
            { key: 'client', header: 'Entity', render: (t) => {
               const company = companies.find(c => c.id === t.companyId);
               return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
                        {company?.name.charAt(0)}
                     </div>
                     <span style={{ fontWeight: 700 }}>{company?.name || 'Unknown'}</span>
                  </div>
               );
            }},
            { key: 'title', header: 'Subject', render: (t) => (
              <div>
                <div style={{ fontWeight: 700 }}>{t.title}</div>
                <div className="text-muted" style={{ fontSize: '0.7rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '2px' }}>
                  <LuTag size={10}/> {t.category} 
                  <span style={{ color: t.priority === 'High' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>{t.priority}</span>
                </div>
              </div>
            )},
            { key: 'assignee', header: 'Assignee', render: (t) => (
               <div style={{ fontSize: '0.8rem', color: t.assignedTo ? 'var(--text-main)' : 'var(--warning)', fontWeight: 600 }}>
                  <LuUser size={12} style={{ marginRight: '4px' }} />
                  {users.find(u => u.id === t.assignedTo)?.name || 'UNASSIGNED'}
               </div>
            )},
            { key: 'status', header: 'State / Pulse', render: (t) => getStatusBadge(t.status, t.createdAt, t.sentimentScore) },
            { key: 'actions', header: '', render: (t) => (
              <Button size="sm" variant="ghost" className="lift" onClick={() => setSelectedTicketId(t.id)} style={{ border: '1px solid var(--border)', fontWeight: 700 }}>TRIAGE</Button>
            )}
          ]}
          data={filteredTickets}
        />
      </div>

      <Modal 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicketId(null)} 
        title={`Incident Command: ${selectedTicket?.customId}`} 
        className="glass-surface"
        style={{ maxWidth: '900px' }}
      >
        {selectedTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
              <Card className="glass-surface" style={{ flex: 1, padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedTicket.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
                       <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>Client is Online</span>
                    </div>
                  </div>
                  {getStatusBadge(selectedTicket.status, selectedTicket.createdAt, selectedTicket.sentimentScore)}
                </div>
                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>{selectedTicket.description}</p>
                
                {/* Audit Timeline */}
                <div style={{ display: 'flex', gap: '2rem', padding: '1rem 0', borderTop: '1px dashed var(--border)' }}>
                   {[
                     { label: 'Reported', state: 'completed', time: new Date(selectedTicket.createdAt).toLocaleTimeString() },
                     { label: 'Assigned', state: selectedTicket.assignedTo ? 'completed' : 'pending', time: selectedTicket.assignedTo ? 'Staff Linked' : 'In Triage' },
                     { label: 'Resolution', state: selectedTicket.status === 'Resolved' ? 'completed' : 'active', time: selectedTicket.status === 'Resolved' ? 'Closed' : 'Active' },
                   ].map((step, idx) => (
                     <div key={idx} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', opacity: step.state === 'pending' ? 0.4 : 1 }}>
                        <div style={{ 
                          width: '20px', height: '20px', borderRadius: '50%', 
                          background: step.state === 'completed' ? 'var(--success)' : (step.state === 'active' ? 'var(--primary)' : 'var(--border)'),
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem'
                        }}>
                          {step.state === 'completed' ? <LuCheck size={12} /> : idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.7rem' }}>{step.label}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{step.time}</div>
                        </div>
                     </div>
                   ))}
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><LuClock size={14} /> Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><LuUser size={14} /> Reporter: {users.find(u => u.id === selectedTicket.userId)?.name}</span>
                </div>
              </Card>

              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <label className="label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>Assign Staff</label>
                    <select 
                      className="input" 
                      style={{ width: '100%', fontSize: '0.85rem' }} 
                      value={selectedTicket.assignedTo || ''} 
                      onChange={(e) => updateTicketStatus(selectedTicket.id, selectedTicket.status, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {staffs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={() => updateTicketStatus(selectedTicket.id, 'In Progress')} disabled={selectedTicket.status === 'In Progress'}>
                      Start Resolve
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => updateTicketStatus(selectedTicket.id, 'Rejected')} style={{ color: 'var(--danger)' }}>
                      Reject
                    </Button>
                 </div>
                 <Button variant="primary" size="sm" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => { updateTicketStatus(selectedTicket.id, 'Resolved'); setSelectedTicketId(null); }}>
                    Mark Resolved
                 </Button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
              {selectedTicket.messages?.map((msg) => (
                <div key={msg.id} style={{ 
                  alignSelf: msg.isStaff ? 'flex-end' : 'flex-start', 
                  maxWidth: '80%', 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  alignItems: msg.isStaff ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{ 
                    background: msg.isStaff ? 'var(--primary)' : 'var(--surface-hover)',
                    color: msg.isStaff ? '#fff' : 'var(--text-main)',
                    padding: '1rem 1.25rem',
                    borderRadius: msg.isStaff ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    boxShadow: 'var(--shadow-sm)',
                    border: msg.isStaff ? 'none' : '1px solid var(--border)'
                  }}>
                    {msg.message}
                    {msg.imageUrl && (
                      <div style={{ marginTop: '0.75rem', borderRadius: '12px', overflow: 'hidden' }}>
                        <img src={msg.imageUrl} alt="Proof" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase' }}>
                     {msg.isStaff ? 'Dispatcher Response' : 'Client Message'} • {new Date(msg.createdAt || (msg as any).created_at || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))}

              {selectedTicket.status === 'In Progress' && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.5rem' }}>
                  <div className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)', animation: 'typing 1.4s infinite' }} />
                  <div className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)', animation: 'typing 1.4s infinite 0.2s' }} />
                  <div className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)', animation: 'typing 1.4s infinite 0.4s' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', marginLeft: '4px' }}>Client is typing...</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                {attachment && (
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={attachment} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                    <button onClick={() => setAttachment(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                      <LuX size={14} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0 0.5rem' }}>
                   {QUICK_RESPONSES.map((qr, idx) => (
                     <button 
                       key={idx} 
                       onClick={() => setNewMessage(qr.text)}
                       style={{ 
                         padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700, borderRadius: '8px', 
                         background: 'var(--surface-hover)', border: '1px solid var(--border)', cursor: 'pointer',
                         color: 'var(--text-muted)'
                       }}
                     >
                       + {qr.label}
                     </button>
                   ))}
                </div>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <Input 
                    placeholder="Type professional response or attach resolution notes..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><LuImage size={20} /></Button>
                  <Button variant="primary" onClick={handleSendMessage} style={{ padding: '0 2rem' }}>TRANSMIT</Button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Helpdesk;
