interface PluginIconProps {
  pluginName: string;
  iconUrl?: string | null;
  featured?: boolean;
  sizeClassName?: string;
}

function buildInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function PluginIcon({
  pluginName,
  iconUrl,
  featured = false,
  sizeClassName = "w-11 h-11",
}: PluginIconProps) {
  const initials = buildInitials(pluginName);
  const frameClasses = featured
    ? "bg-accent/10 border border-accent/30"
    : "bg-bg-surface border border-border-hover";

  return (
    <div className={`${sizeClassName} ${frameClasses} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote icon URL can come from S3-compatible storage hosts
        <img
          src={iconUrl}
          alt={`${pluginName} icon`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className={`font-mono font-bold text-xs ${featured ? "text-accent" : "text-text-subtle"}`}
          role="img"
          aria-label={`${pluginName} icon fallback (${initials})`}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
