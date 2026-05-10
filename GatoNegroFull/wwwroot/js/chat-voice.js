// chat-voice.js
(function () {
    let mediaRecorder;
    let audioChunks = [];
    window.isRecording = false; // La hacemos global para que otros scripts la lean

    // Exponemos funciones de grabación al objeto window para que chat-actions las use
    window.startRecording = async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await sendAudioToServer(audioBlob);

                // Limpieza: cerramos el micrófono físicamente
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            window.isRecording = true;
            updateUI(true);
        } catch (err) {
            console.error("Error micrófono:", err);
            // Si el usuario deniega el permiso o no hay micro
            Swal.fire({
                icon: 'error',
                title: 'Micrófono no disponible',
                text: 'Asegúrate de dar permisos de audio.',
                background: '#1e1e2d',
                color: '#fff'
            });
        }
    };

    window.stopRecording = async function () {
        if (mediaRecorder && window.isRecording) {
            mediaRecorder.stop();
            window.isRecording = false;
            updateUI(false);
        }
    };

    function updateUI(recording) {
        const btn = document.getElementById("btnSend");
        const icon = document.getElementById("sendIcon");
        const input = document.getElementById("chatInput");

        if (recording) {
            btn.classList.replace("btn-success", "btn-danger");
            if (icon) icon.className = "bi bi-stop-fill"; // Cambia a icono de stop
            input.placeholder = "Grabando audio...";
            input.disabled = true;
        } else {
            btn.classList.replace("btn-danger", "btn-success");
            if (icon) icon.className = "bi bi-mic-fill";
            input.placeholder = "Escribe un mensaje...";
            input.disabled = false;
            input.focus();
        }
    }

    async function sendAudioToServer(blob) {
        const formData = new FormData();
        // Usamos .webm o .mp3 según lo que tu controller espere
        formData.append("audioFile", blob, `v_msg_${Date.now()}.webm`);
        formData.append("user", localStorage.getItem("chatUser") || "Visitante");

        try {
            const res = await fetch('/Chat/SendAudio', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                // SignalR se encarga de avisar a los demás
                console.log("Audio enviado");
            } else {
                console.error("Error de servidor:", data.message);
            }
        } catch (err) {
            console.error("Error enviando audio:", err);
        }
    }
})();