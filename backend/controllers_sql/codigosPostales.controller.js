const fs = require('fs');
const path = require('path');

const codigosPath = path.join(__dirname, '..', 'codigos_postales.json');
let codigos = [];
try { codigos = JSON.parse(fs.readFileSync(codigosPath, 'utf8')); } catch (err) { console.warn('No se pudo cargar codigos_postales.json:', err.message); }

const buscarPorCP = (req, res) => {
  const cp = req.params.cp;
  const resultados = codigos.filter(item => item.cp === cp);
  if (resultados.length === 0) return res.status(404).json({ error: 'Código postal no encontrado' });
  return res.json(resultados);
};

module.exports = { buscarPorCP };
