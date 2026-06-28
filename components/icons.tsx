"use client";

// App icons, backed by the Phosphor icon set. Wrappers keep stable names so
// call sites don't change; className still controls size (Tailwind h-/w-).
import {
  House,
  ListBullets,
  Wallet,
  ArrowsClockwise,
  Users,
  GearSix,
  Plus,
  MagnifyingGlass,
  CaretRight,
  Trash,
  ArrowDown,
  ArrowUp,
  ArrowsLeftRight,
  ChartPieSlice,
  Target,
  UserCircle,
  List,
  type IconProps,
} from "@phosphor-icons/react";

export const HomeIcon = (p: IconProps) => <House {...p} />;
export const ListIcon = (p: IconProps) => <ListBullets {...p} />;
export const WalletIcon = (p: IconProps) => <Wallet {...p} />;
export const RepeatIcon = (p: IconProps) => <ArrowsClockwise {...p} />;
export const UsersIcon = (p: IconProps) => <Users {...p} />;
export const SettingsIcon = (p: IconProps) => <GearSix {...p} />;
export const PlusIcon = (p: IconProps) => <Plus {...p} />;
export const SearchIcon = (p: IconProps) => <MagnifyingGlass {...p} />;
export const ChevronIcon = (p: IconProps) => <CaretRight {...p} />;
export const TrashIcon = (p: IconProps) => <Trash {...p} />;
export const ArrowDownIcon = (p: IconProps) => <ArrowDown {...p} />;
export const ArrowUpIcon = (p: IconProps) => <ArrowUp {...p} />;
export const SwapIcon = (p: IconProps) => <ArrowsLeftRight {...p} />;
export const InsightsIcon = (p: IconProps) => <ChartPieSlice {...p} />;
export const BudgetIcon = (p: IconProps) => <Target {...p} />;
export const ProfileIcon = (p: IconProps) => <UserCircle {...p} />;
export const MenuIcon = (p: IconProps) => <List {...p} />;
