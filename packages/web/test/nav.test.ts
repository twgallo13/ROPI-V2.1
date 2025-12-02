import { describe, it, expect } from 'vitest';
import { navigationConfig, settingsNavConfig } from '../src/config/nav';

describe('Navigation Configuration', () => {
  it('should have all required main navigation items', () => {
    expect(navigationConfig).toBeDefined();
    expect(navigationConfig.length).toBe(9);
    
    const navIds = navigationConfig.map(item => item.id);
    expect(navIds).toContain('home');
    expect(navIds).toContain('products');
    expect(navIds).toContain('launch-calendar');
    expect(navIds).toContain('import');
    expect(navIds).toContain('export');
    expect(navIds).toContain('observations');
    expect(navIds).toContain('attributes');
    expect(navIds).toContain('smart-rules');
    expect(navIds).toContain('settings');
  });

  it('should have valid routes for all navigation items', () => {
    navigationConfig.forEach(item => {
      expect(item.route).toBeDefined();
      expect(item.route).toMatch(/^\//);
      expect(item.label).toBeDefined();
      expect(item.label.length).toBeGreaterThan(0);
    });
  });

  it('should have all required settings sub-navigation items', () => {
    expect(settingsNavConfig).toBeDefined();
    expect(settingsNavConfig.length).toBe(9);
    
    const settingsIds = settingsNavConfig.map(item => item.id);
    expect(settingsIds).toContain('ai-templates');
    expect(settingsIds).toContain('search');
    expect(settingsIds).toContain('import-settings');
    expect(settingsIds).toContain('export-settings');
    expect(settingsIds).toContain('bulk-actions');
    expect(settingsIds).toContain('workflows');
    expect(settingsIds).toContain('ai-performance');
    expect(settingsIds).toContain('users');
    expect(settingsIds).toContain('permissions');
  });

  it('should have /settings prefix for all settings routes', () => {
    settingsNavConfig.forEach(item => {
      expect(item.route).toMatch(/^\/settings\//);
    });
  });
});
