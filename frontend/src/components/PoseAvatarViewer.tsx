import React, { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

type JointMap = { [jointName: string]: string }

type PoseFrame = {
  frame?: number
  joints?: { [jointName: string]: [number, number, number] }
  video?: string
}

type Props = {
  glbPath: string
  animationFrames?: PoseFrame[]
  play?: boolean
  jointMap?: JointMap
  scale?: number
}

const defaultJointToBone: JointMap = {
  nose: 'Head',
  leftShoulder: 'LeftShoulder',
  rightShoulder: 'RightShoulder',
  leftElbow: 'LeftArm',
  rightElbow: 'RightArm',
  leftWrist: 'LeftHand',
  rightWrist: 'RightHand',
  leftHip: 'LeftUpLeg',
  rightHip: 'RightUpLeg'
}

export default function PoseAvatarViewer({ glbPath, animationFrames = [], play = false, jointMap = defaultJointToBone, scale = 2 }: Props) {
  const group = useRef<THREE.Group | null>(null)
  const { scene } = useGLTF(glbPath) as any
  const { camera } = useThree()

  // center and scale scene to fit the view
  useEffect(() => {
    if (!scene) return
    try {
      // compute original bbox & center
      const bbox = new THREE.Box3().setFromObject(scene)
      const size = new THREE.Vector3()
      bbox.getSize(size)
      const center = new THREE.Vector3()
      bbox.getCenter(center)

      // move the model so its center is at the origin BEFORE scaling
      scene.position.x = -center.x
      scene.position.y = -center.y
      scene.position.z = -center.z

      // scale model to a reasonable target height
      const targetHeight = 1.6 // meters - desired avatar height
      const maxDim = Math.max(size.x, size.y, size.z)
      if (maxDim > 0) {
        const s = targetHeight / maxDim
        scene.scale.setScalar(s)
      }

      // rotate model to face camera consistently
      scene.rotation.y = Math.PI

      // recompute bbox after transform
      const framedBox = new THREE.Box3().setFromObject(scene)
      const framedSphere = framedBox.getBoundingSphere(new THREE.Sphere())

      // place model so its lowest point sits at y=0 (ground)
      const min = framedBox.min
      const yOffset = min.y
      scene.position.y -= yOffset

      // position camera to fit the model based on its bounding sphere
      if (camera && framedSphere.radius > 0) {
        const perspective = camera as THREE.PerspectiveCamera
        const fov = ((perspective.fov as number) || 50) * (Math.PI / 180)
        // distance so that sphere fits within vertical fov, add margin
        const distance = Math.abs(framedSphere.radius / Math.sin(fov / 2)) + 0.5
        camera.position.set(framedSphere.center.x, framedSphere.center.y + framedSphere.radius * 0.2, framedSphere.center.z + distance)
        camera.lookAt(framedSphere.center)
        camera.updateProjectionMatrix()
      }
    } catch (e) {
      // ignore bbox errors
      console.warn('Could not compute bounding box for GLTF scene', e)
    }
  }, [scene])

  // find bones by name
  const bonesRef = useRef<{ [boneName: string]: THREE.Object3D }>({})
  useEffect(() => {
    if (!scene) return
    Object.values(jointMap).forEach((boneName) => {
      const bone = scene.getObjectByName(boneName)
      if (bone) bonesRef.current[boneName] = bone
    })
  }, [scene, jointMap])

  // playback state
  const frameIndex = useRef(0)
  useFrame(() => {
    if (!play || !animationFrames || animationFrames.length === 0) return
    const frame = animationFrames[frameIndex.current]
    if (!frame) return

    // frame.joints is { jointName: [x,y,z] }
    Object.entries(frame.joints || {}).forEach(([jointName, coords]) => {
      const boneName = jointMap[jointName]
      const bone = bonesRef.current[boneName]
      if (bone && coords && coords.length >= 3) {
        // coords are normalized [0..1] — map them to model space with scale
        bone.position.set(coords[0] * scale, coords[1] * scale, coords[2] * scale)
      }
    })

    frameIndex.current = (frameIndex.current + 1) % animationFrames.length
  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

// preload not used - model path is passed in via props
