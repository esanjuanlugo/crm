'use client';

import { ProfileForm } from './profile-form';
import { SecurityPanel } from './security-panel';
import { AppearancePanel } from './appearance-panel';

/**
 * Account = profile + login & security (side by side on wide screens)
 * and appearance below. Each block keeps its own header and save button.
 * The ids let old `?tab=security` / `?tab=appearance` links scroll here.
 */
export function AccountPanel() {
  return (
    <div className="animate-in fade-in-50 grid items-start gap-x-8 gap-y-10 duration-200 xl:grid-cols-2 2xl:grid-cols-3">
      <div id="settings-profile" className="min-w-0 scroll-mt-6">
        <ProfileForm />
      </div>
      <div id="settings-security" className="min-w-0 scroll-mt-6">
        <SecurityPanel />
      </div>
      <div
        id="settings-appearance"
        className="@container min-w-0 scroll-mt-6 xl:col-span-2 2xl:col-span-1"
      >
        <AppearancePanel />
      </div>
    </div>
  );
}
