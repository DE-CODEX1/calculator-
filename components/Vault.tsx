import React, { useState, useEffect, useRef } from 'react';
import { VaultItem } from '../types';
import { getVaultItems, saveVaultItem, removeVaultItem } from '../services/storageService';
import { Lock, Plus, Trash2, X, Image as ImageIcon, EyeOff, Loader2 } from 'lucide-react';
import { MAX_FILE_SIZE_MB } from '../constants';

interface VaultProps {
  onLock: () => void;
}

const Vault: React.FC<VaultProps> = ({ onLock }) => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<VaultItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Compress to JPEG with 0.7 quality to save space
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawDataUrl = e.target?.result as string;
        // Compress image before saving to fit more in LocalStorage
        const compressedDataUrl = await compressImage(rawDataUrl);

        const newItem: VaultItem = {
          id: crypto.randomUUID(),
          dataUrl: compressedDataUrl,
          timestamp: Date.now(),
          name: file.name
        };

        if (saveVaultItem(newItem)) {
          setItems(getVaultItems());
        } else {
          setError("Storage full. Delete some photos to add more.");
        }
      } catch (err) {
        setError("Failed to process image.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this secret photo?")) {
      removeVaultItem(id);
      setItems(getVaultItems());
      if (selectedImage?.id === id) setSelectedImage(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-900 relative">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm flex justify-between items-center z-10 sticky top-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
            <Lock className="w-5 h-5" /> Secret Gallery
          </h1>
          <p className="text-xs text-gray-500">{items.length} photos hidden</p>
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
            <p>No hidden photos yet.</p>
            <p className="text-sm mt-2">Tap + to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedImage(item)}
                className="aspect-square relative group cursor-pointer overflow-hidden rounded-xl bg-gray-200 border border-gray-200 shadow-sm hover:shadow-md transition-all"
              >
                <img 
                  src={item.dataUrl} 
                  alt="Secret" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <button 
                  onClick={(e) => handleDelete(item.id, e)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
          accept="image/*" 
          onChange={handleFileSelect}
        />
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage.dataUrl} 
            alt="Full view" 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
          />
          <div className="absolute bottom-4 text-white/50 text-xs">
            {new Date(selectedImage.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault;