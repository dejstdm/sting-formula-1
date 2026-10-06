import { Container, Geometry, GlProgram, Mesh, RendererType, Shader, Sprite, type Renderer, type Texture } from 'pixi.js';
import { ART } from './track';

const vertex = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

// A screen row at depth z (dash periods) shows the ground at z + d after moving forward
// by d. Lines through the vanishing point (kerb edges, the art's speed streaks) keep
// their place; dashes and kerb stripes slide towards the camera. d wraps at one
// period, where the dashes line up again.
// The art's bottom rows are drawn differently (a darker band, the kerbs leaving the
// frame), so anything nearer than CLEAN_Z + 1 is taken from the clean band
// [CLEAN_Z, CLEAN_Z + 2) at the same phase. The art is only nearly periodic, so where
// the phase wraps it crossfades between two copies one period apart instead of
// jumping. Dashes are exactly periodic and do not ghost.
const fragment = /* glsl */ `precision highp float;
in vec2 vUV;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uOffset;

const vec2 SIZE = vec2(${ART.width.toFixed(1)}, ${ART.height.toFixed(1)});
const float VPX = ${ART.vpX.toFixed(3)};
const float HORIZON = ${ART.horizon.toFixed(3)};
const float A = ${ART.A.toExponential(10)};
const float B = ${ART.B.toExponential(10)};
const float CLEAN_Z = ${ART.cleanZ.toFixed(3)};

// The art at depth z, on the same line through the vanishing point as p.
vec4 ground(vec2 p, float below, float z) {
  float below2 = 1.0 / (B * z + A);
  vec2 q = vec2(VPX + (p.x - VPX) * below2 / below, HORIZON + below2);
  return texture(uTexture, q / SIZE);
}

void main() {
  vec2 p = vUV * SIZE;
  vec4 still = texture(uTexture, vUV);
  float w = smoothstep(${ART.scrollFrom.toFixed(1)}, ${ART.scrollFull.toFixed(1)}, p.y);
  if (w <= 0.0) {
    finalColor = still;
    return;
  }
  float below = p.y - HORIZON;
  float z = (1.0 / below - A) / B + uOffset;
  vec4 moved = ground(p, below, z);
  if (z < CLEAN_Z + 1.0) {
    float f = fract(z - CLEAN_Z);
    float wb = 1.0 - smoothstep(0.0, 0.5, f);
    moved = ground(p, below, CLEAN_Z + f);
    if (wb > 0.0) moved = mix(moved, ground(p, below, CLEAN_Z + 1.0 + f), wb);
  }
  finalColor = mix(still, moved, w);
}
`;

/** The Figma track backdrop, with its road scrolling in depth. Size is in art pixels. */
export class Road extends Container {
  private uniforms: { uniforms: { uOffset: number } } | null = null;
  private distance = 0;

  constructor(texture: Texture, renderer: Renderer) {
    super();
    if (renderer.type !== RendererType.WEBGL) {
      // Canvas or WebGPU: no custom GLSL. Show the still art rather than nothing.
      this.addChild(new Sprite(texture));
      return;
    }
    const geometry = new Geometry({
      attributes: {
        aPosition: [0, 0, ART.width, 0, ART.width, ART.height, 0, ART.height],
        aUV: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = new Shader({
      glProgram: new GlProgram({ vertex, fragment, name: 'road' }),
      resources: {
        uTexture: texture.source,
        roadUniforms: { uOffset: { value: 0, type: 'f32' } },
      },
    });
    this.uniforms = shader.resources.roadUniforms as { uniforms: { uOffset: number } };
    this.addChild(new Mesh({ geometry, shader }));
  }

  /** Advance the camera by `dz` dash periods. */
  advance(dz: number): void {
    this.distance = (this.distance + dz) % 1;
    if (this.uniforms) this.uniforms.uniforms.uOffset = this.distance;
  }
}
