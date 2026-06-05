
import * as THREE from 'three';

/**
 * ThreadlingVisuals - AAA "Resonance Weaver" Visuals
 * Updated Scale: 5-6 meters total height.
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

    // Central Resonance Hub
    const hubGeo = new THREE.IcosahedronGeometry(0.3, 1);
    const hubMat = new THREE.MeshBasicMaterial({ 
      color: 0x220000, 
      transparent: true, 
      opacity: 0.9,
      wireframe: true
    });
    this.hub = new THREE.Mesh(hubGeo, hubMat);
    this.group.add(this.hub);

    // Resonance Bladders
    const bladderGeo = new THREE.SphereGeometry(0.15, 8, 8);
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

    // 14 Needle Limbs - Scaled for 6m height
    for (let i = 0; i < 14; i++) {
      const limbGroup = new THREE.Group();
      const length = 2.5 + Math.random() * 1.5; // ~4m total reach
      const thickness = 0.015 + Math.random() * 0.01;

      const mainLimbGeo = new THREE.CylinderGeometry(thickness, thickness * 1.5, 1);
      const limbMat = new THREE.MeshBasicMaterial({ color: 0x110000 });
      const mainLimb = new THREE.Mesh(mainLimbGeo, limbMat);
      limbGroup.add(mainLimb);

      const distalGroup = new THREE.Group();
      distalGroup.position.y = 1;
      distalGroup.rotation.x = 0.5 + Math.random();

      const distalLimbGeo = new THREE.CylinderGeometry(thickness * 0.5, 0.002, 1);
      const distalLimb = new THREE.Mesh(distalLimbGeo, limbMat);
      distalLimb.position.y = 0.5;
      distalGroup.add(distalLimb);
      limbGroup.add(distalGroup);

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

  update(position: THREE.Vector3, state: string) {
    this.group.position.copy(position);

    const time = Date.now() * 0.001;
    const isHunting = state === 'HUNTING';

    const targetColor = isHunting ? 0xff0000 : 0x220000;
    if (this.hub.material instanceof THREE.MeshBasicMaterial) {
      this.hub.material.color.lerp(new THREE.Color(targetColor), 0.1);
    }

    this.bladders.forEach((b, i) => {
      const offset = (i * Math.PI * 2) / 3;
      const pulse = Math.sin(time * (isHunting ? 12 : 3) + offset) * 0.1;
      b.scale.setScalar(1 + pulse);
      b.position.set(
        Math.sin(time + offset) * 0.3,
        Math.cos(time + offset) * 0.3,
        Math.sin(time * 0.5 + offset) * 0.1
      );
      if (b.material instanceof THREE.MeshBasicMaterial) {
        b.material.color.lerp(new THREE.Color(targetColor), 0.1);
      }
    });

    this.limbs.forEach((limb, i) => {
      const shift = Math.sin(time * 0.5 + i) * 0.2;
      limb.currentLength = limb.baseLength + shift;
      
      limb.mesh.scale.y = limb.currentLength;
      limb.mesh.position.y = limb.currentLength / 2;
      limb.distal.position.y = limb.currentLength;
      
      const jitter = isHunting ? 0.08 : 0.02;
      limb.group.rotation.x += Math.sin(time * 2 + i) * jitter;
      limb.group.rotation.z += Math.cos(time * 3 + i) * jitter;
      
      limb.distal.rotation.x = Math.sin(time + i) * 1.5;
    });

    this.group.rotation.y += 0.002;
  }
}
