const express = require('express');
const dashboardCtrl = require('../controllers_sql/dashboard.controller');

const router = express.Router();

router.get('/usuariosPorDia',
	/*
		#swagger.path = '/api/dashboard/usuariosPorDia'
		#swagger.tags = ['Dashboard']
		#swagger.summary = 'Usuarios registrados por día'
		#swagger.description = 'Devuelve un array con la cantidad de usuarios registrados por día en los últimos 7 días.'
		#swagger.produces = ['application/json']
		#swagger.responses[200] = { description: 'OK' }
	*/
	dashboardCtrl.usuariosPorDia
);

router.get('/pedidosPorDia',
	/*
		#swagger.path = '/api/dashboard/pedidosPorDia'
		#swagger.tags = ['Dashboard']
		#swagger.summary = 'Pedidos realizados por día'
		#swagger.description = 'Devuelve un array con la cantidad de pedidos realizados por día en los últimos 7 días.'
	*/
	dashboardCtrl.pedidosPorDia
);

router.get('/dineroPorPedido',
	/*
		#swagger.path = '/api/dashboard/dineroPorPedido'
		#swagger.tags = ['Dashboard']
		#swagger.summary = 'Monto de los últimos pedidos'
		#swagger.description = 'Devuelve los montos de los últimos pedidos.'
	*/
	dashboardCtrl.dineroPorPedido
);

router.get('/cuponesUsados',
	/*
		#swagger.path = '/api/dashboard/cuponesUsados'
		#swagger.tags = ['Dashboard']
		#swagger.summary = 'Cupones usados'
		#swagger.description = 'Devuelve estadísticas de cupones usados.'
	*/
	dashboardCtrl.cuponesUsados
);

module.exports = router;
