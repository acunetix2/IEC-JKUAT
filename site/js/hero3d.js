// IEC JKUAT — Hero 3D Scene
// Three.js particle network that responds to mouse movement
// Represents an idea network / innovation graph

(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // ── Scene setup ──────────────────────────────────────────
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 28);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x000000, 0);

  // ── Nodes ────────────────────────────────────────────────
  const NODE_COUNT   = window.innerWidth < 768 ? 60 : 120;
  const SPREAD       = 20;
  const positions    = [];
  const velocities   = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    positions.push(
      (Math.random() - 0.5) * SPREAD * 2,
      (Math.random() - 0.5) * SPREAD * 1.2,
      (Math.random() - 0.5) * SPREAD
    );
    velocities.push(
      (Math.random() - 0.5) * 0.024,
      (Math.random() - 0.5) * 0.016,
      (Math.random() - 0.5) * 0.012
    );
  }

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const nodeMat = new THREE.PointsMaterial({
    color: 0x00AEEF,
    size: 0.18,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  const nodes = new THREE.Points(nodeGeo, nodeMat);
  scene.add(nodes);

  // ── Edges (connections between nearby nodes) ─────────────
  const edgePositions = [];
  const CONNECT_DIST  = 7;

  function buildEdges() {
    edgePositions.length = 0;
    const pos = nodeGeo.attributes.position.array;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = pos[i * 3]     - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d  = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < CONNECT_DIST) {
          edgePositions.push(
            pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
            pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
          );
        }
      }
    }
  }

  buildEdges();

  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x00AEEF,
    transparent: true,
    opacity: 0.12,
  });

  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  scene.add(edges);

  // ── A few larger accent nodes ─────────────────────────────
  const accentGeo = new THREE.BufferGeometry();
  const accentPos = [];
  for (let i = 0; i < 8; i++) {
    accentPos.push(
      (Math.random() - 0.5) * SPREAD * 1.6,
      (Math.random() - 0.5) * SPREAD * 0.9,
      (Math.random() - 0.5) * SPREAD * 0.5
    );
  }
  accentGeo.setAttribute('position', new THREE.Float32BufferAttribute(accentPos, 3));
  const accentMat = new THREE.PointsMaterial({
    color: 0xFBB03B,
    size: 0.45,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(accentGeo, accentMat));

  // ── Mouse parallax ───────────────────────────────────────
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Touch support
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }
  }, { passive: true });

  // ── Reduced motion: render one static frame, skip the loop ──
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Animate ──────────────────────────────────────────────
  let frame = 0;

  function animate() {
    if (reduceMotion) {
      buildEdges();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      renderer.render(scene, camera);
      return;
    }
    requestAnimationFrame(animate);
    frame++;

    // Snappy mouse follow
    targetX += (mouseX - targetX) * 0.09;
    targetY += (mouseY - targetY) * 0.09;

    // Rotate entire scene with the pointer — wide enough to feel alive
    scene.rotation.y =  targetX * 0.5;
    scene.rotation.x = -targetY * 0.32;

    // Move nodes
    const pos = nodeGeo.attributes.position.array;
    for (let i = 0; i < NODE_COUNT; i++) {
      pos[i * 3]     += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1];
      pos[i * 3 + 2] += velocities[i * 3 + 2];

      // Bounce off invisible walls
      if (Math.abs(pos[i * 3])     > SPREAD) velocities[i * 3]     *= -1;
      if (Math.abs(pos[i * 3 + 1]) > SPREAD * 0.7) velocities[i * 3 + 1] *= -1;
      if (Math.abs(pos[i * 3 + 2]) > SPREAD * 0.5) velocities[i * 3 + 2] *= -1;
    }
    nodeGeo.attributes.position.needsUpdate = true;

    // Rebuild edges every 3 frames (performance balance)
    if (frame % 3 === 0) {
      buildEdges();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    }

    // Pulse opacity on accent nodes
    accentMat.opacity = 0.6 + Math.sin(frame * 0.07) * 0.3;

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ───────────────────────────────────────────────
  function onResize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onResize);

})();
