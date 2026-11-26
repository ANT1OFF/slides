// A moving picture behind a slide, drawn by one small WebGL shader. Opt-in and apart from the other
// blocks: import it from "@blocks/backdrop", and only a deck that does carries its bytes.
//
// How it is built:
// - One hidden WebGL canvas for the whole deck draws every backdrop. Each <Backdrop> owns a plain 2D
//   canvas and copies its frame from there, so a deck never holds more than one GL context, a lost
//   context leaves the last frame standing, and a view transition snapshots it like any image.
// - The picture is a pure function of (preset, time, progress, seed, colours): no state, no
//   simulation. Print, the overview, thumbnails and reduced motion draw the frame at time 0 once.
// - Under the canvas is a CSS gradient from the same tokens, which shows when WebGL can't start.
// - Importing the file compiles the shader while the browser is idle, so the first backdrop slide
//   doesn't stall on it.
import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useBuildStep, useStatic } from "@core";

/** The pictures a Backdrop can draw. */
export type BackdropPreset = "aurora" | "grain" | "dots" | "depth";

/** A colour token without its `--color-` prefix: "accent", "accent-2", "ink" … */
type Token = string;

const PRESETS: Array<BackdropPreset> = ["aurora", "grain", "dots", "depth"];

/** No frame is drawn larger than this many pixels, whatever the screen. */
const MAX_PIXELS = 2048 * 1152;
const MAX_RATIO = 2;

/** Milliseconds between frames: the motion is slow, so 30 a second is plenty. */
const FRAME_MS = 30;

/** Seconds for the picture to settle after a build step moves it. */
const SETTLE = 1.6;

const VERTEX = "attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}";

// R: size in pixels, and pixels per stage pixel (dots keep their size on the stage, and grain and
// small dots fade as pixels grow). U: time (s), progress (0–1), intensity, seed. K: preset. C: canvas, ink and
// three voices, in OKLab, where mixes stay clean. H hashes a cell, W bends a point. Each preset
// colours `c`; the tail turns OKLab into sRGB and dithers by ±1/255 so no gradient bands.
const FRAGMENT = `precision highp float;
uniform vec3 R;uniform vec4 U;uniform float K;uniform vec3 C[5];
float H(vec2 p){p=fract(p*vec2(.2127,.3713)+.137);p+=dot(p,p.yx+41.79);return fract((p.x+p.y)*p.x*7.31);}
vec2 W(vec2 w,float t){for(int i=1;i<4;i++){float n=float(i);w+=.55/n*sin(w.yx*n*1.25+vec2(t,-t*.8)+n*1.7);}return w;}
void main(){
vec2 g=gl_FragCoord.xy,s=(g/R.xy-.5)*vec2(R.x/R.y,1.);
float t=U.x+U.y*6.,a=U.z,e=U.w*9.7;
vec3 c=C[0];
if(K<.5){
vec2 w=s+.3*sin(W(s*.8+e,t*.05));
vec3 m=vec3(0);
float z=0.,q=0.;
for(int j=0;j<3;j++){
float n=float(j);
vec2 d=w-vec2(.95,.5)*sin(vec2(1.9,2.3)*n+1.+e+t*vec2(.021,.017)*(1.+.3*n));
d.x=d.x*.75+d.y*.45;
float k=(1.-.2*n)*exp(-dot(d,d)*(2.3+.7*n));
q+=k;k*=k*k;z+=k;m+=k*C[j+2];
}
c=mix(c,m/(z+1e-5),a*.58*smoothstep(.06,.95,q));
}else if(K<1.5){
vec2 w=W(s*.45+e,t*.04);
c=mix(c,C[2],a*.22*(1.+sin(w.x+w.y*.6))*(1.-smoothstep(.1,1.3,length(s-vec2(.75,-.45)))));
c=mix(c,C[3],a*.24*(1.-smoothstep(0.,1.2,length(s+vec2(.8,-.5)+.1*sin(w)))));
c.x+=a*.045*min(1.,R.z)*(H(g)+H(g+91.7)-1.);
}else if(K<2.5){
float n=R.y/R.z/36.;
vec2 d=s*n+e;
d.x+=.5*mod(floor(d.y),2.);
vec2 i=floor(d),f=d-i-.5,o=(i+.5)/n;
float r=H(i),v=W(o*.9,t*.05).x;
v=smoothstep(-.5,1.,sin(v*2.4+o.y*2.));
f+=.08*sin(t*.35*(.6+r)+r*40.+vec2(0,1.57));
float z=.07+.27*v,x=n/R.y;
c=mix(c,mix(C[1],C[2],smoothstep(.55,.9,v)),a*z*z/(z*z+.18*x*x)*(1.-smoothstep(z-x,z+x,length(f)))*(.13+.6*v*v));
}else{
c=mix(c,C[3],a*.32*exp(-3.*dot(s-vec2(.5,.4),s-vec2(.5,.4))));
for(int j=0;j<6;j++){
float l=float(j),x=s.x*(.7+l*.12)+(U.x*.012+U.y)*(.3+l*.35)+l*5.3+e;
float h=.18-l*.13+(.11-l*.008)*(sin(x*2.1)+.5*sin(x*4.7+l)+.25*sin(x*9.3+2.*l));
c=mix(c,mix(C[0],mix(C[2],C[1],l*.08),a*(.14+.13*l)*(1.-.5*smoothstep(0.,.3,h-s.y))),1.-smoothstep(-1.5,1.5,(s.y-h)*R.y));
}
}
vec3 l=vec3(c.x+.3963377774*c.y+.2158037573*c.z,c.x-.1055613458*c.y-.0638541728*c.z,c.x-.0894841775*c.y-1.291485548*c.z);
l*=l*l;
l=clamp(vec3(4.0767416621*l.x-3.3077115913*l.y+.2309699292*l.z,-1.2684380046*l.x+2.6097574011*l.y-.3413193965*l.z,-.0041960863*l.x-.7034186147*l.y+1.707614701*l.z),0.,1.);
l=mix(l*12.92,1.055*pow(l,vec3(1./2.4))-.055,step(.0031308,l));
gl_FragColor=vec4(l+(H(g+7.3)+H(g+71.9)-1.)/255.,1);
}`;

/** What one frame is a function of. */
interface Frame {
  preset: number;
  time: number;
  progress: number;
  intensity: number;
  seed: number;
  /** Canvas pixels per pixel of the 1920×1080 stage. */
  density: number;
  /** Five colours in OKLab: canvas, ink and the three voices. */
  colors: Float32Array;
}

interface Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  uniforms: Record<"R" | "U" | "K" | "C", WebGLUniformLocation | null>;
}

// The deck's one GL context: undefined until first asked for, null when WebGL is not there.
let shared: Renderer | null | undefined;
let lost = false;
let mounted = 0;

/** Compiles the shader into `gl` and leaves it ready to draw. Null when the driver refuses it. */
function program(gl: WebGLRenderingContext): Renderer["uniforms"] | null {
  const made = gl.createProgram();

  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ] as const) {
    const shader = gl.createShader(type);

    if (shader) {
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(made, shader);
    }
  }

  gl.linkProgram(made);

  if (gl.getProgramParameter(made, gl.LINK_STATUS) !== true) {
    if (!gl.isContextLost()) {
      reportError(new Error(`Backdrop: the shader did not compile. ${gl.getProgramInfoLog(made) ?? ""}`));
    }

    return null;
  }

  gl.useProgram(made);

  // One triangle that covers the view.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  return {
    R: gl.getUniformLocation(made, "R"),
    U: gl.getUniformLocation(made, "U"),
    K: gl.getUniformLocation(made, "K"),
    C: gl.getUniformLocation(made, "C"),
  };
}

/** The shared renderer, made on first use. Null without WebGL, and while its context is lost. */
function renderer(): Renderer | null {
  if (shared !== undefined) {
    return lost ? null : shared;
  }

  shared = null;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  const uniforms = gl && program(gl);

  if (!gl || !uniforms) {
    return null;
  }

  const made: Renderer = { canvas, gl, uniforms };
  shared = made;

  // A lost context (the GPU was reset, or the tab sat in the background) keeps every backdrop's last
  // frame, which lives in its own 2D canvas. When the browser gives it back, the shader is rebuilt.
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    const again = program(gl);

    if (again) {
      made.uniforms = again;
      lost = false;
    }
  });

  return made;
}

/** Draws `frame` into `target` at its own size. False when there is no WebGL to draw with. */
function draw(target: HTMLCanvasElement, frame: Frame): boolean {
  const use = renderer();
  const to = use && target.getContext("2d");

  if (!use || !to || use.gl.isContextLost()) {
    return false;
  }

  const { canvas, gl, uniforms } = use;
  const { width, height } = target;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.uniform3f(uniforms.R, width, height, frame.density);
  gl.uniform4f(uniforms.U, frame.time, frame.progress, frame.intensity, frame.seed);
  gl.uniform1f(uniforms.K, frame.preset);
  gl.uniform3fv(uniforms.C, frame.colors);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  to.drawImage(canvas, 0, 0);

  return true;
}

/** Gives the frame buffer back while no backdrop is on screen; the compiled shader stays. */
function park() {
  if (mounted === 0 && shared) {
    shared.canvas.width = 1;
    shared.canvas.height = 1;
  }
}

// Importing this file is the opt-in, so compile the shader once the deck has drawn: the first
// backdrop slide then opens without a stall. One 1×1 frame makes the driver finish the work.
if (typeof document !== "undefined") {
  const warm = () => {
    const use = renderer();

    if (use && mounted === 0) {
      use.gl.drawArrays(use.gl.TRIANGLES, 0, 3);
      // Reading the pixel back makes the driver finish compiling now instead of on the first slide.
      use.gl.readPixels(0, 0, 1, 1, use.gl.RGBA, use.gl.UNSIGNED_BYTE, new Uint8Array(4));
    }
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(warm, { timeout: 2000 });
  } else {
    setTimeout(warm, 200);
  }
}

// A page that is being replaced in development lets go of its context at once.
import.meta.hot?.dispose(() => {
  shared?.gl.getExtension("WEBGL_lose_context")?.loseContext();
});

/** `?backdrop-time=12` in the URL holds every backdrop at that second, for screenshots and tests. */
function pinned(): number | undefined {
  const asked = new URLSearchParams(location.search).get("backdrop-time");
  const seconds = asked === null ? Number.NaN : Number(asked);

  return Number.isFinite(seconds) ? seconds : undefined;
}

const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** An sRGB colour (0–255 a channel) in OKLab. */
function oklab(red: number, green: number, blue: number): [number, number, number] {
  const [r, g, b] = [red, green, blue].map((v) => linear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * The theme's colours where `el` sits (so a dark or inverted slide gives its own), as the shader
 * wants them. The browser resolves each token, whatever notation the theme wrote it in, by
 * painting it on one pixel.
 */
function palette(el: HTMLElement, voices: Array<Token>): Float32Array {
  const out = new Float32Array(15);
  const pixel = document.createElement("canvas").getContext("2d", { willReadFrequently: true });

  if (!pixel) {
    return out;
  }

  const before = el.style.color;
  ["canvas", "ink", 0, 1, 2].forEach((token, i) => {
    el.style.color = `var(--color-${typeof token === "number" ? voices[token % voices.length] : token})`;
    pixel.fillStyle = getComputedStyle(el).color;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b] = pixel.getImageData(0, 0, 1, 1).data;
    out.set(oklab(r, g, b), i * 3);
  });
  el.style.color = before;

  return out;
}

/** A token's colour at `percent` opacity. */
const tint = (token: Token, percent: number) => `rgb(from var(--color-${token}) r g b / ${percent}%)`;

/** A token's colour fading out from one corner or side (`to`: where it fades towards) by `reach` of the way. */
const fade = (token: Token, percent: number, to: string, reach = 60) =>
  `linear-gradient(to ${to}, ${tint(token, percent)}, ${tint(token, 0)} ${reach}%)`;

/** What stands in for each picture without WebGL: a gradient from the same tokens. */
function fallback(preset: BackdropPreset, [a, b]: Array<Token>): string {
  const second = b ?? a;

  switch (preset) {
    case "dots": {
      return `linear-gradient(105deg, var(--color-canvas) 35%, ${tint("canvas", 0)} 85%), radial-gradient(circle, ${tint(a, 60)} 6px, ${tint(a, 0)} 7px) 0 0 / 36px 36px`;
    }
    case "depth": {
      return `linear-gradient(to top, ${tint(a, 60)}, ${tint(a, 14)} 55%, ${tint(a, 0)} 62%), ${fade(second, 30, "bottom left", 45)}`;
    }
    case "grain": {
      return `${fade(a, 32, "top left")}, ${fade(second, 22, "bottom right")}`;
    }
    default: {
      return `${fade(a, 55, "bottom left")}, ${fade(second, 45, "top right")}`;
    }
  }
}

const SCRIMS = { left: "to right", right: "to left", bottom: "to top", top: "to bottom" };

/**
 * A slow, generated picture behind its children, in the theme's colours: `aurora` (pools of colour),
 * `grain` (a quiet wash with film grain), `dots` (a halftone field that breathes) or `depth` (layered
 * ridges). Wrap a whole slide in it, or give it a size with `className` for a panel. Inside it
 * `bg-canvas` is see-through, so `<TitleSlide>`, `<Frame>` and the rest sit straight on the picture;
 * `scrim` lays the canvas colour back under the side the text is on. With `steps`, each press of →
 * shifts the picture a little. Print, the overview, the presenter's "next" and reduced motion show one still
 * frame; without WebGL it is a gradient. Import from "@blocks/backdrop".
 */
export function Backdrop({
  preset = "aurora",
  scrim,
  intensity = 1,
  seed = 0,
  time,
  steps = 0,
  colors = ["accent", "accent-2", "accent-3"],
  inverted = false,
  className = "",
  style,
  children,
}: {
  preset?: BackdropPreset;
  /** Where the text is: that side is washed with the canvas colour so it stays readable. "full" washes all of it. */
  scrim?: "left" | "right" | "top" | "bottom" | "full";
  /** How much colour the picture has, from 0 (the bare canvas) to 1. */
  intensity?: number;
  /** Another number, another arrangement of the same picture. */
  seed?: number;
  /** Hold the picture at this second instead of letting it move. */
  time?: number;
  /** Give the slide this many build steps of its own: each press of → shifts the picture a little. */
  steps?: number;
  /** One to three colour tokens for the picture, e.g. `["accent"]` for a single hue. */
  colors?: Array<string>;
  /** Draw on the theme's other scheme, like `inverted` on a slide. */
  inverted?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const still = useStatic();
  const step = useBuildStep(steps);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // What carries over when the effect below runs again: when the picture started, and where its progress is.
  const run = useRef<{ since?: number; progress?: number }>({});
  const voices = colors.join(" ");

  // Clamped, so Back (which lands on "every step") and print draw what the last step draws.
  const goal = steps > 0 ? Math.min(step, steps) / steps : 0;

  useLayoutEffect(() => {
    const el = canvas.current;
    const host = box.current;

    if (!el || !host) {
      return;
    }

    mounted += 1;
    const tones = palette(el, voices.split(" "));
    const held = time ?? pinned() ?? (still || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : undefined);
    let last = 0;

    const paint = (now: number) => {
      // The size on screen: the laid-out box times the stage's scale. Not the bounding box, which an
      // entrance or a transition in flight would shrink or stretch.
      const stage = el.closest<HTMLElement>("[data-stage]");
      const scale = stage?.offsetWidth ? stage.getBoundingClientRect().width / stage.offsetWidth : 1;
      const ratio = Math.min(devicePixelRatio, MAX_RATIO) * scale;
      const width = el.offsetWidth * ratio;
      const height = el.offsetHeight * ratio;
      const fit = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)));
      const w = Math.round(width * fit);
      const h = Math.round(height * fit);

      // Not laid out (a hidden copy of the slide): nothing to draw on.
      if (w < 1 || h < 1) {
        return;
      }

      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }

      run.current.since ??= now;
      const from = run.current.progress ?? goal;

      // Ease towards the step's place; held, it is simply there.
      const progress = held === undefined ? from + (goal - from) * (1 - Math.exp(-(now - last) / 1000 / (SETTLE / 4))) : goal;
      run.current.progress = Math.abs(goal - progress) < 1e-4 ? goal : progress;
      last = now;

      const drawn = draw(el, {
        preset: PRESETS.indexOf(preset),
        time: held ?? (now - run.current.since) / 1000,
        progress: run.current.progress,
        intensity,
        seed,
        density: ratio * fit,
        colors: tones,
      });

      // Until a first frame is drawn the gradient under the canvas is the picture.
      if (drawn) {
        host.dataset.backdrop = held === undefined ? "live" : "still";
      } else {
        host.dataset.backdrop ??= "css";
      }
    };

    last = performance.now();
    paint(last);
    let frame = 0;

    // A held picture is drawn again only when its box changes (fonts arriving, the window resized).
    const again = () => paint(performance.now());
    const watch = new ResizeObserver(again);

    if (held === undefined) {
      const tick = (now: number) => {
        if (now - last >= FRAME_MS) {
          paint(now);
        }

        frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    } else {
      watch.observe(el);
      window.addEventListener("resize", again);
    }

    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      window.removeEventListener("resize", again);
      mounted -= 1;
      setTimeout(park, 0);
    };
  }, [preset, intensity, seed, time, still, voices, goal]);

  const wash = "color-mix(in oklab, var(--color-canvas) 90%, transparent)";

  return (
    <div
      ref={box}
      className={`relative h-full overflow-hidden ${inverted ? "inverted" : "bg-canvas text-ink"} ${className}`}
      style={{ ...style, background: `${fallback(preset, colors)}, var(--color-canvas)` }}
    >
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      {scrim && (
        <div
          data-backdrop-scrim=""
          className="pointer-events-none absolute inset-0"
          style={{
            background: scrim === "full" ? tint("canvas", 62) : `linear-gradient(${SCRIMS[scrim]}, ${wash} 22%, transparent 78%)`,
          }}
        />
      )}
      <div className="relative h-full" style={{ "--color-canvas": "transparent" }}>
        {children}
      </div>
    </div>
  );
}
