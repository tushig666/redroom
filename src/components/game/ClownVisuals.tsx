
import * as THREE from 'three';

/**
 * ClownVisuals - "The Carnival Caller"
 * Recreated accurately from the provided reference image.
 * Features erratic, non-human head swinging and emaciated proportions.
 */
export class ClownVisuals {
  public group: THREE.Group;
  private head: THREE.Group;
  private torso: THREE.Mesh;
  private hat: THREE.Mesh;
  private limbs: THREE.Mesh[] = [];
  
  // Animation state
  private lastHeadSwitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private currentYaw = 0;
  private currentPitch = 0;

  constructor() {
    this.group = new THREE.Group();
    
    // Materials
    const skinMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee }); // Pale cracked skin
    const clothMat = new THREE.MeshBasicMaterial({ color: 0xdddddd }); // Dirty off-white
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0x440000 }); // Stained blood
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Hollow eyes/mouth

    // 1. Torso (Emaciated, slightly hunched)
    const torsoGeo = new THREE.CylinderGeometry(0.1, 0.25, 1.4, 6);
    this.torso = new THREE.Mesh(torsoGeo, clothMat);
    this.torso.position.y = 1.2;
    this.group.add(this.torso);

    // Buttons (Oversized)
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bloodMat);
      btn.position.set(0, 0.4 - i * 0.4, 0.2);
      this.torso.add(btn);
    }

    // 2. Head & Neck
    this.head = new THREE.Group();
    this.head.position.y = 0.8;
    this.torso.add(this.head);

    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), skinMat);
    this.head.add(skull);

    // Hollow Eyes
    const eyeGeo = new THREE.PlaneGeometry(0.1, 0.12);
    const leftEye = new THREE.Mesh(eyeGeo, voidMat);
    leftEye.position.set(-0.08, 0.05, 0.22);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, voidMat);
    rightEye.position.set(0.08, 0.05, 0.22);
    this.head.add(rightEye);

    // Stretched Smile
    const smileGeo = new THREE.PlaneGeometry(0.35, 0.15);
    const smile = new THREE.Mesh(smileGeo, voidMat);
    smile.position.set(0, -0.12, 0.2);
    smile.rotation.x = 0.2;
    this.head.add(smile);

    // Pointed Hat
    const hatGeo = new THREE.ConeGeometry(0.15, 0.5, 8);
    this.hat = new THREE.Mesh(hatGeo, bloodMat);
    this.hat.position.y = 0.45;
    this.head.add(this.hat);

    // 3. Limbs (Unnaturally long)
    const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6);
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8);

    // Left Arm
    const lArm = new THREE.Mesh(armGeo, clothMat);
    lArm.position.set(-0.3, 0.2, 0);
    lArm.rotation.z = 0.2;
    this.torso.add(lArm);
    this.limbs.push(lArm);

    // Right Arm
    const rArm = new THREE.Mesh(armGeo, clothMat);
    rArm.position.set(0.3, 0.2, 0);
    rArm.rotation.z = -0.2;
    this.torso.add(rArm);
    this.limbs.push(rArm);

    // Legs
    const lLeg = new THREE.Mesh(legGeo, clothMat);
    lLeg.position.set(-0.15, -1.2, 0);
    this.group.add(lLeg);
    this.limbs.push(lLeg);

    const rLeg = new THREE.Mesh(legGeo, clothMat);
    rLeg.position.set(0.15, -1.2, 0);
    this.group.add(rLeg);
    this.limbs.push(rLeg);

    // Initial scale: ~3m tall
    this.group.scale.set(1.2, 1.2, 1.2);
  }

  public update(visible: boolean) {
    if (!visible) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const time = Date.now();
    
    // 1. Violent Head Swing Logic
    // Every 100-300ms, pick a new extreme angle
    if (time - this.lastHeadSwitch > 100 + Math.random() * 200) {
      this.targetYaw = (Math.random() - 0.5) * Math.PI * 1.1; // ~ -90 to +90
      this.targetPitch = (Math.random() - 0.5) * 0.8;
      this.lastHeadSwitch = time;
    }

    // Smooth but fast interpolation
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 0.4);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, 0.4);

    this.head.rotation.y = this.currentYaw;
    this.head.rotation.x = this.currentPitch;

    // 2. Body/Limb Twitching
    const twitchTime = time * 0.02;
    this.torso.rotation.z = Math.sin(twitchTime * 2) * 0.02;
    this.torso.position.x = Math.sin(twitchTime * 1.5) * 0.01;

    this.limbs.forEach((limb, i) => {
      limb.rotation.x += Math.sin(twitchTime + i) * 0.01;
      limb.scale.y = 1 + Math.sin(twitchTime * 5 + i) * 0.005;
    });
  }
}
