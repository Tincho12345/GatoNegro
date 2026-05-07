(function () {
    "use strict";

    /**
     * 1. CONFIGURACIONES DE NAVEGACIÓN Y UI
     */
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');

    function toggleScrolled() {
        if (!selectHeader) return;
        if (!selectHeader.classList.contains('scroll-up-sticky') &&
            !selectHeader.classList.contains('sticky-top') &&
            !selectHeader.classList.contains('fixed-top')) return;

        window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
    }

    document.addEventListener('scroll', toggleScrolled);
    window.addEventListener('load', toggleScrolled);

    const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');
    if (mobileNavToggleBtn) {
        mobileNavToggleBtn.addEventListener('click', () => {
            document.querySelector('body').classList.toggle('mobile-nav-active');
            mobileNavToggleBtn.classList.toggle('bi-list');
            mobileNavToggleBtn.classList.toggle('bi-x');
        });
    }

    document.querySelectorAll('.dropdown-submenu').forEach(submenu => {
        submenu.addEventListener('mouseenter', () => {
            const toggle = submenu.querySelector('.dropdown-toggle');
            if (toggle) bootstrap.Dropdown.getOrCreateInstance(toggle).show();
        });
        submenu.addEventListener('mouseleave', () => {
            const toggle = submenu.querySelector('.dropdown-toggle');
            if (toggle) bootstrap.Dropdown.getInstance(toggle)?.hide();
        });
    });

    /**
     * 2. ALERTAS GLOBALES (SweetAlert2 - Estilo Elegante)
     */
    const EleganteSwal = Swal.mixin({
        background: '#1e1e2f',
        color: '#ffffff',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#e53935'
    });

    const GlobalToast = EleganteSwal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    /**
     * 3. LÓGICA PRINCIPAL (DOMContentLoaded)
     */

    let chatModal, registerModal;

    document.addEventListener("DOMContentLoaded", () => {
        
        if (window.emailjs) emailjs.init("Ox8bIMrq0l6N16cI1");

        // Registro de Visita Único por sesión
        if (!localStorage.getItem("visita_enviada")) {
            //enviarIPVisita();
        }

        // --- MANEJADOR DE CLICKS PARA ELIMINACIÓN ---
        document.addEventListener('click', async (e) => {
            // 1. Detectar el botón de eliminar
            const btn = e.target.closest('.btn-eliminar-testimonio, .btn-eliminar-imagen, .btn-eliminar-imagen-galeria');
            if (!btn) return;

            e.preventDefault();

            // 2. Identificar el contenedor físico (la columna de Bootstrap o la fila de tabla)
            // Buscamos el ancestro que ocupa el espacio en el layout para evitar huecos vacíos.
            const elementoAEliminar = btn.closest('[class*="col-"], tr, .glass-card');

            // 3. Confirmación con SweetAlert
            const { isConfirmed } = await EleganteSwal.fire({
                title: '¿Estás seguro?',
                text: "Esta acción no se puede deshacer.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                reverseButtons: true,
                focusCancel: true
            });

            if (!isConfirmed) return;

            try {
                // 4. Preparar datos y URL
                const id = btn.getAttribute('data-id') || btn.dataset.filename;
                const form = btn.closest('form');

                // Determinamos la URL dinámicamente si no hay un form
                let url = form ? form.action : '';
                if (!url) {
                    url = btn.classList.contains('btn-eliminar-testimonio') ? '/Testimonio/Delete' : '/Imagen/Delete';
                }

                const formData = form ? new FormData(form) : new FormData();
                if (!form) formData.append('id', id);

                // 5. Ejecutar la petición
                const res = await fetch(url, { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    if (elementoAEliminar) {
                        // 6. EFECTO VISUAL: Aplicar clase de colapso
                        elementoAEliminar.classList.add('item-eliminando');

                        // Esperamos a que la transición de CSS termine (500ms)
                        setTimeout(() => {
                            elementoAEliminar.remove();
                            GlobalToast.fire({ icon: 'success', title: data.message || 'Eliminado correctamente' });

                            // 7. Verificación de contenedor vacío
                            // Buscamos si quedan más tarjetas en la sección
                            const contenedorPadre = document.querySelector('#testimonials .row, #galeria .row');
                            const restantes = contenedorPadre ? contenedorPadre.querySelectorAll('.glass-card').length : 1;

                            if (restantes === 0) location.reload();
                        }, 500);
                    } else {
                        location.reload(); // Fallback si no hay elemento detectado
                    }
                } else {
                    GlobalToast.fire({ icon: 'error', title: data.message || 'No se pudo eliminar' });
                }
            } catch (err) {
                console.error("Error en eliminación:", err);
                GlobalToast.fire({ icon: 'error', title: 'Error de conexión con el servidor' });
            }
        });

        // --- SUBIR TESTIMONIO ---
        const formTestimonio = document.getElementById("formTestimonio");
        if (formTestimonio) {
            formTestimonio.addEventListener("submit", async (e) => {
                e.preventDefault();
                EleganteSwal.fire({
                    title: 'Subiendo testimonio...',
                    text: 'Procesando imagen y datos',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const res = await fetch('/Testimonio/Upload', { method: 'POST', body: new FormData(formTestimonio) });
                    const data = await res.json();
                    if (data.success) {
                        await EleganteSwal.fire({ icon: 'success', title: '¡Listo!', text: data.message, timer: 2000, showConfirmButton: false });
                        location.reload();
                    } else {
                        EleganteSwal.fire({ icon: 'error', title: 'Error', text: data.message });
                    }
                } catch (err) {
                    EleganteSwal.fire({ icon: 'error', title: 'Error de conexión' });
                }
            });
        }

        // --- FORMULARIO DE CONTACTO ---
        const contactForm = document.getElementById("contactForm");
        if (contactForm) {
            contactForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                EleganteSwal.fire({ title: 'Enviando...', didOpen: () => Swal.showLoading() });

                try {
                    const formData = new FormData(contactForm);
                    await emailjs.sendForm("service_4egurwa", "template_rxhf8jg", contactForm);
                    enviarWhatsApp(formData.get("telefono"), formData.get("nombre"), formData.get("email"), formData.get("message"));

                    Swal.close();
                    GlobalToast.fire({ icon: 'success', title: 'Mensaje enviado correctamente' });
                    contactForm.reset();
                } catch (error) {
                    GlobalToast.fire({ icon: 'error', title: 'Error al enviar' });
                }
            });
        }

        if (typeof AOS !== "undefined") AOS.init({ duration: 600, easing: 'ease-in-out', once: true });
        if (typeof PureCounter !== "undefined") new PureCounter();
        initSwiper();
        if (typeof galeriaGatoNegro === 'function') galeriaGatoNegro();
    });

       function enviarWhatsApp(telefono, nombre, email, mensaje) {
        if (!telefono) return;
        let num = telefono.replace(/\D/g, "");
        if (!num.startsWith("54")) num = "54" + num;
        const texto = `Hola 👋\nNombre: ${nombre}\nEmail: ${email}\nMensaje: ${mensaje}`;
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, "_blank");
    }

    window.openImage = (element) => {
        const modalImg = document.getElementById('modalImage');
        const modalEl = document.getElementById('imageModal');
        const img = element.tagName === 'IMG' ? element : element.querySelector('img');
        if (!modalImg || !img || !modalEl) return;

        modalImg.src = img.src;
        const card = element.closest('.glass-card');
        const commentEl = document.getElementById('modalComment');
        const nameEl = document.getElementById('modalName');

        if (commentEl) commentEl.textContent = card?.dataset.comment ? `"${card.dataset.comment}"` : '';
        if (nameEl) nameEl.textContent = card?.dataset.name || '';

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    };

    function initSwiper() {
        document.querySelectorAll(".init-swiper").forEach(el => {
            const configEl = el.querySelector(".swiper-config");
            if (configEl) new Swiper(el, JSON.parse(configEl.innerHTML.trim()));
        });
    }

    window.bloquearTabla = () => document.getElementById('table-blocker')?.classList.remove('d-none');
    window.desbloquearTabla = () => document.getElementById('table-blocker')?.classList.add('d-none');

    // --- SUBIR IMAGEN A GALERÍA ---
    const formSubirImagen = document.getElementById("formSubirImagen");
    if (formSubirImagen) {
        formSubirImagen.addEventListener("submit", async (e) => {
            e.preventDefault();

            EleganteSwal.fire({
                title: 'Subiendo imagen...',
                text: 'Enviando a Cloudinary',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await fetch(formSubirImagen.action, {
                    method: 'POST',
                    body: new FormData(formSubirImagen)
                });
                const data = await res.json();

                if (data.success) {
                    await EleganteSwal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: data.message,
                        timer: 1500,
                        showConfirmButton: false
                    });
                    location.reload();
                } else {
                    EleganteSwal.fire({ icon: 'error', title: 'Error', text: data.message });
                }
            } catch (err) {
                EleganteSwal.fire({ icon: 'error', title: 'Error de conexión' });
            }
        });
    }

    /**
    * SISTEMA INTEGRADO mensajería de Chat - GatoNegroFull v2026
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

        // Ya no necesitamos chatInterval porque usamos SignalR
        const getActiveUser = () => localStorage.getItem("chatUser") || "Visitante";
        const getActiveRole = () => localStorage.getItem("chatRole") || "Visitante";

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
            <div class="input-group bg-light rounded-pill border overflow-hidden w-100" style="padding: 2px;">
                <input type="text" id="chatInput" class="form-control border-0 shadow-none ps-3 bg-transparent" placeholder="Escribe un mensaje..." style="font-size: 0.9rem;">
                <button class="btn btn-success rounded-circle d-flex align-items-center justify-content-center" id="btnSend" type="button" style="width: 35px; height: 35px; margin: 2px;" onclick="sendMessage()">
                    <i id="sendIcon" class="bi bi-send-fill" style="font-size: 0.8rem;"></i>
                </button>
            </div>`;

                const newInput = document.getElementById("chatInput");
                newInput?.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") window.sendMessage();
                });
            }

            chatModal.show();
            await loadChatHistory();

            if (typeof GlobalToast !== 'undefined') {
                GlobalToast.fire({ icon: 'success', title: `Bienvenido, ${user}` });
            }
        }

        // --- MÉTODOS GLOBALES ---

        window.cancelReply = () => {
            replyToId = null;
            editingMsgId = null;
            const preview = document.getElementById("replyPreview");
            if (preview) preview.style.display = "none";
            const input = document.getElementById("chatInput");
            if (input) input.value = "";
            const icon = document.getElementById("sendIcon");
            if (icon) icon.className = "bi bi-send-fill";
        };

        window.showAddUserModal = () => {
            // Cerramos el modal de chat para no superponer
            chatModal.hide();

            // Si el modal de registro existe, lo mostramos
            if (registerModal) {
                // Limpiamos campos previos por seguridad
                document.getElementById("regUser").value = "";
                document.getElementById("regPass").value = "";
                if (document.getElementById("regPhoto")) document.getElementById("regPhoto").value = "";
                if (document.getElementById("regError")) document.getElementById("regError").style.display = "none";

                registerModal.show();
            } else {
                console.error("El modal de registro no está inicializado.");
            }
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
            const previewVisible = document.getElementById("replyPreview")?.style.display === "block";

            if (editingMsgId && previewVisible) {
                url = '/Chat/UpdateMessage';
                formData.append("editId", editingMsgId);
            } else if (replyToId && previewVisible) {
                formData.append("replyToId", replyToId);
            }

            try {
                const res = await fetch(url, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    window.cancelReply();
                    // No hace falta llamar a loadChatHistory() aquí, 
                    // SignalR disparará la actualización para todos, incluido vos.
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
                const res = await fetch('/Chat/DeleteMessage', { method: 'POST', body: formData });
                const data = await res.json();
            } catch (err) { console.error(err); }
        };

        async function loadChatHistory() {
            const chatContainer = document.getElementById("chatContainer");
            const chatMessages = document.getElementById("chatMessages");
            if (!chatMessages || !chatContainer) return;

            try {
                const response = await fetch(`/assets/chat.json?v=${Date.now()}`);
                if (!response.ok) return;
                const messages = await response.json();
                const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 100;

                const currentUser = getActiveUser();
                const currentRole = getActiveRole();

                chatMessages.innerHTML = messages.map(m => {
                    const isMe = m.User === currentUser;
                    const canManage = (currentRole === "Admin") || (currentRole === "User" && isMe);
                    const canReply = currentRole !== "Visitante";
                    const cleanText = m.Text.replace(/'/g, "\\'").replace(/"/g, "&quot;");

                    // Usamos la propiedad photoUrl que definimos en la clase C#
                    const userImg = m.UserPhoto || 'https://res.cloudinary.com/dh1lvsawt/image/upload/v1/perfiles/default_avatar.png';

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
                            <span style="word-break: break-word;">${m.Text}</span>
                        </div>
                    </div>
                    ${isMe ? `<img src="${userImg}" class="rounded-circle ms-2" style="width:30px; height:30px; object-fit:cover; border: 1px solid #ddd;">` : ''}
                </div>`;
                }).join('');

                if (isAtBottom) chatContainer.scrollTop = chatContainer.scrollHeight;
            } catch (err) { console.error(err); }
        }

        // --- SIGNALR CONFIG ---
        const connection = new signalR.HubConnectionBuilder() 
            .withUrl("/chatHub")
            .build();

        connection.on("ReceiveMessageUpdate", () => {
            loadChatHistory();
        });

        connection.start().catch(err => console.error("SignalR Error: ", err));

        // --- EVENTOS DE UI ---

        btnChat.addEventListener("click", () => {
            loadChatHistory();
            chatModal.show();
        });

        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', function () {
                const input = document.getElementById(this.getAttribute('data-target'));
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('bi-eye', 'bi-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('bi-eye-slash', 'bi-eye');
                }
            });
        });

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
            if (photoInput && photoInput.files.length > 0) {
                formData.append("userPhoto", photoInput.files[0]);
            }

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

})(); // Fin Global