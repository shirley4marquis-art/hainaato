import Link from "next/link";

export type ActivityEvent = {
  id:string; kind:"payment"|"client"|"milestone";
  client?:string; location?:string; action?:string;
  status?:string; detail?:string;
  vehicle:string; vehicleHref:string;
  occurredMinutesAgo:number; transactionHash:string|null; transactionUrl:string|null; demo:boolean;
};

function TickerItem({event}:{event:ActivityEvent}) {
  if(event.kind==="payment") {
    return <a
      className="ticker-item"
      href={event.transactionUrl??"#"}
      target="_blank"
      rel="noopener noreferrer"
      title="This public blockchain record is an interface sample, not proof of a HainaAuto client payment"
    >
      <span className="ticker-tag ticker-tag-payment">Payment Confirmed</span>
      <b>{event.client}</b> paid via USDT for {event.vehicle}
      {event.transactionHash&&<code>{event.transactionHash.slice(0,8)}…{event.transactionHash.slice(-6)}</code>}
      <small>{event.occurredMinutesAgo}m ago · Sample data</small>
    </a>;
  }
  if(event.kind==="milestone") {
    return <Link className="ticker-item" href={event.vehicleHref}>
      <span className="ticker-tag ticker-tag-milestone">{event.status}</span>
      {event.vehicle} <span className="ticker-detail">{event.detail}</span>
      <small>{event.occurredMinutesAgo}m ago · Sample data</small>
    </Link>;
  }
  return <Link className="ticker-item" href={event.vehicleHref}>
    <span className="ticker-tag ticker-tag-client">Client Activity</span>
    <b>{event.client}</b> from {event.location} {event.action} {event.vehicle}
    <small>{event.occurredMinutesAgo}m ago · Sample data</small>
  </Link>;
}

export function LiveActivityTicker({events}:{events:ActivityEvent[]}) {
  const featured=events.filter((e)=>e.kind==="payment"||e.kind==="milestone");
  if(!featured.length) return null;
  const loop=[...featured,...featured];
  return <div className="header-ticker" aria-label="Live export activity (sample data)">
    <div className="container header-ticker-row">
      <span className="header-ticker-badge"><i/> <span>LIVE EXPORT ACTIVITY</span></span>
      <div className="header-ticker-viewport">
        <div className="header-ticker-track">
          {loop.map((event,i)=><TickerItem key={`${event.id}-${i}`} event={event}/>)}
        </div>
      </div>
    </div>
  </div>;
}
