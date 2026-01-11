import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, ChevronRight, ChevronDown, Palette, Type, Layout, Sparkles, Image, Settings } from "lucide-react";
import { RoadmapSettings, ROADMAP_THEMES } from "@/lib/roadmapThemes";

interface RoadmapSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoadmapSettings;
  onSettingsChange: (settings: RoadmapSettings) => void;
  onSave: () => void;
  saving: boolean;
}

export const RoadmapSettingsPanel = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange, 
  onSave, 
  saving 
}: RoadmapSettingsPanelProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('theme');

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold">Roadmap Settings</h2>
          <p className="text-xs text-gray-400 mt-1">Live preview as you edit</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {/* Theme & Presets */}
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('theme')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">Theme & Presets</span>
            </div>
            {expandedSection === 'theme' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedSection === 'theme' && (
            <div className="p-3 bg-gray-800/50 space-y-3">
              <div>
                <Label className="text-xs text-gray-300">Theme Preset</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value) => onSettingsChange({ ...settings, theme: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROADMAP_THEMES).map(([key, theme]) => (
                      <SelectItem key={key} value={key}>{theme.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Use Custom Colors</Label>
                <Switch
                  checked={settings.useCustomColors}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, useCustomColors: checked })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Custom Colors */}
        {settings.useCustomColors && (
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('colors')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-sm">Custom Colors</span>
              </div>
              {expandedSection === 'colors' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedSection === 'colors' && (
              <div className="p-3 bg-gray-800/50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-300">Accent Color</Label>
                    <Input
                      type="color"
                      value={settings.customAccentColor}
                      onChange={(e) => onSettingsChange({ ...settings, customAccentColor: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Card Background</Label>
                    <Input
                      type="color"
                      value={settings.customCardBackground}
                      onChange={(e) => onSettingsChange({ ...settings, customCardBackground: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Primary Text</Label>
                    <Input
                      type="color"
                      value={settings.customTextPrimary}
                      onChange={(e) => onSettingsChange({ ...settings, customTextPrimary: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Secondary Text</Label>
                    <Input
                      type="color"
                      value={settings.customTextSecondary}
                      onChange={(e) => onSettingsChange({ ...settings, customTextSecondary: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-300 mb-2 block">Status Colors</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-400">Backlog</Label>
                      <Input
                        type="color"
                        value={settings.customStatusBacklog}
                        onChange={(e) => onSettingsChange({ ...settings, customStatusBacklog: e.target.value })}
                        className="bg-gray-900 border-gray-700 h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">In Progress</Label>
                      <Input
                        type="color"
                        value={settings.customStatusInProgress}
                        onChange={(e) => onSettingsChange({ ...settings, customStatusInProgress: e.target.value })}
                        className="bg-gray-900 border-gray-700 h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">QA</Label>
                      <Input
                        type="color"
                        value={settings.customStatusQa}
                        onChange={(e) => onSettingsChange({ ...settings, customStatusQa: e.target.value })}
                        className="bg-gray-900 border-gray-700 h-6"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Completed</Label>
                      <Input
                        type="color"
                        value={settings.customStatusCompleted}
                        onChange={(e) => onSettingsChange({ ...settings, customStatusCompleted: e.target.value })}
                        className="bg-gray-900 border-gray-700 h-6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Effects */}
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('effects')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-sm">Visual Effects</span>
            </div>
            {expandedSection === 'effects' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedSection === 'effects' && (
            <div className="p-3 bg-gray-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Card Glow Effect</Label>
                <Switch
                  checked={settings.cardGlow}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, cardGlow: checked })}
                />
              </div>

              {settings.cardGlow && (
                <div>
                  <Label className="text-xs text-gray-300">Glow Intensity ({settings.glowIntensity}%)</Label>
                  <Slider
                    value={[settings.glowIntensity]}
                    onValueChange={([value]) => onSettingsChange({ ...settings, glowIntensity: value })}
                    max={100}
                    min={0}
                    step={5}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs text-gray-300">Card Opacity ({settings.cardOpacity}%)</Label>
                <Slider
                  value={[settings.cardOpacity]}
                  onValueChange={([value]) => onSettingsChange({ ...settings, cardOpacity: value })}
                  max={100}
                  min={10}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-300">Card Border Radius ({settings.cardBorderRadius}px)</Label>
                <Slider
                  value={[settings.cardBorderRadius]}
                  onValueChange={([value]) => onSettingsChange({ ...settings, cardBorderRadius: value })}
                  max={32}
                  min={0}
                  step={2}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Floating Orbs</Label>
                <Switch
                  checked={settings.showFloatingOrbs}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, showFloatingOrbs: checked })}
                />
              </div>

              {settings.showFloatingOrbs && (
                <>
                  <div>
                    <Label className="text-xs text-gray-300">Orb Count ({settings.orbCount})</Label>
                    <Slider
                      value={[settings.orbCount]}
                      onValueChange={([value]) => onSettingsChange({ ...settings, orbCount: value })}
                      max={6}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Orb Color</Label>
                    <Input
                      type="color"
                      value={settings.orbColor}
                      onChange={(e) => onSettingsChange({ ...settings, orbColor: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Layout & Typography */}
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('layout')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-green-400" />
              <span className="font-medium text-sm">Layout & Typography</span>
            </div>
            {expandedSection === 'layout' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedSection === 'layout' && (
            <div className="p-3 bg-gray-800/50 space-y-3">
              <div>
                <Label className="text-xs text-gray-300">Roadmap Width</Label>
                <Select 
                  value={settings.roadmapWidth} 
                  onValueChange={(value) => onSettingsChange({ ...settings, roadmapWidth: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="max-w-4xl">Narrow</SelectItem>
                    <SelectItem value="max-w-6xl">Medium</SelectItem>
                    <SelectItem value="max-w-7xl">Wide</SelectItem>
                    <SelectItem value="max-w-full">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-gray-300">Section Spacing</Label>
                <Select 
                  value={settings.sectionSpacing} 
                  onValueChange={(value) => onSettingsChange({ ...settings, sectionSpacing: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="relaxed">Relaxed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Main Title Size</Label>
                <Select 
                  value={settings.mainTitleSize} 
                  onValueChange={(value) => onSettingsChange({ ...settings, mainTitleSize: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-4xl md:text-5xl">Small</SelectItem>
                    <SelectItem value="text-5xl md:text-6xl">Medium</SelectItem>
                    <SelectItem value="text-6xl md:text-7xl">Large</SelectItem>
                    <SelectItem value="text-7xl md:text-8xl">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Version Title Size</Label>
                <Select 
                  value={settings.versionTitleSize || 'text-3xl md:text-4xl'} 
                  onValueChange={(value) => onSettingsChange({ ...settings, versionTitleSize: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-xl md:text-2xl">Small</SelectItem>
                    <SelectItem value="text-2xl md:text-3xl">Medium</SelectItem>
                    <SelectItem value="text-3xl md:text-4xl">Large</SelectItem>
                    <SelectItem value="text-4xl md:text-5xl">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Card Padding</Label>
                <Select 
                  value={settings.cardPadding || 'p-10'} 
                  onValueChange={(value) => onSettingsChange({ ...settings, cardPadding: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p-4">Compact</SelectItem>
                    <SelectItem value="p-6">Small</SelectItem>
                    <SelectItem value="p-8">Medium</SelectItem>
                    <SelectItem value="p-10">Large</SelectItem>
                    <SelectItem value="p-12">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Border Width ({settings.borderWidth || 2}px)</Label>
                <Slider
                  value={[settings.borderWidth || 2]}
                  onValueChange={([value]) => onSettingsChange({ ...settings, borderWidth: value })}
                  max={8}
                  min={0}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Background */}
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('background')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-sm">Background</span>
            </div>
            {expandedSection === 'background' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedSection === 'background' && (
            <div className="p-3 bg-gray-800/50 space-y-3">
              <div>
                <Label className="text-xs text-gray-300">Background Type</Label>
                <Select 
                  value={settings.backgroundType} 
                  onValueChange={(value) => onSettingsChange({ ...settings, backgroundType: value })}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.backgroundType === 'image' && (
                <>
                  <div>
                    <Label className="text-xs text-gray-300">Background Image URL</Label>
                    <Input
                      value={settings.backgroundImage}
                      onChange={(e) => onSettingsChange({ ...settings, backgroundImage: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Overlay Opacity ({settings.backgroundOverlayOpacity}%)</Label>
                    <Slider
                      value={[settings.backgroundOverlayOpacity]}
                      onValueChange={([value]) => onSettingsChange({ ...settings, backgroundOverlayOpacity: value })}
                      max={100}
                      min={0}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </>
              )}

              {settings.backgroundType === 'gradient' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-300">Gradient Start</Label>
                    <Input
                      type="color"
                      value={settings.customBackgroundGradientStart}
                      onChange={(e) => onSettingsChange({ ...settings, customBackgroundGradientStart: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Gradient End</Label>
                    <Input
                      type="color"
                      value={settings.customBackgroundGradientEnd}
                      onChange={(e) => onSettingsChange({ ...settings, customBackgroundGradientEnd: e.target.value })}
                      className="bg-gray-900 border-gray-700 h-8 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Settings */}
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('content')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-400" />
              <span className="font-medium text-sm">Content Settings</span>
            </div>
            {expandedSection === 'content' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedSection === 'content' && (
            <div className="p-3 bg-gray-800/50 space-y-3">
              <div>
                <Label className="text-xs text-gray-300">Roadmap Title</Label>
                <Input
                  value={settings.title}
                  onChange={(e) => onSettingsChange({ ...settings, title: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-300">Roadmap Subtitle</Label>
                <Input
                  value={settings.subtitle}
                  onChange={(e) => onSettingsChange({ ...settings, subtitle: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white mt-1 h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Show Suggestions</Label>
                <Switch
                  checked={settings.showSuggestions}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, showSuggestions: checked })}
                />
              </div>

              {settings.showSuggestions && (
                <div>
                  <Label className="text-xs text-gray-300">Suggestions Limit ({settings.suggestionsLimit})</Label>
                  <Slider
                    value={[settings.suggestionsLimit]}
                    onValueChange={([value]) => onSettingsChange({ ...settings, suggestionsLimit: value })}
                    max={20}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Default Expanded</Label>
                <Switch
                  checked={settings.defaultExpanded}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, defaultExpanded: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Show Header</Label>
                <Switch
                  checked={settings.showHeader}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, showHeader: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-300">Show Logo</Label>
                <Switch
                  checked={settings.showLogo !== false}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, showLogo: checked })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Save Button */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <Button 
          onClick={onSave} 
          disabled={saving} 
          className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-sm"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};