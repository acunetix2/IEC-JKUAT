// IEC JKUAT — home-page motion hook.
// Ports animations.js sections 3-7 (everything except reveal/split, which live
// in useReveal): [data-count] counters, [data-magnetic] buttons, the horizontal
// #journey-section scroll (desktop) / auto-advancing carousel (mobile), the
// #cursor-glow follower, and the .line-draw SVG stroke draw.
//
// Every listener / observer / RAF / injected node is tracked and torn down in
// the cleanup so StrictMode's double-invoke (dev) and route changes leave
// nothing leaked. Respects prefers-reduced-motion.

import { useEffect } from 'react';

export function useHomeMotion(): void {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Teardown registry — every effect pushes its own disposer here.
    const cleanups: (() => void)[] = [];

    // ── Counters — reduced motion resolves to the final value only ──
    const counterEls = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));

    if (reduceMotion) {
      counterEls.forEach((el) => {
        el.textContent = (el.dataset.count || '') + (el.dataset.suffix || '');
      });
      // Nothing else runs under reduced motion.
      return () => {};
    }

    // ── 3. COUNTER ANIMATION ─────────────────────────────────
    const rafIds = new Set<number>();

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count || '0', 10);
          const suffix = el.dataset.suffix || '';
          const dur = 1600; // ms
          const start = performance.now();

          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / dur, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = Math.round(eased * target) + suffix;
            if (progress < 1) {
              const id = requestAnimationFrame(tick);
              rafIds.add(id);
            }
          };

          const id = requestAnimationFrame(tick);
          rafIds.add(id);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    counterEls.forEach((el) => counterObserver.observe(el));
    cleanups.push(() => counterObserver.disconnect());

    // ── 4. MAGNETIC BUTTONS ──────────────────────────────────
    Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]')).forEach((btn) => {
      const strength = parseFloat(btn.dataset.magnetic || '') || 0.35;

      const onMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * strength;
        const dy = (e.clientY - cy) * strength;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      const onLeave = () => {
        btn.style.transform = 'translate(0, 0)';
      };

      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        btn.removeEventListener('mousemove', onMove);
        btn.removeEventListener('mouseleave', onLeave);
      });
    });

    // ── 5. HORIZONTAL JOURNEY SCROLL ─────────────────────────
    const journeySection = document.getElementById('journey-section');
    const journeyTrack = document.getElementById('journey-track');

    if (journeySection && journeyTrack) {
      if (window.innerWidth < 768) {
        // Mobile: auto-advancing carousel driven by the scroll container.
        const steps = Array.from(journeyTrack.querySelectorAll<HTMLElement>('.journey-step'));
        let carouselIndex = 0;
        let carouselTimer: number | undefined;

        journeySection.style.height = 'auto';
        journeyTrack.style.transform = 'none';

        const advanceCarousel = () => {
          carouselIndex = (carouselIndex + 1) % steps.length;
          const trackBounds = journeyTrack.getBoundingClientRect();
          const stepBounds = steps[carouselIndex].getBoundingClientRect();
          const targetLeft =
            journeyTrack.scrollLeft +
            stepBounds.left -
            trackBounds.left -
            (trackBounds.width - stepBounds.width) / 2;
          journeyTrack.scrollTo({ left: targetLeft, behavior: 'smooth' });
        };

        const restartCarousel = () => {
          window.clearInterval(carouselTimer);
          carouselTimer = window.setInterval(advanceCarousel, 3200);
        };

        const carouselVisibility = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) restartCarousel();
          else window.clearInterval(carouselTimer);
        });
        carouselVisibility.observe(journeySection);

        const onTrackScroll = () => {
          const trackBounds = journeyTrack.getBoundingClientRect();
          const trackCenter = trackBounds.left + trackBounds.width / 2;
          const closest = steps.reduce(
            (best, step, index) => {
              const bounds = step.getBoundingClientRect();
              const distance = Math.abs(bounds.left + bounds.width / 2 - trackCenter);
              return distance < best.distance ? { index, distance } : best;
            },
            { index: 0, distance: Infinity }
          );
          carouselIndex = closest.index;
          restartCarousel();
        };

        journeyTrack.addEventListener('scroll', onTrackScroll, { passive: true });
        journeyTrack.addEventListener('pointerdown', restartCarousel, { passive: true });
        restartCarousel();

        cleanups.push(() => {
          window.clearInterval(carouselTimer);
          carouselVisibility.disconnect();
          journeyTrack.removeEventListener('scroll', onTrackScroll);
          journeyTrack.removeEventListener('pointerdown', restartCarousel);
        });
      } else {
        // Desktop: translateX the track as the sticky section scrolls.
        let scrollDistance = 0;

        const measureJourney = () => {
          const trackWidth = journeyTrack.scrollWidth;
          const sticky = journeySection.querySelector<HTMLElement>('.journey-sticky');
          const stickyHeight = sticky?.offsetHeight || window.innerHeight;
          scrollDistance = Math.max(0, trackWidth - window.innerWidth + 120);
          journeySection.style.height = scrollDistance + stickyHeight + 'px';
        };

        const onScroll = () => {
          const rect = journeySection.getBoundingClientRect();
          const entered = -rect.top;
          if (entered < 0 || entered > scrollDistance) return;

          const progress = entered / scrollDistance;
          journeyTrack.style.transform = `translateX(-${progress * scrollDistance}px)`;

          const steps = journeyTrack.querySelectorAll<HTMLElement>('.journey-step');
          const active = Math.floor(progress * steps.length);
          steps.forEach((s, i) => s.classList.toggle('journey-active', i <= active));
        };

        const onResize = () => {
          measureJourney();
          onScroll();
        };

        measureJourney();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });

        cleanups.push(() => {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onResize);
        });
      }
    }

    // ── 6. CURSOR GLOW (desktop only) ────────────────────────
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

      let gx = 0;
      let gy = 0;
      let tgx = 0;
      let tgy = 0;
      let glowRaf = 0;

      const onGlowMove = (e: MouseEvent) => {
        tgx = e.clientX;
        tgy = e.clientY;
      };

      const moveGlow = () => {
        gx += (tgx - gx) * 0.1;
        gy += (tgy - gy) * 0.1;
        glow.style.left = gx + 'px';
        glow.style.top = gy + 'px';
        glowRaf = requestAnimationFrame(moveGlow);
      };

      document.addEventListener('mousemove', onGlowMove);
      glowRaf = requestAnimationFrame(moveGlow);

      cleanups.push(() => {
        cancelAnimationFrame(glowRaf);
        document.removeEventListener('mousemove', onGlowMove);
        glow.remove();
      });
    }

    // ── 7. SECTION LINE DRAW ─────────────────────────────────
    Array.from(document.querySelectorAll<SVGGeometryElement>('.line-draw')).forEach((line) => {
      const len = typeof line.getTotalLength === 'function' ? line.getTotalLength() : 300;
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              line.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
              line.style.strokeDashoffset = '0';
              obs.unobserve(line);
            }
          });
        },
        { threshold: 0.3 }
      );

      obs.observe(line);
      cleanups.push(() => obs.disconnect());
    });

    // ── Teardown ─────────────────────────────────────────────
    return () => {
      rafIds.forEach((id) => cancelAnimationFrame(id));
      cleanups.forEach((fn) => fn());
    };
  }, []);
}
