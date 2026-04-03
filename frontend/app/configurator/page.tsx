"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Footer, Navbar } from "@/components/layout";
import { ConfigPluginList } from "@/components/configurator/ConfigPluginList";
import { PluginPicker } from "@/components/configurator/PluginPicker";
import { Button } from "@/components/ui";
import {
  createServerConfig,
  downloadPreview,
  updateServerConfig,
  validateServerConfig,
} from "@/lib/api";
import { useCurrentUser, usePlugin, usePluginVersions, useServerConfig } from "@/lib/hooks";
import type { ServerConfigPlatform } from "@/lib/types";

interface ConfigPluginItem {
  plugin_id: string;
  plugin_slug: string;
  plugin_name: string;
  version_id: string;
  version: string;
  is_auto_dep: boolean;
}

const PLATFORM_OPTIONS: { value: ServerConfigPlatform; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "macos", label: "macOS" },
];

function parseApiError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const match = /"error":\s*"([^"]+)"/.exec(error.message);
  return match?.[1] ?? error.message ?? fallback;
}

function toSlugFallback(pluginName: string, pluginId: string): string {
  const normalized = pluginName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-");

  if (normalized.length > 0) {
    return normalized;
  }

  return `plugin-${pluginId.slice(0, 8)}`;
}

interface PresetPluginData {
  id: string;
  slug: string;
  name: string;
}

interface PresetVersionsData {
  versions: Array<{ id: string; version: string; is_yanked: boolean }>;
}

function buildPresetPluginItem(
  presetPlugin: PresetPluginData | null | undefined,
  presetVersions: PresetVersionsData | null | undefined,
): ConfigPluginItem | null {
  if (!presetPlugin || !presetVersions) {
    return null;
  }

  const latestVersion = presetVersions.versions.find((version) => !version.is_yanked);
  if (!latestVersion) {
    return null;
  }

  return {
    plugin_id: presetPlugin.id,
    plugin_slug: presetPlugin.slug,
    plugin_name: presetPlugin.name,
    version_id: latestVersion.id,
    version: latestVersion.version,
    is_auto_dep: false,
  };
}

function getSaveButtonLabel(isSaving: boolean, isEditMode: boolean): string {
  if (isSaving) {
    return "Sauvegarde...";
  }

  if (isEditMode) {
    return "Mettre a jour la configuration";
  }

  return "Sauvegarder la configuration";
}

export default function ConfiguratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configId = searchParams.get("id");
  const presetPluginSlug = configId ? null : searchParams.get("plugin");

  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const {
    config: loadedConfig,
    isLoading: isLoadingConfig,
    error: configError,
  } = useServerConfig(configId);
  const { data: presetPlugin } = usePlugin(presetPluginSlug);
  const { data: presetVersions } = usePluginVersions(presetPluginSlug);

  const hydratedConfigIdRef = useRef<string | null>(null);
  const presetPluginAddedRef = useRef(false);

  const [name, setName] = useState("My Pumpkin Server");
  const [platform, setPlatform] = useState<ServerConfigPlatform>("linux");
  const [plugins, setPlugins] = useState<ConfigPluginItem[]>([]);

  const [isValidating, setIsValidating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace("/auth/login");
    }
  }, [isLoadingUser, router, user]);

  useEffect(() => {
    if (!configId) {
      hydratedConfigIdRef.current = null;
      return;
    }

    if (loadedConfig && hydratedConfigIdRef.current !== loadedConfig.id) {
      hydratedConfigIdRef.current = loadedConfig.id;
      setName(loadedConfig.name);
      setPlatform(loadedConfig.platform);
      setPlugins(loadedConfig.plugins);
    }
  }, [configId, loadedConfig]);

  useEffect(() => {
    if (presetPluginAddedRef.current) {
      return;
    }

    const presetPluginItem = buildPresetPluginItem(presetPlugin, presetVersions);
    if (!presetPluginItem) {
      return;
    }

    presetPluginAddedRef.current = true;
    setPlugins([presetPluginItem]);
  }, [presetPlugin, presetVersions]);

  const manualSelections = useMemo(
    () =>
      plugins
        .filter((plugin) => !plugin.is_auto_dep)
        .map((plugin) => ({
          plugin_id: plugin.plugin_id,
          version_id: plugin.version_id,
        })),
    [plugins],
  );

  function handleAddPlugin(
    pluginId: string,
    versionId: string,
    pluginName: string,
    version: string,
  ) {
    const nextPlugin: ConfigPluginItem = {
      plugin_id: pluginId,
      plugin_slug: toSlugFallback(pluginName, pluginId),
      plugin_name: pluginName,
      version_id: versionId,
      version,
      is_auto_dep: false,
    };

    setPlugins((current) => {
      const manualOnlyWithoutCurrent = current.filter(
        (plugin) => !plugin.is_auto_dep && plugin.plugin_id !== pluginId,
      );
      return [...manualOnlyWithoutCurrent, nextPlugin];
    });
  }

  function handleRemovePlugin(pluginId: string) {
    setPlugins((current) =>
      current.filter(
        (plugin) => !plugin.is_auto_dep && plugin.plugin_id !== pluginId,
      ),
    );
  }

  async function handleValidate() {
    if (manualSelections.length === 0) {
      toast.error("Ajoute au moins un plugin avant la validation.");
      return;
    }

    setIsValidating(true);
    try {
      const response = await validateServerConfig({
        platform,
        plugins: manualSelections,
      });
      setPlugins(response.plugins);
      toast.success(`Validation OK: ${response.plugins.length} plugins resolus.`);
    } catch (error) {
      toast.error(parseApiError(error, "Validation impossible."));
    } finally {
      setIsValidating(false);
    }
  }

  async function handleDownload() {
    if (manualSelections.length === 0) {
      toast.error("Ajoute au moins un plugin avant le telechargement.");
      return;
    }

    setIsDownloading(true);
    try {
      await downloadPreview({ platform, plugins: manualSelections });
      toast.success("Telechargement du ZIP lance.");
    } catch (error) {
      toast.error(parseApiError(error, "Telechargement impossible."));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Le nom de configuration est obligatoire.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: trimmedName,
        platform,
        plugins: manualSelections,
      };

      if (configId) {
        const updated = await updateServerConfig(configId, payload);
        setName(updated.name);
        setPlatform(updated.platform);
        setPlugins(updated.plugins);
        hydratedConfigIdRef.current = updated.id;
        toast.success("Configuration mise a jour.");
      } else {
        const created = await createServerConfig(payload);
        setName(created.name);
        setPlatform(created.platform);
        setPlugins(created.plugins);
        hydratedConfigIdRef.current = created.id;
        router.replace(`/configurator?id=${created.id}`);
        toast.success("Configuration sauvegardee.");
      }
    } catch (error) {
      toast.error(parseApiError(error, "Sauvegarde impossible."));
    } finally {
      setIsSaving(false);
    }
  }

  const isBusy = isValidating || isDownloading || isSaving;
  const isEditMode = Boolean(configId);
  const saveButtonLabel = getSaveButtonLabel(isSaving, isEditMode);

  function renderConfiguratorBody() {
    if (configId && isLoadingConfig && !loadedConfig) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {["sk-cfg-left", "sk-cfg-right"].map((skeletonKey) => (
            <div
              key={skeletonKey}
              className="h-[460px] border border-border-default bg-bg-surface animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (configError) {
      return (
        <div className="border border-error/30 bg-error/5 p-4 font-mono text-xs text-error">
          Impossible de charger cette configuration. Verifie ID dans URL.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="space-y-4">
          <PluginPicker
            onAdd={handleAddPlugin}
            excludedPluginIds={plugins.map((plugin) => plugin.plugin_id)}
          />
        </section>

        <section className="space-y-4">
          <div className="border border-border-default bg-bg-elevated p-4">
            <label
              htmlFor="config-name"
              className="block font-mono text-xs text-text-muted uppercase tracking-widest mb-2"
            >
              Nom de configuration
            </label>
            <input
              id="config-name"
              type="text"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3 py-2 bg-bg-base border border-border-default focus:border-accent outline-none font-mono text-sm text-text-primary placeholder:text-text-dim transition-colors"
              placeholder="Mon serveur survie"
            />
          </div>

          <div className="border border-border-default bg-bg-elevated p-4">
            <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
              Plateforme
            </p>

            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlatform(option.value)}
                  className={`px-3 py-2 border font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                    platform === option.value
                      ? "border-accent bg-accent text-black font-bold"
                      : "border-border-default text-text-secondary hover:border-border-hover"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="mt-3 font-mono text-[11px] text-text-dim">
              Seul le binaire Pumpkin change selon la plateforme.
            </p>
          </div>

          <ConfigPluginList plugins={plugins} onRemove={handleRemovePlugin} />

          <div className="border border-border-default bg-bg-elevated p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleValidate}
                disabled={isBusy}
                variant="ghost"
              >
                {isValidating ? "Validation..." : "Valider"}
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={isBusy}
              >
                <Download className="w-3.5 h-3.5" />
                {isDownloading ? "Preparation..." : "Telecharger"}
              </Button>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isBusy}
              className="w-full justify-center"
            >
              <Save className="w-3.5 h-3.5" />
              {saveButtonLabel}
            </Button>

            <p className="font-mono text-[11px] text-text-dim">
              {manualSelections.length} plugin(s) manuel(s) selectionne(s).
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (!isLoadingUser && !user) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
              Server Configurator
            </h1>
            <p className="font-mono text-xs text-text-dim mt-1">
              Compose un serveur Pumpkin pret a lancer avec ses plugins .wasm.
            </p>
          </div>
        </div>

        {renderConfiguratorBody()}
      </main>
      <Footer />
    </>
  );
}
