export type TableLink={label:string;url:string;active:boolean};
export type TablePublication={restaurantId:number;tables:TableLink[];updatedAt:string|null;revision:string|null};
export const TABLE_API='/api/tables/';
export function validTableUrl(value:string){try{const u=new URL(value);if(typeof window!=='undefined'&&u.origin===window.location.origin&&['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:')return true;return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.localhost')&&!/^\d+(\.\d+){3}$/.test(u.hostname)&&u.href.length<=2048}catch{return false}}
