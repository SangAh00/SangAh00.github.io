/* ===========================================================
   최상아 Portfolio — interactions
   Stack: GSAP + ScrollTrigger + SplitText + Lenis
   (design based on the provided reference; Work/detail removed)
   =========================================================== */

gsap.registerPlugin(ScrollTrigger, SplitText);

// always start at the top on (re)load — don't restore previous scroll position
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("pageshow", () => {
  window.scrollTo(0, 0);
  if (lenis) lenis.scrollTo(0, { immediate: true });
});
window.addEventListener("beforeunload", () => window.scrollTo(0, 0));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -----------------------------------------------------------
   1) Smooth scroll (Lenis) wired into GSAP ticker
----------------------------------------------------------- */
let lenis;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* Anchor links use Lenis for smooth jumps */
document.querySelectorAll("[data-scroll]").forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (!id || !id.startsWith("#")) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (id === "#contact") {
      lenis ? lenis.scrollTo(document.body.scrollHeight, { offset: 0 }) : window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else {
      lenis ? lenis.scrollTo(target, { offset: 0 }) : target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

/* -----------------------------------------------------------
   2) Loader → then play hero intro
----------------------------------------------------------- */
function playHero() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.from(".hero__title .line__inner", { yPercent: 110, duration: 1.1, stagger: 0.09 });
  tl.to(".hero .reveal-up", { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.7");
}

// set initial state for reveal-up elements
gsap.set(".reveal-up", { y: 24 });

function runLoader() {
  window.scrollTo(0, 0);
  if (lenis) lenis.scrollTo(0, { immediate: true });

  const el = document.getElementById("loaderCount");
  const loader = document.getElementById("loader");
  const counter = { v: 0 };

  if (reduceMotion) {
    loader.style.display = "none";
    gsap.set(".reveal-up", { opacity: 1, y: 0 });
    gsap.set(".hero__title .line__inner", { yPercent: 0 });
    initScrollAnimations();
    return;
  }

  const tl = gsap.timeline();
  tl.to(counter, {
    v: 100,
    duration: 0.85,
    ease: "power2.inOut",
    onUpdate: () => (el.textContent = Math.round(counter.v)),
  })
    .to("#loader", { yPercent: -100, duration: 0.55, ease: "power4.inOut" })
    .add(playHero, "-=0.3")
    .add(initScrollAnimations, "<");
}

/* -----------------------------------------------------------
   3) Scroll-triggered animations
----------------------------------------------------------- */
function initScrollAnimations() {
  /* 3a. Word-by-word reveal for [data-split] text */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const split = new SplitText(el, { type: "words" });
    split.words.forEach((w) => w.classList.add("word"));
    gsap.from(split.words, {
      opacity: 0.12,
      duration: 1,
      ease: "power2.out",
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: "top 80%", end: "top 35%", scrub: true },
    });
  });

  /* 3b. Big marquee rows — single seamless loop + scroll speed-up */
  const marqueeRefs = [];
  document.querySelectorAll("[data-marquee]").forEach((row) => {
    const dir = parseFloat(row.dataset.dir) || 1;
    const ref = { loop: null };
    if (!row.dataset.phrase) row.dataset.phrase = row.children[0].textContent;
    const build = () => {
      if (ref.loop) ref.loop.kill();
      const phrase = row.dataset.phrase;
      row.innerHTML = `<span>${phrase}</span>`;
      const w = row.children[0].getBoundingClientRect().width || 1;
      const copies = Math.max(2, Math.ceil(window.innerWidth / w) + 1);
      const block = phrase.repeat(copies);
      row.innerHTML = `<span>${block}</span><span>${block}</span>`;
      gsap.set(row, { x: 0 });
      const half = row.scrollWidth / 2 || 1;
      ref.loop = gsap.to(row, {
        x: dir < 0 ? half : -half,
        duration: 24 * copies,
        ease: "none",
        repeat: -1,
        modifiers: {
          x: (x) => {
            let v = parseFloat(x) % half;
            if (v > 0) v -= half;
            return v + "px";
          },
        },
      });
    };
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
    marqueeRefs.push(ref);
  });
  if (lenis && marqueeRefs.length) {
    lenis.on("scroll", ({ velocity }) => {
      const ts = 1 + Math.min(Math.abs(velocity) * 0.5, 5);
      marqueeRefs.forEach((r) => r.loop && r.loop.timeScale(ts));
    });
    gsap.ticker.add(() => {
      marqueeRefs.forEach((r) => {
        if (!r.loop) return;
        const ts = r.loop.timeScale();
        if (ts > 1) r.loop.timeScale(Math.max(1, ts - 0.06));
      });
    });
  }

  /* 3a-0. About lead — masked lines rise (same language as hero/CTA) */
  if (document.querySelector(".intro__lead .line__inner")) {
    if (reduceMotion) {
      gsap.set(".intro__lead .line__inner", { yPercent: 0 });
    } else {
      gsap.from(".intro__lead .line__inner", {
        yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.11,
        scrollTrigger: { trigger: ".intro__lead", start: "top 82%" },
      });
    }
  }

  /* 3a-1. About label reveal */
  if (document.querySelector(".intro__label")) {
    gsap.to(".intro__label", {
      opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
      scrollTrigger: { trigger: ".intro", start: "top 78%" },
    });
  }

  /* 3a-2. About key points fade up (stagger) */
  if (document.querySelector(".intro__points")) {
    gsap.from(".intro__point", {
      opacity: 0, y: 26, duration: 0.9, ease: "power3.out", stagger: 0.14,
      scrollTrigger: { trigger: ".intro__points", start: "top 82%" },
    });
  }

  /* 3a-3. Career reveal — title + jobs rise & fade in */
  if (document.querySelector(".career")) {
    gsap.from(".career .section-title", {
      y: 26, opacity: 0, duration: 0.7, ease: "power3.out",
      scrollTrigger: { trigger: ".career", start: "top 82%" },
    });
    gsap.from(".career .job", {
      y: 36, opacity: 0, duration: 0.8, stagger: 0.18, ease: "power3.out",
      scrollTrigger: { trigger: ".career__list", start: "top 85%" },
    });
  }

  /* 3b-1. 경력기술서 cards reveal */
  if (document.querySelector(".jd")) {
    gsap.from(".jd .section-title, .jd__sub", {
      y: 26, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".jd", start: "top 82%" },
    });
    gsap.utils.toArray(".jd__item").forEach((card) => {
      gsap.from(card, {
        y: 44, opacity: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 88%" },
      });
    });
  }

  /* 3b-2. Project cards reveal (batched stagger) */
  if (document.querySelector(".projects")) {
    gsap.from(".projects .section-title, .projects__sub", {
      y: 26, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".projects", start: "top 82%" },
    });
    if (!reduceMotion) {
      gsap.set(".pj", { opacity: 0, y: 44 });
      ScrollTrigger.batch(".pj", {
        start: "top 90%",
        onEnter: (els) =>
          gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", overwrite: true }),
      });
    }
  }

  /* 3b-3. Education reveal */
  if (document.querySelector(".edu")) {
    gsap.from(".edu__profile, .edu__grid > *, .edu__curri", {
      opacity: 0, y: 36, duration: 0.9, ease: "power3.out", stagger: 0.15,
      scrollTrigger: { trigger: ".edu", start: "top 75%" },
    });
  }

  /* 3e. CTA reveal — title lines rise up (auto-plays when the footer is revealed) */
  gsap.set(".cta__title .line__inner", { yPercent: 110 });
  gsap.set(".cta .reveal-up", { opacity: 0, y: 24 });
  if (document.querySelector(".cta__title") && document.querySelector(".page") && !reduceMotion) {
    const reveal = gsap.timeline({ paused: true });
    reveal
      .to(".cta__title .line__inner", { yPercent: 0, duration: 0.95, ease: "power4.out", stagger: 0.14 }, 0)
      .to(".cta .reveal-up", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.35);
    ScrollTrigger.create({
      trigger: ".page",
      start: "bottom top",
      onEnter: () => reveal.restart(),
      onLeaveBack: () => reveal.pause(0),
    });
  } else {
    gsap.set(".cta__title .line__inner", { yPercent: 0 });
    gsap.set(".cta .reveal-up", { opacity: 1, y: 0 });
  }

  ScrollTrigger.refresh();
}

/* -----------------------------------------------------------
   4) Nav hide/show on scroll direction
----------------------------------------------------------- */
let lastY = 0;
const nav = document.getElementById("nav");
function navOnScroll(y) {
  if (y > lastY && y > 200) {
    gsap.to(nav, { yPercent: -100, duration: 0.4, ease: "power2.out" });
  } else {
    gsap.to(nav, { yPercent: 0, duration: 0.4, ease: "power2.out" });
  }
  lastY = y;
}
if (lenis) lenis.on("scroll", ({ scroll }) => navOnScroll(scroll));
else window.addEventListener("scroll", () => navOnScroll(window.scrollY));

/* -----------------------------------------------------------
   4-1) 경력기술서 accordion (회사별 접기/펼치기)
----------------------------------------------------------- */
(function setupAccordion() {
  const items = document.querySelectorAll(".jd__item");
  if (!items.length) return;

  items.forEach((item, i) => {
    const head = item.querySelector(".jd__head");
    if (!head) return;
    // 최근 경력 1건은 기본으로 펼쳐둔다
    if (i === 0) {
      item.classList.add("is-open");
      head.setAttribute("aria-expanded", "true");
    }
    head.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      // 높이가 바뀌므로 스크롤 트리거 위치를 다시 계산
      if (window.ScrollTrigger) {
        setTimeout(() => ScrollTrigger.refresh(), 520);
      }
    });
  });
})();

/* -----------------------------------------------------------
   5) Slide-out menu (hamburger → sweeps in from the left)
----------------------------------------------------------- */
(function setupMenu() {
  const menu = document.getElementById("menu");
  const burger = document.getElementById("navBurger");
  const closeBtn = document.getElementById("menuClose");
  if (!menu || !burger) return;
  let open = false;

  function openMenu() {
    if (open) return;
    open = true;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop();
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    if (!open) return;
    open = false;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
    document.body.style.overflow = "";
  }

  burger.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) closeMenu();
  });

  document.querySelectorAll("[data-menu-link]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const href = a.getAttribute("href");
      const target = document.querySelector(href);
      closeMenu();
      if (!target) return;
      if (href === "#contact") {
        lenis ? lenis.scrollTo(document.body.scrollHeight, { offset: 0 }) : window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      } else if (lenis) {
        lenis.scrollTo(target, { offset: 0 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
})();

/* -----------------------------------------------------------
   Boot
----------------------------------------------------------- */
if (document.readyState === "complete") runLoader();
else window.addEventListener("load", runLoader);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
}
