
///**
// * 4. FUNCIONES DE APOYO
// */
//async function enviarIPVisita() {
//    try {
//        const res = await fetch("https://ipapi.co/json/");
//        const data = await res.json();

//        // Detectamos el SO de forma moderna sin usar .platform
//        const getOS = () => {
//            const ua = navigator.userAgent;
//            if (ua.indexOf("Win") !== -1) return "Windows";
//            if (ua.indexOf("Mac") !== -1) return "MacOS";
//            if (ua.indexOf("Linux") !== -1) return "Linux";
//            if (ua.indexOf("Android") !== -1) return "Android";
//            if (ua.indexOf("like Mac") !== -1) return "iOS";
//            return "Desconocido";
//        };

//        const params = {
//            ip: data.ip,
//            pais: data.country_name,
//            region: data.region,
//            ciudad: data.city,
//            isp: data.org,
//            dispositivo: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Móvil" : "PC",

//            // SOLUCIÓN DEFINITIVA: Usamos la función getOS() en lugar de navigator.platform
//            so: getOS(),

//            plataforma: navigator.userAgentData?.platform || "N/A",
//            user_agent: navigator.userAgent,
//            idioma: navigator.language,
//            zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone,
//            cpu: navigator.hardwareConcurrency || "N/A",
//            memoria: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "N/A",
//            resolucion: `${window.screen.width}x${window.screen.height}`,
//            pagina: window.location.href,
//            fecha: new Date().toLocaleString('es-AR')
//        };

//        await emailjs.send("service_4egurwa", "template_rxhf8jg", params);
//        localStorage.setItem("visita_enviada", "1");
//    } catch (err) {
//        console.error("Error visita:", err);
//    }
//}


(function () {
    "use strict";

    // --- ELEMENTOS DEL DOM ---
    const btnChat = document.getElementById("btnChat");
    const chatModalEl = document.getElementById("chatModal");
    const btnLogin = document.getElementById("btnLogin");
    const loginModalEl = document.getElementById("loginModal");
    const registerModalEl = document.getElementById("registerModal");

    if (!btnChat || !chatModalEl || !loginModalEl) return;

    const chatModal = new bootstrap.Modal(chatModalEl);
    const loginModal = new bootstrap.Modal(loginModalEl);
    const registerModal = registerModalEl ? new bootstrap.Modal(registerModalEl) : null;

    let chatInterval = null;
    let replyToId = null;
    let editingMsgId = null;

    const getActiveUser = () => localStorage.getItem("chatUser") || "Visitante";
    const getActiveRole = () => localStorage.getItem("chatRole") || "Visitante";

    // --- FUNCIONES DE SESIÓN (LOGIN/REGISTRO SIN RECARGA) ---
    async function setupUserSession(user, role) {
        localStorage.setItem("chatUser", user);
        localStorage.setItem("chatRole", role || "User");

        // Avisar al servidor para el estado de C#
        await fetch(`/Chat/SetSessionUser?userName=${user}`, { method: 'POST' });

        // Cambiar dinámicamente el footer de "Solo Lectura" a "Escribir"
        const footer = document.querySelector("#chatModal .modal-footer");
        if (footer) {
            footer.innerHTML = `
                <div id="replyPreview" class="rounded mb-2 w-100" style="display:none; background: #e9ecef; padding: 5px 10px; border-left: 4px solid #198754;">
                    <div class="d-flex justify-content-between">
                        <small id="replyUser" style="color: #198754; font-weight: bold;"></small>
                        <i class="bi bi-x-lg" style="cursor:pointer; font-size: 0.7rem;" onclick="cancelReply()"></i>
                    </div>
                    <div id="replyText" class="text-truncate small"></div>
                </div>
                <div class="input-group bg-light rounded-pill border overflow-hidden w-100" style="padding: 2px;">
                    <input type="text" id="chatInput" class="form-control border-0 shadow-none ps-3 bg-transparent" placeholder="Escribe un mensaje..." style="font-size: 0.9rem;">
                    <button class="btn btn-success rounded-circle d-flex align-items-center justify-content-center" id="btnSend" type="button" style="width: 35px; height: 35px; margin: 2px;" onclick="sendMessage()">
                        <i id="sendIcon" class="bi bi-send-fill" style="font-size: 0.8rem;"></i>
                    </button>
                </div>`;

            // Re-vincular el evento Enter al nuevo input
            document.getElementById("chatInput")?.addEventListener("keypress", (e) => {
                if (e.key === "Enter") window.sendMessage();
            });
        }

        // Abrir chat y cargar mensajes
        chatModal.show();
        await loadChatHistory();
        if (!chatInterval) chatInterval = setInterval(loadChatHistory, 4000);

        if (typeof GlobalToast !== 'undefined') {
            GlobalToast.fire({ icon: 'success', title: `Bienvenido, ${user}` });
        }
    }

    // --- ACCIONES DE FORMULARIOS ---
    document.getElementById("btnDoLogin")?.addEventListener("click", async () => {
        const user = document.getElementById("loginUser")?.value.trim();
        const pass = document.getElementById("loginPass")?.value.trim();
        try {
            const res = await fetch(`/assets/users.json?v=${Date.now()}`);
            const users = await res.json();
            const valid = users.find(u => u.user === user && u.pass === pass);

            if (valid) {
                loginModal.hide();
                await setupUserSession(user, valid.role);
            } else {
                document.getElementById("loginError").style.display = "block";
            }
        } catch (e) { console.error(e); }
    });

    document.getElementById("btnDoRegister")?.addEventListener("click", async () => {
        const user = document.getElementById("regUser")?.value.trim();
        const pass = document.getElementById("regPass")?.value.trim();
        if (!user || !pass) return;

        const formData = new FormData();
        formData.append("newUser", user);
        formData.append("newPass", pass);

        try {
            const res = await fetch('/Chat/RegisterUser', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                registerModal?.hide();
                await setupUserSession(user, "User");
            } else {
                const err = document.getElementById("regError");
                if (err) { err.innerText = data.message; err.style.display = "block"; }
            }
        } catch (e) { console.error(e); }
    });

    // Navegación entre modales
    document.getElementById("btnGoRegister")?.addEventListener("click", () => {
        loginModal.hide();
        setTimeout(() => registerModal?.show(), 400);
    });

    // --- LÓGICA DE CHAT (MENSAJES, EDITAR, ELIMINAR) ---
    window.sendMessage = async () => {
        const input = document.getElementById("chatInput");
        const text = input?.value.trim();
        if (!text) return;

        const formData = new FormData();
        formData.append("text", text);
        formData.append("user", getActiveUser());
        if (editingMsgId) formData.append("editId", editingMsgId);
        else if (replyToId) formData.append("replyToId", replyToId);

        let url = editingMsgId ? '/Chat/UpdateMessage' : '/Chat/SaveMessage';
        try {
            const res = await fetch(url, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                window.cancelReply();
                await loadChatHistory();
            }
        } catch (e) { console.error(e); }
    };

    window.prepareReply = (id, user, text) => {
        replyToId = id; editingMsgId = null;
        const preview = document.getElementById("replyPreview");
        if (preview) {
            document.getElementById("replyUser").innerText = user;
            document.getElementById("replyText").innerText = text;
            preview.style.display = "block";
        }
        document.getElementById("chatInput")?.focus();
    };

    window.prepareEdit = (id, text) => {
        editingMsgId = id; replyToId = null;
        const input = document.getElementById("chatInput");
        if (input) { input.value = text; input.focus(); }
    };

    window.deleteMessage = async (id) => {
        if (!confirm("¿Eliminar este mensaje?")) return;
        try {
            const res = await fetch(`/Chat/DeleteMessage?id=${id}`, { method: 'POST' });
            if ((await res.json()).success) await loadChatHistory();
        } catch (e) { console.error(e); }
    };

    window.cancelReply = () => {
        replyToId = null; editingMsgId = null;
        const preview = document.getElementById("replyPreview");
        if (preview) preview.style.display = "none";
        const input = document.getElementById("chatInput");
        if (input) input.value = "";
    };

    async function loadChatHistory() {
        const chatContainer = document.getElementById("chatContainer");
        const chatMessages = document.getElementById("chatMessages");
        if (!chatMessages) return;

        try {
            const response = await fetch(`/assets/chat.json?v=${Date.now()}`);
            const messages = await response.json();
            const currentUser = getActiveUser();
            const currentRole = getActiveRole();
            const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;

            chatMessages.innerHTML = messages.map(m => {
                const isMe = m.User === currentUser;
                const canManage = (currentRole === "Admin") || (currentRole === "User" && isMe);
                return `
                <div class="mb-3 d-flex ${isMe ? "justify-content-end" : "justify-content-start"}">
                    <div class="message-wrapper" style="max-width: 85%;">
                        <div style="background: ${isMe ? '#dcf8c6' : '#ffffff'}; padding: 8px 12px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                            <div class="d-flex justify-content-between">
                                <small style="color: #075E54; font-weight: bold; font-size: 0.75rem;">${m.User}</small>
                                <div class="dropdown ms-2">
                                    <i class="bi bi-three-dots-vertical text-muted" style="cursor:pointer; font-size: 0.8rem;" data-bs-toggle="dropdown"></i>
                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="prepareReply('${m.Id}', '${m.User}', '${m.Text.replace(/'/g, "\\'")}')">Responder</a></li>
                                        ${canManage ? `
                                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="prepareEdit('${m.Id}', '${m.Text.replace(/'/g, "\\'")}')">Editar</a></li>
                                            <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="deleteMessage('${m.Id}')">Eliminar</a></li>
                                        ` : ''}
                                    </ul>
                                </div>
                            </div>
                            ${m.ReplyToText ? `<div class="small p-1 mb-1 border-start border-success bg-light">${m.ReplyToText}</div>` : ''}
                            <span style="white-space: pre-wrap;">${m.Text}</span>
                        </div>
                    </div>
                </div>`;
            }).join('');

            if (isAtBottom) chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (e) { console.error(e); }
    }

    // Botón flotante para abrir chat
    btnChat.addEventListener("click", () => {
        loadChatHistory();
        chatModal.show();
        if (!chatInterval) chatInterval = setInterval(loadChatHistory, 4000);
    });

    chatModalEl.addEventListener('hidden.bs.modal', () => {
        if (chatInterval) { clearInterval(chatInterval); chatInterval = null; }
    });

    btnLogin.addEventListener("click", () => loginModal.show());
})();
