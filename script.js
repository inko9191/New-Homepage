/* ============================================================
   DENKEN // 中央大学 電気工学研究部 — interactive scripts
   ============================================================ */

(() => {
    'use strict';

    const APP_VERSION = '20260419-1412';

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
        const url = new URL(pathPart, origin + basePath);
        if (/\.html?$/i.test(url.pathname)) {
            url.searchParams.set('v', APP_VERSION);
        }
        if (hashPart) {
            url.hash = hashPart.slice(1);
        }
        return url.toString();
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

    /* ---------- LIVE STATUS ---------- */
    // Best-effort: try several endpoints on the upstream app, then parse the
    // response to pick out "open/closed" / "在/不在" signals. If every attempt
    // is blocked (CORS, 404, timeout), the panel falls back to OFFLINE.
    const statusPanel = document.getElementById('status-panel');
    const elSys = document.getElementById('stat-sys');
    const elRoom = document.getElementById('stat-room');
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
            elRoom.textContent = 'OPEN';
        } else if (verdict === 'CLOSED') {
            setPanelState('live');
            elLive.textContent = 'LIVE';
            elSys.textContent = 'ONLINE';
            elRoom.textContent = 'CLOSED';
        } else {
            setPanelState('offline');
            elLive.textContent = 'UNAVAILABLE';
            elSys.textContent = 'ONLINE';
            elRoom.textContent = '—';
        }
        elUpdated.textContent = fmtTime(now);
    };

    const applyOffline = () => {
        setPanelState('offline');
        elLive.textContent = 'OFFLINE';
        elSys.textContent = 'UNREACHABLE';
        elRoom.textContent = '—';
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

    /* ---------- JOIN FLOW ---------- */
    const setupJoinFlow = () => {
        const track = document.getElementById('joinflow-track');
        if (!track) return;

        const kicker = document.getElementById('joinflow-kicker');
        const badge = document.getElementById('joinflow-badge');
        const title = document.getElementById('joinflow-title');
        const body = document.getElementById('joinflow-body');
        const list = document.getElementById('joinflow-list');
        const panel = track.querySelector('.joinflow__panel');
        const overlay = track.querySelector('.joinflow__overlay');
        const primary = document.getElementById('joinflow-primary');
        const primaryLabel = document.getElementById('joinflow-primary-label');
        const secondary = document.getElementById('joinflow-secondary');
        const secondaryLabel = document.getElementById('joinflow-secondary-label');
        const metaRoute = document.getElementById('joinflow-meta-route');
        const metaMode = document.getElementById('joinflow-meta-mode');
        const metaOutput = document.getElementById('joinflow-meta-output');
        const progressFill = document.getElementById('joinflow-pf');
        const progressPct = document.getElementById('joinflow-pct');
        const stepEls = Array.from(track.querySelectorAll('.joinflow__steps li'));
        const routeEls = Array.from(track.querySelectorAll('.joinflow__route'));

        const FLOW = [
            {
                kicker: 'ENTRY LINE // STEP 01',
                badge: 'DISCOVER',
                title: '存在を知るところから始まる',
                body: '新歓、作品展示、上の DIVISIONS から、まずは電研が何を作っているのかを知る段階。最初は「この班ちょっと気になる」くらいで十分です。',
                items: [
                    '班紹介ページで雰囲気を見る',
                    '気になる領域をひとつ見つける',
                    '初心者歓迎なので予備知識は不要',
                ],
                metaRoute: 'SCAN',
                metaMode: 'PASSIVE',
                metaOutput: 'FIRST CONTACT',
                primaryHref: '#divisions',
                primaryLabel: 'SEE DIVISIONS',
                secondaryHref: '#contact',
                secondaryLabel: '// CONTACT INFO',
            },
            {
                kicker: 'ENTRY LINE // STEP 02',
                badge: 'ENTER',
                title: '次は、部室に来て空気を掴む',
                body: '実際の参加は、いきなり制作に入るよりも、まず部室や展示で雰囲気を掴むところから。どんな人がいて、どんな道具が並んでいるかを見る段階です。',
                items: [
                    '見学だけでも問題なし',
                    '後楽園キャンパスを拠点に活動',
                    '部室の雰囲気と人を見る',
                ],
                metaRoute: 'ACCESS',
                metaMode: 'ONSITE',
                metaOutput: 'ROOM OPEN',
                primaryHref: '#status-panel',
                primaryLabel: 'ROOM STATUS',
                secondaryHref: '#contact',
                secondaryLabel: '// HOW TO JOIN',
            },
            {
                kicker: 'ENTRY LINE // STEP 03',
                badge: 'TOUCH',
                title: '触ってみると、急に距離が縮む',
                body: 'はんだごて、無線機、FPV、コード、先輩の作品。実際に触ることで、自分がどこに惹かれるかがはっきりしてきます。',
                items: [
                    '工具や作品に触れてみる',
                    '先輩に質問しながら試せる',
                    '制作持ち込みも歓迎',
                ],
                metaRoute: 'BENCH',
                metaMode: 'HANDS-ON',
                metaOutput: 'SKILL TOUCH',
                primaryHref: '#assembly',
                primaryLabel: 'SEE ASSEMBLY',
                secondaryHref: '#contact',
                secondaryLabel: '// TALK TO US',
            },
            {
                kicker: 'ENTRY LINE // STEP 04',
                badge: 'ROUTE',
                title: '1班に入っても、あとから横断できる',
                body: '無線、ドローン、マイコン・ロボット、ソフトウェア。入口はひとつで大丈夫ですが、活動しながら他班へ広げていけるのが電研らしさです。',
                items: [
                    '最初は一番気になる班からで OK',
                    '活動しながら他班へ横断できる',
                    'ハードとソフトを混ぜやすい',
                ],
                metaRoute: 'BRANCH',
                metaMode: 'CROSS',
                metaOutput: 'DIVISION LINK',
                primaryHref: '#divisions',
                primaryLabel: 'PICK A DIVISION',
                secondaryHref: '#contact',
                secondaryLabel: '// ASK ANYTHING',
            },
            {
                kicker: 'ENTRY LINE // STEP 05',
                badge: 'BUILD',
                title: '最後は、自分の制作ラインが動き始める',
                body: '班を見て、部室に来て、触って、選んだ先にあるのは、自分の制作が始まる状態です。ここから先は、電研の道具と人が後押しします。',
                items: [
                    '見学から制作開始まで段階的に入れる',
                    '初心者でも最初の作品を作り始められる',
                    '作品が次の班や次の後輩につながっていく',
                ],
                metaRoute: 'BOOT',
                metaMode: 'ACTIVE',
                metaOutput: 'MAKE SOMETHING',
                primaryHref: '#contact',
                primaryLabel: 'JOIN / CONTACT',
                secondaryHref: '#status-panel',
                secondaryLabel: '// CHECK ROOM',
            },
        ];

        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
        let currentIndex = -1;

        const renderStep = (index) => {
            const data = FLOW[index];
            if (!data || index === currentIndex) return;
            currentIndex = index;

            kicker.textContent = data.kicker;
            badge.textContent = data.badge;
            title.textContent = data.title;
            body.textContent = data.body;
            metaRoute.textContent = data.metaRoute;
            metaMode.textContent = data.metaMode;
            metaOutput.textContent = data.metaOutput;
            primary.href = data.primaryHref;
            primaryLabel.textContent = data.primaryLabel;
            secondary.href = data.secondaryHref;
            secondaryLabel.textContent = data.secondaryLabel;

            list.replaceChildren(
                ...data.items.map((text) => {
                    const li = document.createElement('li');
                    li.textContent = text;
                    return li;
                })
            );

            // On mobile, the JOIN copy area is internally scrollable.
            // Reset its scroll position whenever the step changes so
            // re-entering the section from below doesn't keep a stale offset.
            if (panel) panel.scrollTop = 0;
            if (overlay) overlay.scrollTop = 0;
        };

        const update = () => {
            const rect = track.getBoundingClientRect();
            const viewH = window.innerHeight;
            const travel = track.offsetHeight - viewH;
            const progress = clamp(-rect.top / Math.max(1, travel), 0, 1);
            const index = Math.min(FLOW.length - 1, Math.floor(progress * FLOW.length));

            renderStep(index);

            if (progressFill) progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
            if (progressPct) progressPct.textContent = String(Math.floor(progress * 100));

            stepEls.forEach((stepEl, stepIndex) => {
                stepEl.classList.toggle('is-active', stepIndex <= index);
                stepEl.classList.toggle('is-current', stepIndex === index);
            });

            routeEls.forEach((routeEl, routeIndex) => {
                routeEl.classList.toggle('is-live', routeIndex <= index);
                routeEl.classList.toggle('is-current', routeIndex === index);
            });
        };

        let ticking = false;
        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                update();
            });
        };

        renderStep(0);
        update();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
    };

    setupJoinFlow();

    /* ---------- CROSS DIVISION ---------- */
    const setupCrossDivision = () => {
        const section = document.getElementById('cross');
        if (!section) return;

        const kicker = document.getElementById('cross-kicker');
        const title = document.getElementById('cross-title');
        const body = document.getElementById('cross-body');
        const list = document.getElementById('cross-list');
        const route = document.getElementById('cross-route');
        const tools = document.getElementById('cross-tools');
        const output = document.getElementById('cross-output');
        const buttons = Array.from(section.querySelectorAll('.cross__selector button'));
        const pairEls = Array.from(section.querySelectorAll('.cross__pair'));

        const PAIRS = [
            {
                kicker: 'RADIO × DRONE',
                title: '空撮と通信のラインがつながる',
                body: 'ドローン班の FPV と無線班の知識は、別々の活動ではなく「通信して飛ばす」という一本の線でつながっています。離れた対象と安定してやり取りする感覚は、電研の中でもかなり共有されています。',
                items: [
                    'FPV には第四級以上のアマチュア無線資格が必要',
                    '飛行と通信は切り離せない',
                    'イベント運用でも無線の視点が活きる',
                ],
                route: 'AIR LINK',
                tools: 'FPV / RF',
                output: 'COMMS',
            },
            {
                kicker: 'DRONE × MCU / ROBOT',
                title: '飛ぶ機体も、制御とハードの延長にある',
                body: 'ドローンは空を飛ぶガジェットである前に、制御、電源、センサ、実装のまとまりでもあります。マイコン・ロボット班の感覚は、飛行体の理解にもかなり近いところがあります。',
                items: [
                    'flight controller 的な制御感覚が共通する',
                    'センサ、配線、電源まわりの理解がそのまま効く',
                    '市販機の先に自作・改造の視点が生まれる',
                ],
                route: 'CTRL BUS',
                tools: 'SENSOR / PWR',
                output: 'MOTION',
            },
            {
                kicker: 'MCU / ROBOT × SOFTWARE',
                title: '動くものを、可視化して、調整して、仕上げる',
                body: 'ハードが動き始めると、次に必要になるのは UI、ログ、可視化、解析です。マイコン・ロボット班とソフトウェア班の境界は、作っていくほど自然に薄くなっていきます。',
                items: [
                    '制御UIや監視画面を作る流れが生まれる',
                    'ログ取得や解析が改善に直結する',
                    'ハードとソフトの往復で完成度が上がる',
                ],
                route: 'I/O LOOP',
                tools: 'UI / LOG',
                output: 'TUNING',
            },
            {
                kicker: 'SOFTWARE × RADIO',
                title: '通信の理解は、コードでさらに広がる',
                body: '無線の運用や通信の理解は、ソフトウェア班の視点が入ることで可視化や解析へつながります。見えなかった信号が読めるようになると、活動の幅も一段広がります。',
                items: [
                    '通信ログや状態をコードで扱える',
                    '運用支援や可視化のツールが作れる',
                    'データ視点で無線を読み直せる',
                ],
                route: 'DATA LINK',
                tools: 'LOG / TOOL',
                output: 'ANALYSIS',
            },
        ];

        let activeIndex = 0;
        let autoTimer = null;
        let userLocked = false;

        const render = (index) => {
            const data = PAIRS[index];
            if (!data) return;
            activeIndex = index;
            kicker.textContent = data.kicker;
            title.textContent = data.title;
            body.textContent = data.body;
            route.textContent = data.route;
            tools.textContent = data.tools;
            output.textContent = data.output;

            list.replaceChildren(
                ...data.items.map((text) => {
                    const li = document.createElement('li');
                    li.textContent = text;
                    return li;
                })
            );

            buttons.forEach((button, buttonIndex) => {
                const isActive = buttonIndex === index;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });

            pairEls.forEach((pairEl, pairIndex) => {
                pairEl.classList.toggle('is-active', pairIndex === index);
            });
        };

        const stopAuto = () => {
            if (!autoTimer) return;
            clearInterval(autoTimer);
            autoTimer = null;
        };

        const startAuto = () => {
            if (userLocked || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            stopAuto();
            autoTimer = window.setInterval(() => {
                render((activeIndex + 1) % PAIRS.length);
            }, 5200);
        };

        buttons.forEach((button) => {
            const index = Number(button.dataset.cross);
            button.addEventListener('click', () => {
                userLocked = true;
                stopAuto();
                render(index);
            });

            button.addEventListener('mouseenter', () => {
                if (!window.matchMedia('(hover: hover)').matches) return;
                render(index);
            });
        });

        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (!entry) return;
            if (entry.isIntersecting) startAuto();
            else stopAuto();
        }, { threshold: 0.35 });

        observer.observe(section);
        render(0);
        startAuto();
    };

    setupCrossDivision();

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
