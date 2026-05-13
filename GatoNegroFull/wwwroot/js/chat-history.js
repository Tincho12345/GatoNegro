/**
 * GatoNegroFull v2026 - Módulo de Renderizado de Historial
 */
async function loadChatHistory() {
    const chatContainer = document.getElementById("chatContainer");
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages || !chatContainer) return;

    try {
        const response = await fetch(`/assets/chat.json?v=${Date.now()}`);
        if (!response.ok) return;
        const messages = await response.json();

        // Detectar si el usuario está al final antes de actualizar el contenido
        const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;

        const currentUser = localStorage.getItem("chatUser") || "Visitante";
        const currentRole = localStorage.getItem("chatRole") || "Visitante";
        const isLogged = currentRole !== "Visitante" && currentUser !== "Visitante";

        // Generar el HTML de los mensajes
        chatMessages.innerHTML = messages.map(m => {
            const isMe = m.User === currentUser;
            const canManage = isLogged && (currentRole === "Admin" || (currentRole === "User" && isMe));
            const canReply = isLogged;

            const cleanText = m.Text ? m.Text.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
            const defaultAvatar = 'https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png';
            const userImg = (m.UserPhoto && m.UserPhoto.trim() !== "") ? m.UserPhoto : defaultAvatar;

            // --- NUEVA LÓGICA DE MEDIA CORREGIDA ---
            let mediaHtml = '';
            let displayText = m.Text || ''; // Texto por defecto

            if (m.ImageUrl) {
                const url = m.ImageUrl.toLowerCase();
                // Extensiones comunes de audio
                const isAudio = url.endsWith(".webm") || url.endsWith(".mp3") || url.endsWith(".wav") || url.includes("audio/upload");
                // Extensiones de video (excluyendo webm si prefieres tratarlo siempre como audio en notas de voz)
                const isVideo = !isAudio && (url.endsWith(".mp4") || url.endsWith(".ogg") || url.includes("video/upload"));

                if (isAudio) {
                    // 1. Renderizamos el reproductor de audio limpio
                    mediaHtml = `
                    <div class="audio-wrapper mb-2 py-1">
                        <audio controls style="width: 100%; height: 40px;">
                            <source src="${m.ImageUrl}" type="audio/webm">
                            Tu navegador no soporta el audio.
                        </audio>
                    </div>`;

                    // 2. Si es una nota de voz, ocultamos el texto descriptivo para que no se vea el string "🎤 Nota de voz"
                    if (displayText.includes("Nota de voz")) {
                        displayText = '';
                    }
                } else if (isVideo) {
                    mediaHtml = `
                    <div class="video-wrapper mb-2 shadow-sm rounded overflow-hidden" style="background: #000; position: relative;">
                        <video controls style="max-height: 250px; width: 100%; display: block;">
                            <source src="${m.ImageUrl}" type="video/mp4">
                            Tu navegador no soporta el video.
                        </video>
                    </div>`;
                } else {
                    // Imagen normal
                    mediaHtml = `
                    <img src="${m.ImageUrl}" 
                         loading="lazy" 
                         class="img-fluid rounded mb-2 d-block shadow-sm" 
                         style="max-height: 250px; cursor: pointer; object-fit: cover; width: 100%; transition: opacity 0.2s;" 
                         onclick="window.open('${m.ImageUrl}', '_blank')"
                         onmouseover="this.style.opacity='0.9'"
                         onmouseout="this.style.opacity='1'">`;
                }
            }

            const msgDate = m.Date ? new Date(m.Date) : new Date();
            const formattedTime = msgDate.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `
            <div class="mb-3 d-flex ${isMe ? "justify-content-end" : "justify-content-start"} animate__animated animate__fadeInUp animate__faster">
                ${!isMe ? `<img src="${userImg}" class="rounded-circle me-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd; align-self: flex-end; margin-bottom: 5px;">` : ''}
    
                <div class="message-wrapper" 
                     style="max-width: 80%; position: relative;"
                     ontouchstart="handleTouchStart(event, this)" 
                     ontouchmove="handleTouchMove(event, this)" 
                     ontouchend="handleTouchEnd(event, this, '${m.Id}', '${m.User}', '${cleanText}')">
        
                    <!-- Indicador de respuesta (flechita tipo WhatsApp) -->
                    <div class="swipe-reply-indicator" style="position: absolute; left: -35px; top: 50%; transform: translateY(-50%); opacity: 0; transition: opacity 0.2s; color: #075E54;">
                        <i class="bi bi-reply-fill" style="font-size: 1.4rem;"></i>
                    </div>

                    <div style="background: ${isMe ? '#dcf8c6' : '#ffffff'}; padding: 8px 12px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); position: relative;">

                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <small style="color: #075E54; font-weight: bold; font-size: 0.75rem;">${m.User}</small>

                            ${isLogged && (canReply || canManage) ? `
                            <div class="dropdown ms-2">
                                <i class="bi bi-three-dots-vertical text-muted" style="cursor:pointer; font-size: 0.8rem;" data-bs-toggle="dropdown"></i>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                    ${canReply ? `<li><a class="dropdown-item" href="javascript:void(0)" onclick="prepareReply('${m.Id}', '${m.User}', '${cleanText}')"><i class="bi bi-reply me-2"></i>Responder</a></li>` : ''}
                                    ${canManage ? `
                                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="prepareEdit('${m.Id}', '${cleanText}')"><i class="bi bi-pencil me-2"></i>Editar</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="deleteMessage('${m.Id}')"><i class="bi bi-trash me-2"></i>Eliminar</a></li>
                                    ` : ''}
                                </ul>
                            </div>` : ''}
                        </div>

                        ${m.ReplyToText ? `
                            <div style="background: rgba(0,0,0,0.05); border-left: 3px solid #198754; padding: 4px 8px; margin-bottom: 5px; font-size: 0.85rem; border-radius: 4px;">
                                <strong>${m.ReplyToUser}</strong><br>
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

        // Gestión del Auto-Scroll con un pequeño delay para compensar el renderizado de multimedia
        if (isAtBottom) {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 50);
        }

    } catch (err) {
        console.error("Error al cargar historial:", err);
    }
}

/** 
 * LOGICA DE GESTOS REFACTORIZADA
 * Derecha: Responder | Izquierda: Eliminar (si tiene permisos)
 */
let touchStartX = 0;
let touchCurrentX = 0;

window.handleTouchStart = function (e, element) {
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX; // Inicializar para evitar saltos
    element.style.transition = 'none';
};

window.handleTouchMove = function (e, element) {
    touchCurrentX = e.touches[0].clientX;
    let diff = touchCurrentX - touchStartX;

    // Limitamos el desplazamiento visual para que no se salga de la pantalla
    if (Math.abs(diff) > 100) diff = diff > 0 ? 100 : -100;

    element.style.transform = `translateX(${diff}px)`;
    const indicator = element.querySelector('.swipe-reply-indicator');

    if (indicator) {
        indicator.style.opacity = Math.abs(diff) > 30 ? (Math.abs(diff) / 100) : '0';

        if (diff > 0) {
            // --- DERECHA: RESPONDER ---
            indicator.innerHTML = '<i class="bi bi-reply-fill" style="font-size: 1.4rem; color: #075E54;"></i>';
            indicator.style.left = '-35px';
            indicator.style.right = 'auto';
        } else {
            // --- IZQUIERDA: ELIMINAR ---
            indicator.innerHTML = '<i class="bi bi-trash-fill" style="font-size: 1.4rem; color: #dc3545;"></i>';
            indicator.style.left = 'auto';
            indicator.style.right = '-35px';
        }
    }
};

window.handleTouchEnd = function (e, element, msgId, msgUser, text) {
    let diff = touchCurrentX - touchStartX;

    // Recuperar info de sesión para validar permisos
    const currentRole = localStorage.getItem("chatRole") || "Visitante";
    const currentUser = localStorage.getItem("chatUser") || "Visitante";
    const isLogged = localStorage.getItem("isLogged") === "true";

    // 1. Acción: Responder (Derecha > 60px)
    if (diff > 60 && typeof window.prepareReply === 'function') {
        window.prepareReply(msgId, msgUser, text);
        if (navigator.vibrate) navigator.vibrate(15);
    }
    // 2. Acción: Eliminar (Izquierda < -60px)
    else if (diff < -60 && typeof window.deleteMessage === 'function') {
        // Validación de permisos: Admin o dueño del mensaje
        // 1. Recuperar info y limpiar espacios
        const currentRole = (localStorage.getItem("chatRole") || "Visitante").trim();
        const currentUser = (localStorage.getItem("chatUser") || "Visitante").trim();

        // 2. Si el rol no es Visitante, asumimos que está logueado
        const isLogged = currentRole !== "Visitante";

        // 3. Lógica de permisos simplificada
        const isMe = msgUser === currentUser;
        const isAdmin = currentRole === "Admin";

        // Un Admin SIEMPRE puede borrar, o el dueño si está logueado
        const canDelete = isAdmin || (isLogged && isMe);

        if (canDelete) {
            window.deleteMessage(msgId);
            if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
        }
    }

    // Resetear visualmente el elemento
    element.style.transition = 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    element.style.transform = `translateX(0px)`;

    const indicator = element.querySelector('.swipe-reply-indicator');
    if (indicator) {
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 300);
    }

    touchStartX = 0;
    touchCurrentX = 0;
};

window.loadChatHistory = loadChatHistory;