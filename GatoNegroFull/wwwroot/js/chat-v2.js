/**
 * SISTEMA INTEGRADO mensajería de Chat - GatoNegroFull v2026
 * Extraído de site.js para modularización
 */
(function () {
    const btnChat = document.getElementById("btnChat");
    const chatModalEl = document.getElementById("chatModal");
    const btnLogin = document.getElementById("btnLogin");
    const loginModalEl = document.getElementById("loginModal");
    const registerModalEl = document.getElementById("registerModal");

    if (!btnChat || !chatModalEl || !loginModalEl) return;

    const chatModal = new bootstrap.Modal(chatModalEl);
    const loginModal = new bootstrap.Modal(loginModalEl);
    const registerModal = registerModalEl ? new bootstrap.Modal(registerModalEl) : null;

    let replyToId = null;
    let editingMsgId = null;

    const getActiveUser = () => localStorage.getItem("chatUser") || "Visitante";
    const getActiveRole = () => localStorage.getItem("chatRole") || "Visitante";
    async function setupUserSession(user, role) {
        localStorage.setItem("chatUser", user);
        localStorage.setItem("chatRole", role || "User");

        await fetch(`/Chat/SetSessionUser?userName=${user}`, { method: 'POST' });

        const footer = document.querySelector("#chatModal .modal-footer");
        if (footer) {
            // REFACTORIZACIÓN COMPLETA DEL FOOTER (Estilo WhatsApp)
            footer.innerHTML = `
                <div id="replyPreview" class="rounded mb-2 w-100" style="display:none; background: #e9ecef; padding: 5px 10px; border-left: 4px solid #198754;">
                    <div class="d-flex justify-content-between">
                        <small id="replyUser" style="color: #198754; font-weight: bold;"></small>
                        <i class="bi bi-x-lg" style="cursor:pointer; font-size: 0.7rem;" onclick="cancelReply()"></i>
                    </div>
                    <div id="replyText" class="text-truncate small"></div>
                </div>
                
                <div class="input-group bg-light rounded-pill border overflow-hidden w-100" style="padding: 2px;">
                    <button class="btn btn-light rounded-circle border-0 text-muted d-flex align-items-center justify-content-center" 
                            type="button" 
                            style="width: 35px; height: 35px; background: transparent;" 
                            onclick="document.getElementById('chatFile').click()">
                        <i class="bi bi-paperclip" style="font-size: 1.2rem; transform: rotate(45deg);"></i>
                    </button>

                    <input type="file" id="chatFile" style="display:none" accept="image/*" onchange="window.sendImage(this)">

                    <input type="text" id="chatInput" class="form-control border-0 shadow-none ps-2 bg-transparent" 
                           placeholder="Escribe un mensaje..." style="font-size: 0.9rem;">

                    <button class="btn btn-success rounded-circle d-flex align-items-center justify-content-center" 
                            id="btnSend" type="button" style="width: 35px; height: 35px; margin: 2px;" 
                            onclick="sendMessage()">
                        <i id="sendIcon" class="bi bi-send-fill" style="font-size: 0.8rem;"></i>
                    </button>
                </div>`;

            // Re-vincular el evento Enter al nuevo input creado
            const newInput = document.getElementById("chatInput");
            newInput?.addEventListener("keypress", (e) => {
                if (e.key === "Enter") window.sendMessage();
            });
        }

        // Acciones finales de la sesión
        if (loginModal) loginModal.hide();
        if (registerModal) registerModal.hide();

        chatModal.show();
        await loadChatHistory();

        if (typeof GlobalToast !== 'undefined') {
            GlobalToast.fire({ icon: 'success', title: `Bienvenido, ${user}` });
        }
    }

    // --- EXPOSICIÓN DE MÉTODOS AL OBJETO WINDOW ---
    window.cancelReply = () => {
        replyToId = null;
        editingMsgId = null;
        const preview = document.getElementById("replyPreview");
        if (preview) {
            preview.style.display = "none";
            const replyUser = document.getElementById("replyUser");
            const replyText = document.getElementById("replyText");
            if (replyUser) replyUser.innerText = "";
            if (replyText) replyText.innerText = "";
        }
        const input = document.getElementById("chatInput");
        if (input) { input.value = ""; input.focus(); }
        const icon = document.getElementById("sendIcon");
        if (icon) icon.className = "bi bi-send-fill";
    };

    window.prepareReply = (id, user, text) => {
        window.cancelReply();
        replyToId = id;
        const preview = document.getElementById("replyPreview");
        if (preview) {
            document.getElementById("replyUser").innerText = user;
            document.getElementById("replyText").innerText = text;
            preview.style.display = "block";
        }
        document.getElementById("chatInput")?.focus();
    };

    window.prepareEdit = (id, text) => {
        window.cancelReply();
        editingMsgId = id;
        const preview = document.getElementById("replyPreview");
        if (preview) {
            document.getElementById("replyUser").innerText = "Editando mensaje...";
            document.getElementById("replyText").innerText = text;
            preview.style.display = "block";
        }
        const input = document.getElementById("chatInput");
        if (input) { input.value = text; input.focus(); }
        const icon = document.getElementById("sendIcon");
        if (icon) icon.className = "bi bi-check-lg";
    };

    window.sendMessage = async () => {
        const input = document.getElementById("chatInput");
        const text = input?.value.trim();
        if (!text) return;

        const formData = new FormData();
        formData.append("text", text);
        formData.append("user", getActiveUser());

        let url = '/Chat/SaveMessage';
        const previewEl = document.getElementById("replyPreview");
        const previewVisible = previewEl && previewEl.style.display === "block";

        if (editingMsgId && previewVisible) {
            url = '/Chat/UpdateMessage';
            formData.append("editId", editingMsgId);
        } else if (replyToId && previewVisible) {
            formData.append("replyToId", replyToId);
            formData.append("replyToUser", document.getElementById("replyUser").innerText);
            formData.append("replyToText", document.getElementById("replyText").innerText);
        }

        try {
            const res = await fetch(url, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                editingMsgId = null;
                replyToId = null;
                window.cancelReply();
            }
        } catch (err) { console.error("Error al enviar:", err); }
    };

    window.deleteMessage = async (id) => {
        if (typeof EleganteSwal === 'undefined') return;
        const { isConfirmed } = await EleganteSwal.fire({
            title: '¿Eliminar mensaje?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, borrar'
        });
        if (!isConfirmed) return;
        const formData = new FormData();
        formData.append("id", id);
        formData.append("user", getActiveUser());
        try {
            await fetch('/Chat/DeleteMessage', { method: 'POST', body: formData });
        } catch (err) { console.error(err); }
    };

    window.sendImage = async (input) => {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const formData = new FormData();
        formData.append("user", getActiveUser());
        formData.append("imageFile", file); // Enviamos el archivo

        // Mostramos un aviso de carga (opcional pero recomendado)
        if (window.GlobalToast) {
            window.GlobalToast.fire({ icon: 'info', title: 'Subiendo imagen...' });
        }

        try {
            const res = await fetch('/Chat/SaveMessage', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                input.value = ""; // Limpiar el input file
            }
        } catch (err) {
            console.error("Error al subir foto:", err);
        }
    };

    window.showAddUserModal = () => {
        if (loginModal) loginModal.hide();
        if (registerModal) registerModal.show();
    };

    async function loadChatHistory() {
        const chatContainer = document.getElementById("chatContainer");
        const chatMessages = document.getElementById("chatMessages");
        if (!chatMessages || !chatContainer) return;

        try {
            const response = await fetch(`/assets/chat.json?v=${Date.now()}`);
            if (!response.ok) return;
            const messages = await response.json();

            // Guardar posición del scroll antes de renderizar
            const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;

            const currentUser = getActiveUser();
            const currentRole = getActiveRole();

            chatMessages.innerHTML = messages.map(m => {
                const isMe = m.User === currentUser;
                const canManage = (currentRole === "Admin") || (currentRole === "User" && isMe);
                const canReply = currentRole !== "Visitante";

                // Limpieza de texto para evitar errores en los atributos onclick
                const cleanText = m.Text ? m.Text.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";

                // --- CORRECCIÓN DEL AVATAR ---
                // Si m.UserPhoto no existe o es un string vacío, usa el avatar por defecto
                const defaultAvatar = 'https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png';
                const userImg = (m.UserPhoto && m.UserPhoto.trim() !== "") ? m.UserPhoto : defaultAvatar;

                // Lógica para renderizar la imagen adjunta si existe
                const imageHtml = m.ImageUrl
                    ? `<img src="${m.ImageUrl}" class="img-fluid rounded mb-2 d-block shadow-sm" 
                        style="max-height: 250px; cursor: pointer; object-fit: cover; width: 100%;" 
                        onclick="window.open('${m.ImageUrl}', '_blank')">`
                    : '';

                return `
                <div class="mb-3 d-flex ${isMe ? "justify-content-end" : "justify-content-start"}">
                    ${!isMe ? `<img src="${userImg}" class="rounded-circle me-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd;">` : ''}
                    <div class="message-wrapper" style="max-width: 80%;">
                        <div style="background: ${isMe ? '#dcf8c6' : '#ffffff'}; padding: 8px 12px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                            <div class="d-flex justify-content-between align-items-start">
                                <small style="color: #075E54; font-weight: bold; font-size: 0.75rem;">${m.User}</small>
                                ${canReply || canManage ? `
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
                            
                            ${m.ReplyToText ? `<div style="background: rgba(0,0,0,0.05); border-left: 3px solid #198754; padding: 4px 8px; margin-bottom: 5px; font-size: 0.85rem; border-radius: 4px;"><strong>${m.ReplyToUser}</strong><br>${m.ReplyToText}</div>` : ''}
                            
                            ${imageHtml}
                            
                            <span style="word-break: break-word;">${m.Text || ''}</span>
                        </div>
                    </div>
                    ${isMe ? `<img src="${userImg}" class="rounded-circle ms-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd;">` : ''}
                </div>`;
            }).join('');

            if (isAtBottom) chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (err) {
            console.error("Error al cargar historial:", err);
        }
    }

    // --- SIGNALR ---
    const connection = new signalR.HubConnectionBuilder().withUrl("/chatHub").build();
    connection.on("ReceiveMessageUpdate", loadChatHistory);
    connection.start().catch(err => console.error("SignalR Error: ", err));

    // --- EVENTOS ---
    btnChat.addEventListener("click", () => { loadChatHistory(); chatModal.show(); });
    btnLogin.addEventListener("click", () => loginModal.show());

    document.getElementById("btnGoRegister")?.addEventListener("click", () => {
        loginModal.hide();
        registerModal?.show();
    });

    document.getElementById("btnDoLogin")?.addEventListener("click", async () => {
        const user = document.getElementById("loginUser")?.value.trim();
        const pass = document.getElementById("loginPass")?.value.trim();
        const errorEl = document.getElementById("loginError");
        try {
            const res = await fetch(`/assets/users.json?v=${Date.now()}`);
            const users = await res.json();
            const valid = users.find(u => u.user === user && u.pass === pass);
            if (valid) {
                if (errorEl) errorEl.style.display = "none";
                loginModal.hide();
                setupUserSession(user, valid.role);
            } else if (errorEl) errorEl.style.display = "block";
        } catch (err) { console.error(err); }
    });

    document.getElementById("btnDoRegister")?.addEventListener("click", async () => {
        const user = document.getElementById("regUser")?.value.trim();
        const pass = document.getElementById("regPass")?.value.trim();
        const photoInput = document.getElementById("regPhoto");
        const errorEl = document.getElementById("regError");

        if (!user || !pass) return;

        const formData = new FormData();
        formData.append("newUser", user);
        formData.append("newPass", pass);
        if (photoInput && photoInput.files.length > 0) formData.append("userPhoto", photoInput.files[0]);

        try {
            const res = await fetch('/Chat/RegisterUser', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                registerModal.hide();
                setupUserSession(user, "User");
            } else if (errorEl) {
                errorEl.innerText = data.message;
                errorEl.style.display = "block";
            }
        } catch (err) { console.error(err); }
    });
})();