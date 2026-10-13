import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, LineItem, TimelineEntry } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';
import { canActOnPendingCr } from '../../common/permissions';
import { computeDiff, DiffRow } from '../diff.util';
import { formatMoney, formatSignedMoney, lineTotal } from '../../common/money.util';

/** Reject reasons must contain non-whitespace content. */
export function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
	return String(control.value ?? '').trim() ? null : { required: true };
}

/**
 * Change Request DETAIL page: loads a CR and renders the diff/preview, the approval timeline, and
 * permission-aware Approve/Reject actions with validation and safe in-flight / failure handling.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnInit, OnChanges {
	@Input() id!: string;
	/** Emitted when the loaded CR changes due to a successful action or a successful post-failure reconcile. */
	@Output() changed = new EventEmitter<CrDetail>();

	state: ViewState<CrDetail> = idle();
	submitting = false;
	/** Which action is in flight — drives button labels without disabling the reject control. */
	pendingKind: 'approve' | 'reject' | null = null;
	/** Blocks further actions when a failed call could not be reconciled with the server. */
	actionsBlocked = false;
	actionError?: string;
	actionSuccess?: string;
	rejectControl = new FormControl('', { nonNullable: true, validators: [requiredTrimmed] });

	/** Monotonic token so an older load response cannot overwrite a newer selection. */
	private loadSeq = 0;

	constructor(private readonly api: CrApiService, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['id'] && !changes['id'].firstChange) {
			void this.load();
		}
	}

	async load(): Promise<void> {
		const requestedId = this.id;
		const seq = ++this.loadSeq;

		this.state = loading();
		this.submitting = false;
		this.pendingKind = null;
		this.actionError = undefined;
		this.actionSuccess = undefined;
		this.actionsBlocked = false;
		this.rejectControl.reset('');

		try {
			const detail = await this.api.getChangeRequest(this.session.user, requestedId);
			if (!this.isCurrentLoad(seq, requestedId)) {
				return;
			}
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			if (!this.isCurrentLoad(seq, requestedId)) {
				return;
			}
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
		return !this.actionsBlocked && canActOnPendingCr(this.session.user, this.detail?.status);
	}

	/** Reject uses the same gate as Approve — no reject-specific policy exists. */
	get canReject(): boolean {
		return !this.actionsBlocked && canActOnPendingCr(this.session.user, this.detail?.status);
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
		await this.runAction('approve', () => this.api.approve(this.session.user, this.id, new Date().toISOString()));
	}

	async reject(): Promise<void> {
		this.rejectControl.markAsTouched();
		if (this.rejectControl.invalid) {
			return;
		}
		const reason = this.rejectControl.value.trim();
		await this.runAction('reject', () => this.api.reject(this.session.user, this.id, new Date().toISOString(), reason));
	}

	/**
	 * Shared action runner: permission + in-flight guards, coherent success/error UI, and
	 * post-failure reconcile (the mock may persist a transition before rejecting).
	 */
	private async runAction(kind: 'approve' | 'reject', call: () => Promise<CrDetail>): Promise<void> {
		if (this.submitting || !canActOnPendingCr(this.session.user, this.detail?.status) || this.actionsBlocked) {
			return;
		}

		const requestedId = this.id;
		this.submitting = true;
		this.pendingKind = kind;
		this.actionError = undefined;
		this.actionSuccess = undefined;

		try {
			const updated = await call();
			if (requestedId !== this.id) {
				return;
			}
			this.applyDetail(updated, true);
			this.actionSuccess = kind === 'approve' ? 'Change request approved.' : 'Change request rejected.';
			this.rejectControl.reset('');
		} catch (err) {
			if (requestedId !== this.id) {
				return;
			}
			const message = (err as Error).message || 'Request failed';
			await this.reconcileAfterActionFailure(requestedId, message);
		} finally {
			if (requestedId === this.id) {
				this.submitting = false;
				this.pendingKind = null;
			}
		}
	}

	private applyDetail(detail: CrDetail, emitChanged: boolean): void {
		this.state = { status: 'loaded', data: detail };
		if (emitChanged) {
			this.changed.emit(detail);
		}
	}

	/**
	 * After an action error, re-fetch the CR. The mock API writes the transition before
	 * `failNext` rejects, so the local view may be stale until we reconcile.
	 */
	private async reconcileAfterActionFailure(requestedId: string, message: string): Promise<void> {
		try {
			const fresh = await this.api.getChangeRequest(this.session.user, requestedId);
			if (requestedId !== this.id) {
				return;
			}
			// Always emit so the list picks up a server-side transition that failed to confirm.
			this.applyDetail(fresh, true);
			this.actionsBlocked = false;
			if (canActOnPendingCr(this.session.user, fresh.status)) {
				this.actionError = `${message} Status was refreshed; you may retry.`;
			} else {
				// Transition likely already applied server-side — do not offer another action.
				this.actionError = `${message} The change request was updated on the server; actions are now unavailable.`;
				this.rejectControl.reset('');
			}
		} catch {
			if (requestedId !== this.id) {
				return;
			}
			// Keep the existing loaded view, but block retries until the user reloads.
			this.actionsBlocked = true;
			this.actionError = `${message} Could not confirm the latest status. Reload before retrying.`;
		}
	}

	private isCurrentLoad(seq: number, requestedId: string): boolean {
		return seq === this.loadSeq && requestedId === this.id;
	}
}
