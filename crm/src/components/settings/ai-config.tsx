'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Power,
  PenLine,
  Zap,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsPanelHead } from './settings-panel-head';
import { AiKnowledgeCard } from './ai-knowledge';
import { AI_PROVIDER_DEFAULT_MODEL } from '@/lib/ai/defaults';
import type { AiProvider } from '@/lib/ai/types';
import type { AccountMember } from '@/types';
import { fetchAccountMembers, memberLabel } from '@/lib/account/members';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const MASKED_KEY = '••••••••••••••••';

// Radix Select can't use an empty-string item value, so the "leave
// unassigned" choice gets a sentinel that maps to null in the payload.
const HANDOFF_QUEUE = '__queue__';

const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  custom: '',
};

const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  custom: '',
};

type AiMode = 'off' | 'draft' | 'auto';

const COPY_ES = {
  summaryTitle: 'Resumen',
  summaryReady: 'Todo listo. Guarda los cambios para aplicarlos.',
  summaryPending: 'Completa los pasos pendientes para empezar.',
  rowConnection: 'Conexión',
  rowContext: 'Contexto del negocio',
  rowMode: 'Modo de trabajo',
  rowHandoff: 'Pasa a una persona',
  missingKey: 'Falta la clave API',
  defined: 'Definido',
  empty: 'Sin definir',
  queueShort: 'Cola sin asignar',
  repliesUnit: 'respuestas',
  step1Title: 'Conecta tu IA',
  step1Desc:
    'Elige tu proveedor y pega tu clave API. Se guarda cifrada y nunca vuelve a mostrarse.',
  keySaved: 'Clave guardada',
  advancedTitle: 'Búsqueda semántica en tu base de conocimientos',
  advancedOptional: 'Opcional',
  step2Title: 'Cuéntale sobre tu negocio',
  step2Desc:
    'Productos, tono de voz y lo que puede o no prometer. Se usa en los borradores y en las respuestas automáticas.',
  tipsLabel: 'Toca para añadir un punto de partida:',
  tips: [
    { label: 'Qué vendes', text: 'Qué vendemos: ' },
    { label: 'Tono de voz', text: 'Tono de voz: amable, claro y conciso.' },
    {
      label: 'Qué no prometer',
      text: 'Nunca indiques precios, fechas de entrega ni descuentos; deriva esos casos a una persona.',
    },
    { label: 'Horarios', text: 'Horario de atención: ' },
  ],
  step3Title: '¿Cómo quieres que trabaje?',
  step3Desc:
    'Elige cuánto participa la IA en tus conversaciones. Puedes cambiarlo cuando quieras.',
  modeOff: 'Apagado',
  modeOffDesc: 'La IA no participa. Tus conversaciones siguen siendo 100 % manuales.',
  modeDraft: 'Solo borradores',
  modeDraftDesc:
    'Tú decides: la IA sugiere una respuesta con el botón «Borrador con IA» y tú la envías.',
  modeAuto: 'Responde sola',
  modeAutoDesc:
    'Contesta los mensajes nuevos y pasa la conversación a una persona cuando no puede ayudar.',
  limitsTitle: 'Cuándo pasa a una persona',
};

const COPY_EN: typeof COPY_ES = {
  summaryTitle: 'Summary',
  summaryReady: 'All set. Save your changes to apply them.',
  summaryPending: 'Complete the pending steps to get started.',
  rowConnection: 'Connection',
  rowContext: 'Business context',
  rowMode: 'Work mode',
  rowHandoff: 'Hands off to a person',
  missingKey: 'API key missing',
  defined: 'Defined',
  empty: 'Not set',
  queueShort: 'Unassigned queue',
  repliesUnit: 'replies',
  step1Title: 'Connect your AI',
  step1Desc:
    'Choose your provider and paste your API key. It is stored encrypted and never shown again.',
  keySaved: 'Key saved',
  advancedTitle: 'Semantic search in your knowledge base',
  advancedOptional: 'Optional',
  step2Title: 'Tell it about your business',
  step2Desc:
    'Products, tone of voice and what it can or cannot promise. Used for drafts and automatic replies.',
  tipsLabel: 'Tap to add a starting point:',
  tips: [
    { label: 'What you sell', text: 'What we sell: ' },
    { label: 'Tone of voice', text: 'Tone of voice: friendly, clear and concise.' },
    {
      label: 'What not to promise',
      text: 'Never quote prices, delivery dates or discounts; hand those cases to a person.',
    },
    { label: 'Hours', text: 'Opening hours: ' },
  ],
  step3Title: 'How should it work?',
  step3Desc:
    'Choose how much the AI takes part in your conversations. You can change it any time.',
  modeOff: 'Off',
  modeOffDesc: 'The AI does not take part. Your conversations stay 100% manual.',
  modeDraft: 'Drafts only',
  modeDraftDesc:
    'You decide: the AI suggests a reply with the "AI draft" button and you send it.',
  modeAuto: 'Replies on its own',
  modeAutoDesc:
    'Answers new messages and hands the conversation to a person when it cannot help.',
  limitsTitle: 'When it hands off to a person',
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {n}
    </span>
  );
}

function StatusRow({
  ok,
  label,
  value,
}: {
  ok: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          ok ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground',
        )}
      >
        {ok ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function AiConfig() {
  const { accountId, accountRole, profileLoading } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;
  const t = useTranslations('Settings.aiConfig');
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('openai');
  const [model, setModel] = useState(AI_PROVIDER_DEFAULT_MODEL.openai);
  // Only used when provider === 'custom' (OpenAI-compatible endpoint).
  const [providerName, setProviderName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [embeddingsKey, setEmbeddingsKey] = useState('');
  const [embeddingsKeyEdited, setEmbeddingsKeyEdited] = useState(false);
  const [hasStoredEmbeddingsKey, setHasStoredEmbeddingsKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [maxPerConversation, setMaxPerConversation] = useState(3);
  // Empty string = leave unassigned (shared queue).
  const [handoffAgentId, setHandoffAgentId] = useState('');
  const [members, setMembers] = useState<AccountMember[]>([]);

  // Guard keyed on the account (not a bare boolean) so an in-place
  // account switch — ownership transfer, multi-account membership —
  // refetches instead of showing the previous account's config. Mirrors
  // the loadedAccountIdRef pattern in whatsapp-config.tsx.
  const loadedAccountIdRef = useRef<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t('loadFailed'));
        return;
      }
      if (data.configured) {
        setConfigured(true);
        setProvider(data.provider);
        setModel(data.model);
        setProviderName(data.provider_name ?? '');
        setBaseUrl(data.base_url ?? '');
        setSystemPrompt(data.system_prompt ?? '');
        setIsActive(data.is_active);
        setAutoReplyEnabled(data.auto_reply_enabled);
        setMaxPerConversation(data.auto_reply_max_per_conversation ?? 3);
        setHandoffAgentId(data.handoff_agent_id ?? '');
        setHasStoredKey(Boolean(data.has_key));
        setApiKey(data.has_key ? MASKED_KEY : '');
        setKeyEdited(false);
        setHasStoredEmbeddingsKey(Boolean(data.has_embeddings_key));
        setEmbeddingsKey(data.has_embeddings_key ? MASKED_KEY : '');
        setEmbeddingsKeyEdited(false);
      }
    } catch {
      toast.error(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accountId || loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    void fetchConfig();
    // Members populate the handoff-target picker. Best-effort — on an
    // older deployment without the endpoint the picker just shows the
    // queue option.
    void fetchAccountMembers().then(setMembers);
  }, [accountId, fetchConfig]);

  // Swap the model default when the provider changes, unless the user
  // typed a custom model.
  const handleProviderChange = (next: AiProvider) => {
    setProvider(next);
    const isDefaultModel =
      model === AI_PROVIDER_DEFAULT_MODEL.openai ||
      model === AI_PROVIDER_DEFAULT_MODEL.anthropic ||
      model.trim() === '';
    if (isDefaultModel) setModel(AI_PROVIDER_DEFAULT_MODEL[next]);
  };

  const customFields = () =>
    provider === 'custom'
      ? { provider_name: providerName.trim(), base_url: baseUrl.trim() }
      : { provider_name: null, base_url: null };

  const keyPayload = () => (keyEdited ? apiKey.trim() : undefined);

  // undefined = leave unchanged; '' typed = null (clear); text = set.
  const embeddingsKeyPayload = () =>
    embeddingsKeyEdited ? embeddingsKey.trim() || null : undefined;

  const buildBody = () => ({
    provider,
    model: model.trim(),
    ...customFields(),
    api_key: keyPayload(),
    embeddings_api_key: embeddingsKeyPayload(),
    system_prompt: systemPrompt.trim() || null,
    is_active: isActive,
    auto_reply_enabled: autoReplyEnabled,
    auto_reply_max_per_conversation: maxPerConversation,
    handoff_agent_id: handoffAgentId || null,
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: model.trim(),
          ...customFields(),
          api_key: keyPayload(),
        }),
      });
      const data = await res.json();
      if (res.ok) toast.success(t('testSuccess'));
      else toast.error(data.error ?? t('testRejected'));
    } catch {
      toast.error(t('testNetworkError'));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!model.trim()) {
      toast.error(t('missingModel'));
      return;
    }
    if (provider === 'custom') {
      if (!providerName.trim()) {
        toast.error(t('missingProviderName'));
        return;
      }
      try {
        const u = new URL(baseUrl.trim());
        if (u.protocol !== 'https:') throw new Error();
      } catch {
        toast.error(t('invalidBaseUrl'));
        return;
      }
    }
    if (!configured && !keyEdited) {
      toast.error(t('missingApiKey'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('saveSuccess'));
        await fetchConfig();
      } else {
        toast.error(data.error ?? t('saveFailed'));
      }
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch('/api/ai/config', { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('removeSuccess'));
        setConfigured(false);
        setHasStoredKey(false);
        setApiKey('');
        setKeyEdited(false);
        setIsActive(false);
        setAutoReplyEnabled(false);
        setSystemPrompt('');
        setHandoffAgentId('');
        setProviderName('');
        setBaseUrl('');
      } else {
        const data = await res.json();
        toast.error(data.error ?? t('removeFailed'));
      }
    } catch {
      toast.error(t('removeFailed'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const disabled = !canEdit || saving;
  const L = locale === 'es' ? COPY_ES : COPY_EN;

  const mode: AiMode = !isActive ? 'off' : autoReplyEnabled ? 'auto' : 'draft';
  const changeMode = (next: AiMode) => {
    setIsActive(next !== 'off');
    setAutoReplyEnabled(next === 'auto');
  };

  const keyReady = hasStoredKey || (keyEdited && apiKey.trim().length > 0);
  const hasContext = systemPrompt.trim().length > 0;
  const stepsDone = [keyReady, hasContext, mode !== 'off'].filter(Boolean).length;

  const providerShown =
    provider === 'custom'
      ? providerName.trim() || t('providerCustom')
      : PROVIDER_LABEL[provider];
  const handoffMember = members.find((m) => m.user_id === handoffAgentId);
  const handoffShort = handoffMember ? memberLabel(handoffMember) : L.queueShort;

  const providerOptions: { id: AiProvider; label: string }[] = [
    { id: 'openai', label: PROVIDER_LABEL.openai },
    { id: 'anthropic', label: PROVIDER_LABEL.anthropic },
    { id: 'custom', label: t('providerCustom') },
  ];

  const modeOptions = [
    { id: 'off' as AiMode, icon: Power, title: L.modeOff, desc: L.modeOffDesc },
    { id: 'draft' as AiMode, icon: PenLine, title: L.modeDraft, desc: L.modeDraftDesc },
    { id: 'auto' as AiMode, icon: Zap, title: L.modeAuto, desc: L.modeAutoDesc },
  ];
  const modeTitle = modeOptions.find((m) => m.id === mode)?.title ?? '';

  const addTip = (text: string) =>
    setSystemPrompt((prev) => {
      const base = prev.trimEnd();
      return (base ? base + String.fromCharCode(10) : '') + text;
    });

  const actionButtons = (
    <>
      {configured && (
        <Button
          variant="ghost"
          onClick={handleRemove}
          disabled={!canEdit || removing}
          className="text-destructive hover:text-destructive"
        >
          {removing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {t('remove')}
        </Button>
      )}
      <Button onClick={handleSave} disabled={disabled}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('save')}
      </Button>
    </>
  );

  return (
    <div className="min-w-0">
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
        action={<div className="flex items-center gap-2 xl:hidden">{actionButtons}</div>}
      />

      {!canEdit && (
        <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {t('adminOnlyConfig')}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Resumen / estado */}
        <aside className="min-w-0 xl:sticky xl:top-20 xl:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> {L.summaryTitle}
              </CardTitle>
              <CardDescription>
                {stepsDone === 3 ? L.summaryReady : L.summaryPending}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <StatusRow
                  ok={keyReady}
                  label={L.rowConnection}
                  value={keyReady ? providerShown + ' · ' + model : L.missingKey}
                />
                <StatusRow
                  ok={hasContext}
                  label={L.rowContext}
                  value={hasContext ? L.defined : L.empty}
                />
                <StatusRow ok={mode !== 'off'} label={L.rowMode} value={modeTitle} />
                {mode === 'auto' && (
                  <StatusRow
                    ok
                    label={L.rowHandoff}
                    value={maxPerConversation + ' ' + L.repliesUnit + ' · ' + handoffShort}
                  />
                )}
              </div>
              <div className="hidden flex-col-reverse gap-2 xl:flex [&>button]:w-full">
                {actionButtons}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Pasos */}
        <div className="grid min-w-0 gap-6 xl:order-1 min-[1900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* 1. Conecta tu IA */}
          <Card className="@container min-[1900px]:col-start-1 min-[1900px]:row-start-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-base">
                <StepBadge n={1} /> {L.step1Title}
              </CardTitle>
              <CardDescription>{L.step1Desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>{t('provider')}</Label>
                <div
                  role="radiogroup"
                  aria-label={t('provider')}
                  className="grid gap-2 @md:grid-cols-3"
                >
                  {providerOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={provider === p.id}
                      disabled={disabled}
                      onClick={() => handleProviderChange(p.id)}
                      className={cn(
                        'flex items-center justify-center rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors disabled:opacity-60',
                        provider === p.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {provider === 'custom' && (
                <div className="grid gap-4 @xl:grid-cols-[14rem_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="ai-provider-name">{t('providerName')}</Label>
                    <Input
                      id="ai-provider-name"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      placeholder="Groq, OpenRouter, Together..."
                      maxLength={60}
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-base-url">{t('baseUrl')}</Label>
                    <Input
                      id="ai-base-url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.groq.com/openai/v1"
                      disabled={disabled}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">{t('baseUrlHint')}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="ai-model">{t('model')}</Label>
                <Input
                  id="ai-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    provider === 'custom'
                      ? t('customModelPlaceholder')
                      : AI_PROVIDER_DEFAULT_MODEL[provider]
                  }
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="ai-key">{t('apiKey')}</Label>
                  {hasStoredKey && !keyEdited && (
                    <span className="flex items-center gap-1 text-xs text-emerald-500">
                      <Check className="h-3 w-3" /> {L.keySaved}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      id="ai-key"
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setKeyEdited(true);
                      }}
                      onFocus={() => {
                        if (!keyEdited && hasStoredKey) {
                          setApiKey('');
                          setKeyEdited(true);
                        }
                      }}
                      placeholder={
                        provider === 'custom'
                          ? t('customKeyPlaceholder')
                          : KEY_PLACEHOLDER[provider]
                      }
                      disabled={disabled}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={disabled || testing}
                  >
                    {testing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {t('testKey')}
                  </Button>
                </div>
              </div>

              {provider === 'openai' && (
                <details className="group rounded-lg border border-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span>{L.advancedTitle}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {L.advancedOptional}
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-border p-3">
                    <Label htmlFor="ai-embeddings-key">{t('embeddingsKey')}</Label>
                    <Input
                      id="ai-embeddings-key"
                      type="password"
                      value={embeddingsKey}
                      onChange={(e) => {
                        setEmbeddingsKey(e.target.value);
                        setEmbeddingsKeyEdited(true);
                      }}
                      onFocus={() => {
                        if (!embeddingsKeyEdited && hasStoredEmbeddingsKey) {
                          setEmbeddingsKey('');
                          setEmbeddingsKeyEdited(true);
                        }
                      }}
                      placeholder="sk-... (OpenAI)"
                      disabled={disabled}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('embeddingsHint', { sameKeyText: t('sameKeyText') })}
                    </p>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>

          {/* 2. Tu negocio */}
          <Card className="@container min-[1900px]:col-start-2 min-[1900px]:row-start-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-base">
                <StepBadge n={2} /> {L.step2Title}
              </CardTitle>
              <CardDescription>{L.step2Desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="ai-prompt">{t('businessContext')}</Label>
              <Textarea
                id="ai-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={t('promptPlaceholder')}
                rows={8}
                className="min-h-40"
                disabled={disabled}
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{L.tipsLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {L.tips.map((tip) => (
                    <button
                      key={tip.label}
                      type="button"
                      onClick={() => addTip(tip.text)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary disabled:opacity-60"
                    >
                      <Plus className="h-3 w-3" /> {tip.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Modo de trabajo */}
          <Card className="@container min-[1900px]:col-start-1 min-[1900px]:row-start-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-base">
                <StepBadge n={3} /> {L.step3Title}
              </CardTitle>
              <CardDescription>{L.step3Desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                role="radiogroup"
                aria-label={L.step3Title}
                className="grid gap-3 @2xl:grid-cols-3"
              >
                {modeOptions.map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={disabled}
                      onClick={() => changeMode(m.id)}
                      className={cn(
                        'relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors disabled:opacity-60',
                        active
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {m.title}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {m.desc}
                      </span>
                      {active && (
                        <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {mode === 'auto' && (
                <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {L.limitsTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('autoReplyDesc')}
                    </p>
                  </div>
                  <div className="grid gap-5 @xl:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ai-max">{t('maxAutoReplies')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('maxAutoRepliesDesc')}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="-"
                          onClick={() => setMaxPerConversation((v) => Math.max(1, v - 1))}
                          disabled={disabled || maxPerConversation <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          id="ai-max"
                          type="number"
                          min={1}
                          max={20}
                          value={maxPerConversation}
                          onChange={(e) =>
                            setMaxPerConversation(
                              Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                            )
                          }
                          disabled={disabled}
                          className="w-16 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="+"
                          onClick={() => setMaxPerConversation((v) => Math.min(20, v + 1))}
                          disabled={disabled || maxPerConversation >= 20}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-handoff">{t('handoffTo')}</Label>
                      <p className="text-xs text-muted-foreground">{t('handoffToDesc')}</p>
                      <Select
                        value={handoffAgentId || HANDOFF_QUEUE}
                        onValueChange={(v) =>
                          setHandoffAgentId(!v || v === HANDOFF_QUEUE ? '' : v)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger id="ai-handoff">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={HANDOFF_QUEUE}>{t('handoffQueue')}</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {memberLabel(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Base de conocimientos */}
          <div className="min-w-0 min-[1900px]:col-start-2 min-[1900px]:row-start-2 [&>*]:h-full">
            <AiKnowledgeCard
              accountId={accountId}
              canEdit={canEdit}
              hasEmbeddingsKey={
                embeddingsKeyEdited
                  ? embeddingsKey.trim().length > 0
                  : hasStoredEmbeddingsKey
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
