'use client';

import { useState, useCallback } from 'react';
import QRScanner from '@/components/QRScanner';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function Home() {
  const [scannerActive, setScannerActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null); 
  const [lastScan, setLastScan] = useState(null);

  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.error("Audio play failed:", e);
    }
  };

  const handleScan = useCallback(async (scannedId) => {
    if (loading || !scannerActive) return;

    setLoading(true);
    setScannerActive(false);

    try {
      const { data: user, error: fetchError } = await supabase
        .from('registrations')
        .select('id, name, scanned_at')
        .eq('id', scannedId)
        .single();

      if (fetchError || !user) {
        setScanResult({
          status: 'not_found',
          message: 'This QR code is invalid or does not exist.'
        });
        playSound('error');
        setLoading(false);
        return;
      }

      if (user.scanned_at !== null) {
        setScanResult({
          status: 'already_scanned',
          user,
          message: 'This QR code has already been scanned and cannot be used again.'
        });
        playSound('error');
        setLoading(false);
        return;
      }

      const currentTime = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ scanned_at: currentTime })
        .eq('id', user.id);

      if (updateError) {
        setScanResult({
          status: 'error',
          message: 'Failed to update database. Try scanning again.'
        });
        playSound('error');
        setLoading(false);
        return;
      }

      const successData = { ...user, scanned_at: currentTime };
      setScanResult({
        status: 'success',
        user: successData
      });
      setLastScan(successData);
      playSound('success');

    } catch (err) {
      console.error("Scanner Error:", err);
      setScanResult({
        status: 'error',
        message: 'An unexpected error occurred.'
      });
      playSound('error');
    } finally {
      setLoading(false);
    }
  }, [loading, scannerActive]);

  const resetScanner = () => {
    setScanResult(null);
    setScannerActive(true);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-blue-500/30 flex flex-col">
      <div className="w-full max-w-2xl mx-auto space-y-6 flex-1 flex flex-col justify-center py-8">
        
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Event Check-In
          </h1>
          <p className="text-gray-400 font-medium tracking-wide">Scan QR codes to verify attendees.</p>
        </div>

        <div className="bg-[#111] p-6 md:p-8 rounded-[2rem] border border-gray-800 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
          
          <div className="relative z-10">
            <QRScanner onScanSuccess={handleScan} isActive={scannerActive} />
            
            {loading && (
              <div className="mt-8 flex flex-col items-center justify-center text-blue-400 animate-pulse bg-blue-900/10 p-6 rounded-2xl border border-blue-500/20">
                <RefreshCw className="w-10 h-10 animate-spin mb-4" />
                <p className="font-semibold text-lg tracking-wide">Verifying...</p>
              </div>
            )}

            {scanResult && !loading && (
              <div className="mt-8 transition-all duration-300">
                {scanResult.status === 'success' && (
                  <div className="bg-green-500/10 border-2 border-green-500/30 rounded-[1.5rem] p-8 shadow-[0_0_50px_rgba(34,197,94,0.15)] text-center animate-in zoom-in-95 duration-300">
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    <h2 className="text-3xl font-black text-green-400 mb-3 tracking-wide">✅ VERIFIED</h2>
                    <div className="space-y-1 text-gray-200 mb-8">
                      <p className="text-2xl font-bold text-white">{scanResult.user.name}</p>
                      <p className="text-sm text-gray-400 font-mono tracking-wider">ID: {scanResult.user.id}</p>
                      <p className="text-sm font-semibold text-green-400 mt-3 inline-block bg-green-500/20 px-4 py-1.5 rounded-full">
                        Status: Successfully Verified
                      </p>
                    </div>
                    <button 
                      onClick={resetScanner}
                      className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl text-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-900/30"
                    >
                      Scan Next
                    </button>
                  </div>
                )}

                {scanResult.status === 'already_scanned' && (
                  <div className="bg-red-500/10 border-2 border-red-500/30 rounded-[1.5rem] p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center animate-in zoom-in-95 duration-300">
                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                    <h2 className="text-3xl font-black text-red-500 mb-3 tracking-wide">❌ ALREADY USED</h2>
                    <div className="space-y-1 text-gray-200 mb-8">
                      <p className="text-2xl font-bold text-white">{scanResult.user.name}</p>
                      <p className="text-sm text-gray-400 font-mono tracking-wider">ID: {scanResult.user.id}</p>
                      <div className="bg-red-950/40 p-4 rounded-xl mt-5 border border-red-900/50">
                        <p className="text-sm md:text-base font-medium text-red-300">{scanResult.message}</p>
                        <div className="mt-3 inline-flex items-center bg-red-900/30 px-3 py-2 rounded-lg text-xs md:text-sm text-red-400 font-medium">
                          <span>First scanned at: {new Date(scanResult.user.scanned_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={resetScanner}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/30"
                    >
                      Scan Again
                    </button>
                  </div>
                )}

                {scanResult.status === 'not_found' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-[1.5rem] p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center animate-in zoom-in-95 duration-300">
                    <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-red-400 mb-3">❌ USER NOT FOUND</h2>
                    <p className="text-lg text-red-300 mb-8 font-medium">{scanResult.message}</p>
                    <button 
                      onClick={resetScanner}
                      className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Scan Again
                    </button>
                  </div>
                )}

                {scanResult.status === 'error' && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-[1.5rem] p-8 text-center animate-in zoom-in-95 duration-300">
                    <AlertCircle className="w-20 h-20 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-orange-400 mb-3">System Error</h2>
                    <p className="text-orange-300 mb-8">{scanResult.message}</p>
                    <button 
                      onClick={resetScanner}
                      className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-lg font-bold transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {lastScan && (
          <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Latest Successful Check-In</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-lg">{lastScan.name}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {lastScan.id}</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                  Verified
                </span>
                <p className="text-xs font-medium text-gray-500 mt-2">
                  {new Date(lastScan.scanned_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
