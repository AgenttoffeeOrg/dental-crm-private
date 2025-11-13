'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  User,
  Users,
  Workflow,
  MessageSquare,
  Sparkles,
  Plug,
  Settings,
  ChevronRight,
} from 'lucide-react';

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

export const settingsSections: SettingsSection[] = [
  {
    id: 'account',
    label: 'Account',
    icon: User,
    description: 'Profile, organization, locations, and billing',
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    description: 'Members, roles, and onboarding',
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: Workflow,
    description: 'Pipelines, deals, and treatment routing',
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: MessageSquare,
    description: 'Email, SMS, notifications, and calendar',
  },
  {
    id: 'ai',
    label: 'AI & Automation',
    icon: Sparkles,
    description: 'AI assistant, analytics, and marketing',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    description: 'Connected apps, API, and branding',
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    description: 'Security, analytics, and audit trail',
  },
];

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  hasTenant?: boolean;
}

export function SettingsSidebar({
  activeSection,
  onSectionChange,
  isMobileOpen = false,
  onMobileClose,
  hasTenant = true,
}: SettingsSidebarProps) {
  const handleSectionClick = (sectionId: string) => {
    onSectionChange(sectionId);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onMobileClose();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          role="button"
          tabIndex={0}
          aria-label="Close settings sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 overflow-y-auto z-50',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isDisabled = !hasTenant && section.id !== 'account';

            return (
              <button
                key={section.id}
                onClick={() => !isDisabled && handleSectionClick(section.id)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150',
                  !isDisabled && 'hover:bg-gray-50 active:scale-[0.98]',
                  isActive && 'bg-blue-50 border-l-4 border-blue-600 pl-[10px]',
                  !isActive && 'border-l-4 border-transparent',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0 mt-0.5',
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-blue-900' : 'text-gray-900'
                    )}
                  >
                    {section.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                    {section.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
