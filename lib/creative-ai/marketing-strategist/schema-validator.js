'use strict';
// Deliberately scoped to the keywords in the two bundled schemas. Not a general JSON Schema engine.
function check(schema, value, path = '$', errors = []) {
  if (schema.anyOf && !schema.anyOf.some(branch => check(branch, value, path, []).length === 0)) errors.push(`${path}: does not match an allowed schema branch`);
  if ('const' in schema && value !== schema.const) errors.push(`${path}: must equal ${schema.const}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: unsupported value`);
  const types = { null: v => v === null, object: v => v !== null && typeof v === 'object' && !Array.isArray(v), array: Array.isArray, string: v => typeof v === 'string', boolean: v => typeof v === 'boolean', integer: Number.isInteger, number: v => typeof v === 'number' && Number.isFinite(v) };
  if (schema.type && !types[schema.type](value)) { errors.push(`${path}: expected ${schema.type}`); return errors; }
  if (schema.type === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${path}.${key}: required`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) check(schema.properties[key], item, `${path}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: unexpected field`);
    }
  }
  if (schema.type === 'array') {
    if (value.length < (schema.minItems || 0) || value.length > (schema.maxItems ?? Infinity)) errors.push(`${path}: invalid item count`);
    value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
  }
  if (schema.type === 'string' && ((!value.trim() && schema.minLength !== 0) || value.length < (schema.minLength || 0) || value.length > (schema.maxLength ?? Infinity))) errors.push(`${path}: invalid string length`);
  if (['number','integer'].includes(schema.type) && (value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) errors.push(`${path}: out of range`);
  return errors;
}
module.exports = { check };
