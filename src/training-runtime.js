export function restSeconds(preferences={}){
 const raw=preferences.restSeconds;if(raw==null)return 120;
 const n=Number(raw);return Number.isInteger(n)&&n>=0&&n<=1800?n:120;
}
export function remainingSeconds(deadline,now=Date.now()){return Math.max(0,Math.ceil((Number(deadline||0)-now)/1000))}
export function readTimer(storage,key,now=Date.now()){
 try{const timer=JSON.parse(storage.getItem(key));if(timer&&Number.isFinite(timer.deadline)&&Number.isInteger(timer.duration)&&timer.duration>0&&timer.duration<=1800&&timer.deadline<=now+1800000)return timer}catch{}
 return {deadline:0,duration:0};
}
export function timeLabel(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
