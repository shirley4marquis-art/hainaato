import type {SVGProps} from "react";

export const WHATSAPP_URL="https://wa.me/8615032178759";
export const TELEGRAM_URL="https://t.me/chengcekai";
export const WECHAT_USERNAME="laowaidrivechina";
export const WECHAT_CONTACT_URL="/contact#wechat";

type IconProps=SVGProps<SVGSVGElement>;

export function WhatsAppIcon(props:IconProps){return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path fill="currentColor" d="M12.04 2a9.84 9.84 0 0 0-8.47 14.84L2 22l5.29-1.51A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.14.9.93-3.06-.2-.31a8.14 8.14 0 1 1 6.84 3.78Zm4.46-6.09c-.24-.12-1.45-.71-1.67-.8-.23-.08-.39-.12-.56.13-.16.24-.63.79-.78.95-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21a7.35 7.35 0 0 1-1.36-1.69c-.14-.24-.02-.37.1-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.41.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.65.3-.22.25-.85.84-.85 2.04 0 1.21.88 2.37 1 2.53.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.45-.6 1.65-1.17.2-.59.2-1.09.14-1.19-.06-.1-.22-.16-.46-.28Z"/></svg>}
export function TelegramIcon(props:IconProps){return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path fill="currentColor" d="M21.6 3.2 18.4 20c-.24 1.19-.87 1.48-1.77.92l-4.88-3.6-2.36 2.27c-.26.26-.48.48-.98.48l.35-4.97 9.04-8.17c.39-.35-.09-.55-.61-.2L6.02 13.77l-4.81-1.5c-1.05-.33-1.07-1.05.22-1.55L20.25 3.5c.87-.32 1.63.2 1.35-.3Z"/></svg>}
export function WeChatIcon(props:IconProps){return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path fill="currentColor" d="M9.5 3C4.81 3 1 6.08 1 9.88c0 2.18 1.27 4.12 3.25 5.38l-.8 2.4 2.8-1.4c1 .32 2.09.5 3.25.5h.48a5.75 5.75 0 0 1-.23-1.6c0-3.45 3.24-6.25 7.25-6.25.32 0 .63.02.94.06C17.37 5.59 13.78 3 9.5 3Zm-2.83 4.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5.67 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM23 15.17c0-2.99-2.69-5.42-6-5.42s-6 2.43-6 5.42 2.69 5.41 6 5.41c.82 0 1.6-.15 2.31-.41l2.19 1.08-.62-1.87A5.2 5.2 0 0 0 23 15.17Zm-8-1.34a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Zm4 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"/></svg>}
