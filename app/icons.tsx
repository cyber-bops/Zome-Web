// The few icons the web app uses, drawn at 24 and coloured by currentColor.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true }

export const PlusIcon = () => <svg {...s}><path d="M12 5v14M5 12h14" /></svg>
export const ArrowIcon = () => <svg {...s}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
export const PayIcon = () => <svg {...s}><path d="M7 17L17 7M9 7h8v8" /></svg>
export const CodeIcon = () => <svg {...s}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M20 14v2M14 18v2h2M18 18h2v2" /></svg>
export const CheckIcon = () => <svg {...s} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const CrossIcon = () => <svg {...s}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const ScissorsIcon = () => <svg {...s} strokeWidth={1.8}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></svg>
