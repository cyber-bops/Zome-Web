// The few icons the web app uses, drawn at 24 and coloured by currentColor.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true }

export const HomeIcon = () => <svg {...s}><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /></svg>
export const UserIcon = () => <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
export const InIcon = () => <svg {...s}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
export const OutIcon = () => <svg {...s}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
export const GiftIcon = () => <svg {...s}><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0" /></svg>
export const SparkIcon = () => <svg {...s}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></svg>
export const ClockIcon = () => <svg {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
export const PlusIcon = () => <svg {...s}><path d="M12 5v14M5 12h14" /></svg>
export const ArrowIcon = () => <svg {...s}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
export const CodeIcon = () => <svg {...s}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M20 14v2M14 18v2h2M18 18h2v2" /></svg>
export const ChevIcon = () => <svg {...s}><path d="M7 10l5 5 5-5" /></svg>
export const CheckIcon = () => <svg {...s} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const BackIcon = () => <svg {...s}><path d="M15 6l-6 6 6 6" /></svg>
