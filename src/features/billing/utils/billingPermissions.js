import { PERMISSIONS as P } from '../../auth/permissions';

// What the bill panels may show for the logged-in user (true = allowed).
export const FULL_ACCESS = {
    add: true, reduce: true, customize: true, shift: true, print: true, qr: true, clear: true,
    send: true, serve: true, cancel: true, edit: true,
};

export function billingPermissions(can) {
    return {
        add: can(P.BILLING_ADD_ITEMS),
        reduce: can(P.BILLING_REDUCE_ITEMS),
        customize: can(P.BILLING_CUSTOMIZE),
        shift: can(P.BILLING_SHIFT_TABLE),
        print: can(P.BILLING_PRINT),
        qr: can(P.BILLING_SHOW_QR),
        clear: can(P.BILLING_CLEAR),
        send: can(P.TOKENS_SEND),
        serve: can(P.TOKENS_SERVE),
        cancel: can(P.TOKENS_CANCEL),
        edit: can(P.TOKENS_EDIT),
    };
}
