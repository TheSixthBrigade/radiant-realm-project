import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ImageUploadZoneProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  multiple?: boolean;
  values?: string[];
  onMultipleChange?: (urls: string[]) => void;
}

export const ImageUploadZone = ({ value, onChange, label, multiple, values, onMultipleChange }: ImageUploadZoneProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [inputId] = useState(`file-upload-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

  const convertImageToPng = async (imageSource: string | File, fileName: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (typeof imageSource === 'string') {
        img.crossOrigin = 'anonymous';
        img.src = imageSource;
      } else {
        const url = URL.createObjectURL(imageSource);
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
      }
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image'));
            return;
          }
          
          const newFileName = fileName.replace(/\.(avif|jpe?g|webp)$/i, '.png');
          const newFile = new File([blob], newFileName, { type: 'image/png' });
          resolve(newFile);
        }, 'image/png');
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    });
  };

  const downloadImageFromUrl = async (imageUrl: string): Promise<File> => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || 'image.png';
      
      return new File([blob], fileName, { type: blob.type || 'image/png' });
    } catch (error) {
      // If CORS fails, try converting via canvas
      const fileName = 'payhip-image.png';
      return convertImageToPng(imageUrl, fileName);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      toast.error('No files selected');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to upload images');
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    let hasErrors = false;

    try {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        
        // Check if it's an image
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          hasErrors = true;
          continue;
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          hasErrors = true;
          continue;
        }

        // Convert AVIF to PNG
        if (file.type === 'image/avif' || file.name.toLowerCase().endsWith('.avif')) {
          try {
            toast.info(`Converting ${file.name} from AVIF to PNG...`);
            file = await convertImageToPng(file, file.name);
            toast.success(`Converted to PNG`);
          } catch (conversionError) {
            console.error('AVIF conversion error:', conversionError);
            toast.error(`Failed to convert ${file.name}. Please try a different format.`);
            hasErrors = true;
            continue;
          }
        }

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;

          console.log('Uploading file:', fileName);

          // Try to upload to Supabase Storage (using product-images bucket)
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            
            // Fallback: Use a free image hosting service or data URL
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            
            uploadedUrls.push(dataUrl);
            toast.warning(`${file.name} uploaded as data URL (fallback)`);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
            console.log('Upload successful:', urlData.publicUrl);
          }
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          hasErrors = true;
          
          // Try data URL fallback
          try {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            uploadedUrls.push(dataUrl);
            toast.warning(`${file.name} uploaded as data URL (fallback)`);
          } catch (fallbackError) {
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      if (uploadedUrls.length > 0) {
        if (multiple && onMultipleChange) {
          onMultipleChange([...(values || []), ...uploadedUrls]);
        } else {
          onChange(uploadedUrls[0]);
        }
        
        if (!hasErrors) {
          toast.success(`${uploadedUrls.length} image(s) uploaded successfully!`);
        } else {
          toast.success(`${uploadedUrls.length} image(s) uploaded (some with fallback)`);
        }
      } else {
        toast.error('No images were uploaded');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // Check for files first
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
      return;
    }
    
    // Check for image URLs (dragged from web pages like Payhip)
    const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      if (!user) {
        toast.error('You must be logged in to upload images');
        return;
      }
      
      setUploading(true);
      toast.info('Downloading image from URL...');
      
      try {
        const file = await downloadImageFromUrl(imageUrl);
        
        // Convert to PNG if it's AVIF
        let finalFile = file;
        if (file.type === 'image/avif' || file.name.toLowerCase().endsWith('.avif')) {
          toast.info('Converting AVIF to PNG...');
          finalFile = await convertImageToPng(file, file.name);
        }
        
        // Create a FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(finalFile);
        
        await handleUpload(dataTransfer.files);
      } catch (error) {
        console.error('Error downloading image:', error);
        toast.error('Failed to download image. Try right-click > Save Image, then upload the file.');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (url: string) => {
    if (multiple && onMultipleChange && values) {
      onMultipleChange(values.filter(v => v !== url));
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-white">{label}</label>}
      
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-gray-600 hover:border-gray-500'
        } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          id={inputId}
          disabled={uploading}
        />
        <label htmlFor={inputId} className="cursor-pointer block">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-300 mb-1">
            {uploading ? 'Uploading...' : 'Drop images or URLs here, or click to upload'}
          </p>
          <p className="text-xs text-gray-500">
            {multiple ? 'Drag from Payhip or upload files (AVIF auto-converts to PNG)' : 'Drag from Payhip, paste URL, or upload files'}
          </p>
        </label>
      </div>

      {/* Preview - Single Image */}
      {!multiple && value && (
        <div className="relative group">
          <img 
            src={value} 
            alt="Preview" 
            className="w-full h-40 object-cover rounded-lg"
          />
          <button
            onClick={() => removeImage(value)}
            className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Preview - Multiple Images */}
      {multiple && values && values.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {values.map((url, index) => (
            <div key={index} className="relative group">
              <img 
                src={url} 
                alt={`Image ${index + 1}`} 
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(url)}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL Input Fallback */}
      {!multiple && (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste image URL"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
      )}
    </div>
  );
};
