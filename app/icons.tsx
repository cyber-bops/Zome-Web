// The few icons the web app uses, drawn at 24 and coloured by currentColor.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true }

export const PlusIcon = () => <svg {...s}><path d="M12 5v14M5 12h14" /></svg>
export const ArrowIcon = () => <svg {...s}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
export const PayIcon = () => <svg {...s}><path d="M7 17L17 7M9 7h8v8" /></svg>
export const CodeIcon = () => <svg {...s}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M20 14v2M14 18v2h2M18 18h2v2" /></svg>
export const CheckIcon = () => <svg {...s} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const CrossIcon = () => <svg {...s}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const ScissorsIcon = () => <svg {...s} strokeWidth={1.8}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></svg>

// Tile icons: a lighter stroke, set in small white squares (the soft-tile look).
const t = { ...s, strokeWidth: 1.8 }
export const ReceiptIcon = () => <svg {...t}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9.5 8h5M9.5 12h5M9.5 16h2.5" /></svg>
export const HeartIcon = () => <svg {...t}><path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" /></svg>
export const QrIcon = () => <svg {...t}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><path d="M13.5 13.5h3v3M20.5 13.5v.01M13.5 20.5h.01M17 20.5h3.5V17" /></svg>
export const EyeIcon = () => <svg {...s}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
export const ChevronIcon = () => <svg {...s} strokeWidth={2.6}><path d="M9 6l6 6-6 6" /></svg>
export const ShareIcon = () => <svg {...s}><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
export const MoreIcon = () => <svg {...s} strokeWidth={2.6}><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
export const ShieldIcon = () => <svg {...t}><path d="M12 3.5 19.5 6v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" /><path d="M9 12l2 2 4-4" /></svg>
export const LinkIcon = () => <svg {...t}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
