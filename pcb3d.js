/* ============================================================
   DENKEN // 3D PCB — hero (floating) + assembly (scroll-synced)
   Requires Three.js (loaded via CDN in index.html)
   ============================================================ */

(() => {
    'use strict';
    if (typeof THREE === 'undefined') {
        document.documentElement.classList.add('no-pcb3d');
        return;
    }

    const isSmall = () => window.matchMedia('(max-width: 820px)').matches;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeOutBack = t => { const c = 1.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const damp = (a, b, t) => a + (b - a) * t;
    const toMaterials = material => (Array.isArray(material) ? material : [material]);

    /* ---------- silkscreen texture ---------- */
    const makeBoardTexture = (withSilk = true) => {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 640;
        const ctx = c.getContext('2d');

        // base green
        const g = ctx.createLinearGradient(0, 0, 0, c.height);
        g.addColorStop(0, '#0b4a2b');
        g.addColorStop(1, '#073a21');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);

        // soldermask speckle
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
            ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
        }

        // copper traces
        ctx.strokeStyle = '#c89a4a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 18; i++) {
            ctx.beginPath();
            let x = Math.random() * c.width, y = Math.random() * c.height;
            ctx.moveTo(x, y);
            for (let s = 0; s < 5; s++) {
                x += (Math.random() - 0.5) * 200;
                y += Math.random() > 0.5 ? 0 : (Math.random() - 0.5) * 200;
                if (Math.random() > 0.5) x += (Math.random() - 0.5) * 200; else y += (Math.random() - 0.5) * 200;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // via dots
        ctx.fillStyle = '#d4a84f';
        for (let i = 0; i < 40; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * c.width, Math.random() * c.height, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (withSilk) {
            ctx.fillStyle = 'rgba(235,245,255,0.95)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 120px "Orbitron", sans-serif';
            ctx.fillText('DENKEN', c.width / 2, c.height / 2 - 30);
            ctx.font = 'bold 42px "JetBrains Mono", monospace';
            ctx.fillText('JA1YGX  //  EST. 中央大学', c.width / 2, c.height / 2 + 50);
            // corner marks
            ctx.font = '24px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText('R1', 40, 40);
            ctx.fillText('U1', 40, c.height - 30);
            ctx.textAlign = 'right';
            ctx.fillText('C3', c.width - 40, 40);
            ctx.fillText('L1', c.width - 40, c.height - 30);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
        return tex;
    };

    /* ---------- geometry factories ---------- */
    const BOARD_W = 5, BOARD_H = 3.2, BOARD_T = 0.18;

    const makeBoard = () => {
        const tex = makeBoardTexture(true);
        const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.3 });
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x07331c, roughness: 0.6 });
        const botMat = new THREE.MeshStandardMaterial({ color: 0x083820, roughness: 0.7 });
        const mats = [sideMat, sideMat, topMat, botMat, sideMat, sideMat];
        const geo = new THREE.BoxGeometry(BOARD_W, BOARD_T, BOARD_H);
        const mesh = new THREE.Mesh(geo, mats);
        mesh.castShadow = mesh.receiveShadow = true;
        return mesh;
    };

    const matResistorBody = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.55 });
    const matResistorPad = new THREE.MeshStandardMaterial({ color: 0xc9b27b, roughness: 0.3, metalness: 0.8 });
    const matCap = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.4, metalness: 0.5 });
    const matIC = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.35 });
    const matICPin = new THREE.MeshStandardMaterial({ color: 0xc8cad0, roughness: 0.25, metalness: 0.9 });
    const matConn = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.5 });

    const makeResistor = () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.12), matResistorBody);
        body.position.y = 0.04;
        const padL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), matResistorPad);
        padL.position.set(-0.14, 0.015, 0);
        const padR = padL.clone(); padR.position.x = 0.14;
        g.add(body, padL, padR);
        return g;
    };

    const makeCap = () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 18), matCap);
        body.position.y = 0.09;
        g.add(body);
        return g;
    };

    const makeIC = (w = 0.9, d = 0.55, accentColor = 0x00e5ff) => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), matIC);
        body.position.y = 0.07;
        g.add(body);

        // top dot
        const dot = new THREE.Mesh(
            new THREE.CircleGeometry(0.04, 16),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
        );
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(-w / 2 + 0.12, 0.141, -d / 2 + 0.12);
        g.add(dot);

        // accent glow strip
        const strip = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.6, 0.02),
            new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.8 })
        );
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(0, 0.141, d / 2 - 0.08);
        g.add(strip);

        // pins
        const pinCount = Math.max(4, Math.floor(w / 0.12));
        const spacing = w / pinCount;
        for (let i = 0; i < pinCount; i++) {
            const x = -w / 2 + spacing / 2 + i * spacing;
            const pinL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.08), matICPin);
            pinL.position.set(x, 0.02, -d / 2 - 0.02);
            const pinR = pinL.clone(); pinR.position.z = d / 2 + 0.02;
            g.add(pinL, pinR);
        }
        return g;
    };

    const makeLED = (color = 0xff2d9c) => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.08, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xf0eadf, roughness: 0.4 })
        );
        body.position.y = 0.04;
        const lens = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.06, 0.07),
            new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: 0,
                roughness: 0.2, metalness: 0,
            })
        );
        lens.position.y = 0.05;
        g.add(body, lens);
        g.userData.lens = lens;
        g.userData.ledColor = color;
        return g;
    };

    const makeConnector = () => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.32), matConn);
        body.position.y = 0.1;
        g.add(body);
        for (let i = 0; i < 6; i++) {
            const pin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), matICPin);
            pin.position.set(-0.45 + i * 0.18, 0.14, 0);
            g.add(pin);
        }
        return g;
    };

    /* ---------- BOM (bill of materials) for the assembly ---------- */
    // group index drives scroll stage: 0=passives R, 1=passives C, 2=ICs, 3=LEDs+RF+conn
    const BOM = [
        // resistors (group 0)
        ...Array.from({ length: 10 }).map((_, i) => ({
            make: makeResistor, group: 0,
            pos: [
                -2.0 + (i % 5) * 0.45,
                0,
                -1.2 + Math.floor(i / 5) * 0.35,
            ],
            rot: i % 2 ? Math.PI / 2 : 0,
        })),
        // caps (group 1)
        ...Array.from({ length: 6 }).map((_, i) => ({
            make: makeCap, group: 1,
            pos: [-2.0 + i * 0.42, 0, 1.1],
            rot: 0,
        })),
        // ICs (group 2)
        { make: () => makeIC(1.3, 0.7, 0x00e5ff), group: 2, pos: [0, 0, -0.1], rot: 0 },     // MCU (big)
        { make: () => makeIC(0.7, 0.45, 0xb400ff), group: 2, pos: [1.5, 0, 0.4], rot: 0 },   // sub IC
        { make: () => makeIC(0.55, 0.4, 0x7aff5c), group: 2, pos: [-1.6, 0, 0.4], rot: 0 },  // sub IC
        // RF crystal + connector (group 3)
        { make: makeConnector, group: 3, pos: [0, 0, 1.35], rot: 0 },
        // LEDs (group 3)
        { make: () => makeLED(0x00e5ff), group: 3, pos: [-1.8, 0, -0.3], rot: 0, led: true },
        { make: () => makeLED(0xff2d9c), group: 3, pos: [1.8, 0, -0.3], rot: 0, led: true },
        { make: () => makeLED(0xffd400), group: 3, pos: [-1.8, 0, 0.7], rot: 0, led: true },
        { make: () => makeLED(0x7aff5c), group: 3, pos: [1.8, 0, 0.7], rot: 0, led: true },
    ];

    /* ---------- common scene setup ---------- */
    const setupScene = (container, { tilt = 0.35 } = {}) => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
        camera.position.set(0, 3.4, 6.4);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isSmall() });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall() ? 1.2 : 2));
        container.appendChild(renderer.domElement);

        // lights
        scene.add(new THREE.AmbientLight(0x5a7aa0, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(3, 6, 4);
        scene.add(key);
        const rim = new THREE.PointLight(0x00e5ff, 1.4, 20);
        rim.position.set(-4, 2, -3);
        scene.add(rim);
        const rim2 = new THREE.PointLight(0xb400ff, 1.2, 20);
        rim2.position.set(4, 1.5, 3);
        scene.add(rim2);

        const root = new THREE.Group();
        root.rotation.x = tilt;
        scene.add(root);

        const resize = () => {
            const rect = container.getBoundingClientRect();
            const w = Math.round(rect.width || container.clientWidth);
            const h = Math.round(rect.height || container.clientHeight);
            if (!w || !h) return false;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            container.classList.add('is-ready');
            return true;
        };
        let resizeAttempts = 0;
        const ensureResize = () => {
            if (resize()) return;
            if (resizeAttempts >= 20) return;
            resizeAttempts += 1;
            requestAnimationFrame(ensureResize);
        };
        ensureResize();
        setTimeout(resize, 160);
        setTimeout(resize, 600);
        window.addEventListener('resize', resize);
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => resize());
            ro.observe(container);
        }

        return { scene, camera, renderer, root, resize };
    };

    /* ---------- HERO SCENE (gentle float + mouse parallax) ---------- */
    const startHero = () => {
        const el = document.getElementById('hero-scene');
        if (!el) return;
        const { scene, camera, renderer, root } = setupScene(el, { tilt: 0.3 });
        const tooltip = document.getElementById('hero-tooltip');
        const tooltipKicker = document.getElementById('hero-tooltip-kicker');
        const tooltipTitle = document.getElementById('hero-tooltip-title');
        const tooltipBody = document.getElementById('hero-tooltip-body');

        const board = makeBoard();
        root.add(board);

        const interactiveRoots = [];
        const pickables = [];
        const heroItems = [
            0, 2, 4, 6, 8, 10, 12, 14, 15,
            {
                index: 16,
                info: {
                    kicker: 'MCU / ROBOT',
                    title: 'STM32 control core',
                    body: 'センサ、モーター、制御ロジックを束ねるメインMCU。マイコン・ロボット班の象徴です。',
                },
            },
            {
                index: 17,
                info: {
                    kicker: 'SOFTWARE',
                    title: 'Tooling and firmware bridge',
                    body: '書いたコードを流し込み、可視化し、改善を回すためのソフトウェア側の接点。',
                },
            },
            {
                index: 18,
                info: {
                    kicker: 'DRONE',
                    title: 'Flight sensor rail',
                    body: '姿勢制御や飛行ログのためのセンサ系ブロック。飛ばす工学を担うレイヤです。',
                },
            },
            {
                index: 19,
                info: {
                    kicker: 'RADIO',
                    title: 'RF front-end',
                    body: 'アンテナ、通信、テレメトリへつながる無線ブロック。JA1YGXの存在感を1枚に圧縮しています。',
                },
            },
            20, 21, 22, 23,
        ].map(v => (typeof v === 'number' ? { index: v } : v));

        heroItems.forEach(spec => {
            const item = BOM[spec.index];
            if (!item) return;
            const m = item.make();
            m.position.set(item.pos[0], BOARD_T / 2, item.pos[2]);
            m.rotation.y = item.rot;
            m.userData.baseY = m.position.y;
            m.userData.baseScale = 1;
            if (item.led) m.userData.lens.material.emissiveIntensity = 0.6;
            if (spec.info) {
                m.userData.info = spec.info;
                interactiveRoots.push(m);
                m.traverse(obj => {
                    if (obj.isMesh) {
                        obj.userData.hoverRoot = m;
                        pickables.push(obj);
                    }
                });
            }
            root.add(m);
        });

        // mouse parallax
        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        const pointer = new THREE.Vector2(10, 10);
        const raycaster = new THREE.Raycaster();
        const worldPos = new THREE.Vector3();
        let hovered = null;

        window.addEventListener('mousemove', (e) => {
            target.x = (e.clientX / window.innerWidth - 0.5) * 0.3;
            target.y = (e.clientY / window.innerHeight - 0.5) * 0.2;
        }, { passive: true });

        const setTooltip = (info) => {
            if (!tooltip || !info) return;
            tooltipKicker.textContent = info.kicker;
            tooltipTitle.textContent = info.title;
            tooltipBody.textContent = info.body;
            tooltip.hidden = false;
        };

        const hideTooltip = () => {
            hovered = null;
            if (tooltip) tooltip.hidden = true;
        };

        el.addEventListener('pointermove', (e) => {
            const rect = el.getBoundingClientRect();
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });
        el.addEventListener('pointerleave', () => {
            pointer.x = 10;
            pointer.y = 10;
            hideTooltip();
        });

        const clock = new THREE.Clock();
        const tick = () => {
            const t = clock.getElapsedTime();
            current.x += (target.x - current.x) * 0.06;
            current.y += (target.y - current.y) * 0.06;
            root.rotation.y = t * 0.15 + current.x;
            root.rotation.x = 0.3 + current.y;
            root.position.y = Math.sin(t * 0.8) * 0.08;

            if (pickables.length) {
                raycaster.setFromCamera(pointer, camera);
                const hit = raycaster.intersectObjects(pickables, false)[0];
                const nextHovered = hit?.object?.userData?.hoverRoot || null;
                if (nextHovered !== hovered) {
                    hovered = nextHovered;
                    if (hovered?.userData?.info) setTooltip(hovered.userData.info);
                    else hideTooltip();
                }
            }

            interactiveRoots.forEach(group => {
                const active = group === hovered;
                const targetScale = active ? 1.08 : group.userData.baseScale;
                const targetY = group.userData.baseY + (active ? 0.08 : 0);
                group.scale.x = damp(group.scale.x, targetScale, 0.14);
                group.scale.y = damp(group.scale.y, targetScale, 0.14);
                group.scale.z = damp(group.scale.z, targetScale, 0.14);
                group.position.y = damp(group.position.y, targetY, 0.14);
                if (group.userData.lens) {
                    const targetGlow = active ? 1.3 : 0.6;
                    group.userData.lens.material.emissiveIntensity = damp(
                        group.userData.lens.material.emissiveIntensity,
                        targetGlow,
                        0.18
                    );
                }
            });

            if (hovered && tooltip) {
                hovered.getWorldPosition(worldPos);
                worldPos.y += 0.35;
                worldPos.project(camera);
                const x = (worldPos.x * 0.5 + 0.5) * el.clientWidth;
                const y = (-worldPos.y * 0.5 + 0.5) * el.clientHeight;
                tooltip.style.left = `${clamp(x, 26, el.clientWidth - 26)}px`;
                tooltip.style.top = `${clamp(y - 12, 34, el.clientHeight - 18)}px`;
            }

            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };
        tick();
    };

    /* ---------- ASSEMBLY SCENE (scroll-driven) ---------- */
    const startAssembly = () => {
        const el = document.getElementById('assembly-scene');
        const track = document.getElementById('assembly-track');
        const pf = document.getElementById('assembly-pf');
        const pct = document.getElementById('assembly-pct');
        const steps = document.querySelectorAll('.assembly__steps li');
        const intelKicker = document.getElementById('assembly-intel-kicker');
        const intelLink = document.getElementById('assembly-intel-link');
        const intelTitle = document.getElementById('assembly-intel-title');
        const intelBody = document.getElementById('assembly-intel-body');
        const intelList = document.getElementById('assembly-intel-list');
        if (!el || !track) return;
        const { scene, camera, renderer, root } = setupScene(el, { tilt: 0.32 });
        if (isSmall()) {
            root.scale.setScalar(0.4);
            root.position.set(0.18, -1.52, 0);
            root.rotation.x = 0.12;
        }

        const INTEL = [
            {
                kicker: 'RADIO DIVISION',
                linkHref: 'radio.html',
                linkLabel: '詳しく見る ↗',
                title: 'JA1YGX と無線コンテスト',
                body: '無線班はアマチュア無線局「中央大学アマチュア無線クラブ」を運営し、コンテスト参加、日々の無線交信、アンテナ製作を行います。',
                items: [
                    'コールサイン JA1YGX',
                    'ALL JA などのコンテスト参加',
                    '日々の無線交信',
                    'アンテナ製作',
                ],
            },
            {
                kicker: 'DRONE DIVISION',
                linkHref: 'drone.html',
                linkLabel: '詳しく見る ↗',
                title: '空撮と飛行会',
                body: 'ドローン班はドローンを使って主に空撮を行い、さまざまな場所へ行って飛行と撮影を楽しみます。2024年度は飛行会や白門祭での映像上映も掲載されています。',
                items: [
                    '主な活動は空撮',
                    '夏合宿 / 春合宿で飛行会',
                    '白門祭で空撮映像上映',
                    'FPV / 自作ドローン',
                ],
            },
            {
                kicker: 'MCU / ROBOT DIVISION',
                linkHref: 'robot.html',
                linkLabel: '詳しく見る ↗',
                title: '回路設計と電子工作',
                body: 'マイコン・ロボット班は主に電子工作を行い、作りたいものを少人数グループで制作します。回路設計、マイコン製作、プログラミングが活動の中心です。',
                items: [
                    '入室チェックセンサー',
                    '動くごみ箱',
                    '音ゲー解析',
                    '3Dプリンター導入',
                ],
            },
            {
                kicker: 'SOFTWARE DIVISION',
                linkHref: 'software.html',
                linkLabel: '詳しく見る ↗',
                title: 'HP制作・アプリ・サーバー・AI',
                body: 'ソフトウェア班は、電研HPの製作、アプリ開発、サーバーを活用したデータ管理、AIを活用した作品制作を行います。班紹介ページでもサイト運営やサーバー周りに触れています。',
                items: [
                    '電研HPの製作',
                    'アプリ開発',
                    'サーバー活用 / データ管理',
                    'AI作品の制作',
                ],
            },
            {
                kicker: 'NEXT STEP',
                linkHref: '#top',
                linkLabel: 'MENU BAR ↑',
                title: '詳しくはメニューバーから！',
                body: '各班の説明ページは上のメニューバーから飛べます。気になった班から、そのまま詳しいページへどうぞ。',
                items: [
                    '無線班',
                    'ドローン班',
                    'マイコン・ロボット班',
                    'ソフトウェア班',
                ],
            },
        ];

        let intelIndex = -1;
        const renderIntel = (index) => {
            if (!intelKicker || !intelTitle || !intelBody || !intelList || !intelLink) return;
            if (index === intelIndex || !INTEL[index]) return;
            const data = INTEL[index];
            intelIndex = index;
            intelKicker.textContent = data.kicker;
            intelLink.href = data.linkHref;
            intelLink.textContent = data.linkLabel;
            intelTitle.textContent = data.title;
            intelBody.textContent = data.body;
            intelList.replaceChildren(
                ...data.items.map(text => {
                    const li = document.createElement('li');
                    li.textContent = text;
                    return li;
                })
            );
        };
        renderIntel(0);

        const board = makeBoard();
        const boardMats = toMaterials(board.material);
        boardMats.forEach(m => {
            m.transparent = true;
            m.opacity = 0;
        });
        const topMat = boardMats[2];
        topMat.emissive = new THREE.Color(0x00e5ff);
        topMat.emissiveIntensity = 0;
        root.add(board);

        const logoGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(4.4, 1.1),
            new THREE.MeshBasicMaterial({
                color: 0x00e5ff,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            })
        );
        logoGlow.rotation.x = -Math.PI / 2;
        logoGlow.position.set(0, BOARD_T / 2 + 0.01, 0);
        root.add(logoGlow);

        // build all parts; store meta for animation
        const groupCounts = {};
        BOM.forEach(item => {
            groupCounts[item.group] = (groupCounts[item.group] || 0) + 1;
        });
        const seenInGroup = {};
        const parts = BOM.map(item => {
            const m = item.make();
            m.traverse(o => {
                if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; }
            });
            const finalY = BOARD_T / 2;
            const localIdx = seenInGroup[item.group] || 0;
            seenInGroup[item.group] = localIdx + 1;
            m.position.set(item.pos[0], finalY + 4, item.pos[2]); // start high
            m.rotation.y = item.rot;
            root.add(m);
            return {
                mesh: m,
                finalY,
                group: item.group,
                led: !!item.led,
                localIdx,
                groupSize: groupCounts[item.group],
            };
        });

        let targetP = 0, currentP = 0;

        const updateScroll = () => {
            const r = track.getBoundingClientRect();
            const viewH = window.innerHeight;
            const travel = track.offsetHeight - viewH;
            const p = clamp(-r.top / Math.max(1, travel), 0, 1);
            targetP = p;
        };
        window.addEventListener('scroll', updateScroll, { passive: true });
        window.addEventListener('resize', updateScroll);
        updateScroll();

        // Assembly stages (0..1 mapped to stages)
        // 0.00-0.15: board fade in
        // 0.15-0.35: passives group 0 (resistors)
        // 0.35-0.55: group 1 (caps)
        // 0.55-0.75: group 2 (ICs)
        // 0.75-0.92: group 3 (LEDs/connector)
        // 0.92-1.00: boot — LEDs flare, camera close
        const STAGES = [
            { from: 0.00, to: 0.15, step: 0 },
            { from: 0.15, to: 0.35, group: 0, step: 1 },
            { from: 0.35, to: 0.55, group: 1, step: 1 },
            { from: 0.55, to: 0.75, group: 2, step: 2 },
            { from: 0.75, to: 0.92, group: 3, step: 3 },
            { from: 0.92, to: 1.00, boot: true, step: 4 },
        ];

        const stageProgress = (p, s) => clamp((p - s.from) / Math.max(1e-6, s.to - s.from), 0, 1);

        const updateStepUI = (activeIdx) => {
            steps.forEach((el, i) => el.classList.toggle('is-active', i <= activeIdx));
        };

        const applyProgress = (p) => {
            if (pf) pf.style.width = (p * 100).toFixed(1) + '%';
            if (pct) pct.textContent = Math.floor(p * 100);

            // board
            const boardP = stageProgress(p, STAGES[0]);
            boardMats.forEach(m => m.opacity = easeOutCubic(boardP));

            // each group
            const groupProgressMap = {};
            STAGES.forEach(s => { if (s.group !== undefined) groupProgressMap[s.group] = stageProgress(p, s); });
            const bootP = stageProgress(p, STAGES[5]);

            let activeStep = 0;
            for (const s of STAGES) { if (p >= s.from) activeStep = s.step; }
            updateStepUI(activeStep);
            renderIntel(activeStep);

            parts.forEach(part => {
                const gp = groupProgressMap[part.group] ?? 0;
                // stagger within group
                const stagger = part.localIdx / Math.max(1, part.groupSize);
                const local = clamp((gp - stagger * 0.4) / 0.6, 0, 1);
                const eased = easeOutBack(local);
                const drop = lerp(4, 0, easeOutCubic(local));
                part.mesh.position.y = part.finalY + drop;
                part.mesh.rotation.z = lerp(0.4, 0, eased);
                part.mesh.traverse(o => {
                    if (o.isMesh) o.material.opacity = local;
                });
                // LED boot
                if (part.led) {
                    const blink = 0.5 + 0.5 * Math.sin(performance.now() / 120 + part.localIdx);
                    part.mesh.userData.lens.material.emissiveIntensity = bootP * (0.8 + 0.7 * blink);
                }
            });

            topMat.emissiveIntensity = bootP * 0.38;
            logoGlow.material.opacity = bootP * 0.18;

            // camera gentle push-in as it assembles
            if (isSmall()) {
                camera.position.x = 0.22;
                camera.position.z = lerp(13.6, 11.8, easeOutCubic(p));
                camera.position.y = lerp(6.9, 5.7, easeOutCubic(p));
                camera.lookAt(0.18, -1.18, 0);
            } else {
                camera.position.x = 0;
                camera.position.z = lerp(7.2, 5.6, easeOutCubic(p));
                camera.position.y = lerp(3.9, 2.8, easeOutCubic(p));
                camera.lookAt(0, 0, 0);
            }
        };

        const tick = () => {
            currentP += (targetP - currentP) * 0.1;
            root.rotation.y += isSmall() ? 0.0014 : 0.0025;
            applyProgress(currentP);
            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };
        tick();
    };

    /* ---------- kick off (after loader finish) ---------- */
    const start = () => {
        let started = false;
        try {
            if (!isSmall()) {
                startHero();
                started = true;
            }
        } catch (_) {
            /* hero can fail independently */
        }

        try {
            startAssembly();
            started = true;
        } catch (_) {
            /* assembly can fail independently */
        }

        if (!started) {
            document.documentElement.classList.add('no-pcb3d');
        }
    };

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
})();
