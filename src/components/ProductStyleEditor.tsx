import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

export interface ProductCardStyle {
  template: 'standard' | 'hover-reveal' | 'minimal' | 'gaming' | 'compact-list' | 'magazine';
  layout: 'grid-2' | 'grid-3' | 'grid-4' | 'list';
  cardBackground: string;
  cardBorder: string;
  cardBorderWidth: number;
  cardBorderRadius: number;
  cardShadow: string;
  cardPadding: number;
  imageAspectRatio: '1:1' | '4:3' | '16:9' | '3:4' | 'auto';
  imageFit: 'cover' | 'contain' | 'fill';
  titleColor: string;
  titleSize: number;
  priceColor: string;
  priceSize: number;
  buttonColor: string;
  buttonTextColor: string;
  buttonBorderRadius: number;
  hoverEffect: 'lift' | 'glow' | 'scale' | 'slide' | 'fade' | 'none';
  showBadges: boolean;
  showRating: boolean;
  showDownloads: boolean;
  animationDuration: number;
}

interface ProductStyleEditorProps {
  style: ProductCardStyle;
  onChange: (style: ProductCardStyle) => void;
  onClose: () => void;
}

const defaultStyle: ProductCardStyle = {
  template: 'standard',
  layout: 'grid-3',
  cardBackground: '#1a1f2e',
  cardBorder: '#00c2ff',
  cardBorderWidth: 1,
  cardBorderRadius: 8,
  cardShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  cardPadding: 16,
  imageAspectRatio: '4:3',
  imageFit: 'cover',
  titleColor: '#ffffff',
  titleSize: 18,
  priceColor: '#00c2ff',
  priceSize: 24,
  buttonColor: '#00c2ff',
  buttonTextColor: '#ffffff',
  buttonBorderRadius: 4,
  hoverEffect: 'lift',
  showBadges: true,
  showRating: true,
  showDownloads: true,
  animationDuration: 300
};

export default function ProductStyleEditor({ style, onChange, onClose }: ProductStyleEditorProps) {
  const [localStyle, setLocalStyle] = useState<ProductCardStyle>({ ...defaultStyle, ...style });

  const updateStyle = (key: keyof ProductCardStyle, value: any) => {
    const newStyle = { ...localStyle, [key]: value };
    setLocalStyle(newStyle);
    onChange(newStyle);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-cyan-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1f2e] border-b border-cyan-500/30 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-cyan-400 font-mono">Product Display Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Card Template</Label>
            <Select value={localStyle.template} onValueChange={(value) => updateStyle('template', value)}>
              <SelectTrigger className="bg-[#0a0e1a] border-cyan-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Card</SelectItem>
                <SelectItem value="hover-reveal">Hover Reveal (Payhip Style)</SelectItem>
                <SelectItem value="minimal">Minimal Clean</SelectItem>
                <SelectItem value="gaming">Gaming/Cyber</SelectItem>
                <SelectItem value="compact-list">Compact List</SelectItem>
                <SelectItem value="magazine">Magazine Style</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Layout</Label>
            <Select value={localStyle.layout} onValueChange={(value) => updateStyle('layout', value)}>
              <SelectTrigger className="bg-[#0a0e1a] border-cyan-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid-2">2 Columns</SelectItem>
                <SelectItem value="grid-3">3 Columns</SelectItem>
                <SelectItem value="grid-4">4 Columns</SelectItem>
                <SelectItem value="list">List View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card Background */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Card Background</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyle.cardBackground}
                onChange={(e) => updateStyle('cardBackground', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={localStyle.cardBackground}
                onChange={(e) => updateStyle('cardBackground', e.target.value)}
                className="flex-1 bg-[#0a0e1a] border-cyan-500/30"
              />
            </div>
          </div>

          {/* Card Border */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Border Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyle.cardBorder}
                onChange={(e) => updateStyle('cardBorder', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={localStyle.cardBorder}
                onChange={(e) => updateStyle('cardBorder', e.target.value)}
                className="flex-1 bg-[#0a0e1a] border-cyan-500/30"
              />
            </div>
          </div>

          {/* Border Width */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Border Width: {localStyle.cardBorderWidth}px</Label>
            <Slider
              value={[localStyle.cardBorderWidth]}
              onValueChange={([value]) => updateStyle('cardBorderWidth', value)}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Border Radius: {localStyle.cardBorderRadius}px</Label>
            <Slider
              value={[localStyle.cardBorderRadius]}
              onValueChange={([value]) => updateStyle('cardBorderRadius', value)}
              min={0}
              max={32}
              step={2}
              className="w-full"
            />
          </div>

          {/* Card Padding */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Card Padding: {localStyle.cardPadding}px</Label>
            <Slider
              value={[localStyle.cardPadding]}
              onValueChange={([value]) => updateStyle('cardPadding', value)}
              min={0}
              max={48}
              step={4}
              className="w-full"
            />
          </div>

          {/* Image Aspect Ratio */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Image Aspect Ratio</Label>
            <Select value={localStyle.imageAspectRatio} onValueChange={(value) => updateStyle('imageAspectRatio', value)}>
              <SelectTrigger className="bg-[#0a0e1a] border-cyan-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">Square (1:1)</SelectItem>
                <SelectItem value="4:3">Standard (4:3)</SelectItem>
                <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                <SelectItem value="16:9">Wide (16:9)</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image Fit */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Image Fit</Label>
            <Select value={localStyle.imageFit} onValueChange={(value) => updateStyle('imageFit', value)}>
              <SelectTrigger className="bg-[#0a0e1a] border-cyan-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title Color */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Title Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyle.titleColor}
                onChange={(e) => updateStyle('titleColor', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={localStyle.titleColor}
                onChange={(e) => updateStyle('titleColor', e.target.value)}
                className="flex-1 bg-[#0a0e1a] border-cyan-500/30"
              />
            </div>
          </div>

          {/* Title Size */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Title Size: {localStyle.titleSize}px</Label>
            <Slider
              value={[localStyle.titleSize]}
              onValueChange={([value]) => updateStyle('titleSize', value)}
              min={12}
              max={32}
              step={2}
              className="w-full"
            />
          </div>

          {/* Price Color */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Price Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyle.priceColor}
                onChange={(e) => updateStyle('priceColor', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={localStyle.priceColor}
                onChange={(e) => updateStyle('priceColor', e.target.value)}
                className="flex-1 bg-[#0a0e1a] border-cyan-500/30"
              />
            </div>
          </div>

          {/* Price Size */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Price Size: {localStyle.priceSize}px</Label>
            <Slider
              value={[localStyle.priceSize]}
              onValueChange={([value]) => updateStyle('priceSize', value)}
              min={14}
              max={40}
              step={2}
              className="w-full"
            />
          </div>

          {/* Button Color */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Button Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyle.buttonColor}
                onChange={(e) => updateStyle('buttonColor', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={localStyle.buttonColor}
                onChange={(e) => updateStyle('buttonColor', e.target.value)}
                className="flex-1 bg-[#0a0e1a] border-cyan-500/30"
              />
            </div>
          </div>

          {/* Button Text Color */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Button Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localStyle.buttonTextColor}
                onChange={(e) => updateStyle('buttonTextColor', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={localStyle.buttonTextColor}
                onChange={(e) => updateStyle('buttonTextColor', e.target.value)}
                className="flex-1 bg-[#0a0e1a] border-cyan-500/30"
              />
            </div>
          </div>

          {/* Button Border Radius */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Button Border Radius: {localStyle.buttonBorderRadius}px</Label>
            <Slider
              value={[localStyle.buttonBorderRadius]}
              onValueChange={([value]) => updateStyle('buttonBorderRadius', value)}
              min={0}
              max={32}
              step={2}
              className="w-full"
            />
          </div>

          {/* Hover Effect */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Hover Effect</Label>
            <Select value={localStyle.hoverEffect} onValueChange={(value) => updateStyle('hoverEffect', value)}>
              <SelectTrigger className="bg-[#0a0e1a] border-cyan-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lift">Lift Up</SelectItem>
                <SelectItem value="glow">Glow</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Animation Duration */}
          <div className="space-y-2">
            <Label className="text-cyan-400">Animation Duration: {localStyle.animationDuration}ms</Label>
            <Slider
              value={[localStyle.animationDuration]}
              onValueChange={([value]) => updateStyle('animationDuration', value)}
              min={100}
              max={1000}
              step={50}
              className="w-full"
            />
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <Label className="text-cyan-400">Display Options</Label>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showBadges"
                checked={localStyle.showBadges}
                onChange={(e) => updateStyle('showBadges', e.target.checked)}
                className="rounded border-cyan-500/30"
              />
              <Label htmlFor="showBadges" className="text-sm text-cyan-300">Show Badges (NEW, TOP RATED)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showRating"
                checked={localStyle.showRating}
                onChange={(e) => updateStyle('showRating', e.target.checked)}
                className="rounded border-cyan-500/30"
              />
              <Label htmlFor="showRating" className="text-sm text-cyan-300">Show Rating</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showDownloads"
                checked={localStyle.showDownloads}
                onChange={(e) => updateStyle('showDownloads', e.target.checked)}
                className="rounded border-cyan-500/30"
              />
              <Label htmlFor="showDownloads" className="text-sm text-cyan-300">Show Download Count</Label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a1f2e] border-t border-cyan-500/30 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-cyan-500/30">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
