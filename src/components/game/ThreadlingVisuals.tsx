
import * as THREE from 'three';

/**
 * ThreadlingVisuals - AAA "Resonance Weaver" Visuals
 * 
 * Implements Rule 4 (Unstable Form) and Rule 5 (Sensory Organs):
 * - 14 Asymmetrical limbs that subtly shift lengths
 * - 3 Pulsating Resonance Bladders that change color based on state
 * - Shifting limb proportions via noise-based jitter
 */
export class ThreadlingVisuals {
  public group: THREE.Group;
  private hub: THREE.Mesh;
  private bladders: THREE.Mesh[] = [];
  private limbs: { 
    group: THREE.Group, 
    mesh: THREE.Mesh,
    distal: THREE.Group,
    baseLength: number, 
    currentLength: number 
  }[] = [];

  constructor() {
    this.group = new THREE.Group();

    // Central Resonance Hub - The "Head" cluster
    const hubGeo = new THREE.IcosahedronGeometry(0.8, 1);
    const hubMat = new THREE.MeshBasicMaterial({ 
      color: 0x220000, 
      transparent: true, 
      opacity: 0.9,
      wireframe: true
    });
    this.hub = new THREE.Mesh(hubGeo, hubMat);
    this.group.add(this.hub);

    // Pulsating Bladders - Acoustic Sensory Organs (Rule 5)
    const bladderGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const bladderMat = new THREE.MeshBasicMaterial({ 
      color: 0x441111, 
      transparent: true,
      opacity: 0.6
    });

    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(bladderGeo, bladderMat.clone());
      this.bladders.push(b);
      this.group.add(b);
    }

    // The Needles - 14 Asymmetrical multi-jointed limbs (Rule 3)
    for (let i = 0; i < 14; i++) {
      const limbGroup = new THREE.Group();
      const length = 8 + Math.random() * 12;
      const thickness = 0.03 + Math.random() * 0.04;

      const mainLimbGeo = new THREE.CylinderGeometry(thickness, thickness * 1.5, 1);
      const limbMat = new THREE.MeshBasicMaterial({ color: 0x110000 });
      const mainLimb = new THREE.Mesh(mainLimbGeo, limbMat);
      
      // Store reference to scale dynamically
      limbGroup.add(mainLimb);

      const distalGroup = new THREE.Group();
      distalGroup.position.y = 1;
      distalGroup.rotation.x = 0.5 + Math.random();

      const distalLimbGeo = new THREE.CylinderGeometry(thickness * 0.5, 0.005, 1);
      const distalLimb = new THREE.Mesh(distalLimbGeo, limbMat);
      distalLimb.position.y = 0.5;
      distalGroup.add(distalLimb);
      limbGroup.add(distalGroup);

      // Random initial orientation
      limbGroup.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      this.limbs.push({ 
        group: limbGroup, 
        mesh: mainLimb,
        distal: distalGroup,
        baseLength: length,
        currentLength: length 
      });
      this.group.add(limbGroup);
    }
  }

  /**
   * Syncs visuals with the monster's system state.
   */
  update(position: THREE.Vector3, state: string) {
    this.group.position.copy(position);

    const time = Date.now() * 0.001;
    const isHunting = state === 'HUNTING';
    const isAlert = state === 'ALERT';

    // Dynamic coloring based on alertness
    const targetColor = isHunting ? 0xff0000 : (isAlert ? 0xaa0000 : 0x220000);
    if (this.hub.material instanceof THREE.MeshBasicMaterial) {
      this.hub.material.color.lerp(new THREE.Color(targetColor), 0.1);
    }

    // Animate bladders (Rule 5)
    this.bladders.forEach((b, i) => {
      const offset = (i * Math.PI * 2) / 3;
      const pulse = Math.sin(time * (isHunting ? 10 : 2) + offset) * 0.1;
      b.scale.setScalar(1 + pulse);
      b.position.set(
        Math.sin(time + offset) * 0.7,
        Math.cos(time + offset) * 0.7,
        Math.sin(time * 0.5 + offset) * 0.3
      );
      if (b.material instanceof THREE.MeshBasicMaterial) {
        b.material.color.lerp(new THREE.Color(targetColor), 0.1);
      }
    });

    // Rule 4: Unstable Form - Subtly rearrange limb proportions
    this.limbs.forEach((limb, i) => {
      // Shifting lengths
      const shift = Math.sin(time * 0.5 + i) * 0.5;
      limb.currentLength = limb.baseLength + shift;
      
      // Update mesh scale and distal position
      limb.mesh.scale.y = limb.currentLength;
      limb.mesh.position.y = limb.currentLength / 2;
      limb.distal.position.y = limb.currentLength;
      
      // Joint jitter
      const jitter = isHunting ? 0.05 : 0.01;
      limb.group.rotation.x += Math.sin(time * 2 + i) * jitter;
      limb.group.rotation.z += Math.cos(time * 3 + i) * jitter;
      
      // Rule 3: Joints bending wrong
      limb.distal.rotation.x = Math.sin(time + i) * 1.5;
    });

    // Subtle group rotation to make it feel like it's "floating/hanging" (Rule 7)
    this.group.rotation.y += 0.001;
    this.group.rotation.z = Math.sin(time * 0.2) * 0.1;
  }
}
