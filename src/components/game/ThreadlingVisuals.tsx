import * as THREE from 'three';

/**
 * ThreadlingVisuals - Vanilla Three.js Creature Class
 * 
 * Implements "The Resonance Weaver":
 * - 14 Asymmetrical limbs (Needles)
 * - Translucent pulsating Bladders (Sensors)
 * - Shifting Form (Limb Jitter)
 */
export class ThreadlingVisuals {
  public group: THREE.Group;
  private hub: THREE.Mesh;
  private bladders: THREE.Mesh[] = [];
  private limbs: { group: THREE.Group, length: number }[] = [];

  constructor() {
    this.group = new THREE.Group();

    // Central Resonance Hub - The "Head" cluster
    const hubGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const hubMat = new THREE.MeshBasicMaterial({ 
      color: 0x220000, 
      transparent: true, 
      opacity: 0.8 
    });
    this.hub = new THREE.Mesh(hubGeo, hubMat);
    this.group.add(this.hub);

    // Pulsating Bladders - Acoustic Sensory Organs
    const bladderGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const bladderMat = new THREE.MeshBasicMaterial({ 
      color: 0x441111, 
      wireframe: true 
    });

    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(bladderGeo, bladderMat);
      this.bladders.push(b);
      this.group.add(b);
    }

    // The Needles - 14 Asymmetrical multi-jointed limbs
    for (let i = 0; i < 14; i++) {
      const limbGroup = new THREE.Group();
      const length = 5 + Math.random() * 15;
      const thickness = 0.02 + Math.random() * 0.05;

      const mainLimbGeo = new THREE.CylinderGeometry(thickness, thickness * 0.5, length);
      const limbMat = new THREE.MeshBasicMaterial({ color: 0x110000 });
      const mainLimb = new THREE.Mesh(mainLimbGeo, limbMat);
      mainLimb.position.y = length / 2;
      limbGroup.add(mainLimb);

      // Distal Joint - Makes the limbs look "broken"
      const distalGroup = new THREE.Group();
      distalGroup.position.y = length;
      distalGroup.rotation.x = 0.5;

      const distalLimbGeo = new THREE.CylinderGeometry(thickness * 0.5, 0.001, 4);
      const distalLimbMat = new THREE.MeshBasicMaterial({ color: 0x080000 });
      const distalLimb = new THREE.Mesh(distalLimbGeo, distalLimbMat);
      distalLimb.position.y = 2;
      distalGroup.add(distalLimb);
      
      limbGroup.add(distalGroup);
      
      // Random initial orientation
      limbGroup.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      this.limbs.push({ group: limbGroup, length });
      this.group.add(limbGroup);
    }
  }

  /**
   * Syncs visuals with the monster's system state.
   */
  update(position: THREE.Vector3, state: string) {
    this.group.position.copy(position);

    // Dynamic coloring based on alertness
    if (this.hub.material instanceof THREE.MeshBasicMaterial) {
      this.hub.material.color.setHex(state === 'HUNTING' ? 0xff0000 : 0x220000);
    }

    const time = Date.now() * 0.001;

    // Animate bladders with breathing-like pulse
    this.bladders.forEach((b, i) => {
      const offset = (i * Math.PI * 2) / 3;
      b.position.set(
        Math.sin(time + offset) * 0.5,
        -0.8 + Math.cos(time * 0.5) * 0.1,
        Math.cos(time + offset) * 0.5
      );
    });

    // Sub-threshold jitter for limbs
    this.limbs.forEach((limb, i) => {
      const jitter = state === 'HUNTING' ? 0.005 : 0.001;
      limb.group.rotation.x += Math.sin(time * 2 + i) * jitter;
      limb.group.rotation.z += Math.cos(time * 2 + i) * jitter;
    });
  }
}
