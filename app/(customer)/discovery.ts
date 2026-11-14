export function distanceKm(a:number,b:number,c:number,d:number){const rad=(v:number)=>v*Math.PI/180;const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
export function validZomato(url?:string){try{const u=new URL(url||'');return u.protocol==='https:'&&(u.hostname==='zomato.com'||u.hostname==='www.zomato.com')?u.href:''}catch{return ''}}
export function matchesDiet(dishes:{veg:boolean|null}[],diet:string){return diet==='All'||dishes.some(d=>diet==='Veg'?d.veg===true:d.veg===false)}
export function withinDeliveryEstimate(minutes:number|undefined,limit:number){return limit===0||(minutes!==undefined&&Number.isFinite(minutes)&&minutes>0&&minutes<limit)}
