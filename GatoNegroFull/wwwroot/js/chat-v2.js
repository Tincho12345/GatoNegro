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
        await fetch(`/Chat/SetSessionUser?userName=${user}`, { method: 'POST' });

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
                
                    <button class="btn btn-link text-muted p-1 border-0 shadow-none" type="button">
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

            // Evento para enviar con la tecla Enter
            const newInput = document.getElementById("chatInput");
            newInput?.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    // Usamos window.isRecording para chequear el estado real
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
        await window.loadChatHistory();

        if (typeof GlobalToast !== 'undefined') {
            GlobalToast.fire({ icon: 'success', title: `Bienvenido, ${user}` });
        }
    }

    // --- OTROS MÉTODOS DE VENTANA ---
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

    // --- SIGNALR ---
    const connection = new signalR.HubConnectionBuilder().withUrl("/chatHub").build();
    connection.on("ReceiveMessageUpdate", () => {
        setTimeout(() => { window.loadChatHistory(); }, 200);
    });
    connection.start().catch(err => console.error("SignalR Error: ", err));

    // --- EVENTOS ---
    btnChat.addEventListener("click", () => {
        window.loadChatHistory();
        chatModal.show();
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
        try {
            const res = await fetch(`/assets/users.json?v=${Date.now()}`);
            const users = await res.json();
            const valid = users.find(u => u.user === user && u.pass === pass);
            if (valid) {
                if (errorEl) errorEl.style.display = "none";
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
                setupUserSession(user, "User");
            } else if (errorEl) {
                errorEl.innerText = data.message;
                errorEl.style.display = "block";
            }
        } catch (err) { console.error(err); }
    });

    async function logoutUser() {
        localStorage.removeItem("chatUser");
        localStorage.removeItem("chatRole");
        try {
            await fetch('/Chat/Logout', { method: 'POST' });
        } catch (err) { console.error(err); }
        document.body.style.cursor = 'wait';
        window.location.reload();
    }
})();