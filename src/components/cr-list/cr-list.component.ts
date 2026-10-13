import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, CrStatus, CrSummary } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';

/**
 * Change Request LIST page. Loads the caller's CRs and renders loading / loaded / empty / error
 * states, plus a status filter that narrows `visibleRows` (and the rendered table).
 */
@Component({
	selector: 'app-cr-list',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './cr-list.component.html',
})
export class CrListComponent implements OnInit {
	@Output() select = new EventEmitter<string>();

	state: ViewState<CrSummary[]> = idle();
	statusFilter: CrStatus | 'ALL' = 'ALL';
	readonly statuses: (CrStatus | 'ALL')[] = ['ALL', 'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'REJECTED', 'CANCELLED'];

	constructor(private readonly api: CrApiService, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	async load(): Promise<void> {
		this.state = loading();
		try {
			const rows = await this.api.listChangeRequests(this.session.user);
			this.state = { status: rows.length ? 'loaded' : 'empty', data: rows };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	onFilterChange(value: string): void {
		this.statusFilter = value as CrStatus | 'ALL';
	}

	/**
	 * Patch a row from a detail update without reloading or clearing the active status filter.
	 * `visibleRows` recomputes so a row that no longer matches the filter disappears naturally.
	 */
	applyRemoteUpdate(detail: CrDetail): void {
		const rows = this.state.data;
		if (!rows) {
			return;
		}
		const index = rows.findIndex((row) => row.id === detail.id);
		if (index < 0) {
			return;
		}
		const next = rows.slice();
		next[index] = {
			id: detail.id,
			title: detail.title,
			status: detail.status,
			orgCode: detail.orgCode,
			delta: detail.delta,
			currency: detail.currency,
			updatedAt: detail.updatedAt,
		};
		this.state = { status: next.length ? 'loaded' : 'empty', data: next };
	}

	/** Rows to render, after applying the active status filter. */
	get visibleRows(): CrSummary[] {
		const rows = this.state.data ?? [];
		if (this.statusFilter === 'ALL') {
			return rows;
		}
		return rows.filter((row) => row.status === this.statusFilter);
	}
}
