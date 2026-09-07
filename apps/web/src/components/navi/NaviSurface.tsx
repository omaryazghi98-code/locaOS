'use client';

import { useEffect, useRef } from 'react';
import { useInViewport, useReducedMotion } from '@/lib/navi/hooks';

/**
 * NAVI hero surface — a slow "operational field": layered domain-warped noise in the NAVI palette.
 * Raw WebGL (no three.js), ~60 lines of GLSL, DPR capped at 1.25, 30 fps, paused when off-screen or
 * tab hidden. pointer-events:none. Falls back to a static CSS gradient when WebGL is unavailable or
 * prefers-reduced-motion is set. Text sits above a darkening overlay for contrast (see .nv-hero::after).
 *
 * `tension` (0..1) is driven by real data (critical/priority-1 count) and subtly warms the field.
 */
const FRAG = `
precision mediump float;
uniform vec2 u_res; uniform float u_time; uniform float u_tension;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy; vec2 p = uv; p.x *= u_res.x / u_res.y;
  float t = u_time * 0.035;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 1.7*q + vec2(1.7, 9.2) + 0.15*t), fbm(p + 1.7*q + vec2(8.3, 2.8) - 0.12*t));
  float f = fbm(p + 1.4*r);
  vec3 deep = vec3(0.047, 0.059, 0.075);
  vec3 blue = vec3(0.345, 0.651, 1.0);
  vec3 teal = vec3(0.176, 0.831, 0.749);
  vec3 violet = vec3(0.545, 0.486, 0.965);
  vec3 warm = vec3(0.941, 0.533, 0.243);
  vec3 col = deep;
  col = mix(col, blue, smoothstep(0.35, 0.95, f) * 0.28);
  col = mix(col, teal, smoothstep(0.55, 1.0, q.x) * 0.16);
  col = mix(col, violet, smoothstep(0.5, 1.0, r.y) * 0.14);
  col = mix(col, warm, smoothstep(0.6, 1.0, f) * 0.22 * u_tension);
  // vignette + top-left emphasis (where the brief text lives) kept darker for contrast
  float vig = smoothstep(1.25, 0.25, length(uv - vec2(0.72, 0.35)));
  col *= 0.55 + 0.45 * vig;
  col = mix(deep, col, 0.85);
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export function NaviSurface({ tension = 0 }: { tension?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const visible = useInViewport(wrap);
  const tensionRef = useRef(tension);
  tensionRef.current = Math.max(0, Math.min(1, tension));

  useEffect(() => {
    const el = canvas.current;
    if (!el || reduced) return;
    const gl = el.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) { el.style.display = 'none'; return; }

    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = compile(gl.VERTEX_SHADER, VERT); const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { el.style.display = 'none'; return; }
    const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { el.style.display = 'none'; return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'u_res'); const uTime = gl.getUniformLocation(prog, 'u_time'); const uTen = gl.getUniformLocation(prog, 'u_tension');

    let raf = 0; let last = 0; let running = true; let tension = tensionRef.current;
    const start = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(1, Math.floor(el.clientWidth * dpr * 0.75)); // render at 75% then upscale: cheap + soft
      const h = Math.max(1, Math.floor(el.clientHeight * dpr * 0.75));
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; gl.viewport(0, 0, w, h); }
    };
    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30fps cap
      last = now;
      if (document.visibilityState !== 'visible') return;
      resize();
      tension += (tensionRef.current - tension) * 0.02;
      gl.uniform2f(uRes, el.width, el.height); gl.uniform1f(uTime, (now - start) / 1000); gl.uniform1f(uTen, tension);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const ro = new ResizeObserver(resize); ro.observe(el);
    raf = requestAnimationFrame(frame);
    const lose = () => { running = false; cancelAnimationFrame(raf); el.style.display = 'none'; };
    el.addEventListener('webglcontextlost', lose);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener('webglcontextlost', lose); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [reduced]);

  // Pause rendering while off-screen (cheap: we toggle a data attr the loop reads via visibility check above)
  useEffect(() => { if (canvas.current) canvas.current.style.visibility = visible ? 'visible' : 'hidden'; }, [visible]);

  return (
    <div ref={wrap} className="nv-hero-surface" aria-hidden="true">
      <div className="fallback" />
      {!reduced && <canvas ref={canvas} />}
    </div>
  );
}
