# Reporta Sin Miedo

Prototipo PWA en español para reportar casi-accidentes de forma rápida y confidencial.

## Estado de las fases

- **Fase 3: seguimiento y aviso de represalia (prototipo local).** La ruta `/#/seguimiento` permite consultar el estado por código, consultar códigos de ejemplo y reportes pendientes offline, y registrar avisos de represalia sin pedir nombre. Los intentos fallidos se limitan localmente a cinco y bloquean nuevas consultas por diez minutos.
- Los datos y límites se almacenan en el navegador; todavía no hay API. En producción, las consultas y el registro de avisos deben conectarse a Azure Functions.

## Desarrollo

```bash
npm install
npm run dev
npm run build
```

La Fase 3 es una demostración local y no debe usarse como canal de denuncia en producción.
