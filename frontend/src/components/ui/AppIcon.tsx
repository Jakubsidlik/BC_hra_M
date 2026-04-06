import type { LucideProps } from 'lucide-react';
import { BookOpen, Eraser, Hourglass, Menu, Play, SkipForward, Trash2, X } from 'lucide-react';
import type { ComponentType } from 'react';

type AppIconName =
  | 'delete'
  | 'ink_eraser'
  | 'menu'
  | 'skip_next'
  | 'hourglass_empty'
  | 'play_arrow'
  | 'menu_book'
  | 'close';

const ICON_MAP: Record<AppIconName, ComponentType<LucideProps>> = {
  delete: Trash2,
  ink_eraser: Eraser,
  menu: Menu,
  skip_next: SkipForward,
  hourglass_empty: Hourglass,
  play_arrow: Play,
  menu_book: BookOpen,
  close: X,
};

interface AppIconProps {
  name: AppIconName;
  className?: string;
}

export function AppIcon({ name, className }: AppIconProps) {
  const Icon = ICON_MAP[name];
  return <Icon aria-hidden="true" className={className} strokeWidth={2.2} />;
}
