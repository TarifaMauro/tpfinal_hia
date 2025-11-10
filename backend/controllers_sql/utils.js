// Small helpers to normalize incoming payload values (numbers and dates)
function parseNumber(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  let s = String(val).trim();
  if (s === '') return null;
  s = s.replace(/[\$€£\s]/g, '');
  s = s.replace(/[^0-9.,-]/g, '');

  const hasDot = s.indexOf('.') !== -1;
  const hasComma = s.indexOf(',') !== -1;
  let normalized = s;
  try {
    if (hasDot && hasComma) {
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');
      if (lastDot > lastComma) {
        normalized = s.replace(/,/g, '');
      } else {
        normalized = s.replace(/\./g, '').replace(',', '.');
      }
    } else if (hasComma) {
      const parts = s.split(',');
      const frac = parts[parts.length - 1];
      if (frac.length === 2) normalized = s.replace(/\./g, '').replace(',', '.');
      else normalized = s.replace(/,/g, '');
    } else if (hasDot) {
      const parts = s.split('.');
      const frac = parts[parts.length - 1];
      if (frac.length === 2) normalized = s.replace(/,/g, '');
      else normalized = s.replace(/\./g, '');
    }
  } catch (e) { normalized = s.replace(/[^0-9.-]/g, ''); }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function parseIntSafe(val) {
  if (val == null) return null;
  if (typeof val === 'number') return Math.trunc(val);
  const n = parseInt(String(val).replace(/\D/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parseDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2,'0');
    const mm = m[2].padStart(2,'0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  return null;
}

module.exports = { parseNumber, parseIntSafe, parseDateToISO };
