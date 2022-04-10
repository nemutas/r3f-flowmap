import * as THREE from 'three';
import { GPUComputationRenderer, Variable } from 'three/examples/jsm/misc/GPUComputationRenderer';

export class Simulator {
	private _gpuCompute
	private _variables: Variable[] = []
	private _material = new THREE.ShaderMaterial()

	constructor(gl: THREE.WebGLRenderer, private _width: number, private _height: number) {
		this._gpuCompute = new GPUComputationRenderer(this._width, this._height, gl)
		this._setMotionTexture()
		this._setVariableDependencies()
		this._gpuCompute.init()
	}

	private _setMotionTexture = () => {
		// set the default position to texture
		const dataTexture = this._gpuCompute.createTexture()
		const theArray = dataTexture.image.data

		for (let i = 0; i < theArray.length; i += 4) {
			theArray[i + 0] = 0
			theArray[i + 1] = 0
			theArray[i + 2] = 0
			theArray[i + 3] = 0
		}

		// set fragment shader
		const variable = this._gpuCompute.addVariable('motionTexture', fragmentShader, dataTexture)
		variable.wrapS = THREE.RepeatWrapping
		variable.wrapT = THREE.RepeatWrapping

		// set uniforms
		this._material = variable.material
		this._material.uniforms['u_defaultTexture'] = { value: dataTexture.clone() }
		this._material.uniforms['u_mouse_pos'] = { value: new THREE.Vector2() }
		this._material.uniforms['u_range'] = { value: 0 }
		this._material.uniforms['u_viscosity'] = { value: 0 }

		// add variable
		this._variables.push(variable)
	}

	private _setVariableDependencies = () => {
		this._variables.forEach(variable => {
			this._gpuCompute.setVariableDependencies(variable, this._variables)
		})
		// it means.
		// this._gpuCompute.setVariableDependencies(positionVariable, [positionVariable, ...])
	}

	compute = (mouse: THREE.Vector2, range: number, viscosity: number) => {
		this._material.uniforms.u_mouse_pos.value.copy(mouse)
		this._material.uniforms.u_range.value = range
		this._material.uniforms.u_viscosity.value = viscosity
		this._gpuCompute.compute()
	}

	get texture() {
		const variable = this._variables.find(v => v.name === 'motionTexture')!
		const target = this._gpuCompute.getCurrentRenderTarget(variable) as THREE.WebGLRenderTarget
		return target.texture
	}
}

const fragmentShader = `
uniform sampler2D u_defaultTexture;
uniform vec2 u_mouse_pos;
uniform float u_range;
uniform float u_viscosity;

vec2 lerp(vec2 original, vec2 target, float alpha) {
  return original * alpha + target * (1.0 - alpha);
}

void main()	{
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 tmp = texture2D(motionTexture, uv);
  vec4 defTmp = texture2D(u_defaultTexture, uv);

  float dist = 1.0 - smoothstep(0.0, u_range, distance(u_mouse_pos, uv));

  if(0.0 < dist) {
    vec2 speed = u_mouse_pos - tmp.zw;
    vec2 distortion = speed * dist * 5.0;
    tmp.xy += distortion;
  }

  vec4 result;
  result.xy = lerp(defTmp.xy, tmp.xy, u_viscosity);
  result.xy = clamp(result.xy, -1.0, 1.0);
  result.zw = u_mouse_pos;
  
  gl_FragColor = result;
}
`
