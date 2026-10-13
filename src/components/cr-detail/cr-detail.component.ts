import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, LineItem, TimelineEntry } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';
import { canActOnPendingCr } from '../../common/permissions';
import { computeDiff, DiffRow } from '../diff.util';
import { formatMoney, formatSignedMoney, lineTotal } from '../../common/money.util';

/**
 * Change Request DETAIL page: loads a CR and renders the diff/preview, the approval timeline, and
 * permission-aware Approve/Reject actions. Diff/timeline display are complete; Approve/Reject
 * actions and reject validation remain.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnInit {
	@Input() id!: string;

	state: ViewState<CrDetail> = idle();
	submitting = false;
	actionError?: string;
	// TODO: add validation so the form is invalid until a reason is entered.
	rejectControl = new FormControl('', { nonNullable: true });

	constructor(private readonly api: CrApiService, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	async load(): Promise<void> {
		this.state = loading();
		this.actionError = undefined;
		try {
			const detail = await this.api.getChangeRequest(this.session.user, this.id);
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get detail(): CrDetail | null {
		return this.state.data;
	}

	get diff(): DiffRow[] {
		return this.detail ? computeDiff(this.detail.baselineLineItems, this.detail.proposedLineItems) : [];
	}

	/** Approval timeline, oldest-first. Sorts a copy — never mutates the API audit array. */
	get timeline(): TimelineEntry[] {
		const audit = this.detail?.audit ?? [];
		return [...audit].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
	}

	/** Whether the current user may approve the loaded CR (status + approve policy). */
	get canApprove(): boolean {
		return canActOnPendingCr(this.session.user, this.detail?.status);
	}

	/** Reject uses the same gate as Approve — no reject-specific policy exists. */
	get canReject(): boolean {
		return canActOnPendingCr(this.session.user, this.detail?.status);
	}

	fmt(amount: number): string {
		return this.detail ? formatMoney(amount, this.detail.currency) : String(amount);
	}

	fmtSigned(amount: number): string {
		return this.detail ? formatSignedMoney(amount, this.detail.currency) : String(amount);
	}

	itemTotal(item: LineItem): number {
		return lineTotal(item.quantity, item.unitPrice);
	}

	trackBySku(_index: number, row: DiffRow): string {
		return row.sku;
	}

	async approve(): Promise<void> {
		// TODO: perform the approve action through the API and reflect the outcome in the view.
		throw new Error('approve() not implemented');
	}

	async reject(): Promise<void> {
		// TODO: require a valid rejectControl, then perform the reject action through the API and
		//       reflect the outcome in the view.
		throw new Error('reject() not implemented');
	}
}
