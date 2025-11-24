/**
 * Permission Request Modal
 * Displays friendly permission information and contact instructions
 * Lisa v3.3 - Improved UX for read-only users
 */
import React from 'react';
import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: string;
  requiredRole?: string;
}

export default function PermissionRequestModal({
  isOpen,
  onClose,
  currentRole,
  requiredRole = 'editor'
}: PermissionRequestModalProps) {
  if (!isOpen) return null;

  const roleDisplay = {
    viewer: 'Viewer',
    editor: 'Editor',
    admin: 'Administrator'
  }[currentRole] || 'Unknown';

  const requiredRoleDisplay = {
    viewer: 'Viewer',
    editor: 'Editor',
    admin: 'Administrator'
  }[requiredRole] || 'Unknown';

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <LockClosedIcon className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Permission Required
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Your role:</span>
                <span className="font-medium text-gray-900">{roleDisplay}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Required role:</span>
                <span className="font-medium text-indigo-600">{requiredRoleDisplay}</span>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              You need <span className="font-medium">{requiredRoleDisplay}</span> permissions 
              to edit attributes in the Attribute Command Center.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                How to request access:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Contact your team administrator</li>
                <li>Request <span className="font-medium">{requiredRoleDisplay}</span> role for the Attribute Command Center</li>
                <li>Once approved, refresh this page to see your new permissions</li>
              </ol>
            </div>

            <p className="text-xs text-gray-500">
              If you believe you should have these permissions, please reach out to your system administrator 
              for assistance.
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
