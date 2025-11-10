const express = require('express');
const mpCtrl = require('../controllers_sql/mp.controller');

const router = express.Router();

/*
	#swagger.path = '/api/mp/paymentlink'
	#swagger.tags = ['Pagos']
	#swagger.summary = 'Crear link de pago'
	#swagger.description = 'Genera un link de pago en Mercado Pago para un pago único.'
*/
router.post('/paymentlink', mpCtrl.getPaymentlink);

/*
	#swagger.tags = ['Pagos QR Dinámico']
	#swagger.summary = 'Generar un código QR dinámico'
*/
router.post('/generate_qr', mpCtrl.generateQRCode);

/*
	#swagger.tags = ['Pagos QR Estático']
	#swagger.summary = 'Generar un QR estático (Punto de Venta)'
*/
router.post('/generate_static_qr', mpCtrl.generateStaticQR);

/*
	#swagger.tags = ['Pagos QR Estático']
	#swagger.summary = 'Listar Puntos de Venta (POS)'
*/
router.get('/pos', mpCtrl.listPOS);

/*
	#swagger.tags = ['Pagos QR Dinámico']
	#swagger.summary = 'Verificar el estado de un pago QR'
	#swagger.parameters['external_reference'] = { in: 'path', required: true, description: 'Referencia externa' }
*/
router.get('/status/:external_reference', mpCtrl.checkQRPaymentStatus);

/*
	#swagger.tags = ['Webhooks']
	#swagger.summary = 'Recibir notificaciones de Mercado Pago'
*/
router.post('/webhook', mpCtrl.webhook);

/*
	#swagger.tags = ['Suscripciones']
	#swagger.summary = 'Crear link de suscripción'
*/
router.post('/subscription', mpCtrl.getSubscriptionLink);

module.exports = router;
