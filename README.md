# Reporta Sin Miedo

Prototipo PWA en español para reportar casi-accidentes de forma rápida y confidencial.

## Estado de las fases

- **Fase 3: seguimiento y aviso de represalia (prototipo local).** La ruta `/#/seguimiento` permite consultar el estado por código, consultar códigos de ejemplo y reportes pendientes offline, y registrar avisos de represalia sin pedir nombre. Los intentos fallidos se limitan localmente a cinco y bloquean nuevas consultas por diez minutos.
- **Fase 4: acceso del personal y gestión (prototipo local).** Incluye acceso simulado por rol, bandeja y edición de reportes, avisos para supervisión, auditoría de consultas de identidad y gestión de represalias. El acceso a identidades exige motivo y registra auditoría antes de consultarlas.
- **Fase 5: tablero de riesgos y administración de QR (prototipo local).** El tablero muestra agregados de los últimos 30 días con alternativas tabulares ordenadas alfabéticamente. La administración crea, edita y desactiva faenas, genera QR y permite descargar carteles PNG localmente.
- Los datos y límites se almacenan en el navegador; todavía no hay API. En producción, las consultas y el registro de avisos deben conectarse a Azure Functions.
- El login de personal y las comprobaciones de permisos son solo demostrativos. En producción deben validarse en el servidor con Microsoft Entra ID, doble factor y cuentas nominativas; la identidad y su auditoría no deben autorizarse ni protegerse solo en el navegador.
- En producción, sustituir el tablero local por Power BI conectado al Data Lake, con ETL diario desde SharePoint. Los avisos de Teams/correo también requieren integración real.

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

Las fases 3, 4 y 5 son demostraciones locales y no deben usarse como canal de denuncia ni como control de acceso en producción.
