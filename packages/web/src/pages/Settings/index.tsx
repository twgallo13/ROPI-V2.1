/**
 * Settings Hub Page
 * Navigation page for Admin Settings
 * 
 * Lisa v0.2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './Settings.css';

export default function SettingsHub() {
  return (
    <div className="settings-hub">
      <h1>Admin Settings</h1>
      <p className="subtitle">Manage system configuration and data</p>
      
      <div className="settings-sections">
        <Link to="/settings/attributes" className="settings-card">
          <h2>Attributes</h2>
          <p>Manage product attributes and validation rules</p>
        </Link>

        <Link to="/settings/smartrules" className="settings-card">
          <h2>Smart Rules</h2>
          <p>Configure domain rules and transformations</p>
        </Link>

        <Link to="/settings/aitemplates" className="settings-card">
          <h2>AI Templates</h2>
          <p>Manage AI content generation templates</p>
        </Link>
      </div>
    </div>
  );
}
