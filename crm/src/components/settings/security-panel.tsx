'use client';

import { PasswordForm } from './password-form';
import { SessionsCard } from './sessions-card';
import { SettingsPanelHead } from './settings-panel-head';
import { useTranslations } from 'next-intl';

/**
 * "Login & security" section — groups the former Profile-tab password
 * and active-sessions cards into their own dedicated home.
 */
export function SecurityPanel() {
  const t = useTranslations('Settings.security');
  return (
    <section className="max-w-2xl xl:max-w-5xl 2xl:max-w-7xl 3xl:max-w-[1700px] animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
      />
      <div className="space-y-4 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0">
        <PasswordForm />
        <SessionsCard />
      </div>
    </section>
  );
}
