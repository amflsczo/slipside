// Starter templates (PLAN.md section 5). A template only pre-fills the user's lists;
// everything stays editable and nothing here is used by the calculations.
// `suggested` values pre-select the setup form and can be changed there.

import type { PayLength } from './period.ts';

export type ExtraKind = 'per_day' | 'per_week';

export interface Template {
	id: TemplateId;
	label: string;
	suggested: { currency?: string; dateFormat?: DateFormat; payLength?: PayLength };
	deductions: string[];
	extras: { name: string; kind: ExtraKind; defaultAmount?: string }[];
	otRates: { name: string; multiplier: string }[];
	expenseCategories: string[];
}

export const TEMPLATE_IDS = ['blank', 'uk', 'ph', 'us'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

const commonCategories = [
	'Rent / Housing',
	'Bills & Utilities',
	'Groceries',
	'Eating out',
	'Transport',
	'Phone & Internet',
	'Health',
	'Savings',
	'Other'
];

export const TEMPLATES: Record<TemplateId, Template> = {
	blank: {
		id: 'blank',
		label: 'Blank',
		suggested: {},
		deductions: [],
		extras: [],
		otRates: [],
		expenseCategories: []
	},
	uk: {
		id: 'uk',
		label: 'UK',
		suggested: { currency: 'GBP', dateFormat: 'DD/MM/YYYY', payLength: 'week' },
		deductions: ['Income Tax (PAYE)', 'National Insurance', 'Pension', 'Student Loan'],
		extras: [
			{ name: 'Shift allowance', kind: 'per_day' },
			{ name: 'Weekly bonus', kind: 'per_week' }
		],
		otRates: [
			{ name: 'Overtime', multiplier: '1.5' },
			{ name: 'Double time', multiplier: '2' }
		],
		expenseCategories: commonCategories
	},
	ph: {
		id: 'ph',
		label: 'Philippines',
		suggested: { currency: 'PHP', dateFormat: 'MM/DD/YYYY', payLength: 'week' },
		deductions: ['Withholding Tax', 'SSS', 'PhilHealth', 'Pag-IBIG'],
		extras: [
			{ name: 'Meal allowance', kind: 'per_day' },
			{ name: 'Transport allowance', kind: 'per_day' }
		],
		otRates: [
			{ name: 'Regular OT', multiplier: '1.25' },
			{ name: 'Rest day OT', multiplier: '1.3' },
			{ name: 'Holiday OT', multiplier: '2' }
		],
		expenseCategories: commonCategories
	},
	us: {
		id: 'us',
		label: 'US',
		suggested: { currency: 'USD', dateFormat: 'MM/DD/YYYY', payLength: 'week' },
		deductions: ['Federal Income Tax', 'Social Security', 'Medicare', 'State Income Tax', '401(k)'],
		extras: [
			{ name: 'Shift differential', kind: 'per_day' },
			{ name: 'Weekly bonus', kind: 'per_week' }
		],
		otRates: [
			{ name: 'Overtime', multiplier: '1.5' },
			{ name: 'Double time', multiplier: '2' }
		],
		expenseCategories: commonCategories
	}
};
