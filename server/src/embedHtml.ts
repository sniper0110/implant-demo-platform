import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EmbedConfigResponse } from './config/defaults.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedTemplate: string | null = null;

async function loadEmbedTemplate(staticRoot: string): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const path = join(staticRoot, 'embed.html');
  cachedTemplate = await readFile(path, 'utf8');
  return cachedTemplate;
}

function buildBootstrapScript(): string {
  return `<script>
(function () {
  var cfg = window.__PYCAD_EMBED_CONFIG__;
  if (!cfg || !cfg.models) return;
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
  var modelPath = coarse && cfg.models.mobile ? cfg.models.mobile : cfg.models.initial;
  var base = (cfg.assetBaseUrl || window.location.origin).replace(/\\/$/, '');
  var rel = modelPath.replace(/^\\//, '');
  var url = rel.indexOf('/assets/') >= 0 ? base + (rel.charAt(0) === '/' ? '' : '/') + rel : base + '/assets/' + cfg.releaseId + '/' + rel;
  window.__PYCAD_MODEL_PROGRESS__ = { loadedBytes: 0, totalBytes: 0 };
  window.__PYCAD_MODEL_FETCH__ = fetch(url, { credentials: 'same-origin', priority: 'low' }).then(function (res) {
    if (!res.ok) throw new Error('Model unavailable (' + res.status + ')');
    var total = Number(res.headers.get('content-length') || 0);
    if (!res.body || !res.body.getReader) return res.arrayBuffer().then(function (buf) {
      window.__PYCAD_MODEL_PROGRESS__ = { loadedBytes: buf.byteLength, totalBytes: buf.byteLength || total };
      return buf;
    });
    var reader = res.body.getReader();
    var chunks = [];
    var loaded = 0;
    function pump() {
      return reader.read().then(function (result) {
        if (result.done) {
          var out = new Uint8Array(loaded);
          var offset = 0;
          for (var i = 0; i < chunks.length; i++) {
            out.set(chunks[i], offset);
            offset += chunks[i].byteLength;
          }
          return out.buffer;
        }
        chunks.push(result.value);
        loaded += result.value.byteLength;
        window.__PYCAD_MODEL_PROGRESS__ = { loadedBytes: loaded, totalBytes: total || loaded };
        return pump();
      });
    }
    return pump();
  });
})();
</script>`;
}

export async function renderEmbedHtml(
  staticRoot: string,
  config: EmbedConfigResponse,
): Promise<string> {
  const template = await loadEmbedTemplate(staticRoot);
  const configJson = JSON.stringify(config).replace(/</g, '\\u003c');
  const injection =
    `<script>window.__PYCAD_EMBED_CONFIG__=${configJson};</script>\n` +
    buildBootstrapScript();
  if (template.includes('<!--PYCAD_BOOTSTRAP-->')) {
    return template.replace('<!--PYCAD_BOOTSTRAP-->', injection);
  }
  return template.replace('<div id="root"></div>', `<div id="root"></div>\n${injection}`);
}
