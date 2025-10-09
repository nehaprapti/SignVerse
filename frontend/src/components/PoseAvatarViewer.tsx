import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import {
  Box3,
  Vector3,
  Sphere,
  PerspectiveCamera,
  Object3D,
  Group,
  Mesh,
  SkinnedMesh,
  Euler,
  Quaternion,
} from "three";

type Props = {
  glbPath: string;
  animationFrames?: Array<{ joints?: Record<string, number[]> }>;
  play?: boolean;
  targetHeight?: number;
  showControls?: boolean;
  cameraMargin?: number;
  fps?: number;
  jointToBoneMap?: Record<string, string>;
};

export default function PoseAvatarViewer({
  glbPath,
  animationFrames = [],
  play = true,
  targetHeight = 1.6,
  showControls = false,
  cameraMargin = 1.15,
  fps = 30,
  jointToBoneMap = {
    // core head / torso
    nose: "Head",
    // left arm + hand (bones from GLB dump)
    leftShoulder: "LeftShoulder",
    leftElbow: "LeftForeArm",
    leftWrist: "LeftHand",
    leftThumb1: "LeftHandThumb1",
    leftThumb2: "LeftHandThumb2",
    leftThumb3: "LeftHandThumb3",
    leftIndex1: "LeftHandIndex1",
    leftIndex2: "LeftHandIndex2",
    leftIndex3: "LeftHandIndex3",
    leftMiddle1: "LeftHandMiddle1",
    leftMiddle2: "LeftHandMiddle2",
    leftMiddle3: "LeftHandMiddle3",
    leftRing1: "LeftHandRing1",
    leftRing2: "LeftHandRing2",
    leftRing3: "LeftHandRing3",
    leftPinky1: "LeftHandPinky1",
    leftPinky2: "LeftHandPinky2",
    leftPinky3: "LeftHandPinky3",

    // right arm + hand
    rightShoulder: "RightShoulder",
    rightElbow: "RightForeArm",
    rightWrist: "RightHand",
    rightThumb1: "RightHandThumb1",
    rightThumb2: "RightHandThumb2",
    rightThumb3: "RightHandThumb3",
    rightIndex1: "RightHandIndex1",
    rightIndex2: "RightHandIndex2",
    rightIndex3: "RightHandIndex3",
    rightMiddle1: "RightHandMiddle1",
    rightMiddle2: "RightHandMiddle2",
    rightMiddle3: "RightHandMiddle3",
    rightRing1: "RightHandRing1",
    rightRing2: "RightHandRing2",
    rightRing3: "RightHandRing3",
    rightPinky1: "RightHandPinky1",
    rightPinky2: "RightHandPinky2",
    rightPinky3: "RightHandPinky3",
  },
}: Props) {
  const gltf = useGLTF(glbPath) as any;
  const wrapperRef = useRef<Group | null>(null);
  const controlsRef = useRef<any>(null);
  const { camera, size } = useThree();
  const [bonesMap, setBonesMap] = useState<Record<string, Object3D>>({});
  const bindLocalQuatRef = useRef<Record<string, Quaternion>>({});
  const bindDirsRef = useRef<Record<string, Vector3>>({});
  const animRootRef = useRef<Vector3 | null>(null);
  const animToModelScaleRef = useRef<number>(1);
  const frameRef = useRef<number>(0);
  const accumulator = useRef<number>(0);

  // When the incoming animationFrames change, restart playback index and accumulator
  useEffect(() => {
    frameRef.current = 0;
    accumulator.current = 0;
    // when new animation arrives, restore bones to their bind pose quaternions if available
    try {
      Object.keys(bindLocalQuatRef.current).forEach((joint) => {
        const bone = (bonesMap || {})[joint];
        const bindQ = bindLocalQuatRef.current[joint];
        if (bone && bindQ) {
          bone.quaternion.copy(bindQ);
          bone.updateMatrixWorld(true);
        }
      });
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationFrames?.length]);

  const findNodeByName = (root: Object3D, name: string) => {
    const lower = name.toLowerCase();
    let found: Object3D | null = null;
    root.traverse((n) => {
      if (found) return;
      const nm = (n.name || "").toLowerCase();
      if (!nm) return;
      if (nm === lower || nm.includes(lower) || lower.includes(nm)) found = n;
    });
    return found;
  };

  // Map animation joint coords -> model-local coordinates using detected root & scale
  const normalizedToLocal = (joint: number[], modelScale: number) => {
    // If we have an animation root and computed scale, map joints relative to root
    if (animRootRef.current && animToModelScaleRef.current) {
      const root = animRootRef.current;
      const scale = animToModelScaleRef.current;
      // incoming joint coordinate assumed to be [x, y, z] in same space as first frame
      const v = new Vector3(joint[0], joint[1], joint[2]);
      const rel = v.sub(root).multiplyScalar(scale);
      // convert from animation coordinate handedness to model's local space if needed
      // Preserve Y as up, invert Z to match our earlier convention
      return new Vector3(rel.x, rel.y, -rel.z);
    }

    // Fallback: treat values like normalized 0..1 (legacy behavior)
    const x = (joint[0] - 0.5) * modelScale;
    const y = (0.5 - joint[1]) * modelScale;
    const z = -joint[2] * modelScale;
    return new Vector3(x, y, z);
  };

  // Prepare model: center, uniform-scale, frame camera, build bones map & bind quats
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !gltf?.scene) return;

    // --- DEBUG DUMP: list all nodes with full scene path for mapping ---
    try {
      const rows: Array<{ path: string; name: string; type: string }> = [];
      gltf.scene.traverse((n: any) => {
        // build simple path from scene -> ... -> node
        const parts: string[] = [];
        let cur: any = n;
        while (cur) {
          const label = cur.name?.trim() || cur.type || '(anon)';
          parts.unshift(label);
          cur = cur.parent;
          // stop at scene root to keep paths readable
          if (cur === gltf.scene) {
            parts.unshift('scene');
            break;
          }
        }
        const path = parts.join('/');
        rows.push({ path, name: n.name || '(no-name)', type: n.type || typeof n });
      });
      console.groupCollapsed('[PoseAvatarViewer] GLTF node dump (use for jointToBoneMap)');
      console.table(rows);
      // helpful one-line mapping suggestion for copy/paste
      console.log('Suggested mapping lines (joint -> node name):');
      rows.forEach(r => console.log(`"${r.name}" at "${r.path}" (type: ${r.type})`));
      console.groupEnd();
    } catch (e) {
      // keep runtime safe
      console.warn('[PoseAvatarViewer] node dump failed', e);
    }
    // --- end debug dump ---

    // Reset transforms
    wrapper.position.set(0, 0, 0);
    wrapper.rotation.set(0, 0, 0);
    wrapper.scale.set(1, 1, 1);

    // ensure skinned meshes are in bind pose and world matrices updated
    gltf.scene.traverse((n: any) => {
      if ((n as SkinnedMesh).isSkinnedMesh) {
        try {
          (n as SkinnedMesh).skeleton.pose?.();
        } catch {}
      }
      if ((n as Mesh).isMesh) (n as Mesh).updateMatrixWorld(true);
    });
    gltf.scene.updateWorldMatrix(true, true);

    // compute bbox from meshes only
    const bbox = new Box3();
    let anyMesh = false;
    gltf.scene.traverse((n: any) => {
      if (((n as Mesh).isMesh || (n as SkinnedMesh).isSkinnedMesh) && (n as Mesh).geometry) {
        const b = new Box3().setFromObject(n);
        if (!b.isEmpty()) {
          bbox.union(b);
          anyMesh = true;
        }
      }
    });
    if (!anyMesh) bbox.setFromObject(gltf.scene);
    if (bbox.isEmpty()) return;

    // automatic upright selection (try candidate rotations -> choose one with max Y)
    const candidates: Euler[] = [
      new Euler(0, 0, 0),
      new Euler(Math.PI, 0, 0),
      new Euler(-Math.PI / 2, 0, 0),
      new Euler(Math.PI / 2, 0, 0),
      new Euler(0, Math.PI, 0),
    ];
    let best = candidates[0];
    let bestY = -Infinity;
    for (const e of candidates) {
      wrapper.rotation.copy(e);
      wrapper.updateWorldMatrix(true, true);
      const b = new Box3().setFromObject(wrapper);
      const s = new Vector3();
      b.getSize(s);
      if (s.y > bestY) {
        bestY = s.y;
        best = e.clone();
      }
    }
    wrapper.rotation.copy(best);
    wrapper.updateWorldMatrix(true, true);

    // orient to face camera if nose/head available
    const head = findNodeByName(gltf.scene, "head") || findNodeByName(gltf.scene, "neck");
    const nose = findNodeByName(gltf.scene, "nose") || findNodeByName(gltf.scene, "face");
    if (head && nose) {
      const headW = new Vector3();
      const noseW = new Vector3();
      (head as Object3D).getWorldPosition(headW);
      (nose as Object3D).getWorldPosition(noseW);
      const forward = noseW.clone().sub(headW);
      if (forward.z < 0) {
        wrapper.rotation.y += Math.PI;
        wrapper.updateWorldMatrix(true, true);
      }
    }

    // center & uniform-scale so model's height == targetHeight
    const bbox2 = new Box3().setFromObject(wrapper);
    const sizeVec = new Vector3();
    bbox2.getSize(sizeVec);
    const center = new Vector3();
    bbox2.getCenter(center);
    const height = sizeVec.y > 0 ? sizeVec.y : 1;
    const scaleFactor = targetHeight / height;
    // reposition so center -> origin, scale uniformly on wrapper
    wrapper.position.set(-center.x, -center.y, -center.z);
    // ensure GLTF internal scale is 1 to avoid compound non-uniform scaling stretches
    gltf.scene.scale.set(1, 1, 1);
    wrapper.scale.setScalar(scaleFactor);
    wrapper.updateWorldMatrix(true, true);

    // lift model so bottom sits at y=0
    const finalBbox = new Box3().setFromObject(wrapper);
    const min = finalBbox.min.clone();
    wrapper.position.y -= min.y;
    wrapper.updateWorldMatrix(true, true);

    // camera framing
    const finalBbox2 = new Box3().setFromObject(wrapper);
    const finalSphere = new Sphere();
    finalBbox2.getBoundingSphere(finalSphere);
    const cam = camera as PerspectiveCamera;
    const fov = ((cam.fov ?? 50) * Math.PI) / 180;
    const aspect = Math.max(0.1, size.width / Math.max(1, size.height));
    const distanceV = Math.abs(finalSphere.radius / Math.sin(fov / 2));
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const distanceH = Math.abs(finalSphere.radius / Math.sin(hFov / 2));
    const distance = Math.max(distanceV, distanceH) * cameraMargin;
    const offset = new Vector3(0, finalSphere.radius * 0.25, distance);
    cam.position.copy(finalSphere.center.clone().add(offset));
    cam.lookAt(finalSphere.center);
    cam.up.set(0, 1, 0);
    cam.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(finalSphere.center);
      controlsRef.current.update();
    }

    // build bones map and record bind local quaternions & bind directions (do NOT change bone.position)
    const map: Record<string, Object3D> = {};
    Object.entries(jointToBoneMap).forEach(([joint, boneName]) => {
      const found =
        findNodeByName(gltf.scene, boneName) ||
        findNodeByName(gltf.scene, boneName.replace(/[^a-zA-Z]/g, ""));
      if (found) {
        map[joint] = found;
        // store bind local quaternion baseline
        bindLocalQuatRef.current[joint] = (found as Object3D).quaternion.clone();
      }
    });
    // compute bind directions for chains (child position in parent-local) to use as stable baselines
    const chainsForBind = [
      { p: 'leftShoulder', c: 'leftElbow' },
      { p: 'rightShoulder', c: 'rightElbow' },
      { p: 'leftElbow', c: 'leftWrist' },
      { p: 'rightElbow', c: 'rightWrist' },
    ];
    chainsForBind.forEach((ch) => {
      const parentBone = map[ch.p];
      const childBone = map[ch.c];
      if (!parentBone || !childBone) return;
      const childWorld = new Vector3();
      childBone.getWorldPosition(childWorld);
      // convert child world pos into parent-local
      const childLocal = childWorld.clone();
      parentBone.worldToLocal(childLocal);
      const dir = childLocal.clone().normalize();
      bindDirsRef.current[ch.p] = dir;
      // ensure a bind local quaternion exists for parent
      bindLocalQuatRef.current[ch.p] = parentBone.quaternion.clone();
    });
    setBonesMap(map);
    // compute animation -> model scale & root offset based on first animation frame (if available)
    try {
      if (animationFrames && animationFrames.length > 0) {
        const sample = animationFrames[0];
        if (sample && sample.joints) {
          // choose animation root as mid-hip if present, else nose
          const lj = sample.joints['leftHip'];
          const rj = sample.joints['rightHip'];
          let animRoot = null;
          if (lj && rj) {
            animRoot = new Vector3((lj[0] + rj[0]) / 2, (lj[1] + rj[1]) / 2, (lj[2] + rj[2]) / 2);
          } else if (sample.joints['nose']) {
            const n = sample.joints['nose'];
            animRoot = new Vector3(n[0], n[1], n[2]);
          }
          if (animRoot) animRootRef.current = animRoot;

          // compute animation shoulder distance
          const aLS = sample.joints['leftShoulder'];
          const aRS = sample.joints['rightShoulder'];
          let animShoulderDist = 0;
          if (aLS && aRS) {
            const vls = new Vector3(aLS[0], aLS[1], aLS[2]);
            const vrs = new Vector3(aRS[0], aRS[1], aRS[2]);
            animShoulderDist = vls.distanceTo(vrs);
          }

          // compute model shoulder distance (in wrapper-local space)
          let modelShoulderDist = 0;
          const mLS = map['leftShoulder'];
          const mRS = map['rightShoulder'];
          if (mLS && mRS) {
            const wls = new Vector3();
            const wrs = new Vector3();
            mLS.getWorldPosition(wls);
            mRS.getWorldPosition(wrs);
            // convert world positions into wrapper-local so they match where we'll place animation
            wrapper.worldToLocal(wls);
            wrapper.worldToLocal(wrs);
            modelShoulderDist = wls.distanceTo(wrs);
          }

          if (animShoulderDist > 1e-4 && modelShoulderDist > 1e-4) {
            const scale = modelShoulderDist / animShoulderDist;
            animToModelScaleRef.current = scale;
            console.info('[PoseAvatarViewer] computed anim->model scale', scale.toFixed(4), 'model shoulder', modelShoulderDist.toFixed(3), 'anim shoulder', animShoulderDist.toFixed(3));
          } else {
            animToModelScaleRef.current = 1;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Diagnostic: if we have animation frames, print sample joint keys and mapping presence
    try {
      if (animationFrames && animationFrames.length > 0) {
        const sample = animationFrames[0];
        if (sample && sample.joints) {
          console.groupCollapsed('[PoseAvatarViewer] animation diagnostic: sample frame joints & mapping');
          console.info('Sample joint keys:', Object.keys(sample.joints));
          const present: Array<{ joint: string; bone: string | null }> = [];
          Object.keys(sample.joints).forEach((j) => {
            present.push({ joint: j, bone: map[j] ? (map[j].name || String(map[j].type || 'obj')) : null });
          });
          console.table(present);

          // For key chains, show desired vs bind directions
          const chains = [
            { p: 'leftShoulder', c: 'leftElbow', g: 'leftWrist' },
            { p: 'rightShoulder', c: 'rightElbow', g: 'rightWrist' },
          ];
          chains.forEach((ch) => {
            const pj = sample.joints?.[ch.p];
            const cj = sample.joints?.[ch.c];
            // grandchild joint not used in this diagnostic block
            const parentBone = map[ch.p];
            const childBone = map[ch.c];
            if (!pj || !cj || !parentBone || !childBone) return;
            const pLocal = normalizedToLocal(pj as number[], targetHeight);
            const cLocal = normalizedToLocal(cj as number[], targetHeight);
            const pWorld = pLocal.clone();
            const cWorld = cLocal.clone();
            wrapper.localToWorld(pWorld);
            wrapper.localToWorld(cWorld);
            const desiredInParent = cWorld.clone();
            parentBone.worldToLocal(desiredInParent);
            const desiredInParent2 = pWorld.clone();
            parentBone.worldToLocal(desiredInParent2);
            const desiredDir = desiredInParent.clone().sub(desiredInParent2).normalize();
            const bindDir = bindDirsRef.current[ch.p];
            const angleDeg = bindDir ? (bindDir.angleTo(desiredDir) * 180) / Math.PI : null;
            console.log(ch.p, '->', ch.c, 'desiredDir(parent-local):', desiredDir.toArray(), 'bindDir:', bindDir?.toArray(), 'angleDeg:', angleDeg?.toFixed(1));
          });
          console.groupEnd();
        }
      }
    } catch (e) {
      console.warn('[PoseAvatarViewer] diagnostic failed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf?.scene, glbPath, targetHeight, size.width, size.height, cameraMargin]);

  // animation loop: rotation-only retarget (shoulder->elbow->wrist chains), no bone.position edits
  useFrame((_, delta) => {
    if (!animationFrames || animationFrames.length === 0) return;
    const step = 1 / fps;
    if (play) accumulator.current += delta;
    while (accumulator.current >= step) {
      accumulator.current -= step;
      frameRef.current = (frameRef.current + 1) % animationFrames.length;
    }
    const frame = animationFrames[frameRef.current];
    if (!frame?.joints) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // compute auto modelScale used for mapping normalized joints -> local coords
    // use wrapper world height as mapping reference: targetHeight already used so use it here
    const modelScale = targetHeight;

  // temps
  const tmpQ = new Quaternion();
  const targetLocal = new Quaternion();

    // smaller slerp for stability (reduced further)
    const SLERP = 0.18;

    // diagnostic: print sample frame joint keys on first frame to help mapping
    if (frameRef.current === 0 && animationFrames.length > 0) {
      try {
        const sample = animationFrames[0];
        if (sample && sample.joints) {
          console.info('[PoseAvatarViewer] sample frame joint keys:', Object.keys(sample.joints).slice(0, 30));
        }
      } catch (e) {
        // ignore
      }
    }

    const chains = [
      { p: "leftShoulder", c: "leftElbow", g: "leftWrist" },
      { p: "rightShoulder", c: "rightElbow", g: "rightWrist" },
    ];

    for (const ch of chains) {
      const parentBone = bonesMap[ch.p];
      const childBone = bonesMap[ch.c];
      const grandBone = bonesMap[ch.g];
      const pj = frame.joints?.[ch.p];
      const cj = frame.joints?.[ch.c];
      const gj = frame.joints?.[ch.g];
      if (!parentBone || !childBone || !pj || !cj) {
        // log missing mapping once to help user fix jointToBoneMap
        if (!parentBone || !childBone) {
          console.debug('[PoseAvatarViewer] missing bone mapping for chain', ch);
        }
        continue;
      }

      // desired positions in wrapper-local -> convert to parent-local
      const desiredParentLocal = normalizedToLocal(pj as number[], modelScale);
      const desiredChildLocal = normalizedToLocal(cj as number[], modelScale);
      const desiredParentWorld = desiredParentLocal.clone();
      const desiredChildWorld = desiredChildLocal.clone();
      wrapper.localToWorld(desiredParentWorld);
      wrapper.localToWorld(desiredChildWorld);
      // now convert desired child/world into parent-local space
      const desiredChildInParent = desiredChildWorld.clone();
      parentBone.worldToLocal(desiredChildInParent);
      const desiredParentInParent = desiredParentWorld.clone();
      parentBone.worldToLocal(desiredParentInParent);

      const desiredDirLocal = desiredChildInParent.clone().sub(desiredParentInParent).normalize();
      if (desiredDirLocal.length() === 0) continue;

      // bind direction baseline in parent-local
      const bindDir = bindDirsRef.current[ch.p];
      const bindLocalQ = bindLocalQuatRef.current[ch.p] ?? parentBone.quaternion.clone();
      if (!bindDir) continue;

      // rotation from bindDir -> desiredDir in parent-local
      tmpQ.setFromUnitVectors(bindDir.clone().normalize(), desiredDirLocal.clone().normalize());

      // target local quaternion = bindLocalQ * tmpQ
      targetLocal.copy(bindLocalQ).multiply(tmpQ);

      // guard: ensure quaternion components are finite
      const validQuat = Number.isFinite(targetLocal.x) && Number.isFinite(targetLocal.y) && Number.isFinite(targetLocal.z) && Number.isFinite(targetLocal.w);
      if (!validQuat) {
        console.warn('[PoseAvatarViewer] invalid target quaternion, skipping', ch);
        continue;
      }

      // slerp in local space for stability
      parentBone.quaternion.slerp(targetLocal, SLERP);
      parentBone.updateMatrixWorld(true);

      // child alignment toward grandchild (parent-local -> child-local similar approach)
      if (grandBone && gj) {
        const desiredGrandLocal = normalizedToLocal(gj as number[], modelScale);
        const desiredGrandWorld = desiredGrandLocal.clone();
        wrapper.localToWorld(desiredGrandWorld);
        const desiredGrandInChild = desiredGrandWorld.clone();
        childBone.worldToLocal(desiredGrandInChild);
        // derive bindDir for child if missing
        let childBindDir = bindDirsRef.current[ch.c];
        if (!childBindDir) {
          const gWorld = new Vector3();
          grandBone.getWorldPosition(gWorld);
          const cWorld = new Vector3();
          childBone.getWorldPosition(cWorld);
          const tmpLocal = gWorld.clone();
          childBone.worldToLocal(tmpLocal);
          childBindDir = tmpLocal.clone().normalize();
          bindDirsRef.current[ch.c] = childBindDir;
          bindLocalQuatRef.current[ch.c] = childBone.quaternion.clone();
        }
        if (childBindDir) {
          tmpQ.setFromUnitVectors(childBindDir.clone().normalize(), desiredGrandInChild.clone().normalize());
          const childBindQ = bindLocalQuatRef.current[ch.c] ?? childBone.quaternion.clone();
          const targetChildLocal = childBindQ.clone().multiply(tmpQ);
          const validChildQuat = Number.isFinite(targetChildLocal.x) && Number.isFinite(targetChildLocal.y) && Number.isFinite(targetChildLocal.z) && Number.isFinite(targetChildLocal.w);
          if (!validChildQuat) {
            console.warn('[PoseAvatarViewer] invalid child target quat, skipping child alignment', ch);
          } else {
            childBone.quaternion.slerp(targetChildLocal, SLERP);
            childBone.updateMatrixWorld(true);
          }
        }
      }
    }

    // DO NOT set bone.position on skinned bones (prevents stretching).
    // For any extra mapped non-skeletal helpers you may set position gently (not recommended).
  });

  return (
    <Suspense fallback={null}>
      <group ref={wrapperRef}>
        {gltf?.scene && <primitive object={gltf.scene} />}
      </group>

      {showControls && (
        <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={0.1} maxDistance={50} />
      )}
    </Suspense>
  );
}

// safe preload no-op
try {
  // @ts-ignore
  if (typeof useGLTF?.preload === "function") useGLTF.preload("");
} catch {
  /* ignore */
}
