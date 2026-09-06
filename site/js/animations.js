// IEC JKUAT — Scroll & Interaction Animations

(function () {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 1. SCROLL REVEAL ─────────────────────────────────────
  // Elements with [data-reveal] animate in when they enter the viewport.
  // Variants: data-reveal="up" | "left" | "right" | "fade" | "split"

  const revealEls = document.querySelectorAll('[data-reveal]');

  // Reduced motion: show everything immediately, no observer theatrics.
  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add('revealed'));
    document.querySelectorAll('[data-split]').forEach(el => el.classList.add('revealed'));
    document.querySelectorAll('[data-count]').forEach(el => {
      el.textContent = (el.dataset.count || '') + (el.dataset.suffix || '');
    });
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));


  // ── 2. SPLIT TEXT REVEAL ─────────────────────────────────
  // [data-split] elements get each word wrapped in a span for stagger.

  document.querySelectorAll('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w, i) => `<span class="split-word" style="transition-delay:${i * 0.07}s">${w}</span>`)
      .join(' ');
  });


  // Motion sections below are skipped entirely under reduced motion
  // (reveals/counters were already resolved instantly above).
  if (!reduceMotion) {

  // ── 3. COUNTER ANIMATION ─────────────────────────────────
  // <span data-count="150" data-suffix="+">0</span>

  const counterEls = document.querySelectorAll('[data-count]');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el      = entry.target;
      const target  = parseInt(el.dataset.count, 10);
      const suffix  = el.dataset.suffix || '';
      const dur     = 1600; // ms
      const start   = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / dur, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  counterEls.forEach(el => counterObserver.observe(el));


  // ── 4. MAGNETIC BUTTONS ──────────────────────────────────
  // Buttons/links with [data-magnetic] pull toward the cursor.

  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    const strength = parseFloat(btn.dataset.magnetic) || 0.35;

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * strength;
      const dy   = (e.clientY - cy) * strength;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });


  // ── 5. HORIZONTAL JOURNEY SCROLL ─────────────────────────
  // #journey-track scrolls horizontally as the user scrolls vertically
  // inside #journey-section.

  const journeySection = document.getElementById('journey-section');
  const journeyTrack   = document.getElementById('journey-track');

  if (journeySection && journeyTrack) {
    let scrollDistance = 0;

    if (window.innerWidth < 768) {
      const steps = [...journeyTrack.querySelectorAll('.journey-step')];
      let carouselIndex = 0;
      let carouselTimer;

      journeySection.style.height = 'auto';
      journeyTrack.style.transform = 'none';

      function advanceCarousel() {
        carouselIndex = (carouselIndex + 1) % steps.length;
        const trackBounds = journeyTrack.getBoundingClientRect();
        const stepBounds = steps[carouselIndex].getBoundingClientRect();
        const targetLeft = journeyTrack.scrollLeft + stepBounds.left - trackBounds.left
          - (trackBounds.width - stepBounds.width) / 2;
        journeyTrack.scrollTo({ left: targetLeft, behavior: 'smooth' });
      }

      function restartCarousel() {
        window.clearInterval(carouselTimer);
        carouselTimer = window.setInterval(advanceCarousel, 3200);
      }

      const carouselVisibility = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) restartCarousel();
        else window.clearInterval(carouselTimer);
      });
      carouselVisibility.observe(journeySection);

      journeyTrack.addEventListener('scroll', () => {
        const trackBounds = journeyTrack.getBoundingClientRect();
        const trackCenter = trackBounds.left + trackBounds.width / 2;
        const closest = steps.reduce((best, step, index) => {
          const bounds = step.getBoundingClientRect();
          const distance = Math.abs(bounds.left + bounds.width / 2 - trackCenter);
          return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity });
        carouselIndex = closest.index;
        restartCarousel();
      }, { passive: true });

      journeyTrack.addEventListener('pointerdown', restartCarousel, { passive: true });
      restartCarousel();
      return;
    }

    function measureJourney() {
      const trackWidth = journeyTrack.scrollWidth;
      const stickyHeight = journeySection.querySelector('.journey-sticky')?.offsetHeight || window.innerHeight;
      scrollDistance = Math.max(0, trackWidth - window.innerWidth + 120);
      journeySection.style.height = scrollDistance + stickyHeight + 'px';
    }
    measureJourney();

    function onScroll() {
      const rect    = journeySection.getBoundingClientRect();
      const entered = -rect.top;

      if (entered < 0 || entered > scrollDistance) return;

      const progress = entered / scrollDistance;
      journeyTrack.style.transform = `translateX(-${progress * scrollDistance}px)`;

      // Progress dots
      const steps    = journeyTrack.querySelectorAll('.journey-step');
      const active   = Math.floor(progress * steps.length);
      steps.forEach((s, i) => s.classList.toggle('journey-active', i <= active));
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      measureJourney();
      onScroll();
    }, { passive: true });
  }


  // ── 6. CURSOR GLOW ───────────────────────────────────────
  // Subtle radial glow that follows the cursor (desktop only).

  if (window.innerWidth >= 1024) {
    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    glow.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      width: 380px;
      height: 380px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0,174,239,0.07) 0%, transparent 70%);
      transform: translate(-50%, -50%);
      transition: opacity 0.3s;
      top: 0; left: 0;
    `;
    document.body.appendChild(glow);

    let gx = 0, gy = 0, tgx = 0, tgy = 0;
    document.addEventListener('mousemove', (e) => { tgx = e.clientX; tgy = e.clientY; });

    function moveGlow() {
      gx += (tgx - gx) * 0.1;
      gy += (tgy - gy) * 0.1;
      glow.style.left = gx + 'px';
      glow.style.top  = gy + 'px';
      requestAnimationFrame(moveGlow);
    }
    moveGlow();
  }


  // ── 7. SECTION LINE DRAW ─────────────────────────────────
  // SVG lines with class .line-draw animate their stroke-dashoffset on scroll.

  document.querySelectorAll('.line-draw').forEach(line => {
    const len = line.getTotalLength ? line.getTotalLength() : 300;
    line.style.strokeDasharray  = len;
    line.style.strokeDashoffset = len;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          line.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
          line.style.strokeDashoffset = 0;
          obs.unobserve(line);
        }
      });
    }, { threshold: 0.3 });

    obs.observe(line);
  });

  } // end !reduceMotion

})();
