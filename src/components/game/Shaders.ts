
import * as THREE from 'three';

export const FleshShader = {
  uniforms: {
    uTime: { value: 0 },
    uPsychLevel: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uPsychLevel;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      // Visceral breathing displacement loop
      float displacement = sin(uTime * 1.2 + position.y * 0.5 + position.x * 0.5) * (0.05 + uPsychLevel * 0.15);
      vec3 newPos = position + normal * displacement;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uPsychLevel;

    // Deterministic Pseudo-Random Noise
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      float n = noise(vUv * 10.0 + uTime * 0.05);
      n += 0.5 * noise(vUv * 20.0 - uTime * 0.1);
      
      vec3 baseColor = vec3(0.08, 0.04, 0.04);
      vec3 veinColor = vec3(0.5, 0.0, 0.0);
      vec3 pulseColor = vec3(0.8, 0.1, 0.1);
      
      float mask = smoothstep(0.4, 0.7, n);
      vec3 finalColor = mix(baseColor, veinColor, mask);
      
      // Rhythmic cardiac pulse
      float heartbeat = pow(max(0.0, sin(uTime * 3.0)), 10.0) * 0.3;
      finalColor += pulseColor * heartbeat * (1.0 + uPsychLevel * 2.0);
      
      // View-dependent darkening
      float fresnel = pow(1.0 - dot(vNormal, vec3(0,0,1)), 3.0);
      finalColor *= (1.0 - fresnel * 0.5);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
