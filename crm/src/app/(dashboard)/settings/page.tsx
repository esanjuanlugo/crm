'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { SettingsOverview } from '@/components/settings/settings-overview';
import { ProfileForm } from '@/components/settings/profile-form';
import { SecurityPanel } from '@/components/settings/security-panel';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { QuickRepliesManager } from '@/components/settings/quick-replies-manager';
import { CrmPanel } from '@/components/settings/crm-panel';
import { MembersTab } from '@/components/settings/members-tab';
import { ApiKeysSettings } from '@/components/settings/api-keys-settings';
import {
  resolveAnchor,
  resolveSection,
  type SettingsSection,
} from '@/components/settings/settings-sections';

// `useSearchParams` opts this page out of static prerendering unless it
// sits under a Suspense boundary. Without one, the production build hits
// the "missing Suspense with CSR bailout" error and the whole page bails
// to client-side rendering — shipping a settings screen whose rail never
// wires up its click handlers. You land on the section the URL carried
// (the account-menu Settings link points at `?tab=whatsapp`) and can't
// navigate away. Mirror the login/signup split: a thin wrapper supplies
// the boundary; the inner component reads the query string.
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL (`?tab=`) is the single source of truth for the active
  // section — deep-linkable, and it keeps the existing links in the
  // app sidebar/header working. Legacy tab values (tags, custom-fields)
  // resolve onto their new home; unknown/empty → the Overview landing.
  const section = resolveSection(searchParams.get('tab'));

  // Old links (?tab=security, ?tab=deals...) land on the merged section
  // and scroll to the block they used to be.
  const anchor = resolveAnchor(searchParams.get('tab'));
  useEffect(() => {
    if (!anchor) return;
    const id = requestAnimationFrame(() => {
      document
        .getElementById('settings-' + anchor)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [section, anchor]);

  const go = (next: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  const panel: Record<SettingsSection, ReactNode> = {
    overview: <SettingsOverview onSelect={go} />,
    profile: (
      <div className="max-w-3xl">
        <ProfileForm />
      </div>
    ),
    security: (
      <div className="max-w-5xl">
        <SecurityPanel />
      </div>
    ),
    whatsapp: <WhatsAppConfig />,
    templates: <TemplateManager />,
    'quick-replies': <QuickRepliesManager />,
    crm: <CrmPanel />,
    members: <MembersTab />,
    api: <ApiKeysSettings />,
  };

  return (
    <div className="mx-auto w-full max-w-6xl 2xl:max-w-[1800px] 3xl:max-w-[2400px]">
      {/* Sin titulo general: cada seccion trae el suyo. El menu de
          secciones esta en el menu lateral principal. */}
      <div className="min-w-0">{panel[section]}</div>
    </div>
  );
}
