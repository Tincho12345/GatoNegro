// chat-voice.js
(function () {
    let mediaRecorder;
    let audioChunks = [];
    window.isRecording = false;

    window.startRecording = async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                // ESTA LÍNEA ES LA QUE ENVÍA AL SOLTAR
                await sendAudioToServer(audioBlob);

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            window.isRecording = true;
            updateUI(true);
        } catch (err) {
            console.error("Error micrófono:", err);
            window.isRecording = false;
        }
    };

    window.stopRecording = async function () {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop(); // Esto dispara el onstop de arriba automáticamente
            window.isRecording = false;
            updateUI(false);
        }
    };

    function updateUI(recording) {
        const btn = document.getElementById("btnSend");
        const icon = document.getElementById("sendIcon");
        const input = document.getElementById("chatInput");

        if (recording) {
            btn.style.transform = "scale(1.2)";
            btn.classList.replace("btn-success", "btn-danger");
            if (icon) icon.className = "bi bi-stop-fill";
            if (input) input.placeholder = "Grabando...";
        } else {
            btn.style.transform = "scale(1)";
            btn.classList.replace("btn-danger", "btn-success");
            if (icon) icon.className = "bi bi-mic-fill";
            if (input) input.placeholder = "Escribe un mensaje...";
        }
    }

    async function sendAudioToServer(blob) {
        const formData = new FormData();
        formData.append("audioFile", blob, `v_msg_${Date.now()}.webm`);
        formData.append("user", localStorage.getItem("chatUser") || "Visitante");

        try {
            const res = await fetch('/Chat/SendAudio', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                await window.loadChatHistory();
            }
        } catch (err) {
            console.error("Error enviando audio:", err);
        }
    }
})();