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

    async function setupUserSession(user, role) {
        localStorage.setItem("chatUser", user);
        localStorage.setItem("chatRole", role || "User");

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

            <div class="d-flex align-items-end gap-2 w-100 p-1">
                <div class="flex-grow-1 bg-white rounded-pill shadow-sm d-flex align-items-center px-2 py-1 border">
                    <button id="btnEmoji" class="btn btn-link text-muted p-1 border-0 shadow-none" type="button" onclick="window.abrirSelectorEmojis(this)">
                        <i class="bi bi-emoji-smile" style="font-size: 1.3rem;"></i>
                    </button>
                    <input type="text" id="chatInput" 
                           class="form-control border-0 shadow-none bg-transparent ps-1" 
                           placeholder="Escribe un mensaje..." 
                           style="font-size: 1rem;" 
                           oninput="window.toggleSendIcon()">
                    <button class="btn btn-link text-muted p-1 border-0 shadow-none" type="button" onclick="document.getElementById('chatFile').click()">
                        <i class="bi bi-paperclip" style="font-size: 1.3rem; transform: rotate(45deg);"></i>
                    </button>
                    <input type="file" id="chatFile" style="display:none" accept="image/*,video/*" onchange="window.sendImage(this)">
                </div>

                <button class="btn btn-success rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                        id="btnSend" type="button"
                        style="width: 48px; height: 48px; min-width: 48px; touch-action: none;"
                        onpointerdown="window.handlePointerDown(event)"
                        onpointerup="window.handlePointerUp(event)"
                        oncontextmenu="return false;">
                    <i id="sendIcon" class="bi bi-mic-fill" style="font-size: 1.2rem;"></i>
                </button>
            </div>`;

            // CAMBIO ACÁ: Se ejecuta con retraso para garantizar que el DOM del footer ya exista en el navegador
            setTimeout(() => {
                window.inicializarSelectorEmojis();
            }, 50);

            const newInput = document.getElementById("chatInput");
            newInput?.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    if (window.isRecording) {
                        e.preventDefault();
                    } else {
                        window.handleSendMessage();
                    }
                }
            });
        }
        if (loginModal) loginModal.hide();
        if (registerModal) registerModal.hide();

        chatModal.show();
        setTimeout(() => { window.loadChatHistory(); }, 200);

        if (typeof GlobalToast !== 'undefined') {
            GlobalToast.fire({ icon: 'success', title: `Bienvenido, ${user}` });
        }
    }

    window.showAddUserModal = () => {
        if (loginModal) loginModal.hide();
        if (registerModal) registerModal.show();
    };

    window.togglePassword = (inputId, btnEl) => {
        const passwordInput = document.getElementById(inputId);
        const icon = btnEl.querySelector('i');
        if (passwordInput && icon) {
            const isPass = passwordInput.type === "password";
            passwordInput.type = isPass ? "text" : "password";
            icon.className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
        }
    };

    const connection = new signalR.HubConnectionBuilder().withUrl("/chatHub").build();
    connection.on("ReceiveMessageUpdate", () => {
        setTimeout(() => { window.loadChatHistory(); }, 300);
    });
    connection.start().catch(err => console.error("SignalR Error: ", err));

    btnChat.addEventListener("click", () => {
        chatModal.show();
        setTimeout(() => { window.loadChatHistory(); }, 200);
    });

    chatModalEl.addEventListener('hidden.bs.modal', () => logoutUser());

    btnLogin.addEventListener("click", () => loginModal.show());

    document.getElementById("btnGoRegister")?.addEventListener("click", () => {
        loginModal.hide();
        registerModal?.show();
    });

    document.getElementById("btnDoLogin")?.addEventListener("click", async () => {
        const user = document.getElementById("loginUser")?.value.trim();
        const pass = document.getElementById("loginPass")?.value.trim();
        const errorEl = document.getElementById("loginError");

        if (!user || !pass) return;

        const formData = new FormData();
        formData.append("userName", user);
        formData.append("password", pass);

        try {
            const res = await fetch('/Chat/SetSessionUser', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                if (errorEl) errorEl.style.display = "none";
                setupUserSession(user, data.role || "User");
            } else {
                if (errorEl) {
                    errorEl.innerText = data.message || "Datos incorrectos";
                    errorEl.style.display = "block";
                }
            }
        } catch (err) {
            console.error("Error en Login:", err);
        }
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
                setupUserSession(user, "User");
            } else if (errorEl) {
                errorEl.innerText = data.message;
                errorEl.style.display = "block";
            }
        } catch (err) { console.error(err); }
    });

    async function logoutUser() {
        if (!localStorage.getItem("chatUser")) return;
        localStorage.removeItem("chatUser");
        localStorage.removeItem("chatRole");
        document.body.style.cursor = 'wait';
        try {
            await fetch('/Chat/Logout', { method: 'POST' });
        } catch (err) {
            console.error(err);
        } finally {
            window.location.reload();
        }
    }

    // Instancia global para que no se duplique
    let emojiPickerInstance = null;
    window.inicializarSelectorEmojis = function () {
        const chatModalEl = document.getElementById("chatModal");
        const input = document.getElementById('chatInput');

        // Verificación del input y del constructor global de la librería
        if (!input || typeof EmojiButton === 'undefined') return;

        emojiPickerInstance = new EmojiButton({
            position: 'top-start',
            rootElement: chatModalEl,
            autoHide: true,
            i18n: {
                search: 'Buscar emoji',
                categories: {
                    recents: 'Recientes',
                    smileys: 'Emoticonos y personas',
                    animals: 'Animales y naturaleza',
                    food: 'Comida y bebida',
                    activities: 'Actividades',
                    travel: 'Viajes y lugares',
                    objects: 'Objetos',
                    symbols: 'Símbolos',
                    flags: 'Banderas'
                }
            }
        });

        // Evento que se dispara al seleccionar un emoji
        emojiPickerInstance.on('emoji', selection => {
            const currentInput = document.getElementById('chatInput');
            if (currentInput) {
                // CORRECCIÓN: Si 'selection' es un objeto usa su propiedad .emoji, 
                // de lo contrario, lo toma como el string directo (comportamiento de v3).
                const emojiFinal = (typeof selection === 'object' && selection.emoji) ? selection.emoji : selection;

                currentInput.value += emojiFinal;
                currentInput.focus();

                // Cambiar el ícono del botón de enviar (micrófono -> avión)
                if (typeof window.toggleSendIcon === 'function') {
                    window.toggleSendIcon();
                } else if (typeof toggleSendIcon === 'function') {
                    toggleSendIcon();
                }
            }
        });
    };

    // Esta función se ejecuta directo al hacer click en la carita bi-emoji-smile
    window.abrirSelectorEmojis = function (buttonElement) {
        if (!emojiPickerInstance) {
            window.inicializarSelectorEmojis();
        }

        if (emojiPickerInstance) {
            emojiPickerInstance.togglePicker(buttonElement);
        } else {
            console.error("La librería EmojiButton aún no ha cargado desde el CDN.");
        }
    };

})();