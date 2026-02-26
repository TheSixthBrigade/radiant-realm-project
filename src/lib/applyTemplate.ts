import { StoreTemplate } from './storeTemplates';

export function applyTemplate(template: StoreTemplate, currentSettings: Record<string, any>): {
  sections: any[];
  settings: Record<string, any>;
} {
  // Template settings override current settings — that's the whole point of applying a template
  const mergedSettings = { ...currentSettings, ...template.styleSettings };

  // Deep-clone sections so mutations don't affect the template definition
  const sections = template.defaultSections.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }));

  return { sections, settings: mergedSettings };
}
