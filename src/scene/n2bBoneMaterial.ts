import { Color, MeshPhysicalMaterial } from 'three';

interface N2BShader {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
  fragmentShader: string;
}

const N2B_PRESET = {
  roughness: 0.18,
  clearcoat: 0.72,
  clearcoatRoughness: 0.23,
  specularIntensity: 1.25,
  sheen: 0.22,
  sheenRoughness: 0.62,
  pores: 0.31,
  warmth: 0.25,
  crevice: 0.1,
  fineScale: 0.28,
  microScale: 1.08,
  poreDarkness: 0.4,
} as const;

function injectN2BShader(shader: N2BShader) {
  shader.uniforms.uPores = { value: N2B_PRESET.pores };
  shader.uniforms.uWarmth = { value: N2B_PRESET.warmth };
  shader.uniforms.uCrevice = { value: N2B_PRESET.crevice };
  shader.uniforms.uFineScale = { value: N2B_PRESET.fineScale };
  shader.uniforms.uMicroScale = { value: N2B_PRESET.microScale };
  shader.uniforms.uPoreDarkness = { value: N2B_PRESET.poreDarkness };

  shader.vertexShader = shader.vertexShader.replace(
    'void main() {',
    `
    varying vec3 vObjPos;
    varying vec3 vObjNormal;
    void main() {
      vObjPos = position;
      vObjNormal = normal;
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    'void main() {',
    `
    uniform float uPores;
    uniform float uWarmth;
    uniform float uCrevice;
    uniform float uFineScale;
    uniform float uMicroScale;
    uniform float uPoreDarkness;
    varying vec3 vObjPos;
    varying vec3 vObjNormal;

    float n2bHash(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.17, 0.11, 0.07));
      p *= 19.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float n2bNoise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(n2bHash(i + vec3(0, 0, 0)), n2bHash(i + vec3(1, 0, 0)), f.x),
            mix(n2bHash(i + vec3(0, 1, 0)), n2bHash(i + vec3(1, 1, 0)), f.x), f.y),
        mix(mix(n2bHash(i + vec3(0, 0, 1)), n2bHash(i + vec3(1, 0, 1)), f.x),
            mix(n2bHash(i + vec3(0, 1, 1)), n2bHash(i + vec3(1, 1, 1)), f.x), f.y),
        f.z
      );
    }

    float n2bFbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * n2bNoise(p);
        p *= 2.11;
        a *= 0.5;
      }
      return v;
    }

    void main() {
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    float fine = n2bFbm(vObjPos * uFineScale);
    float micro = n2bFbm(vObjPos * uMicroScale + vec3(3.0, 13.0, 8.0));
    float pore = smoothstep(0.54, 0.90, fine * 0.58 + micro * 0.55) * uPores;
    float edge = pow(1.0 - abs(normalize(vObjNormal).z), 1.45) * uCrevice;

    vec3 ivory = vec3(0.96, 0.86, 0.61);
    vec3 yellow = vec3(0.82, 0.61, 0.35);
    vec3 brown = vec3(0.18, 0.105, 0.055);
    vec3 red = vec3(0.46, 0.13, 0.08);

    vec3 bone = mix(ivory, yellow, uWarmth * (0.22 + fine * 0.62));
    bone = mix(bone, red, max(0.0, micro - 0.74) * uWarmth * 0.25);
    bone = mix(bone, brown, clamp(pore * uPoreDarkness + edge * 0.32, 0.0, 0.74));
    diffuseColor.rgb *= bone;
    `
  );
}

export function createN2BBoneMaterial() {
  const material = new MeshPhysicalMaterial({
    color: '#f3dfab',
    roughness: N2B_PRESET.roughness,
    metalness: 0,
    clearcoat: N2B_PRESET.clearcoat,
    clearcoatRoughness: N2B_PRESET.clearcoatRoughness,
    specularIntensity: N2B_PRESET.specularIntensity,
    specularColor: new Color('#fff7df'),
    sheen: N2B_PRESET.sheen,
    sheenColor: new Color('#fff2cc'),
    sheenRoughness: N2B_PRESET.sheenRoughness,
  });

  material.onBeforeCompile = injectN2BShader;
  material.customProgramCacheKey = () => 'n2b-bone-material-v1';
  return material;
}
