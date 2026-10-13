import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { CrListComponent } from '../components/cr-list/cr-list.component';
import { SessionService } from '../session/session.service';
import { users } from '../api/fixtures';
import { CrDetail } from '../models/cr.models';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('AppComponent', () => {
	async function render(): Promise<ComponentFixture<AppComponent>> {
		TestBed.configureTestingModule({
			imports: [AppComponent],
		});
		await TestBed.compileComponents();
		const fixture = TestBed.createComponent(AppComponent);
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();
		return fixture;
	}

	it('clears the selected CR when switching users so another org cannot see stale detail', async () => {
		const fixture = await render();
		expect(fixture.componentInstance.selectedId).toBe('CR-1');
		expect(fixture.nativeElement.querySelector('app-cr-detail')).not.toBeNull();

		fixture.componentInstance.switchUser('otherOrg');
		fixture.detectChanges();
		expect(fixture.componentInstance.selectedId).toBeNull();
		expect(TestBed.inject(SessionService).user).toEqual(users.otherOrg);
		expect(fixture.nativeElement.querySelector('app-cr-detail')).toBeNull();

		await flush();
		fixture.detectChanges();
		await flush();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('app-cr-list')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('app-cr-detail')).toBeNull();
		expect(fixture.nativeElement.querySelector('.cr-list__row')?.textContent).toContain('CR-9');
	});

	it('forwards detail changed events to the list for status synchronization', async () => {
		const fixture = await render();
		await flush();
		fixture.detectChanges();

		const listCmp = fixture.debugElement.query(By.directive(CrListComponent)).componentInstance as CrListComponent;
		const applySpy = jest.spyOn(listCmp, 'applyRemoteUpdate');

		const detail = {
			id: 'CR-1',
			title: 'Add 1 unit of SKU-A',
			status: 'APPROVED',
			orgCode: 'org-alpha',
			delta: 500,
			currency: 'USD',
			updatedAt: '2026-03-02T12:00:00.000Z',
			agreementId: 'AGR-1',
			baselineLineItems: [],
			proposedLineItems: [],
			baselineTotal: 8000,
			newTotal: 8500,
			audit: [],
		} as CrDetail;

		fixture.componentInstance.onCrChanged(detail);
		expect(applySpy).toHaveBeenCalledWith(detail);

		fixture.detectChanges();
		const row = Array.from(fixture.nativeElement.querySelectorAll('.cr-list__row')).find((el: Element) =>
			el.textContent?.includes('CR-1'),
		) as HTMLElement;
		expect(row.textContent).toContain('APPROVED');
	});
});
