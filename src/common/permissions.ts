import { CrStatus, ReqUser } from '../models/cr.models';

/** Policy-string helpers. Policies are `cr_{action}_{scope}` (see README). */
export function hasPolicy(user: ReqUser, policy: string): boolean {
	return !!user && user.policies.includes(policy);
}

/** Any approve-scope policy. */
export function canApprovePolicy(user: ReqUser): boolean {
	return ['cr_a_u', 'cr_a_w', 'cr_a_o'].some((p) => hasPolicy(user, p));
}

/**
 * Whether the UI may offer Approve/Reject for the loaded CR.
 *
 * Uses the existing approve-scope policies for both actions (there is no reject-specific policy).
 * Does not interpret `u`/`w` ownership or workspace membership — the models have no owner or
 * workspace fields, so any approve-scope policy is treated as sufficient (same as
 * `canApprovePolicy`). Org scoping remains the API's responsibility.
 */
export function canActOnPendingCr(user: ReqUser, status: CrStatus | undefined): boolean {
	return status === 'PENDING_APPROVAL' && canApprovePolicy(user);
}
