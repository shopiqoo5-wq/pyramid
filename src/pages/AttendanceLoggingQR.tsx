import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { Button, Card } from '../components/ui';
import { LuCamera, LuQrCode, LuShieldCheck, LuMapPin, LuLogOut, LuClock, LuUserCheck } from 'react-icons/lu';
import { generateUUID } from '../lib/supabaseUtils';

const AttendanceLoggingQR: React.FC = () => {
  const { locations, addAlert } = useStore();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mode, setMode] = useState<'kiosk' | 'qr'>('kiosk');
  const [step, setStep] = useState<'select' | 'active'>('select');
  const [qrToken, setQrToken] = useState<string>('');

  useEffect(() => {
    if (step === 'active' && mode === 'qr') {
      const token = generateUUID();
      queueMicrotask(() => setQrToken(token));
      const interval = setInterval(() => {
        setQrToken(generateUUID());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [step, mode]);

  const location = locations.find(l => l.id === selectedLocation);

  if (step === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Card style={{ maxWidth: '600px', width: '100%', padding: '3rem', borderRadius: '40px', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'var(--primary-glow)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: '0 20px 40px var(--primary-glow)' }}>
            <LuMapPin size={48} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 950, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>Site Kiosk Setup</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', fontWeight: 600 }}>Configure this terminal for facility deployment.</p>

          <div className="input-group" style={{ textAlign: 'left' }}>
            <label className="input-label" style={{ fontSize: '1rem', marginBottom: '1rem' }}>Select Deployment Facility</label>
            <select 
              className="input-field"
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ height: '70px', borderRadius: '20px', fontSize: '1.2rem', fontWeight: 800 }}
            >
              <option value="">Choose Site location...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} - {loc.state}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2.5rem' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setMode('kiosk'); setStep('active'); }}
              disabled={!selectedLocation}
              style={{ padding: '2rem', borderRadius: '30px', background: mode === 'kiosk' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)', border: mode === 'kiosk' ? '2px solid var(--primary)' : '2px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
            >
              <LuCamera size={32} color={mode === 'kiosk' ? 'var(--primary)' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Facial Kiosk</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setMode('qr'); setStep('active'); }}
              disabled={!selectedLocation}
              style={{ padding: '2rem', borderRadius: '30px', background: mode === 'qr' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--surface-hover)', border: mode === 'qr' ? '2px solid var(--primary)' : '2px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
            >
              <LuQrCode size={32} color={mode === 'qr' ? 'var(--primary)' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Dynamic QR</span>
            </motion.button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 950 }}>P</div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, letterSpacing: '-0.02em' }}>{location?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
              <LuShieldCheck size={16} color="var(--success)" />
              Secure Biometric Terminal
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <h3 style={{ fontSize: '1.5rem', fontWeight: 950, margin: 0 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>
           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        {mode === 'qr' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '3rem', background: '#fff', borderRadius: '50px', boxShadow: '0 40px 100px rgba(0,0,0,0.1)', marginBottom: '3rem', position: 'relative' }}>
              <div style={{ width: '400px', height: '400px', background: '#f8f9fa', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ border: '20px solid #000', width: '300px', height: '300px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 30, left: 30, right: 30, bottom: 30, border: '10px solid #000' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', background: 'var(--primary)', borderRadius: '20px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '2rem' }}>P</div>
                </div>
              </div>
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '0.75rem 2rem', borderRadius: '20px', fontWeight: 900, fontSize: '0.9rem', boxShadow: '0 10px 30px var(--primary-glow)' }}
              >
                TOKEN REFRESHING... {qrToken.slice(0, 4)}
              </motion.div>
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: 950, letterSpacing: '-0.04em', marginBottom: '1rem' }}>Scan to Log Attendance</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 600 }}>Point your mobile employee portal camera at the screen.</p>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
             <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: '50px', marginBottom: '3rem', overflow: 'hidden', position: 'relative', boxShadow: '0 40px 120px rgba(0,0,0,0.2)' }}>
                <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--primary)', borderRadius: '50px', pointerEvents: 'none', zIndex: 10 }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', border: '2px dashed #fff', borderRadius: '50%', opacity: 0.5 }} />
                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', color: '#fff', padding: '1rem 2rem', borderRadius: '20px', fontWeight: 900, fontSize: '1rem' }}>
                    ALIGN FACE WITHIN THE CIRCLE
                </div>
             </div>
             
             <div style={{ display: 'flex', gap: '2rem' }}>
                <Button 
                  variant="primary" 
                  style={{ flex: 1, height: '80px', borderRadius: '30px', fontSize: '1.5rem', fontWeight: 950 }}
                  onClick={() => addAlert({ message: 'Identity Verified. Logged In.', type: 'success' })}
                >
                  <LuUserCheck size={32} style={{ marginRight: '1rem' }} /> PUSH TO LOG IN
                </Button>
                <Button 
                  variant="secondary" 
                  style={{ flex: 1, height: '80px', borderRadius: '30px', fontSize: '1.5rem', fontWeight: 950 }}
                  onClick={() => addAlert({ message: 'Identity Verified. Logged Out.', type: 'warning' })}
                >
                  <LuLogOut size={32} style={{ marginRight: '1rem' }} /> PUSH TO LOG OUT
                </Button>
             </div>
          </div>
        )}
      </main>

      <footer style={{ padding: '2rem 4rem', display: 'flex', justifyContent: 'center', gap: '4rem' }}>
        <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
          <LuClock size={20} /> CHANGE SITE CONFIG
        </button>
      </footer>
    </div>
  );
};

export default AttendanceLoggingQR;
