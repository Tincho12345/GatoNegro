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

                    <input type="file" id="chatFile" style="display:none" accept="image/*,video/*" onchange="window.sendImage(this)">

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
                // --- CAMBIOS AQUÍ ---
                input.value = ""; // Limpiar input inmediatamente
                editingMsgId = null;
                replyToId = null;
                window.cancelReply();

                // Forzar recarga local para no esperar a SignalR
                await loadChatHistory();
                // ---------------------
            }
        } catch (err) {
            console.error("Error al enviar:", err);
        }
    };

    window.deleteMessage = async (id) => {
        // Usamos el mismo estilo que en Reset Password
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar mensaje?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            iconColor: '#f8bb86',
            showCancelButton: true,
            confirmButtonText: 'Sí, borrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            background: '#1e1e2d', // Estilo Dark
            color: '#ffffff',
            // 🔥 EFECTO LINTERNA EN EL MODAL
            didOpen: (modal) => {
                const confirmBtn = Swal.getConfirmButton();
                const cancelBtn = Swal.getCancelButton();

                confirmBtn.classList.add('swal-button-glow');
                cancelBtn.classList.add('swal-button-glow');

                modal.addEventListener('mousemove', (e) => {
                    const rectConfirm = confirmBtn.getBoundingClientRect();
                    const rectCancel = cancelBtn.getBoundingClientRect();

                    // Posición relativa para el brillo del botón Confirmar
                    confirmBtn.style.setProperty('--x', `${e.clientX - rectConfirm.left}px`);
                    confirmBtn.style.setProperty('--y', `${e.clientY - rectConfirm.top}px`);

                    // Posición relativa para el brillo del botón Cancelar
                    cancelBtn.style.setProperty('--x', `${e.clientX - rectCancel.left}px`);
                    cancelBtn.style.setProperty('--y', `${e.clientY - rectCancel.top}px`);
                });
            },
        });

        if (!isConfirmed) return;

        // Lógica de eliminación (tu código original)
        const formData = new FormData();
        formData.append("id", id);
        formData.append("user", getActiveUser());

        try {
            const res = await fetch('/Chat/DeleteMessage', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                // Notificación tipo Toast al terminar
                Swal.mixin({
                    toast: true,
                    position: 'center',
                    showConfirmButton: false,
                    timer: 1500,
                    background: '#1e1e2d',
                    color: '#ffffff'
                }).fire({
                    icon: 'success',
                    title: 'Mensaje eliminado'
                });
                await loadChatHistory();
            }
        } catch (err) {
            console.error(err);
        }
    };

    window.sendImage = async (input) => {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const formData = new FormData();
        formData.append("user", getActiveUser());
        formData.append("imageFile", file);

        // 1. Mostrar Spinner de carga bloqueante (ESTILO DARK)
        Swal.fire({
            title: 'Subiendo multimedia...',
            html: 'Por favor, espera un momento.',
            allowOutsideClick: false,
            background: '#1e1e2d',
            color: '#ffffff',
            didOpen: (modal) => { // <--- Aquí faltaba el parámetro 'modal'
                Swal.showLoading();

                // Ahora 'modal' ya existe y podemos buscar el loader
                const loader = modal.querySelector('.swal2-loader');
                if (loader) {
                    loader.style.borderTopColor = '#198754';
                }
            }
        });

        try {
            const res = await fetch('/Chat/SaveMessage', { method: 'POST', body: formData });
            const data = await res.json();

            Swal.close();

            if (data.success) {
                input.value = "";
                await loadChatHistory();

                if (window.GlobalToast) {
                    window.GlobalToast.fire({
                        icon: 'success',
                        title: '¡Enviado!',
                        background: '#1e1e2d', // Consistencia en Toast
                        color: '#ffffff',
                        timer: 1500
                    });
                }
            } else {
                // 2. Error con efecto LINTERNA
                Swal.fire({
                    icon: 'error',
                    title: 'No se pudo subir',
                    text: data.message || 'Error desconocido al procesar el archivo.',
                    background: '#1e1e2d',
                    color: '#ffffff',
                    confirmButtonColor: '#3085d6',
                    // APLICAMOS LINTERNA AL BOTÓN DE OK
                    didOpen: (modal) => {
                        const confirmBtn = Swal.getConfirmButton();
                        confirmBtn.classList.add('swal-button-glow');
                        modal.addEventListener('mousemove', (e) => {
                            const rect = confirmBtn.getBoundingClientRect();
                            confirmBtn.style.setProperty('--x', `${e.clientX - rect.left}px`);
                            confirmBtn.style.setProperty('--y', `${e.clientY - rect.top}px`);
                        });
                    }
                });
                input.value = "";
            }
        } catch (err) {
            Swal.close();
            console.error("Error al subir:", err);
            // 3. Error de conexión con efecto LINTERNA
            Swal.fire({
                icon: 'error',
                title: 'Fallo de conexión',
                text: 'Hubo un problema al contactar con el servidor.',
                background: '#1e1e2d',
                color: '#ffffff',
                didOpen: (modal) => {
                    const confirmBtn = Swal.getConfirmButton();
                    confirmBtn.classList.add('swal-button-glow');
                    modal.addEventListener('mousemove', (e) => {
                        const rect = confirmBtn.getBoundingClientRect();
                        confirmBtn.style.setProperty('--x', `${e.clientX - rect.left}px`);
                        confirmBtn.style.setProperty('--y', `${e.clientY - rect.top}px`);
                    });
                }
            });
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

            // 1. Detectar posición del scroll antes de limpiar el contenedor
            const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;

            const currentUser = getActiveUser();
            const currentRole = getActiveRole();
            const isLogged = currentRole !== "Visitante" && currentUser !== "Visitante";

            // 2. Mapeo y renderizado de mensajes
            chatMessages.innerHTML = messages.map(m => {
                const isMe = m.User === currentUser;
                const canManage = isLogged && (currentRole === "Admin" || (currentRole === "User" && isMe));
                const canReply = isLogged;

                // Limpieza de texto para evitar errores en onclick
                const cleanText = m.Text ? m.Text.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";

                // Gestión de Avatar
                const defaultAvatar = 'https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png';
                const userImg = (m.UserPhoto && m.UserPhoto.trim() !== "") ? m.UserPhoto : defaultAvatar;

                // --- LÓGICA DE MULTIMEDIA (Imagen vs Video) ---
                let mediaHtml = '';
                if (m.ImageUrl) {
                    const url = m.ImageUrl.toLowerCase();
                    const isVideo = url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".ogg") || url.includes("video/upload");

                    if (isVideo) {
                        mediaHtml = `
                        <div class="video-wrapper mb-2 shadow-sm rounded overflow-hidden" style="background: #000; position: relative;">
                            <video controls style="max-height: 250px; width: 100%; display: block;">
                                <source src="${m.ImageUrl}" type="video/mp4">
                                Tu navegador no soporta el video.
                            </video>
                        </div>`;
                    } else {
                        mediaHtml = `
                        <img src="${m.ImageUrl}" 
                             class="img-fluid rounded mb-2 d-block shadow-sm" 
                             style="max-height: 250px; cursor: pointer; object-fit: cover; width: 100%; transition: opacity 0.2s;" 
                             onclick="window.open('${m.ImageUrl}', '_blank')"
                             onmouseover="this.style.opacity='0.9'"
                             onmouseout="this.style.opacity='1'">`;
                    }
                }

                // --- GESTIÓN DE HORA DINÁMICA ---
                const msgDate = m.Date ? new Date(m.Date) : new Date();
                const formattedTime = msgDate.toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return `
                <div class="mb-3 d-flex ${isMe ? "justify-content-end" : "justify-content-start"} animate__animated animate__fadeInUp animate__faster">
                    ${!isMe ? `<img src="${userImg}" class="rounded-circle me-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd; align-self: flex-end; margin-bottom: 5px;">` : ''}
                    
                    <div class="message-wrapper" style="max-width: 80%;">
                        <div style="background: ${isMe ? '#dcf8c6' : '#ffffff'}; padding: 8px 12px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); position: relative;">
                            
                            <div class="d-flex justify-content-between align-items-start mb-1">
                                <small style="color: #075E54; font-weight: bold; font-size: 0.75rem;">${m.User}</small>
                                
                                ${(canReply || canManage) ? `
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

                            <span style="word-break: break-word; font-size: 0.95rem; line-height: 1.4;">${m.Text || ''}</span>
                            
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

            // 3. Auto-scroll si el usuario estaba abajo
            if (isAtBottom) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

        } catch (err) {
            console.error("Error al cargar historial:", err);
        }
    }

    // --- SIGNALR ---
    const connection = new signalR.HubConnectionBuilder().withUrl("/chatHub").build();

    connection.on("ReceiveMessageUpdate", () => {
        // El delay de 200ms es la clave para que la imagen y el texto aparezcan siempre
        setTimeout(() => {
            loadChatHistory();
        }, 200);
    });

    connection.start().catch(err => console.error("SignalR Error: ", err));

    // --- EVENTOS ---

    // 1. Abrir chat
    btnChat.addEventListener("click", () => {
        loadChatHistory();
        chatModal.show();
    });

    // 2. DETECTAR CIERRE DEL MODAL (Cerrar sesión automáticamente)
    chatModalEl.addEventListener('hidden.bs.modal', () => {
        console.log("Cerrando chat y deslogueando...");
        logoutUser(); // Esta función ya la tienes definida al final de tu script
    });

    // 3. Abrir login manual
    btnLogin.addEventListener("click", () => loginModal.show());

    // 4. Ir a registro desde login
    document.getElementById("btnGoRegister")?.addEventListener("click", () => {
        loginModal.hide();
        registerModal?.show();
    });

    // 5. Ejecutar Login
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

    // 6. Ejecutar Registro
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

    // --- FUNCIÓN MOSTRAR/OCULTAR CONTRASEÑA ---
    window.togglePassword = (inputId, btnEl) => {
        const passwordInput = document.getElementById(inputId);
        // Buscamos el icono dentro del botón que recibió el click
        const icon = btnEl.querySelector('i');

        if (passwordInput && icon) {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                icon.classList.remove("bi-eye");
                icon.classList.add("bi-eye-slash");
            } else {
                passwordInput.type = "password";
                icon.classList.remove("bi-eye-slash");
                icon.classList.add("bi-eye");
            }
        }
    };

    async function logoutUser() {
        // 1. Limpiar almacenamiento local
        localStorage.removeItem("chatUser");
        localStorage.removeItem("chatRole");

        // 2. Limpiar sesión en el servidor
        try {
            await fetch('/Chat/Logout', { method: 'POST' });
        } catch (err) {
            console.error("Error al cerrar sesión en servidor:", err);
        }

        // 3. Opcional: Recargar la página para que C# detecte que "estaLogueado" es false
        // y oculte los controles de envío en el próximo renderizado.
        document.body.style.cursor = 'wait';
        window.location.reload();
    }
})();