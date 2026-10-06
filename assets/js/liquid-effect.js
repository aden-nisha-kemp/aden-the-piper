/**
 * Liquid Mask Effect - Navier-Stokes WebGL Fluid Simulation
 * Replicating the exact cursor effect from https://kern-template.framer.website/
 */
(function(window, document) {
  'use strict';

  function initLiquidMask(options) {
    const canvas = options.canvas || document.getElementById('stage');
    if (!canvas) return null;

    const container = options.container || canvas.parentElement;
    if (!container) return null;

    if (typeof THREE === 'undefined') {
      console.warn('Three.js is required for LiquidMaskEffect');
      return null;
    }

    // Parameters matching Kern template
    const config = {
      circleBoost: options.circleBoost !== undefined ? options.circleBoost : 0.6,
      curl: options.curl !== undefined ? options.curl : 30,
      splatRadius: options.splatRadius !== undefined ? options.splatRadius : 0.07,
      velocityDissipation: options.velocityDissipation !== undefined ? options.velocityDissipation : 0.99,
      shrinkTimeSeconds: options.shrinkTimeSeconds !== undefined ? options.shrinkTimeSeconds : 3.2,
      pressureIterations: options.pressureIterations !== undefined ? options.pressureIterations : 25,
      texture: options.texture !== undefined ? options.texture : 0.7,
      timeSpeed: options.timeSpeed !== undefined ? options.timeSpeed : 5,
      radius: options.radius !== undefined ? options.radius : 100,
      blur: options.blur !== undefined ? options.blur : 0.5,
      frontImageSrc: options.frontImageSrc || './assets/images/piper.jpg',
      parallax: options.parallax || false,
      parallaxAmount: options.parallaxAmount || 0,
      parallaxSmoothing: options.parallaxSmoothing || 0
    };

    // Mapping formulas from Framer
    const L = (e) => 10 + (e - 10) * (190 / 990);
    const R = (e) => 0.2 + e * 2.8;
    const z = (e) => 0.5 + e * 3.5;
    const te = (e) => e * 0.1;
    const ne = (e) => ({
      freq: 2 + e * 12,
      strength: e * 3,
      size: 1 - e * 0.7
    });

    const texConfig = ne(config.texture);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0, 0);

    const scene = new THREE.Scene();
    let width = Math.max(container.clientWidth, 300);
    let height = Math.max(container.clientHeight, 200);
    renderer.setSize(width, height, false);

    const camera = new THREE.PerspectiveCamera(
      (180 * (2 * Math.atan(height / 2 / 800))) / Math.PI,
      width / height,
      1,
      5000
    );
    camera.position.set(0, 0, 800);

    // Load front image texture
    const textureLoader = new THREE.TextureLoader();
    let frontImageAspect = 1.0;
    const frontTexture = textureLoader.load(config.frontImageSrc, (tex) => {
      if (tex.image && tex.image.height > 0) {
        frontImageAspect = tex.image.width / tex.image.height;
        if (uniforms && uniforms.u_frontImageAspect) {
          uniforms.u_frontImageAspect.value = frontImageAspect;
        }
      }
    });
    frontTexture.minFilter = THREE.LinearFilter;
    frontTexture.magFilter = THREE.LinearFilter;
    frontTexture.generateMipmaps = false;

    // Fluid simulation render targets
    const simScale = 0.5;
    let simW = Math.max(1, Math.floor(width * simScale));
    let simH = Math.max(1, Math.floor(height * simScale));

    const gl = renderer.getContext();
    let targetType = THREE.HalfFloatType;
    if (!renderer.capabilities.isWebGL2 && !gl.getExtension('OES_texture_half_float')) {
      targetType = gl.getExtension('OES_texture_float') ? THREE.FloatType : THREE.UnsignedByteType;
    }

    const targetOpts = {
      type: targetType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false
    };

    function createTarget(w, h) {
      return new THREE.WebGLRenderTarget(w, h, targetOpts);
    }

    let vel0 = createTarget(simW, simH);
    let vel1 = createTarget(simW, simH);
    let divergenceTarget = createTarget(simW, simH);
    let pressure0 = createTarget(simW, simH);
    let pressure1 = createTarget(simW, simH);
    let density0 = createTarget(simW, simH);
    let density1 = createTarget(simW, simH);

    function disposeTargets() {
      vel0.dispose();
      vel1.dispose();
      divergenceTarget.dispose();
      pressure0.dispose();
      pressure1.dispose();
      density0.dispose();
      density1.dispose();
    }

    function resizeTargets(w, h) {
      const nw = Math.max(1, Math.floor(w * simScale));
      const nh = Math.max(1, Math.floor(h * simScale));
      if (nw !== simW || nh !== simH) {
        simW = nw;
        simH = nh;
        disposeTargets();
        vel0 = createTarget(simW, simH);
        vel1 = createTarget(simW, simH);
        divergenceTarget = createTarget(simW, simH);
        pressure0 = createTarget(simW, simH);
        pressure1 = createTarget(simW, simH);
        density0 = createTarget(simW, simH);
        density1 = createTarget(simW, simH);
      }
    }

    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2, 1, 1);
    const simScene = new THREE.Scene();
    const simMesh = new THREE.Mesh(quadGeo);
    simScene.add(simMesh);

    const texelSize = new THREE.Vector2(1 / simW, 1 / simH);

    // Uniforms for display material
    const uniforms = {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_progress: { value: 0 },
      u_planeRes: { value: new THREE.Vector2(width, height) },
      u_radius: { value: L(config.radius) },
      u_blur: { value: R(config.blur) },
      u_circleBoost: { value: z(config.circleBoost) },
      u_noiseFreq: { value: texConfig.freq },
      u_noiseStrength: { value: texConfig.strength },
      u_noiseSize: { value: texConfig.size },
      u_timeSpeed: { value: te(config.timeSpeed) },
      u_frontImage: { value: frontTexture },
      u_frontImageAspect: { value: frontImageAspect },
      u_containerAspect: { value: width / height },
      u_parallaxOffset: { value: new THREE.Vector2(0, 0) },
      u_parallaxMax: { value: config.parallax ? Math.max(0, Math.min(200, config.parallaxAmount || 0)) : 0 },
      u_windowSize: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_containerOffset: { value: new THREE.Vector2(0, 0) },
      u_simResolution: { value: new THREE.Vector2(simW, simH) },
      u_densityTex: { value: density0.texture }
    };

    // Shaders
    const quadVertShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const advectFragShader = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D u_velocity;
      uniform sampler2D u_source;
      uniform vec2 u_texelSize;
      uniform float u_dt;
      uniform float u_dissipationMultiply;
      void main() {
        vec2 vel = texture2D(u_velocity, vUv).xy;
        vec2 pos = vUv - vel * u_texelSize * u_dt;
        gl_FragColor = texture2D(u_source, pos) * u_dissipationMultiply;
      }
    `;

    const splatVelMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 u_point;
        uniform vec2 u_splatColor;
        uniform float u_radius;
        uniform float u_aspectRatio;
        uniform sampler2D u_target;
        void main() {
          vec2 p = vUv - u_point;
          p.x *= max(u_aspectRatio, 1.0);
          p.y *= max(1.0 / u_aspectRatio, 1.0);
          float splat = exp(-dot(p, p) / (u_radius * u_radius));
          vec4 base = texture2D(u_target, vUv);
          base.xy += splat * u_splatColor;
          gl_FragColor = base;
        }
      `,
      uniforms: {
        u_point: { value: new THREE.Vector2(0.5, 0.5) },
        u_splatColor: { value: new THREE.Vector2(0, 0) },
        u_radius: { value: 0.02 },
        u_aspectRatio: { value: 1.0 },
        u_target: { value: vel0.texture }
      },
      depthWrite: false
    });

    const splatDensityMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 u_point;
        uniform float u_radius;
        uniform float u_aspectRatio;
        uniform float u_densityAmount;
        uniform sampler2D u_target;
        void main() {
          vec2 p = vUv - u_point;
          p.x *= max(u_aspectRatio, 1.0);
          p.y *= max(1.0 / u_aspectRatio, 1.0);
          float splat = exp(-dot(p, p) / (u_radius * u_radius));
          float base = texture2D(u_target, vUv).r;
          gl_FragColor = vec4(base + splat * u_densityAmount, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        u_point: { value: new THREE.Vector2(0.5, 0.5) },
        u_radius: { value: 0.02 },
        u_aspectRatio: { value: 1.0 },
        u_densityAmount: { value: 1.0 },
        u_target: { value: density0.texture }
      },
      depthWrite: false
    });

    const advectMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: advectFragShader,
      uniforms: {
        u_velocity: { value: vel0.texture },
        u_source: { value: vel0.texture },
        u_texelSize: { value: texelSize.clone() },
        u_dt: { value: 1.0 },
        u_dissipationMultiply: { value: 0.99 }
      },
      depthWrite: false
    });

    const divergenceMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_velocity;
        uniform vec2 u_texelSize;
        void main() {
          float L = texture2D(u_velocity, vUv - vec2(u_texelSize.x, 0.0)).x;
          float R = texture2D(u_velocity, vUv + vec2(u_texelSize.x, 0.0)).x;
          float T = texture2D(u_velocity, vUv + vec2(0.0, u_texelSize.y)).y;
          float B = texture2D(u_velocity, vUv - vec2(0.0, u_texelSize.y)).y;
          float div = 0.5 * ((R - L) + (T - B));
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        u_velocity: { value: vel0.texture },
        u_texelSize: { value: texelSize.clone() }
      },
      depthWrite: false
    });

    const pressureMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_pressure;
        uniform sampler2D u_divergence;
        uniform vec2 u_texelSize;
        void main() {
          float L = texture2D(u_pressure, vUv - vec2(u_texelSize.x, 0.0)).r;
          float R = texture2D(u_pressure, vUv + vec2(u_texelSize.x, 0.0)).r;
          float T = texture2D(u_pressure, vUv + vec2(0.0, u_texelSize.y)).r;
          float B = texture2D(u_pressure, vUv - vec2(0.0, u_texelSize.y)).r;
          float C = texture2D(u_divergence, vUv).r;
          float p = (L + R + T + B - C) * 0.25;
          gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        u_pressure: { value: pressure0.texture },
        u_divergence: { value: divergenceTarget.texture },
        u_texelSize: { value: texelSize.clone() }
      },
      depthWrite: false
    });

    const gradSubMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_velocity;
        uniform sampler2D u_pressure;
        uniform vec2 u_texelSize;
        void main() {
          float L = texture2D(u_pressure, vUv - vec2(u_texelSize.x, 0.0)).r;
          float R = texture2D(u_pressure, vUv + vec2(u_texelSize.x, 0.0)).r;
          float T = texture2D(u_pressure, vUv + vec2(0.0, u_texelSize.y)).r;
          float B = texture2D(u_pressure, vUv - vec2(0.0, u_texelSize.y)).r;
          vec2 vel = texture2D(u_velocity, vUv).xy;
          vel.x -= 0.5 * (R - L);
          vel.y -= 0.5 * (T - B);
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `,
      uniforms: {
        u_velocity: { value: vel0.texture },
        u_pressure: { value: pressure0.texture },
        u_texelSize: { value: texelSize.clone() }
      },
      depthWrite: false
    });

    const curlMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D u_velocity;
        uniform vec2 u_texelSize;
        uniform float u_curl;
        void main() {
          float vL = texture2D(u_velocity, vUv - vec2(u_texelSize.x, 0.0)).y;
          float vR = texture2D(u_velocity, vUv + vec2(u_texelSize.x, 0.0)).y;
          float vT = texture2D(u_velocity, vUv + vec2(0.0, u_texelSize.y)).x;
          float vB = texture2D(u_velocity, vUv - vec2(0.0, u_texelSize.y)).x;
          float curl = (vR - vL) - (vT - vB);
          vec2 vel = texture2D(u_velocity, vUv).xy;
          float strength = u_curl * 0.00015;
          vel.x += strength * (vT - vB);
          vel.y += strength * (vL - vR);
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `,
      uniforms: {
        u_velocity: { value: vel0.texture },
        u_texelSize: { value: texelSize.clone() },
        u_curl: { value: config.curl }
      },
      depthWrite: false
    });

    const densityDissipMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertShader,
      fragmentShader: advectFragShader,
      uniforms: {
        u_velocity: { value: vel0.texture },
        u_source: { value: density0.texture },
        u_texelSize: { value: texelSize.clone() },
        u_dt: { value: 1.0 },
        u_dissipationMultiply: { value: 0.93 }
      },
      depthWrite: false
    });

    // Display Mesh and Material
    const displayGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform float u_progress;
        uniform vec2 u_planeRes;
        uniform float u_radius;
        uniform float u_blur;
        uniform float u_circleBoost;
        uniform float u_noiseFreq;
        uniform float u_noiseStrength;
        uniform float u_noiseSize;
        uniform float u_timeSpeed;
        uniform sampler2D u_frontImage;
        uniform float u_frontImageAspect;
        uniform float u_containerAspect;
        uniform vec2 u_windowSize;
        uniform vec2 u_containerOffset;
        uniform vec2 u_parallaxOffset;
        uniform float u_parallaxMax;
        uniform sampler2D u_densityTex;

        // Simplex noise 3D (Ashima Arts)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vec2 uv = vUv;
          float density = texture2D(u_densityTex, uv).r * u_circleBoost * u_progress;

          // Noise for liquid texture edges
          float offx = uv.x + (u_time * u_timeSpeed * 0.1) + sin(uv.y + u_time * u_timeSpeed * 0.1);
          float offy = uv.y - cos(u_time * u_timeSpeed * 0.001) * 0.01;
          float effectiveNoiseFreq = u_noiseFreq / u_noiseSize;
          float n1 = snoise(vec3(offx * effectiveNoiseFreq, offy * effectiveNoiseFreq, u_time * u_timeSpeed)) - 1.0;
          float n2 = snoise(vec3(offx * effectiveNoiseFreq * 0.5, offy * effectiveNoiseFreq * 0.5, u_time * u_timeSpeed * 0.7)) - 1.0;
          float n = (n1 + n2 * 0.5) * 0.7;

          float finalMask = smoothstep(0.35, 0.55, (n * u_noiseStrength) + pow(density, 1.5));

          // Responsive UV mapping for front image
          vec2 responsiveUV = uv;
          if (u_frontImageAspect > 0.0 && u_containerAspect > 0.0) {
            if (u_frontImageAspect > u_containerAspect) {
              float scale = u_frontImageAspect / u_containerAspect;
              responsiveUV.x = (uv.x - 0.5) / scale + 0.5;
            } else {
              float scale = u_containerAspect / u_frontImageAspect;
              responsiveUV.y = (uv.y - 0.5) / scale + 0.5;
            }
          }

          vec2 inset = u_parallaxMax / u_planeRes;
          vec2 baseUV = inset + responsiveUV * (1.0 - 2.0 * inset);
          vec2 parallaxUV = u_parallaxOffset / u_planeRes;
          vec2 sampleUV = baseUV + parallaxUV;

          vec4 frontColor = texture2D(u_frontImage, sampleUV);
          float outAlpha = frontColor.a * finalMask;
          if (outAlpha < 0.01) outAlpha = 0.0;

          gl_FragColor = vec4(frontColor.rgb, outAlpha);
        }
      `,
      transparent: true
    });

    const displayMesh = new THREE.Mesh(displayGeo, displayMaterial);
    scene.add(displayMesh);

    function updateSize() {
      const w = Math.max(container.clientWidth, 2);
      const h = Math.max(container.clientHeight, 2);
      displayMesh.position.set(0, 0, 0);
      displayMesh.scale.set(w, h, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.position.z = 800;
      camera.lookAt(0, 0, 0);

      uniforms.u_planeRes.value.set(w, h);
      uniforms.u_windowSize.value.set(window.innerWidth, window.innerHeight);
      const rect = container.getBoundingClientRect();
      uniforms.u_containerOffset.value.set(rect.left, rect.top);
      const aspect = w / h;
      uniforms.u_containerAspect.value = aspect;

      resizeTargets(w, h);
      texelSize.set(1 / simW, 1 / simH);
      uniforms.u_simResolution.value.set(simW, simH);
    }
    updateSize();

    // Mouse tracking & physics loop
    const clock = new THREE.Clock();
    let animId = null;
    let targetProgress = 0;
    const mousePos = { x: 0.5, y: 0.5 };
    const prevMousePos = { x: 0.5, y: 0.5 };
    const mouseDelta = { x: 0, y: 0 };
    const parallaxTarget = new THREE.Vector2(0, 0);

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1 - (e.clientY - rect.top) / rect.height;

      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        targetProgress = 1.0;
        const cx = Math.max(0, Math.min(1, nx));
        const cy = Math.max(0, Math.min(1, ny));
        uniforms.u_mouse.value.set(cx, cy);

        if (config.parallax && uniforms.u_parallaxMax.value > 0) {
          parallaxTarget.set((cx - 0.5) * 2 * uniforms.u_parallaxMax.value, (cy - 0.5) * 2 * uniforms.u_parallaxMax.value);
        }
      } else {
        targetProgress = 0.0;
        parallaxTarget.set(0, 0);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0]);
      }
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    // Main render loop
    function animate() {
      animId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      uniforms.u_time.value += dt;

      // Mouse delta calculation
      const currentMouse = uniforms.u_mouse.value;
      mouseDelta.x = currentMouse.x - prevMousePos.x;
      mouseDelta.y = currentMouse.y - prevMousePos.y;
      prevMousePos.x = currentMouse.x;
      prevMousePos.y = currentMouse.y;

      const w = Math.max(container.clientWidth, 2);
      const h = Math.max(container.clientHeight, 2);
      const aspect = w / h;
      uniforms.u_containerAspect.value = aspect;

      // Parallax update
      if (!config.parallax) {
        uniforms.u_parallaxOffset.value.set(0, 0);
      } else {
        const smooth = Math.max(0, Math.min(1, config.parallaxSmoothing || 0));
        if (smooth === 0) {
          uniforms.u_parallaxOffset.value.copy(parallaxTarget);
        } else {
          const factor = 1 - Math.exp(-dt / Math.max(1e-6, 0.04 + 0.21 * smooth));
          uniforms.u_parallaxOffset.value.lerp(parallaxTarget, factor);
        }
      }

      const splatRad = Math.max(0.005, config.splatRadius);
      const velDissip = Math.max(0.9, Math.min(1, config.velocityDissipation));
      const shrinkDissip = Math.pow(0.01, 1 / (60 * Math.max(0.5, Math.min(10, config.shrinkTimeSeconds))));
      const pressIter = Math.max(10, Math.min(50, Math.round(config.pressureIterations)));

      texelSize.set(1 / simW, 1 / simH);
      advectMaterial.uniforms.u_texelSize.value.copy(texelSize);
      divergenceMaterial.uniforms.u_texelSize.value.copy(texelSize);
      pressureMaterial.uniforms.u_texelSize.value.copy(texelSize);
      gradSubMaterial.uniforms.u_texelSize.value.copy(texelSize);
      curlMaterial.uniforms.u_texelSize.value.copy(texelSize);
      densityDissipMaterial.uniforms.u_texelSize.value.copy(texelSize);

      const glContext = renderer.getContext();
      glContext.disable(glContext.BLEND);

      // 1. Splat velocity
      splatVelMaterial.uniforms.u_point.value.set(currentMouse.x, currentMouse.y);
      splatVelMaterial.uniforms.u_aspectRatio.value = aspect;
      splatVelMaterial.uniforms.u_splatColor.value.set(mouseDelta.x * 30, mouseDelta.y * 30);
      splatVelMaterial.uniforms.u_radius.value = splatRad;
      splatVelMaterial.uniforms.u_target.value = vel0.texture;
      simMesh.material = splatVelMaterial;
      renderer.setRenderTarget(vel1);
      renderer.render(simScene, orthoCamera);

      // 2. Splat density
      splatDensityMaterial.uniforms.u_point.value.set(currentMouse.x, currentMouse.y);
      splatDensityMaterial.uniforms.u_aspectRatio.value = aspect;
      splatDensityMaterial.uniforms.u_radius.value = splatRad;
      splatDensityMaterial.uniforms.u_densityAmount.value = 1.0;
      splatDensityMaterial.uniforms.u_target.value = density0.texture;
      simMesh.material = splatDensityMaterial;
      renderer.setRenderTarget(density1);
      renderer.render(simScene, orthoCamera);

      // 3. Advect velocity
      advectMaterial.uniforms.u_velocity.value = vel1.texture;
      advectMaterial.uniforms.u_source.value = vel1.texture;
      advectMaterial.uniforms.u_dt.value = 1.0;
      advectMaterial.uniforms.u_dissipationMultiply.value = velDissip;
      simMesh.material = advectMaterial;
      renderer.setRenderTarget(vel0);
      renderer.render(simScene, orthoCamera);

      // 4. Vorticity curl
      if (config.curl > 0) {
        curlMaterial.uniforms.u_velocity.value = vel0.texture;
        curlMaterial.uniforms.u_curl.value = config.curl;
        simMesh.material = curlMaterial;
        renderer.setRenderTarget(vel1);
        renderer.render(simScene, orthoCamera);
      }

      // 5. Divergence
      const velTex = config.curl > 0 ? vel1.texture : vel0.texture;
      divergenceMaterial.uniforms.u_velocity.value = velTex;
      simMesh.material = divergenceMaterial;
      renderer.setRenderTarget(divergenceTarget);
      renderer.render(simScene, orthoCamera);

      // 6. Pressure Jacobi solver
      pressureMaterial.uniforms.u_divergence.value = divergenceTarget.texture;
      let pRead = pressure0;
      let pWrite = pressure1;
      for (let i = 0; i < pressIter; i++) {
        pressureMaterial.uniforms.u_pressure.value = pRead.texture;
        simMesh.material = pressureMaterial;
        renderer.setRenderTarget(pWrite);
        renderer.render(simScene, orthoCamera);
        const temp = pRead;
        pRead = pWrite;
        pWrite = temp;
      }

      // 7. Gradient subtraction
      const curVelSrc = config.curl > 0 ? vel1 : vel0;
      const curVelDst = config.curl > 0 ? vel0 : vel1;
      gradSubMaterial.uniforms.u_velocity.value = curVelSrc.texture;
      gradSubMaterial.uniforms.u_pressure.value = pRead.texture;
      simMesh.material = gradSubMaterial;
      renderer.setRenderTarget(curVelDst);
      renderer.render(simScene, orthoCamera);

      // 8. Density advection with shrink dissipation
      densityDissipMaterial.uniforms.u_velocity.value = curVelDst.texture;
      densityDissipMaterial.uniforms.u_source.value = density1.texture;
      densityDissipMaterial.uniforms.u_dt.value = 1.0;
      densityDissipMaterial.uniforms.u_dissipationMultiply.value = shrinkDissip;
      simMesh.material = densityDissipMaterial;
      renderer.setRenderTarget(density0);
      renderer.render(simScene, orthoCamera);

      if (config.curl <= 0) {
        const tmp = vel0;
        vel0 = vel1;
        vel1 = tmp;
      }

      // 9. Composite render
      renderer.setRenderTarget(null);
      renderer.clear();
      glContext.enable(glContext.BLEND);

      uniforms.u_densityTex.value = density0.texture;
      uniforms.u_progress.value += (targetProgress - uniforms.u_progress.value) * 0.08;

      renderer.render(scene, camera);
    }

    animate();

    return {
      destroy: () => {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('resize', updateSize);
        resizeObserver.disconnect();
        disposeTargets();
        quadGeo.dispose();
        displayGeo.dispose();
        splatVelMaterial.dispose();
        splatDensityMaterial.dispose();
        advectMaterial.dispose();
        divergenceMaterial.dispose();
        pressureMaterial.dispose();
        gradSubMaterial.dispose();
        curlMaterial.dispose();
        densityDissipMaterial.dispose();
        displayMaterial.dispose();
        renderer.dispose();
      }
    };
  }

  window.LiquidMaskEffect = {
    init: initLiquidMask
  };

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Check if stage canvas exists
    const stageCanvas = document.getElementById('stage') || document.querySelector('.hero-ripple-canvas');
    if (stageCanvas) {
      const container = stageCanvas.closest('.framer-1gl69yk-container') ||
                        stageCanvas.closest('.framer-a7ibio') ||
                        stageCanvas.parentElement;

      // Determine front image (the vibrant Scottish bagpipe image to reveal)
      let frontSrc = stageCanvas.getAttribute('data-front-image') || './assets/images/piper.jpg';

      // If on subpage like projects/meridian
      if (window.location.pathname.includes('/projects/')) {
        frontSrc = '../../assets/images/piper.jpg';
      }

      initLiquidMask({
        canvas: stageCanvas,
        container: container,
        frontImageSrc: frontSrc,
        circleBoost: 0.6,
        curl: 30,
        splatRadius: 0.07,
        velocityDissipation: 0.99,
        shrinkTimeSeconds: 3.2,
        texture: 0.7,
        pressureIterations: 25
      });
    }
  });

})(window, document);
