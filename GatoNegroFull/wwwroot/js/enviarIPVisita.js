
/**
 * 4. FUNCIONES DE APOYO
 */
async function enviarIPVisita() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        // Detectamos el SO de forma moderna sin usar .platform
        const getOS = () => {
            const ua = navigator.userAgent;
            if (ua.indexOf("Win") !== -1) return "Windows";
            if (ua.indexOf("Mac") !== -1) return "MacOS";
            if (ua.indexOf("Linux") !== -1) return "Linux";
            if (ua.indexOf("Android") !== -1) return "Android";
            if (ua.indexOf("like Mac") !== -1) return "iOS";
            return "Desconocido";
        };

        const params = {
            ip: data.ip,
            pais: data.country_name,
            region: data.region,
            ciudad: data.city,
            isp: data.org,
            dispositivo: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Móvil" : "PC",

            // SOLUCIÓN DEFINITIVA: Usamos la función getOS() en lugar de navigator.platform
            so: getOS(),

            plataforma: navigator.userAgentData?.platform || "N/A",
            user_agent: navigator.userAgent,
            idioma: navigator.language,
            zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cpu: navigator.hardwareConcurrency || "N/A",
            memoria: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "N/A",
            resolucion: `${window.screen.width}x${window.screen.height}`,
            pagina: window.location.href,
            fecha: new Date().toLocaleString('es-AR')
        };

        await emailjs.send("service_4egurwa", "template_rxhf8jg", params);
        localStorage.setItem("visita_enviada", "1");
    } catch (err) {
        console.error("Error visita:", err);
    }
}

/**
 * DISPARADOR: Se ejecuta automáticamente al cargar la página
 */
document.addEventListener("DOMContentLoaded", enviarIPVisita);
