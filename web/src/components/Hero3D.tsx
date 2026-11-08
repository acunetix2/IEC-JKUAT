// IEC JKUAT — Hero 3D scene.
// Ports hero3d.js: a Three.js particle network (idea graph) that parallaxes
// with the pointer. The whole scene lives in one mount effect; teardown
// cancels the RAF, removes every document/window listener, and disposes all
// geometries/materials + the renderer so navigating away leaks no GL context.
// prefers-reduced-motion renders a single static frame with no loop.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hero3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Scene setup ──────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    // ── Nodes ────────────────────────────────────────────────
    const NODE_COUNT = window.innerWidth < 768 ? 60 : 120;
    const SPREAD = 20;
    const positions: number[] = [];
    const velocities: number[] = [];

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
      color: 0x00aeef,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const nodes = new THREE.Points(nodeGeo, nodeMat);
    scene.add(nodes);

    // ── Edges (connections between nearby nodes) ─────────────
    const edgePositions: number[] = [];
    const CONNECT_DIST = 7;

    function buildEdges() {
      edgePositions.length = 0;
      const pos = nodeGeo.attributes.position.array as Float32Array | number[];
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
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
      color: 0x00aeef,
      transparent: true,
      opacity: 0.12,
    });

    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(edges);

    // ── A few larger accent nodes ─────────────────────────────
    const accentGeo = new THREE.BufferGeometry();
    const accentPos: number[] = [];
    for (let i = 0; i < 8; i++) {
      accentPos.push(
        (Math.random() - 0.5) * SPREAD * 1.6,
        (Math.random() - 0.5) * SPREAD * 0.9,
        (Math.random() - 0.5) * SPREAD * 0.5
      );
    }
    accentGeo.setAttribute('position', new THREE.Float32BufferAttribute(accentPos, 3));
    const accentMat = new THREE.PointsMaterial({
      color: 0xfbb03b,
      size: 0.45,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const accentNodes = new THREE.Points(accentGeo, accentMat);
    scene.add(accentNodes);

    // ── Mouse parallax ───────────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    // ── Resize ───────────────────────────────────────────────
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animate ──────────────────────────────────────────────
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let frame = 0;

    if (reduceMotion) {
      // Render a single static frame, no loop.
      buildEdges();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      renderer.render(scene, camera);
    } else {
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        frame++;

        // Snappy mouse follow
        targetX += (mouseX - targetX) * 0.09;
        targetY += (mouseY - targetY) * 0.09;

        scene.rotation.y = targetX * 0.5;
        scene.rotation.x = -targetY * 0.32;

        // Move nodes
        const pos = nodeGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < NODE_COUNT; i++) {
          pos[i * 3] += velocities[i * 3];
          pos[i * 3 + 1] += velocities[i * 3 + 1];
          pos[i * 3 + 2] += velocities[i * 3 + 2];

          if (Math.abs(pos[i * 3]) > SPREAD) velocities[i * 3] *= -1;
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
      };
      animate();
    }

    // ── Teardown — no leaked RAF / listeners / GL context ─────
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      nodeGeo.dispose();
      nodeMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      accentGeo.dispose();
      accentMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas id="hero-canvas" ref={canvasRef}></canvas>;
}
