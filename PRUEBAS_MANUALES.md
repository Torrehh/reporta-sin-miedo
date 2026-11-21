# Pruebas manuales de aceptación

Marcar cada criterio después de probarlo en un navegador y dispositivo reales:

- [ ] **Reporte en menos de 1 minuto:** iniciar un reporte nuevo, completar los campos mínimos y confirmar el envío en menos de 60 segundos.
- [ ] **Envío sin señal:** cargar la aplicación y la faena con conexión, desconectar la red, enviar un reporte y confirmar que queda en la cola; reconectar y verificar su sincronización.
- [ ] **Supervisor sin nombres:** iniciar como supervisor y comprobar que el aviso no contiene nombres ni contenido identificable del reporte.
- [ ] **Motivo obligatorio para ver identidad:** intentar consultar una identidad sin motivo y verificar que no se revela; ingresar un motivo y comprobar que el acceso queda auditado.
- [ ] **Seguimiento sin contenido:** consultar un código válido y verificar que se muestra el estado, pero no la descripción ni la fotografía.
- [ ] **Foto sin EXIF:** cargar una foto con metadatos EXIF y comprobar que la imagen procesada que se almacena no conserva esos metadatos.
- [ ] **Tablero con aviso:** iniciar como prevencionista o gerente, abrir el tablero y verificar el aviso de que más reportes significan mejor cultura de seguridad, no peor desempeño.
- [ ] **Instalación como PWA:** instalar desde el navegador y comprobar nombre, icono, modo independiente y apariencia.
- [ ] **Funcionamiento offline:** después de una primera carga completa conectada, desactivar la red, recargar y recorrer las pantallas de la aplicación; comprobar el aviso «Lista para usar sin conexión».
- [ ] **Diseño adaptable:** revisar la pantalla a 360 px y en escritorio, sin desbordamientos ni controles difíciles de usar.
- [ ] **Accesibilidad e interfaz:** recorrer con teclado y verificar foco visible, etiquetas, contraste suficiente y textos en español.
- [ ] **Consola del navegador:** completar los flujos principales y confirmar que no aparecen errores ni advertencias inesperadas.
