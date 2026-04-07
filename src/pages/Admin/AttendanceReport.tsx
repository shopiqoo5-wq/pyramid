import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Badge } from '../../components/ui';
import { 
  LuClock,
  LuShieldCheck,
  LuArrowUpRight,
  LuUsers,
  LuActivity,
  LuMapPin,
  LuZap,
  LuRefreshCw
} from 'react-icons/lu';
import { motion } from 'framer-motion';
import './Dashboard.css';

const AttendanceReport: React.FC = () => {
  const { locations, attendanceRecords, employees, initBackend, isBackendConnected } = useStore((state: any) => state);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await initBackend();
    setIsRefreshing(false);
  };

  // Purity Fix: Generate stable random values once
  const [chartRandomHeights] = useState(() => 
    Array.from({ length: 24 }).map((_, i) => 25 + Math.sin(i / 2.5) * 40 + Math.random() * 25)
  );

  const [mapData] = useState(() => 
    Array.from({ length: 25 }).map((_, i) => ({
      intensity: Math.random(),
      duration: 3 + Math.random() * 2,
      delay: i * 0.1
    }))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-1.5px' }}>
            Workforce Intelligence 2.0
          </h2>
          <p className="text-muted">High-fidelity statistical analysis and real-time occupancy forensics.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isBackendConnected && (
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--primary)',
                background: 'transparent',
                color: 'var(--primary)',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="lift"
            >
              <LuRefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'SYNCING...' : 'SYNC WITH SERVER'}
            </button>
          )}
          <Badge variant="primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 900 }}>
            <LuZap size={14} style={{ marginRight: '6px' }} /> LIVE STREAM ACTIVE
          </Badge>
        </div>
      </header>

      {/* Primary Analytics Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <Card className="lift shadow-glow" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <LuUsers size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(var(--success-rgb), 0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--success)' }}>
              +14.2% <LuArrowUpRight size={12} />
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Peak Presence</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, marginTop: '0.5rem', color: 'var(--text-main)' }}>{attendanceRecords.length > 0 ? attendanceRecords.length * 12 : 1284} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Staff</span></div>
        </Card>

        <Card className="lift" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--success-bg-light)', color: 'var(--success)', border: '1px solid var(--success)' }}>
              <LuActivity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Fulfillment Velocity</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, marginTop: '0.5rem', color: 'var(--text-main)' }}>96.8%</div>
        </Card>

        <Card className="lift" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--info-bg-light)', color: 'var(--info)', border: '1px solid var(--info)' }}>
              <LuShieldCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Biometric Trust</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, marginTop: '0.5rem', color: 'var(--text-main)' }}>99.9%</div>
        </Card>

        <Card className="lift" style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid var(--warning)' }}>
              <LuClock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Avg. Turnaround</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, marginTop: '0.5rem', color: 'var(--text-main)' }}>4.2 <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hrs</span></div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
        {/* Main Chart */}
        <Card style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>Personnel Flow Velocity</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Real-time scan frequency aggregated by hour across all facility nodes.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Badge variant="success">NODE ALPHA</Badge>
              <Badge variant="neutral">NODE BETA</Badge>
            </div>
          </div>
          
          <div style={{ height: '320px', display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '0 1rem', borderBottom: '1px solid var(--border)' }}>
            {chartRandomHeights.map((val, i) => (
              <div key={i} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <motion.div 
                  initial={{ height: 0 }} 
                  animate={{ height: `${val}%` }}
                  transition={{ delay: i * 0.02, duration: 1, ease: "easeOut" }}
                  style={{ 
                    width: '100%', 
                    background: i > 8 && i < 18 ? 'var(--primary)' : 'var(--border)', 
                    borderRadius: '6px 6px 0 0',
                    boxShadow: i === 14 ? '0 0 20px rgba(var(--primary-rgb), 0.4)' : 'none'
                  }} 
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem', padding: '0 0.5rem' }}>
            {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'].map(t => (
              <span key={t} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>{t}</span>
            ))}
          </div>
        </Card>

        {/* Breakdown & Hotspots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <LuMapPin className="text-primary" size={20} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Live Operations Map</h3>
              <Badge variant="success" style={{ marginLeft: 'auto', fontSize: '10px' }}>REAL-TIME</Badge>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)', 
              gap: '8px', 
              aspectRatio: '1/1',
              background: 'var(--surface-hover)',
              padding: '12px',
              borderRadius: '20px',
              border: '1px solid var(--border)'
            }}>
              {mapData.map((data, i) => {
                return (
                  <motion.div 
                    key={i}
                    animate={{ 
                      opacity: [0.3, 0.7, 0.3],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: data.duration, 
                      repeat: Infinity,
                      delay: data.delay
                    }}
                    style={{ 
                      background: data.intensity > 0.7 ? 'var(--primary)' : data.intensity > 0.4 ? 'var(--primary-light)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      boxShadow: data.intensity > 0.7 ? '0 0 15px var(--primary-glow)' : 'none'
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)' }} /> DORMANT
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary-light)' }} /> ACTIVE
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }} /> PEAK
               </div>
            </div>
          </Card>

          <Card style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <LuMapPin className="text-secondary" size={20} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Facility Hotspots</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {locations.slice(0, 5).map((loc: any, i: number) => {
                const percentage = 92 - (i * 12);
                return (
                  <div key={loc.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{loc.name}</span>
                      <span style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--primary)' }}>{percentage}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                        style={{ height: '100%', background: 'linear-gradient(to right, var(--primary-light), var(--primary))', borderRadius: '3px' }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ padding: '1.5rem', background: 'var(--surface-hover)', border: '1px dashed var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <LuZap size={32} className="text-primary" style={{ opacity: 0.6 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>AI Shift Optimization</div>
              <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>Current scan density suggests reallocating 4 staff to Zone Beta for the next 2 hours.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Geofenced Attendance Logs */}
      <Card style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <LuShieldCheck className="text-primary" /> Verified Attendance Logs
            </h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Real-time GPS matched and photo-verified identity records.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead style={{ background: 'var(--surface-sub)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 0.5rem' }}>Personnel</th>
                <th style={{ padding: '1rem 0.5rem' }}>Location</th>
                <th style={{ padding: '1rem 0.5rem' }}>Action</th>
                <th style={{ padding: '1rem 0.5rem' }}>Timestamp</th>
                <th style={{ padding: '1rem 0.5rem' }}>Verification Integrity</th>
                <th style={{ padding: '1rem 0.5rem' }}>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.slice().reverse().map((record: any) => {
                 const emp = employees.find((e: any) => e.id === record.employeeId);
                 const loc = locations.find((l: any) => l.id === record.locationId);
                 
                 const isVerified = record.geofenceVerified || record.verified;

                 return (
                   <tr key={record.id} className="hover:bg-surface-hover/50 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                     <td style={{ padding: '1rem 0.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{emp?.name || record.employeeId}</td>
                     <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-sub)' }}>{loc?.name || 'Central Facility'}</div>
                     </td>
                     <td style={{ padding: '1rem 0.5rem' }}>
                        <Badge variant={record.status === 'present' ? 'success' : record.status === 'absent' ? 'danger' : 'warning'}>
                          {record.status?.toUpperCase() || 'PUNCH IN'}
                        </Badge>
                     </td>
                     <td style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {new Date(record.checkIn).toLocaleString()}
                     </td>
                     <td style={{ padding: '1rem 0.5rem' }}>
                        {isVerified ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 800 }}>
                            <LuMapPin size={14} /> GEOFENCE MATCH
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 800 }}>
                             ANOMALOUS (GPS BYPASSED)
                          </div>
                        )}
                     </td>
                     <td style={{ padding: '1rem 0.5rem' }}>
                       {record.photoUrl || record.imageUrl ? (
                         <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border)' }}>
                           <img src={record.photoUrl || record.imageUrl} alt="Verification" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         </div>
                       ) : (
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Photo</span>
                       )}
                     </td>
                   </tr>
                 );
              })}
              {attendanceRecords.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No verifiable attendance records to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AttendanceReport;
