import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { Card, Badge, Button } from '../../components/ui';
import { 
  LuCamera, LuSend, LuClock, LuCheck, LuX, 
  LuImage as LuImageIcon, LuPlus, LuMapPin, LuShieldAlert, LuShieldCheck
} from 'react-icons/lu';
import './Employee.css';

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in meters
};

const WorkReports: React.FC = () => {
  const { currentUser, workReports, employees, submitWorkReport, locations } = useStore();

  const employee = employees.find(e => e.userId === currentUser?.id);
  const site = locations.find(l => l.id === employee?.locationId);
  
  const [showForm, setShowForm] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const verifyGeofence = () => {
    if (!site?.latitude || !site?.longitude) {
      setDistError("Site coordinates not configured. Verification bypassed.");
      setLocationVerified(true);
      return;
    }

    setIsVerifying(true);
    setDistError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = haversineDistance(
          pos.coords.latitude, pos.coords.longitude,
          site.latitude!, site.longitude!
        );

        if (distance > 150) { // Slightly more lenient 150m for reports
          setDistError(`Geofence rejection: You are ${Math.round(distance)}m away from ${site.name}.`);
          setLocationVerified(false);
        } else {
          setLocationVerified(true);
        }
        setIsVerifying(false);
      },
      (err) => {
        setDistError(`GPS Failure: ${err.message}`);
        setIsVerifying(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const myReports = workReports
    .filter(r => r.employeeId === employee?.id)
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleReportSubmit = async () => {
    if (!employee || !reportText) return;
    setIsCapturing(true);

    try {
      await submitWorkReport({
        employeeId: employee.id,
        remarks: reportText,
        imageUrl: imagePreview || '',
      });

      // Reset form
      setShowForm(false);
      setReportText('');
      setImagePreview(null);
    } finally {
      setIsCapturing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="employee-main animate-fade-in" style={{ paddingBottom: '7rem' }}>
      <header style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Evidence <span style={{ color: 'var(--primary)' }}>Archive</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
          Manage your submitted field reports and operational photography.
        </p>

        <motion.div whileTap={{ scale: 0.98 }} style={{ marginTop: '1.5rem' }}>
          <Button 
            variant="primary" 
            onClick={() => setShowForm(true)}
            style={{ width: '100%', height: '60px', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 900, boxShadow: '0 15px 30px var(--primary-glow)' }}
          >
            <LuPlus size={22} style={{ marginRight: '8px' }} /> NEW REPORT
          </Button>
        </motion.div>
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: '0 1.5rem', display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.5rem' }} className="hide-scrollbar">
         {['all', 'pending', 'approved', 'rejected'].map(f => (
           <button
             key={f}
             onClick={() => setFilter(f as any)}
             style={{
               padding: '0.6rem 1.25rem',
               borderRadius: '16px',
               fontWeight: 900,
               fontSize: '0.75rem',
               textTransform: 'uppercase',
               letterSpacing: '0.05em',
               whiteSpace: 'nowrap',
               border: filter === f ? 'transparent' : '1px solid var(--border)',
               background: filter === f 
                  ? (f === 'approved' ? 'var(--success)' : f === 'rejected' ? 'var(--danger)' : f === 'pending' ? 'var(--warning)' : 'var(--text-main)')
                  : 'transparent',
               color: filter === f ? (f === 'pending' ? '#000' : '#fff') : 'var(--text-main)',
               transition: 'all 0.2s ease'
             }}
           >
             {f}
           </button>
         ))}
      </div>

      {/* Reports Gallery */}
      <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <AnimatePresence>
          {myReports.map((report) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={report.id}
            >
              <Card variant="glass" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px', border: report.status === 'rejected' ? '1px solid var(--danger)' : '1px solid var(--border)' }}>
                 {report.imageUrl && (
                   <div 
                     style={{ height: '180px', background: 'var(--surface-sub)', position: 'relative' }}
                     onClick={() => setFullscreenImage(report.imageUrl!)}
                   >
                     <img src={report.imageUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     {report.status === 'approved' && (
                       <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(16, 185, 129, 0.4), transparent)', pointerEvents: 'none' }} />
                     )}
                   </div>
                 )}
                 
                 <div style={{ padding: '1.5rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                     <div>
                       <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                         {formatDate(report.timestamp)}
                       </span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '2px', fontWeight: 800 }}>
                         <LuClock size={12} /> {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </div>
                     </div>
                     <div>
                        {report.status === 'pending' && <Badge variant="warning">PENDING QA</Badge>}
                        {report.status === 'approved' && <Badge variant="success">VERIFIED</Badge>}
                        {report.status === 'rejected' && <Badge variant="danger">REJECTED</Badge>}
                     </div>
                   </div>

                   <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-strong)' }}>
                     <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5, fontWeight: 600 }}>
                       "{report.remarks}"
                     </p>
                   </div>

                   {report.status === 'rejected' && (
                     <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                       <LuX size={16} /> Audit Failed. Please resubmit clear evidence.
                     </div>
                   )}
                   {report.status === 'approved' && (
                     <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 800 }}>
                       <LuCheck size={16} /> Evidence mathematically validated.
                     </div>
                   )}
                 </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {myReports.length === 0 && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
             <LuImageIcon size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
             <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Records Found</div>
             <p style={{ fontSize: '0.9rem' }}>You have no evidence logs matching this filter criteria.</p>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="scanner-overlay-immersive"
            style={{ 
              background: 'var(--bg-color)', 
              backdropFilter: 'blur(40px)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              overscrollBehavior: 'contain'
            }}
          >
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Badge variant="primary" style={{ marginBottom: '0.5rem' }}>EVIDENCE CAPTURE</Badge>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--text-main)' }}>Submit Report</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-hover)', border: 'none', color: 'var(--text-muted)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LuX size={20} />
              </button>
            </header>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', padding: '0.5rem' }} className="hide-scrollbar">
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ marginBottom: '1rem' }}>Photographic Evidence (Required)</label>
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    aspectRatio: '1', 
                    borderRadius: '32px', 
                    background: 'rgba(var(--primary-rgb), 0.05)', 
                    border: '2px dashed var(--border)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '1rem', 
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: 'inset 0 4px 24px rgba(0,0,0,0.06)'
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px var(--primary-glow)' }}>
                        <LuCamera size={36} />
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Open Tactical Camera</span>
                    </>
                  )}
                  <input 
                    type="file" accept="image/*" capture="environment"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} 
                  />
                </motion.div>
                
                {/* Geofence Verification Block */}
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '24px', background: locationVerified ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-hover)', border: locationVerified ? '1px solid var(--success)' : '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <div style={{ padding: '0.5rem', borderRadius: '10px', background: locationVerified ? 'var(--success-bg)' : 'var(--primary-glow)', color: locationVerified ? 'var(--success)' : 'white' }}>
                            {locationVerified ? <LuShieldCheck size={20} /> : <LuMapPin size={20} />}
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: locationVerified ? 'var(--success)' : 'var(--text-main)' }}>
                               {locationVerified ? 'Location Secured' : 'Site Verification'}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                               {locationVerified ? 'Geofence handshake complete' : 'Waiting for GPS telemetry...'}
                            </span>
                         </div>
                      </div>
                      {!locationVerified && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={verifyGeofence}
                          disabled={isVerifying}
                          style={{ borderRadius: '12px' }}
                        >
                          {isVerifying ? 'Pulse...' : 'Verify'}
                        </Button>
                      )}
                   </div>
                   {distError && (
                     <div style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px' }}>
                        <LuShieldAlert size={16} /> {distError}
                     </div>
                   )}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Operational Remarks</label>
                <textarea 
                  placeholder="Describe the completed tasks or specific site conditions..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  className="input-field"
                  style={{ minHeight: '160px', padding: '1.25rem', borderRadius: '24px' }}
                />
              </div>
            </div>

            <div style={{ padding: '1rem 0' }}>
               <Button 
                onClick={handleReportSubmit}
                disabled={isCapturing || !reportText || !imagePreview || !locationVerified}
                variant="primary"
                style={{ width: '100%', height: '64px', borderRadius: '24px', fontSize: '1.1rem', fontWeight: 950, boxShadow: '0 20px 40px var(--primary-glow)' }}
              >
                {isCapturing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <LuClock size={24} />
                  </motion.div>
                ) : <LuSend size={24} style={{ marginRight: '8px' }} />}
                {isCapturing ? 'TRANSMITTING...' : 'UPLOAD EVIDENCE'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Viewer */}
      {fullscreenImage && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyItems: 'center', cursor: 'zoom-out' }}
          onClick={() => setFullscreenImage(null)}
        >
          <img src={fullscreenImage} alt="Fullscreen Evidence" style={{ width: '100%', maxHeight: '100vh', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '2rem', right: '1.5rem', color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 900, fontSize: '0.7rem', backdropFilter: 'blur(10px)' }}>
            TAP ANYWHERE TO CLOSE
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkReports;
