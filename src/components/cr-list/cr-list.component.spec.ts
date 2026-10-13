import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrListComponent } from './cr-list.component';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { users } from '../../api/fixtures';
import { ReqUser } from '../../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function setup(user: ReqUser, options?: { failNext?: boolean }): Promise<{
	fixture: ComponentFixture<CrListComponent>;
	api: CrApiService;
}> {
	TestBed.configureTestingModule({
		imports: [CrListComponent],
		providers: [{ provide: SessionService, useValue: { user } }],
	});
	await TestBed.compileComponents();
	const api = TestBed.inject(CrApiService);
	if (options?.failNext) {
		api.failNext = true;
	}
	const fixture = TestBed.createComponent(CrListComponent);
	return { fixture, api };
}

async function render(user: ReqUser, options?: { failNext?: boolean }): Promise<ComponentFixture<CrListComponent>> {
	const { fixture } = await setup(user, options);
	fixture.detectChanges(); // ngOnInit -> load()
	await flush(); // let the mock API resolve
	fixture.detectChanges(); // render the loaded/empty/error state
	return fixture;
}

function setStatusFilter(fixture: ComponentFixture<CrListComponent>, value: string): void {
	const select: HTMLSelectElement = fixture.nativeElement.querySelector('.cr-list__filter');
	select.value = value;
	select.dispatchEvent(new Event('change'));
	fixture.detectChanges();
}

describe('CrListComponent', () => {
	it('renders a row per change request in the user org', async () => {
		const fixture = await render(users.approver);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3); // org-alpha: CR-1, CR-2, CR-3
	});

	it('shows the empty state when the org has no change requests', async () => {
		const fixture = await render({ id: 'x', orgCode: 'org-empty', policies: ['cr_r_o'] });
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__no-matches')).toBeNull();
	});

	it('shows the loading state before the API resolves', async () => {
		const { fixture } = await setup(users.approver);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
		await flush();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).toBeNull();
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	it('shows the error state and recovers after Retry', async () => {
		const fixture = await render(users.approver, { failNext: true });
		expect(fixture.nativeElement.querySelector('.cr-list__error')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__error').textContent).toContain('Network error');
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();

		fixture.nativeElement.querySelector('.cr-list__error button').click();
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('.cr-list__loading')).not.toBeNull();
		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.cr-list__error')).toBeNull();
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	it('narrows visibleRows and the table by status, then restores all for ALL', async () => {
		const fixture = await render(users.approver);

		setStatusFilter(fixture, 'PENDING_APPROVAL');
		expect(fixture.componentInstance.visibleRows.map((r) => r.id)).toEqual(['CR-1']);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(1);
		expect(fixture.nativeElement.querySelector('.cr-list__row').textContent).toContain('CR-1');

		setStatusFilter(fixture, 'ALL');
		expect(fixture.componentInstance.visibleRows.map((r) => r.id)).toEqual(['CR-1', 'CR-2', 'CR-3']);
		expect(fixture.nativeElement.querySelectorAll('.cr-list__row').length).toBe(3);
	});

	it('shows a no-matches message distinct from the empty API state', async () => {
		const fixture = await render(users.approver);

		setStatusFilter(fixture, 'SUBMITTED');
		expect(fixture.componentInstance.visibleRows).toEqual([]);
		expect(fixture.nativeElement.querySelector('.cr-list__no-matches')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__empty')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__table')).toBeNull();
	});

	it('emits select with the CR id when a row is clicked', async () => {
		const fixture = await render(users.approver);
		const emitted: string[] = [];
		fixture.componentInstance.select.subscribe((id) => emitted.push(id));

		fixture.nativeElement.querySelectorAll('.cr-list__row')[1].click();
		expect(emitted).toEqual(['CR-2']);
	});
});
