import {
  applyContainerStyles,
  createErrorPanel,
  createPlaceholder,
  getContainers,
  isNearViewport,
  readEmbedId,
  readLayout,
  resolveEmbedBaseUrl,
} from './dom';
import {
  buildIframeSrc,
  isIframeMessage,
  type EmbedLayout,
  type IframeToParentMessage,
} from './messages';

interface MountedEmbed {
  container: HTMLElement;
  embedId: string;
  layout: EmbedLayout;
  iframe: HTMLIFrameElement | null;
  mounted: boolean;
}

const mounted = new Map<HTMLElement, MountedEmbed>();
let observer: IntersectionObserver | null = null;
let loaderScript: HTMLScriptElement | null = null;

function getLoaderScript(): HTMLScriptElement | null {
  if (loaderScript) return loaderScript;
  loaderScript = document.currentScript as HTMLScriptElement | null;
  if (loaderScript) return loaderScript;
  return document.querySelector<HTMLScriptElement>('script[src*="embed/v1.js"]');
}

function clearContainer(container: HTMLElement) {
  container.replaceChildren();
}

function mountIframe(entry: MountedEmbed, baseUrl: string) {
  if (entry.mounted || entry.iframe) return;

  const placeholder = createPlaceholder(entry.layout);
  clearContainer(entry.container);
  entry.container.appendChild(placeholder);

  const iframe = document.createElement('iframe');
  iframe.title = 'PYCAD Interactive Implant Demo';
  iframe.loading = 'lazy';
  iframe.allow = 'fullscreen';
  iframe.style.cssText = 'border:0;width:100%;height:100%;min-height:inherit;display:block;background:#0a0b0d';
  iframe.src = buildIframeSrc(baseUrl, entry.embedId, entry.layout);

  iframe.addEventListener('load', () => {
    placeholder.remove();
  });

  iframe.addEventListener('error', () => {
    showError(entry, baseUrl, 'Unable to load the demo iframe.');
  });

  entry.container.appendChild(iframe);
  entry.iframe = iframe;
  entry.mounted = true;
}

function showError(entry: MountedEmbed, baseUrl: string, message: string) {
  clearContainer(entry.container);
  const openUrl = buildIframeSrc(baseUrl, entry.embedId, entry.layout);
  entry.container.appendChild(
    createErrorPanel(
      message,
      () => {
        entry.mounted = false;
        entry.iframe = null;
        mountIframe(entry, baseUrl);
      },
      () => window.open(openUrl, '_blank', 'noopener,noreferrer'),
    ),
  );
}

function handleIframeMessage(event: MessageEvent) {
  if (!isIframeMessage(event.data)) return;

  const message = event.data as IframeToParentMessage;
  for (const entry of mounted.values()) {
    if (!entry.iframe || event.source !== entry.iframe.contentWindow) continue;

    if (message.type === 'pycad:iframe:height' && message.height > 0) {
      const heightPx = `${Math.ceil(message.height)}px`;
      entry.container.style.height = heightPx;
      entry.container.style.overflow = 'visible';
      if (entry.iframe) {
        entry.iframe.style.height = heightPx;
      }
    }
  }
}

function ensureObserver(baseUrl: string) {
  if (observer) return;

  observer = new IntersectionObserver(
    (records) => {
      for (const record of records) {
        if (!record.isIntersecting) continue;
        const container = record.target as HTMLElement;
        const entry = mounted.get(container);
        if (!entry) continue;
        mountIframe(entry, baseUrl);
        observer?.unobserve(container);
      }
    },
    { root: null, rootMargin: '240px 0px', threshold: 0.01 },
  );
}

function registerContainer(container: HTMLElement, baseUrl: string) {
  const embedId = readEmbedId(container);
  if (!embedId) {
    container.appendChild(createErrorPanel('Missing data-pycad-embed attribute.', () => registerContainer(container, baseUrl)));
    return;
  }

  const layout = readLayout(container);
  applyContainerStyles(container, layout);

  const entry: MountedEmbed = { container, embedId, layout, iframe: null, mounted: false };
  mounted.set(container, entry);

  if (isNearViewport(container)) {
    mountIframe(entry, baseUrl);
    return;
  }

  ensureObserver(baseUrl);
  observer?.observe(container);
}

export function boot() {
  const script = getLoaderScript();
  const baseUrl = resolveEmbedBaseUrl(script);
  window.addEventListener('message', handleIframeMessage);

  for (const container of getContainers()) {
    registerContainer(container, baseUrl);
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
