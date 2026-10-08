import type { Actions, PageServerLoad } from './$types';
import { forUser, isListKey, type GeneralSettings, type ListFields } from '#lib/server/queries.ts';
import {
	FormError,
	currency,
	int,
	money,
	multiplier,
	oneOf,
	percent,
	runAction,
	text
} from '#lib/server/forms.ts';
import { DATE_FORMATS, TEMPLATE_IDS } from '#lib/templates.ts';

export const load: PageServerLoad = async ({ locals }) => {
	return forUser(locals.user!.id).loadSettingsPage();
};

function generalFields(form: FormData): GeneralSettings {
	return {
		currency: currency(form, 'currency'),
		weekStartDay: int(form, 'weekStartDay', 0, 6),
		dateFormat: oneOf(form, 'dateFormat', DATE_FORMATS),
		usualRate: money(form, 'usualRate', 'usual rate'),
		rateTolerancePct: percent(form, 'rateTolerancePct', 'tolerance')
	};
}

const GONE = 'That item no longer exists. Refresh the page and try again.';

function listKey(form: FormData) {
	const key = form.get('list')?.toString() ?? '';
	if (!isListKey(key)) throw new FormError('Unknown list.');
	return key;
}

function itemId(form: FormData) {
	const id = Number(form.get('id'));
	if (!Number.isInteger(id) || id <= 0) throw new FormError('Unknown item.');
	return id;
}

// Name plus whichever extra fields that list has.
function itemFields(form: FormData, key: string): ListFields {
	const fields: ListFields = { name: text(form, 'name', 'name') };
	if (key === 'extras') {
		fields.kind = oneOf(form, 'kind', ['per_day', 'per_week'] as const);
		fields.defaultAmount = money(form, 'defaultAmount', 'default amount');
	}
	if (key === 'otRates') fields.multiplier = multiplier(form, 'multiplier');
	return fields;
}

export const actions: Actions = {
	setup: async ({ request, locals }) => {
		const form = await request.formData();
		return runAction(async () => {
			const template = oneOf(form, 'template', TEMPLATE_IDS);
			await forUser(locals.user!.id).setup(generalFields(form), template);
		}, 'All set up.');
	},

	general: async ({ request, locals }) => {
		const form = await request.formData();
		return runAction(
			() => forUser(locals.user!.id).updateGeneral(generalFields(form)),
			'Settings saved.'
		);
	},

	applyTemplate: async ({ request, locals }) => {
		const form = await request.formData();
		return runAction(async () => {
			const template = oneOf(form, 'template', TEMPLATE_IDS);
			await forUser(locals.user!.id).applyTemplate(template);
		}, 'Template items added.');
	},

	add: async ({ request, locals }) => {
		const form = await request.formData();
		return runAction(async () => {
			const key = listKey(form);
			await forUser(locals.user!.id).addItem(key, itemFields(form, key));
		}, 'Added.');
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		return runAction(async () => {
			const key = listKey(form);
			const found = await forUser(locals.user!.id).updateItem(
				key,
				itemId(form),
				itemFields(form, key)
			);
			if (!found) throw new FormError(GONE);
		}, 'Saved.');
	},

	toggle: async ({ request, locals }) => {
		const form = await request.formData();
		const active = form.get('active') === 'true';
		return runAction(
			async () => {
				const found = await forUser(locals.user!.id).setActive(listKey(form), itemId(form), active);
				if (!found) throw new FormError(GONE);
			},
			active ? 'Shown.' : 'Hidden.'
		);
	},

	move: async ({ request, locals }) => {
		const form = await request.formData();
		const direction = form.get('direction') === 'up' ? -1 : 1;
		return runAction(
			() => forUser(locals.user!.id).move(listKey(form), itemId(form), direction),
			'Moved.'
		);
	}
};
