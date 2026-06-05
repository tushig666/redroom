export const FleshShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: null },
    uPsychLevel: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uPsychLevel;

    void main() {
      vUv = uv;
      vPosition = position;
      
      // Breathing displacement
      float displacement = sin(uTime * 1.5 + position.y * 2.0) * (0.02 + uPsychLevel * 0.05);
      vec3 newPos = position + normal * displacement;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uPsychLevel;

    // Simplex Noise (simplified for runtime)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // 4-octave noise
      float n = snoise(vUv * 4.0 + uTime * 0.1);
      n += 0.5 * snoise(vUv * 8.0 - uTime * 0.2);
      n += 0.25 * snoise(vUv * 16.0 + uTime * 0.3);
      
      vec3 baseColor = vec3(0.11, 0.09, 0.09); // Dark desaturated red
      vec3 veinColor = vec3(0.72, 0.08, 0.08); // Deep crimson
      vec3 pulseColor = vec3(1.0, 0.2, 0.2) * (uPsychLevel + 0.5);
      
      float mask = smoothstep(0.2, 0.8, n);
      vec3 finalColor = mix(baseColor, veinColor, mask);
      
      // Heartbeat pulse effect
      float beat = pow(sin(uTime * 2.0 + vUv.y * 5.0), 2.0) * 0.1;
      finalColor += pulseColor * beat * (0.5 + uPsychLevel);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
