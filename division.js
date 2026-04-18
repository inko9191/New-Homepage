/* ============================================================
   DENKEN // Division Pages
   ============================================================ */

(() => {
    'use strict';

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const APP_VERSION = '20260418-2385';

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
        qsa('a[href]').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;
            if (/^(?:[a-z]+:|\/\/|mailto:|tel:|#)/i.test(href)) return;
            link.href = toAbsolutePageUrl(href);
        });
    };

    const setupNav = () => {
        const nav = qs('.nav');
        const navToggle = qs('.nav__toggle');
        const navMenu = qs('.nav__menu');
        const navGroups = qsa('.nav__group');

        if (!nav || !navToggle || !navMenu) return;

        window.addEventListener('scroll', () => {
            nav.classList.toggle('is-scrolled', window.scrollY > 24);
        }, { passive: true });

        const closeGroups = () => {
            navGroups.forEach((group) => {
                group.classList.remove('is-open');
                const button = qs('.nav__link', group);
                if (button) button.setAttribute('aria-expanded', 'false');
            });
        };

        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(isOpen));
            if (!isOpen) closeGroups();
        });

        navGroups.forEach((group) => {
            const button = qs('.nav__link', group);
            if (!button) return;

            button.addEventListener('click', (event) => {
                const willOpen = button.getAttribute('aria-expanded') !== 'true';
                if (window.matchMedia('(max-width: 820px)').matches || !group.matches(':hover')) {
                    event.preventDefault();
                }
                closeGroups();
                if (willOpen) {
                    group.classList.add('is-open');
                    button.setAttribute('aria-expanded', 'true');
                }
            });
        });

        qsa('a', navMenu).forEach((link) => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
                closeGroups();
            });
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.nav__group')) closeGroups();
        });
    };

    const setupReveal = () => {
        const targets = qsa('.reveal');
        if (!targets.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.15 });

        targets.forEach((target) => observer.observe(target));
    };

    const setupYear = () => {
        const year = qs('#year');
        if (year) year.textContent = String(new Date().getFullYear());
    };

    const parseColor = (raw) => {
        const value = String(raw || '').trim();
        if (!value) return [0, 229, 255];

        if (value.startsWith('#')) {
            const hex = value.slice(1);
            if (hex.length === 3) {
                return hex.split('').map((part) => parseInt(part + part, 16));
            }
            if (hex.length === 6) {
                return [
                    parseInt(hex.slice(0, 2), 16),
                    parseInt(hex.slice(2, 4), 16),
                    parseInt(hex.slice(4, 6), 16),
                ];
            }
        }

        const match = value.match(/rgba?\(([^)]+)\)/i);
        if (match) {
            return match[1]
                .split(',')
                .slice(0, 3)
                .map((part) => Math.max(0, Math.min(255, parseInt(part.trim(), 10) || 0)));
        }

        return [0, 229, 255];
    };

    const rgba = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

    const setupBackground = () => {
        const canvas = qs('#bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const styles = getComputedStyle(document.body);
        const accent = parseColor(styles.getPropertyValue('--accent'));
        const hot = parseColor(styles.getPropertyValue('--accent-hot'));
        const nodes = [];
        const pointer = { x: -9999, y: -9999 };
        let width = 0;
        let height = 0;
        let dpr = 1;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        };

        const seedNodes = () => {
            nodes.length = 0;
            const total = Math.max(28, Math.min(68, Math.floor((width * height) / 26000)));
            for (let i = 0; i < total; i += 1) {
                nodes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.24,
                    vy: (Math.random() - 0.5) * 0.24,
                    r: Math.random() * 1.3 + 0.5,
                });
            }
        };

        const updatePointer = (clientX, clientY) => {
            pointer.x = clientX;
            pointer.y = clientY;
        };

        window.addEventListener('mousemove', (event) => {
            updatePointer(event.clientX, event.clientY);
        }, { passive: true });

        window.addEventListener('touchmove', (event) => {
            const touch = event.touches[0];
            if (touch) updatePointer(touch.clientX, touch.clientY);
        }, { passive: true });

        window.addEventListener('mouseleave', () => {
            pointer.x = -9999;
            pointer.y = -9999;
        });

        window.addEventListener('resize', () => {
            resize();
            seedNodes();
        });

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            nodes.forEach((node) => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;

                const dx = pointer.x - node.x;
                const dy = pointer.y - node.y;
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared < 26000) {
                    const force = (1 - distanceSquared / 26000) * 0.018;
                    node.vx += dx * force * 0.001;
                    node.vy += dy * force * 0.001;
                }

                node.vx *= 0.995;
                node.vy *= 0.995;
            });

            for (let i = 0; i < nodes.length; i += 1) {
                for (let j = i + 1; j < nodes.length; j += 1) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = 150;
                    if (distance > maxDistance) continue;
                    ctx.strokeStyle = rgba(accent, (1 - distance / maxDistance) * 0.18);
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            nodes.forEach((node) => {
                const dx = pointer.x - node.x;
                const dy = pointer.y - node.y;
                const near = Math.sqrt(dx * dx + dy * dy) < 120;
                ctx.fillStyle = near ? rgba(hot, 0.9) : rgba(accent, 0.72);
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(draw);
        };

        resize();
        seedNodes();
        draw();
    };

    const renderList = (element, items) => {
        if (!element) return;
        element.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
    };

    const setupRadio = () => {
        const dial = qs('#radio-dial');
        if (!dial) return;

        const screen = {
            code: qs('#radio-code'),
            title: qs('#radio-title'),
            body: qs('#radio-body'),
            detail: qs('#radio-detail-title'),
            points: qs('#radio-points'),
        };
        const bars = qsa('#radio-meter span');

        const events = [
            {
                code: 'JA1YGX',
                title: '中央大学アマチュア無線クラブ',
                body: '無線班はアマチュア無線局「中央大学アマチュア無線クラブ」を運営し、コンテスト参加を主軸に活動します。',
                detail: 'BASE OPERATION',
                points: [
                    '主な活動は無線コンテスト参加',
                    '日々の無線交信も継続して行う',
                    'アンテナ製作も活動の一部',
                ],
            },
            {
                code: 'APR // ALL JA',
                title: '4月 新歓企画・ALL JA コンテスト',
                body: '公式の年間スケジュールでは、4月に新歓企画と ALL JA コンテストが掲載されています。',
                detail: 'APRIL LOG',
                points: [
                    '年度の立ち上がりとなる時期',
                    '新歓企画とコンテスト運用が並ぶ',
                    '対外運用の空気感を最初に掴みやすい',
                ],
            },
            {
                code: 'JUN // ASIAN DX',
                title: '6月 ALL ASIAN DX contest 電信部門',
                body: '6月には ALL ASIAN DX contest の電信部門が掲載されています。',
                detail: 'JUNE LOG',
                points: [
                    '電信部門として掲載',
                    '全国だけでなく DX 系の運用にも触れる',
                    'アンテナ設置準備は早めに始まる',
                ],
            },
            {
                code: 'JUL // 6m DOWN',
                title: '7月 6m AND DOWN コンテスト',
                body: '7月の公式スケジュールには 6m AND DOWN コンテストが掲載されています。',
                detail: 'JULY LOG',
                points: [
                    'V / UHF 帯の活動イメージが見えやすい',
                    '班の主力行事のひとつとして並ぶ',
                    '運用前の設営と調整も経験できる',
                ],
            },
            {
                code: 'AUG // FIELD DAY',
                title: '8月 フィールドデーコンテスト',
                body: '8月にはフィールドデーコンテストが掲載されています。',
                detail: 'AUGUST LOG',
                points: [
                    '屋外設営の文脈が強い行事',
                    'アンテナや無線設備の準備が前倒しで進む',
                    '運用体験だけでなく設営力も問われる',
                ],
            },
            {
                code: 'SEP // ASIAN DX',
                title: '9月 ALL ASIAN DX contest 電話部門',
                body: '9月には ALL ASIAN DX contest の電話部門が掲載されています。',
                detail: 'SEPTEMBER LOG',
                points: [
                    '電信部門に対して電話部門が並ぶ',
                    '音声運用の流れを体験できる',
                    '年間の中で DX 系行事が複数入る',
                ],
            },
            {
                code: 'OCT // ZENSHIGUN',
                title: '10月 全市全郡コンテスト',
                body: '10月の公式スケジュールには全市全郡コンテストが掲載されています。',
                detail: 'OCTOBER LOG',
                points: [
                    '秋の主要コンテストとして掲載',
                    '年間スケジュールの締めに近い時期',
                    '日々の交信やアンテナ製作の経験が活きる',
                ],
            },
        ];

        const render = (index) => {
            const current = events[index] || events[0];
            screen.code.textContent = current.code;
            screen.title.textContent = current.title;
            screen.body.textContent = current.body;
            screen.detail.textContent = current.detail;
            renderList(screen.points, current.points);
            bars.forEach((bar, barIndex) => {
                bar.classList.toggle('is-active', barIndex <= index);
                bar.style.transform = `scaleY(${0.34 + Math.min(1, (barIndex + 1) / (index + 1 || 1)) * 0.66})`;
            });
        };

        dial.max = String(events.length - 1);
        dial.addEventListener('input', () => render(Number(dial.value)));
        render(Number(dial.value) || 0);
    };

    const setupDrone = () => {
        const view = qs('#fpv-view');
        if (!view) return;

        const horizon = qs('#fpv-horizon');
        const title = qs('#drone-title');
        const body = qs('#drone-body');
        const points = qs('#drone-points');
        const hudScene = qs('#drone-hud-scene');
        const hudType = qs('#drone-hud-type');
        const hudMode = qs('#drone-hud-mode');
        const hudNote = qs('#drone-hud-note');
        const buttons = qsa('button[data-scene]');

        const scenes = {
            seiseki: {
                label: '聖蹟桜ヶ丘',
                type: 'PLACE',
                mode: 'AERIAL',
                note: '公式ページに掲載されている飛行地のひとつ',
                title: '聖蹟桜ヶ丘',
                body: 'ドローン班のページでは、飛行や空撮を行った場所のひとつとして聖蹟桜ヶ丘が掲載されています。',
                points: [
                    '主な活動は空撮',
                    'さまざまな場所へ行って飛行と撮影を行う',
                    '掲載地そのものが活動範囲の広さを示している',
                ],
            },
            ubara: {
                label: '鵜原',
                type: 'PLACE',
                mode: 'AERIAL',
                note: '各地へ出向いて飛行する活動スタイルが見える',
                title: '鵜原',
                body: '公式ページに掲載されている飛行地のひとつが鵜原です。班の活動がキャンパス内に閉じていないことが伝わります。',
                points: [
                    '飛行会と空撮の文脈で読める場所',
                    '移動先での撮影を前提にした班活動',
                    '空から風景を切り取る体験が中心にある',
                ],
            },
            ashinoko: {
                label: '芦ノ湖',
                type: 'PLACE',
                mode: 'AERIAL',
                note: '合宿や遠征と相性の良いロケーションの掲載例',
                title: '芦ノ湖',
                body: '芦ノ湖も公式ページに掲載されている飛行地のひとつです。遠征先での飛行や撮影の雰囲気を想像しやすい場所です。',
                points: [
                    'ページ上の掲載地のひとつ',
                    '飛行と撮影を楽しむ班のカラーが出る',
                    '空撮主体の活動内容と自然に接続する',
                ],
            },
            hakumon: {
                label: '白門祭',
                type: 'EVENT',
                mode: 'SHOWCASE',
                note: '2024年11月は白門祭（理工）で空撮映像を上映',
                title: '白門祭（理工）での空撮映像上映',
                body: '2024年度イベントとして、11月の白門祭（理工）で空撮映像を上映したことが公式ページに掲載されています。',
                points: [
                    '飛ばして終わりではなく見せる場がある',
                    '撮影した映像を作品として出力している',
                    '班の活動が学内イベントにも接続している',
                ],
            },
        };

        const render = (key) => {
            const current = scenes[key] || scenes.seiseki;
            hudScene.textContent = current.label;
            hudType.textContent = current.type;
            hudMode.textContent = current.mode;
            hudNote.textContent = current.note;
            title.textContent = current.title;
            body.textContent = current.body;
            renderList(points, current.points);
            buttons.forEach((button) => {
                button.classList.toggle('is-active', button.dataset.scene === key);
            });
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => render(button.dataset.scene));
        });

        const tilt = (clientX, clientY) => {
            const rect = view.getBoundingClientRect();
            const x = (clientX - rect.left) / rect.width - 0.5;
            const y = (clientY - rect.top) / rect.height - 0.5;
            horizon.style.transform = `translate(${x * 18}px, ${y * 12}px) rotate(${x * 8}deg)`;
        };

        view.addEventListener('pointermove', (event) => tilt(event.clientX, event.clientY));
        view.addEventListener('pointerleave', () => {
            horizon.style.transform = '';
        });

        render('seiseki');
    };

    const setupRobot = () => {
        const bench = qs('.bench');
        if (!bench) return;

        const title = qs('#robot-stage-title');
        const body = qs('#robot-stage-body');
        const points = qs('#robot-stage-points');
        const buttons = qsa('button[data-stage]');

        const stages = {
            sensor: {
                title: '入室チェックセンサー / 完成',
                body: '2024年度の企画一覧では、入室チェックセンサーが完成済みの制作物として掲載されています。',
                points: [
                    '2024年度の完成企画として掲載',
                    '電子工作と状態管理の相性が良いテーマ',
                    '完成品としてページ内でも確認できる',
                ],
            },
            dustbox: {
                title: '動くごみ箱 / 制作中',
                body: '公式ページでは、動くごみ箱が制作中の企画として掲載されています。',
                points: [
                    '2024年度の進行中プロジェクト',
                    '機構と制御を組み合わせる題材',
                    '回路設計とプログラミングの両方が必要になる',
                ],
            },
            cheat: {
                title: '音ゲー解析 / 制作中',
                body: '2024年度の企画一覧では、音ゲー解析も制作中として掲載されています。',
                points: [
                    '解析系の切り口も扱っている',
                    '電子工作だけでなくプログラミングにも接続する',
                    '少人数グループ制作の幅が見える題材',
                ],
            },
            printer: {
                title: '3Dプリンター / 導入',
                body: '公式ページには「今年度3Dプリンターを購入」とあり、制作環境そのものも強化されています。',
                points: [
                    '今年度導入された新しい制作設備',
                    '外装や治具を自分たちで作りやすくなる',
                    '回路だけでなく筐体づくりにも広がる',
                ],
            },
        };

        const render = (key) => {
            const current = stages[key] || stages.sensor;
            bench.dataset.stage = key;
            title.textContent = current.title;
            body.textContent = current.body;
            renderList(points, current.points);
            buttons.forEach((button) => {
                button.classList.toggle('is-active', button.dataset.stage === key);
            });
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => render(button.dataset.stage));
        });

        render('sensor');
    };

    const setupSoftware = () => {
        const scene = qs('.system-map__scene');
        if (!scene) return;

        const title = qs('#software-title');
        const body = qs('#software-body');
        const consoleLines = qs('#software-console-lines');
        const buttons = qsa('button[data-service]');
        const nodes = qsa('.system-node');
        const lines = qsa('.system-line');

        const services = {
            website: {
                title: '電研HPの製作',
                body: '公式の「電研について」では、ソフトウェア班の活動として電研HPの製作が挙げられています。',
                lines: [
                    'frontend.route -> denken.org',
                    'content.update -> division info',
                    'official note -> このサイトの運営',
                ],
            },
            app: {
                title: 'アプリ開発',
                body: '公式ページでは、アプリ開発もソフトウェア班の活動項目として掲載されています。',
                lines: [
                    'app.dev -> member projects',
                    'ui.state -> local tools',
                    'feature.scope -> 自由制作ベース',
                ],
            },
            server: {
                title: 'サーバーを活用したデータ管理',
                body: 'サーバーを活用したデータ管理は、公式の紹介文に明記されている活動内容です。',
                lines: [
                    'server.sync -> data management',
                    'ops.status -> online',
                    'storage.route -> shared systems',
                ],
            },
            ai: {
                title: 'AIを活用した作品制作',
                body: '公式の「電研について」では、AIを活用した作品の制作もソフトウェア班の活動として紹介されています。',
                lines: [
                    'model.run -> creative output',
                    'artifact.build -> AI works',
                    'team.flow -> code + experiment',
                ],
            },
        };

        const render = (key) => {
            const current = services[key] || services.website;
            title.textContent = current.title;
            body.textContent = current.body;
            consoleLines.innerHTML = current.lines.map((line) => `<li>${line}</li>`).join('');

            buttons.forEach((button) => {
                button.classList.toggle('is-active', button.dataset.service === key);
            });

            nodes.forEach((node) => {
                const nodeKey = node.dataset.node;
                node.classList.toggle('is-active', nodeKey === key || (key !== 'server' && nodeKey === 'server'));
            });

            lines.forEach((line) => {
                const targets = (line.dataset.targets || '').split(/\s+/).filter(Boolean);
                line.classList.toggle('system-line--active', targets.includes(key));
            });
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => render(button.dataset.service));
        });

        render('website');
    };

    /* ===== GIMMICKS ===== */

    // --- Radio CW Key Lab ---
    const MORSE = {
        '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
        '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
        '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
        '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
        '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
        '--..': 'Z',
        '-----': '0', '.----': '1', '..---': '2', '...--': '3', '....-': '4',
        '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9',
        '.-.-.-': '.', '--..--': ',', '..--..': '?', '-.-.--': '!',
        '-....-': '-', '.----.': "'", '-..-.': '/',
    };

    const textToMorse = (str) => str.toUpperCase().split('').map((ch) => {
        if (ch === ' ') return '/';
        const entry = Object.entries(MORSE).find(([, v]) => v === ch);
        return entry ? entry[0] : '';
    }).filter(Boolean).join(' ');

    const setupCwKey = () => {
        const key = qs('#cw-key');
        if (!key) return;
        const morseEl = qs('#cw-morse');
        const textEl = qs('#cw-text');
        const presets = qsa('[data-cw-preset]');
        const clearBtn = qs('[data-cw-clear]');

        const UNIT = 110;
        const DASH_THRESHOLD = UNIT * 2;
        const LETTER_GAP = UNIT * 3;
        const WORD_GAP = UNIT * 6;

        let pressedAt = 0;
        let pending = '';
        let flushTimer = null;
        let audioCtx = null;
        let oscNode = null;

        const ensureAudio = () => {
            if (audioCtx) return audioCtx;
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (_) { audioCtx = null; }
            return audioCtx;
        };

        const tone = (on) => {
            const ctx = ensureAudio();
            if (!ctx) return;
            if (on) {
                if (oscNode) return;
                oscNode = ctx.createOscillator();
                const gain = ctx.createGain();
                oscNode.type = 'sine';
                oscNode.frequency.value = 620;
                gain.gain.value = 0.0001;
                gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
                oscNode.connect(gain).connect(ctx.destination);
                oscNode.start();
                oscNode._gain = gain;
            } else if (oscNode) {
                const now = ctx.currentTime;
                oscNode._gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
                const n = oscNode;
                setTimeout(() => { try { n.stop(); } catch (_) {} }, 60);
                oscNode = null;
            }
        };

        const render = () => {
            morseEl.textContent = pending.length ? pending : '—';
            const tokens = pending.trim().split(/\s+/);
            const decoded = tokens.map((tok) => {
                if (tok === '/') return ' ';
                return MORSE[tok] || (tok ? '?' : '');
            }).join('');
            textEl.textContent = decoded || '—';
        };

        const scheduleFlush = (delay) => {
            if (flushTimer) clearTimeout(flushTimer);
            flushTimer = setTimeout(() => {
                if (!pending.endsWith(' ') && pending.length) pending += ' ';
                render();
                flushTimer = setTimeout(() => {
                    if (!pending.endsWith('/ ') && pending.trim().length) pending += '/ ';
                    render();
                }, WORD_GAP - delay);
            }, delay);
        };

        const pressDown = (event) => {
            if (event) event.preventDefault();
            ensureAudio();
            if (pressedAt) return;
            pressedAt = performance.now();
            key.classList.add('is-pressed');
            if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
            tone(true);
        };

        const pressUp = (event) => {
            if (event) event.preventDefault();
            if (!pressedAt) return;
            const dur = performance.now() - pressedAt;
            pressedAt = 0;
            key.classList.remove('is-pressed');
            tone(false);
            pending += dur >= DASH_THRESHOLD ? '-' : '.';
            render();
            scheduleFlush(LETTER_GAP);
        };

        key.addEventListener('pointerdown', pressDown);
        key.addEventListener('pointerup', pressUp);
        key.addEventListener('pointerleave', (e) => { if (pressedAt) pressUp(e); });
        key.addEventListener('pointercancel', pressUp);

        window.addEventListener('keydown', (event) => {
            if (event.code !== 'Space' && event.key !== ' ') return;
            if (document.activeElement && document.activeElement.matches('input, textarea')) return;
            if (event.repeat) return;
            pressDown(event);
        });
        window.addEventListener('keyup', (event) => {
            if (event.code !== 'Space' && event.key !== ' ') return;
            if (!pressedAt) return;
            pressUp(event);
        });

        presets.forEach((btn) => {
            btn.addEventListener('click', () => {
                const map = {
                    CQ: 'CQ DE JA1YGX',
                    HELLO: 'HELLO WORLD',
                    '599': '599',
                };
                const key = btn.dataset.cwPreset;
                const text = map[key] || key;
                pending = textToMorse(text) + ' ';
                render();
            });
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                pending = '';
                render();
            });
        }

        render();
    };

    // --- Drone FPV Mode overlay ---
    const setupFpvMode = () => {
        const toggle = qs('#fpv-toggle');
        if (!toggle) return;

        const overlay = document.createElement('div');
        overlay.className = 'fpv-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="fpv-overlay__frame"></div>
            <div class="fpv-overlay__corner tl"></div>
            <div class="fpv-overlay__corner tr"></div>
            <div class="fpv-overlay__corner bl"></div>
            <div class="fpv-overlay__corner br"></div>
            <div class="fpv-overlay__status">● REC FPV LINK</div>
            <button class="fpv-overlay__close" type="button">EXIT</button>
            <div class="fpv-overlay__horizon"><span id="fpv-horizon-bar"></span></div>
            <div class="fpv-overlay__crosshair">
                <span class="fpv-overlay__dot"></span>
            </div>
            <div class="fpv-overlay__hud">
                <div class="fpv-overlay__chip"><span>CALL</span><strong>JA1YGX</strong></div>
                <div class="fpv-overlay__chip align-center"><span>ALT</span><strong id="fpv-alt">0m</strong></div>
                <div class="fpv-overlay__chip align-right"><span>HDG</span><strong id="fpv-hdg">000°</strong></div>
                <div class="fpv-overlay__chip"><span>SCENE</span><strong>聖蹟桜ヶ丘</strong></div>
                <div class="fpv-overlay__chip align-center"><span>MODE</span><strong>AERIAL</strong></div>
                <div class="fpv-overlay__chip align-right"><span>BATT</span><strong id="fpv-batt">92%</strong></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector('.fpv-overlay__close');
        const bar = overlay.querySelector('#fpv-horizon-bar');
        const altEl = overlay.querySelector('#fpv-alt');
        const hdgEl = overlay.querySelector('#fpv-hdg');
        const battEl = overlay.querySelector('#fpv-batt');

        let active = false;
        let tilt = { x: 0, y: 0 };
        let altBase = 42;
        let hdgBase = 12;
        let battery = 92;
        let ticker = null;
        let pointerHandler = null;
        let orientationHandler = null;

        const applyTilt = () => {
            const pitch = Math.max(-12, Math.min(12, tilt.y));
            const roll = Math.max(-14, Math.min(14, tilt.x));
            if (bar) bar.style.transform = `translate(-50%, calc(-50% + ${pitch * 2}px)) rotate(${roll}deg)`;
        };

        const enable = async () => {
            if (active) return;
            active = true;
            document.body.classList.add('fpv-on');
            toggle.querySelector('span').textContent = 'EXIT FPV';

            pointerHandler = (event) => {
                const x = (event.clientX / window.innerWidth) - 0.5;
                const y = (event.clientY / window.innerHeight) - 0.5;
                tilt.x = x * 18;
                tilt.y = y * 10;
                applyTilt();
            };
            window.addEventListener('pointermove', pointerHandler);

            const bindOrientation = () => {
                orientationHandler = (event) => {
                    tilt.x = event.gamma || 0;
                    tilt.y = (event.beta || 0) - 30;
                    applyTilt();
                };
                window.addEventListener('deviceorientation', orientationHandler);
            };

            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const res = await DeviceOrientationEvent.requestPermission();
                    if (res === 'granted') bindOrientation();
                } catch (_) { /* fallback to pointer */ }
            } else if ('DeviceOrientationEvent' in window) {
                bindOrientation();
            }

            ticker = setInterval(() => {
                altBase = Math.max(18, Math.min(120, altBase + (Math.random() - 0.5) * 4));
                hdgBase = (hdgBase + (Math.random() - 0.3) * 6 + 360) % 360;
                battery = Math.max(42, battery - 0.1);
                altEl.textContent = `${Math.round(altBase)}m`;
                hdgEl.textContent = `${String(Math.round(hdgBase)).padStart(3, '0')}°`;
                battEl.textContent = `${Math.round(battery)}%`;
            }, 500);
        };

        const disable = () => {
            if (!active) return;
            active = false;
            document.body.classList.remove('fpv-on');
            toggle.querySelector('span').textContent = 'ENTER FPV';
            if (pointerHandler) window.removeEventListener('pointermove', pointerHandler);
            if (orientationHandler) window.removeEventListener('deviceorientation', orientationHandler);
            if (ticker) clearInterval(ticker);
            pointerHandler = null;
            orientationHandler = null;
            ticker = null;
        };

        toggle.addEventListener('click', () => (active ? disable() : enable()));
        closeBtn.addEventListener('click', disable);
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') disable();
        });
    };

    // --- Robot Lチカ LAB ---
    const setupLab = () => {
        const led = qs('#lab-led');
        if (!led) return;
        const runBtn = qs('#lab-run');
        const stopBtn = qs('#lab-stop');
        const titleEl = qs('#lab-title');
        const descEl = qs('#lab-desc');
        const codeEl = qs('#lab-code');
        const patternBtns = qsa('[data-pattern]');

        const color = (cls, body) => `<span class="${cls}">${body}</span>`;
        const kw = (s) => color('kw', s);
        const fn = (s) => color('fn', s);
        const num = (s) => color('num', s);
        const com = (s) => color('com', s);

        const patterns = {
            blink: {
                title: 'BLINK',
                desc: '500ms ごとに LED を ON / OFF する最小 Lチカ。',
                code: `${kw('const')} LED = ${num('13')};\n\n${kw('void')} ${fn('setup')}() {\n  ${fn('pinMode')}(LED, OUTPUT);\n}\n\n${kw('void')} ${fn('loop')}() {\n  ${fn('digitalWrite')}(LED, HIGH);\n  ${fn('delay')}(${num('500')});\n  ${fn('digitalWrite')}(LED, LOW);\n  ${fn('delay')}(${num('500')});\n}`,
                sequence: [[1, 500], [0, 500]],
            },
            fade: {
                title: 'FADE',
                desc: 'PWM で明るさを滑らかに往復。呼吸するような Lチカ。',
                code: `${kw('const')} LED = ${num('9')};\n\n${kw('void')} ${fn('setup')}() {\n  ${fn('pinMode')}(LED, OUTPUT);\n}\n\n${kw('void')} ${fn('loop')}() {\n  ${kw('for')} (${kw('int')} v = ${num('0')}; v <= ${num('255')}; v++) {\n    ${fn('analogWrite')}(LED, v);\n    ${fn('delay')}(${num('6')});\n  }\n  ${kw('for')} (${kw('int')} v = ${num('255')}; v >= ${num('0')}; v--) {\n    ${fn('analogWrite')}(LED, v);\n    ${fn('delay')}(${num('6')});\n  }\n}`,
                sequence: 'fade',
            },
            sos: {
                title: 'SOS',
                desc: 'モールスで S・O・S。無線班のロマンをマイコンで再現。',
                code: `${com('// ... --- ... (S O S)')}\n${kw('const')} LED = ${num('13')};\n${kw('const')} DOT = ${num('160')};\n\n${kw('void')} ${fn('setup')}() { ${fn('pinMode')}(LED, OUTPUT); }\n\n${kw('void')} ${fn('flash')}(${kw('int')} ms) {\n  ${fn('digitalWrite')}(LED, HIGH); ${fn('delay')}(ms);\n  ${fn('digitalWrite')}(LED, LOW);  ${fn('delay')}(DOT);\n}\n\n${kw('void')} ${fn('loop')}() {\n  ${kw('for')} (${kw('int')} i = ${num('0')}; i < ${num('3')}; i++) ${fn('flash')}(DOT);\n  ${fn('delay')}(DOT);\n  ${kw('for')} (${kw('int')} i = ${num('0')}; i < ${num('3')}; i++) ${fn('flash')}(DOT * ${num('3')});\n  ${fn('delay')}(DOT);\n  ${kw('for')} (${kw('int')} i = ${num('0')}; i < ${num('3')}; i++) ${fn('flash')}(DOT);\n  ${fn('delay')}(DOT * ${num('6')});\n}`,
                sequence: [
                    [1, 160], [0, 160], [1, 160], [0, 160], [1, 160], [0, 480],
                    [1, 480], [0, 160], [1, 480], [0, 160], [1, 480], [0, 480],
                    [1, 160], [0, 160], [1, 160], [0, 160], [1, 160], [0, 900],
                ],
            },
        };

        let running = false;
        let currentKey = 'blink';
        let rafId = 0;
        let timeoutId = 0;

        const stop = () => {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            if (timeoutId) clearTimeout(timeoutId);
            rafId = 0;
            timeoutId = 0;
            led.classList.remove('is-on');
            led.style.filter = '';
        };

        const runSequence = (seq) => {
            let i = 0;
            const step = () => {
                if (!running) return;
                const [state, dur] = seq[i % seq.length];
                led.classList.toggle('is-on', state === 1);
                i += 1;
                timeoutId = setTimeout(step, dur);
            };
            step();
        };

        const runFade = () => {
            const startTime = performance.now();
            const cycle = 2400;
            led.classList.add('is-on');
            const tick = (now) => {
                if (!running) return;
                const p = ((now - startTime) % cycle) / cycle;
                const v = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
                led.style.filter = `brightness(${0.25 + v * 1.1}) saturate(${0.6 + v * 0.7})`;
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        };

        const run = () => {
            stop();
            running = true;
            const pattern = patterns[currentKey];
            if (pattern.sequence === 'fade') runFade();
            else runSequence(pattern.sequence);
        };

        const render = (key) => {
            const pattern = patterns[key] || patterns.blink;
            currentKey = key;
            titleEl.textContent = pattern.title;
            descEl.textContent = pattern.desc;
            codeEl.innerHTML = `<code>${pattern.code}</code>`;
            patternBtns.forEach((btn) => {
                btn.classList.toggle('is-active', btn.dataset.pattern === key);
            });
            if (running) run();
        };

        patternBtns.forEach((btn) => {
            btn.addEventListener('click', () => render(btn.dataset.pattern));
        });

        runBtn.addEventListener('click', run);
        stopBtn.addEventListener('click', stop);

        render('blink');
    };

    // --- Software WEB TERMINAL ---
    const setupTerminal = () => {
        const form = qs('#term-form');
        if (!form) return;
        const body = qs('#term-body');
        const input = qs('#term-input');
        const chips = qsa('[data-cmd]');

        const history = [];
        let hPointer = -1;

        const print = (html, cls) => {
            const line = document.createElement('div');
            line.className = `term__line${cls ? ' ' + cls : ''}`;
            line.innerHTML = html;
            body.appendChild(line);
            body.scrollTop = body.scrollHeight;
        };

        const echo = (cmd) => {
            const line = document.createElement('div');
            line.className = 'term__line cmd';
            line.textContent = cmd;
            body.appendChild(line);
            body.scrollTop = body.scrollHeight;
        };

        const commands = {
            help: () => {
                print('Available commands:');
                print('  <span class="hl">help</span>     this screen');
                print('  <span class="hl">whoami</span>   current user');
                print('  <span class="hl">ls</span>       list files');
                print('  <span class="hl">cat</span>      cat about.md / cat divisions.md');
                print('  <span class="hl">ja1ygx</span>   show call sign card');
                print('  <span class="hl">status</span>   club status summary');
                print('  <span class="hl">roll</span>     roll a dice');
                print('  <span class="hl">matrix</span>   hack the mainframe');
                print('  <span class="hl">clear</span>    clear screen');
            },
            whoami: () => print('denken (Chuo University Electrical Engineering Research Club)'),
            ls: () => {
                print('<span class="hl">about.md</span>     <span class="hl">divisions.md</span>     <span class="hl">ja1ygx.txt</span>     <span class="hl">README</span>');
            },
            status: () => {
                print('DIVISIONS: <span class="hl">4</span>  (radio / drone / mcu / software)');
                print('CALL SIGN: <span class="hl">JA1YGX</span>');
                print('SITE     : <span class="hl">den-ken.org</span>');
                print('BUILD    : <span class="dim">live</span>');
            },
            ja1ygx: () => {
                print('<span class="hl">┌──────────────────────────────────────┐</span>');
                print('<span class="hl">│  CALL : JA1YGX                       │</span>');
                print('<span class="hl">│  CLUB : 中央大学 電気工学研究部      │</span>');
                print('<span class="hl">│  MODE : CW / SSB / CONTEST           │</span>');
                print('<span class="hl">└──────────────────────────────────────┘</span>');
            },
            roll: () => print(`🎲 rolled <span class="hl">${Math.floor(Math.random() * 6) + 1}</span>`),
            matrix: () => {
                const rows = 10;
                const cols = 36;
                for (let r = 0; r < rows; r += 1) {
                    let line = '';
                    for (let c = 0; c < cols; c += 1) {
                        const ch = Math.random() > 0.5 ? '1' : '0';
                        line += ch;
                    }
                    print(`<span class="hl">${line}</span>`);
                }
                print('<span class="dim">// wake up, neo...</span>');
            },
            clear: () => { body.innerHTML = ''; },
        };

        commands.cat = (arg) => {
            if (arg === 'about.md') {
                print('# 電気工学研究部 / DENKEN');
                print('中央大学 理工学部 後楽園キャンパスを拠点に活動する');
                print('電子工作・無線・ドローン・ソフトウェアのサークルです。');
            } else if (arg === 'divisions.md') {
                print('- <span class="hl">radio</span>    : JA1YGX を運営、コンテストが主軸');
                print('- <span class="hl">drone</span>    : 空撮と飛行会、白門祭で上映');
                print('- <span class="hl">mcu</span>      : 電子工作・PCB・マイコン制御');
                print('- <span class="hl">software</span> : HP / アプリ / サーバー / AI');
            } else if (arg === 'ja1ygx.txt') {
                commands.ja1ygx();
            } else {
                print(`<span class="err">cat: ${arg || '(no file)'} : No such file</span>`);
            }
        };

        const run = (raw) => {
            const trimmed = raw.trim();
            if (!trimmed) return;
            echo(trimmed);
            history.push(trimmed);
            hPointer = history.length;
            const [cmd, ...rest] = trimmed.split(/\s+/);
            const handler = commands[cmd.toLowerCase()];
            if (handler) handler(rest.join(' '));
            else print(`<span class="err">command not found: ${cmd}</span> <span class="dim">(try help)</span>`);
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = input.value;
            input.value = '';
            run(value);
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (history.length === 0) return;
                hPointer = Math.max(0, hPointer - 1);
                input.value = history[hPointer] || '';
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (history.length === 0) return;
                hPointer = Math.min(history.length, hPointer + 1);
                input.value = history[hPointer] || '';
            }
        });

        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                run(chip.dataset.cmd);
                input.focus();
            });
        });

        print('<span class="hl">denken</span> shell v1.0 — type <span class="hl">help</span> to see commands.');
    };

    normalizeInternalLinks();
    setupNav();
    setupReveal();
    setupYear();
    setupBackground();

    const division = document.body.dataset.division;
    if (division === 'radio') { setupRadio(); setupCwKey(); }
    if (division === 'drone') { setupDrone(); setupFpvMode(); }
    if (division === 'robot') { setupRobot(); setupLab(); }
    if (division === 'software') { setupSoftware(); setupTerminal(); }
})();
