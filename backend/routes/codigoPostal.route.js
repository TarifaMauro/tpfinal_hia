const express = require('express');
const { buscarPorCP } = require('../controllers_sql/codigosPostales.controller');

const router = express.Router();

router.get('/:cp',
	/*
		#swagger.path = '/api/codigoPostal/{cp}'
		#swagger.tags = ['CodigosPostales']
		#swagger.summary = 'Buscar por Código Postal'
		#swagger.description = 'Devuelve la información asociada a un código postal.'
		#swagger.parameters['cp'] = { in: 'path', required: true, description: 'Código postal' }
	*/
	buscarPorCP
);

module.exports = router;
