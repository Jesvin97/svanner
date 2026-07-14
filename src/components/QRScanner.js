'use client';

import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScanSuccess, isActive }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let html5Qrcode;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0 && isMounted) {
          setHasPermission(true);
          html5Qrcode = new Html5Qrcode("qr-reader");
          
          if (!isActive) return;

          await html5Qrcode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText, decodedResult) => {
              if (onScanSuccess && isActive) {
                onScanSuccess(decodedText);
              }
            },
            (errorMessage) => {
              // Ignore typical noisy errors from QR code reader
            }
          );
        } else if (isMounted) {
          setHasPermission(false);
          setCameraError('No camera found on this device.');
        }
      } catch (err) {
        if (isMounted) {
          setHasPermission(false);
          setCameraError(err?.message || 'Camera permission denied or camera in use.');
        }
      }
    };

    if (isActive) {
      startScanner();
    }

    return () => {
      isMounted = false;
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().then(() => {
          html5Qrcode.clear();
        }).catch(err => {
          console.error("Failed to stop html5Qrcode", err);
        });
      }
    };
  }, [isActive, onScanSuccess]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {hasPermission === null && (
        <div className="w-full flex items-center justify-center p-4 bg-yellow-900/20 text-yellow-500 rounded-lg border border-yellow-500/50 mb-4 font-semibold">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse mr-3"></div>
          🟡 Waiting for Camera Permission
        </div>
      )}
      
      {hasPermission === false && (
        <div className="w-full flex flex-col items-center justify-center p-4 bg-red-900/20 text-red-500 rounded-lg border border-red-500/50 mb-4">
          <div className="flex items-center font-semibold mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
            🔴 Camera Not Available
          </div>
          <p className="text-sm opacity-80 text-center">{cameraError}</p>
        </div>
      )}

      {hasPermission === true && (
        <div className="w-full flex items-center justify-center p-4 bg-green-900/20 text-green-500 rounded-lg border border-green-500/50 mb-4 font-semibold">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          🟢 Camera Connected
        </div>
      )}

      <div className="w-full relative overflow-hidden rounded-2xl border border-gray-800 bg-black shadow-2xl backdrop-blur-sm aspect-square max-w-[350px]">
        {isActive ? (
          <div id="qr-reader" className="w-full h-full bg-black"></div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
            <p>Scanner Paused</p>
          </div>
        )}
      </div>
    </div>
  );
}
