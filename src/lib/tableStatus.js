import { analyzeBill, countPendingServe } from './kitchen';

/* Kitchen progress of one table, for the three status dots on its box in the Tables tab.

   'red'    something on the bill has NOT been sent to the kitchen yet (new / extra items)
   'orange' everything is sent, but some of it is still waiting to be served
   'green'  everything on the bill has been sent AND served
   null     no active order (all dots grey)

   Priority is exactly in this order, so adding a new item to a fully served table
   turns it red again, and so on. A cleared bill is an empty bill -> null.            */
export function getTableStatus(bill, tableTokens, kitchenOf) {
    if (!bill || bill.length === 0) return null;
    if (analyzeBill(bill, tableTokens, kitchenOf).count > 0) return 'red';
    if (countPendingServe(tableTokens) > 0) return 'orange';
    const hasServedFood = tableTokens.some(
        tk => tk.status === 'active' && (tk.items || []).some(i => !i.removed && i.served)
    );
    return hasServedFood ? 'green' : null;
}
