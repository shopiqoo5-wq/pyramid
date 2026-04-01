import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Badge, Button } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { 
  LuActivity, LuMap, LuShieldAlert, 
  LuCircleCheck, LuClock, LuExternalLink, LuZap,
  LuTerminal, LuRadio, LuDna, LuServer, LuX
} from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';

const OpsCommandCenter: React.FC = () => {
  const fieldIncidents = useStore(state => state.fieldIncidents);
  const employeeShifts = useStore(state => state.employeeShifts);
  const employees = useStore(state => state.employees);
  const locations = useStore(state => state.locations);
  const updateIncidentStatus = useStore(state => state.updateIncidentStatus);
  const reassignShift = useStore(state => state.reassignShift);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'incidents' | 'roster' | 'health'>('telemetry');
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [resolvingIncidentId, setResolvingIncidentId] = useState<string | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  // Mock Live Feed Data
  const [liveFeed] = useState([
    { id: 1, ts: '09:42:15', msg: 'UNIT_OMEGA: GEOSPATIAL_SYNC_COMPLETE', type: 'info' },
    { id: 2, ts: '09:41:02', msg: 'INCIDENT_402: ESCALATED_BY_SYSTEM', type: 'warning' },
    { id: 3, ts: '09:38:44', msg: 'BIOMETRIC_CHECK: ALL_STATIONS_STABLE', type: 'success' },
    { id: 4, ts: '09:35:12', msg: 'NETWORK_LATENCY: 12ms (OPTIMAL)', type: 'info' },
    { id: 5, ts: '09:30:01', msg: 'CLEANER_ALPHA: RADIUS_ENTRY_HQ', type: 'info' },
  ]);
  const onDutyEmployees = employeeShifts.filter(s => s.status === 'In Progress');
  const openIncidents = fieldIncidents.filter(i => i.status !== 'Resolved');

  return (
    <div className="admin-container animate-fade-in" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Badge variant="primary" style={{ marginBottom: '1rem', padding: '0.4rem 1.25rem' }}>OPERATIONS COMMAND • LEVEL 4</Badge>
          <h1 style={{ fontSize: '3rem', fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--text-main)' }}>Strategic <span style={{ color: 'var(--primary)' }}>Nerve Center</span></h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.1rem' }}>Global Personnel Orchestration & Real-time Telemetry</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Card variant="glass" style={{ padding: '1rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary)' }}>{onDutyEmployees.length}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Units</div>
          </Card>
          <Card variant="glass" style={{ padding: '1rem 2rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--danger)' }}>{openIncidents.length}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alerts</div>
          </Card>
        </div>
      </header>

      {/* Navigation Matrix */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        {[
          { id: 'telemetry', icon: <LuMap />, label: 'Personnel Map' },
          { id: 'incidents', icon: <LuShieldAlert />, label: 'Incident Hub' },
          { id: 'roster', icon: <LuClock />, label: 'Dynamic Roster' },
          { id: 'health', icon: <LuActivity />, label: 'System Health' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '1.25rem 2.5rem',
              borderRadius: '24px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--surface-hover)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-sub)',
              fontWeight: 950,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
              boxShadow: activeTab === tab.id ? '0 10px 30px var(--primary-glow)' : 'none'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
        {/* Main Operational Surface */}
        <section>
          {activeTab === 'telemetry' && (
            <Card variant="glass" style={{ height: '700px', padding: '0', position: 'relative', overflow: 'hidden', background: '#0a0a0b', border: '1px solid var(--border)' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'radial-gradient(circle at 50% 50%, #f97316 0%, transparent 70%)' }} />
              
              {/* Mock Map Grid */}
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(10, 1fr)', opacity: 0.1 }}>
                {Array.from({ length: 100 }).map((_, i) => <div key={i} style={{ border: '0.5px solid rgba(255,255,255,0.3)' }} />)}
              </div>

              {/* Personnel Pips */}
              {onDutyEmployees.map((shift, idx) => {
                const empName = employees.find(e => e.id === shift.employeeId)?.name || 'Unit TBD';
                const loc = locations.find(l => l.id === shift.locationId);
                return (
                  <motion.div
                    key={shift.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setSelectedUnit(shift.id)}
                    style={{
                      position: 'absolute',
                      left: `${20 + (idx * 15)}%`,
                      top: `${30 + (idx * 10)}%`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      zIndex: selectedUnit === shift.id ? 100 : 1
                    }}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: selectedUnit === shift.id ? 'var(--secondary)' : 'var(--primary)', 
                      boxShadow: selectedUnit === shift.id ? '0 0 30px var(--secondary)' : '0 0 20px var(--primary)',
                      position: 'relative'
                    }}>
                      <motion.div 
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ position: 'absolute', inset: -5, borderRadius: '50%', border: '2px solid var(--primary)' }}
                      />
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.9)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 950, color: '#fff' }}>{empName}</span>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>{loc?.name}</div>
                    </div>
                  </motion.div>
                );
              })}

              <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', backdropFilter: 'blur(20px)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff' }}>
                  <LuZap className="text-primary" />
                  <span style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.05em' }}>TACTICAL_SYNC: ACTIVE</span>
                </div>
              </div>

              {/* Map HUD Elements */}
              <div style={{ position: 'absolute', top: '2rem', right: '2rem', textAlign: 'right', pointerEvents: 'none' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.2em' }}>STATUS: SCANNING_SECTOR_A4</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>COORD: 19.0760° N, 72.8777° E</div>
              </div>

              <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }} 
                transition={{ duration: 4, repeat: Infinity }}
                style={{ 
                  position: 'absolute', inset: '2rem', 
                  border: '1px solid var(--primary)', 
                  pointerEvents: 'none', 
                  borderRadius: '12px',
                  boxShadow: 'inset 0 0 50px rgba(249, 115, 22, 0.1)'
                }} 
              />
              
              <div style={{ position: 'absolute', top: '2rem', left: '2rem', pointerEvents: 'none' }}>
                <div style={{ width: '40px', height: '1px', background: 'var(--primary)', marginBottom: '40px' }} />
                <div style={{ width: '1px', height: '40px', background: 'var(--primary)' }} />
              </div>
              <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', pointerEvents: 'none', transform: 'rotate(180deg)' }}>
                <div style={{ width: '40px', height: '1px', background: 'var(--primary)', marginBottom: '40px' }} />
                <div style={{ width: '1px', height: '40px', background: 'var(--primary)' }} />
              </div>

            </Card>
          )}

          {/* Unit Strategic Detail Overlay */}
          <AnimatePresence>
            {selectedUnit && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                  position: 'fixed',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '400px',
                  background: 'var(--surface)',
                  backdropFilter: 'blur(40px)',
                  borderLeft: '1px solid var(--border)',
                  zIndex: 1000,
                  padding: '2.5rem',
                  boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
                  overflowY: 'auto'
                }}
              >
                {(() => {
                  const shift = employeeShifts.find(s => s.id === selectedUnit);
                  const emp = employees.find(e => e.id === shift?.employeeId);
                  const loc = locations.find(l => l.id === shift?.locationId);
                  if (!shift || !emp) return null;

                  return (
                    <div className="space-y-8">
                      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge variant="primary">STRATEGIC UNIT INFO</Badge>
                        <button 
                          onClick={() => setSelectedUnit(null)} 
                          style={{ 
                            background: 'var(--surface-hover)', 
                            border: '1px solid var(--border)', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'var(--text-main)', 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="lift"
                        >
                          <LuX size={18} />
                        </button>
                      </header>

                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '24px', 
                          background: 'linear-gradient(135deg, var(--primary) 0%, #f97316 100%)', 
                          color: '#fff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '2rem', 
                          fontWeight: 950,
                          boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)'
                        }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-main)', marginBottom: '4px' }}>{emp.name}</h2>
                          <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            {emp.role} • ACTIVE_DUTY
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Card variant="glass" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 950, marginBottom: '6px', letterSpacing: '0.05em' }}>Shift Start</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </Card>
                        <Card variant="glass" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 950, marginBottom: '6px', letterSpacing: '0.05em' }}>Site Allocation</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{loc?.name || 'FIELD'}</div>
                        </Card>
                      </div>

                      <section>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 950, color: '#fff', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.1em' }}>Tactical Redirection</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Redeploy to site:</label>
                          <select 
                            onChange={(e) => {
                              reassignShift(shift.id, e.target.value);
                              setSelectedUnit(null);
                            }}
                            style={{ 
                              width: '100%', 
                              height: '56px', 
                              borderRadius: '16px', 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              color: '#fff', 
                              padding: '0 1.25rem',
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                            defaultValue={shift.locationId}
                          >
                            {locations.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        </div>
                      </section>

                      <section style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                         <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981', marginBottom: '8px' }}>
                              <LuActivity size={18} />
                              <span style={{ fontWeight: 950, fontSize: '0.85rem', letterSpacing: '0.05em' }}>BIOMETRIC PULSE: STABLE</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(16, 185, 129, 0.6)', fontWeight: 700 }}>
                              Personnel vitals are within normal operational parameters. No fatigue flags detected.
                            </div>
                         </div>
                      </section>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Button variant="danger" style={{ width: '100%', height: '56px', borderRadius: '18px', fontWeight: 950 }}>
                          EMERGENCY RECALL
                        </Button>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 700 }}>
                          Initiating emergency recall will immediately notify the unit and dispatch secondary support to the site.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'incidents' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {fieldIncidents.map(inc => {
                const loc = locations.find(l => l.id === inc.locationId);
                const emp = employees.find(e => e.userId === inc.userId);
                return (
                  <Card key={inc.id} variant="glass" style={{ padding: '1.5rem', border: inc.status === 'Open' ? '1px solid var(--danger-light)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <Badge variant={inc.severity === 'Critical' || inc.severity === 'High' ? 'danger' : 'info'}>{inc.severity} PRIORITY</Badge>
                      <span style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 800 }}>{new Date(inc.createdAt || (inc as any).timestamp || '').toLocaleTimeString()}</span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{inc.type} Anomaly</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem' }}>{inc.description}</p>
                    
                    <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-main)' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--surface-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LuMap size={12} /></div>
                        <span style={{ fontWeight: 800 }}>{loc?.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 900, marginLeft: '34px' }}>
                        REPORTED BY: {emp?.name || 'Unit TBD'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {inc.status !== 'Resolved' ? (
                        <Button variant="primary" style={{ flex: 1, height: '44px', borderRadius: '12px' }} onClick={() => setResolvingIncidentId(inc.id)}>
                          <LuCircleCheck size={18} /> Resolve
                        </Button>
                      ) : (
                        <div style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px', fontWeight: 900, fontSize: '0.8rem' }}>RESOLVED</div>
                      )}
                      <Button variant="secondary" style={{ width: '44px', padding: '0', borderRadius: '12px' }}>
                        <LuExternalLink size={18} />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {activeTab === 'roster' && (
            <Card variant="glass" style={{ padding: '0' }}>
               <table className="admin-table">
                <thead>
                  <tr>
                    <th>Staff Unit</th>
                    <th>Site Assignment</th>
                    <th>Status</th>
                    <th>Tactical Slot</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeShifts.map(shift => {
                    const empName = employees.find(e => e.id === shift.employeeId)?.name || 'Unit TBD';
                    const loc = locations.find(l => l.id === shift.locationId);
                    return (
                      <tr key={shift.id}>
                        <td style={{ fontWeight: 900 }}>{empName}</td>
                        <td>{loc?.name}</td>
                        <td>
                          <Badge variant={shift.status === 'In Progress' ? 'primary' : 'neutral'}>{shift.status}</Badge>
                        </td>
                        <td>{new Date(shift.startTime).getHours()}:00 - {new Date(shift.endTime).getHours()}:00</td>
                        <td>
                          <LuExternalLink size={18} style={{ opacity: 0.3 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card variant="premium" style={{ padding: '2rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <LuServer className="text-primary" size={24} />
                      <h3 style={{ margin: 0, fontWeight: 950, fontSize: '1.1rem' }}>Backend Equilibrium</h3>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {[
                        { label: 'Latency (Avg)', val: '14ms', status: 'optimal' },
                        { label: 'Throughput', val: '2.4k req/s', status: 'high' },
                        { label: 'Uptime', val: '99.998%', status: 'stable' }
                      ].map(m => (
                        <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>{m.label}</span>
                           <span style={{ fontSize: '0.8rem', fontWeight: 950, color: 'var(--primary)' }}>{m.val}</span>
                        </div>
                      ))}
                   </div>
                </Card>
                <Card variant="premium" style={{ padding: '2rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <LuRadio className="text-secondary" size={24} />
                      <h3 style={{ margin: 0, fontWeight: 950, fontSize: '1.1rem' }}>Broadcast Status</h3>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {[
                        { label: 'SMS Gateway', val: 'CONNECTED', status: 'success' },
                        { label: 'Email Relay', val: 'CONNECTED', status: 'success' },
                        { label: 'Geofence API', val: 'STABLE', status: 'success' }
                      ].map(m => (
                        <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>{m.label}</span>
                           <Badge variant="success" style={{ fontSize: '0.6rem' }}>{m.val}</Badge>
                        </div>
                      ))}
                   </div>
                </Card>
              </div>

              <Card variant="glass" style={{ padding: '2.5rem', textAlign: 'center' }}>
                 <LuDna className="text-primary" size={48} style={{ margin: '0 auto 1.5rem auto', opacity: 0.3 }} />
                 <h3 style={{ fontWeight: 950, fontSize: '1.5rem', marginBottom: '0.5rem' }}>Full System Diagnostic Passed</h3>
                 <p className="text-muted" style={{ fontWeight: 700, maxWidth: '500px', margin: '0 auto' }}>All operational nodes are synchronized. Biometric encryption and geofence protocols are operating within Tier 1 margins.</p>
              </Card>
            </div>
          )}
        </section>


        {/* Tactical Intel Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card variant="premium" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}><LuActivity size={120} /></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 950, marginBottom: '1.5rem', color: '#fff' }}>Resource Load</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                { label: 'Staff Utilization', val: 78, color: 'var(--primary)' },
                { label: 'Response Velocity', val: 92, color: 'var(--success)' },
                { label: 'Risk Indices', val: 14, color: 'var(--danger)' }
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 950, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                    <span>{stat.label}</span>
                    <span style={{ color: '#fff' }}>{stat.val}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.val}%` }}
                      style={{ height: '100%', background: stat.color, borderRadius: '4px', boxShadow: `0 0 10px ${stat.color}` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 950, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LuTerminal size={20} className="text-primary" /> Operational Stream
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {liveFeed.map(item => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `2px solid var(--${item.type === 'warning' ? 'danger' : 'border'})`, paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontWeight: 950, opacity: 0.4 }}>
                    <span>{item.ts} UTC</span>
                    <span>ID_{item.id}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: item.type === 'warning' ? 'var(--danger)' : 'var(--text-main)', letterSpacing: '0.02em', lineBreak: 'anywhere' }}>
                    {item.msg}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
               <span style={{ fontSize: '0.6rem', fontWeight: 950, opacity: 0.3, letterSpacing: '0.1em' }}>RE-ENCRYPTION_ACTIVE</span>
            </div>
          </Card>

        </aside>
      </div>

      {/* Incident Resolution Modal */}
      {resolvingIncidentId && (() => {
        const incidentToResolve = fieldIncidents.find(i => i.id === resolvingIncidentId);
        if (!incidentToResolve) return null;
        
        return (
          <Modal
            isOpen={!!resolvingIncidentId}
            onClose={() => { setResolvingIncidentId(null); setResolutionRemarks(''); }}
            title="Incident Resolution Desk"
            style={{ '--primary': '#10b981' } as any}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-surface" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <Badge variant={incidentToResolve.severity === 'Critical' || incidentToResolve.severity === 'High' ? 'danger' : 'warning'}>
                    {incidentToResolve.severity} Anomaly
                  </Badge>
                  <span style={{ fontSize: '0.65rem', fontWeight: 950, opacity: 0.4 }}>{new Date(incidentToResolve.createdAt || (incidentToResolve as any).timestamp || '').toLocaleString()}</span>
                </div>
                <h4 style={{ margin: 0, fontWeight: 950, fontSize: '1.1rem', color: 'var(--text-main)' }}>{incidentToResolve.type}</h4>
                <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px' }}>{incidentToResolve.description}</p>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontWeight: 950, fontSize: '0.75rem', letterSpacing: '0.05em' }}>Official Resolution Remarks / Clearance</label>
                <textarea 
                  className="input-field"
                  style={{ height: '120px', resize: 'none' }}
                  placeholder="Enter administrative clearance code or follow-up protocol..."
                  value={resolutionRemarks}
                  onChange={e => setResolutionRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button 
                  variant="secondary" 
                  className="flex-1 lift"
                  style={{ height: '56px', fontWeight: 950 }}
                  onClick={() => {
                    updateIncidentStatus(incidentToResolve.id, 'In Progress', resolutionRemarks);
                    setResolvingIncidentId(null);
                    setResolutionRemarks('');
                  }}
                >
                  Authorize Progress
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 shadow-glow lift"
                  style={{ height: '56px', fontWeight: 950 }}
                  onClick={() => {
                    updateIncidentStatus(incidentToResolve.id, 'Resolved', resolutionRemarks);
                    setResolvingIncidentId(null);
                    setResolutionRemarks('');
                  }}
                >
                  Close & Archive
                </Button>
              </div>
              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                * Resolution will be finalized in the audit registry.
              </p>
            </div>

          </Modal>
        );
      })()}
    </div>
  );
};

export default OpsCommandCenter;
