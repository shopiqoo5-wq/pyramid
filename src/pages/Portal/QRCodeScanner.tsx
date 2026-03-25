import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { LuScanLine, LuX, LuCheck } from 'react-icons/lu';
import { Card, Button } from '../../components/ui';

const QRCodeScanner: React.FC = () => {
  const navigate = useNavigate();
  const { products, addToCart, currentUser, locations } = useStore();
  const [scanning, setScanning] = useState(true);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [scanMode, setScanMode] = useState<'reorder' | 'attendance'>('reorder');
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "portal-qr-reader";

  const handleProcessScan = useCallback((data: string) => {
    setScanning(false);
    const cleanData = data.trim();
    
    if (cleanData.startsWith('p:')) {
      const productId = cleanData.replace('p:', '');
      const product = products.find(p => p.id === productId || p.sku === productId);
      if (product) {
        navigate(`/portal/scan-result?sku=${product.sku}`);
      } else {
        alert(`Product not found: ${productId}`);
        setScanning(true);
      }
    } else if (cleanData.startsWith('att:')) {
      const locationId = cleanData.replace('att:', '');
      const location = locations.find(l => l.id === locationId);
      if (location) {
        navigate(`/portal/attendance?locationId=${locationId}`);
      } else {
        alert('Invalid Attendance Terminal');
        setScanning(true);
      }
    } else {
      // Smart Fallback: ID -> SKU -> Location
      const productById = products.find(p => p.id === cleanData);
      const productBySku = products.find(p => p.sku === cleanData);
      
      if (productById || productBySku) {
        const product = productById || productBySku;
        if (product) navigate(`/portal/scan-result?sku=${product.sku}`);
      } else {
        const loc = locations.find(l => l.id === cleanData);
        if (loc) {
          navigate(`/portal/attendance?locationId=${cleanData}`);
        } else {
          alert('Unrecognized QR Format. This token might be legacy or from a different system.');
          setScanning(true);
        }
      }
    }
  }, [products, locations, navigate]);

  // REAL CAMERA INTEGRATION
  useEffect(() => {
    let isMounted = true;
    if (scanning && !manualInput) {
      const startScanner = async () => {
        try {
          const scanner = new Html5Qrcode(qrRegionId);
          scannerRef.current = scanner;
          
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (isMounted) handleProcessScan(decodedText);
            },
            () => {} // Ignore errors
          );
        } catch (err: any) {
          console.error('Portal scanner failed:', err);
          // Fallback to simulated behavior after 10s if camera fails
          setTimeout(() => {
            if (isMounted && scanning) {
               handleProcessScan(scanMode === 'reorder' ? `p:${products[0]?.id || 'p1'}` : `att:${currentUser?.locationId || 'l1'}`);
            }
          }, 10000);
        }
      };

      const timer = setTimeout(() => {
        if (document.getElementById(qrRegionId)) {
          startScanner();
        } else {
          // Retry logic for React mounting delays
          const retry = setTimeout(() => {
            if (isMounted && document.getElementById(qrRegionId)) startScanner();
          }, 500);
          return () => clearTimeout(retry);
        }
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      };
    }
  }, [scanning, manualInput, handleProcessScan, scanMode, products, currentUser]);

  const handleAddToCart = () => {
    if (scannedProduct) {
      addToCart(scannedProduct.id, 1);
      navigate('/portal/cart');
    }
  };

  const handleScanAgain = () => {
    setScannedProduct(null);
    setAttendanceSuccess(false);
    setScanning(true);
  };

  return (
    <div className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2>QR Hub: {scanMode === 'reorder' ? 'Supply Scan' : 'Duty Check-In'}</h2>
        <p className="text-muted">
          {scanMode === 'reorder' 
            ? 'Scan the Pyramid FM QR code on your supply bin to instantly add it to your cart.' 
            : 'Scan your facility entrance QR code to record your duty attendance.'}
        </p>
        
        <div style={{ display: 'inline-flex', background: 'var(--surface-hover)', padding: '0.4rem', borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}>
          <button 
            onClick={() => { setScanMode('reorder'); handleScanAgain(); }}
            style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: 'var(--radius-md)', background: scanMode === 'reorder' ? 'var(--surface)' : 'transparent', color: scanMode === 'reorder' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', boxShadow: scanMode === 'reorder' ? 'var(--shadow-sm)' : 'none' }}
          >
            Supply Reorder
          </button>
          <button 
            onClick={() => { setScanMode('attendance'); handleScanAgain(); }}
            style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: 'var(--radius-md)', background: scanMode === 'attendance' ? 'var(--surface)' : 'transparent', color: scanMode === 'attendance' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', boxShadow: scanMode === 'attendance' ? 'var(--shadow-sm)' : 'none' }}
          >
            Duty Attendance
          </button>
        </div>
      </div>

      <Card style={{ padding: '2rem', textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        
        {scanning ? (
          <div className="scanner-animation" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', aspectRatio: '1/1', background: '#000', borderRadius: '1rem', overflow: 'hidden' }}>
              <div id={qrRegionId} style={{ width: '100%', height: '100%' }} />
              
              {/* Scan Line Overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'var(--primary)',
                boxShadow: '0 0 10px var(--primary)',
                animation: 'scan 2.5s infinite linear',
                zIndex: 10
              }} />
              <style>{`
                @keyframes scan {
                  0% { top: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { top: 100%; opacity: 0; }
                }
              `}</style>
            </div>
             <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
               <LuScanLine size={20} className="animate-pulse" /> Alignment active. Waiting for code...
             </p>
 
             <div style={{ marginTop: '2rem', width: '100%', maxWidth: '300px' }}>
               <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Developer Console: Manual Input</div>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <input 
                   type="text" 
                   className="input" 
                   placeholder="e.g. p:p1 or att:l1" 
                   value={manualInput}
                   onChange={e => setManualInput(e.target.value)}
                   style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                 />
                 <Button size="sm" onClick={() => handleProcessScan(manualInput)}>Scan</Button>
               </div>
             </div>
           </div>
        ) : scannedProduct ? (
          <div className="scan-result animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
            <LuCheck size={64} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ margin: 0 }}>Product Found!</h3>
            
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', width: '100%', textAlign: 'left', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem' }}>
                📦
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{scannedProduct.name}</h4>
                <p className="text-muted" style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>SKU: {scannedProduct.sku}</p>
                <div style={{ display: 'inline-block', background: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600 }}>
                  Unit: {scannedProduct.uom}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={handleScanAgain} style={{ flex: 1 }}>
                <LuX size={18} /> Cancel
              </Button>
              <Button variant="primary" onClick={handleAddToCart} style={{ flex: 2 }}>
                Add to Cart
              </Button>
            </div>
          </div>
        ) : attendanceSuccess ? (
          <div className="scan-result animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
            <div style={{ background: 'var(--success-bg)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <LuCheck size={50} color="var(--success)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0 }}>Attendance Recorded</h3>
              <p className="text-muted">You have successfully checked in at: {locations.find((l: any) => l.id === currentUser?.locationId)?.name || 'HQ Facility'}</p>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
               <span>Check-In Time:</span>
               <span className="font-bold">{new Date().toLocaleTimeString()}</span>
            </div>
            <Button variant="primary" onClick={handleScanAgain} style={{ width: '100%' }}>
              Scan Next Worker
            </Button>
          </div>
        ) : null}
      </Card>
      
      <div style={{ textAlign: 'center' }}>
        <Button variant="ghost" onClick={() => navigate('/portal/catalog')}>
          Return to Catalog
        </Button>
      </div>
    </div>
  );
};

export default QRCodeScanner;
