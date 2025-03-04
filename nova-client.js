// ==UserScript==
// @name         Nova Client
// @namespace    https://github.com/karizzmaa/nova-client
// @version      1.0
// @description  Customizable Mod menu for Survev.io
// @author       karizzmaa
// @match        *://survev.io/*
// @match        *://zurviv.io/*
// @match        *://*.survev.io/*
// @match        *://*.zurviv.io/*
// @grant        GM_getResourceURL
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://raw.githubusercontent.com/karizzmaa/nova-client/refs/heads/main/icon.png
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');
    @keyframes slideIn {
        from { transform: translate(-50%, -60%); opacity: 0; }
        to { transform: translate(-50%, -50%); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translate(-50%, -50%); opacity: 1; }
        to { transform: translate(-50%, -60%); opacity: 0; }
    }
    .switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #555;
        transition: 0.3s;
        border-radius: 20px;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }
    input:checked + .slider {
        background-color: ${GM_getValue('accentColor', '#2196F3')};
    }
    input:checked + .slider:before {
        transform: translateX(20px);
    }
    .reload-popup button {
        background-color: ${GM_getValue('accentColor', '#2196F3')};
        border: none;
        color: black;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s, transform 0.2s;
        margin: 0 5px;
    }
    .reload-popup button:hover {
        background-color: ${GM_getValue('accentColor', '#2196F3')}cc;
        transform: scale(1.05);
    }
    .reload-popup button:active {
        transform: scale(0.95);
    }
    `);

    let menu = null;
    let fpsDisplay = null;
    let fpsEnabled = false;
    let pingDisplay = null;
    let pingEnabled = true;
    let uncapFPSEnabled = false;
    let cleanMenuEnabled = false;
    let accentColor = GM_getValue('accentColor', '#2196F3');

    let sendTime, receiveTime, timeout, region, DOM_observer, ws;

    function initializePingCounter() {
        pingDisplay = document.createElement('div');
        pingDisplay.style.position = 'absolute';
        pingDisplay.style.top = 'calc(60% + 25px)';
        pingDisplay.style.left = '10px';
        pingDisplay.style.transform = 'translateY(-50%)';
        pingDisplay.style.color = 'white';
        pingDisplay.style.fontSize = '14px';
        pingDisplay.style.fontFamily = '"roboto condensed", sans-serif';
        pingDisplay.style.textShadow = '1px 1px 2px black';
        pingDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        pingDisplay.style.padding = '3px 5px';
        pingDisplay.style.borderRadius = '5px';
        pingDisplay.style.zIndex = '10000';
        pingDisplay.innerHTML = `Waiting for a game start...`;
        document.body.appendChild(pingDisplay);

        var teamJoined = document.getElementById("msg-wait-reason"),
            endBtn = document.getElementById("ui-stats-options");

        window.onload = () => {
            var strtBtn = document.getElementsByClassName("btn-green btn-darken menu-option");
            var strtBtnArray = [strtBtn[0], strtBtn[1], strtBtn[2]];
            strtBtnArray.forEach((btn) => {
                btn.onclick = () => {
                    region = document.getElementById("server-select-main").value;
                    getPing();
                };
            });
            strtBtn[3].onclick = () => {
                region = document.getElementById("team-server-select").value;
                getPing();
            };
        };

        document.getElementById("btn-game-quit").onclick = () => {
            ws.close();
        };
        document.getElementById("btn-spectate-quit").onclick = () => {
            ws.close();
        };
        DOM_observer = new MutationObserver((mutations) => {
            if (mutations[0].addedNodes.length === 1) {
                endBtn.getElementsByTagName("a")[0].onclick = () => {
                    ws.close();
                };
            } else if (mutations[0].addedNodes.length === 3) {
                region = document.getElementById("team-server-select").value;
                delayConnect();
            }
        });
        DOM_observer.observe(endBtn, {
            childList: true
        });
        DOM_observer.observe(teamJoined, {
            childList: true
        });

        function wsUrl() {
            var wsUrl, wsRegion;
            if (region === 'na') {
                wsRegion = 'usr';
            } else if (region === 'eu') {
                wsRegion = 'eur';
            } else if (region === 'asia') {
                wsRegion = 'asr';
            } else if (region === 'sa') {
                wsRegion = 'sa';
            }
            wsUrl = `wss://${wsRegion}.mathsiscoolfun.com:8001/ptc`;
            return wsUrl;
        }

        function delayConnect() {
            timeout = setTimeout(getPing, 2500);
        }

        function doSend(message) {
            if (ws.readyState === 1) {
                sendTime = Date.now();
                ws.send(message);
            }
        }

        function getPing() {
            var ping, url = wsUrl();
            ws = new WebSocket(url);

            ws.onopen = () => {
                clearTimeout(timeout);
                doSend(new ArrayBuffer(1));
            };

            ws.onclose = (evt) => {
                if (evt.code === 1005) {
                    pingDisplay.innerHTML = `Waiting for a game start...`;
                    pingDisplay.style.color = "white";
                } else if (evt.code === 1006) {
                    ws = null;
                    delayConnect();
                }
            };

            ws.onmessage = () => {
                receiveTime = Date.now();
                ping = receiveTime - sendTime;
                if (ping >= 120) {
                    pingDisplay.style.color = "red";
                } else if (ping >= 90 && ping < 120) {
                    pingDisplay.style.color = "orange";
                } else {
                    pingDisplay.style.color = "white";
                }
                pingDisplay.innerHTML = `${ping} ms`;
                setTimeout(() => {
                    doSend(new ArrayBuffer(1));
                }, 1500);
            };

            ws.onerror = () => {
                pingDisplay.innerHTML = `NaN ms`;
                pingDisplay.style.color = "white";
            };
        }
    }

    initializePingCounter();

    function createMenu() {
        menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.top = '50%';
        menu.style.left = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
        menu.style.width = '380px';
        menu.style.height = 'auto';
        menu.style.backgroundColor = '#1e1e1e';
        menu.style.border = `1px solid ${accentColor}`;
        menu.style.borderRadius = '10px';
        menu.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        menu.style.color = '#fff';
        menu.style.fontFamily = 'Arial, sans-serif';
        menu.style.zIndex = '1000';
        menu.style.padding = '20px';
        menu.style.animation = 'slideIn 0.3s ease-out';

        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.fontSize = '20px';
        header.style.marginBottom = '15px';
        header.textContent = 'Nova Client';
        menu.appendChild(header);

        const tabs = document.createElement('div');
        tabs.style.display = 'flex';
        tabs.style.justifyContent = 'space-around';
        tabs.style.marginBottom = '15px';

        ['Labels', 'Gameplay', 'Client', 'Misc', 'Info'].forEach(tabText => {
            const tab = document.createElement('button');
            tab.textContent = tabText;
            tab.style.cursor = 'pointer';
            tab.style.padding = '10px 20px';
            tab.style.border = 'none';
            tab.style.borderRadius = '5px';
            tab.style.backgroundColor = '#333';
            tab.style.color = '#fff';
            tab.style.fontSize = '14px';
            tab.style.transition = 'background-color 0.3s, transform 0.2s';

            tab.addEventListener('mouseover', () => {
                tab.style.backgroundColor = '#444';
                tab.style.transform = 'scale(1.05)';
            });

            tab.addEventListener('mouseout', () => {
                tab.style.backgroundColor = '#333';
                tab.style.transform = 'scale(1)';
            });

            tab.addEventListener('mousedown', () => {
                tab.style.transform = 'scale(0.95)';
            });

            tab.addEventListener('mouseup', () => {
                tab.style.transform = 'scale(1.05)';
            });

            tab.addEventListener('click', () => {
                Array.from(tabs.children).forEach(t => {
                    t.style.backgroundColor = '#333';
                    t.style.border = 'none';
                });
                tab.style.backgroundColor = '#555';
                tab.style.border = `2px solid ${accentColor}`;
                updateContent(tabText);
            });

            tabs.appendChild(tab);
        });

        menu.appendChild(tabs);

        const content = document.createElement('div');
        content.style.padding = '15px';
        content.style.minHeight = '150px';
        content.innerHTML = '<p>Content for Labels</p>';
        menu.appendChild(content);

        const footer = document.createElement('div');
        footer.style.textAlign = 'center';
        footer.style.marginTop = '15px';
        footer.style.color = '#888';
        footer.style.fontSize = '12px';
        footer.textContent = 'Made with ❤️ By Karizma';
        menu.appendChild(footer);

        document.body.appendChild(menu);

        const labelsTab = tabs.children[0];
        labelsTab.click();

        function updateContent(tabText) {
            let contentText = '';
            switch (tabText) {
                case 'Labels':
                    contentText = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>FPS Counter</span>
                    <label class="switch">
                    <input type="checkbox" id="fpsToggle">
                    <span class="slider"></span>
                    </label>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Ping/LAT Counter</span>
                    <label class="switch">
                    <input type="checkbox" id="pingToggle">
                    <span class="slider"></span>
                    </label>
                    </div>
                    `;
                    break;
                case 'Gameplay':
                    contentText = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Uncap FPS</span>
                    <label class="switch">
                    <input type="checkbox" id="uncapFPSToggle">
                    <span class="slider"></span>
                    </label>
                    </div>
                    `;
                    break;
                case 'Client':
                    contentText = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Accent Color</span>
                    <input type="color" id="accentColorPicker" value="${accentColor}" style="margin-left: 10px;">
                    </div>
                    `;
                    break;
                case 'Info':
                    contentText = `
                    <p>Nova Client is a customizable client for survev.io</p>
                    <div style="text-align: center; margin-top: 20px; margin-bottom: 10px;">
                    <a href="https://github.com/karizzmaa" target="_blank" style="color: #888; text-decoration: none;">
                    <i class="fab fa-github" style="font-size: 24px; margin-right: 10px;"></i>
                    </a>
                    <i class="fa-brands fa-discord" style="font-size: 24px; color: #888; cursor: pointer;"></i>
                    <div id="copied-message" style="color: green; font-size: 12px; margin-top: 5px; opacity: 0; transition: opacity 0.5s, transform 0.5s;"></div>
                    </div>
                    `;
                    break;
                case 'Misc':
                    contentText = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Clean Menu</span>
                    <label class="switch">
                    <input type="checkbox" id="cleanMenuToggle">
                    <span class="slider"></span>
                    </label>
                    </div>
                    `;
                    break;
            }
            content.innerHTML = contentText;

            if (tabText === 'Labels') {
                const fpsToggle = content.querySelector('#fpsToggle');
                fpsToggle.checked = fpsEnabled;

                fpsToggle.addEventListener('change', () => {
                    fpsEnabled = fpsToggle.checked;
                    if (fpsEnabled) {
                        enableFPS();
                    } else {
                        disableFPS();
                    }
                });

                const pingToggle = content.querySelector('#pingToggle');
                pingToggle.checked = pingEnabled;

                pingToggle.addEventListener('change', () => {
                    pingEnabled = pingToggle.checked;
                    if (pingEnabled) {
                        pingDisplay.style.display = 'block';
                    } else {
                        pingDisplay.style.display = 'none';
                    }
                });
            }

            if (tabText === 'Gameplay') {
                const uncapFPSToggle = content.querySelector('#uncapFPSToggle');
                uncapFPSToggle.checked = uncapFPSEnabled;

                uncapFPSToggle.addEventListener('change', () => {
                    uncapFPSEnabled = uncapFPSToggle.checked;
                    if (uncapFPSEnabled) {
                        uncapFPS();
                    } else {
                        window.requestAnimationFrame = originalRAF;
                    }
                });
            }

            if (tabText === 'Client') {
                const accentColorPicker = content.querySelector('#accentColorPicker');
                accentColorPicker.value = accentColor;

                accentColorPicker.addEventListener('input', () => {
                    accentColor = accentColorPicker.value;
                    GM_setValue('accentColor', accentColor);
                    menu.style.borderColor = accentColor;
                    Array.from(tabs.children).forEach(tab => {
                        if (tab.style.backgroundColor === 'rgb(85, 85, 85)') {
                            tab.style.borderColor = accentColor;
                        }
                    });
                    // Update toggle colors
                    const toggles = document.querySelectorAll('.slider');
                    toggles.forEach(toggle => {
                        if (toggle.previousElementSibling.checked) {
                            toggle.style.backgroundColor = accentColor;
                        }
                    });
                });
            }

            if (tabText === 'Misc') {
                const cleanMenuToggle = content.querySelector('#cleanMenuToggle');
                cleanMenuToggle.checked = cleanMenuEnabled;

                cleanMenuToggle.addEventListener('change', () => {
                    cleanMenuEnabled = cleanMenuToggle.checked;
                    if (cleanMenuEnabled) {
                        cleanMenu();
                    } else {
                        showReloadPopup();
                    }
                });
            }

            if (tabText === 'Info') {
                const discordIcon = content.querySelector('.fa-discord');
                const copiedMessage = content.querySelector('#copied-message');

                discordIcon.addEventListener('click', () => {
                    navigator.clipboard.writeText('piesimp').then(() => {
                        copiedMessage.textContent = 'Username Copied!';
                        copiedMessage.style.opacity = '1';
                        copiedMessage.style.transform = 'translateY(-10px)';
                        setTimeout(() => {
                            copiedMessage.style.opacity = '0';
                            copiedMessage.style.transform = 'translateY(0)';
                        }, 1000);
                    });
                });
            }
        }
    }

    function showReloadPopup() {
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = '#1e1e1e';
        popup.style.border = `1px solid ${accentColor}`;
        popup.style.borderRadius = '10px';
        popup.style.padding = '20px';
        popup.style.zIndex = '10000';
        popup.style.color = '#fff';
        popup.style.textAlign = 'center';
        popup.style.animation = 'slideIn 0.3s ease-out';
        popup.classList.add('reload-popup');

        popup.innerHTML = `
            <p>Reload Required</p>
            <button id="reloadConfirm">Reload</button>
            <button id="reloadCancel">Cancel</button>
        `;

        document.body.appendChild(popup);

        document.getElementById('reloadConfirm').addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('reloadCancel').addEventListener('click', () => {
            popup.style.animation = 'slideOut 0.3s ease-out';
            popup.addEventListener('animationend', () => {
                popup.remove();
            }, { once: true });
            const cleanMenuToggle = document.querySelector('#cleanMenuToggle');
            if (cleanMenuToggle) cleanMenuToggle.checked = true; // Revert the toggle
        });
    }

    function enableFPS() {
        if (!fpsDisplay) {
            fpsDisplay = document.createElement('div');
            fpsDisplay.style.position = 'absolute';
            fpsDisplay.style.top = '60%';
            fpsDisplay.style.left = '10px';
            fpsDisplay.style.transform = 'translateY(-50%)';
            fpsDisplay.style.color = 'white';
            fpsDisplay.style.fontSize = '14px';
            fpsDisplay.style.fontFamily = '"roboto condensed", sans-serif';
            fpsDisplay.style.textShadow = '1px 1px 2px black';
            fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            fpsDisplay.style.padding = '3px 5px';
            fpsDisplay.style.borderRadius = '5px';
            fpsDisplay.style.zIndex = '10000';
            fpsDisplay.innerHTML = `0 FPS`;
            document.body.appendChild(fpsDisplay);

            let times = [];
            const getFPS = () => {
                window.requestAnimationFrame(() => {
                    const now = performance.now();
                    while (times.length > 0 && times[0] <= now - 1000) times.shift();
                    times.push(now);
                    fpsDisplay.innerHTML = `${times.length} FPS`;
                    if (times.length <= 30) {
                        fpsDisplay.style.color = "red";
                    } else {
                        fpsDisplay.style.color = "white";
                    }
                    getFPS();
                });
            }
            getFPS();
        }
    }

    function disableFPS() {
        if (fpsDisplay) {
            document.body.removeChild(fpsDisplay);
            fpsDisplay = null;
        }
    }

    const originalRAF = window.requestAnimationFrame;

    function uncapFPS() {
        window.requestAnimationFrame = function (callback) {
            return setTimeout(callback, 1);
        };
    }

    function cleanMenu() {
        function fadeOutAndRemove(element, delay) {
            if (element) {
                setTimeout(() => {
                    element.style.transition = 'opacity 0.5s';
                    element.style.opacity = '0';
                    setTimeout(() => {
                        element.remove();
                    }, 500);
                }, delay);
            }
        }

        function slideLeftAndCenter(element, delay) {
            if (element) {
                setTimeout(() => {
                    element.style.transition = 'transform 0.5s, left 0.5s';
                    element.style.position = 'absolute';
                    element.style.left = '50%';
                    element.style.transform = 'translateX(calc(-50% + 210px))';
                }, delay);
            }
        }

        const elementsToRemove = [
            { selector: '#left-column', delay: 0 },
            { selector: '#news-block', delay: 0.5 },
            { selector: '.language-select-wrap', delay: 1 },
            { selector: '#start-bottom-middle', delay: 1.5 },
            { selector: '#TOS', delay: 2 },
        ];

        elementsToRemove.forEach((item, index) => {
            const element = document.querySelector(item.selector);
            if (element) {
                fadeOutAndRemove(element, item.delay);
            }
        });

        const startBottomRight = document.getElementById('start-bottom-right');
        if (startBottomRight) {
            slideLeftAndCenter(startBottomRight, 2.5);
        }
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Shift' && event.location === 2) {
            if (menu && document.body.contains(menu)) {
                menu.style.animation = 'slideOut 0.3s ease-out';
                menu.addEventListener('animationend', () => {
                    document.body.removeChild(menu);
                    menu = null;
                }, { once: true });
            } else {
                createMenu();
            }
        }
    });
})();
