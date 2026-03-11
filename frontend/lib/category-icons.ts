import {
  Shield,
  Coins,
  Users,
  Gamepad2,
  Database,
  MessageSquare,
  Globe,
  Code,
  Zap,
  Lock,
  Tag,
  Compass,
  Palette,
  Swords,
  Trophy,
  Bug,
  ArrowRightLeft,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Maps category icon identifiers (stored in DB) to Lucide components. */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "gamepad-2": Gamepad2,
  shield: Shield,
  globe: Globe,
  coins: Coins,
  "message-square": MessageSquare,
  code: Code,
  zap: Zap,
  lock: Lock,
  users: Users,
  database: Database,
  compass: Compass,
  palette: Palette,
  swords: Swords,
  trophy: Trophy,
  bug: Bug,
  "arrow-right-left": ArrowRightLeft,
  wrench: Wrench,
};

/** Resolves a category icon string to a Lucide component, with Tag fallback. */
export function getCategoryIcon(icon: string | null): LucideIcon {
  if (icon && icon in CATEGORY_ICON_MAP) return CATEGORY_ICON_MAP[icon];
  return Tag;
}
