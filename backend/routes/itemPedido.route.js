const express = require('express');
const itemPedidoCtrl = require('../controllers_sql/itemPedido.controller');

const router = express.Router();

router.post('/',
	/*
		#swagger.path = '/api/itemPedido'
		#swagger.tags = ['ItemsPedido']
		#swagger.summary = 'Crear item de pedido'
		#swagger.description = 'Crea un item asociado a un pedido.'
	*/
	itemPedidoCtrl.createItemPedido
);

router.get('/',
	/*
		#swagger.path = '/api/itemPedido'
		#swagger.tags = ['ItemsPedido']
		#swagger.summary = 'Listar items de pedido'
	*/
	itemPedidoCtrl.getItemsPedido
);

router.get('/:id',
	/*
		#swagger.path = '/api/itemPedido/{id}'
		#swagger.tags = ['ItemsPedido']
		#swagger.summary = 'Obtener item por ID'
	*/
	itemPedidoCtrl.getItemsPedidoById
);

router.put('/:id',
	/*
		#swagger.path = '/api/itemPedido/{id}'
		#swagger.tags = ['ItemsPedido']
		#swagger.summary = 'Actualizar item de pedido'
	*/
	itemPedidoCtrl.updateItemPedido
);

router.delete('/:id',
	/*
		#swagger.path = '/api/itemPedido/{id}'
		#swagger.tags = ['ItemsPedido']
		#swagger.summary = 'Eliminar item de pedido'
	*/
	itemPedidoCtrl.deleteItemPedido
);

module.exports = router;
