import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  GitBranch, Plus, Download, Star, Trash2, Loader2,
  FileText, Calendar, HardDrive, X, Upload, Check
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductVersion {
  id: string;
  product_id: string;
  version_number: string;
  file_url: string;
  file_size?: number;
  changelog?: string;
  is_current: boolean;
  created_at: string;
}

interface ProductVersioningProps {
  productId: string;
  isOwner: boolean;
}

export const ProductVersioning = ({ productId, isOwner }: ProductVersioningProps) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [versionNumber, setVersionNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [changelog, setChangelog] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [productId]);

  const fetchVersions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('product_versions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVersions(data || []);
    } catch (e) {
      console.error('Error fetching versions:', e);
    }
    setLoading(false);
  };

  const suggestNextVersion = () => {
    if (versions.length === 0) return '1.0.0';
    
    const latest = versions[0]?.version_number || '1.0.0';
    const parts = latest.split('.').map(Number);
    
    // Increment patch version
    if (parts.length >= 3) {
      parts[2] = (parts[2] || 0) + 1;
    } else if (parts.length === 2) {
      parts.push(1);
    } else {
      parts.push(0, 1);
    }
    
    return parts.join('.');
  };

  const resetForm = () => {
    setVersionNumber(suggestNextVersion());
    setFileUrl('');
    setChangelog('');
    setShowForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-files')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('product-files')
        .getPublicUrl(fileName);
      
      setFileUrl(urlData.publicUrl);
      toast.success('File uploaded!');
    } catch (e) {
      toast.error('Failed to upload file');
      console.error(e);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!versionNumber.trim()) {
      toast.error('Version number is required');
      return;
    }
    
    if (!fileUrl.trim()) {
      toast.error('File URL is required');
      return;
    }
    
    // Check for duplicate version
    if (versions.some(v => v.version_number === versionNumber.trim())) {
      toast.error('This version number already exists');
      return;
    }
    
    setSubmitting(true);
    try {
      // Set all other versions to not current
      await (supabase as any)
        .from('product_versions')
        .update({ is_current: false })
        .eq('product_id', productId);
      
      // Insert new version as current
      await (supabase as any)
        .from('product_versions')
        .insert({
          product_id: productId,
          version_number: versionNumber.trim(),
          file_url: fileUrl.trim(),
          changelog: changelog.trim() || null,
          is_current: true
        });
      
      toast.success(`Version ${versionNumber} published!`);
      resetForm();
      fetchVersions();
    } catch (e) {
      toast.error('Failed to create version');
      console.error(e);
    }
    setSubmitting(false);
  };

  const setAsCurrent = async (versionId: string) => {
    try {
      // Set all to not current
      await (supabase as any)
        .from('product_versions')
        .update({ is_current: false })
        .eq('product_id', productId);
      
      // Set selected as current
      await (supabase as any)
        .from('product_versions')
        .update({ is_current: true })
        .eq('id', versionId);
      
      toast.success('Current version updated');
      fetchVersions();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const deleteVersion = async (versionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      toast.error('Cannot delete the current version');
      return;
    }
    
    if (!confirm('Delete this version?')) return;
    
    try {
      await (supabase as any)
        .from('product_versions')
        .delete()
        .eq('id', versionId);
      
      toast.success('Version deleted');
      fetchVersions();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  const currentVersion = versions.find(v => v.is_current);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-white">Version History</h3>
          {currentVersion && (
            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
              v{currentVersion.version_number}
            </span>
          )}
        </div>
        {isOwner && (
          <Button
            onClick={() => { setVersionNumber(suggestNextVersion()); setShowForm(true); }}
            size="sm"
            className="rounded-full bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Version
          </Button>
        )}
      </div>

      {/* Upload Form */}
      {showForm && isOwner && (
        <div className="p-4 rounded-xl border bg-slate-800/60 border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-white">Upload New Version</h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Version Number */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Version Number *</label>
              <Input
                placeholder="1.0.0"
                value={versionNumber}
                onChange={e => setVersionNumber(e.target.value)}
                className="bg-black/30 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Use semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0)</p>
            </div>
            
            {/* File Upload */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">File *</label>
              <div className="flex gap-2">
                <Input
                  placeholder="File URL or upload"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  className="bg-black/30 border-gray-700 text-white flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-700"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </label>
              </div>
            </div>
            
            {/* Changelog */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Changelog</label>
              <textarea
                placeholder="What's new in this version..."
                value={changelog}
                onChange={e => setChangelog(e.target.value)}
                rows={3}
                className="w-full bg-black/30 border border-gray-700 text-white rounded-md px-3 py-2 resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={resetForm} className="text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !versionNumber.trim() || !fileUrl.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publish Version
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Versions List */}
      {versions.length === 0 ? (
        <div className="text-center py-8 rounded-xl border bg-slate-800/30 border-white/10">
          <GitBranch className="w-10 h-10 mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400">No versions yet</p>
          {isOwner && (
            <p className="text-sm text-gray-500 mt-1">Upload your first version above</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map(version => (
            <div
              key={version.id}
              className={`p-4 rounded-xl border transition-all ${
                version.is_current
                  ? 'bg-purple-500/10 border-purple-500/50'
                  : 'bg-slate-800/30 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    version.is_current ? 'bg-purple-500/20' : 'bg-gray-700/50'
                  }`}>
                    <GitBranch className={`w-4 h-4 ${
                      version.is_current ? 'text-purple-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">v{version.version_number}</span>
                      {version.is_current && (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(version.created_at)}
                      </span>
                      {version.file_size && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatFileSize(version.file_size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <a
                    href={version.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </a>
                  
                  {isOwner && (
                    <>
                      {!version.is_current && (
                        <button
                          onClick={() => setAsCurrent(version.id)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Set as current"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteVersion(version.id, version.is_current)}
                        className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                          version.is_current ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        disabled={version.is_current}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Changelog */}
              {version.changelog && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                    <FileText className="w-3 h-3" />
                    Changelog
                  </div>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {version.changelog}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductVersioning;
