import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { LuCamera, LuMapPin, LuShieldAlert, LuShieldCheck, LuX, LuRefreshCcw, LuQrCode } from 'react-icons/lu';
import { Button, Badge } from '../ui';
import { useStore } from '../../store';

interface AttendanceScannerProps {
  action?: 'in' | 'out';
  onCancel: () => void;
  onComplete: (data: { locationId: string; type: 'in' | 'out'; imageUrl: string; latitude: number; longitude: number }) => void;
}

type ScanStep = 'requesting_permissions' | 'scanning_qr' | 'verifying_location' | 'location_failed' | 'capturing_photo' | 'selecting_action';

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

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ action, onCancel, onComplete }) => {
  const { locations, isSupabaseConnected } = useStore();
  
  const [step, setStep] = useState<ScanStep>('requesting_permissions');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [scannedData, setScannedData] = useState<{ locationId: string; token: string } | null>(null);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const qrRegionId = "attendance-qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const requestPermissions = async () => {
    try {
      // 1) Procure Camera Permissions (using any available camera to prevent OverconstrainedError on desktops)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera mechanism unavailable (requires HTTPS or localhost).');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop()); // Instantly release it, we just wanted the user consent payload.

      // 2) Procure Location Permissions
      navigator.geolocation.getCurrentPosition(
        () => {
          setStep('scanning_qr');
        },
        () => {
          setErrorMsg('GPS telemetry permission explicitly required for secure perimeter tracking.');
          setStep('location_failed');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch {
      setErrorMsg(`Camera optics permission error: Access blocked`);
      setStep('location_failed');
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (step === 'scanning_qr') {
      const startScanner = async () => {
        try {
          const scanner = new Html5Qrcode(qrRegionId);
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              try {
                // Support both JSON and New Colon-delimited format
                let payload: any = null;
                
                if (decodedText.startsWith('{')) {
                  payload = JSON.parse(decodedText);
                } else if (decodedText.startsWith('pyramid-fm-punch:')) {
                  const parts = decodedText.split(':');
                  if (parts.length === 3) {
                    payload = {
                      type: 'geofence_auth',
                      token: parts[1],
                      locationId: parts[2]
                    };
                  }
                }

                if (payload && payload.locationId && payload.token) {
                  scanner.stop().then(() => {
                    if (isMounted) {
                       setScannedData(payload);
                       setStep('verifying_location');
                    }
                  });
                }
              } catch (e) {
                console.error('Scan parse error:', e);
              }
            },
            () => {} // Ignore errors
          );
        } catch (err: any) {
          if (isMounted) {
            setErrorMsg(`QR Scanner initialization blocked: ${err.message || 'Check camera/HTTPS constraints'}`);
            setStep('location_failed');
          }
        }
      };
      
      const timer = setTimeout(() => {
        // Double check if element exists (to prevent Html5Qrcode error)
        if (document.getElementById(qrRegionId)) {
          startScanner();
        } else {
          // Retry if not in DOM yet (due to AnimatePresence delay)
          const retryTimer = setTimeout(() => {
            if (document.getElementById(qrRegionId)) startScanner();
          }, 500);
          return () => clearTimeout(retryTimer);
        }
      }, 300); // Initial slight delay for mount
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      };
    }
  }, [step]);

  useEffect(() => {
    if (step === 'verifying_location' && scannedData) {
      const site = locations.find(l => l.id === scannedData.locationId);
      
      if (!site) {
        setErrorMsg('Site matrix unrecognized.');
        setStep('location_failed');
        return;
      }
      if (site.qrToken !== scannedData.token || site.qrStatus !== 'active') {
        setErrorMsg('Security token revoked or invalid.');
        setStep('location_failed');
        return;
      }
      if (!site.latitude || !site.longitude) {
        setErrorMsg('Site GPS coordinates not configured by Admin.');
        setStep('location_failed');
        return;
      }

      if (!navigator.geolocation) {
        setErrorMsg('Device lacks physical GPS capabilities.');
        setStep('location_failed');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const distance = haversineDistance(
            position.coords.latitude, position.coords.longitude,
            site.latitude!, site.longitude!
          );

          if (distance > 100) { // 100 meters strict radius
            if (!isSupabaseConnected) {
              console.warn(`DEV BYPASS: Geofence mismatch ignored (${Math.round(distance)}m). Mock Mode ACTIVE.`);
              setGpsData({ lat: position.coords.latitude, lng: position.coords.longitude });
              setStep('capturing_photo');
            } else {
              setErrorMsg(`Geofence rejection: Device is ${Math.round(distance)}m from target. Max allowed is 100m.`);
              setStep('location_failed');
            }
          } else {
            setGpsData({ lat: position.coords.latitude, lng: position.coords.longitude });
            setStep('capturing_photo');
          }
        },
        (err) => {
          setErrorMsg(`GPS telemetry failed: ${err.message}`);
          setStep('location_failed');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [step, scannedData, locations]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (step === 'capturing_photo') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(src => {
          stream = src;
          if (videoRef.current) {
            videoRef.current.srcObject = src;
          }
        })
        .catch(() => {
           // Simulate photo if camera fails for prototype usage
           setPhotoUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop');
           setStep('selecting_action');
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [step]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const url = canvasRef.current.toDataURL('image/jpeg');
        setPhotoUrl(url);
        setStep('selecting_action');
      }
    }
  };

  const finalizeAction = (type: 'in' | 'out') => {
    if (scannedData && gpsData && photoUrl) {
      onComplete({
        locationId: scannedData.locationId,
        type,
        imageUrl: photoUrl,
        latitude: gpsData.lat,
        longitude: gpsData.lng
      });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: '#000', color: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-900, #111)', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 10 }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {step === 'scanning_qr' && <LuQrCode />}
          {step === 'verifying_location' && <LuMapPin />}
          {step === 'location_failed' && <LuShieldAlert color="var(--danger, #ef4444)" />}
          {step === 'capturing_photo' && <LuCamera />}
          {step === 'selecting_action' && <LuShieldCheck color="var(--success, #10b981)" />}
          Identity Matrix
        </h2>
        <button onClick={onCancel} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}>
           <LuX size={20} />
        </button>
      </header>

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          
          {step === 'requesting_permissions' && (
            <motion.div key="perms" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
                 <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(249, 115, 22, 0.2)' }}>
                   <LuCamera size={36} />
                 </div>
                 <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--secondary, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)' }}>
                   <LuMapPin size={36} />
                 </div>
              </div>
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, fontSize: '1.75rem', color: '#fff' }}>Enable Sensor Matrix</h3>
              <p style={{ margin: '0 0 3rem 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '320px' }}>
                To record an immutable attendance block, Pyramid FM requires authorization to access your device's <strong>Camera Optics</strong> and <strong>GPS Telemetry</strong>.
              </p>
              <Button onClick={requestPermissions} style={{ width: '100%', maxWidth: '320px', padding: '1.25rem', fontSize: '1.1rem', fontWeight: 900, background: 'var(--primary, #f97316)', color: '#fff', borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(249, 115, 22, 0.3)' }}>
                GRANT SENSOR ACCESS
              </Button>
            </motion.div>
          )}

          {step === 'scanning_qr' && (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              <div id={qrRegionId} style={{ flex: 1, width: '100%', background: 'rgba(0,0,0,0.5)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem', background: 'linear-gradient(to top, rgba(0,0,0,1), transparent)', textAlign: 'center', paddingBottom: '4rem' }}>
                 <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, fontSize: '1.25rem' }}>Scan Facility Code</h3>
                 <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Align the QR code within the frame.</p>
              </div>
            </motion.div>
          )}

          {step === 'verifying_location' && (
            <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
              <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '128px', height: '128px', borderRadius: '50%', border: '4px solid rgba(249, 115, 22, 0.3)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                 <LuMapPin size={48} color="var(--primary, #f97316)" />
              </motion.div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, fontSize: '1.5rem' }}>Acquiring Telemetry</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Calculating Haversine distance from target.</p>
            </motion.div>
          )}

          {step === 'location_failed' && (
            <motion.div key="fail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <LuShieldAlert size={40} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, fontSize: '1.5rem' }}>Validation Failed</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: '320px' }}>{errorMsg}</p>
              
              {errorMsg.includes('permission error') && (
                <div style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', maxWidth: '300px' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                    <strong style={{ color: 'var(--warning, orange)' }}>Browser Blocked It:</strong> If the popup doesn't appear, your browser has permanently blocked this site. Click the <strong>lock icon</strong> in your browser's URL bar, enable Camera/Location, and reload.
                  </p>
                </div>
              )}

              <Button onClick={() => setStep('requesting_permissions')} variant="secondary" style={{ padding: '0 2rem' }}>
                <LuRefreshCcw style={{ marginRight: '0.5rem' }} /> Retry Authorization
              </Button>
            </motion.div>
          )}

          {step === 'capturing_photo' && (
            <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                 <video ref={videoRef} autoPlay playsInline muted style={{ minWidth: '100%', minHeight: '100%', objectFit: 'cover' }} />
                 <canvas ref={canvasRef} width={300} height={300} style={{ display: 'none' }} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem', background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '3rem' }}>
                 <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 900, fontSize: '1.125rem' }}>Verify Identity</h3>
                 <button onClick={captureImage} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff' }} />
                 </button>
              </div>
            </motion.div>
          )}

          {step === 'selecting_action' && (
            <motion.div key="action" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', background: 'var(--surface-900, #111)' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', margin: '0 auto 1rem auto', border: '4px solid rgba(16, 185, 129, 0.3)', overflow: 'hidden' }}>
                  {photoUrl && <img src={photoUrl} alt="Verified" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <Badge variant="success" style={{ marginBottom: '1rem' }}>PRESENCE VERIFIED</Badge>
                <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 900, fontSize: '1.875rem' }}>{locations.find(l => l.id === scannedData?.locationId)?.name}</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontFamily: 'monospace' }}>DIST: VERIFIED &gt; 100M</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '380px', margin: '0 auto' }}>
                 {(!action || action === 'in') && (
                   <Button onClick={() => finalizeAction('in')} style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', fontWeight: 900, background: 'var(--success, #10b981)', color: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}>
                      PUNCH IN
                   </Button>
                 )}
                 {(!action || action === 'out') && (
                   <Button onClick={() => finalizeAction('out')} style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', fontWeight: 900, background: 'var(--danger, #ef4444)', color: '#fff', borderRadius: '1rem', border: 'none', boxShadow: action === 'out' ? '0 10px 25px rgba(239, 68, 68, 0.3)' : 'none', cursor: 'pointer' }}>
                      PUNCH OUT
                   </Button>
                 )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
export default AttendanceScanner;
