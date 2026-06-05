
import * as THREE from 'three';

/**
 * ClownVisuals - "The Carnival Caller"
 * Recreated accurately from the provided reference image.
 * Features:
 * - Emaciated, 3m tall silhouette
 * - Distorted, stretched permanent smile
 * - Violent, broken puppet head swing
 * - Aged, blood-stained fabric palette
 * - NEW: Psychotic torso folding and backward snapping
 */
export class ClownVisuals {
  public group: THREE.Group;
  private head: THREE.Group;
  private torso: THREE.Group;
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
    
    // Materials (Target Palette: Blood Red, Rust, Dirty White, Decay, Deep Shadow)
    const skinMat = new THREE.MeshBasicMaterial({ color: 0xdcdcdc }); // Pale, cracked skin
    const clothMat = new THREE.MeshBasicMaterial({ color: 0x8b8b8b }); // Aged, dirty ivory
    const bloodMat = new THREE.MeshBasicMaterial({ color: 0x440000 }); // Stained, dried blood
    const decayMat = new THREE.MeshBasicMaterial({ color: 0x221a1a }); // Necrotic shadow
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Hollow cavities

    // 1. Torso (Unnaturally thin and hunched)
    this.torso = new THREE.Group();
    this.torso.position.y = 1.3;
    this.group.add(this.torso);

    const chestGeo = new THREE.CylinderGeometry(0.08, 0.22, 1.5, 6);
    const chest = new THREE.Mesh(chestGeo, clothMat);
    this.torso.add(chest);

    // Ruffled Collar (Decayed ivory)
    const collarGeo = new THREE.TorusGeometry(0.18, 0.04, 8, 20);
    const collar = new THREE.Mesh(collarGeo, clothMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.7;
    this.torso.add(collar);

    // Oversized Buttons (Dried blood)
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), bloodMat);
      btn.position.set(0, 0.5 - i * 0.4, 0.18);
      this.torso.add(btn);
    }

    // 2. Head & Neck (Oversized, distorted)
    this.head = new THREE.Group();
    this.head.position.y = 0.85;
    this.torso.add(this.head);

    // Skull
    const skullGeo = new THREE.IcosahedronGeometry(0.28, 1);
    const skull = new THREE.Mesh(skullGeo, skinMat);
    this.head.add(skull);

    // Hollow Eye Cavities (Deep shadows)
    const eyeGeo = new THREE.PlaneGeometry(0.12, 0.14);
    const leftEye = new THREE.Mesh(eyeGeo, voidMat);
    leftEye.position.set(-0.1, 0.08, 0.25);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, voidMat);
    rightEye.position.set(0.1, 0.08, 0.25);
    this.head.add(rightEye);

    // Stretched Permanent Smile (Exposed teeth, distorted jaw)
    const smileGeo = new THREE.PlaneGeometry(0.4, 0.18);
    const smile = new THREE.Mesh(smileGeo, voidMat);
    smile.position.set(0, -0.15, 0.22);
    smile.rotation.x = 0.15;
    this.head.add(smile);

    // Teeth (Subtle, irregular boxes)
    for(let i=0; i<6; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), skinMat);
      tooth.position.set(-0.12 + (i*0.05), -0.15, 0.23);
      this.head.add(tooth);
    }

    // Pointed Clown Hat (Dried blood with decay stains)
    const hatGeo = new THREE.ConeGeometry(0.15, 0.6, 8);
    this.hat = new THREE.Mesh(hatGeo, bloodMat);
    this.hat.position.y = 0.5;
    this.hat.rotation.x = -0.1;
    this.head.add(this.hat);

    // 3. Limbs (Unnaturally long, skeletal fingers)
    const armLength = 1.9;
    const legLength = 2.0;
    const limbMat = clothMat;

    // Arms
    const lArm = this.createLongLimb(armLength, 0.025, limbMat, decayMat);
    lArm.position.set(-0.35, 0.3, 0);
    lArm.rotation.z = 0.1;
    this.torso.add(lArm);
    this.limbs.push(lArm);

    const rArm = this.createLongLimb(armLength, 0.025, limbMat, decayMat);
    rArm.position.set(0.35, 0.3, 0);
    rArm.rotation.z = -0.1;
    this.torso.add(rArm);
    this.limbs.push(rArm);

    // Legs
    const lLeg = this.createLongLimb(legLength, 0.035, limbMat, decayMat);
    lLeg.position.set(-0.15, -1.4, 0);
    this.group.add(lLeg);
    this.limbs.push(lLeg);

    const rLeg = this.createLongLimb(legLength, 0.035, limbMat, decayMat);
    rLeg.position.set(0.15, -1.4, 0);
    this.group.add(rLeg);
    this.limbs.push(rLeg);

    // Final Scale Check (Aiming for ~3m tall)
    this.group.scale.set(1.1, 1.1, 1.1);
  }

  private createLongLimb(length: number, width: number, mainMat: THREE.Material, endMat: THREE.Material): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(width * 0.7, width, length);
    const mesh = new THREE.Mesh(geo, mainMat);
    
    // Add "sharp" skeletal hand/foot at end
    const endGeo = new THREE.BoxGeometry(width * 3, 0.05, width * 4);
    const endPart = new THREE.Mesh(endGeo, endMat);
    endPart.position.y = -length / 2;
    mesh.add(endPart);
    
    return mesh;
  }

  public update(visible: boolean) {
    if (!visible) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const time = Date.now();
    const seconds = time * 0.001;
    
    // 1. Violent, Broken Head Swing Animation
    if (time - this.lastHeadSwitch > 80 + Math.random() * 150) {
      this.targetYaw = (Math.random() - 0.5) * Math.PI * 1.3;
      this.targetPitch = (Math.random() - 0.5) * 1.1;
      this.lastHeadSwitch = time;
    }

    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 0.35);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, 0.35);

    this.head.rotation.y = this.currentYaw;
    this.head.rotation.x = this.currentPitch;

    // 2. EXTREME TORSO FOLD & BACKWARD SNAP
    // We use a non-linear sine wave to make the collapse feel violent and the snap feel abrupt
    const foldSpeed = 2.8;
    const foldFactor = Math.sin(seconds * foldSpeed);
    
    // Forward Collapse: Fold torso until head is near knees
    // Backward Snap: Arch back unnaturally
    // Bias the wave so it stays in "collapse" longer then snaps back
    let torsoRotationX = 0;
    if (foldFactor > 0) {
      // Forward phase - smoothed for "collapse" feel
      torsoRotationX = Math.pow(foldFactor, 0.8) * (Math.PI / 2.2);
    } else {
      // Backward phase - sharpened for "snap" feel
      torsoRotationX = -Math.pow(Math.abs(foldFactor), 0.5) * (Math.PI / 6);
    }
    
    this.torso.rotation.x = torsoRotationX;

    // 3. High-Frequency Psychotic Twitches
    const twitchFactor = time * 0.035;
    this.torso.rotation.z = Math.sin(twitchFactor * 3.1) * 0.03;
    this.torso.position.x = Math.sin(twitchFactor * 2.5) * 0.015;

    // Adjust torso height slightly during fold to keep feet grounded
    this.torso.position.y = 1.3 - (Math.abs(torsoRotationX) * 0.15);

    this.limbs.forEach((limb, i) => {
      // Finger/limb spasms
      limb.rotation.x += Math.sin(twitchFactor * 4.2 + i) * 0.02;
      
      // Arms should react to the torso fold
      if (i < 2) { // Arms
        // Make arms "hang" or "flail" during the fold
        limb.rotation.x = torsoRotationX * 0.5 + Math.sin(twitchFactor * 5.0 + i) * 0.1;
        limb.position.y = 0.3 + Math.sin(twitchFactor * 5.0 + i) * 0.01;
      } else {
        // Legs knee shake
        limb.rotation.z = Math.sin(twitchFactor * 8.0 + i) * 0.015;
      }
    });
  }
}
