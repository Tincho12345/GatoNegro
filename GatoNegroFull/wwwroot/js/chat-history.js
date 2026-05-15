/** * GatoNegroFull v2026 - Módulo de Renderizado de Historial
 * Archivo: chat-history.js
 */
async function loadChatHistory() {
    const chatContainer = document.getElementById("chatContainer");
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages || !chatContainer) return;

    try {
        const response = await fetch(`/assets/chat.json?v=${Date.now()}`);
        if (!response.ok) return;
        const messages = await response.json();

        // Determinar si el usuario ya está al final del chat antes de renderizar
        const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;

        const currentUser = (localStorage.getItem("chatUser") || "Visitante").trim();
        const currentRole = (localStorage.getItem("chatRole") || "Visitante").trim();
        const isLogged = currentRole !== "Visitante" && currentUser !== "Visitante";

        chatMessages.innerHTML = messages.map(m => {
            const isMe = m.User === currentUser;
            const canManage = isLogged && (currentRole === "Admin" || (currentRole === "User" && isMe));
            const canReply = isLogged;

            const cleanText = m.Text ? m.Text.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
            const defaultAvatar = 'https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png';
            const userImg = (m.UserPhoto && m.UserPhoto.trim() !== "") ? m.UserPhoto : defaultAvatar;

            let mediaHtml = '';
            let displayText = m.Text || '';
            let isAudioMsg = false;

            if (m.ImageUrl) {
                const url = m.ImageUrl.toLowerCase();
                isAudioMsg = url.endsWith(".webm") || url.endsWith(".mp3") || url.endsWith(".wav") || url.includes("audio/upload");
                const isVideo = !isAudioMsg && (url.endsWith(".mp4") || url.endsWith(".ogg") || url.includes("video/upload"));

                if (isAudioMsg) {
                    const audioId = `audio_${m.Id}`;
                    mediaHtml = `
                    <div class="audio-player-custom d-flex align-items-center mb-2 p-2" style="background: rgba(0,0,0,0.03); border-radius: 12px; min-width: 220px;">
                        <div class="play-btn-wrapper me-2" onclick="toggleAudio('${audioId}', this)" style="cursor: pointer;">
                            <i class="bi bi-play-fill fs-2" id="icon_${audioId}" style="color: #6c757d;"></i>
                        </div>
                        <div class="flex-grow-1 me-3">
                            <div class="progress-container" style="height: 4px; background: #ccc; border-radius: 2px; position: relative; cursor: pointer;" onclick="seekAudio(event, '${audioId}')">
                                <div id="bar_${audioId}" class="progress-bar-fill" style="width: 0%; height: 100%; background: #ff5722; border-radius: 2px;"></div>
                                <div id="dot_${audioId}" class="progress-dot" style="position: absolute; left: 0%; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background: #ff5722; border-radius: 50%;"></div>
                            </div>
                        </div>
                        <div class="audio-meta text-center" style="min-width: 50px;">
                            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto" style="background: #ff5722; width: 40px; height: 40px; color: white;">
                                <i class="bi bi-headphones fs-5"></i>
                            </div>
                            <small id="time_${audioId}" class="d-block text-muted mt-1" style="font-size: 0.65rem; font-weight: bold;">0:00</small>
                        </div>
                        <audio id="${audioId}" src="${m.ImageUrl}" ontimeupdate="updateAudioProgress('${audioId}')" onended="resetAudioIcon('${audioId}')"></audio>
                    </div>`;

                    if (displayText.includes("Nota de voz")) displayText = '';
                } else if (isVideo) {
                    mediaHtml = `<div class="video-wrapper mb-2 shadow-sm rounded overflow-hidden" style="background: #000; position: relative;"><video controls style="max-height: 250px; width: 100%; display: block;"><source src="${m.ImageUrl}" type="video/mp4">Tu navegador no soporta el video.</video></div>`;
                } else {
                    mediaHtml = `<img src="${m.ImageUrl}" loading="lazy" class="img-fluid rounded mb-2 d-block shadow-sm" style="max-height: 250px; cursor: pointer; object-fit: cover; width: 100%; transition: opacity 0.2s;" onclick="window.open('${m.ImageUrl}', '_blank')">`;
                }
            }

            const msgDate = m.Date ? new Date(m.Date) : new Date();
            const formattedTime = msgDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

            return `
            <div id="msg-${m.Id}" class="mb-3 d-flex ${isMe ? "justify-content-end" : "justify-content-start"} animate__animated animate__fadeInUp animate__faster">
                ${!isMe ? `<img src="${userImg}" class="rounded-circle me-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd; align-self: flex-end; margin-bottom: 5px;">` : ''}

                <div class="message-wrapper" 
                     style="max-width: 80%; position: relative; z-index: ${m.Id};"
                     ontouchstart="handleTouchStart(event, this)" 
                     ontouchmove="handleTouchMove(event, this)" 
                     ontouchend="handleTouchEnd(event, this, '${m.Id}', '${m.User}', '${cleanText}')">

                    <div class="swipe-reply-indicator" style="position: absolute; left: -35px; top: 50%; transform: translateY(-50%); opacity: 0; transition: opacity 0.2s; color: #075E54;">
                        <i class="bi bi-reply-fill" style="font-size: 1.4rem;"></i>
                    </div>

                    <div style="background: ${isMe ? '#dcf8c6' : '#ffffff'}; padding: 8px 12px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); position: relative; overflow: visible;">

                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <small style="color: #075E54; font-weight: bold; font-size: 0.75rem;">${m.User}</small>

                            ${isLogged && (canReply || canManage) ? `
                            <div class="dropdown ms-2">
                                <i class="bi bi-three-dots-vertical text-muted" style="cursor:pointer; font-size: 0.8rem;" data-bs-toggle="dropdown" aria-expanded="false"></i>
                                <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="z-index: 10000; min-width: 150px; position: absolute;">
                                    ${canReply ? `<li><a class="dropdown-item" href="javascript:void(0)" onclick="prepareReply('${m.Id}', '${m.User}', '${cleanText}')"><i class="bi bi-reply me-2"></i>Responder</a></li>` : ''}
                                    
                                    ${/* La opción de editar se condiciona estrictamente a que sea MI mensaje y no sea un audio */ ''}
                                    ${isLogged && isMe && !isAudioMsg ? `<li><a class="dropdown-item" href="javascript:void(0)" onclick="prepareEdit('${m.Id}', '${cleanText}')"><i class="bi bi-pencil me-2"></i>Editar</a></li>` : ''}
                                    
                                    ${/* Si es administrador o dueño, ve el separador y la opción de eliminar */ ''}
                                    ${canManage ? `
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="deleteMessage('${m.Id}')"><i class="bi bi-trash me-2"></i>Eliminar</a></li>
                                    ` : ''}
                                </ul>
                            </div>` : ''}
                        </div>

                        ${m.ReplyToText ? `
                            <div onclick="scrollToMessage('msg-${m.ReplyToId}')" style="background: rgba(0,0,0,0.05); border-left: 3px solid #198754; padding: 4px 8px; margin-bottom: 5px; font-size: 0.85rem; border-radius: 4px; cursor: pointer;">
                                <strong style="color: #198754; font-size: 0.7rem;">${m.ReplyToUser}</strong><br>
                                <span class="text-truncate d-block">${m.ReplyToText}</span>
                            </div>` : ''
                }

                        ${mediaHtml}

                        <span style="word-break: break-word; font-size: 0.95rem; line-height: 1.4;">${displayText}</span>

                        <div class="text-end" style="margin-top: 2px; margin-bottom: -2px;">
                            <small class="text-muted" style="font-size: 0.65rem; font-weight: 500;">
                                ${formattedTime}
                            </small>
                        </div>
                    </div>
                </div>

                ${isMe ? `<img src="${userImg}" class="rounded-circle ms-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd; align-self: flex-end; margin-bottom: 5px;">` : ''}
            </div>`;

        }).join('');

        // LÓGICA DE FOCO AUTOMÁTICO Y RESALTADO
        if (isAtBottom) {
            requestAnimationFrame(() => {
                const lastMessage = chatMessages.lastElementChild;
                if (lastMessage) {
                    // 1. Scroll suave hasta el final
                    lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });

                    // 2. Efecto de resaltado (Highlight)
                    const bubble = lastMessage.querySelector('.message-wrapper > div');
                    if (bubble) {
                        const originalBg = bubble.style.background;
                        const lastMsgData = messages[messages.length - 1];
                        const isMeLast = lastMsgData && lastMsgData.User === currentUser;

                        bubble.style.transition = 'background-color 0.5s ease';
                        bubble.style.background = isMeLast ? '#c5e1a5' : '#fff9c4';

                        setTimeout(() => {
                            bubble.style.background = originalBg;
                        }, 800);
                    }
                } else {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            });
        }

    } catch (err) {
        console.error("Error al cargar historial:", err);
    }
}

/** * LOGICA DE GESTOS
 */
let touchStartX = 0;
let touchCurrentX = 0;

window.handleTouchStart = function (e, element) {
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX;
    element.style.transition = 'none';
};

window.handleTouchMove = function (e, element) {
    touchCurrentX = e.touches[0].clientX;
    let diff = touchCurrentX - touchStartX;
    if (Math.abs(diff) > 100) diff = diff > 0 ? 100 : -100;

    element.style.transform = `translateX(${diff}px)`;
    const indicator = element.querySelector('.swipe-reply-indicator');

    if (indicator) {
        indicator.style.opacity = Math.abs(diff) > 30 ? (Math.abs(diff) / 100) : '0';
        if (diff > 0) {
            indicator.innerHTML = '<i class="bi bi-reply-fill" style="font-size: 1.4rem; color: #075E54;"></i>';
            indicator.style.left = '-35px';
            indicator.style.right = 'auto';
        } else {
            indicator.innerHTML = '<i class="bi bi-trash-fill" style="font-size: 1.4rem; color: #dc3545;"></i>';
            indicator.style.left = 'auto';
            indicator.style.right = '-35px';
        }
    }
};

window.handleTouchEnd = function (e, element, msgId, msgUser, text) {
    let diff = touchCurrentX - touchStartX;
    const currentRole = (localStorage.getItem("chatRole") || "Visitante").trim();
    const currentUser = (localStorage.getItem("chatUser") || "Visitante").trim();
    const isLogged = currentRole !== "Visitante";

    if (diff > 60 && typeof window.prepareReply === 'function') {
        window.prepareReply(msgId, msgUser, text);
        if (navigator.vibrate) navigator.vibrate(15);
    }
    else if (diff < -60 && typeof window.deleteMessage === 'function') {
        const isMe = msgUser === currentUser;
        const isAdmin = currentRole === "Admin";
        const canDelete = isAdmin || (isLogged && isMe);

        if (canDelete) {
            window.deleteMessage(msgId);
            if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
        }
    }

    element.style.transition = 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    element.style.transform = `translateX(0px)`;

    const indicator = element.querySelector('.swipe-reply-indicator');
    if (indicator) {
        setTimeout(() => { indicator.style.opacity = '0'; }, 300);
    }
    touchStartX = 0;
    touchCurrentX = 0;
};

/**
 * UTILIDADES DE AUDIO Y SCROLL ESPECÍFICO
 */
window.scrollToMessage = function (targetId) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const bubble = targetElement.querySelector('.message-wrapper > div');
        if (bubble) {
            const originalBg = bubble.style.background;
            bubble.style.transition = 'background-color 0.3s';
            bubble.style.background = '#fff3cd';
            setTimeout(() => { bubble.style.background = originalBg; }, 1000);
        }
    }
};

window.toggleAudio = function (id, btn) {
    const audio = document.getElementById(id);
    const icon = document.getElementById(`icon_${id}`);
    if (audio.paused) {
        document.querySelectorAll('audio').forEach(a => { if (a.id !== id) a.pause(); });
        audio.play();
        icon.classList.replace('bi-play-fill', 'bi-pause-fill');
    } else {
        audio.pause();
        icon.classList.replace('bi-pause-fill', 'bi-play-fill');
    }
};

window.updateAudioProgress = function (id) {
    const audio = document.getElementById(id);
    const bar = document.getElementById(`bar_${id}`);
    const dot = document.getElementById(`dot_${id}`);
    const timeDisplay = document.getElementById(`time_${id}`);
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        bar.style.width = percent + '%';
        dot.style.left = percent + '%';
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
        timeDisplay.innerText = `${mins}:${secs}`;
    }
};

window.resetAudioIcon = function (id) {
    const icon = document.getElementById(`icon_${id}`);
    if (icon) icon.classList.replace('bi-pause-fill', 'bi-play-fill');
};

window.seekAudio = function (e, id) {
    const audio = document.getElementById(id);
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * audio.duration;
};

window.loadChatHistory = loadChatHistory;