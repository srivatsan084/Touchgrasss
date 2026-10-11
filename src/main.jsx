import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, ArrowUpRight, Award, Bike, Camera, Check, ChevronDown, Compass, Flag, Footprints, Leaf, MapPin, Menu, MoreHorizontal, Play, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Timer, Trophy, Waves, X } from 'lucide-react';
import './style.css';

const demoActivities = [
  { id: 1, type: 'Hiking', title: 'Rattlesnake Ledge loop', place: 'North Bend, Washington', date: 'Today, 8:42 AM', distance: '6.8', duration: '2h 14m', elevation: '1,240', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=85', initials: 'SC', color: 'sage', xp: 186, confidence: 96, authenticity: 91 },
  { id: 2, type: 'Cycling', title: 'Lake Washington loop', place: 'Seattle, Washington', date: 'Yesterday, 5:16 PM', distance: '18.3', duration: '1h 08m', elevation: '420', image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1000&q=85', initials: 'JM', color: 'pink', xp: 214, confidence: 98, authenticity: 94 },
  { id: 3, type: 'Running', title: 'Discovery Park easy miles', place: 'Seattle, Washington', date: 'Monday, 7:03 AM', distance: '4.2', duration: '38m 42s', elevation: '180', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=85', initials: 'AL', color: 'yellow', xp: 102, confidence: 93, authenticity: 89 }
];
const navItems = [['Field notes', Activity], ['Explore', Compass], ['Leaderboard', Trophy], ['Challenges', Flag]];

function ActivityIcon({ type, size = 16 }) {
  const Icon = type === 'Cycling' ? Bike : type === 'Diving' ? Waves : type === 'Running' ? Activity : Footprints;
  return <Icon size={size} strokeWidth={2.2} />;
}

function RouteMap() {
  const element = useRef(null);
  useEffect(() => {
    if (!element.current) return;
    const map = L.map(element.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView([47.4934, -121.8327], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const route = [[47.4934, -121.8327], [47.4978, -121.8241], [47.5014, -121.8197], [47.5062, -121.8159], [47.5101, -121.8094], [47.5143, -121.8048], [47.5181, -121.7992], [47.5224, -121.7955], [47.5264, -121.7902]];
    L.polyline(route, { color: '#d66148', weight: 5, opacity: .95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    L.circleMarker(route[0], { radius: 7, color: '#183c32', weight: 3, fillColor: '#fffaf0', fillOpacity: 1 }).addTo(map);
    L.circleMarker(route.at(-1), { radius: 7, color: '#183c32', weight: 3, fillColor: '#f1d774', fillOpacity: 1 }).addTo(map);
    return () => map.remove();
  }, []);
  return <div className="route-map" ref={element} aria-label="Map showing a sample hiking route" />;
}

function ProofCard({ activity }) {
  return <article className="proof-card">
    <div className="proof-head"><span className="proof-mark"><Leaf size={16} fill="currentColor" /></span><div><span className="micro-label">TOUCHGRASS / FIELD PROOF</span><h3>Proof of Grass</h3></div><span className="sample-stamp">SAMPLE</span></div>
    <div className="proof-activity"><div className="proof-activity-icon"><ActivityIcon type={activity.type} size={19} /></div><div><strong>{activity.title}</strong><small>{activity.distance} mi · {activity.duration}</small></div><span className="proof-date">OCT 11</span></div>
    <div className="proof-meter-row"><span><Sparkles size={14} /> AI confidence</span><strong>{activity.confidence}%</strong></div><div className="meter"><span style={{ width: `${activity.confidence}%` }} /></div>
    <div className="proof-meter-row authenticity"><span><ShieldCheck size={14} /> Photo authenticity</span><strong>{activity.authenticity}%</strong></div><div className="meter meter-pink"><span style={{ width: `${activity.authenticity}%` }} /></div>
    <div className="proof-bottom"><span><span className="status-dot" /> GPS + EXIF checked</span><strong>+{activity.xp} <small>GRASS XP</small></strong></div>
  </article>;
}

function ActivityCard({ activity, onProof }) {
  return <article className="activity-card">
    <div className="activity-photo" style={{ backgroundImage: `url("${activity.image}")` }}><span className="activity-kind"><ActivityIcon type={activity.type} />{activity.type}</span><button className="photo-more" title="View proof details" onClick={() => onProof(activity)}><MoreHorizontal size={19} /></button></div>
    <div className="activity-body"><div className={`avatar avatar-${activity.color}`}>{activity.initials}</div><div className="activity-copy">
      <div className="activity-title-row"><h3>{activity.title}</h3><span className="demo-chip">DEMO</span></div><p className="activity-location"><MapPin size={13} />{activity.place}<span className="dot-sep">·</span>{activity.date}</p>
      <div className="activity-stats"><span><strong>{activity.distance}</strong><small>mi</small></span><span><strong>{activity.duration}</strong><small>time</small></span><span><strong>{activity.elevation}</strong><small>ft elev.</small></span></div>
      <button className="proof-link" onClick={() => onProof(activity)}><ShieldCheck size={14} /> Proof of Grass <span>·</span> +{activity.xp} XP <ArrowUpRight size={13} /></button>
    </div></div>
  </article>;
}

function RecordDialog({ onClose, onSave }) {
  const [type, setType] = useState('Hiking');
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);
  const duration = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const submit = (event) => {
    event.preventDefault();
    onSave({ id: Date.now(), type, title: title.trim() || `My ${type.toLowerCase()}`, place: 'Seattle, Washington', date: 'Just now', distance: elapsed ? (elapsed / 600).toFixed(1) : '0.0', duration, elevation: '—', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=85', initials: 'SC', color: 'sage', xp: 0, confidence: 0, authenticity: 0, photo });
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="record-dialog" onSubmit={submit}>
    <div className="dialog-top"><div><span className="micro-label">YOUR NEXT OUTSIDE</span><h2>Log some grass.</h2></div><button type="button" className="icon-button light-icon" aria-label="Close" onClick={onClose}><X size={19} /></button></div>
    <label className="field-label">Activity type</label><div className="type-picker">{['Hiking', 'Running', 'Cycling', 'Diving'].map((item) => <button key={item} type="button" className={type === item ? 'type-option selected' : 'type-option'} onClick={() => setType(item)}><ActivityIcon type={item} size={16} />{item}</button>)}</div>
    <label className="field-label" htmlFor="activity-title">Name your adventure</label><input id="activity-title" className="text-input" placeholder="e.g. Sunrise at the summit" value={title} onChange={(event) => setTitle(event.target.value)} />
    <div className="recorder"><div className="recorder-clock"><Timer size={17} /><span>{duration}</span></div><button type="button" className={recording ? 'record-button is-recording' : 'record-button'} onClick={() => setRecording((value) => !value)}>{recording ? <><span className="stop-square" /> Pause</> : <><Play size={14} fill="currentColor" /> Start GPS recording</>}</button></div>
    <label className="upload-zone"><input type="file" accept="image/*" onChange={(event) => setPhoto(Boolean(event.target.files?.[0]))} />{photo ? <><Check size={18} /><span>Photo added for your proof</span></> : <><Camera size={18} /><span>Add a geotagged photo <small>EXIF details will be checked</small></span><Plus size={16} /></>}</label>
    <div className="dialog-note"><ShieldCheck size={15} /> XP is awarded after trusted verification.</div><div className="dialog-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button-primary">Save activity <ArrowUpRight size={15} /></button></div>
  </form></div>;
}

function App() {
  const [activities, setActivities] = useState(demoActivities);
  const [filter, setFilter] = useState('All');
  const [section, setSection] = useState('Field notes');
  const [recordOpen, setRecordOpen] = useState(false);
  const [proofActivity, setProofActivity] = useState(demoActivities[0]);
  const [mobileNav, setMobileNav] = useState(false);
  const filters = ['All', 'Hiking', 'Running', 'Cycling', 'Diving'];
  const visible = filter === 'All' ? activities : activities.filter((activity) => activity.type === filter);
  const saveActivity = (activity) => { setActivities((items) => [activity, ...items]); setProofActivity(activity); setRecordOpen(false); setFilter('All'); };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#home" onClick={() => setSection('Field notes')}><span className="brand-icon"><Leaf size={22} fill="currentColor" /></span><span>touch<span className="brand-grass">grass</span><small>THE OUTSIDE CLUB</small></span></a>
      <div className="sidebar-label">YOUR PATCH</div><nav className="main-nav" aria-label="Main navigation">{navItems.map(([label, Icon]) => <button key={label} className={`nav-item ${section === label ? 'nav-active' : ''}`} onClick={() => { setSection(label); setMobileNav(false); }}><Icon size={18} strokeWidth={2.1} /><span>{label}</span>{label === 'Challenges' && <span className="nav-count">2</span>}</button>)}</nav>
      <div className="sidebar-season"><div className="season-top"><span className="season-leaf"><Leaf size={15} /></span><span>OCTOBER PATCH</span><span className="season-dots">•••</span></div><h3>Keep it<br />growing.</h3><div className="season-track"><span /></div><div className="season-foot"><span>680 / 1,000 XP</span><span>68%</span></div></div>
      <div className="sidebar-bottom"><button className="nav-item subdued"><Compass size={17} /><span>How it works</span></button><button className="nav-item subdued"><Settings size={17} /><span>Settings</span></button><div className="profile-row"><div className="avatar avatar-profile">SC</div><div className="profile-text"><strong>Sam Carter</strong><small>Seattle, WA</small></div><ChevronDown size={16} /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileNav((value) => !value)}><Menu size={20} /></button><div className="breadcrumb"><span>MY PATCH</span><span>/</span><strong>{section.toUpperCase()}</strong></div><div className="topbar-right"><span className="weather"><span className="weather-sun">☼</span> 64° <span className="weather-place">SEATTLE</span></span><button className="icon-button search-button" aria-label="Search"><Search size={18} /></button><div className="avatar avatar-profile top-avatar">SC</div></div></header>
      <div className="page-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> SUNDAY, OCTOBER 11, 2026 <span className="eyebrow-dash">/</span> WEEK 41</div><h1>Field <em>notes.</em></h1><p className="welcome-copy">A little fresh air goes a long way, Sam.</p></div><button className="button-primary log-button" onClick={() => setRecordOpen(true)}><Plus size={17} strokeWidth={2.5} /> Log activity</button></section>
        <section className="stats-strip" aria-label="Your weekly activity">
          <div className="stat-block"><span className="stat-icon stat-icon-green"><Footprints size={17} /></span><div><span className="stat-label">WEEKLY DISTANCE</span><strong>29.3 <small>mi</small></strong><span className="stat-delta"><ArrowUpRight size={12} /> 12% this week</span></div></div>
          <div className="stat-block"><span className="stat-icon stat-icon-pink"><Activity size={17} /></span><div><span className="stat-label">OUTSIDE TIME</span><strong>6h 24<small>m</small></strong><span className="stat-delta"><ArrowUpRight size={12} /> 48 min this week</span></div></div>
          <div className="stat-block"><span className="stat-icon stat-icon-yellow"><Award size={17} /></span><div><span className="stat-label">GRASS XP</span><strong>680 <small>xp</small></strong><span className="stat-delta stat-neutral"><span className="rank-mini">#</span> Rank 08 this week</span></div></div>
          <div className="weekly-mark"><div className="week-ring"><span>4<small>/5</small></span></div><div><strong>Almost a streak!</strong><small>One more day outside</small></div></div>
        </section>
        <div className="section-heading"><div><span className="micro-label">YOUR PEOPLE, OUT THERE</span><h2>Recent activity <span className="heading-count">{activities.length}</span></h2></div><button className="text-button" onClick={() => setSection('Explore')}>Explore the feed <ArrowUpRight size={15} /></button></div>
        <div className="dashboard-grid"><section className="feed-column">
          <div className="filter-row" role="group" aria-label="Filter by activity type">{filters.map((item) => <button key={item} className={`filter-button ${filter === item ? 'filter-active' : ''}`} onClick={() => setFilter(item)}>{item !== 'All' && <ActivityIcon type={item} size={14} />}{item}</button>)}<button className="filter-more" aria-label="More filters"><SlidersHorizontal size={17} /></button></div>
          <div className="activity-list">{visible.length ? visible.map((activity) => <ActivityCard key={activity.id} activity={activity} onProof={setProofActivity} />) : <div className="empty-feed"><Waves size={24} /><strong>No {filter.toLowerCase()} yet.</strong><span>Some days are for wandering into the blue.</span><button className="button-quiet" onClick={() => setFilter('All')}>See all activity</button></div>}</div>
          <button className="load-more" onClick={() => setSection('Explore')}>YOU'RE ALL CAUGHT UP <ArrowUpRight size={15} /></button>
        </section><aside className="right-rail">
          <div className="map-panel"><div className="rail-heading"><div><span className="micro-label">THE DAY'S TRACK</span><h3>Out past the pines</h3></div><button className="icon-button map-expand" aria-label="Expand map"><ArrowUpRight size={16} /></button></div><RouteMap /><div className="map-caption"><span className="map-pin-mini"><MapPin size={14} /></span><span><strong>Rattlesnake Ledge</strong><small>North Bend, WA · Sample route</small></span><span className="map-distance">6.8<small>MI</small></span></div></div>
          <ProofCard activity={proofActivity} />
          <div className="leaderboard-panel"><div className="rail-heading"><div><span className="micro-label">FRIENDS THIS WEEK</span><h3>Patch standings</h3></div><button className="text-button small-link" onClick={() => setSection('Leaderboard')}>All <ArrowUpRight size={13} /></button></div>
            <div className="leader-row"><span className="leader-rank first">01</span><div className="avatar avatar-pink">JM</div><strong>Jordan M.</strong><span className="leader-points">892 <small>XP</small></span></div>
            <div className="leader-row you-row"><span className="leader-rank">02</span><div className="avatar avatar-profile">SC</div><strong>Sam Carter <small>YOU</small></strong><span className="leader-points">680 <small>XP</small></span></div>
            <div className="leader-row"><span className="leader-rank">03</span><div className="avatar avatar-yellow">AL</div><strong>Alex L.</strong><span className="leader-points">624 <small>XP</small></span></div>
          </div>
          <div className="challenge-strip"><span className="challenge-icon"><Flag size={16} /></span><div><small>COMMUNITY CHALLENGE</small><strong>Leave it better</strong><span>12 / 20 trail cleanups</span></div><ArrowUpRight size={16} /></div>
        </aside></div>
        <footer className="page-footer"><span>TOUCHGRASS © 2026</span><span>Made for people who go outside <Leaf size={12} /></span><span className="demo-disclaimer">DEMO DATA · NOT VERIFIED</span></footer>
      </div>
    </main>
    {recordOpen && <RecordDialog onClose={() => setRecordOpen(false)} onSave={saveActivity} />}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);