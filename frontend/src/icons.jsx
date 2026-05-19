const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const Icon = ({ children, size = 24, style, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={style} className={className} aria-hidden="true">{children}</svg>
)

// ── Topic icons ────────────────────────────────────────────────────────────
export const IcPhishing = (p) => (<Icon {...p}><path d="M5 14c0-3.3 2.7-6 6-6h2a4 4 0 1 1 0 8h-1" {...S}/><path d="M9 18l-3 2.5 1-3.2-2.5-2.2 3.2-.3L9 12l1.3 2.8 3.2.3-2.5 2.2 1 3.2L9 18z" fill="currentColor" stroke="none"/><circle cx="17" cy="8" r="1.2" fill="currentColor"/></Icon>)
export const IcLock = (p) => (<Icon {...p}><rect x="4.5" y="10" width="15" height="10" rx="3" {...S}/><path d="M8 10V7a4 4 0 1 1 8 0v3" {...S}/><circle cx="12" cy="15" r="1.4" fill="currentColor"/><path d="M12 16v2" {...S}/></Icon>)
export const IcIDCard = (p) => (<Icon {...p}><rect x="3" y="5.5" width="18" height="13" rx="3" {...S}/><circle cx="9" cy="11.5" r="2" {...S}/><path d="M6 16c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" {...S}/><path d="M14 10h5M14 13h4M14 16h3" {...S}/></Icon>)
export const IcShieldChat = (p) => (<Icon {...p}><path d="M12 3l7 2v6c0 4.5-3 8-7 10-4-2-7-5.5-7-10V5l7-2z" {...S}/><path d="M9 11.5h6M9 13.5h4" {...S}/></Icon>)
export const IcLink = (p) => (<Icon {...p}><path d="M10 14a4 4 0 0 1 0-5.7l2.1-2.1a4 4 0 0 1 5.7 5.7L16 13.7" {...S}/><path d="M14 10a4 4 0 0 1 0 5.7l-2.1 2.1a4 4 0 0 1-5.7-5.7L8 10.3" {...S}/></Icon>)
export const IcPeople = (p) => (<Icon {...p}><circle cx="9" cy="9" r="3" {...S}/><circle cx="17" cy="10" r="2.2" {...S}/><path d="M3 18c.5-2.8 3-4.5 6-4.5s5.5 1.7 6 4.5" {...S}/><path d="M15 14.5c2.2.2 4 1.7 4.5 3.5" {...S}/></Icon>)
export const IcDevice = (p) => (<Icon {...p}><rect x="3" y="5" width="14" height="10" rx="2" {...S}/><path d="M3 13h14" {...S}/><rect x="14" y="9" width="7" height="11" rx="2" {...S}/><circle cx="17.5" cy="17.5" r=".7" fill="currentColor"/></Icon>)
export const IcGame = (p) => (<Icon {...p}><path d="M7 9h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14.5 15H9.5l-1.1 1.8A3 3 0 0 1 3 15v-2a4 4 0 0 1 4-4z" {...S}/><path d="M8 12v2M7 13h2" {...S}/><circle cx="16" cy="12.5" r=".9" fill="currentColor"/><circle cx="17.5" cy="14" r=".9" fill="currentColor"/></Icon>)

// ── UI / nav icons ─────────────────────────────────────────────────────────
export const IcHome     = (p) => (<Icon {...p}><path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6h-6v6H6a2 2 0 0 1-2-2v-8z" {...S}/></Icon>)
export const IcMap      = (p) => (<Icon {...p}><path d="M9 5v14M15 5v14M3 8l6-3 6 3 6-3v14l-6 3-6-3-6 3V8z" {...S}/></Icon>)
export const IcTrophy   = (p) => (<Icon {...p}><path d="M8 4h8v4a4 4 0 0 1-8 0V4z" {...S}/><path d="M16 5h3v2a3 3 0 0 1-3 3M8 5H5v2a3 3 0 0 0 3 3" {...S}/><path d="M10 14h4l-.5 3h-3L10 14zM8 20h8" {...S}/></Icon>)
export const IcUser     = (p) => (<Icon {...p}><circle cx="12" cy="9" r="3.5" {...S}/><path d="M5 20c.7-3.4 3.8-5.5 7-5.5s6.3 2.1 7 5.5" {...S}/></Icon>)
export const IcBell     = (p) => (<Icon {...p}><path d="M6 17h12l-1.5-2V11a4.5 4.5 0 0 0-9 0v4L6 17z" {...S}/><path d="M10 20a2 2 0 0 0 4 0" {...S}/></Icon>)
export const IcSettings = (p) => (<Icon {...p}><circle cx="12" cy="12" r="2.5" {...S}/><path d="M19.4 14a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...S}/></Icon>)
export const IcArrow    = (p) => (<Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" {...S}/></Icon>)
export const IcArrowL   = (p) => (<Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" {...S}/></Icon>)
export const IcChevron  = (p) => (<Icon {...p}><path d="M9 6l6 6-6 6" {...S}/></Icon>)
export const IcPlay     = (p) => (<Icon {...p}><path d="M8 5l11 7-11 7V5z" fill="currentColor" stroke="none"/></Icon>)
export const IcCheck    = (p) => (<Icon {...p}><path d="M5 12l5 5L20 7" {...S}/></Icon>)
export const IcX        = (p) => (<Icon {...p}><path d="M6 6l12 12M18 6L6 18" {...S}/></Icon>)
export const IcClock    = (p) => (<Icon {...p}><circle cx="12" cy="12" r="8" {...S}/><path d="M12 8v4l3 2" {...S}/></Icon>)
export const IcSpark    = (p) => (<Icon {...p}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" {...S}/></Icon>)
export const IcStar     = (p) => (<Icon {...p}><path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 19l.9-5.4-3.9-3.8 5.4-.8L12 4z" fill="currentColor" stroke="none"/></Icon>)
export const IcFire     = (p) => (<Icon {...p}><path d="M12 3s-1 3-3 5-3 4-3 6a6 6 0 0 0 12 0c0-2-1-3-2-4-1-1 0-3-1-4-1-1-2-2-3-3z" {...S}/><path d="M12 13c-1 1-2 2-2 4a2 2 0 1 0 4 0c0-1-1-2-2-4z" fill="currentColor" stroke="none" opacity=".7"/></Icon>)
export const IcBolt     = (p) => (<Icon {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" {...S}/></Icon>)
export const IcHeart    = (p) => (<Icon {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" {...S}/></Icon>)
export const IcMedal    = (p) => (<Icon {...p}><circle cx="12" cy="14" r="6" {...S}/><path d="M8 4l2 5M16 4l-2 5" {...S}/><path d="M12 11l1 2 2 .3-1.5 1.5.4 2.2L12 16l-1.9 1 .4-2.2L9 13.3l2-.3 1-2z" fill="currentColor" stroke="none"/></Icon>)
export const IcShield   = (p) => (<Icon {...p}><path d="M12 3l7 2v6c0 4.5-3 8-7 10-4-2-7-5.5-7-10V5l7-2z" {...S}/><path d="M9 12l2 2 4-4" {...S}/></Icon>)
export const IcKey      = (p) => (<Icon {...p}><circle cx="8" cy="15" r="4" {...S}/><path d="M11 13l9-9M16 7l3 3" {...S}/></Icon>)
export const IcEye      = (p) => (<Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...S}/><circle cx="12" cy="12" r="3" {...S}/></Icon>)
export const IcWifi     = (p) => (<Icon {...p}><path d="M3 10a14 14 0 0 1 18 0M6 13a10 10 0 0 1 12 0M9 16a6 6 0 0 1 6 0" {...S}/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></Icon>)
export const IcBattery  = (p) => (<Icon {...p}><rect x="2" y="8" width="18" height="8" rx="2" fill="currentColor"/><rect x="20" y="11" width="2" height="2" rx=".5" fill="currentColor"/></Icon>)
export const IcPlus     = (p) => (<Icon {...p}><path d="M12 5v14M5 12h14" {...S}/></Icon>)
export const IcCopy     = (p) => (<Icon {...p}><rect x="8" y="8" width="11" height="12" rx="2" {...S}/><path d="M5 16V6a2 2 0 0 1 2-2h9" {...S}/></Icon>)
export const IcQR       = (p) => (<Icon {...p}><rect x="3" y="3" width="6" height="6" rx="1" {...S}/><rect x="15" y="3" width="6" height="6" rx="1" {...S}/><rect x="3" y="15" width="6" height="6" rx="1" {...S}/><path d="M13 13h2v2M19 13v3M13 17v4M15 19h2v2M19 19h2" {...S}/></Icon>)
export const IcMail     = (p) => (<Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" {...S}/><path d="M3 7l9 6 9-6" {...S}/></Icon>)

// ── Topic registry ─────────────────────────────────────────────────────────
export const TOPIC_ICONS = {
  phishing:       IcPhishing,
  'personal-data':IcIDCard,
  cyberbullying:  IcShieldChat,
  passwords:      IcLock,
  viruses:        IcBolt,
  'safe-sites':   IcEye,
  scams:          IcSpark,
  privacy:        IcLock,
  // fallback
  fish:           IcPhishing,
  key:            IcKey,
  shield:         IcShield,
  heart:          IcHeart,
  bolt:           IcBolt,
  eye:            IcEye,
  spark:          IcSpark,
  lock:           IcLock,
  medal:          IcMedal,
  star:           IcStar,
  fire:           IcFire,
}
