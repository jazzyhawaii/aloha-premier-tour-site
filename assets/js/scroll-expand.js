// Scroll-expand experience sections (Experiences page only).
// Vanilla-JS port of a scroll-hijacking "expand on scroll" interaction:
// each .scroll-expand-section locks page scroll while its .se-media
// frame grows from small to large and its title splits apart behind
// it. Fully symmetric: scrolling down grows it toward progress 1 and
// reveals its content; scrolling back up from anywhere later on the
// page shrinks it back toward progress 0 and hides the content again,
// exactly reversing whichever direction you came from. Not loaded on
// any other page.

(function () {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const sectionEls = Array.from(
    document.querySelectorAll(".scroll-expand-section")
  );
  if (!sectionEls.length || reducedMotion) return;

  const sections = sectionEls.map((el) => ({
    el,
    media: el.querySelector(".se-media"),
    overlay: el.querySelector(".se-media-overlay"),
    bg: el.querySelector(".se-bg"),
    titleLeft: el.querySelector(".se-title-left"),
    titleRight: el.querySelector(".se-title-right"),
    eyebrow: el.querySelector(".se-eyebrow"),
    cue: el.querySelector(".se-cue"),
    content: el.querySelector(".se-content"),
    progress: 0,
  }));

  let lockedIndex = null;
  let touchStartY = 0;
  let isMobile = window.innerWidth < 768;

  window.addEventListener("resize", () => {
    isMobile = window.innerWidth < 768;
  });

  function applyProgress(i) {
    const s = sections[i];
    const p = s.progress;
    const width = 300 + p * (isMobile ? 650 : 1250);
    const height = 400 + p * (isMobile ? 200 : 400);
    s.media.style.width = width + "px";
    s.media.style.height = height + "px";
    if (s.overlay) s.overlay.style.opacity = String(0.55 - p * 0.15);
    if (s.bg) s.bg.style.opacity = String(1 - p);

    const shift = p * (isMobile ? 55 : 42);
    if (s.titleLeft) s.titleLeft.style.transform = `translateX(-${shift}vw)`;
    if (s.titleRight) s.titleRight.style.transform = `translateX(${shift}vw)`;
    if (s.eyebrow) s.eyebrow.style.transform = `translateX(-${shift * 0.6}vw)`;
    if (s.cue) {
      s.cue.style.transform = `translateX(${shift * 0.6}vw)`;
      s.cue.style.opacity = String(Math.max(0, 1 - p * 1.6));
    }
    s.content?.classList.toggle("is-visible", p >= 1);
  }

  function snapTo(i) {
    // The site uses CSS `scroll-behavior:smooth` for anchor links; that
    // would also animate these lock-scroll corrections unless we force
    // an instant jump here.
    window.scrollTo({ top: sections[i].el.offsetTop, left: 0, behavior: "instant" });
  }

  // Which section's 100vh zone currently contains this scroll position,
  // or null if we're in ordinary page content before/between/after them.
  function zoneIndexAt(y) {
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].el.offsetTop;
      if (y >= top - 40 && y < top + window.innerHeight) return i;
    }
    return null;
  }

  // direction: +1 scrolling down, -1 scrolling up. A section already at
  // the terminal value for that direction is left alone so real scroll
  // passes through it (into the next zone, or back out the way it came).
  function findArmable(direction) {
    const i = zoneIndexAt(window.scrollY);
    if (i === null) return null;
    const p = sections[i].progress;
    if (direction > 0 && p >= 1) return null;
    if (direction < 0 && p <= 0) return null;
    return i;
  }

  // Returns true if the section is still locked/capturing scroll after
  // this delta, false if it just hit a terminal value and released.
  function advance(i, delta) {
    const s = sections[i];
    s.progress = Math.min(Math.max(s.progress + delta, 0), 1);
    applyProgress(i);
    if ((s.progress >= 1 && delta > 0) || (s.progress <= 0 && delta < 0)) {
      lockedIndex = null;
      return false;
    }
    snapTo(i);
    return true;
  }

  // Returns true if this delta was consumed by the hijack (caller should preventDefault).
  function handleDelta(rawDeltaY, scaledDelta) {
    if (lockedIndex === null) {
      lockedIndex = findArmable(rawDeltaY > 0 ? 1 : -1);
      if (lockedIndex !== null) snapTo(lockedIndex);
    }
    if (lockedIndex === null) return false;
    return advance(lockedIndex, scaledDelta);
  }

  function onWheel(e) {
    if (handleDelta(e.deltaY, e.deltaY * 0.0009)) e.preventDefault();
  }

  function onScroll() {
    if (lockedIndex !== null) snapTo(lockedIndex);
  }

  function onTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!touchStartY) return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY - touchY;
    const factor = deltaY < 0 ? 0.01 : 0.007;
    if (handleDelta(deltaY, deltaY * factor)) e.preventDefault();
    touchStartY = touchY;
  }

  function onTouchEnd() {
    touchStartY = 0;
  }

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });

  sections.forEach((_, i) => applyProgress(i));
})();
