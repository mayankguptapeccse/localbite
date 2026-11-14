export function quantity(value:unknown,max=9999){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(0,Math.floor(n))):0}
export function additionalPlates(capacity:number,stocks:number[]){return Math.min(quantity(capacity),stocks.reduce((s,n)=>s+quantity(n),0))}
export function recordPlate(capacity:number,stock:number){if(quantity(capacity)===0||quantity(stock)===0)return null;return {capacity:quantity(capacity)-1,stock:quantity(stock)-1}}
export const contentTypes=['Dish spotlight','Restaurant review','Sponsored PR'] as const;
export type ContentType=typeof contentTypes[number];
export type Status='Pending review'|'Approved'|'Changes requested'|'Rejected'|'Paused';
export function approvalIssue(creatorActive:boolean,allowed:string[],category:string,disclosed:boolean){if(!creatorActive)return 'This creator is paused. Reactivate the demo account before approval.';if(!allowed.includes(category))return 'This content type is not allowed for the creator. Update the guidelines or content category.';if(category==='Sponsored PR'&&!disclosed)return 'Sponsored content must disclose the partnership before approval.';return ''}
