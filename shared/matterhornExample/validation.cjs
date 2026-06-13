function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value;
}

function array(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

function string(value, name, max = 1000) {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} must be a non-empty string`);
  if (trimmed.length > max) throw new Error(`${name} is too long`);
  return trimmed;
}

function optionalString(value, name, max = 1000) {
  if (value === undefined || value === null || value === "") return null;
  return string(String(value), name, max);
}

function number(value, name, options = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a finite number`);
  if (options.min !== undefined && parsed < options.min) throw new Error(`${name} must be >= ${options.min}`);
  if (options.max !== undefined && parsed > options.max) throw new Error(`${name} must be <= ${options.max}`);
  return parsed;
}

function integer(value, name, options = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return number(parsed, name, options);
}

function enumValue(value, name, allowed) {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of ${allowed.join(", ")}`);
  return value;
}

function boolean(value) {
  return Boolean(value);
}

module.exports = { array, boolean, clone, enumValue, integer, number, object, optionalString, string };
