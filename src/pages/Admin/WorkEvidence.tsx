import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { ApiService } from '../../lib/apiService';
import { Card, Badge, Button, Input } from '../../components/ui';
import { 
  LuSearch, LuCheck, LuX, 
  LuCamera, LuMessageSquare, LuImage as LuImageIcon,
  LuFilter, LuClock, LuRefreshCw
} from 'react-icons/lu';

const WorkEvidence: React.FC = () => {
  const currentUser = useStore(state => state.currentUser);
  const workReports = useStore(state => state.workReports);
  const employees = useStore(state => state.employees);
  const users = useStore(state => state.users);
  const locations = useStore(state => state.locations);
  const approveWorkReport = useStore(state => state.approveWorkReport);
  const rejectWorkReport = useStore(state => state.rejectWorkReport);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initSupabase = useStore(state => state.initSupabase);
  const isSupabaseConnected = useStore(state => state.isSupabaseConnected);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await initSupabase();
    setIsRefreshing(false);
  };

  const resolveStaff = useCallback(
    (report: (typeof workReports)[number]) => {
      const emp =
        employees.find((e) => e.id === report.employeeId || e.userId === report.employeeId) ||
        (report.userId ? employees.find((e) => e.userId === report.userId) : undefined);
      if (emp) return { emp, displayName: emp.name || 'Unknown' };
      const uid = report.userId || report.employeeId;
      const user = users.find((u) => u.id === uid);
      if (user) return { emp: undefined, displayName: user.name || user.email || 'Unknown' };
      return { emp: undefined, displayName: 'Unknown' };
    },
    [employees, users]
  );

  // Sorting: Pending first, then newest (search must not throw when no employee row matches)
  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return workReports
      .filter((report) => {
        const { displayName } = resolveStaff(report);
        const matchesSearch =
          !q ||
          displayName.toLowerCase().includes(q) ||
          (report.remarks || '').toLowerCase().includes(q);
        const matchesStatus =
          filterStatus === 'all' ||
          String(report.status || '').toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (String(a.status || '').toLowerCase() === 'pending' && String(b.status || '').toLowerCase() !== 'pending') return -1;
        if (String(b.status || '').toLowerCase() === 'pending' && String(a.status || '').toLowerCase() !== 'pending') return 1;
        return (
          new Date(b.createdAt || (b as any).timestamp || '').getTime() -
          new Date(a.createdAt || (a as any).timestamp || '').getTime()
        );
      });
  }, [workReports, resolveStaff, searchTerm, filterStatus]);

  const handleApprove = (id: string) => {
    if (!currentUser) return;
    approveWorkReport(id, currentUser.id);
  };

  const handleReject = (id: string) => {
    if (!currentUser) return;
    // For MVP phase, direct reject without forcing remarks (though adminRemarks can be added later)
    rejectWorkReport(id, currentUser.id);
  };

  return (
    <div className="admin-container animate-fade-in" style={{ padding: '2rem' }}>
       <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Badge variant="info" style={{ marginBottom: '1rem' }}>QUALITY ASSURANCE HUB</Badge>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Visual Task Ledger
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Audit, verify, and grade photographic evidence submitted by field operatives.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {(isSupabaseConnected || ApiService.hasAuthToken()) && (
            <Button 
              variant="ghost" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ borderRadius: '12px', border: '1px solid var(--primary)', color: 'var(--primary)' }}
            >
              <LuRefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} style={{ marginRight: '8px' }} />
              {isRefreshing ? 'Synchronizing...' : 'Sync with Cloud'}
            </Button>
          )}
        </div>
      </header>

      {/* Control Strip */}
      <Card variant="glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
         <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-hover)', borderRadius: '0.75rem', padding: '0 1rem', flex: 1, minWidth: '300px' }}>
            <LuSearch size={18} color="var(--text-muted)" />
            <Input 
              placeholder="Search by operative name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '100%' }}
            />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LuFilter size={18} color="var(--text-muted)" style={{ marginLeft: '1rem' }} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-surface-hover border border-border text-main rounded-xl p-3 outline-none"
              style={{ minWidth: '150px', cursor: 'pointer' }}
            >
              <option value="all">All Evidence</option>
              <option value="pending">Awaiting QA (Pending)</option>
              <option value="approved">Verified (Approved)</option>
              <option value="rejected">Rejected</option>
            </select>
         </div>
      </Card>

      {/* Evidence Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <AnimatePresence>
          {filteredReports.map(report => {
            const { emp, displayName } = resolveStaff(report);
            const loc = locations.find(l => l.id === emp?.locationId || l.id === report.locationId);
            const st = String(report.status || '').toLowerCase();

            return (
              <motion.div 
                key={report.id || (report as any)._id || report.employeeId + (report.createdAt || '')}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card variant="glass" style={{ 
                  padding: 0, 
                  overflow: 'hidden', 
                  border: st === 'pending' 
                    ? '1px solid var(--warning)' 
                    : st === 'rejected'
                    ? '1px solid var(--danger)'
                    : '1px solid var(--border)',
                  position: 'relative'
                }}>
                  {/* Photo Section */}
                  <div 
                    style={{ height: '200px', background: 'var(--surface-sub)', position: 'relative', cursor: 'pointer' }}
                    onClick={() => report.imageUrl && setFullscreenImage(report.imageUrl)}
                  >
                    {report.imageUrl ? (
                      <img src={report.imageUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', height: '100%', color: 'var(--text-muted)', paddingTop: '4rem' }}>
                         <LuImageIcon size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                         <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>No Image Attached</span>
                      </div>
                    )}
                    
                    {/* Status Badge Overlay */}
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                      {st === 'pending' && <Badge variant="warning" className="pulse">AWAITING QA</Badge>}
                      {st === 'approved' && <Badge variant="success">VERIFIED</Badge>}
                      {st === 'rejected' && <Badge variant="danger">REJECTED</Badge>}
                    </div>

                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '0.25rem 0.5rem', borderRadius: '8px', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <LuClock size={12} />
                      {new Date(report.createdAt || (report as any).timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                        {displayName.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '0.95rem' }}>{displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{loc?.name || 'No Site Assigned'}</div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '1.25rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <LuMessageSquare size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ margin: 0, lineHeight: 1.5 }}>{report.remarks || 'No remarks provided.'}</p>
                    </div>

                    {/* Actions */}
                    {st === 'pending' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleReject(report.id)}
                          style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.05)' }}
                        >
                          <LuX size={18} style={{ marginRight: '6px' }} /> Reject
                        </Button>
                        <Button 
                          variant="primary" 
                          onClick={() => handleApprove(report.id)}
                          style={{ background: 'var(--success)' }}
                        >
                          <LuCheck size={18} style={{ marginRight: '6px' }} /> Verify
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredReports.length === 0 && (
         <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--text-muted)' }}>
           <LuCamera size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
           <h3 style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>No Evidence Respository Active</h3>
           <p style={{ fontSize: '0.9rem' }}>There are no work reports matching your current filter criteria.</p>
         </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setFullscreenImage(null)}
        >
          <img src={fullscreenImage} alt="Fullscreen Proof" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: '2rem', right: '2rem', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 900, fontSize: '0.8rem', backdropFilter: 'blur(10px)' }}>
            CLICK ANYWHERE TO CLOSE
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkEvidence;
