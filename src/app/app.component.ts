import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrListComponent } from '../components/cr-list/cr-list.component';
import { CrDetailComponent } from '../components/cr-detail/cr-detail.component';
import { SessionService } from '../session/session.service';
import { users } from '../api/fixtures';
import { CrDetail } from '../models/cr.models';

/**
 * Demo shell: owns selection, remounts panes on user switch, and forwards detail `changed`
 * into the list so row status stays in sync without a full list reload.
 */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, CrListComponent, CrDetailComponent],
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],
})
export class AppComponent {
	readonly users = users;
	readonly userKeys = Object.keys(users);
	selectedId: string | null = 'CR-1';
	/** Toggled false→true to remount list/detail after a session user change. */
	show = true;

	@ViewChild(CrListComponent) private list?: CrListComponent;

	constructor(public readonly session: SessionService) {}

	switchUser(key: string): void {
		this.session.user = users[key];
		// Clear selection so another org cannot keep viewing a prior CR detail.
		this.selectedId = null;
		this.reload();
	}

	onSelect(id: string): void {
		this.selectedId = id;
	}

	/** Detail → list sync after approve/reject or successful post-failure reconcile. */
	onCrChanged(detail: CrDetail): void {
		this.list?.applyRemoteUpdate(detail);
	}

	/** Remount panes so both reload under the new SessionService.user. */
	private reload(): void {
		this.show = false;
		setTimeout(() => (this.show = true));
	}
}
