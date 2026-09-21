(function () {
  'use strict';
  const PLANET_DATA = [
    { id: 1, img: './img/01.png', text: 'Te aprecio', radius: 45, angle: 0.3, y: 6, size: 20 },
    { id: 2, img: './img/02.png', text: 'Te quiero mucho', radius: 62, angle: 1.2, y: -8, size: 21 },
    { id: 3, img: './img/03.png', text: 'Agradecido de haberte conocido', radius: 78, angle: 2.1, y: 10, size: 22 },
    { id: 4, img: './img/04.png', text: 'Me alegras mis días', radius: 50, angle: 3.1, y: -6, size: 21 },
    { id: 5, img: './img/05.png', text: 'Siempre puede contar conmigo', radius: 70, angle: 3.9, y: 8, size: 20 },
    { id: 6, img: './img/06.png', text: 'Eres muy especial para mí', radius: 85, angle: 4.8, y: -10, size: 22 },
    { id: 7, img: './img/07.png', text: 'Que bonito coincidir contigo', radius: 58, angle: 5.6, y: 4, size: 20 }
  ];

  const GALAXY_CONFIG = {
    particleCount: 11000,
    discRadius: 130,
    arms: 3,
    spinFactor: 2.8,
    verticalSpread: 12
  };

  const canvas = document.getElementById('webgl-canvas');
  const hintContainer = document.getElementById('hint-container');
  const resetCamBtn = document.getElementById('reset-cam-btn');
  const planetModal = document.getElementById('planet-modal');
  const modalImg = document.getElementById('modal-flower-img');
  const modalText = document.getElementById('modal-text');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  let scene, camera, renderer, controls;
  let galaxyPoints, vortexMesh, centerText3DGroup;
  let deepStarPoints, midStarPoints, heroStarPoints;
  let deepStarMaterial, midStarMaterial, heroStarMaterial;
  const flowerPlanets = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const defaultCamPos = new THREE.Vector3(0, 42, 115);
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  let targetCamPos = defaultCamPos.clone();
  let targetLookAt = defaultTarget.clone();
  let startCamPos = defaultCamPos.clone();
  let startLookAt = defaultTarget.clone();
  let transitionStartTime = 0;
  const TRANSITION_DURATION = 800;
  let isTransitioning = false;
  let idleTimer = null;
  let touchStartPos = { x: 0, y: 0 };
  let pointerDownTime = 0;

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06040a, 0.0022);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(55, aspect, 0.5, 2000);
    camera.position.copy(defaultCamPos);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x06040a, 1);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 25;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.target.copy(defaultTarget);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    controls.addEventListener('start', () => {
      isTransitioning = false;
      pauseAutoRotate();
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const centerGlowLight = new THREE.PointLight(0xffd700, 2.8, 160);
    centerGlowLight.position.set(0, 12, 0);
    scene.add(centerGlowLight);

    const keyLight = new THREE.DirectionalLight(0xfffae0, 1.4);
    keyLight.position.set(30, 45, 60);
    scene.add(keyLight);

    const backLight = new THREE.DirectionalLight(0xffc400, 0.9);
    backLight.position.set(-30, 25, -50);
    scene.add(backLight);

    createGalaxy();
    createRealisticSpaceEnvironment();
    createCenterVortex();
    createCenter3DText();
    loadFlowerPlanets();

    setupEvents();

    animate();
  }

  function createParticleTexture() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const ctx = pCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 235, 130, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 180, 0, 0.4)');
    grad.addColorStop(1, 'rgba(255, 140, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(pCanvas);
  }

  function createVortexTexture() {
    const vCanvas = document.createElement('canvas');
    vCanvas.width = 512;
    vCanvas.height = 512;
    const ctx = vCanvas.getContext('2d');
    const cx = 256;
    const cy = 256;

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGrad.addColorStop(0.12, 'rgba(255, 240, 150, 0.95)');
    coreGrad.addColorStop(0.35, 'rgba(255, 195, 30, 0.6)');
    coreGrad.addColorStop(0.7, 'rgba(210, 130, 0, 0.25)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    const numSpiralArms = 4;

    for (let arm = 0; arm < numSpiralArms; arm++) {
      const armOffset = (arm * 2 * Math.PI) / numSpiralArms;
      ctx.beginPath();

      for (let r = 10; r < 230; r += 2) {
        const angle = armOffset + Math.pow(r / 35, 0.95);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        if (r === 10) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = 'rgba(255, 250, 200, 0.45)';
      ctx.stroke();

      ctx.lineWidth = 26;
      ctx.strokeStyle = 'rgba(255, 190, 20, 0.2)';
      ctx.stroke();
      ctx.lineWidth = 14;
    }

    return new THREE.CanvasTexture(vCanvas);
  }

  function renderLabelTexture(canvas, text) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    let fontSize = 150;
    ctx.font = `${fontSize}px "PlanetLabelFont", "Outfit", sans-serif`;
    let measured = ctx.measureText(text).width;
    while (measured > width - 44 && fontSize > 22) {
      fontSize -= 2;
      ctx.font = `${fontSize}px "PlanetLabelFont", "Outfit", sans-serif`;
      measured = ctx.measureText(text).width;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, width / 2, height / 2);

    ctx.shadowBlur = 3;
    ctx.fillText(text, width / 2, height / 2);
  }

  function refreshPlanetLabelTextures() {
    flowerPlanets.forEach((group) => {
      const u = group.userData;
      if (u && u.textMesh && u.textMesh.material && u.textMesh.material.map && u.textMesh.material.map.image) {
        renderLabelTexture(u.textMesh.material.map.image, u.planetData.text);
        u.textMesh.material.map.needsUpdate = true;
      }
    });
  }

  if ('fonts' in document) {
    document.fonts.load('42px "PlanetLabelFont"').then(() => {
      refreshPlanetLabelTextures();
    }).catch(() => { });
    document.fonts.ready.then(() => {
      refreshPlanetLabelTextures();
    });
  }

  function createTextMesh(text) {
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 512;
    tCanvas.height = 128;

    renderLabelTexture(tCanvas, text);

    const texture = new THREE.CanvasTexture(tCanvas);
    texture.minFilter = THREE.LinearFilter;
    const geo = new THREE.PlaneGeometry(22, 5.5);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  function createGalaxy() {
    const starTex = createParticleTexture();
    const positions = new Float32Array(GALAXY_CONFIG.particleCount * 3);
    const colors = new Float32Array(GALAXY_CONFIG.particleCount * 3);
    const sizes = new Float32Array(GALAXY_CONFIG.particleCount);

    const colorGoldCore = new THREE.Color(0xffffff);
    const colorGoldMid = new THREE.Color(0xffd700);
    const colorGoldArm = new THREE.Color(0xffa500);
    const colorStarWhite = new THREE.Color(0xfffae6);

    for (let i = 0; i < GALAXY_CONFIG.particleCount; i++) {
      const i3 = i * 3;

      const r = Math.pow(Math.random(), 1.6) * GALAXY_CONFIG.discRadius + 4;
      const armIndex = i % GALAXY_CONFIG.arms;
      const armAngle = (armIndex * 2 * Math.PI) / GALAXY_CONFIG.arms;
      const spinAngle = r * (GALAXY_CONFIG.spinFactor / GALAXY_CONFIG.discRadius);

      const randomX = Math.pow(Math.random(), 2.5) * (Math.random() < 0.5 ? 1 : -1) * 6;
      const randomZ = Math.pow(Math.random(), 2.5) * (Math.random() < 0.5 ? 1 : -1) * 6;
      const randomY = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * (GALAXY_CONFIG.verticalSpread * (1 - r / (GALAXY_CONFIG.discRadius * 1.3)));

      positions[i3] = Math.cos(armAngle + spinAngle) * r + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(armAngle + spinAngle) * r + randomZ;

      const normDist = r / GALAXY_CONFIG.discRadius;
      let mixedColor;
      if (normDist < 0.25) {
        mixedColor = colorGoldCore.clone().lerp(colorGoldMid, normDist / 0.25);
      } else if (normDist < 0.7) {
        mixedColor = colorGoldMid.clone().lerp(colorGoldArm, (normDist - 0.25) / 0.45);
      } else {
        mixedColor = colorGoldArm.clone().lerp(colorStarWhite, (normDist - 0.7) / 0.3);
      }

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      sizes[i] = Math.random() * 2.2 + 0.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2.2,
      map: starTex,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    galaxyPoints = new THREE.Points(geometry, material);
    scene.add(galaxyPoints);
  }

  function createCrispStarTexture() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const ctx = pCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.08, 'rgba(255, 255, 255, 0.98)');
    grad.addColorStop(0.22, 'rgba(255, 248, 220, 0.65)');
    grad.addColorStop(0.48, 'rgba(255, 215, 140, 0.22)');
    grad.addColorStop(0.85, 'rgba(255, 180, 80, 0.04)');
    grad.addColorStop(1, 'rgba(255, 160, 40, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(pCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  function createCrossSpikeTexture() {
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 128;
    sCanvas.height = 128;
    const ctx = sCanvas.getContext('2d');
    const cx = 64;
    const cy = 64;

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGrad.addColorStop(0.12, 'rgba(255, 250, 235, 0.95)');
    coreGrad.addColorStop(0.32, 'rgba(255, 225, 150, 0.45)');
    coreGrad.addColorStop(0.7, 'rgba(255, 190, 70, 0.1)');
    coreGrad.addColorStop(1, 'rgba(255, 160, 20, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, 128, 128);

    const hGrad = ctx.createLinearGradient(0, cy, 128, cy);
    hGrad.addColorStop(0, 'rgba(255, 240, 180, 0)');
    hGrad.addColorStop(0.32, 'rgba(255, 248, 210, 0.3)');
    hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
    hGrad.addColorStop(0.68, 'rgba(255, 248, 210, 0.3)');
    hGrad.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    const vGrad = ctx.createLinearGradient(cx, 0, cx, 128);
    vGrad.addColorStop(0, 'rgba(255, 240, 180, 0)');
    vGrad.addColorStop(0.32, 'rgba(255, 248, 210, 0.3)');
    vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
    vGrad.addColorStop(0.68, 'rgba(255, 248, 210, 0.3)');
    vGrad.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 1.8, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(sCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  function getRealisticStarColor() {
    const roll = Math.random();
    if (roll < 0.46) {
      const b = 0.98 + Math.random() * 0.02;
      const r = 0.94 + Math.random() * 0.06;
      return new THREE.Color(r, r, b);
    } else if (roll < 0.82) {
      const g = 0.88 + Math.random() * 0.09;
      const b = 0.60 + Math.random() * 0.25;
      return new THREE.Color(1.0, g, b);
    } else {
      const g = 0.70 + Math.random() * 0.15;
      const b = 0.20 + Math.random() * 0.18;
      return new THREE.Color(1.0, g, b);
    }
  }

  const starVertexShader = `
    attribute float aSize;
    attribute float aTwinkleSpeed;
    attribute float aTwinklePhase;
    attribute float aTwinkleStrength;
    attribute vec3 aColor;

    uniform float uTime;
    uniform float uPixelRatio;

    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      vColor = aColor;
      float t = sin(uTime * aTwinkleSpeed + aTwinklePhase);
      float twinkle = 1.0 - (aTwinkleStrength * 0.5 * (1.0 - t));
      vTwinkle = twinkle;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (0.8 + 0.3 * twinkle) * (320.0 / -mvPosition.z) * uPixelRatio;
      gl_PointSize = max(gl_PointSize, 1.0);

      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const starFragmentShader = `
    uniform sampler2D uTexture;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      vec4 texColor = texture2D(uTexture, gl_PointCoord);
      if (texColor.a < 0.02) discard;
      gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vTwinkle);
    }
  `;

  function createStarShaderMaterial(texture) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uTexture: { value: texture },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
  }

  function createRealisticSpaceEnvironment() {
    const crispTex = createCrispStarTexture();
    const spikeTex = createCrossSpikeTexture();

    const deepCount = 5000;
    const deepPos = new Float32Array(deepCount * 3);
    const deepCol = new Float32Array(deepCount * 3);
    const deepSizes = new Float32Array(deepCount);
    const deepSpeed = new Float32Array(deepCount);
    const deepPhase = new Float32Array(deepCount);
    const deepStrength = new Float32Array(deepCount);

    for (let i = 0; i < deepCount; i++) {
      const i3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 380 + Math.random() * 480;
      const sinPhi = Math.sin(phi);

      deepPos[i3] = r * sinPhi * Math.cos(theta);
      deepPos[i3 + 1] = r * Math.cos(phi);
      deepPos[i3 + 2] = r * sinPhi * Math.sin(theta);

      const c = getRealisticStarColor();
      deepCol[i3] = c.r;
      deepCol[i3 + 1] = c.g;
      deepCol[i3 + 2] = c.b;

      deepSizes[i] = 1.4 + Math.random() * 1.8;
      deepSpeed[i] = 1.2 + Math.random() * 2.8;
      deepPhase[i] = Math.random() * Math.PI * 2;
      deepStrength[i] = 0.35 + Math.random() * 0.45;
    }

    const deepGeo = new THREE.BufferGeometry();
    deepGeo.setAttribute('position', new THREE.BufferAttribute(deepPos, 3));
    deepGeo.setAttribute('aColor', new THREE.BufferAttribute(deepCol, 3));
    deepGeo.setAttribute('aSize', new THREE.BufferAttribute(deepSizes, 1));
    deepGeo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(deepSpeed, 1));
    deepGeo.setAttribute('aTwinklePhase', new THREE.BufferAttribute(deepPhase, 1));
    deepGeo.setAttribute('aTwinkleStrength', new THREE.BufferAttribute(deepStrength, 1));

    deepStarMaterial = createStarShaderMaterial(crispTex);
    deepStarPoints = new THREE.Points(deepGeo, deepStarMaterial);
    scene.add(deepStarPoints);

    const midCount = 1200;
    const midPos = new Float32Array(midCount * 3);
    const midCol = new Float32Array(midCount * 3);
    const midSizes = new Float32Array(midCount);
    const midSpeed = new Float32Array(midCount);
    const midPhase = new Float32Array(midCount);
    const midStrength = new Float32Array(midCount);

    for (let i = 0; i < midCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const rad = 25 + Math.pow(Math.random(), 0.75) * 235;
      const ySpread = (Math.random() - 0.5) * 150;

      midPos[i3] = Math.cos(angle) * rad + (Math.random() - 0.5) * 24;
      midPos[i3 + 1] = ySpread;
      midPos[i3 + 2] = Math.sin(angle) * rad + (Math.random() - 0.5) * 24;

      const c = getRealisticStarColor();
      midCol[i3] = c.r;
      midCol[i3 + 1] = c.g;
      midCol[i3 + 2] = c.b;

      midSizes[i] = 2.2 + Math.random() * 2.4;
      midSpeed[i] = 0.8 + Math.random() * 2.0;
      midPhase[i] = Math.random() * Math.PI * 2;
      midStrength[i] = 0.25 + Math.random() * 0.4;
    }

    const midGeo = new THREE.BufferGeometry();
    midGeo.setAttribute('position', new THREE.BufferAttribute(midPos, 3));
    midGeo.setAttribute('aColor', new THREE.BufferAttribute(midCol, 3));
    midGeo.setAttribute('aSize', new THREE.BufferAttribute(midSizes, 1));
    midGeo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(midSpeed, 1));
    midGeo.setAttribute('aTwinklePhase', new THREE.BufferAttribute(midPhase, 1));
    midGeo.setAttribute('aTwinkleStrength', new THREE.BufferAttribute(midStrength, 1));

    midStarMaterial = createStarShaderMaterial(crispTex);
    midStarPoints = new THREE.Points(midGeo, midStarMaterial);
    scene.add(midStarPoints);

    const heroCount = 42;
    const heroPos = new Float32Array(heroCount * 3);
    const heroCol = new Float32Array(heroCount * 3);
    const heroSizes = new Float32Array(heroCount);
    const heroSpeed = new Float32Array(heroCount);
    const heroPhase = new Float32Array(heroCount);
    const heroStrength = new Float32Array(heroCount);

    for (let i = 0; i < heroCount; i++) {
      const i3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 160 + Math.random() * 320;
      const sinPhi = Math.sin(phi);

      heroPos[i3] = r * sinPhi * Math.cos(theta);
      heroPos[i3 + 1] = r * Math.cos(phi) * 0.85;
      heroPos[i3 + 2] = r * sinPhi * Math.sin(theta);

      const isGold = Math.random() > 0.48;
      const c = isGold
        ? new THREE.Color(1.0, 0.85 + Math.random() * 0.1, 0.35 + Math.random() * 0.2)
        : new THREE.Color(0.96 + Math.random() * 0.04, 0.97 + Math.random() * 0.03, 1.0);

      heroCol[i3] = c.r;
      heroCol[i3 + 1] = c.g;
      heroCol[i3 + 2] = c.b;

      heroSizes[i] = 12.0 + Math.random() * 8.0;
      heroSpeed[i] = 0.6 + Math.random() * 1.2;
      heroPhase[i] = Math.random() * Math.PI * 2;
      heroStrength[i] = 0.25 + Math.random() * 0.25;
    }

    const heroGeo = new THREE.BufferGeometry();
    heroGeo.setAttribute('position', new THREE.BufferAttribute(heroPos, 3));
    heroGeo.setAttribute('aColor', new THREE.BufferAttribute(heroCol, 3));
    heroGeo.setAttribute('aSize', new THREE.BufferAttribute(heroSizes, 1));
    heroGeo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(heroSpeed, 1));
    heroGeo.setAttribute('aTwinklePhase', new THREE.BufferAttribute(heroPhase, 1));
    heroGeo.setAttribute('aTwinkleStrength', new THREE.BufferAttribute(heroStrength, 1));

    heroStarMaterial = createStarShaderMaterial(spikeTex);
    heroStarPoints = new THREE.Points(heroGeo, heroStarMaterial);
    scene.add(heroStarPoints);
  }

  function createCenterVortex() {
    const vortexTex = createVortexTexture();
    const geo = new THREE.PlaneGeometry(54, 54);
    const mat = new THREE.MeshBasicMaterial({
      map: vortexTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    vortexMesh = new THREE.Mesh(geo, mat);
    vortexMesh.rotation.x = -Math.PI / 2;
    vortexMesh.position.set(0, 0.2, 0);
    scene.add(vortexMesh);

    const haloTex = createParticleTexture();
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0xffe680,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(65, 65, 1);
    haloSprite.position.set(0, 1, 0);
    scene.add(haloSprite);
  }

  function createCenter3DText() {
    const fontLoader = new THREE.FontLoader();

    fontLoader.load('./fonts/helvetiker_bold.typeface.json', (font) => {
      const textMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.85,
        roughness: 0.22,
        emissive: 0x473400,
        emissiveIntensity: 0.35
      });

      const textOptions = {
        font: font,
        size: 5.5,
        height: 1.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.45,
        bevelSize: 0.25,
        bevelSegments: 4
      };

      const paraGeo = new THREE.TextGeometry('PARA', textOptions);
      paraGeo.computeBoundingBox();
      paraGeo.center();
      const paraMesh = new THREE.Mesh(paraGeo, textMat);
      paraMesh.position.y = 3.8;

      const danaGeo = new THREE.TextGeometry('DIANA', textOptions);
      danaGeo.computeBoundingBox();
      danaGeo.center();
      const danaMesh = new THREE.Mesh(danaGeo, textMat);
      danaMesh.position.y = -3.8;

      centerText3DGroup = new THREE.Group();
      centerText3DGroup.add(paraMesh);
      centerText3DGroup.add(danaMesh);
      centerText3DGroup.position.set(0, 9.5, 0);

      scene.add(centerText3DGroup);
    });
  }

  function loadFlowerPlanets() {
    const textureLoader = new THREE.TextureLoader();
    const haloTex = createParticleTexture();

    PLANET_DATA.forEach((item, index) => {
      const posX = Math.cos(item.angle) * item.radius;
      const posZ = Math.sin(item.angle) * item.radius;
      const posY = item.y;

      const planetGroup = new THREE.Group();
      planetGroup.position.set(posX, posY, posZ);

      const haloMat = new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xffd700,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.75,
        depthWrite: false
      });
      const haloSprite = new THREE.Sprite(haloMat);
      haloSprite.scale.set(item.size * 1.4, item.size * 1.4, 1);
      planetGroup.add(haloSprite);

      textureLoader.load(item.img, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: true
        });
        const flowerSprite = new THREE.Sprite(mat);
        flowerSprite.scale.set(item.size, item.size * 1.15, 1);
        flowerSprite.userData = {
          planetIndex: index,
          data: item
        };
        planetGroup.add(flowerSprite);
      });

      const textMesh = createTextMesh(item.text);
      textMesh.position.set(0, -(item.size * 0.65), 0);
      textMesh.userData = {
        planetIndex: index,
        data: item
      };
      planetGroup.add(textMesh);

      planetGroup.userData = {
        basePos: new THREE.Vector3(posX, posY, posZ),
        floatOffset: index * 0.9,
        floatSpeed: 1.0 + (index % 3) * 0.25,
        planetData: item,
        haloSprite: haloSprite,
        textMesh: textMesh
      };

      scene.add(planetGroup);
      flowerPlanets.push(planetGroup);
    });
  }

  function setupEvents() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(onWindowResize, 150);
    });

    renderer.domElement.addEventListener('pointerdown', (e) => {
      touchStartPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
      isTransitioning = false;
      pauseAutoRotate();
    });

    renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - touchStartPos.x, e.clientY - touchStartPos.y);
      const timeDiff = performance.now() - pointerDownTime;

      if (dist < 8 && timeDiff < 450) {
        handlePointerClick(e);
      }

      scheduleAutoRotateResume();
      dismissHint();
    });

    resetCamBtn.addEventListener('click', () => {
      focusOnCameraPosition(defaultCamPos, defaultTarget);
    });

    modalCloseBtn.addEventListener('click', closeModal);
    planetModal.addEventListener('click', (e) => {
      if (e.target === planetModal) closeModal();
    });
  }

  function handlePointerClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const spritesToTest = [];
    flowerPlanets.forEach((group) => {
      group.children.forEach((child) => {
        if (child.isSprite && child.userData && child.userData.planetIndex !== undefined) {
          spritesToTest.push(child);
        }
      });
    });

    const intersects = raycaster.intersectObjects(spritesToTest, false);
    if (intersects.length > 0) {
      const hitSprite = intersects[0].object;
      const data = hitSprite.userData.data;
      openPlanetDetail(data, hitSprite.parent.position);
    }
  }

  function openPlanetDetail(data, worldPos) {
    modalImg.src = data.img;
    modalText.textContent = data.text;
    planetModal.classList.add('active');

    const angle = Math.atan2(worldPos.z, worldPos.x);
    const rad = Math.hypot(worldPos.x, worldPos.z);
    const camDist = rad + 36;
    const camY = worldPos.y + 6;
    const targetPos = new THREE.Vector3(
      Math.cos(angle) * camDist,
      camY,
      Math.sin(angle) * camDist
    );

    focusOnCameraPosition(targetPos, defaultTarget);
    pauseAutoRotate();
  }

  function closeModal() {
    planetModal.classList.remove('active');

    const currentAngle = Math.atan2(camera.position.z, camera.position.x);
    const overviewDist = 115;
    const overviewY = 42;
    const pullBackPos = new THREE.Vector3(
      Math.cos(currentAngle) * overviewDist,
      overviewY,
      Math.sin(currentAngle) * overviewDist
    );

    focusOnCameraPosition(pullBackPos, defaultTarget);
    scheduleAutoRotateResume();
  }

  function focusOnCameraPosition(camPos, lookAtTarget) {
    startCamPos.copy(camera.position);
    startLookAt.copy(controls.target);
    targetCamPos.copy(camPos);
    targetLookAt.copy(lookAtTarget);
    transitionStartTime = performance.now();
    isTransitioning = true;
  }

  function pauseAutoRotate() {
    controls.autoRotate = false;
    if (idleTimer) clearTimeout(idleTimer);
  }

  function scheduleAutoRotateResume() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      controls.autoRotate = true;
    }, 4000);
  }

  function dismissHint() {
    if (hintContainer && !hintContainer.classList.contains('fade-out')) {
      hintContainer.classList.add('fade-out');
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    if (deepStarMaterial) deepStarMaterial.uniforms.uPixelRatio.value = pr;
    if (midStarMaterial) midStarMaterial.uniforms.uPixelRatio.value = pr;
    if (heroStarMaterial) heroStarMaterial.uniforms.uPixelRatio.value = pr;
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    if (galaxyPoints) {
      galaxyPoints.rotation.y = elapsedTime * 0.035;
    }

    if (deepStarMaterial) {
      deepStarMaterial.uniforms.uTime.value = elapsedTime;
    }
    if (midStarMaterial) {
      midStarMaterial.uniforms.uTime.value = elapsedTime;
    }
    if (heroStarMaterial) {
      heroStarMaterial.uniforms.uTime.value = elapsedTime;
    }
    if (deepStarPoints) {
      deepStarPoints.rotation.y = elapsedTime * 0.003;
    }

    if (vortexMesh) {
      vortexMesh.rotation.z = -elapsedTime * 0.65;
      const pulse = 1 + Math.sin(elapsedTime * 2.5) * 0.04;
      vortexMesh.scale.set(pulse, pulse, 1);
    }

    if (centerText3DGroup) {
      centerText3DGroup.position.y = 9.5 + Math.sin(elapsedTime * 1.6) * 0.8;
    }

    flowerPlanets.forEach((group) => {
      const u = group.userData;
      const bob = Math.sin(elapsedTime * u.floatSpeed + u.floatOffset) * 1.8;
      group.position.y = u.basePos.y + bob;

      if (u.haloSprite) {
        const haloScale = 1 + Math.sin(elapsedTime * 2.0 + u.floatOffset) * 0.08;
        const baseSize = u.planetData.size * 1.4;
        u.haloSprite.scale.set(baseSize * haloScale, baseSize * haloScale, 1);
      }

      if (u.textMesh) {
        u.textMesh.quaternion.copy(camera.quaternion);
      }
    });

    if (isTransitioning) {
      const elapsed = performance.now() - transitionStartTime;
      const progress = Math.min(elapsed / TRANSITION_DURATION, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startCamPos, targetCamPos, ease);
      controls.target.lerpVectors(startLookAt, targetLookAt, ease);

      if (progress >= 1.0) {
        camera.position.copy(targetCamPos);
        controls.target.copy(targetLookAt);
        isTransitioning = false;
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
