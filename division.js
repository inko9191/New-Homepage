/* ============================================================
   DENKEN // Division Pages
   ============================================================ */

(() => {
    'use strict';

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const APP_VERSION = '20260418-2348';

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

    normalizeInternalLinks();
    setupNav();
    setupReveal();
    setupYear();
    setupBackground();

    const division = document.body.dataset.division;
    if (division === 'radio') setupRadio();
    if (division === 'drone') setupDrone();
    if (division === 'robot') setupRobot();
    if (division === 'software') setupSoftware();
})();
