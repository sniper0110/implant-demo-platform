import type { EmbedLayout } from './messages';
import { FULL_MIN_HEIGHT, SECTION_MIN_HEIGHT } from './messages';

export function getContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-pycad-embed]'));
}

export function readLayout(element: HTMLElement): EmbedLayout {
  const raw = element.dataset.layout?.trim().toLowerCase();
  return raw === 'full' ? 'full' : 'section';
}

export function readEmbedId(element: HTMLElement): string | null {
  const id = element.dataset.pycadEmbed?.trim();
  return id || null;
}

export function resolveEmbedBaseUrl(script: HTMLScriptElement | null): string {
  if (script?.src) {
    const url = new URL(script.src);
    return `${url.protocol}//${url.host}`;
  }
  return window.location.origin;
}

export function applyContainerStyles(element: HTMLElement, layout: EmbedLayout) {
  const minHeightPx = layout === 'full' ? `${FULL_MIN_HEIGHT}px` : `${SECTION_MIN_HEIGHT}px`;
  element.style.position = element.style.position || 'relative';
  element.style.width = element.style.width || '100%';
  element.style.minHeight = minHeightPx;
  element.style.height = element.style.height || minHeightPx;
  element.style.display = element.style.display || 'block';
  element.style.overflow = 'hidden';
}

export function createPlaceholder(_layout: EmbedLayout): HTMLDivElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'pycad-embed-placeholder';
  placeholder.setAttribute('role', 'status');
  placeholder.setAttribute('aria-live', 'polite');
  placeholder.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:1',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'width:100%',
    'height:100%',
    'min-height:inherit',
    'background:#0a0b0d',
    'color:#9aa3b2',
    'font:500 14px/1.4 system-ui,sans-serif',
  ].join(';');
  placeholder.textContent = 'Opening the interactive implant demo…';
  return placeholder;
}

export function createErrorPanel(message: string, onRetry: () => void, onOpen?: () => void): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'pycad-embed-error';
  panel.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'gap:12px',
    'align-items:center',
    'justify-content:center',
    'width:100%',
    'height:100%',
    'min-height:inherit',
    'padding:24px',
    'box-sizing:border-box',
    'background:#111318',
    'color:#e6e9ef',
    'font:500 14px/1.4 system-ui,sans-serif',
    'text-align:center',
  ].join(';');

  const text = document.createElement('p');
  text.textContent = message;
  panel.appendChild(text);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry';
  retry.style.cssText =
    'cursor:pointer;border:0;border-radius:8px;padding:10px 14px;background:#3b82f6;color:#fff;font:inherit';
  retry.addEventListener('click', onRetry);
  actions.appendChild(retry);

  if (onOpen) {
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Open demo';
    open.style.cssText =
      'cursor:pointer;border:1px solid #3a4150;border-radius:8px;padding:10px 14px;background:transparent;color:#e6e9ef;font:inherit';
    open.addEventListener('click', onOpen);
    actions.appendChild(open);
  }

  panel.appendChild(actions);
  return panel;
}

export function isNearViewport(element: Element, rootMargin = '240px'): boolean {
  const rect = element.getBoundingClientRect();
  const margin = parseInt(rootMargin, 10) || 240;
  return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
}
