import { Injectable } from '@angular/core';
import { CrDetail, CrSummary, ReqUser } from '../models/cr.models';
import { details as fixtureDetails, summaries as fixtureSummaries } from './fixtures';

/**
 * Org-scoped mock API (Promise + timer). Contract for list/detail; supports `latencyMs` / `failNext`.
 * `transition` mutates `detailStore` before `settle`, so `failNext` can reject after a persisted status change.
 */
@Injectable({ providedIn: 'root' })
export class CrApiService {
	private detailStore: Record<string, CrDetail> = JSON.parse(JSON.stringify(fixtureDetails));
	/** Simulated network delay (ms). */
	latencyMs = 0;
	/** One-shot: next `settle` rejects with "Network error", then clears. */
	failNext = false;

	private settle<T>(value: T): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			setTimeout(() => {
				if (this.failNext) {
					this.failNext = false;
					reject(new Error('Network error'));
					return;
				}
				resolve(value);
			}, this.latencyMs);
		});
	}

	private fail<T>(message: string): Promise<T> {
		return new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), this.latencyMs));
	}

	listChangeRequests(user: ReqUser): Promise<CrSummary[]> {
		const rows = fixtureSummaries
			.filter((s) => s.orgCode === user.orgCode)
			.map((s) => {
				const d = this.detailStore[s.id];
				return d
					? { id: d.id, title: d.title, status: d.status, orgCode: d.orgCode, delta: d.delta, currency: d.currency, updatedAt: d.updatedAt }
					: { ...s };
			});
		return this.settle(rows);
	}

	getChangeRequest(user: ReqUser, id: string): Promise<CrDetail> {
		const cr = this.detailStore[id];
		if (!cr || cr.orgCode !== user.orgCode) return this.fail<CrDetail>('Not found');
		return this.settle({ ...cr });
	}

	approve(user: ReqUser, id: string, at: string): Promise<CrDetail> {
		return this.transition(user, id, 'APPROVED', 'APPROVE', at);
	}

	reject(user: ReqUser, id: string, at: string, reason: string): Promise<CrDetail> {
		return this.transition(user, id, 'REJECTED', 'REJECT', at, reason);
	}

	/** Persist status/audit first, then settle (enables post-error reconcile against a committed mock state). */
	private transition(user: ReqUser, id: string, status: CrDetail['status'], action: string, at: string, note?: string): Promise<CrDetail> {
		const cr = this.detailStore[id];
		if (!cr || cr.orgCode !== user.orgCode) return this.fail<CrDetail>('Not found');
		const updated: CrDetail = { ...cr, status, updatedAt: at, audit: [...cr.audit, { action, byUserId: user.id, at, note }] };
		this.detailStore[id] = updated;
		return this.settle({ ...updated });
	}
}
