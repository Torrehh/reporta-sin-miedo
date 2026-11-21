# Reporta Sin Miedo

Prototipo académico de una aplicación web progresiva (PWA) para reportar casi-accidentes de forma rápida y confidencial, incluso cuando no hay señal. El caso de uso de la demostración corresponde a **ANDALIÉN**, **Área A13**, y la brecha de seguridad **B2**. La aplicación busca facilitar el aprendizaje preventivo; no evalúa el desempeño ni reemplaza los canales oficiales de denuncia.

## Ejecutar y probar

Se requiere Node.js 22 o superior y npm.

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

La aplicación de demostración guarda sus datos en el navegador. Usa `npm run dev` para probarla localmente; para comprobar la salida compilada se puede ejecutar `npm run preview` después de construir.

## Despliegue en GitHub Pages

El workflow de GitHub Actions publica automáticamente `dist` al hacer push a `main`. También se puede iniciar manualmente desde la pestaña **Actions**. El workflow instala dependencias, ejecuta lint, pruebas y compilación antes de publicar.

1. En GitHub, abre **Settings → Pages → Source: GitHub Actions**.
2. Sube o integra los cambios en `main` y espera a que termine el workflow **Desplegar en GitHub Pages**.
3. La aplicación estará en <https://torrehh.github.io/reporta-sin-miedo/>.
4. Genera e imprime los QR desde esa dirección publicada, no desde el entorno de desarrollo. Los enlaces de reporte mantienen el subpath y usan `HashRouter`.

El sitio usa rutas y recursos relativos; no necesita un `404.html` porque la navegación de la aplicación vive en el fragmento `#`.

## Privacidad aplicada en el prototipo

- Se puede reportar sin crear cuenta; el nombre es opcional y, si se entrega con consentimiento, se guarda separado del contenido del reporte.
- Las fotografías se procesan antes de guardarse para eliminar metadatos EXIF.
- No se recopilan IP ni geolocalización.
- La vista del supervisor presenta avisos sin nombres ni contenido identificable del reporte.
- La consulta autorizada de identidades exige un motivo y se registra en la auditoría.
- El proyecto no se usa para evaluar a las personas ni su desempeño.

Estas reglas describen el comportamiento previsto del prototipo y no sustituyen controles de seguridad del servidor.

## Guía de demostración para el examen

1. En la pantalla inicial, inicia el flujo como trabajador y abre el formulario correspondiente a la faena ANDALIÉN.
2. Completa un reporte de casi-accidente sin nombre. Muestra que el formulario pide lo mínimo necesario y que el envío se puede realizar en menos de un minuto.
3. Activa la opción de red desconectada de la demostración antes de enviar otro reporte. Confirma el guardado en la cola y vuelve a conectar para comprobar el envío pendiente.
4. Abre seguimiento con el código entregado. Muestra el estado general sin revelar el contenido privado del reporte.
5. Registra un aviso de represalia desde seguimiento; no se solicita identidad.
6. Ingresa como prevencionista y revisa la bandeja y el detalle. Solo el personal autorizado puede solicitar ver una identidad, y debe ingresar un motivo.
7. Ingresa como supervisor y abre avisos: confirma que recibe un resumen sin nombres ni contenido del reporte.
8. Ingresa como gerente para revisar avisos de represalia y la auditoría de consultas de identidad.
9. Abre el tablero de riesgos y explica sus agregados y el mensaje de que más reportes representan mejor cultura de seguridad, no peor desempeño.
10. Abre administración de QR. Comprueba el enlace de ANDALIÉN y descarga el QR desde el sitio publicado para imprimirlo.
11. Instala la PWA desde el navegador y, después de la primera carga completa, prueba la navegación con la red desactivada.

Los nombres y perfiles de acceso de esta guía son datos de demostración, no cuentas reales.

## Simulaciones y arquitectura de producción

Actualmente se simulan en el navegador:

- Persistencia local de reportes, identidades, avisos, datos de prueba y cola sin conexión; los datos no se comparten entre dispositivos.
- Inicio de sesión y permisos por rol, sin autenticación real.
- Sugerencias de IA mediante reglas locales.
- Avisos a Teams y correo, sin envío real.
- Tablero y administración de QR con los datos del navegador.

Una implementación de producción necesitaría servicios backend: **Azure Functions** para la API; **SharePoint** mediante **Microsoft Graph** para el almacenamiento operativo; un **Data Lake** con ETL diario y **Power BI** para analítica; **Microsoft Entra ID** con doble factor para autenticación; **Azure OpenAI** invocado exclusivamente desde la API; y **Power Automate** con conectores estándar para los avisos.

## Limitaciones conocidas

- No hay backend compartido entre dispositivos.
- En iPhone, el envío de pendientes ocurre cuando la aplicación está abierta.
- La fotografía y la cola sin conexión no se han probado en todos los modelos de celular.
- Los datos, roles, permisos e integraciones de este prototipo no constituyen controles de producción.
- Es un prototipo académico y **no es apto para producción** ni para reemplazar un canal oficial de denuncia.
