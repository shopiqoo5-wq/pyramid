import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { 
  LuActivity, 
  LuWebhook, 
  LuZap, 
  LuShieldAlert, 
  LuTerminal,
  LuRefreshCw,
  LuBadgeCheck
} from 'react-icons/lu';
import { Card, Button } from '../../components/ui';

const SystemHealth: React.FC = () => {
  const { auditLogs, webhooks } = useStore();
  const [latency, setLatency] = useState<number[]>(Array(20).fill(45));

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const next = [...prev.slice(1), Math.floor(Math.random() * 30) + 30];
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Integration Uptime', value: '99.98%', icon: <LuActivity />, color: 'var(--success)' },
    { label: 'Active Webhooks', value: webhooks.filter(w => w.active).length, icon: <LuWebhook />, color: 'var(--primary)' },
    { label: 'Avg Latency', value: `${Math.round(latency.reduce((a, b) => a + b, 0) / latency.length)}ms`, icon: <LuZap />, color: 'var(--warning)' },
    { label: 'System Exceptions', value: '0', icon: <LuShieldAlert />, color: 'var(--success)' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Nerve Center</h2>
          <p className="text-muted">Real-time infrastructure monitoring and autonomous system logs.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <LuBadgeCheck className="text-success" size={18} />
          </motion.div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Core Systems Operational</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-surface lift" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '10px', background: `${s.color}15`, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{s.value}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Latency Monitor */}
          <Card className="glass-surface" style={{ padding: '2rem', minHeight: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <LuZap className="text-warning" size={20} />
                  <h3 style={{ margin: 0 }}>Network Latency (Internal Gateways)</h3>
               </div>
               <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>LIVE FEED</span>
            </div>
            
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
               {latency.map((val, i) => (
                 <motion.div 
                   key={i} 
                   initial={{ height: 0 }} 
                   animate={{ height: `${val * 2}px` }} 
                   style={{ 
                     flex: 1, 
                     background: `linear-gradient(to top, var(--primary), var(--info))`, 
                     borderRadius: '4px 4px 0 0',
                     opacity: i / latency.length * 0.5 + 0.5
                   }} 
                 />
               ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>
               <span>-40s</span>
               <span>-30s</span>
               <span>-20s</span>
               <span>-10s</span>
               <span>NOW</span>
            </div>
          </Card>

          {/* Webhook Activity */}
          <Card className="glass-surface" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <LuWebhook className="text-primary" size={20} />
                  <h3 style={{ margin: 0 }}>Webhook Pulse</h3>
               </div>
               <Button variant="ghost" size="sm"><LuRefreshCw size={14} /> Refetch</Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {webhooks.length > 0 ? webhooks.slice(0, 3).map((w, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div className={`status-badge ${w.active ? 'success' : 'neutral'}`} style={{ border: 'none', padding: '0.5rem' }}>
                       <LuBadgeCheck size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{w.name}</div>
                       <div className="text-muted" style={{ fontSize: '0.75rem' }}>{w.url}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--success)' }}>HTTP 200</div>
                       <div className="text-muted" style={{ fontSize: '0.7rem' }}>Last sent: 4m ago</div>
                    </div>
                 </div>
               )) : (
                 <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No webhooks configured.</div>
               )}
            </div>
          </Card>
        </div>

        {/* Live System Logs */}
        <Card className="glass-surface" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-hover)' }}>
              <LuTerminal size={18} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Real-time Audit Stream</h3>
           </div>
           
           <div style={{ flex: 1, padding: '1.5rem', maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <AnimatePresence initial={false}>
                 {auditLogs.slice(0, 20).map((log, i) => (
                   <motion.div 
                     key={log.id || i}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     style={{ 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        background: 'rgba(0,0,0,0.05)',
                        borderLeft: `3px solid ${log.type === 'security' ? 'var(--error)' : 'var(--primary)'}`
                     }}
                   >
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>[{log.action.toUpperCase()}]</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{new Date(log.createdAt || (log as any).timestamp || '').toLocaleTimeString()}</span>
                     </div>
                     <div style={{ color: 'var(--text-main)' }}>{log.details}</div>
                     <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>USER_ID: {log.userId?.slice(0,8)}...</div>
                   </motion.div>
                 ))}
              </AnimatePresence>
           </div>
           
           <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Streaming telemetry from Mongo API...</span>
           </div>
        </Card>
      </div>

      <div style={{ marginBottom: '6rem' }}></div>
    </div>
  );
};

export default SystemHealth;
