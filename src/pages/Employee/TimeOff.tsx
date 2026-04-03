import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Badge, Card } from '../../components/ui';
import { LuCalendarPlus } from 'react-icons/lu';
import { useTranslation } from '../../hooks/useTranslation';

import { useStore } from '../../store';

const TimeOff: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useStore(state => state.currentUser);
  const timeOffRequests = useStore(state => state.timeOffRequests);
  const submitTimeOffRequest = useStore(state => state.submitTimeOffRequest);
  const employees = useStore(state => state.employees);
  
  const [showModal, setShowModal] = useState(false);
  const [newReq, setNewReq] = useState({ type: 'Sick' as const, startDate: '', endDate: '', reason: '' });

  const employee = employees.find(e => e.userId === currentUser?.id);
  const myRequests = timeOffRequests.filter(
    (r) =>
      r.employeeId === employee?.id ||
      r.employeeId === currentUser?.id ||
      r.userId === currentUser?.id
  );

  return (
    <div className="employee-main animate-fade-in" style={{ paddingBottom: '8rem' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Absence <span style={{ color: 'var(--primary)' }}>Logistics</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
            Submit and track your regional deployment leave requests.
          </p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowModal(true)}
          style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '20px', 
            background: 'var(--primary)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 15px 30px var(--primary-glow)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <LuCalendarPlus size={28} />
        </motion.button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {myRequests.map(req => (
          <motion.div key={req.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <Card variant="glass" style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: '1.2rem', color: 'var(--text-main)' }}>{req.type} Authorization</div>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.8rem', fontWeight: 800, marginTop: '4px' }}>
                    Deployment Hiatus: <span style={{ color: 'var(--text-main)' }}>{req.startDate}</span> to <span style={{ color: 'var(--text-main)' }}>{req.endDate}</span>
                  </div>
                </div>
                <div>
                  {req.status === 'approved' && <Badge variant="success">AUTHORIZED</Badge>}
                  {req.status === 'pending' && <Badge variant="warning">UNDER REVIEW</Badge>}
                  {req.status === 'rejected' && <Badge variant="danger">DECLINED</Badge>}
                </div>
              </div>
              
              {req.adminRemarks && (
                <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--border-strong)', marginTop: '0.5rem' }}>
                   <span style={{ fontSize: '0.7rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>HQ Communications</span>
                   <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, fontWeight: 600 }}>{req.adminRemarks}</p>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
        {myRequests.length === 0 && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
             <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>No deployment hiatus records located.</p>
          </div>
        )}
      </div>

      {showModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface-800 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl glass-surface" style={{ background: 'var(--surface)' }}>
             <h3 className="text-xl font-bold text-main mb-4">{t('timeoff.newRequest')}</h3>
             <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-muted">{t('timeoff.type')}</label>
                 <select 
                   value={newReq.type} onChange={e => setNewReq({...newReq, type: e.target.value as any})}
                   className="w-full bg-surface-hover border border-border text-main rounded-xl p-3 outline-none"
                 >
                   <option value="Sick">Sick Leave</option>
                   <option value="Vacation">Annual Vacation</option>
                   <option value="Unpaid">Unpaid Leave</option>
                 </select>
               </div>
               <Input label={t('timeoff.startDate')} type="date" value={newReq.startDate} onChange={e => setNewReq({...newReq, startDate: e.target.value})} />
               <Input label={t('timeoff.endDate')} type="date" value={newReq.endDate} onChange={e => setNewReq({...newReq, endDate: e.target.value})} />
               <Input label={t('timeoff.reason')} value={newReq.reason} onChange={e => setNewReq({...newReq, reason: e.target.value})} />
             </div>
             <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
                <Button 
                  variant="primary" 
                  className="flex-1" 
                  disabled={!newReq.startDate || !newReq.endDate}
                  onClick={() => {
                    const effectiveEmployeeId = employee?.id || currentUser?.id;
                    if (!effectiveEmployeeId || !currentUser) return;
                    submitTimeOffRequest({
                      employeeId: effectiveEmployeeId,
                      userId: currentUser.id,
                      type: newReq.type as 'Sick' | 'Vacation' | 'Unpaid',
                      startDate: newReq.startDate,
                      endDate: newReq.endDate,
                      reason: newReq.reason
                    });
                    setShowModal(false);
                    setNewReq({ type: 'Sick', startDate: '', endDate: '', reason: '' });
                  }}
                >{t('common.submit')}</Button>
             </div>
           </motion.div>
         </div>
      )}
    </div>
  );
};

export default TimeOff;
