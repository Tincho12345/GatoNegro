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
     * Se exponen en 'window' para que módulos como chat-v2.js puedan verlos.
     */
    window.EleganteSwal = Swal.mixin({
        background: '#1e1e2f',
        color: '#ffffff',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#e53935',
        customClass: {
            popup: 'border-radius-15' // Opcional: si quieres bordes redondeados
        }
    });

    window.GlobalToast = window.EleganteSwal.mixin({
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
})(); // Fin Global