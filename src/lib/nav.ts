import type { LucideIcon } from '@lucide/svelte';
import ChartLine from '@lucide/svelte/icons/chart-line';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import ReceiptText from '@lucide/svelte/icons/receipt-text';
import Settings from '@lucide/svelte/icons/settings';
import Wallet from '@lucide/svelte/icons/wallet';

// The single nav source: drives the side nav, the bottom nav and the tab titles.
export type NavItem = {
	href: string;
	label: string;
	icon: LucideIcon;
	/** Shown in the phone bottom nav. */
	primary: boolean;
	group: 'main' | 'more';
};

export const NAV: NavItem[] = [
	{ href: '/', label: 'Payslip', icon: ReceiptText, primary: true, group: 'main' },
	{ href: '/history', label: 'History', icon: ChartLine, primary: true, group: 'main' },
	{ href: '/expenses', label: 'Expenses', icon: Wallet, primary: true, group: 'main' },
	{ href: '/settings', label: 'Settings', icon: Settings, primary: true, group: 'more' },
	{ href: '/help', label: 'Help', icon: CircleHelp, primary: true, group: 'more' }
];

export const isActive = (href: string, pathname: string) =>
	href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

// Tab titles for every route, set in one place (+layout.svelte).
const SECTION_TITLES: Record<string, string> = {
	'/': 'Payslip',
	'/history': 'History',
	'/expenses': 'Expenses',
	'/settings': 'Settings',
	'/help': 'Help',
	'/login': 'Log in',
	'/register': 'Create account'
};

export function titleFor(pathname: string, status: number, hasError: boolean) {
	if (hasError) return `${status === 404 ? 'Not found' : 'Something went wrong'} · Slipside`;
	const section = Object.keys(SECTION_TITLES)
		.filter((path) => isActive(path, pathname))
		.sort((a, b) => b.length - a.length)[0];
	return section ? `${SECTION_TITLES[section]} · Slipside` : 'Slipside';
}
