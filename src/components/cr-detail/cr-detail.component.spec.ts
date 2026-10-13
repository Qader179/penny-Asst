import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrDetailComponent, requiredTrimmed } from './cr-detail.component';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { CrDetail, ReqUser } from '../../models/cr.models';
import { FormControl } from '@angular/forms';

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

async function settleActions(fixture: ComponentFixture<CrDetailComponent>, rounds = 2): Promise<void> {
	for (let i = 0; i < rounds; i++) {
		await flush();
		fixture.detectChanges();
	}
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

	describe('requiredTrimmed', () => {
		it('rejects empty and whitespace-only values', () => {
			const control = new FormControl('', { nonNullable: true, validators: [requiredTrimmed] });
			expect(control.invalid).toBe(true);
			control.setValue('   ');
			expect(control.invalid).toBe(true);
			control.setValue('Missing SKU');
			expect(control.valid).toBe(true);
		});
	});

	describe('Approve / Reject actions', () => {
		it('blocks Reject until a non-whitespace reason is entered', async () => {
			const fixture = await render(users.approver, 'CR-1');
			const rejectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__reject-btn');
			expect(rejectBtn.disabled).toBe(true);

			fixture.componentInstance.rejectControl.setValue('   ');
			fixture.componentInstance.rejectControl.markAsTouched();
			fixture.detectChanges();
			expect(rejectBtn.disabled).toBe(true);
			expect(fixture.nativeElement.querySelector('.cr-actions__reason-error')).not.toBeNull();

			fixture.componentInstance.rejectControl.setValue('Price mismatch');
			fixture.detectChanges();
			expect(rejectBtn.disabled).toBe(false);
		});

		it('approves a pending CR and updates status, timeline, and success feedback', async () => {
			const fixture = await render(users.approver, 'CR-1');
			const api = TestBed.inject(CrApiService);
			const approveSpy = jest.spyOn(api, 'approve');

			fixture.nativeElement.querySelector('.cr-actions__approve').click();
			await settleActions(fixture);

			expect(approveSpy).toHaveBeenCalledTimes(1);
			expect(fixture.nativeElement.querySelector('.cr-status').textContent).toContain('APPROVED');
			expect(fixture.nativeElement.querySelector('.cr-actions__success').textContent).toContain('approved');
			expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
			expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
			const actions = Array.from(fixture.nativeElement.querySelectorAll('.cr-timeline__action')).map(
				(el: Element) => el.textContent?.trim(),
			);
			expect(actions[actions.length - 1]).toBe('APPROVE');
		});

		it('rejects a pending CR with the trimmed reason and shows it on the timeline', async () => {
			const fixture = await render(users.approver, 'CR-1');
			const api = TestBed.inject(CrApiService);
			const rejectSpy = jest.spyOn(api, 'reject');

			fixture.componentInstance.rejectControl.setValue('  Not acceptable  ');
			fixture.detectChanges();
			fixture.nativeElement.querySelector('.cr-actions__reject-btn').click();
			await settleActions(fixture);

			expect(rejectSpy).toHaveBeenCalledWith(users.approver, 'CR-1', expect.any(String), 'Not acceptable');
			expect(fixture.nativeElement.querySelector('.cr-status').textContent).toContain('REJECTED');
			expect(fixture.nativeElement.querySelector('.cr-actions__success').textContent).toContain('rejected');
			expect(fixture.nativeElement.querySelector('.cr-timeline__note').textContent).toContain('Not acceptable');
			expect(fixture.componentInstance.rejectControl.value).toBe('');
		});

		it('disables actions and ignores duplicate clicks while Approve is in flight', async () => {
			const fixture = await render(users.approver, 'CR-1');
			const api = TestBed.inject(CrApiService);
			const detail = fixture.componentInstance.detail;
			expect(detail).not.toBeNull();
			if (!detail) {
				return;
			}

			let resolveApprove!: (value: CrDetail) => void;
			const deferred = new Promise<CrDetail>((resolve) => {
				resolveApprove = resolve;
			});
			const approveSpy = jest.spyOn(api, 'approve').mockReturnValue(deferred);

			fixture.nativeElement.querySelector('.cr-actions__approve').click();
			fixture.detectChanges();

			const approveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.cr-actions__approve');
			expect(approveBtn.disabled).toBe(true);
			expect(approveBtn.textContent).toContain('Approving');
			expect(fixture.nativeElement.querySelector('.cr-actions__reject-btn').disabled).toBe(true);

			fixture.nativeElement.querySelector('.cr-actions__approve').click();
			fixture.nativeElement.querySelector('.cr-actions__approve').click();
			expect(approveSpy).toHaveBeenCalledTimes(1);

			resolveApprove({ ...detail, status: 'APPROVED', audit: [...detail.audit, { action: 'APPROVE', byUserId: 'mona', at: '2026-03-02T12:00:00.000Z' }] });
			await deferred;
			await settleActions(fixture, 1);
			expect(fixture.nativeElement.querySelector('.cr-status').textContent).toContain('APPROVED');
		});

		it('reconciles after a failed Approve when the mock already persisted the transition', async () => {
			const fixture = await render(users.approver, 'CR-1');
			const api = TestBed.inject(CrApiService);
			api.failNext = true;

			fixture.nativeElement.querySelector('.cr-actions__approve').click();
			// action failure + reconcile getChangeRequest
			await settleActions(fixture, 3);

			expect(fixture.nativeElement.querySelector('.cr-detail__header')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('.cr-actions__error')).not.toBeNull();
			expect(fixture.nativeElement.querySelector('.cr-status').textContent).toContain('APPROVED');
			expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
			expect(fixture.nativeElement.querySelector('.cr-actions__reject')).toBeNull();
			expect(fixture.componentInstance.actionsBlocked).toBe(false);
		});

		it('blocks retries when reconcile also fails after an action error', async () => {
			const fixture = await render(users.approver, 'CR-1');
			const api = TestBed.inject(CrApiService);
			const detail = fixture.componentInstance.detail;
			expect(detail).not.toBeNull();
			if (!detail) {
				return;
			}

			// Reject on a timer, matching CrApiService.settle/failNext. Immediate
			// mockRejectedValue() races Zone's await attach and surfaces as unhandled.
			const rejectAsync = (message: string) =>
				new Promise<CrDetail>((_, reject) => {
					setTimeout(() => reject(new Error(message)), 0);
				});
			jest.spyOn(api, 'approve').mockImplementation(() => rejectAsync('Network error'));
			jest.spyOn(api, 'getChangeRequest').mockImplementation(() => rejectAsync('Network error'));

			fixture.nativeElement.querySelector('.cr-actions__approve').click();
			// approve rejection, then reconcile getChangeRequest rejection
			await settleActions(fixture, 2);

			expect(fixture.nativeElement.querySelector('.cr-actions__error').textContent).toContain('Reload before retrying');
			expect(fixture.componentInstance.actionsBlocked).toBe(true);
			expect(fixture.nativeElement.querySelector('.cr-actions__approve').disabled).toBe(true);
			expect(fixture.nativeElement.querySelector('.cr-actions__reload')).not.toBeNull();
			// Existing loaded view is preserved
			expect(fixture.nativeElement.querySelector('.cr-detail__header h2').textContent).toContain('Add 1 unit of SKU-A');
			expect(fixture.componentInstance.detail?.status).toBe('PENDING_APPROVAL');
		});
	});
});