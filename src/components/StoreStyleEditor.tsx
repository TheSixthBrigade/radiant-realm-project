import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Palette, Type, Sparkles } from "lucide-react";
import { ImageUploadZone } from "./ImageUploadZone";

interface StoreStyleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSettingsChange: (settings: any) => void;
  onSave: () => void;
  saving: boolean;
}

export const StoreStyleEditor = ({ isOpen, onClose, settings, onSettingsChange, onSave, saving }: StoreStyleEditorProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Store Style</h2>
            <p className="text-sm text-gray-500 mt-1">Customize your store's colors, fonts, and appearance</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Colors Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Colors</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={settings.primary_button_bg}
                    onChange={(e) => onSettingsChange({ ...settings, primary_button_bg: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.primary_button_bg}
                    onChange={(e) => onSettingsChange({ ...settings, primary_button_bg: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Secondary Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={settings.secondary_button_bg || '#FFFFFF'}
                    onChange={(e) => onSettingsChange({ ...settings, secondary_button_bg: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.secondary_button_bg || '#FFFFFF'}
                    onChange={(e) => onSettingsChange({ ...settings, secondary_button_bg: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={settings.page_bg_color}
                    onChange={(e) => onSettingsChange({ ...settings, page_bg_color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.page_bg_color}
                    onChange={(e) => onSettingsChange({ ...settings, page_bg_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={settings.text_color}
                    onChange={(e) => onSettingsChange({ ...settings, text_color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.text_color}
                    onChange={(e) => onSettingsChange({ ...settings, text_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Typography</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Heading Font</Label>
                <Select value={settings.heading_font} onValueChange={(value) => onSettingsChange({ ...settings, heading_font: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Body Font</Label>
                <Select value={settings.font_family} onValueChange={(value) => onSettingsChange({ ...settings, font_family: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Font Size</Label>
                <Select value={settings.font_size} onValueChange={(value) => onSettingsChange({ ...settings, font_size: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Button Style</Label>
                <Select value={settings.button_style} onValueChange={(value) => onSettingsChange({ ...settings, button_style: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="pill">Pill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Background Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Background</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Background Type</Label>
                <Select value={settings.background_type || 'solid'} onValueChange={(value) => onSettingsChange({ ...settings, background_type: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="gradient">Static Gradient</SelectItem>
                    <SelectItem value="animated_gradient">✨ Animated Gradient Wave</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="gif">Animated GIF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Animated Gradient Wave Settings */}
              {settings.background_type === 'animated_gradient' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-cyan-500" />
                    <span className="font-medium text-sm">Animated Wave Settings</span>
                  </div>
                  
                  <div>
                    <Label>Color Theme</Label>
                    <Select 
                      value={settings.animated_gradient_preset || 'green'} 
                      onValueChange={(value) => onSettingsChange({ ...settings, animated_gradient_preset: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="green">🌿 Green (Developer)</SelectItem>
                        <SelectItem value="blue">💙 Blue (Ocean)</SelectItem>
                        <SelectItem value="purple">💜 Purple (Galaxy)</SelectItem>
                        <SelectItem value="cyan">🩵 Cyan (Tech)</SelectItem>
                        <SelectItem value="pink">💗 Pink (Vibrant)</SelectItem>
                        <SelectItem value="orange">🧡 Orange (Sunset)</SelectItem>
                        <SelectItem value="red">❤️ Red (Fire)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Animation Speed: {((settings.animated_gradient_speed || 0.5) * 100).toFixed(0)}%</Label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={settings.animated_gradient_speed || 0.5}
                      onChange={(e) => onSettingsChange({ ...settings, animated_gradient_speed: parseFloat(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Slower ← → Faster</p>
                  </div>

                  <div>
                    <Label>Wave Intensity: {((settings.animated_gradient_wave_intensity || 0.7) * 100).toFixed(0)}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.animated_gradient_wave_intensity || 0.7}
                      onChange={(e) => onSettingsChange({ ...settings, animated_gradient_wave_intensity: parseFloat(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Subtle ← → Strong waves</p>
                  </div>

                  <div>
                    <Label>Particle Count: {settings.animated_gradient_particles || 50}</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={settings.animated_gradient_particles || 50}
                      onChange={(e) => onSettingsChange({ ...settings, animated_gradient_particles: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Floating particles (0 = none)</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Glow Effect</Label>
                    <Switch
                      checked={settings.animated_gradient_glow !== false}
                      onCheckedChange={(checked) => onSettingsChange({ ...settings, animated_gradient_glow: checked })}
                    />
                  </div>

                  <div>
                    <Label>Dark Overlay: {((settings.animated_gradient_overlay || 0) * 100).toFixed(0)}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.05"
                      value={settings.animated_gradient_overlay || 0}
                      onChange={(e) => onSettingsChange({ ...settings, animated_gradient_overlay: parseFloat(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Add dark overlay for better text readability</p>
                  </div>
                </div>
              )}

              {/* Static Gradient Settings */}
              {settings.background_type === 'gradient' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <span className="font-medium text-sm">Gradient Colors</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={settings.background_gradient_start || '#1e3a8a'}
                          onChange={(e) => onSettingsChange({ ...settings, background_gradient_start: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={settings.background_gradient_start || '#1e3a8a'}
                          onChange={(e) => onSettingsChange({ ...settings, background_gradient_start: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>End Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={settings.background_gradient_end || '#7c3aed'}
                          onChange={(e) => onSettingsChange({ ...settings, background_gradient_end: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={settings.background_gradient_end || '#7c3aed'}
                          onChange={(e) => onSettingsChange({ ...settings, background_gradient_end: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settings.background_type === 'image' && (
                <ImageUploadZone
                  label="Background Image"
                  value={settings.background_image || ''}
                  onChange={(url) => onSettingsChange({ ...settings, background_image: url })}
                />
              )}

              {settings.background_type === 'gif' && (
                <ImageUploadZone
                  label="Background GIF"
                  value={settings.background_gif || ''}
                  onChange={(url) => onSettingsChange({ ...settings, background_gif: url })}
                />
              )}

              {(settings.background_type === 'image' || settings.background_type === 'gif') && (
                <div>
                  <Label>Overlay Opacity: {settings.background_overlay || 0.5}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.background_overlay || 0.5}
                    onChange={(e) => onSettingsChange({ ...settings, background_overlay: parseFloat(e.target.value) })}
                    className="w-full mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};
