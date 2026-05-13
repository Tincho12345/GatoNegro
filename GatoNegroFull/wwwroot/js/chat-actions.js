let replyToId = null;
let editingMsgId = null;
let isRecording = false;
window.isRecording = false;

const getActiveUser = () => localStorage.getItem("chatUser") || "Visitante";

window.cancelReply = () => {
    replyToId = null;
    editingMsgId = null;

    const preview = document.getElementById("replyPreview");
    const chatInput = document.getElementById("chatInput");
    const icon = document.getElementById("sendIcon");

    // 1. Ocultar y limpiar el panel de vista previa
    if (preview) {
        preview.style.display = "none";
        const replyUser = document.getElementById("replyUser");
        const replyText = document.getElementById("replyText");
        if (replyUser) replyUser.innerText = "";
        if (replyText) replyText.innerText = "";
    }

    if (chatInput) {
        // chatInput.value = ""; // <- Decidí si querés limpiar el texto o no
        chatInput.focus();
    }

    // 3. Resetear el icono
    // Si después de cancelar no hay texto, debe volver al micrófono
    if (icon) {
        if (chatInput && chatInput.value.trim().length > 0) {
            icon.className = "bi bi-send-fill";
        } else {
            icon.className = "bi bi-mic-fill";
        }
    }
};

window.prepareReply = (id, user, text) => {
    // 1. Limpiamos cualquier estado previo (edición o respuesta anterior)
    window.cancelReply();

    replyToId = id;
    const preview = document.getElementById("replyPreview");
    const chatInput = document.getElementById("chatInput");
    const icon = document.getElementById("sendIcon");

    if (preview) {
        document.getElementById("replyUser").innerText = user;
        document.getElementById("replyText").innerText = text;
        preview.style.display = "block";
    }

    // 2. Al responder, el botón SIEMPRE debe ser el de enviar (avioncito)
    // porque aunque no haya texto, la acción es "enviar respuesta"
    if (icon) {
        icon.className = "bi bi-send-fill";
    }

    chatInput?.focus();
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
            input.value = "";
            editingMsgId = null;
            replyToId = null;
            window.cancelReply();
            await window.loadChatHistory();
        }
    } catch (err) {
        console.error("Error al enviar:", err);
    }
};

window.deleteMessage = async (id) => {
    // NUEVO: Si borramos el mensaje que estábamos editando o respondiendo, cancelamos la acción
    if (editingMsgId === id || replyToId === id) {
        window.cancelReply();
    }

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
        background: '#1e1e2d',
        color: '#ffffff',
        didOpen: (modal) => {
            const confirmBtn = Swal.getConfirmButton();
            const cancelBtn = Swal.getCancelButton();
            confirmBtn.classList.add('swal-button-glow');
            cancelBtn.classList.add('swal-button-glow');
            modal.addEventListener('mousemove', (e) => {
                const rectConfirm = confirmBtn.getBoundingClientRect();
                const rectCancel = cancelBtn.getBoundingClientRect();
                confirmBtn.style.setProperty('--x', `${e.clientX - rectConfirm.left}px`);
                confirmBtn.style.setProperty('--y', `${e.clientY - rectConfirm.top}px`);
                cancelBtn.style.setProperty('--x', `${e.clientX - rectCancel.left}px`);
                cancelBtn.style.setProperty('--y', `${e.clientY - rectCancel.top}px`);
            });
        },
    });

    if (!isConfirmed) return;

    const formData = new FormData();
    formData.append("id", id);
    formData.append("user", getActiveUser());

    try {
        const res = await fetch('/Chat/DeleteMessage', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            // Toast de éxito
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

            // Recargamos el historial para que desaparezca
            await window.loadChatHistory();
        }
    } catch (err) {
        console.error("Error al eliminar:", err);
    }
};

window.sendImage = async (input) => {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append("user", getActiveUser());
    formData.append("imageFile", file);

    Swal.fire({
        title: 'Subiendo multimedia...',
        html: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        background: '#1e1e2d',
        color: '#ffffff',
        didOpen: (modal) => {
            Swal.showLoading();
            const loader = modal.querySelector('.swal2-loader');
            if (loader) loader.style.borderTopColor = '#198754';
        }
    });

    try {
        const res = await fetch('/Chat/SaveMessage', { method: 'POST', body: formData });
        const data = await res.json();
        Swal.close();

        if (data.success) {
            input.value = "";
            await window.loadChatHistory();
            if (window.GlobalToast) {
                window.GlobalToast.fire({
                    icon: 'success',
                    title: '¡Enviado!',
                    background: '#1e1e2d',
                    color: '#ffffff',
                    timer: 1500
                });
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo subir',
                text: data.message || 'Error desconocido.',
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
            input.value = "";
        }
    } catch (err) {
        Swal.close();
        console.error("Error al subir:", err);
    }
};

window.toggleSendIcon = () => {
    const input = document.getElementById("chatInput");
    const icon = document.getElementById("sendIcon");
    if (input.value.trim().length > 0) {
        icon.className = "bi bi-send-fill";
    } else {
        icon.className = "bi bi-mic-fill";
    }
};

window.handleSendMessage = async () => {
    const input = document.getElementById("chatInput");
    const icon = document.getElementById("sendIcon");

    // 1. Si hay texto, enviamos mensaje normal (SignalR/Fetch)
    if (input.value.trim().length > 0) {
        await window.sendMessage();
        // Forzamos el icono de vuelta a micrófono después de enviar
        if (icon) icon.className = "bi bi-mic-fill";
    }
    // 2. Si no hay texto, disparamos la lógica de audio del otro archivo
    else {
        if (typeof window.startRecording === "function" || typeof window.stopRecording === "function") {
            // Esta variable 'isRecording' debe ser accesible o manejada globalmente
            if (!window.isRecording) {
                await window.startRecording();
            } else {
                await window.stopRecording();
            }
        } else {
            console.warn("El módulo de voz (chat-voice.js) no está cargado.");
        }
    }
};

window.handlePointerDown = (e) => {
    const input = document.getElementById("chatInput");
    // Si hay texto, el botón debe mandar texto, no grabar
    if (input && input.value.trim().length > 0) return;

    const btn = document.getElementById("btnSend");
    btn.setPointerCapture(e.pointerId);

    if (typeof window.startRecording === "function") {
        window.isRecording = true; // Seteamos el estado global
        window.startRecording();

        // Feedback visual
        btn.style.transform = "scale(1.2)";
        btn.classList.replace("btn-success", "btn-danger");
    }
};

window.handlePointerUp = async (e) => {
    const btn = document.getElementById("btnSend");
    const input = document.getElementById("chatInput");

    // 1. Si hay texto escrito, enviar mensaje de texto normal
    if (input && input.value.trim().length > 0) {
        await window.handleSendMessage();
        return;
    }

    // 2. Si estaba grabando, procesar el audio
    if (window.isRecording) {
        window.isRecording = false;
        btn.style.transform = "scale(1)";
        btn.classList.replace("btn-danger", "btn-success");

        if (typeof window.stopRecording === "function") {
            // Detenemos la grabación y obtenemos el Blob del audio
            const audioBlob = await window.stopRecording();

            if (audioBlob) {
                const formData = new FormData();
                formData.append("user", getActiveUser());
                // Asegúrate de que el nombre del campo coincida con tu Backend (ej: 'audioFile')
                formData.append("audioFile", audioBlob, "recording.webm");

                try {
                    const res = await fetch('/Chat/SaveMessage', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) {
                        await window.loadChatHistory();
                    }
                } catch (err) {
                    console.error("Error enviando audio:", err);
                }
            }
        }
    }
};