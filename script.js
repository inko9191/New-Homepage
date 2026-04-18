/* ============================================================
   DENKEN // 中央大学 電気工学研究部 — interactive scripts
   ============================================================ */

(() => {
    'use strict';

    const toAbsolutePageUrl = (rawHref) => {
        if (!rawHref) return rawHref;
        if (/^(?:[a-z]+:|\/\/|#)/i.test(rawHref)) return rawHref;

        const hashIndex = rawHref.indexOf('#');
        const pathPart = hashIndex >= 0 ? rawHref.slice(0, hashIndex) : rawHref;
        const hashPart = hashIndex >= 0 ? rawHref.slice(hashIndex) : '';
        if (!pathPart) return hashPart || rawHref;

        const { origin, pathname } = window.location;
        let basePath = pathname;
        if (basePath.endsWith('.html')) {
            basePath = basePath.slice(0, basePath.lastIndexOf('/') + 1);
        } else if (!basePath.endsWith('/')) {
            basePath += '/';
        }

        return new URL(pathPart + hashPart, origin + basePath).toString();
    };

    const normalizeInternalLinks = () => {
        document.querySelectorAll('a[href]').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;
            if (/^(?:[a-z]+:|\/\/|mailto:|tel:|#)/i.test(href)) return;
            link.href = toAbsolutePageUrl(href);
        });
    };

    const setupDivisionCards = () => {
        document.querySelectorAll('.div-card[data-page]').forEach((card) => {
            const page = card.dataset.page;
            const jump = card.querySelector('.div-card__jump');
            const targetUrl = jump?.href || toAbsolutePageUrl(page);
            if (!targetUrl) return;

            card.tabIndex = 0;
            card.setAttribute('role', 'link');

            const go = () => {
                window.location.href = targetUrl;
            };

            card.addEventListener('click', (event) => {
                if (event.target.closest('a, button')) return;
                go();
            });

            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    go();
                }
            });
        });
    };

    normalizeInternalLinks();
    setupDivisionCards();

    /* ---------- LOADING SCREEN ---------- */
    const loader = document.getElementById('loader');
    const barFill = loader.querySelector('.loader__bar-fill');
    const pctEl = document.getElementById('loader-pct');
    const msgEl = document.getElementById('loader-msg');
    const page = document.getElementById('page');

    // Narrative: MCU boot → RF scan → drone deploy → software triangulates → lock.
    const bootMessages = [
        'MCU boot…',
        'firmware flash [STM32]…',
        'RF scan 144 / 430 MHz…',
        'drone telemetry link: up',
        'TDOA solver compiled…',
        'triangulating…',
        'TARGET LOCKED',
    ];

    let progress = 0;
    let msgIndex = 0;

    const tickLoader = () => {
        const step = Math.random() * 7 + 4;     // faster steps
        progress = Math.min(100, progress + step);
        barFill.style.width = progress + '%';
        pctEl.textContent = Math.floor(progress);

        const nextIndex = Math.min(
            bootMessages.length - 1,
            Math.floor((progress / 100) * bootMessages.length)
        );
        if (nextIndex !== msgIndex) {
            msgIndex = nextIndex;
            msgEl.textContent = bootMessages[msgIndex];
        }

        if (progress < 100) {
            setTimeout(tickLoader, 80 + Math.random() * 90); // 80-170ms
        } else {
            msgEl.textContent = bootMessages[bootMessages.length - 1];
            loader.classList.add('is-locked');  // crosshair turns green
            setTimeout(finishLoader, 360);
        }
    };

    const finishLoader = () => {
        loader.classList.add('is-done');
        page.classList.add('is-ready');
        setTimeout(() => { loader.remove(); }, 700);
    };

    // Kick loader after a tiny delay so intro animations can start
    window.addEventListener('load', () => {
        setTimeout(tickLoader, 180);
    });

    /* ---------- NAV ---------- */
    const nav = document.querySelector('.nav');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav__menu');
    const navGroups = document.querySelectorAll('.nav__group');

    window.addEventListener('scroll', () => {
        nav.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });

    const closeNavGroups = () => {
        navGroups.forEach(group => {
            group.classList.remove('is-open');
            const btn = group.querySelector('.nav__link');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    };

    navToggle.addEventListener('click', () => {
        const open = navMenu.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', open);
        if (!open) closeNavGroups();
    });

    navGroups.forEach(group => {
        const btn = group.querySelector('.nav__link');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            const willOpen = btn.getAttribute('aria-expanded') !== 'true';
            if (window.matchMedia('(max-width: 820px)').matches || !group.matches(':hover')) {
                e.preventDefault();
            }
            closeNavGroups();
            if (willOpen) {
                group.classList.add('is-open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    navMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navMenu.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
            closeNavGroups();
        });
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav__group')) closeNavGroups();
    });

    /* ---------- REVEAL ON SCROLL ---------- */
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                if (e.target.classList.contains('stat')) {
                    animateStat(e.target);
                }
                revealObs.unobserve(e.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    /* ---------- STAT COUNTERS ---------- */
    function animateStat(stat) {
        const numEl = stat.querySelector('.stat__num');
        const target = parseInt(numEl.dataset.count, 10);
        const prefix = numEl.dataset.prefix || '';
        const suffix = numEl.dataset.suffix || '';

        // For "JA1YGX" prefix: just show the prefix directly
        if (prefix) {
            numEl.textContent = prefix;
            return;
        }

        const duration = 1400;
        const start = performance.now();
        const tick = (t) => {
            const p = Math.min(1, (t - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            numEl.textContent = Math.floor(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else numEl.textContent = target + suffix;
        };
        requestAnimationFrame(tick);
    }

    /* ---------- YEAR ---------- */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ---------- LIVE STATUS (denken-key-checker) ---------- */
    // Best-effort: try several endpoints on the upstream app, then parse the
    // response to pick out "open/closed" / "在/不在" signals. If every attempt
    // is blocked (CORS, 404, timeout), the panel falls back to OFFLINE.
    const statusPanel = document.getElementById('status-panel');
    const elSys = document.getElementById('stat-sys');
    const elKey = document.getElementById('stat-key');
    const elDoor = document.getElementById('stat-door');
    const elUpdated = document.getElementById('stat-updated');
    const elLive = document.getElementById('panel-live');

    const BASE = 'https://denken-key-checker.vercel.app';
    const CANDIDATES = [
        `${BASE}/api/status`,
        `${BASE}/api/state`,
        `${BASE}/api/key`,
        `${BASE}/api/check`,
        `${BASE}/api/current`,
        `${BASE}/status.json`,
        `${BASE}/`,   // last resort: raw HTML
    ];

    const fetchWithTimeout = (url, ms = 4500) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { signal: ctrl.signal, mode: 'cors', credentials: 'omit' })
            .finally(() => clearTimeout(t));
    };

    const pickFromText = (text) => {
        // Normalize
        const t = String(text).replace(/\s+/g, ' ');
        // Positive / negative markers (Japanese + English)
        const openRe = /(開室|在室|在\s*[:：]?\s*(?:中|有)|鍵.*(?:あり|有|在)|OPEN|AVAILABLE|true)/i;
        const closedRe = /(閉室|不在|持[ちっ]?出[しぢ]?中|鍵.*(?:無|なし|持出)|CLOSED|UNAVAILABLE|false)/i;
        const open = openRe.test(t);
        const closed = closedRe.test(t);
        if (open && !closed) return 'OPEN';
        if (closed && !open) return 'CLOSED';
        if (open && closed) return 'OPEN'; // prefer open when ambiguous
        return null;
    };

    const pickFromJson = (data) => {
        const flat = JSON.stringify(data);
        const byText = pickFromText(flat);
        if (byText) return byText;
        // Try typical boolean-ish fields
        const candidates = ['open', 'isOpen', 'available', 'inRoom', 'present', 'door', 'status', 'state', 'key'];
        for (const k of candidates) {
            const v = data?.[k];
            if (typeof v === 'boolean') return v ? 'OPEN' : 'CLOSED';
            if (typeof v === 'string') {
                const r = pickFromText(v);
                if (r) return r;
            }
        }
        return null;
    };

    const tryOne = async (url) => {
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`http ${res.status}`);
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('json')) {
            const data = await res.json();
            return { verdict: pickFromJson(data), raw: data };
        }
        const text = await res.text();
        return { verdict: pickFromText(text), raw: text.slice(0, 400) };
    };

    const fmtTime = (d) => {
        const p = n => String(n).padStart(2, '0');
        return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };

    const setPanelState = (state) => {
        if (statusPanel) statusPanel.setAttribute('data-state', state);
    };

    const applyResult = (verdict) => {
        const now = new Date();
        if (verdict === 'OPEN') {
            setPanelState('live');
            elLive.textContent = 'LIVE';
            elSys.textContent = 'ONLINE';
            elKey.textContent = '在室中';
            elDoor.textContent = 'OPEN';
        } else if (verdict === 'CLOSED') {
            setPanelState('live');
            elLive.textContent = 'LIVE';
            elSys.textContent = 'ONLINE';
            elKey.textContent = '持出中';
            elDoor.textContent = 'CLOSED';
        } else {
            setPanelState('offline');
            elLive.textContent = 'UNAVAILABLE';
            elSys.textContent = 'ONLINE';
            elKey.textContent = '—';
            elDoor.textContent = '—';
        }
        elUpdated.textContent = fmtTime(now);
    };

    const applyOffline = () => {
        setPanelState('offline');
        elLive.textContent = 'OFFLINE';
        elSys.textContent = 'UNREACHABLE';
        elKey.textContent = '—';
        elDoor.textContent = '—';
        elUpdated.textContent = fmtTime(new Date());
    };

    const runStatusCheck = async () => {
        if (!statusPanel) return;
        setPanelState('loading');
        elLive.textContent = 'QUERYING…';
        for (const url of CANDIDATES) {
            try {
                const { verdict } = await tryOne(url);
                if (verdict) { applyResult(verdict); return; }
            } catch (_) { /* try next */ }
        }
        applyOffline();
    };

    // Initial query shortly after the loader finishes, then refresh every 60s.
    setTimeout(runStatusCheck, 1500);
    setInterval(runStatusCheck, 60_000);

    /* ---------- PARTICLE / CIRCUIT BACKGROUND ---------- */
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let w, h, dpr;
    const nodes = [];
    const NODE_COUNT_BASE = 70;

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth = window.innerWidth;
        h = canvas.clientHeight = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    };

    const initNodes = () => {
        nodes.length = 0;
        const count = Math.max(30, Math.floor((w * h) / 22000));
        const total = Math.min(NODE_COUNT_BASE * 1.5, count);
        for (let i = 0; i < total; i++) {
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: Math.random() * 1.4 + 0.4,
            });
        }
    };

    const mouse = { x: -9999, y: -9999 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    const draw = () => {
        ctx.clearRect(0, 0, w, h);

        // update positions
        for (const n of nodes) {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > w) n.vx *= -1;
            if (n.y < 0 || n.y > h) n.vy *= -1;

            // mouse pull
            const dx = mouse.x - n.x;
            const dy = mouse.y - n.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 22000) {
                const f = (1 - d2 / 22000) * 0.02;
                n.vx += dx * f * 0.001;
                n.vy += dy * f * 0.001;
            }
            // dampen
            n.vx *= 0.995;
            n.vy *= 0.995;
        }

        // connections
        const maxDist = 140;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.22;
                    ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        // nodes
        for (const n of nodes) {
            const mx = mouse.x - n.x, my = mouse.y - n.y;
            const near = Math.sqrt(mx * mx + my * my) < 140;
            ctx.fillStyle = near ? 'rgba(180,0,255,0.9)' : 'rgba(0,229,255,0.7)';
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(draw);
    };

    const setupBg = () => {
        resize();
        initNodes();
        draw();
    };
    window.addEventListener('resize', () => {
        resize();
        initNodes();
    });
    setupBg();

})();
