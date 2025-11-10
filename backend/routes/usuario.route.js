const usuarioCtrl = require('./../controllers_sql/usuario.controller');
const authCtrl = require('./../controllers_sql/auth.controller');
const { body } = require('express-validator');
const express = require('express');

const router = express.Router();

router.post(
	'/',
	/*
		#swagger.path = '/api/usuario/'
		#swagger.tags = ['Usuarios']
		#swagger.summary = 'Registro de nuevo usuario'
		#swagger.description = 'Permite registrar un nuevo usuario.'
		#swagger.consumes = ['application/json']
		#swagger.produces = ['application/json']
		#swagger.parameters['usuario'] = {
			in: 'body',
			required: true,
			description: 'Datos del nuevo usuario',
			schema: {
				$username: 'juan123', 
				$email: 'juan@mail.com',
				$password: '123456',
				$nombres: 'Juan',
				$apellido: 'Pérez',
				$rol: 'cliente'
			}
		}
		#swagger.responses[201] = {
			description: 'Usuario creado exitosamente',
			schema: {
				status: 1,
				msg: 'Usuario guardado correctamente'
			}
		}
		#swagger.responses[409] = {
			description: 'Conflicto: email o username ya registrados',
			schema: {
				status: 0,
				msg: 'El email ya está registrado'
			}
		}
		#swagger.responses[400] = {
			description: 'Solicitud mal formada o error de validación',
			schema: {
				status: 0,
				msg: 'Error procesando operación.'
			}
		}
	*/
	usuarioCtrl.createUsuario
);

router.post(
	'/login',
	[
		/*
			#swagger.path = '/api/usuario/login'
			#swagger.tags = ['Usuarios']
			#swagger.summary = 'Inicio de sesión'
			#swagger.description = 'Permite inicio de sesión con nombre de usuario y contraseña.'
			#swagger.consumes = ['application/json']
			#swagger.produces = ['application/json']
			#swagger.parameters['credenciales'] = {
				in: 'body',
				required: true,
				description: 'Credenciales de inicio de sesión',
				schema: {
					$username: 'juan123',
					$password: '123456'
				}
			}
			#swagger.responses[200] = {
				description: 'Inicio de sesión exitoso',
				schema: {
					status: 1,
					msg: 'Login exitoso',
					token: 'jwt_token_aqui'
				}
			}
			#swagger.responses[400] = {
				description: 'Error de validación o petición mal formada',
				schema: { status: 0, msg: 'Faltan campos requeridos' }
			}
			#swagger.responses[401] = { description: 'Usuario o contraseña incorrectos', schema: { status: 0, msg: 'Usuario o contraseña incorrectos.' } }
			#swagger.responses[500] = { description: 'Error interno del servidor', schema: { status: 0, msg: 'Error interno del servidor.' } }
		*/
		body("username").isString().trim().escape().notEmpty(),
		body("password").isString().notEmpty(),
	],
	usuarioCtrl.loginUsuario
);

router.post(
	'/google',
	[
		/*
			#swagger.path = '/api/usuario/login/google'
			#swagger.tags = ['Usuarios']
			#swagger.summary = 'Inicio de sesión con Google'
			#swagger.description = 'Permite iniciar sesión con un token JWT de Google. Si el usuario no existe en la base de datos, se crea automáticamente.'
			#swagger.consumes = ['application/json']
			#swagger.produces = ['application/json']
			#swagger.parameters['token'] = {
				in: 'body',
				required: true,
				description: 'Token JWT proporcionado por Google después de autenticarse',
				schema: { $token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4MzFh...' }
			}
			#swagger.responses[200] = { description: 'Inicio de sesión exitoso con Google', schema: { status: 1 } }
			#swagger.responses[400] = { description: 'Falta el token o es inválido', schema: { status: 0, msg: 'Token de Google requerido.' } }
			#swagger.responses[401] = { description: 'Token de Google inválido o expirado', schema: { status: 0, msg: 'Token de Google inválido' } }
			#swagger.responses[500] = { description: 'Error interno del servidor', schema: { status: 0, msg: 'Error interno al procesar el inicio de sesión' } }
		*/
		body("token").isString().notEmpty(),
	],
	usuarioCtrl.loginGoogle
);

// Rutas protegidas que requieren verificación de token
router.put(
	'/:id',
	/*
		#swagger.path = '/api/usuario/{id}'
		#swagger.tags = ['Usuarios']
		#swagger.summary = 'Actualización de usuario'
		#swagger.description = 'Actualiza un usuario existente'
		#swagger.security = [{ "bearerAuth": [] }]
		#swagger.parameters['id'] = { in: 'path', description: 'ID del usuario a actualizar', required: true, type: 'string' }
		#swagger.parameters['body'] = { in: 'body', description: 'Datos del usuario a actualizar', required: true }
		#swagger.responses[200] = { description: 'Usuario actualizado correctamente', schema: { status: 1, msg: 'Usuario actualizado correctamente' } }
	*/
	authCtrl.verifyToken,
	usuarioCtrl.updateUsuario
);

router.delete(
	'/:id',
	/*
		#swagger.path = '/api/usuario/{id}'
		#swagger.tags = ['Usuarios']
		#swagger.summary = 'Eliminación de usuario'
		#swagger.description = 'Elimina un usuario existente por su ID'
		#swagger.security = [{ "bearerAuth": [] }]
		#swagger.parameters['id'] = { in: 'path', description: 'ID del usuario a eliminar', required: true, type: 'string' }
		#swagger.responses[200] = { description: 'Usuario eliminado correctamente', schema: { status: 1, msg: 'Usuario eliminado correctamente' } }
	*/
	authCtrl.verifyToken,
	usuarioCtrl.deleteUsuario
);

router.get(
	'/',
	/*
		#swagger.path = '/api/usuario/'
		#swagger.tags = ['Usuarios']
		#swagger.summary = 'Retorno de todos los usuarios'
		#swagger.description = 'Obtiene la lista de todos los usuarios'
		#swagger.security = [{ "bearerAuth": [] }]
		#swagger.responses[200] = { description: 'Usuarios obtenidos correctamente' }
	*/
	authCtrl.verifyToken,
	usuarioCtrl.getUsuarios
);

router.get(
	'/:id',
	/*
		#swagger.path = '/api/usuario/{id}'
		#swagger.tags = ['Usuarios']
		#swagger.summary = 'Búsqueda de un usuario por ID'
		#swagger.description = 'Obtiene un usuario por su ID'
		#swagger.security = [{ "bearerAuth": [] }]
		#swagger.parameters['id'] = { in: 'path', description: 'ID del usuario a consultar', required: true, type: 'string' }
	*/
	authCtrl.verifyToken,
	usuarioCtrl.getUsuario
);

router.get(
	'/search/:username',
	/*
		#swagger.path = '/api/usuario/filtrado/{username}'
		#swagger.tags = ['Usuarios']
		#swagger.summary = 'Búsqueda de usuarios de acuerdo a un nombre de usuario'
		#swagger.description = 'Busca usuarios por coincidencia parcial en el nombre de usuario (insensible a mayúsculas/minúsculas)'
		#swagger.security = [{ "bearerAuth": [] }]
		#swagger.parameters['username'] = { in: 'path', description: 'Texto parcial del nombre de usuario a buscar', required: true, type: 'string' }
	*/
	authCtrl.verifyToken,
	usuarioCtrl.getUsuariosByUsername
);

module.exports = router;
