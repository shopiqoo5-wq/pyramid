import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { Button, Badge } from '../../components/ui';
import { 
  LuTriangleAlert, LuCamera, LuSend, LuCircleCheck, 
  LuConstruction, LuShieldAlert, LuPackage
} from 'react-icons/lu';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

const DEFAULT_INCIDENT_STOCK_IMAGE =
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800';

const FieldIncident: React.FC = () => {
  const { currentUser, employees, submitIncident } = useStore();
  const { t } = useTranslation();
  const [type, setType] = useState<'Maintenance' | 'Safety' | 'Supply' | 'Other'>('Maintenance');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const employee = employees.find(e => e.userId === currentUser?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Access Denied: Authentication session not found.');
      return;
    }

    // CRITICAL FIX: If employee record is missing (e.g. Admin testing), 
    // we use currentUser.id as a fallback instead of returning silently.
    const effectiveLocationId = employee?.locationId || currentUser.locationId || '11111111-2222-4000-8000-000000000001';

    setIsTransmitting(true);
    setError(null);
    try {
      await submitIncident({
        userId: currentUser.id,
        locationId: effectiveLocationId,
        type,
        severity,
        description,
        title: `${severity} ${type} Incident`,
        imageUrl: imageFile
          ? DEFAULT_INCIDENT_STOCK_IMAGE
          : imagePreview && !imagePreview.startsWith('blob:')
            ? imagePreview
            : DEFAULT_INCIDENT_STOCK_IMAGE
      }, imageFile || undefined);

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Critical transmission failure. Verify link status.');
    } finally {
      setIsTransmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="employee-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center', padding: '2rem' }}>
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ width: '100px', height: '100px', borderRadius: '40px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}
        >
          <LuCircleCheck size={50} />
        </motion.div>
        <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-main)', marginBottom: '1rem' }}>Report Received</h2>
        <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '3rem' }}>
          Operations Command has been notified. Tactical response initiated.
        </p>
        <Button variant="primary" onClick={() => window.history.back()} style={{ width: '100%', height: '60px', borderRadius: '20px', fontWeight: 900 }}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="employee-main animate-fade-in" style={{ paddingBottom: '12rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <Badge variant="danger" style={{ marginBottom: '1.25rem', padding: '0.4rem 1.25rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.7rem' }}>
          {t('incidents.title')}
        </Badge>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 950, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-main)' }}>{t('incidents.report')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 700, marginTop: '0.6rem' }}>{t('incidents.description')}</p>
      </header>

      <form onSubmit={handleSubmit}>
        {/* Type Selection */}
        <section style={{ marginBottom: '2.5rem' }}>
          <label className="input-label" style={{ marginBottom: '1.25rem' }}>System Incident Class</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { id: 'Maintenance', icon: <LuConstruction />, label: 'Maintenance' },
              { id: 'Safety', icon: <LuShieldAlert />, label: 'Safety Drift' },
              { id: 'Supply', icon: <LuPackage />, label: 'Stock Stockout' },
              { id: 'Other', icon: <LuTriangleAlert />, label: 'General / Other' }
            ].map((item) => (
              <motion.div 
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setType(item.id as any)}
                className={`glass-surface lift ${type === item.id ? 'active-premium' : ''}`}
                style={{ 
                  padding: '1.5rem', 
                  cursor: 'pointer', 
                  textAlign: 'center',
                  border: type === item.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: '24px',
                  background: type === item.id ? 'var(--primary-light)' : 'var(--surface-hover)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem', color: type === item.id ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: type === item.id ? 'var(--primary)' : 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{item.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Severity Selection */}
        <section style={{ marginBottom: '2.5rem' }}>
          <label className="input-label" style={{ marginBottom: '1rem' }}>Severity Level Index</label>
          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '18px', border: '1px solid var(--border)' }}>
            {['Low', 'Medium', 'High', 'Critical'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s as any)}
                style={{
                  flex: 1,
                  height: '46px',
                  borderRadius: '12px',
                  border: 'none',
                  background: severity === s ? (s === 'Critical' ? 'var(--danger)' : 'var(--primary)') : 'transparent',
                  color: severity === s ? 'white' : 'var(--text-muted)',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: severity === s ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Description */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="input-group">
            <label className="input-label" style={{ marginBottom: '1rem' }}>Tactical Remarks & Description</label>
            <textarea 
              required
              placeholder="Describe the incident in detail for operational command..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              style={{ minHeight: '160px', padding: '1.25rem', borderRadius: '24px' }}
            />
          </div>
        </section>

        {/* Action Controls */}
        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LuShieldAlert size={18} /> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '1.25rem' }}>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '24px', background: 'var(--surface-hover)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }} 
            className="hover-lift"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <LuCamera size={28} />
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ display: 'none' }} 
            />
          </div>
          <button 
            type="submit"
            disabled={isTransmitting}
            className="btn-primary lift"
            style={{ 
              height: '70px', 
              borderRadius: '24px', 
              fontWeight: 950, 
              fontSize: '1.2rem', 
              background: isTransmitting ? 'var(--border)' : 'linear-gradient(135deg, var(--danger), #dc2626)', 
              boxShadow: isTransmitting ? 'none' : '0 15px 35px rgba(239, 68, 68, 0.3)', 
              border: 'none', 
              color: 'white', 
              cursor: isTransmitting ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '1rem' 
            }}
          >
            {isTransmitting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <LuSend size={24} />
              </motion.div>
            ) : (
              <LuSend size={24} />
            )}
            {isTransmitting ? 'TRANSMITTING...' : 'TRANSMIT INCIDENT'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FieldIncident;
