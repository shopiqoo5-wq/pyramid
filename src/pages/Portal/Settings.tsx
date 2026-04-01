import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { 
  LuMail, 
  LuShieldCheck, 
  LuSettings, 
  LuLogOut, 
  LuZap,
  LuMoon,
  LuSun,
  LuKey,
  LuBell,
  LuHistory,
  LuSmartphone
} from 'react-icons/lu';
import { Card, Button, Input } from '../../components/ui';

const ClientSettings: React.FC = () => {
  const currentUser = useStore((state) => state.currentUser);
  const auditLogs = useStore((state) => state.auditLogs);
  const logout = useStore((state) => state.logout);
  
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [notifs, setNotifs] = useState({ push: true, email: true, sms: false });

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pf-theme', next);
    setIsDark(!isDark);
  };
  
  const myLogs = useMemo(() => {
    return auditLogs
      .filter(log => log.userId === currentUser?.id)
      .slice(0, 5);
  }, [auditLogs, currentUser]);

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'company'>('profile');
  const myCompany = useStore(state => state.companies.find(c => c.id === currentUser?.companyId));
  const updateCompanySettings = useStore(state => state.updateCompanySettings);

  const [branding, setBranding] = useState({
    primaryColor: myCompany?.branding?.primaryColor || '#3b82f6',
    approvalThreshold: myCompany?.approvalThreshold || 0
  });

  const handleSaveCompany = () => {
    if (!myCompany) return;
    updateCompanySettings(myCompany.id, {
      branding: { ...myCompany.branding, primaryColor: branding.primaryColor },
      approvalThreshold: branding.approvalThreshold
    });
  };

  return (
    <div className="settings-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Account & Governance</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem', marginTop: '0.4rem' }}>Manage credentials and organizational oversight protocols.</p>
          </div>
          <div className="tab-pills-premium">
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Personal</button>
            <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>Security</button>
            {currentUser?.role === 'client_manager' && (
              <button className={activeTab === 'company' ? 'active' : ''} onClick={() => setActiveTab('company')}>Company</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: activeTab === 'profile' ? 'grid' : 'none', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* Left Column: Profile & Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card className="glass-surface" style={{ padding: '2rem', textAlign: 'center', borderRadius: '24px' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '35px', 
              background: 'linear-gradient(135deg, var(--primary), var(--primary-glow))',
              margin: '0 auto 1.5rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 15px 30px var(--primary-glow)'
            }}>
              {currentUser?.name?.charAt(0)}
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>{currentUser?.name}</h3>
            <div className="status-badge primary" style={{ display: 'inline-flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
              <LuShieldCheck size={14} /> 
              {currentUser?.role?.replace('_', ' ').toUpperCase()}
            </div>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: '18px', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <Input label="Full Identity Name" value={currentUser?.name || ''} onChange={() => {}} />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <Input label="Corporate Email" value={currentUser?.email || ''} onChange={() => {}} />
              </div>
              <Button variant="primary" size="sm" style={{ width: '100%', borderRadius: '12px' }}>Update Profile</Button>
            </div>
          </Card>

          <Card className="glass-surface" style={{ padding: '1.5rem', borderRadius: '24px' }}>
             <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <LuHistory size={16} color="var(--primary)" /> Recent Activity
             </h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {myLogs.length > 0 ? myLogs.map(log => (
                 <div key={log.id} style={{ fontSize: '0.75rem', padding: '0.5rem', borderLeft: '2px solid var(--primary)', background: 'var(--surface-hover)', borderRadius: '0 8px 8px 0' }}>
                   <div style={{ fontWeight: 800 }}>{log.action.replace('_', ' ').toUpperCase()}</div>
                   <div className="text-muted">{new Date(log.createdAt || (log as any).timestamp || '').toLocaleString()}</div>
                 </div>
               )) : (
                 <div className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>No recent activity records.</div>
               )}
             </div>
          </Card>

          <Button variant="secondary" onClick={logout} style={{ width: '100%', height: '52px', borderRadius: '16px', fontWeight: 700, borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            <LuLogOut size={18} /> Terminate Session
          </Button>
        </div>

        {/* Right Column: Settings Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card className="glass-surface" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <LuSettings color="var(--primary)" /> Interface Aesthetic
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                    {isDark ? <LuMoon color="var(--primary)" size={20} /> : <LuSun color="var(--primary)" size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Theme Mode</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Currently: <strong>{isDark ? 'Obsidian' : 'Modern Pearl'}</strong></div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={toggleTheme} style={{ borderRadius: '10px' }}>Swap Theme</Button>
              </div>
            </div>
          </Card>

          <Card className="glass-surface" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <LuBell color="var(--primary)" /> Notification Channels
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {(
                [
                  { key: 'push', label: 'Push', icon: LuSmartphone },
                  { key: 'email', label: 'Email', icon: LuMail },
                  { key: 'sms', label: 'SMS', icon: LuZap }
                ] as const
              ).map((item) => (
                <div 
                  key={item.key}
                  onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof notifs] }))}
                  style={{ 
                    padding: '1.1rem', 
                    borderRadius: '16px', 
                    cursor: 'pointer',
                    background: notifs[item.key as keyof typeof notifs] ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)',
                    border: '1px solid',
                    borderColor: notifs[item.key as keyof typeof notifs] ? 'var(--primary)' : 'var(--border)',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ color: notifs[item.key as keyof typeof notifs] ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    <item.icon size={24} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: notifs[item.key as keyof typeof notifs] ? 'var(--text-main)' : 'var(--text-muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ display: activeTab === 'security' ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <Card className="glass-surface" style={{ padding: '2rem', borderRadius: '24px' }}>
             <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <LuKey size={22} color="var(--primary)" /> Access Protocol
             </h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Input label="New Master Key" type="password" placeholder="Enter new password" />
                <Input label="Confirm Alignment" type="password" placeholder="Repeat password" />
                <Button variant="primary" style={{ height: '52px', borderRadius: '14px' }}>Rotate Access Key</Button>
             </div>
          </Card>
          
          <Card className="glass-surface" style={{ padding: '2rem', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <LuShieldCheck color="var(--primary)" /> Multi-Factor Auth
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '18px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Enforced 2FA</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Mandatory for high-value procurement.</div>
              </div>
              <label className="toggle-premium">
                <input type="checkbox" checked={tfaEnabled} onChange={e => setTfaEnabled(e.target.checked)} />
                <span></span>
              </label>
            </div>
          </Card>
      </div>

      {activeTab === 'company' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
           <Card className="glass-surface" style={{ padding: '2rem', borderRadius: '24px' }}>
              <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <LuZap size={22} color="var(--primary)" /> Visual Identity
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: branding.primaryColor, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                    <div style={{ flex: 1 }}>
                       <label className="label">Primary Theme Color</label>
                       <input 
                         type="color" 
                         value={branding.primaryColor} 
                         onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                         style={{ width: '100%', height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                       />
                    </div>
                 </div>
                 <div style={{ padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                      This color will be synchronized across all teammate dashboards for {myCompany?.name}.
                    </p>
                 </div>
              </div>
           </Card>

           <Card className="glass-surface" style={{ padding: '2rem', borderRadius: '24px' }}>
              <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <LuShieldCheck size={22} color="var(--primary)" /> Spend Governance
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                 <Input 
                   label="Manager Approval Threshold (₹)" 
                   type="number"
                   value={branding.approvalThreshold}
                   onChange={e => setBranding({...branding, approvalThreshold: parseInt(e.target.value) || 0})}
                 />
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                   Orders exceeding this value will require **direct managerial sign-off** before being routed to the fulfillment center.
                 </div>
                 <Button variant="primary" onClick={handleSaveCompany} style={{ height: '52px', borderRadius: '14px' }}>Apply Governance Update</Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default ClientSettings;
