// ==UserScript==
// @name         Nova Client
// @namespace    https://github.com/karizzmaa/nova-client/
// @version      2.1.1
// @description  Customizable Mod menu for Survev.io.
// @author       karizzmaa
// @match        *://survev.io/*
// @match        *://66.179.254.36/*
// @match        *://185.126.158.61/*
// @match        *://resurviv.biz/*
// @match        *://survev.github.io/survev/*
// @match        *://survev.leia-is.gay/*
// @match        *://survivx.org/*
// @match        *://kxs.rip/*
// @match        *://localhost:3000/*
// @match        *://veldreth.com/*
// @match        *://eu-comp.net/*
// @match        *://66.179.92.117/*
// @match        *://zurviv.io/*
// @match        *://cursev.io/*
// @match        *://eu-comp.zurviv.io/*
// @match        *://uno.cheap/*
// @exclude      https://survev.io/stats/
// @exclude      https://survev.io/changelog
// @exclude      https://survev.io/privacy
// @exclude      https://survev.io/changelogRec
// @exclude      https://survev.io/hof
// @exclude      https://survev.io/attribution.txt
// @grant        GM_addStyle
// @icon         https://raw.githubusercontent.com/karizzmaa/nova-client/refs/heads/main/icon.png
// ==/UserScript==

(function() {
    'use strict';

    const defaultBackgrounds = [
        { id: 'b1', name: 'Turkey', data: 'https://raw.githubusercontent.com/survev/survev/refs/heads/master/client/public/img/main_splash_turkey_01.png', builtIn: true },
        { id: 'b2', name: 'Easter', data: 'https://github.com/survev/survev/blob/master/client/public/img/main_splash_easter.png?raw=true', builtIn: true },
        { id: 'b3', name: 'Desert', data: 'https://github.com/survev/survev/blob/master/client/public/img/main_splash_desert_01.png?raw=true', builtIn: true },
        { id: 'b4', name: 'Halloween', data: 'https://raw.githubusercontent.com/survev/survev/refs/heads/master/client/public/img/main_splash_halloween.png', builtIn: true },
        { id: 'b5', name: 'Cobalt', data: 'https://github.com/survev/survev/blob/master/client/public/img/main_splash_cobalt.png?raw=true', builtIn: true },
        { id: 'b10', name: 'Main', data: 'https://raw.githubusercontent.com/survev/survev/refs/heads/master/client/public/img/main_splash.png', builtIn: true }
    ];

    const defaultConfig = {
        fps: false,
        ping: false,
        uncap: false,
        glass: true,
        fastMenu: false,
        cleanMenu: false,
        hideAccountBlock: false,
        useClassicLogo: false,
        autoFS: false,
        activeCrosshair: null,
        customCrosshairs: [],
        activeBackground: 'b10',
        customBackgrounds: [],
        activeKeybindId: null,
        customKeybinds: [],
        shuffleEnabled: false,
        fpsPos: { top: '60%', left: '10px' },
        pingPos: { top: '65%', left: '10px' },
        customLabels: []
    };

    let config = JSON.parse(localStorage.getItem('nova_config')) || defaultConfig;
    config = { ...defaultConfig, ...config };

    if(!config.fpsPos) config.fpsPos = defaultConfig.fpsPos;
    if(!config.pingPos) config.pingPos = defaultConfig.pingPos;
    if(!config.customLabels) config.customLabels = [];
    if(!config.customKeybinds) config.customKeybinds = [];

    let shuffleInterval = null;

    function saveConfig() { localStorage.setItem('nova_config', JSON.stringify(config)); }

    function updateGameKeybinds(bindString) {
        let gameConfig = JSON.parse(localStorage.getItem('surviv_config')) || {};
        gameConfig.binds = bindString;
        localStorage.setItem('surviv_config', JSON.stringify(gameConfig));
    }

    let fpsDisplay = null;
    let fpsAnimationId = null;
    let pingDisplay = null;
    let ws = null;
    const originalRAF = window.requestAnimationFrame;

    GM_addStyle(`
        #nova-menu {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.7);
            width: 580px; height: 500px; background: rgba(20, 20, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
            color: white; font-family: 'Segoe UI', system-ui, sans-serif;
            display: none; flex-direction: column; overflow: hidden; z-index: 10000;
            opacity: 0; box-shadow: 0 25px 50px rgba(0,0,0,0.5); user-select: none;
        }
        .nova-animate { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease; }
        .nova-glass { backdrop-filter: blur(20px) saturate(180%); background: rgba(20, 20, 20, 0.6) !important; }
        #nova-menu.active { display: flex; opacity: 1; transform: translate(-50%, -50%) scale(1); }
        #nova-header { padding: 14px 20px; background: rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center; cursor: move; }
        #nova-nav { display: flex; gap: 8px; padding: 10px 15px; background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.05); overflow-x: auto; }
        .nav-item { padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap; color: rgba(255, 255, 255, 0.6); transition: 0.2s; }
        .nav-item.active { background: rgba(255, 255, 255, 0.12); color: #60cdff; font-weight: 600; }
        #nova-content { padding: 20px; flex-grow: 1; overflow-y: auto; position: relative; }
        .cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .cat-title { font-size: 20px; font-weight: 700; }
        .item-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .item-card {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px; aspect-ratio: 1/1; display: flex; flex-direction: column;
            align-items: center; justify-content: center; position: relative; cursor: pointer; transition: 0.2s; overflow: hidden;
        }
        .item-card:hover { background: rgba(255,255,255,0.1); border-color: #60cdff; }
        .item-card.active { border: 2px solid #60cdff; background: rgba(96, 205, 255, 0.1); }
        .preview-img { width: 100%; height: 70%; object-fit: cover; pointer-events: none; opacity: 0.8; }
        .xhair-preview { width: 42px; height: 42px; object-fit: contain; margin-bottom: 10px; }
        .item-name { font-size: 11px; margin-top: 5px; opacity: 0.9; text-align: center; padding: 0 5px; }
        .shuffle-btn { width: 32px; height: 32px; cursor: pointer; border-radius: 6px; padding: 6px; transition: 0.2s; background: rgba(255,255,255,0.05); }
        .shuffle-btn:hover { background: rgba(96, 205, 255, 0.2); }
        .shuffle-btn.active { background: #60cdff; }
        .shuffle-icon { width: 100%; height: 100%; transition: filter 0.3s; }
        .inverted-icon { filter: invert(1); }
        .add-btn { border: 2px dashed rgba(255,255,255,0.2); background: transparent; }
        .item-actions { position: absolute; top: 5px; right: 5px; display: flex; gap: 4px; opacity: 0; transition: 0.2s; }
        .item-card:hover .item-actions { opacity: 1; }
        .action-btn { background: rgba(0,0,0,0.6); border-radius: 4px; padding: 2px 5px; font-size: 10px; color: white; }
        .action-btn:hover { background: #60cdff; color: black; }
        .tweak-card { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; margin-bottom: 8px; }
        .win-switch { position: relative; display: inline-block; width: 44px; height: 22px; }
        .win-switch input { opacity: 0; width: 0; height: 0; }
        .win-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; border: 2px solid rgba(255, 255, 255, 0.5); transition: .2s; border-radius: 22px; }
        .win-slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 4px; bottom: 3px; background-color: rgba(255, 255, 255, 0.8); transition: .2s; border-radius: 50%; }
        input:checked + .win-slider { background-color: #60cdff; border-color: #60cdff; }
        input:checked + .win-slider:before { transform: translateX(20px); background-color: #000; }
        .nova-hidden { display: none !important; }
        .nova-aligned-bar { position: relative !important; margin-top: 60px !important; display: flex !important; justify-content: center !important; }
        .move-btn { margin-right: 10px; background: rgba(255,255,255,0.1); border:none; color:white; border-radius:4px; padding: 4px 8px; cursor: pointer; transition:0.2s; font-size:11px;}
        .move-btn:hover { background: #60cdff; color:black; }
        #edit-hud { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(20,20,20,0.9); border: 1px solid rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 30px; display: none; gap: 10px; z-index: 10002; backdrop-filter: blur(10px); }
        .hud-btn { padding: 8px 20px; border-radius: 20px; border:none; cursor:pointer; font-weight:600; }
        .hud-btn.reset { background: rgba(255,50,50,0.2); color: #ff6b6b; }
        .hud-btn.done { background: #60cdff; color: black; }
        .nova-label { position: fixed; color: white; font-size: 14px; text-shadow: 1px 1px 2px black; background: rgba(0,0,0,0.3); padding: 3px 8px; border-radius: 5px; z-index: 10001; pointer-events: none; user-select: none; }
        .draggable { pointer-events: auto !important; cursor: grab; border: 2px dashed #60cdff; background: rgba(96,205,255,0.2) !important; }
        .draggable:active { cursor: grabbing; }
        .nova-modal { position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index: 10; }
        .modal-box { background: #1a1a1a; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); width: 300px; display:flex; flex-direction:column; gap:10px; }
        .modal-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 8px; border-radius: 4px; outline: none; }
        .modal-row { display: flex; justify-content: space-between; align-items: center; }
        .color-picker { width: 50px; height: 30px; border: none; cursor: pointer; }
        .bind-icon { width: 40px; height: 40px; margin-bottom: 10px; opacity: 0.7; }
        .nova-clean-centered {   left: 50% !important;    right: auto !important;    transform: translateX(-50%) !important; display: flex !important;    justify-content: center !important;    align-items: center !important;
}

    `);

    const glassStyleId = 'glassmorphism-start-menu-bg-only';
    const glassCSS = `
        #start-menu{
            background:rgba(25,25,25,.45)!important;
            backdrop-filter:blur(14px)saturate(130%);
            -webkit-backdrop-filter:blur(14px)saturate(130%);
            border-radius:18px;
            border:1px solid rgba(255,255,255,.15);
            box-shadow:0 8px 30px rgba(0,0,0,.5),inset 0 0 0 1px rgba(255,255,255,.04)
        }
        #start-menu *{
            backdrop-filter:none!important;
            -webkit-backdrop-filter:none!important
        }`;

    function toggleGlassStyle(enabled) {
        let existing = document.getElementById(glassStyleId);
        if (enabled) {
            if (!existing) {
                const s = document.createElement('style');
                s.id = glassStyleId;
                s.textContent = glassCSS;
                document.head.appendChild(s);
            }
        } else {
            if (existing) existing.remove();
        }
    }

    new MutationObserver(() => {
        if (config.glass && document.querySelector('#start-menu')) {
            toggleGlassStyle(true);
        }
    }).observe(document.documentElement, { childList: true, subtree: true });

    function applyCrosshair(base64) {
        const target = document.querySelector("#game-area-wrapper") || document.querySelector("canvas");
        if (target) target.style.cursor = `url(${base64}) 16 16, auto`;
    }

function applyBackground(url) {
    const bg = document.querySelector("#background");
    if (!bg) return;
    bg.style.backgroundImage = `url("${url}")`;
}

    function doShuffle() {
        const pool = [...defaultBackgrounds, ...config.customBackgrounds];
        const randomBg = pool[Math.floor(Math.random() * pool.length)];
        config.activeBackground = randomBg.id;
        saveConfig();
        applyBackground(randomBg.data);
    }

    function toggleShuffle(enabled) {
        config.shuffleEnabled = enabled;
        saveConfig();
        if (enabled) {
            if (!shuffleInterval) shuffleInterval = setInterval(doShuffle, 600000);
        } else {
            clearInterval(shuffleInterval);
            shuffleInterval = null;
        }
    }

    function extractBase64(input) {
        const match = input.match(/data:image\/[a-zA-Z]+;base64,[^'")\s]+/);
        return match ? match[0] : input;
    }

    const editHud = document.createElement('div');
    editHud.id = 'edit-hud';
    editHud.innerHTML = `<button class="hud-btn reset">Reset</button><button class="hud-btn done">Done</button>`;
    document.body.appendChild(editHud);

    function enterEditMode(element, configKey, defaultPos, onDone) {
        if (!element) return;
        toggleMenu(false);
        editHud.style.display = 'flex';
        element.classList.add('draggable');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        const onMouseDown = (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; initialLeft = element.offsetLeft; initialTop = element.offsetTop; e.preventDefault(); };
        const onMouseMove = (e) => { if (!isDragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; element.style.left = `${initialLeft + dx}px`; element.style.top = `${initialTop + dy}px`; element.style.transform = 'none'; };
        const onMouseUp = () => { isDragging = false; };
        element.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        editHud.querySelector('.reset').onclick = () => { element.style.top = defaultPos.top; element.style.left = defaultPos.left; if(defaultPos.top.includes('%')) element.style.transform = 'translateY(-50%)'; };
        editHud.querySelector('.done').onclick = () => {
            if (configKey) {
                if (typeof configKey === 'string') { config[configKey] = { top: element.style.top, left: element.style.left }; }
                else if (typeof configKey === 'object' && configKey.type === 'label') {
                    const lbl = config.customLabels.find(l => l.id === configKey.id);
                    if(lbl) { lbl.top = element.style.top; lbl.left = element.style.left; }
                }
                saveConfig();
            }
            element.classList.remove('draggable');
            element.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            editHud.style.display = 'none';
            toggleMenu(true);
            if(onDone) onDone();
        };
    }

    function toggleFPS(enabled) {
        config.fps = enabled; saveConfig();
        if (enabled && !fpsDisplay) {
            fpsDisplay = document.createElement('div');
            fpsDisplay.className = 'nova-label';
            fpsDisplay.style.top = config.fpsPos.top;
            fpsDisplay.style.left = config.fpsPos.left;
            if(config.fpsPos.top.includes('%')) fpsDisplay.style.transform = 'translateY(-50%)';
            document.body.appendChild(fpsDisplay);
            let times = [];
            const run = () => {
                fpsAnimationId = requestAnimationFrame(() => {
                    const now = performance.now();
                    while (times.length > 0 && times[0] <= now - 1000) times.shift();
                    times.push(now);
                    if (fpsDisplay) { fpsDisplay.innerHTML = `${times.length} FPS`; run(); }
                });
            };
            run();
        } else if (!enabled && fpsDisplay) { fpsDisplay.remove(); fpsDisplay = null; cancelAnimationFrame(fpsAnimationId); }
    }

    function togglePing(enabled) {
        config.ping = enabled; saveConfig();
        if (enabled && !pingDisplay) {
            pingDisplay = document.createElement('div');
            pingDisplay.className = 'nova-label';
            pingDisplay.innerHTML = 'Ping: -- ms';
            pingDisplay.style.top = config.pingPos.top;
            pingDisplay.style.left = config.pingPos.left;
            if(config.pingPos.top.includes('%')) pingDisplay.style.transform = 'translateY(-50%)';
            document.body.appendChild(pingDisplay);
            initPingSocket();
        } else if (!enabled && pingDisplay) {
            if(ws) ws.close();
            if(pingDisplay) pingDisplay.remove();
            pingDisplay = null;
        }
    }

    function initPingSocket() {
        const getWsUrl = () => {
            const reg = document.getElementById("server-select-main")?.value || 'na';
            const map = { na: 'usr', eu: 'eur', asia: 'asr', sa: 'sa' };
            return `wss://${map[reg] || 'usr'}.mathsiscoolfun.com:8001/ptc`;
        };
        const startPing = () => {
            if (ws) ws.close();
            ws = new WebSocket(getWsUrl());
            let sendTime;
            ws.onopen = () => { ws.send(new ArrayBuffer(1)); sendTime = Date.now(); };
            ws.onmessage = () => {
                const diff = Date.now() - sendTime;
                if (pingDisplay) {
                    pingDisplay.innerHTML = `Ping: ${diff} ms`;
                    pingDisplay.style.color = diff > 120 ? "#ff4d4d" : (diff > 80 ? "#ffa500" : "white");
                }
                setTimeout(() => { if (ws && ws.readyState === 1) { sendTime = Date.now(); ws.send(new ArrayBuffer(1)); } }, 1500);
            };
            ws.onclose = () => { if (config.ping && pingDisplay) pingDisplay.innerHTML = "Ping: Offline"; };
            ws.onerror = () => { if (pingDisplay) pingDisplay.innerHTML = "Ping: Error"; };
        };
        document.addEventListener('click', (e) => { if (e.target.classList?.contains('btn-green') || e.target.id === 'btn-start-team') { setTimeout(startPing, 1000); } });
    }

    function renderCustomLabels() {
        document.querySelectorAll('.nova-custom-lbl').forEach(e => e.remove());
        config.customLabels.forEach(lbl => {
            const el = document.createElement('div');
            el.className = 'nova-label nova-custom-lbl';
            el.id = `lbl-${lbl.id}`;
            el.innerText = lbl.text;
            el.style.color = lbl.color;
            if(lbl.bold) el.style.fontWeight = 'bold';
            if(lbl.italic) el.style.fontStyle = 'italic';
            el.style.top = lbl.top;
            el.style.left = lbl.left;
            document.body.appendChild(el);
        });
    }

    function openLabelCreator() {
        const modal = document.createElement('div');
        modal.className = 'nova-modal';
        modal.innerHTML = `
            <div class="modal-box">
                <h3 style="margin:0">Create Label</h3>
                <input class="modal-input" type="text" id="lbl-text" placeholder="Label Text (e.g. Nickname)">
                <div class="modal-row"><span>Color:</span><input type="color" id="lbl-color" value="#ffffff" class="color-picker"></div>
                <div class="modal-row"><label><input type="checkbox" id="lbl-bold"> Bold</label><label><input type="checkbox" id="lbl-italic"> Italic</label></div>
                <div class="modal-row" style="margin-top:10px"><button class="hud-btn reset" id="lbl-cancel">Cancel</button><button class="hud-btn done" id="lbl-save">Create & Place</button></div>
            </div>
        `;
        menu.appendChild(modal);
        modal.querySelector('#lbl-cancel').onclick = () => modal.remove();
        modal.querySelector('#lbl-save').onclick = () => {
            const text = modal.querySelector('#lbl-text').value;
            if(!text) return;
            const newLabel = { id: Date.now(), text, color: modal.querySelector('#lbl-color').value, bold: modal.querySelector('#lbl-bold').checked, italic: modal.querySelector('#lbl-italic').checked, top: '50%', left: '50%' };
            config.customLabels.push(newLabel);
            saveConfig();
            renderCustomLabels();
            modal.remove();
            const el = document.getElementById(`lbl-${newLabel.id}`);
            enterEditMode(el, { type: 'label', id: newLabel.id }, { top: '50%', left: '50%' }, () => loadCategory('Labels'));
        };
    }

    function toggleAutoFS(enabled) {
        config.autoFS = enabled; saveConfig();
        if (enabled) {
            const fs = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); window.removeEventListener('mousedown', fs); };
            window.addEventListener('mousedown', fs);
        }
    }

function toggleCleanMenu(enabled) {
    config.cleanMenu = enabled;
    saveConfig();

    const targets = [
        '#news-block',
        '#left-column',
        '#social-share-block',
        'a[href*="privacy"]',
        'a[href*="changelog"]',
        '.language-select-wrap'
    ];

    targets.forEach(s =>
        document.querySelectorAll(s).forEach(el =>
            enabled
                ? el.classList.add('nova-hidden')
                : el.classList.remove('nova-hidden')
        )
    );

    const bar = document.getElementById('start-bottom-right');
    const menuEl = document.getElementById('start-menu');

    if (bar && menuEl) {
        if (enabled) {
            bar.classList.add('nova-aligned-bar');
            bar.classList.add('nova-clean-centered');
            menuEl.appendChild(bar);
        } else {
            bar.classList.remove('nova-aligned-bar');
            bar.classList.remove('nova-clean-centered');
            document.body.appendChild(bar);
        }
    }
}
    function toggleAccountBlock(enabled) {
        config.hideAccountBlock = enabled;
        saveConfig();

        const selector = '.account-block';
        document.querySelectorAll(selector).forEach(el => {
        if (enabled) {
            el.classList.add('nova-hidden');
        } else {
            el.classList.remove('nova-hidden');
        }
    });
}
function toggleClassicLogo(enabled) {
    config.classicLogo = enabled;
    saveConfig();

    const OLD_LOGO = 'https://survev.io/img/survev_logo_full.png';
    const NEW_LOGO = 'https://survev.io/img/surviv_logo_full.png';

    const targetSrc = enabled ? OLD_LOGO : NEW_LOGO;
    const replacementSrc = enabled ? NEW_LOGO : OLD_LOGO;

    document.querySelectorAll('img').forEach(img => {
        if (img.src === targetSrc) {
            img.src = replacementSrc;
        }
    });

    document.querySelectorAll('*').forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg.includes(targetSrc)) {
            el.style.backgroundImage = bg.replace(targetSrc, replacementSrc);
        }
    });
}
    function loadCategory(cat) {
        contentArea.innerHTML = `
            <div class="cat-header">
                <div class="cat-title">${cat}</div>
                ${cat === 'Backgrounds' ? `
                    <div id="shuffle-trigger" class="shuffle-btn ${config.shuffleEnabled ? 'active' : ''}" title="Auto-Shuffle Every 10 Mins">
                        <img src="https://www.svgrepo.com/show/533712/shuffle.svg" class="shuffle-icon ${!config.glass ? 'inverted-icon' : ''}">
                    </div>
                ` : ''}
            </div>
        `;
        const grid = document.createElement('div');
        grid.className = 'item-grid';

        if (cat === 'Crosshairs') {
            const addBtn = document.createElement('div');
            addBtn.className = 'item-card add-btn';
            addBtn.innerHTML = `<span style="font-size:30px">+</span><span class="item-name">Add Crosshair</span>`;
            addBtn.onclick = () => {
                const name = prompt("Name:"); if (!name) return;
                const input = prompt("Paste Bookmarklet or Base64:"); if (!input) return;
                config.customCrosshairs.push({ id: Date.now(), name, data: extractBase64(input) });
                saveConfig(); loadCategory('Crosshairs');
            };
            grid.appendChild(addBtn);
            config.customCrosshairs.forEach(xh => {
                const card = document.createElement('div');
                card.className = `item-card ${config.activeCrosshair === xh.id ? 'active' : ''}`;
                card.innerHTML = `<img class="xhair-preview" src="${xh.data}"><span class="item-name">${xh.name}</span><div class="item-actions"><div class="action-btn edit">Edit</div><div class="action-btn del">Del</div></div>`;
                card.onclick = () => { config.activeCrosshair = xh.id; saveConfig(); applyCrosshair(xh.data); loadCategory('Crosshairs'); };
                card.querySelector('.edit').onclick = (e) => { e.stopPropagation(); const n = prompt("New Name:", xh.name); if(n) xh.name = n; saveConfig(); loadCategory('Crosshairs'); };
                card.querySelector('.del').onclick = (e) => { e.stopPropagation(); config.customCrosshairs = config.customCrosshairs.filter(i=>i.id!==xh.id); saveConfig(); loadCategory('Crosshairs'); };
                grid.appendChild(card);
            });
            contentArea.appendChild(grid);
        } else if (cat === 'Keybinds') {
            const addBtn = document.createElement('div');
            addBtn.className = 'item-card add-btn';
            addBtn.innerHTML = `<span style="font-size:30px">+</span><span class="item-name">Add Profile</span>`;
            addBtn.onclick = () => {
                const name = prompt("Profile Name:"); if (!name) return;
                const bindStr = prompt("Paste Keybind String"); if (!bindStr) return;
                config.customKeybinds.push({ id: Date.now(), name, data: bindStr });
                saveConfig(); loadCategory('Keybinds');
            };
            grid.appendChild(addBtn);
            config.customKeybinds.forEach(kb => {
                const card = document.createElement('div');
                card.className = `item-card ${config.activeKeybindId === kb.id ? 'active' : ''}`;
                card.innerHTML = `<img class="bind-icon" src="https://www.svgrepo.com/show/347645/keyboard.svg" style="${!config.glass ? 'filter:invert(1)' : ''}"><span class="item-name">${kb.name}</span><div class="item-actions"><div class="action-btn edit">Edit</div><div class="action-btn del">Del</div></div>`;
                card.onclick = () => {
                    config.activeKeybindId = kb.id;
                    saveConfig();
                    updateGameKeybinds(kb.data);
                    alert(`Applied Keybind Profile: ${kb.name}`);
                    loadCategory('Keybinds');
                };
                card.querySelector('.edit').onclick = (e) => {
                    e.stopPropagation();
                    const n = prompt("New Name:", kb.name); if(n) kb.name = n;
                    const d = prompt("New Bind String:", kb.data); if(d) kb.data = d;
                    saveConfig(); loadCategory('Keybinds');
                };
                card.querySelector('.del').onclick = (e) => { e.stopPropagation(); config.customKeybinds = config.customKeybinds.filter(i=>i.id!==kb.id); saveConfig(); loadCategory('Keybinds'); };
                grid.appendChild(card);
            });
            contentArea.appendChild(grid);
        } else if (cat === 'Backgrounds') {
            const shuffleBtn = contentArea.querySelector('#shuffle-trigger');
            shuffleBtn.onclick = () => { const newState = !config.shuffleEnabled; toggleShuffle(newState); loadCategory('Backgrounds'); };
            const addBtn = document.createElement('div');
            addBtn.className = 'item-card add-btn';
            addBtn.innerHTML = `<span style="font-size:30px">+</span><span class="item-name">Add Background</span>`;
            addBtn.onclick = () => {
                const choice = confirm("Press OK for URL or Cancel for File Upload");
                const name = prompt("Name:"); if (!name) return;
                if (choice) { const url = prompt("Paste Image URL:"); if (url) { config.customBackgrounds.push({ id: Date.now(), name, data: url }); saveConfig(); loadCategory('Backgrounds'); } }
                else {
                    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
                    input.onchange = e => { const reader = new FileReader(); reader.onload = () => { config.customBackgrounds.push({ id: Date.now(), name, data: reader.result }); saveConfig(); loadCategory('Backgrounds'); }; reader.readAsDataURL(e.target.files[0]); };
                    input.click();
                }
            };
            grid.appendChild(addBtn);
            [...defaultBackgrounds, ...config.customBackgrounds].forEach(bg => {
                const card = document.createElement('div');
                card.className = `item-card ${config.activeBackground === bg.id ? 'active' : ''}`;
                card.innerHTML = `<img class="preview-img" src="${bg.data}"><span class="item-name">${bg.name}</span>`;
                if (!bg.builtIn) {
                    card.innerHTML += `<div class="item-actions"><div class="action-btn edit">Edit</div><div class="action-btn del">Del</div></div>`;
                    card.querySelector('.edit').onclick = (e) => { e.stopPropagation(); const n = prompt("New Name:", bg.name); if(n) bg.name = n; saveConfig(); loadCategory('Backgrounds'); };
                    card.querySelector('.del').onclick = (e) => { e.stopPropagation(); config.customBackgrounds = config.customBackgrounds.filter(i=>i.id!==bg.id); saveConfig(); loadCategory('Backgrounds'); };
                }
                card.onclick = () => { config.activeBackground = bg.id; saveConfig(); location.reload(); applyBackground(bg.data); loadCategory('Backgrounds'); };
                grid.appendChild(card);
            });
            contentArea.appendChild(grid);
        } else if (cat === 'Labels') {
            contentArea.appendChild(createTweak('FPS Counter', 'fps', config.fps, toggleFPS, { text: 'Move', action: () => { if(!config.fps) { toggleFPS(true); config.fps=true; saveConfig(); loadCategory('Labels'); } enterEditMode(fpsDisplay, 'fpsPos', defaultConfig.fpsPos, () => loadCategory('Labels')); } }));
            contentArea.appendChild(createTweak('Ping / LAT Counter', 'ping', config.ping, togglePing, { text: 'Move', action: () => { if(!config.ping) { togglePing(true); config.ping=true; saveConfig(); loadCategory('Labels'); } enterEditMode(pingDisplay, 'pingPos', defaultConfig.pingPos, () => loadCategory('Labels')); } }));
            const clHeader = document.createElement('div'); clHeader.className = 'cat-header'; clHeader.style.marginTop = '20px'; clHeader.innerHTML = `<div class="cat-title" style="font-size:16px">Custom Labels</div>`;
            const addLbl = document.createElement('button'); addLbl.className = 'move-btn'; addLbl.style.background = '#60cdff'; addLbl.style.color = 'black'; addLbl.style.fontWeight = 'bold'; addLbl.innerText = '+ Add New'; addLbl.onclick = openLabelCreator;
            clHeader.appendChild(addLbl); contentArea.appendChild(clHeader);
            config.customLabels.forEach(lbl => {
                const row = document.createElement('div'); row.className = 'tweak-card'; row.innerHTML = `<span style="color:${lbl.color}">${lbl.text}</span><div><button class="move-btn">Move</button><button class="move-btn" style="background:rgba(255,50,50,0.3);color:#ff6b6b">Del</button></div>`;
                row.querySelector('.move-btn').onclick = () => { const el = document.getElementById(`lbl-${lbl.id}`); enterEditMode(el, {type: 'label', id: lbl.id}, { top: '50%', left: '50%' }, () => loadCategory('Labels')); };
                row.querySelectorAll('.move-btn')[1].onclick = () => { config.customLabels = config.customLabels.filter(l => l.id !== lbl.id); saveConfig(); renderCustomLabels(); loadCategory('Labels'); };
                contentArea.appendChild(row);
            });
        } else if (cat === 'Gameplay') {
            contentArea.appendChild(createTweak('Uncap FPS', 'uncap', config.uncap, (v) => { config.uncap = v; saveConfig(); window.requestAnimationFrame = v ? (cb)=>setTimeout(cb,1) : originalRAF; }));
            contentArea.appendChild(createTweak('Auto Fullscreen', 'afs', config.autoFS, toggleAutoFS));
        } else if (cat === 'Client') {
            contentArea.appendChild(createTweak('Glassmorphism', 'glass', config.glass, (v) => {
                config.glass = v;
                saveConfig();
                menu.classList.toggle('nova-glass', v);
                toggleGlassStyle(v); // Toggles the provided Start Menu style
                if(document.querySelector('.nav-item.active').dataset.cat === 'Backgrounds') loadCategory('Backgrounds');
            }));
            contentArea.appendChild(createTweak('Fast Menu', 'fast', config.fastMenu, (v) => { config.fastMenu = v; saveConfig(); menu.classList.toggle('nova-animate', !v); }));
        } else if (cat === 'Misc') {
            contentArea.appendChild(createTweak('Clean Menu', 'clean', config.cleanMenu, toggleCleanMenu));
            contentArea.appendChild(createTweak('Hide Account Block', 'hideAccountBlock', config.hideAccountBlock, toggleAccountBlock));
            contentArea.appendChild(createTweak('Use Classic Logo', 'useClassicLogo', config.useClassicLogo, toggleClassicLogo));
        }
    }

    function createTweak(name, id, checked, callback, extraBtn = null) {
        const card = document.createElement('div'); card.className = 'tweak-card';
        let html = `<span>${name}</span><div style="display:flex; align-items:center;">`;
        if (extraBtn) html += `<button class="move-btn">${extraBtn.text}</button>`;
        html += `<label class="win-switch"><input type="checkbox" ${checked ? 'checked' : ''}><span class="win-slider"></span></label></div>`;
        card.innerHTML = html; card.querySelector('input').onchange = (e) => callback(e.target.checked);
        if (extraBtn) card.querySelector('.move-btn').onclick = extraBtn.action;
        return card;
    }

    const menu = document.createElement('div'); menu.id = 'nova-menu';
    menu.innerHTML = `
        <div id="nova-header"><span>Nova Client</span><div id="nova-close" style="cursor:pointer">&times;</div></div>
        <div id="nova-nav">
            <div class="nav-item active" data-cat="Labels">Labels</div>
            <div class="nav-item" data-cat="Gameplay">Gameplay</div>
            <div class="nav-item" data-cat="Keybinds">Keybinds</div>
            <div class="nav-item" data-cat="Crosshairs">Crosshairs</div>
            <div class="nav-item" data-cat="Backgrounds">Backgrounds</div>
            <div class="nav-item" data-cat="Client">Client</div>
            <div class="nav-item" data-cat="Misc">Misc</div>
        </div>
    `;
    const contentArea = document.createElement('div'); contentArea.id = 'nova-content';
    menu.appendChild(contentArea); document.body.appendChild(menu);

    const toggleMenu = (open) => {
        if (open) { menu.style.display = 'flex'; setTimeout(() => menu.classList.add('active'), 10); }
        else { menu.classList.remove('active'); setTimeout(() => { if (!menu.classList.contains('active')) menu.style.display = 'none'; }, config.fastMenu ? 0 : 400); }
    };

    window.onkeydown = (e) => { if (e.code === 'ShiftRight') toggleMenu(!menu.classList.contains('active')); };
    document.getElementById('nova-close').onclick = () => toggleMenu(false);
    menu.querySelectorAll('.nav-item').forEach(item => { item.onclick = () => { menu.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active')); item.classList.add('active'); loadCategory(item.dataset.cat); }; });

    let drag = false, ox, oy;
    document.getElementById('nova-header').onmousedown = (e) => { drag = true; ox = e.clientX - menu.offsetLeft; oy = e.clientY - menu.offsetTop; };
    document.onmousemove = (e) => { if (drag) { menu.style.left = (e.clientX - ox + menu.offsetWidth/2) + 'px'; menu.style.top = (e.clientY - oy + menu.offsetHeight/2) + 'px'; } };
    document.onmouseup = () => drag = false;

    loadCategory('Labels');
    if (config.fps) toggleFPS(true);
    if (config.ping) togglePing(true);
    if (config.uncap) window.requestAnimationFrame = (cb)=>setTimeout(cb,1);
    if (config.cleanMenu) toggleCleanMenu(true);
    if (config.hideAccountBlock) toggleAccountBlock(true);
    if (config.useClassicLogo) toggleClassicLogo(true);
    if (config.autoFS) toggleAutoFS(true);
    if (config.shuffleEnabled) toggleShuffle(true);
    toggleGlassStyle(config.glass);
    renderCustomLabels();

    if (config.activeCrosshair) { const x = config.customCrosshairs.find(i => i.id === config.activeCrosshair); if (x) applyCrosshair(x.data); }
function forceBackground() {
    const bgEl = document.querySelector("#background");
    if (!bgEl) {
        requestAnimationFrame(forceBackground);
        return;
    }

    const b = [...defaultBackgrounds, ...config.customBackgrounds]
        .find(i => i.id === config.activeBackground);

    if (!b) return;


    bgEl.style.backgroundImage = `url("${b.data}")`;

    new MutationObserver(() => {
        if (bgEl.style.backgroundImage !== `url("${b.data}")`) {
            bgEl.style.backgroundImage = `url("${b.data}")`;
        }
    }).observe(bgEl, { attributes: true, attributeFilter: ['style'] });
}

if (config.activeBackground) {
    forceBackground();
}
    menu.classList.toggle('nova-glass', config.glass);
    menu.classList.toggle('nova-animate', !config.fastMenu);
})();
