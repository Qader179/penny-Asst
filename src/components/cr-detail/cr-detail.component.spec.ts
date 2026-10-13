import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent } from './cr-detail.component';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function render(user: ReqUser, id: string): Promise<ComponentFixture<CrDetailComponent>> {
	TestBed.configureTestingModule({
		imports: [CrDetailComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const fixture = TestBed.createComponent(CrDetailComponent);
	fixture.componentInstance.id = id;
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded state
	return fixture;
}

describe('CrDetailComponent', () => {
	it('loads and renders the change request title', async () => {
		const fixture = await render(users.approver, 'CR-1');
		expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
	});

	it('disables Approve for a read-only viewer on a pending CR', async () => {
		const fixture = await render(users.viewer, 'CR-1'); // viewer: cr_r_o only; CR-1 is PENDING_APPROVAL
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
	});

	it('keeps Approve rendered but disabled and hides Reject for a read-only viewer', async () => {
		const fixture = await render(users.viewer, 'CR-1');
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn).not.toBeNull();
		expect(approveBtn.disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('enables Approve for an approver on a pending CR', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(false);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).not.toBeNull();
	});

	it('disables Approve and hides Reject when the CR is not pending approval', async () => {
		const fixture = await render(users.approver, 'CR-2'); // APPLIED
		const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
		expect(approveBtn.disabled).toBe(true);
		expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
	});

	it('renders changed and unchanged diff rows with before/after details for CR-1', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const changed: HTMLElement = fixture.nativeElement.querySelector('.cr-diff__row[data-sku="SKU-A"]');
		const unchanged: HTMLElement = fixture.nativeElement.querySelector('.cr-diff__row[data-sku="SKU-B"]');

		expect(changed.getAttribute('data-kind')).toBe('changed');
		expect(changed.querySelector('.cr-diff__kind').textContent).toContain('changed');
		expect(changed.textContent).toContain('Widget A');
		expect(changed.textContent).toContain('10 ×');
		expect(changed.textContent).toContain('11 ×');
		expect(changed.textContent).toContain('USD 5,000.00');
		expect(changed.textContent).toContain('USD 5,500.00');

		expect(unchanged.getAttribute('data-kind')).toBe('unchanged');
		expect(unchanged.textContent).toContain('Widget B');
		expect(unchanged.textContent).toContain('30 ×');
	});

	it('shows description-only changes in the diff panel for CR-2', async () => {
		const fixture = await render(users.approver, 'CR-2');
		const row: HTMLElement = fixture.nativeElement.querySelector('.cr-diff__row[data-sku="SKU-B"]');

		expect(row.getAttribute('data-kind')).toBe('changed');
		expect(row.textContent).toContain('Widget B');
		expect(row.textContent).toContain('Widget B (new supplier)');
	});

	it('renders footer totals and a signed delta from the API values', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const header = fixture.nativeElement.querySelector('.cr-detail__totals').textContent;
		const baseline = fixture.nativeElement.querySelector('.cr-diff__baseline-total').textContent;
		const proposed = fixture.nativeElement.querySelector('.cr-diff__proposed-total').textContent;
		const delta = fixture.nativeElement.querySelector('.cr-diff__delta-value').textContent;

		expect(header).toContain('USD 8,000.00');
		expect(header).toContain('USD 8,500.00');
		expect(header).toContain('+USD 500.00');
		expect(baseline).toContain('USD 8,000.00');
		expect(proposed).toContain('USD 8,500.00');
		expect(delta).toContain('+USD 500.00');
	});

	it('renders the timeline oldest-first without mutating the API audit array', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const actions = Array.from(fixture.nativeElement.querySelectorAll('.cr-timeline__action')).map(
			(el: Element) => el.textContent?.trim(),
		);
		expect(actions).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);

		const detail = fixture.componentInstance.detail;
		expect(detail).not.toBeNull();
		if (!detail) {
			return;
		}
		expect(detail.audit.map((e) => e.action)).toEqual(['SEND_FOR_APPROVAL', 'SUBMIT', 'CREATE']);
		expect(fixture.componentInstance.timeline.map((e) => e.action)).toEqual(['CREATE', 'SUBMIT', 'SEND_FOR_APPROVAL']);
	});

	it('shows empty messages when there are no line items or timeline entries', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const detail = fixture.componentInstance.detail;
		expect(detail).not.toBeNull();
		if (!detail) {
			return;
		}
		fixture.componentInstance.state = {
			status: 'loaded',
			data: {
				...detail,
				baselineLineItems: [],
				proposedLineItems: [],
				baselineTotal: 0,
				newTotal: 0,
				delta: 0,
				audit: [],
			},
		};
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-diff__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-diff__table')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-timeline__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-timeline__list')).toBeNull();
	});

	it('renders added and removed sides with an em dash for the missing line item', async () => {
		const fixture = await render(users.approver, 'CR-1');
		const detail = fixture.componentInstance.detail;
		expect(detail).not.toBeNull();
		if (!detail) {
			return;
		}
		fixture.componentInstance.state = {
			status: 'loaded',
			data: {
				...detail,
				baselineLineItems: [{ sku: 'SKU-OLD', description: 'Retired', quantity: 2, unitPrice: 50 }],
				proposedLineItems: [{ sku: 'SKU-NEW', description: 'New item', quantity: 1, unitPrice: 75 }],
				baselineTotal: 100,
				newTotal: 75,
				delta: -25,
			},
		};
		fixture.detectChanges();

		const removed: HTMLElement = fixture.nativeElement.querySelector('.cr-diff__row[data-sku="SKU-OLD"]');
		const added: HTMLElement = fixture.nativeElement.querySelector('.cr-diff__row[data-sku="SKU-NEW"]');
		expect(removed.getAttribute('data-kind')).toBe('removed');
		expect(removed.textContent).toContain('Retired');
		expect(removed.textContent).toContain('—');
		expect(added.getAttribute('data-kind')).toBe('added');
		expect(added.textContent).toContain('New item');
		expect(added.textContent).toContain('—');
		expect(fixture.nativeElement.querySelector('.cr-diff__delta-value').textContent).toContain('USD -25.00');
	});
});
