import { useMemo, useRef, VFC } from 'react';
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { useFrame, useThree } from '@react-three/fiber';
import { GUIController } from '../../../modules/gui';
import { Simulator } from './simulator';

const datas = {
	enabled: true,
	power: 0.3,
	range: 0.1,
	viscosity: 0.04,
	rgbShift: true
}

export const FlowmapPass: VFC = () => {
	const passRef = useRef<ShaderPass>(null)

	const gui = GUIController.instance.setFolder('Flowmap')
	gui.addCheckBox(datas, 'enabled')
	gui.addNumericSlider(datas, 'power', 0.1, 0.5, 0.01)
	gui.addNumericSlider(datas, 'range', 0.1, 0.2, 0.01)
	gui.addNumericSlider(datas, 'viscosity', 0.01, 0.1, 0.01)
	gui.addCheckBox(datas, 'rgbShift', 'RGB Shift')

	const { gl, size } = useThree()
	const simulator = useMemo(() => new Simulator(gl, size.width, size.height), [])
	// pixel effect
	// const simulator = useMemo(() => new Simulator(gl, 100, 50), [gl])

	const shader: THREE.Shader = {
		uniforms: {
			tDiffuse: { value: null },
			u_motionTexture: { value: null },
			u_powar: { value: datas.power },
			u_shift: { value: datas.rgbShift }
		},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader
	}

	const normalizedMouse = new THREE.Vector2()
	const defPos = new THREE.Vector2(0, 0)
	useFrame(({ mouse }) => {
		passRef.current!.enabled = datas.enabled

		if (datas.enabled) {
			// Normalize to 0 ~ 1
			if (mouse.equals(defPos)) {
				normalizedMouse.set(0, 0)
			} else {
				normalizedMouse.set((mouse.x + 1) / 2, (mouse.y + 1) / 2)
			}
			simulator.compute(normalizedMouse, datas.range, datas.viscosity)
			passRef.current!.uniforms.u_motionTexture.value = simulator.texture
			passRef.current!.uniforms.u_powar.value = datas.power
			passRef.current!.uniforms.u_shift.value = datas.rgbShift
		}
	})

	return <shaderPass ref={passRef} attachArray="passes" args={[shader]} />
}

const vertexShader = `
varying vec2 v_uv;

void main() {
  v_uv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform sampler2D u_motionTexture;
uniform float u_powar;
uniform bool u_shift;

varying vec2 v_uv;

void main() {
  vec4 motionTexture = texture2D(u_motionTexture, v_uv);
  vec2 uv = v_uv + -motionTexture.xy * u_powar;
  vec4 tex = texture2D(tDiffuse, uv);

  if (u_shift) {
    vec2 uv_r = v_uv + -motionTexture.xy * u_powar * 0.5;
    vec2 uv_g = v_uv + -motionTexture.xy * u_powar * 0.75;
    vec2 uv_b = v_uv + -motionTexture.xy * u_powar * 1.0;
    float tex_r = texture2D(tDiffuse, uv_r).r;
    float tex_g = texture2D(tDiffuse, uv_g).g;
    float tex_b = texture2D(tDiffuse, uv_b).b;
    tex = vec4(tex_r, tex_g, tex_b, tex.a);
  }
  
  gl_FragColor = tex;
  // gl_FragColor = vec4(motionTexture.xy, 0.0, 1.0);
}
`
