/* =========================================
   SCRIPT PRINCIPAL - ANNIVERSAIRE 5 ANS
   Amélioré : performances, UX, corrections
========================================= */

'use strict';

// ─── Détection device ────────────────────────
const isMobile = () => window.innerWidth <= 768 || 'ontouchstart' in window;
const isDesktop = () => !isMobile();

// ─── DOM ready helper ────────────────────────
function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

// =========================================
// CURSEUR PERSONNALISÉ (desktop uniquement)
// =========================================
function initCustomCursor() {
    if (isMobile()) return;

    const cursor = document.getElementById('custom-cursor');
    const trail  = document.getElementById('custom-cursor-trail');
    if (!cursor || !trail) return;

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;
    let rafId = null;

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function animateTrail() {
        trailX += (mouseX - trailX) * 0.12;
        trailY += (mouseY - trailY) * 0.12;
        trail.style.transform = `translate(${trailX}px, ${trailY}px) translate(-50%, -50%)`;
        rafId = requestAnimationFrame(animateTrail);
    }
    animateTrail();

    // Effets au survol des éléments interactifs
    const interactives = 'button, a, .carousel-btn, .dot, .slide-frame';
    document.addEventListener('mouseover', e => {
        if (e.target.closest(interactives)) {
            cursor.classList.add('hovered');
            trail.classList.add('hovered');
        }
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest(interactives)) {
            cursor.classList.remove('hovered');
            trail.classList.remove('hovered');
        }
    });
}

// =========================================
// BARRE DE PROGRESSION DE SCROLL
// =========================================
function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
        const total  = document.documentElement.scrollHeight - window.innerHeight;
        const pct    = total > 0 ? (window.scrollY / total) * 100 : 0;
        bar.style.width = pct + '%';
    }, { passive: true });
}

// =========================================
// PARTICULES CANVAS
// =========================================
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, particles = [];
    const COUNT = isMobile() ? 25 : 55;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    class Particle {
        constructor() { this.reset(true); }
        reset(initial = false) {
            this.x    = Math.random() * W;
            this.y    = initial ? Math.random() * H : H + 10;
            this.r    = Math.random() * 2.5 + 0.5;
            this.vy   = -(Math.random() * 0.4 + 0.15);
            this.vx   = (Math.random() - 0.5) * 0.3;
            this.alpha= Math.random() * 0.5 + 0.1;
            this.hue  = Math.random() > 0.5 ? 345 : 30; // rose ou or
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.y < -10) this.reset();
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = `hsl(${this.hue}, 65%, 70%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    let running = true;
    function loop() {
        if (!running) return;
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(loop);
    }
    loop();

    // Pause hors viewport pour les perfs
    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) loop();
    });
}

// =========================================
// BOUTON MUSIQUE
// =========================================
function initMusicToggle() {
    const music      = document.getElementById('music');
    const btn        = document.getElementById('musicToggle');
    const icon       = document.getElementById('musicIcon');
    if (!music || !btn || !icon) return;

    let playing = false;

    btn.addEventListener('click', () => {
        if (playing) {
            music.pause();
            icon.textContent = '♩';
            btn.classList.remove('playing');
        } else {
            music.play().catch(() => {});
            icon.textContent = '♫';
            btn.classList.add('playing');
        }
        playing = !playing;
    });
}

// =========================================
// BOUTON DÉMARRER
// =========================================
function initStartBtn() {
    const btn   = document.getElementById('startBtn');
    const music = document.getElementById('music');
    const icon  = document.getElementById('musicIcon');
    const musicBtn = document.getElementById('musicToggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        // Lancer la musique
        if (music && music.paused) {
            music.play().then(() => {
                if (icon)      icon.textContent = '♫';
                if (musicBtn) musicBtn.classList.add('playing');
            }).catch(() => {});
        }
        // Scroll vers intro
        const intro = document.getElementById('intro');
        if (intro) intro.scrollIntoView({ behavior: 'smooth' });
    });
}

// =========================================
// ANIMATIONS AU SCROLL (Intersection Observer)
// =========================================
function initScrollReveal() {
    const sections = document.querySelectorAll('.reveal-section');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // On ne désactive pas l'observer pour éviter les re-animations
            }
        });
    }, { threshold: 0.12 });

    sections.forEach(s => observer.observe(s));
}

// =========================================
// CARROUSEL PHOTOS
// =========================================
let currentPhotoSlide = 0;
let photoSlides       = [];
let photoAutoplayId   = null;
const PHOTO_DELAY     = 3500;

function initPhotoCarousel() {
    photoSlides = Array.from(document.querySelectorAll('#gallery .slide'));
    if (!photoSlides.length) return;

    createPhotoDots();
    updatePhotoCarousel();
    startPhotoAutoplay();

    // Swipe support mobile
    let touchStartX = 0;
    const slideshow = document.querySelector('#gallery .slideshow');
    if (slideshow) {
        slideshow.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        slideshow.addEventListener('touchend', e => {
            const delta = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(delta) > 40) {
                delta < 0 ? goToNextPhoto() : goToPrevPhoto();
                resetPhotoAutoplay();
            }
        }, { passive: true });
    }

    // Pause autoplay quand la galerie n'est pas visible
    const gallery = document.getElementById('gallery');
    if (gallery) {
        const obs = new IntersectionObserver(entries => {
            entries[0].isIntersecting ? startPhotoAutoplay() : stopPhotoAutoplay();
        }, { threshold: 0.2 });
        obs.observe(gallery);
    }
}

function startPhotoAutoplay() {
    stopPhotoAutoplay();
    if (photoSlides.length > 1) {
        photoAutoplayId = setInterval(goToNextPhoto, PHOTO_DELAY);
    }
}

function stopPhotoAutoplay() {
    if (photoAutoplayId) { clearInterval(photoAutoplayId); photoAutoplayId = null; }
}

function resetPhotoAutoplay() {
    stopPhotoAutoplay();
    startPhotoAutoplay();
}

function goToNextPhoto() {
    currentPhotoSlide = (currentPhotoSlide + 1) % photoSlides.length;
    updatePhotoCarousel();
}

function goToPrevPhoto() {
    currentPhotoSlide = (currentPhotoSlide - 1 + photoSlides.length) % photoSlides.length;
    updatePhotoCarousel();
}

// Fonctions globales appelées depuis le HTML
function nextSlide() { goToNextPhoto(); resetPhotoAutoplay(); }
function prevPhoto() { goToPrevPhoto(); resetPhotoAutoplay(); }

function updatePhotoCarousel() {
    photoSlides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentPhotoSlide);
    });
    updatePhotoDots();
    updateCounter('photoCounter', currentPhotoSlide + 1, photoSlides.length);
}

function createPhotoDots() {
    const container = document.getElementById('photosDots');
    if (!container) return;
    container.innerHTML = '';
    photoSlides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            currentPhotoSlide = i;
            updatePhotoCarousel();
            resetPhotoAutoplay();
        });
        container.appendChild(dot);
    });
}

function updatePhotoDots() {
    document.querySelectorAll('#photosDots .dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentPhotoSlide);
    });
}

// =========================================
// CARROUSEL VIDÉOS
// =========================================
let currentVideoSlide = 0;
let videoSlides       = [];
let videoAutoplayId   = null;
const VIDEO_DELAY     = 8000;

function initVideoCarousel() {
    videoSlides = Array.from(document.querySelectorAll('#videos .video-slide'));
    if (!videoSlides.length) return;

    videoSlides.forEach((video, i) => {
        video.muted      = true;
        video.playsInline = true;
        // Passer à la suivante quand la vidéo se termine
        video.addEventListener('ended', () => {
            stopVideoAutoplay();
            goToNextVideo();
        });
        // Cliquer met en pause / reprend
        video.addEventListener('click', () => {
            if (!video.paused) video.pause();
            else video.play().catch(() => {});
        });
    });

    createVideoDots();
    updateVideoCarousel();

    // Swipe mobile
    let touchStartX = 0;
    const slideshow = document.querySelector('#videos .videos-slideshow');
    if (slideshow) {
        slideshow.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        slideshow.addEventListener('touchend', e => {
            const delta = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(delta) > 40) {
                delta < 0 ? nextVideo() : prevVideo();
            }
        }, { passive: true });
    }

    // Pause quand hors vue
    const videoSection = document.getElementById('videos');
    if (videoSection) {
        const obs = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) {
                videoSlides.forEach(v => v.pause());
                stopVideoAutoplay();
            } else {
                const active = videoSlides[currentVideoSlide];
                if (active) active.play().catch(() => {});
                startVideoAutoplay();
            }
        }, { threshold: 0.3 });
        obs.observe(videoSection);
    }
}

function startVideoAutoplay() {
    stopVideoAutoplay();
    videoAutoplayId = setInterval(goToNextVideo, VIDEO_DELAY);
}

function stopVideoAutoplay() {
    if (videoAutoplayId) { clearInterval(videoAutoplayId); videoAutoplayId = null; }
}

function goToNextVideo() {
    currentVideoSlide = (currentVideoSlide + 1) % videoSlides.length;
    updateVideoCarousel();
    resetVideoAutoplay();
}

function goToPrevVideo() {
    currentVideoSlide = (currentVideoSlide - 1 + videoSlides.length) % videoSlides.length;
    updateVideoCarousel();
    resetVideoAutoplay();
}

function resetVideoAutoplay() {
    stopVideoAutoplay();
    startVideoAutoplay();
}

function nextVideo() { goToNextVideo(); }
function prevVideo() { goToPrevVideo(); }

function updateVideoCarousel() {
    videoSlides.forEach((slide, i) => {
        const isActive = i === currentVideoSlide;
        slide.classList.toggle('active', isActive);
        if (isActive) {
            slide.currentTime = 0;
            slide.play().catch(() => { startVideoAutoplay(); });
        } else {
            slide.pause();
        }
    });
    updateVideoDots();
    updateCounter('videoCounter', currentVideoSlide + 1, videoSlides.length);
}

function createVideoDots() {
    const container = document.getElementById('videosDots');
    if (!container) return;
    container.innerHTML = '';
    videoSlides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            currentVideoSlide = i;
            updateVideoCarousel();
            resetVideoAutoplay();
        });
        container.appendChild(dot);
    });
}

function updateVideoDots() {
    document.querySelectorAll('#videosDots .dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentVideoSlide);
    });
}

// =========================================
// BADGE COMPTEUR (ex: "3 / 15")
// =========================================
function updateCounter(id, current, total) {
    const el = document.getElementById(id);
    if (el) el.textContent = `${current} / ${total}`;
}

// =========================================
// BULLES FLOTTANTES (desktop uniquement)
// =========================================
function initLoveBubbles() {
    // Sur mobile, on désactive complètement les bulles
    if (isMobile()) {
        const loveList = document.getElementById('love-list');
        if (loveList) {
            loveList.style.display = 'none';
            loveList.setAttribute('aria-hidden', 'true');
        }
        return;
    }

    const loveList      = document.getElementById('love-list');
    const bubbleSections = document.querySelectorAll('#intro, #gallery, #videos, #counter');
    if (!loveList || !bubbleSections.length) return;

    const updateVisibility = () => {
        const visible = Array.from(bubbleSections).some(section => {
            const rect = section.getBoundingClientRect();
            return rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;
        });
        document.body.classList.toggle('show-love-bubbles', visible);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', () => {
        // Recalculer si la fenêtre est redimensionnée (ex: rotation tablette)
        if (isMobile()) {
            document.body.classList.remove('show-love-bubbles');
            loveList.style.display = 'none';
        } else {
            loveList.style.display = '';
            updateVisibility();
        }
    }, { passive: true });
}

// =========================================
// COMPTEUR DE TEMPS SUR TERRE
// =========================================
function calculateTimeOnEarth() {
    const birth = new Date(2006, 5, 5); // 5 juin 2006
    const now   = new Date();

    let years  = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth()    - birth.getMonth();
    let days   = now.getDate()     - birth.getDate();

    if (days < 0) {
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days  += prevMonth.getDate();
        months--;
    }
    if (months < 0) { months += 12; years--; }

    const totalDays   = Math.floor((now - birth) / 86400000);
    const totalHours  = Math.floor((now - birth) / 3600000);

    const yText = years  === 1 ? 'an'   : 'ans';
    const mText = 'mois';
    const dText = days   === 1 ? 'jour' : 'jours';

    const counter = document.getElementById('loveCounter');
    const sub     = document.getElementById('counterSub');

    if (counter) {
        counter.textContent = `${years} ${yText}, ${months} ${mText} et ${days} ${dText} sur terre ❤️`;
    }
    if (sub) {
        sub.textContent = `Soit ${totalDays.toLocaleString('fr-FR')} jours ✨`;
    }
}

// =========================================
// CONFETTIS (section #ending)
// =========================================
function initConfetti() {
    const ending  = document.getElementById('ending');
    const canvas  = document.getElementById('confetti-canvas');
    if (!ending || !canvas) return;

    let fired = false;

    const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !fired) {
            fired = true;
            launchConfetti(canvas);
        }
    }, { threshold: 0.4 });
    obs.observe(ending);
}

function launchConfetti(canvas) {
    canvas.style.display = 'block';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '999';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    const pieces = [];
    const colors = ['#9b2335','#e8728a','#f5b8c4','#c9956a','#e8c9a0','#ffffff'];
    const COUNT  = isMobile() ? 60 : 120;

    for (let i = 0; i < COUNT; i++) {
        pieces.push({
            x:   Math.random() * canvas.width,
            y:   -10 - Math.random() * 200,
            w:   Math.random() * 10 + 4,
            h:   Math.random() * 6  + 3,
            vx:  (Math.random() - 0.5) * 3,
            vy:  Math.random() * 3 + 1.5,
            rot: Math.random() * 360,
            vr:  (Math.random() - 0.5) * 6,
            col: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        pieces.forEach(p => {
            p.x   += p.vx;
            p.y   += p.vy;
            p.vy  += 0.05; // gravité
            p.rot += p.vr;
            if (p.y > canvas.height * 0.8) p.alpha -= 0.02;
            if (p.alpha <= 0) return;
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle   = p.col;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        if (alive && frame < 300) {
            frame++;
            requestAnimationFrame(draw);
        } else {
            canvas.style.display = 'none';
        }
    }
    draw();
}

// =========================================
// SCROLL INDICATOR (hero)
// =========================================
function initScrollHint() {
    const hint = document.querySelector('.scroll-hint');
    if (!hint) return;
    window.addEventListener('scroll', () => {
        hint.style.opacity = window.scrollY > 100 ? '0' : '1';
    }, { passive: true });
}

// =========================================
// KEYBOARD NAVIGATION pour les carousels
// =========================================
function initKeyboardNav() {
    document.addEventListener('keydown', e => {
        const activeSection = getActiveSection();
        if (activeSection === 'gallery') {
            if (e.key === 'ArrowRight') { goToNextPhoto(); resetPhotoAutoplay(); }
            if (e.key === 'ArrowLeft')  { goToPrevPhoto(); resetPhotoAutoplay(); }
        }
        if (activeSection === 'videos') {
            if (e.key === 'ArrowRight') nextVideo();
            if (e.key === 'ArrowLeft')  prevVideo();
        }
    });
}

function getActiveSection() {
    const sections = ['gallery','videos'];
    for (const id of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4) return id;
    }
    return null;
}

// =========================================
// INIT GLOBALE
// =========================================
ready(() => {
    initCustomCursor();
    initScrollProgress();
    initParticles();
    initMusicToggle();
    initStartBtn();
    initScrollReveal();
    initScrollHint();
    initKeyboardNav();
    initConfetti();

    calculateTimeOnEarth();
    initPhotoCarousel();
    initVideoCarousel();
    initLoveBubbles();
});