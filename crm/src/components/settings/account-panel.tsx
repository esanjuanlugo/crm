'use client';

import { ProfileForm } from './profile-form';
import { SecurityPanel } from './security-panel';

/**
 * Account = profile + login & security, side by side on wide screens.
 * Each block keeps its own header and save button. Appearance lives in
 * the header menu now (see components/layout/appearance-menu.tsx).
 * The ids let old "?tab=security" links scroll here.
 */
export function AccountPanel() {
  return (
    <div className="animate-in fade-in-50 grid items-start gap-x-8 gap-y-10 duration-200 2xl:grid-cols-2">
      <div
        id="settings-profile"
        className="min-w-0 max-w-3xl scroll-mt-6 2xl:max-w-none"
      >
        <ProfileForm />
      </div>
      <div
        id="settings-security"
        className="min-w-0 max-w-3xl scroll-mt-6 2xl:max-w-none"
      >
        <SecurityPanel />
      </div>
    </div>
  );
}
