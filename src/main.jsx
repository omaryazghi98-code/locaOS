import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, CalendarDays, Car, Check,
  ChevronRight, CircleDollarSign, ClipboardCheck, Clock3, Command, FileText,
  Gauge, History, Inbox, LayoutDashboard, Menu, MessageCircle, MoreHorizontal,
  Search, ShieldCheck, Sparkles, UserRound, Users, Wrench, X,
} from 'lucide-react';
import './styles.css';

const events = [
  { id: 'return', time: '09:42', title: 'Return received', detail: 'Dacia Duster · MA-4821 checked back in', icon: Car },
  { id: 'inspection', time: '10:04', title: 'Inspection completed', detail: 'Minor front-bumper damage recorded', icon: ClipboardCheck },
  { id: 'message', time: '10:18', title: 'Customer message', detail: 'Youssef asked when the deposit will be released', icon: MessageCircle },
  { id: 'contract', time: '08:12', title: 'Contract activated', detail: 'CON-20481 · 5,000 MAD deposit held', icon: FileText },
];

const rentals = [
  { date: '12–16 Aug 2024', vehicle: 'Renault Clio · MA-1932', outcome: 'Returned on time', tag: 'Clean return' },
  { date: '04–08 May 2024', vehicle: 'Dacia Logan · MA-7714', outcome: 'Front bumper noted', tag: 'History match' },
  { date: '19–22 Dec 2023', vehicle: 'Peugeot 208 · MA-3048', outcome: 'Returned on time', tag: 'Clean return' },
];

const queryResponses = {
  'why is this vehicle blocked': {
    title: 'Why MA-4821 is waiting',
    items: [
      ['fact', 'Return inspection is complete.'],
      ['fact', 'Front-bumper damage is unresolved.'],
      ['context', 'The vehicle is waiting for damage review before preparation can proceed.'],
      ['recommendation', 'Review the previous inspection and resolve the assessment.'],
    ],
  },
  'what matters now': {
    title: 'What matters for this return',
    items: [
      ['fact', 'Deposit of 5,000 MAD is still held.'],
      ['context', 'The current bumper note is related to a previous inspection note.'],
      ['recommendation', 'Compare the two inspection records before settlement.'],
    ],
  },
};

function StatusPill({ children, tone = 'neutral' }) { return <span className={`pill ${tone}`}>{children}</span>; }
function TypeLabel({ type }) { return <div className={`type-label ${type}`}><span />{type === 'fact' ? 'CONFIRMED FACT' : type === 'context' ? 'NAVI CONTEXT' : type === 'recommendation' ? 'RECOMMENDATION' : 'ACTION'}</div>; }
function App() {
  const [activeEvent, setActiveEvent] = useState('inspection');
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [actionDone, setActionDone] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const active = events.find((event) => event.id === activeEvent) || events[1];
  const contextTitle = activeEvent === 'message' ? 'Deposit release is the live question' : activeEvent === 'return' ? 'Return is awaiting resolution' : 'Bumper history needs review';
  const response = useMemo(() => queryResult || queryResponses['what matters now'], [queryResult]);

  function runQuery(value) {
    const clean = value.trim().toLowerCase();
    const found = Object.keys(queryResponses).find((key) => clean.includes(key));
    setQueryResult(found ? queryResponses[found] : { title: 'NAVI found the active thread', items: [['fact', 'Return inspection completed today.'], ['context', 'The unresolved bumper note is the only open blocker in this workflow.'], ['recommendation', 'Open inspection history to compare evidence before settlement.']] });
    setQuery('');
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark">L</div><div><strong>locaOS</strong><small>Rental operations</small></div><button className="icon-button close-mobile" onClick={() => setMobileNav(false)}><X size={16} /></button></div>
        <div className="workspace-switch"><span className="agency-dot">AR</span><div><b>Atlas Rent SARL</b><small>Casablanca · Main branch</small></div><ChevronRight size={15} /></div>
        <nav className="nav-list">
          <div className="nav-caption">Workspace</div>
          <a className="nav-item" href="#brief"><LayoutDashboard size={17} />Brief <span className="nav-count">4</span></a>
          <a className="nav-item active" href="#navi"><Sparkles size={17} />NAVI <span className="live-dot" /></a>
          <a className="nav-item" href="#reservations"><CalendarDays size={17} />Reservations</a>
          <a className="nav-item" href="#fleet"><Car size={17} />Fleet <span className="nav-count warning">2</span></a>
          <a className="nav-item" href="#customers"><Users size={17} />Customers</a>
          <div className="nav-caption section-gap">Operations</div>
          <a className="nav-item" href="#inspections"><ClipboardCheck size={17} />Inspections</a>
          <a className="nav-item" href="#contracts"><FileText size={17} />Contracts</a>
          <a className="nav-item" href="#finance"><CircleDollarSign size={17} />Cash & deposits</a>
          <a className="nav-item" href="#maintenance"><Wrench size={17} />Maintenance <span className="nav-count warning">3</span></a>
        </nav>
        <div className="sidebar-bottom"><div className="connection"><span className="connected-dot" />All systems operational</div><div className="user-row"><div className="avatar">OM</div><div><b>Omar Yazghi</b><small>Agency owner</small></div><MoreHorizontal size={17} /></div></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} />}
      <main className="main-panel">
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div className="breadcrumbs"><span>NAVI</span><ChevronRight size={14} /><b>Return review</b></div><div className="top-actions"><button className="command-trigger" onClick={() => document.getElementById('command-input')?.focus()}><Command size={14} /> Ask NAVI <kbd>⌘ K</kbd></button><button className="icon-button"><Bell size={17} /><i /></button></div></header>
        <div className="content-scroll">
          <section className="page-heading"><div><div className="eyebrow"><span className="pulse" />LIVE OPERATIONAL CONTEXT</div><h1>Return review</h1><p>NAVI has assembled the relevant history for the work in front of you.</p></div><div className="date-block"><Clock3 size={15} />Today, 08 Sep 2024<br /><span>Casablanca time</span></div></section>
          <section className="context-strip"><div className="customer-summary"><div className="customer-avatar">YA</div><div><div className="customer-name">Youssef Amrani <StatusPill tone="green">Active rental</StatusPill></div><span className="muted">Customer since Dec 2023 · +212 6 61 48 20 19</span></div></div><div className="summary-cell"><small>RESERVATION</small><b>R-20481</b><span>05 Sep → 08 Sep</span></div><div className="summary-cell"><small>VEHICLE</small><b>Dacia Duster <StatusPill tone="amber">Review</StatusPill></b><span>MA-4821 · INSPECTED</span></div><div className="summary-cell"><small>DEPOSIT</small><b>5,000 MAD</b><span><span className="hold-dot" /> Held · settlement pending</span></div></section>
          <div className="workspace-grid">
            <div className="center-column">
              <section className="panel focus-panel"><div className="panel-header"><div><div className="section-kicker"><Activity size={14} />CURRENT WORKFLOW</div><h2>Return inspection</h2></div><StatusPill tone="amber">Needs review</StatusPill></div><div className="inspection-card"><div className="vehicle-illustration"><Car size={42} strokeWidth={1.2} /><span>MA-4821</span></div><div className="inspection-main"><div className="inspection-title"><div><b>Minor front-bumper damage</b><span>Recorded at return · 10:04 today</span></div><StatusPill tone="red">Unresolved</StatusPill></div><p>Small scrape and paint transfer on the front-right corner. No safety impact recorded.</p><div className="evidence-row"><span><ShieldCheck size={14} />Photo evidence attached</span><span><UserRound size={14} />Inspected by Amine El Fassi</span></div></div></div><button className="related-callout" onClick={() => setShowHistory(true)}><div className="callout-icon"><History size={16} /></div><div><TypeLabel type="context" /><b>Related history found</b><span>A previous inspection also contains a front-bumper note.</span></div><ArrowUpRight size={17} /></button></section>
              <section className="panel"><div className="panel-header"><div><div className="section-kicker"><History size={14} />RELEVANT HISTORY</div><h2>Previous rentals</h2></div><button className="text-button" onClick={() => setShowHistory(true)}>View all history <ArrowUpRight size={14} /></button></div><div className="rental-list">{rentals.map((rental, index) => <button className={`rental-row ${index === 1 ? 'related' : ''}`} key={rental.date} onClick={() => index === 1 && setShowHistory(true)}><div className="rental-date">{rental.date}</div><div className="rental-vehicle"><b>{rental.vehicle}</b><span>{rental.outcome}</span></div><StatusPill tone={index === 1 ? 'amber' : 'green'}>{rental.tag}</StatusPill><ChevronRight size={15} /></button>)}</div></section>
              <section className="panel timeline-panel"><div className="panel-header"><div><div className="section-kicker"><Activity size={14} />OPERATIONAL EVENTS</div><h2>Rental timeline</h2></div><span className="muted">All times Casablanca</span></div><div className="timeline">{events.map((event) => { const Icon = event.icon; return <button className={`timeline-event ${activeEvent === event.id ? 'selected' : ''}`} key={event.id} onClick={() => { setActiveEvent(event.id); setQueryResult(null); }}><div className="event-time">{event.time}</div><div className="event-marker"><Icon size={14} /></div><div className="event-copy"><b>{event.title}</b><span>{event.detail}</span></div>{activeEvent === event.id && <span className="selected-label">Selected</span>}</button> })}</div></section>
            </div>
            <aside className="navi-column" id="navi"><div className="navi-header"><div className="navi-orb"><Sparkles size={19} /></div><div><b>NAVI</b><span>Contextual intelligence</span></div><StatusPill tone="teal">Read-only</StatusPill></div><div className="navi-query"><Search size={16} /><input id="command-input" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runQuery(query)} placeholder="Ask about this operation…" /><kbd>⌘K</kbd></div><div className="navi-body"><div className="navi-focus"><div className="focus-line"><span className="pulse" /><span>FOCUS RIGHT NOW</span></div><h3>{queryResult ? response.title : contextTitle}</h3><p>{activeEvent === 'message' ? 'Youssef is waiting for a clear answer about his held deposit.' : 'The return is complete, but the vehicle cannot move to preparation until the damage record is reviewed.'}</p></div><div className="navi-section"><div className="navi-section-title"><span>CONTEXT</span><span className="section-count">{response.items.filter((item) => item[0] === 'fact' || item[0] === 'context').length}</span></div>{response.items.filter((item) => item[0] === 'fact' || item[0] === 'context').map((item, i) => <div className="insight-item" key={i}><TypeLabel type={item[0]} /><p>{item[1]}</p></div>)}</div><div className="navi-section"><div className="navi-section-title"><span>WHY THIS MATTERS</span></div><div className="why-card"><div className="relationship-line"><span className="node current">Now</span><span className="line" /><span className="node past">May</span></div><p><b>{activeEvent === 'message' ? 'Deposit settlement is connected to the unresolved damage review.' : 'This may be a recurring bumper issue.'}</b> The current note and the May inspection point to the same vehicle zone. Compare evidence before deciding whether it is new damage.</p></div></div><div className="navi-section"><div className="navi-section-title"><span>RECOMMENDED</span></div>{response.items.filter((item) => item[0] === 'recommendation').map((item, i) => <div className="recommendation" key={i}><TypeLabel type="recommendation" /><p>{item[1]}</p></div>)}</div><div className="navi-section actions-section"><div className="navi-section-title"><span>ACTIONS</span><span className="human-note"><ShieldCheck size={12} /> Human approval</span></div><button className={`action-button ${actionDone ? 'done' : ''}`} onClick={() => { setActionDone(true); setShowHistory(true); }}><div className="action-icon">{actionDone ? <Check size={16} /> : <History size={16} />}</div><span><b>{actionDone ? 'Inspection history opened' : 'Review inspection history'}</b><small>{actionDone ? 'No operational record changed' : 'Compare previous evidence before settlement'}</small></span><ArrowUpRight size={15} /></button><button className="secondary-action" onClick={() => setQuery('Why is this vehicle blocked')}><MessageCircle size={15} /> Ask NAVI about this return</button></div></div><div className="navi-footer"><ShieldCheck size={13} /> NAVI uses operational records · No autonomous changes</div></aside>
          </div>
        </div>
      </main>
      {showHistory && <div className="modal-backdrop" onClick={() => setShowHistory(false)}><div className="history-modal" onClick={(e) => e.stopPropagation()}><div className="modal-top"><div><div className="section-kicker"><History size={14} />CONTEXTUAL DETAIL</div><h2>Front-bumper inspection history</h2><p>Evidence connected to Youssef Amrani · Dacia Duster MA-4821</p></div><button className="icon-button" onClick={() => setShowHistory(false)}><X size={18} /></button></div><div className="comparison"><div><span className="comparison-date">08 Sep 2024 · RETURN</span><b>Minor scrape, front-right corner</b><p>Paint transfer noted. Photo evidence attached. Awaiting assessment.</p></div><div className="comparison-arrow"><ChevronRight size={18} /></div><div><span className="comparison-date">08 May 2024 · RETURN</span><b>Front bumper note</b><p>Light scuff recorded on the same zone. No charge applied.</p></div></div><div className="modal-status"><TypeLabel type="context" /><p>Both records refer to the same vehicle zone. This is a relationship for the operator to verify, not a decision by NAVI.</p></div><button className="primary-button" onClick={() => setShowHistory(false)}>Close review</button></div></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
