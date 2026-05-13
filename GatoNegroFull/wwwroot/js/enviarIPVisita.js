
/**
 * 4. FUNCIONES DE APOYO
 */
async function enviarIPVisita() {
    // Verificamos si ya se envió en esta sesión para no saturar
    if (sessionStorage.getItem("visita_reportada")) return;

    try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        const getOS = () => {
            const ua = navigator.userAgent;
            if (ua.indexOf("Win") !== -1) return "Windows";
            if (ua.indexOf("Mac") !== -1) return "MacOS";
            if (ua.indexOf("Linux") !== -1) return "Linux";
            if (ua.indexOf("Android") !== -1) return "Android";
            if (ua.indexOf("like Mac") !== -1) return "iOS";
            return "Desconocido";
        };

        // Preparamos el mensaje para Discord (formato Markdown)
        const mensajeDiscord = {
            username: "GatoNegro Tracker",
            avatar_url: "https://i.imgur.com/your-image.png", // Opcional
            embeds: [{
                title: "🚀 Nueva Visita Detectada",
                color: 15418782, // Color en decimal (Negro/Gris)
                fields: [
                    { name: "📍 IP", value: data.ip || "N/A", inline: true },
                    { name: "🌍 Ubicación", value: `${data.city}, ${data.country_name}`, inline: true },
                    { name: "🏢 ISP", value: data.org || "N/A", inline: false },
                    { name: "💻 SO", value: getOS(), inline: true },
                    { name: "📱 Dispositivo", value: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Móvil" : "PC", inline: true },
                    { name: "🖥️ Resolución", value: `${window.screen.width}x${window.screen.height}`, inline: true },
                    { name: "🔗 Página", value: window.location.href, inline: false }
                ],
                footer: { text: `Fecha: ${new Date().toLocaleString('es-AR')}` }
            }]
        };

        // REEMPLAZA ESTA URL con la que copiaste de Discord
        const webhookURL = "https://discord.com/api/webhooks/1503925885995323463/nyyDANfksSyzah5dE2CgR6wLtmVbtawXezaHBoRn2Wk3BxEAaaOkjNKAG_qmBmQdLDFj";

        await fetch(webhookURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mensajeDiscord)
        });

        // Marcamos como enviado en esta sesión
        sessionStorage.setItem("visita_reportada", "1");

    } catch (err) {
        console.error("Error en el tracker:", err);
    }
}

/**
 * DISPARADOR: Se ejecuta automáticamente al cargar la página
 */
document.addEventListener("DOMContentLoaded", enviarIPVisita);
