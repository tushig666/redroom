
import * as THREE from 'three';

/**
 * MatrixRedShader
 * 
 * Absolute Industrial Red Blindness pipeline.
 * Features:
 * - Constant saturation output
 * - Linear distance fog
 * - Distinctive door darkening
 * - Depth 5 sterile white override
 */
export const MatrixRedShader = {
  uniforms: {
    u_DepthLevel: { value: 1.0 },
    u_IsDoor: { value: false },
    u_IsWin: { value: false },
  },
  vertexShader: `
    varying vec3 vPosition;
    varying float vDistance;

    void main() {
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
      vDistance = -viewPos.z;
      gl_Position = projectionMatrix * viewPos;
    }
  `,
  fragmentShader: `
    uniform float u_DepthLevel;
    uniform bool u_IsDoor;
    uniform bool u_IsWin;
    varying float vDistance;

    void main() {
      if (u_IsWin) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
      }

      // Base matrix color: Pure Red
      vec3 color = vec3(1.0, 0.0, 0.0);
      
      // Door shading: Flat deep crimson
      if (u_IsDoor) {
        color = vec3(0.12, 0.0, 0.0);
      }

      // Linear Distance Fog
      float fogStart = 2.0;
      float fogEnd = 15.0 + (u_DepthLevel * 2.0);
      float fogFactor = clamp((vDistance - fogStart) / (fogEnd - fogStart), 0.0, 1.0);
      
      // Blend to darkness
      vec3 finalColor = mix(color, vec3(0.0, 0.0, 0.0), fogFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
