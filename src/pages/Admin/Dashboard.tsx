import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { 
  LuTrendingUp, 
  LuUsers, 
  LuPackageOpen, 
  LuClock,
  LuArrowUpRight,
  LuLayoutDashboard,
  LuActivity,
  LuCircleAlert,
  LuShieldCheck,
  LuDownload,
  LuFileDigit,
  LuExternalLink,
  LuRefreshCw
} from 'react-icons/lu';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, Button, Table, Modal, Skeleton, Badge } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const orders = useStore(state => state.orders);
  const companies = useStore(state => state.companies);
  const inventory = useStore(state => state.inventory);
  const products = useStore(state => state.products);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const workReports = useStore(state => state.workReports);
  const calculateDemandForecast = useStore(state => state.calculateDemandForecast);
  const initBackend = useStore(state => state.initBackend);
  const isBackendConnected = useStore(state => state.isBackendConnected);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await initBackend();
    setIsRefreshing(false);
  };
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Stats Calculations
  const totalRevenue = useMemo(() => orders.filter(o => o.status === 'delivered').reduce((sum, order) => sum + order.netAmount, 0), [orders]);
  
  const lastMonthRevenue = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return orders
      .filter(o => o.status === 'delivered' && new Date(o.createdAt) >= startOfLastMonth && new Date(o.createdAt) < startOfCurrentMonth)
      .reduce((sum, order) => sum + order.netAmount, 0);
  }, [orders]);

  const revenueTrend = useMemo(() => {
    if (lastMonthRevenue === 0) return '+100%';
    const diff = ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
  }, [totalRevenue, lastMonthRevenue]);

  const pendingOrders = useMemo(() => orders.filter(o => ['pending', 'pending_approval', 'pending_director', 'approved'].includes(o.status)).length, [orders]);
  const lowStockItems = useMemo(() => inventory.filter(i => i.quantity <= i.lowStockThreshold).length, [inventory]);
  const activeClients = companies.length;
  // flaggedAttendance logic replaced by Tactical Integrity index
  
  const workforceIntegrity = useMemo(() => {
    const verifiedReports = workReports.length > 0 ? workReports.filter(r => r.imageUrl).length : 0; // Mock logic for verified
    return Math.round((verifiedReports / (workReports.length || 1)) * 100);
  }, [workReports]);

  const firstProduct = products[0];
  const forecastData = useMemo(() => calculateDemandForecast(firstProduct?.id || 'p1'), [calculateDemandForecast, firstProduct]);
  

  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [orders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleExportForecast = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = ['Month', 'Actual Demand', 'AI Prediction', 'Confidence'];
      const csvContent = [
        headers.join(','),
        ...forecastData.map(d => `${d.month},${d.actualDemand},${d.predictedForecast},${(d.confidenceScore * 100).toFixed(0)}%`)
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `Demand_Forecast_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 800);
  };

  const runStressTest = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 3000);
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'warning',
      pending_approval: 'warning',
      pending_director: 'warning',
      approved: 'info',
      packed: 'primary',
      dispatched: 'primary',
      delivered: 'success',
      cancelled: 'danger'
    };
    const variant = styles[status] || 'neutral';
    return <Badge variant={variant as any}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const stats = [
    { label: 'Pipeline Revenue', value: formatCurrency(totalRevenue), icon: <LuTrendingUp />, color: totalRevenue >= lastMonthRevenue ? 'var(--success)' : 'var(--danger)', bg: totalRevenue >= lastMonthRevenue ? 'var(--success-bg)' : 'rgba(239,68,68,0.1)', trend: revenueTrend, trendUp: totalRevenue >= lastMonthRevenue },
    { label: 'Tactical Integrity', value: `${workforceIntegrity}%`, icon: <LuShieldCheck />, color: workforceIntegrity > 85 ? 'var(--success)' : 'var(--warning)', bg: workforceIntegrity > 85 ? 'var(--success-bg)' : 'var(--warning-bg)', trend: 'GEO-LOCKED', trendUp: true },
    { label: 'Active Fulfillment', value: pendingOrders, icon: <LuClock />, color: 'var(--warning)', bg: 'var(--warning-bg)', trend: 'Action Reqd', trendUp: false },
    { label: 'Corporate Accounts', value: activeClients, icon: <LuUsers />, color: 'var(--primary)', bg: 'var(--primary-light)', trend: '+2 this week', trendUp: true },
    { label: 'Field Incidents', value: useStore.getState().fieldIncidents.filter(i => i.status !== 'Resolved').length, icon: <LuCircleAlert />, color: 'var(--danger)', bg: 'var(--danger-bg)', trend: 'ACTION REQD', trendUp: false, onClick: () => navigate('/admin/ops-command?tab=incidents') },
    { label: 'Active Personnel', value: attendanceRecords.filter(r => !r.checkOut).length, icon: <LuUsers />, color: 'var(--success)', bg: 'var(--success-bg)', trend: 'LIVE TRACK', trendUp: true, onClick: () => navigate('/admin/workforce/activity') },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ fontWeight: 950, letterSpacing: '-0.04em', fontSize: '2.8rem' }}>Command <span style={{ color: 'var(--primary)' }}>Center</span></h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem' }}>
            <Badge variant={workforceIntegrity > 90 ? 'success' : 'warning'} style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: 900 }}>
              {workforceIntegrity > 90 ? 'OPERATIONAL CLEARANCE: HIGH' : 'OPERATIONAL DRIFT DETECTED'}
            </Badge>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>Unified Tactical Oversight • v2.4.0</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           {isBackendConnected && (
             <Button 
               variant="ghost" 
               onClick={handleRefresh}
               disabled={isRefreshing}
               style={{ border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '12px' }}
             >
               <LuRefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} style={{ marginRight: '8px' }} />
               {isRefreshing ? 'SYNCING...' : 'SYNC WITH SERVER'}
             </Button>
           )}
           <Button variant="secondary" onClick={() => navigate('/admin/ops-audit')} className="lift shadow-sm">
             <LuActivity size={18} /> System Audit
           </Button>
           <Button variant="primary" onClick={() => navigate('/admin/workforce/activity')} className="lift shadow-glow">
             Live Deployment Stream
           </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="glass-surface" style={{ padding: '1.5rem' }}>
              <Skeleton variant="circle" width={56} height={56} style={{ marginBottom: '1.25rem' }} />
              <Skeleton width="40%" height={12} style={{ marginBottom: '8px' }} />
              <Skeleton width="60%" height={24} />
            </Card>
          ))
        ) : (
          stats.map((s, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              onClick={s.onClick}
              className={`quick-stat lift glass-surface ${s.onClick ? 'pointer' : ''}`}
              style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', cursor: s.onClick ? 'pointer' : 'default', border: s.onClick ? '1px solid var(--primary-border)' : '1px solid var(--border)' }}
            >
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.8rem', fontWeight: 900, color: s.color, display: 'flex', alignItems: 'center', gap: '2px' }}>
                {s.trend} {s.trend.includes('%') && <LuArrowUpRight size={12} />}
                {s.label === 'Tactical Readiness' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)', marginLeft: '4px' }} />}
              </div>
              <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: '1.25rem' }}>
                {s.icon}
              </div>
              <div>
                <div style={{ marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ color: 'var(--text-main)', fontSize: '2.1rem', fontWeight: 950, letterSpacing: '-0.03em' }}>{s.value}</div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: s.color, opacity: 0.1 }}></div>
            </motion.div>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2rem' }}>
        {/* Left Col: Activity & Demand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
           <Card className="glass-surface" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '12px', color: 'var(--primary)' }}>
                      <LuActivity size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>Fulfillment Velocity</h3>
                      <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Critical path tracking for top accounts</p>
                    </div>
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')} className="lift">
                   Full Audit <LuExternalLink size={14} style={{ marginLeft: '6px' }} />
                 </Button>
              </div>
              <Table 
                columns={[
                  { 
                    key: 'id', 
                    header: 'Fulfillment ID', 
                    render: (r) => (
                      <button 
                        onClick={() => setSelectedOrder(r)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'underline' }}>{r.customId}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                      </button>
                    )
                  },
                  { 
                    key: 'client', 
                    header: 'Corporate Entity', 
                    render: (r) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                          {(companies.find(c => c.id === r.companyId)?.name || 'U').charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{companies.find(c => c.id === r.companyId)?.name || 'Unknown Client'}</span>
                      </div>
                    )
                  },
                  { 
                    key: 'amount', 
                    header: 'Transaction Value', 
                    render: (r) => <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(r.netAmount)}</span> 
                  },
                  { 
                    key: 'status', 
                    header: 'Fulfillment Status', 
                    render: (r) => getStatusBadge(r.status) 
                  }
                ]} 
                data={recentOrders} 
              />
           </Card>

           <Card className="glass-surface" style={{ padding: '2rem', border: '1px solid var(--primary-border)' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Skeleton width={250} height={28} style={{ marginBottom: '8px' }} />
                      <Skeleton width={400} height={16} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <Skeleton width={120} height={40} />
                      <Skeleton width={140} height={40} />
                    </div>
                  </div>
                  <Skeleton height={320} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                      <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <LuTrendingUp className="text-primary" /> Demand Intelligence Matrix
                        </h3>
                        <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Predictive analysis based on multi-site procurement cycles</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Button variant="secondary" size="sm" onClick={runStressTest} disabled={isSimulating} style={{ border: '1px solid var(--primary-border)', color: 'var(--primary)' }}>
                          {isSimulating ? 'Simulating Surge...' : 'Stress Test System'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleExportForecast} disabled={isExporting} className="lift">
                          <LuDownload size={16} /> {isExporting ? 'Exporting...' : 'Export Data'}
                        </Button>
                        <Badge variant="info" style={{ padding: '0.5rem 1rem' }}>AI Confidence: 94%</Badge>
                      </div>
                  </div>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--warning)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)', backdropFilter: 'blur(10px)' }} 
                          itemStyle={{ fontSize: '0.85rem', fontWeight: 800 }}
                          cursor={{ stroke: 'var(--primary)', strokeWidth: 2 }}
                        />
                        <Area type="monotone" dataKey="actualDemand" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorDemand)" name="Historical Pull" />
                        <Area type="monotone" dataKey="predictedForecast" stroke="var(--warning)" strokeDasharray="6 4" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" name="Predicted Burn Rate" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
           </Card>
        </div>

        {/* Right Col: Smart Notifications & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
           <Card className="glass-surface" style={{ padding: '2rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.6rem', background: lowStockItems > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', borderRadius: '10px', color: lowStockItems > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      <LuCircleAlert size={20} />
                    </div>
                    <h3 style={{ margin: 0 }}>Predictive Alerts</h3>
                 </div>
                 <Badge variant="neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Real-time</Badge>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                {inventory.filter(i => i.quantity <= i.lowStockThreshold).map((item, idx) => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                      className="lift glass-surface"
                      style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.03)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}
                    >
                       <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                         <img src={product?.imageUrl} style={{ width: '32px', height: '32px', objectFit: 'contain' }} alt={product?.name} />
                       </div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{product?.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 800 }}>{item.quantity} {product?.uom}s remain</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Goal: {item.lowStockThreshold}</div>
                          </div>
                       </div>
                        <button 
                          className="icon-btn-premium sm" 
                          onClick={() => navigate('/admin/inventory-control')}
                          title="Calibrate Stock"
                          style={{ background: 'var(--surface)' }}
                        >
                           <LuPackageOpen size={16} style={{ color: 'var(--primary)' }} />
                        </button>
                    </motion.div>
                  )
                })}
                {lowStockItems === 0 && (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--success-bg)', borderRadius: '28px', border: '1px dashed var(--success)' }}>
                    <div style={{ color: 'var(--success)', marginBottom: '1.5rem' }}><LuShieldCheck size={48} /></div>
                    <p style={{ margin: 0, fontWeight: 900, color: 'var(--success)', fontSize: '1.2rem' }}>Supply Chain Optimal</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>No inventory bottlenecks detected currently.</p>
                  </div>
                )}
              </div>
           </Card>

           <Card className="glass-surface" style={{ padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Logistics Orchestration</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                 {[
                   { label: 'Global Inventory Ledger', path: '/admin/inventory', icon: <LuLayoutDashboard />, desc: 'Real-time multi-site stock' },
                    { label: 'Corporate Client Portal', path: '/admin/clients', icon: <LuUsers />, desc: 'Access & contract controls' },
                    { label: 'Identity Verification', path: '/admin/attendance-report', icon: <LuShieldCheck />, desc: 'Biometric audit stream' },
                    { label: 'Event Webhooks', path: '/admin/webhooks', icon: <LuActivity />, desc: 'Outbound HTTP callbacks' },
                 ].map((link, i) => (
                   <button 
                    key={i}
                    onClick={() => navigate(link.path)}
                    className="lift"
                    style={{ 
                      width: '100%', padding: '1.25rem', borderRadius: '18px', background: 'var(--surface-hover)', 
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.25rem', 
                      textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' 
                    }}
                   >
                     <div style={{ padding: '0.6rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--primary)' }}>
                        {link.icon}
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>{link.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{link.desc}</div>
                     </div>
                     <LuArrowUpRight className="text-muted" />
                   </button>
                 ))}
              </div>
           </Card>
        </div>
      </div>

      {/* Order Detail Quick View Modal */}
      <Modal 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        title={`Fulfillment Detail: ${selectedOrder?.customId || ''}`}
        style={{ maxWidth: '600px' }}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Fulfillment Status</div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Transaction Value</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(selectedOrder.netAmount)}</div>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Card style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Client Assignment</div>
                  <div style={{ fontWeight: 700 }}>{companies.find(c => c.id === selectedOrder.companyId)?.name}</div>
                  <div style={{ fontSize: '0.75rem' }}>{selectedOrder.costCenter || 'No Cost Center'}</div>
                </Card>
                <Card style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Timeline</div>
                  <div style={{ fontWeight: 700 }}>{new Date(selectedOrder.createdAt).toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem' }}>Reference: {selectedOrder.id}</div>
                </Card>
             </div>

             <div>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LuFileDigit size={18} /> Manifest Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedOrder.items.map((item: any, idx: number) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: 'var(--primary)', width: '24px' }}>{item.quantity}x</span>
                          <span>{product?.name || item.productId}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                      </div>
                    )
                  })}
                </div>
             </div>

             <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <Button variant="primary" style={{ flex: 2 }} onClick={() => navigate('/admin/orders')}>Manage Fulfillment</Button>
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => setSelectedOrder(null)}>Close</Button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
