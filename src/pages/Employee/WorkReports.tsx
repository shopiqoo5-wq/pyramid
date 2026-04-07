import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { Card, Badge, Button } from '../../components/ui';
import { 
  LuCamera, LuSend, LuClock, LuCheck, LuX, 
  LuImage as LuImageIcon, LuPlus, LuMapPin, LuInfo, LuShieldCheck
} from 'react-icons/lu';
import './Employee.css';

const WORK_REPORT_EVIDENCE_INPUT_ID = 'work-report-evidence-file';

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
  const { currentUser, workReports, employees, submitWorkReport, locations, isSupabaseConnected } = useStore();

  const employee = employees.find(e => e.userId === currentUser?.id);
  const effectiveEmployeeId = employee?.id || currentUser?.id || '';
  const effectiveLocationId = employee?.locationId || currentUser?.locationId || locations[0]?.id || '';
  const site = locations.find(l => l.id === effectiveLocationId);
  
  const [showForm, setShowForm] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const revokePreviewUrl = () => {
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
  };

  const setPhotoFromFile = (file: File) => {
    revokePreviewUrl();
    const url = URL.createObjectURL(file);
    imageObjectUrlRef.current = url;
    setImageFile(file);
    setImagePreview(url);
  };

  /** Opening the sheet fresh avoids stale photos; no-coords sites skip the Verify tap. */
  const openReportForm = useCallback(() => {
    revokePreviewUrl();
    setImageFile(null);
    setImagePreview(null);
    setReportText('');
    setDistError(null);
    setLocationVerified(false);
    setIsVerifying(false);
    setShowForm(true);
  }, []);

  const closeReportForm = useCallback(() => {
    revokePreviewUrl();
    setImageFile(null);
    setImagePreview(null);
    setShowForm(false);
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const missingCoords =
      site?.latitude == null ||
      site?.longitude == null ||
      Number.isNaN(site.latitude) ||
      Number.isNaN(site.longitude);
    if (missingCoords) {
      setLocationVerified(true);
      setDistError('Site coordinates not configured. Verification bypassed for operational continuity.');
    }
  }, [showForm, site?.latitude, site?.longitude]);

  useEffect(() => () => revokePreviewUrl(), []);

  useEffect(() => {
    if (!showForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showForm]);

  const verifyGeofence = () => {
    if (
      site?.latitude == null ||
      site?.longitude == null ||
      Number.isNaN(site.latitude) ||
      Number.isNaN(site.longitude)
    ) {
      setDistError("Site coordinates not configured. Verification bypassed for operational continuity.");
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

        if (distance > 150) { 
          if (!isSupabaseConnected || import.meta.env.VITE_BYPASS_GEOFENCE === 'true') {
             setDistError(`Testing Bypass: Geofence mismatch ignored (${Math.round(distance)}m).`);
             setLocationVerified(true);
          } else {
             const errorMsg = `Geofence rejection: You are ${Math.round(distance)}m away from ${site.name}.`;
             setDistError(errorMsg);
             useStore.getState().addAlert({ message: errorMsg, type: 'error' });
             setLocationVerified(false);
          }
        } else {
          setLocationVerified(true);
        }
        setIsVerifying(false);
      },
      (err) => {
        setDistError(`GPS Failure: ${err.message}. Bypassing for manual audit.`);
        setLocationVerified(true);
        setIsVerifying(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const myReports = workReports
    .filter(r => r.employeeId === effectiveEmployeeId || r.userId === currentUser?.id)
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => new Date(b.createdAt || (b as any).timestamp || '').getTime() - new Date(a.createdAt || (a as any).timestamp || '').getTime());

  const handleReportSubmit = async () => {
    if (!currentUser) {
      setDistError('Authentication required. Please sign in again.');
      return;
    }
    if (!reportText?.trim()) {
      setDistError('Remarks are required before submitting.');
      return;
    }
    if (!effectiveEmployeeId) {
      setDistError('Unable to resolve your staff id. Sign in again or contact admin.');
      return;
    }
    if (!imagePreview) {
      useStore.getState().addAlert({ message: 'Add a photo before submitting.', type: 'warning' });
      return;
    }

    let fileToSend = imageFile;
    if (!fileToSend && imagePreview.startsWith('blob:')) {
      try {
        const res = await fetch(imagePreview);
        const blob = await res.blob();
        fileToSend = new File([blob], 'evidence.jpg', { type: blob.type || 'image/jpeg' });
      } catch (err: any) {
        console.error('File read error:', err);
        useStore.getState().addAlert({ message: 'Could not read the photo. Capture it again.', type: 'error' });
        return;
      }
    }

    setIsCapturing(true);

    try {
      await submitWorkReport({
        employeeId: effectiveEmployeeId,
        userId: currentUser.id,
        locationId: effectiveLocationId || undefined,
        remarks: reportText.trim(),
        imageUrl: imagePreview || 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?auto=format&fit=crop&q=80&w=800'
      }, fileToSend || undefined);

      // Reset form
      revokePreviewUrl();
      setShowForm(false);
      setReportText('');
      setImagePreview(null);
      setImageFile(null);
      setDistError(null);
      setLocationVerified(false);
      
      // Success feedback via store alert
      useStore.getState().addAlert({ 
        message: "Operations Report Transmitted Successfully.", 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('Submission failed:', error);
      const msg = error.message || 'Transmission protocols disrupted. Retry required.';
      setDistError(msg);
      useStore.getState().addAlert({ message: msg, type: 'error' });
    } finally {
      setIsCapturing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const needsSiteVerify =
    site?.latitude != null &&
    site?.longitude != null &&
    !Number.isNaN(site.latitude) &&
    !Number.isNaN(site.longitude);
  const submitDisabled =
    isCapturing || !reportText?.trim() || !imagePreview || !locationVerified;
  const submitHint = !reportText?.trim()
    ? 'Add operational remarks to continue.'
    : !imagePreview
      ? 'Add a photo (camera or library) to continue.'
      : !locationVerified
        ? needsSiteVerify
          ? 'Tap Verify to confirm you are at the site.'
          : 'Waiting for location check…'
        : null;

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
            type="button"
            variant="primary" 
            onClick={openReportForm}
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
                         {formatDate(report.createdAt || (report as any).timestamp || '')}
                       </span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '2px', fontWeight: 800 }}>
                         <LuClock size={12} /> {new Date(report.createdAt || (report as any).timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Submission modal: portal + no motion transform — fixes footer off-screen (flex minHeight:0) and mobile taps */}
      {showForm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="scanner-overlay-immersive work-report-evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-report-evidence-title"
            style={{
              background: 'var(--bg-color)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              overscrollBehavior: 'contain',
              zIndex: 10000,
            }}
          >
            <header style={{ flexShrink: 0, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Badge variant="primary" style={{ marginBottom: '0.5rem' }}>EVIDENCE CAPTURE</Badge>
                <h2 id="work-report-evidence-title" style={{ fontSize: '1.8rem', fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--text-main)' }}>Submit Report</h2>
              </div>
              <button type="button" onClick={closeReportForm} style={{ background: 'var(--surface-hover)', border: 'none', color: 'var(--text-muted)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LuX size={20} />
              </button>
            </header>
            
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                padding: '0.5rem 0.5rem 1rem 0.5rem',
              }}
              className="hide-scrollbar"
            >
              <div className="input-group" style={{ margin: 0 }}>
                <span className="input-label" style={{ marginBottom: '1rem', display: 'block' }}>Photographic Evidence (Required)</span>
                <label
                  htmlFor={WORK_REPORT_EVIDENCE_INPUT_ID}
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
                    boxShadow: 'inset 0 4px 24px rgba(0,0,0,0.06)',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                  }}
                >
                  <input
                    id={WORK_REPORT_EVIDENCE_INPUT_ID}
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPhotoFromFile(file);
                      e.target.value = '';
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0.01,
                      cursor: 'pointer',
                      fontSize: '16px',
                      zIndex: 2,
                      WebkitAppearance: 'none',
                    }}
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Evidence"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                        position: 'absolute',
                        inset: 0,
                      }}
                    />
                  ) : (
                    <>
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 30px var(--primary-glow)',
                          pointerEvents: 'none',
                        }}
                      >
                        <LuCamera size={36} />
                      </div>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          textAlign: 'center',
                          padding: '0 1rem',
                          pointerEvents: 'none',
                        }}
                      >
                        Add photo — camera or library
                      </span>
                    </>
                  )}
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    marginTop: '0.75rem',
                    width: '100%',
                    borderRadius: '14px',
                    fontWeight: 800,
                    minHeight: '44px',
                    touchAction: 'manipulation',
                  }}
                >
                  Choose photo
                </Button>
                
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
                   {site?.latitude == null && !distError && (
                     <div style={{ marginTop: '1rem', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem', background: 'var(--primary)', borderRadius: '16px', boxShadow: '0 8px 20px var(--primary-glow)', opacity: 0.9 }}>
                        <LuInfo size={18} /> Site coordinates not configured. Verification bypassed.
                     </div>
                   )}
                   {distError && (
                     <div
                       style={{
                         marginTop: '1rem',
                         color: '#fff',
                         fontSize: '0.85rem',
                         fontWeight: 800,
                         display: 'flex',
                         alignItems: 'center',
                         gap: '8px',
                         padding: '1rem',
                         borderRadius: '16px',
                         background:
                           /bypass|not configured|GPS Failure/i.test(distError)
                             ? 'var(--primary)'
                             : 'var(--danger)',
                         boxShadow:
                           /bypass|not configured|GPS Failure/i.test(distError)
                             ? '0 8px 20px var(--primary-glow)'
                             : '0 8px 20px rgba(239, 68, 68, 0.4)',
                       }}
                     >
                        <LuInfo size={18} /> {distError}
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

            <div
              style={{
                flexShrink: 0,
                padding: '1rem 0 calc(1rem + env(safe-area-inset-bottom, 20px))',
                background: 'var(--bg-color)',
                borderTop: '1px solid var(--border)',
                touchAction: 'manipulation',
              }}
            >
              {submitHint && (
                <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textAlign: 'center', background: 'var(--primary-glow)', padding: '0.5rem', borderRadius: '12px' }}>
                  {submitHint}
                </p>
              )}
               <Button 
                type="button"
                onClick={() => void handleReportSubmit()}
                disabled={submitDisabled}
                variant="primary"
                style={{ width: '100%', minHeight: '56px', borderRadius: '24px', fontSize: '1.05rem', fontWeight: 950, boxShadow: '0 20px 40px var(--primary-glow)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', position: 'relative', zIndex: 2 }}
              >
                {isCapturing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <LuClock size={24} />
                  </motion.div>
                ) : <LuSend size={24} style={{ marginRight: '8px' }} />}
                {isCapturing ? 'TRANSMITTING...' : 'UPLOAD EVIDENCE'}
              </Button>
            </div>
          </div>,
          document.body
        )}

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
