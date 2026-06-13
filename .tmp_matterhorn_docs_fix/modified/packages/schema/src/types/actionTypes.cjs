const { builtinMicroPluginRegistry } = require('../registry.cjs');
const { quoteProp, schemaEntries, typeFromSchema } = require('./schema.cjs');

function isPrimaryAction(action, composition) {
  return !action.plugin || action.plugin === 'primary' || action.plugin === '$primary' || action.plugin === composition.primaryPlugin.id;
}

function isCoreAction(action) {
  return action.plugin === 'core' || action.plugin === 'matterhorn.core';
}

const scopedRole = { type: 'enum', values: ['none', 'viewer', 'editor', 'moderator', 'admin'] };

const coreActionPayloadSchemas = Object.freeze({
  'dm.message': {
    required: { userIds: { type: 'array', items: { type: 'string' } }, body: { type: 'string' } },
    optional: { topicKey: { type: 'string' } }
  },
  'scope.role.set': {
    required: { scopeType: { type: 'string' }, scopeId: { type: 'string' } },
    optional: { target: { type: 'string' }, role: scopedRole, defaultRole: scopedRole, reason: { type: 'string' } }
  },
  'access.role.define': {
    required: {
      roleId: { type: 'string' },
      grants: {
        type: 'array',
        items: {
          type: 'object',
          required: { scopeType: { type: 'string' }, scopeId: { type: 'string' }, role: scopedRole }
        }
      }
    },
    optional: { name: { type: 'string' }, reason: { type: 'string' } }
  },
  'access.role.assign': {
    required: { target: { type: 'string' }, roleId: { type: 'string' } },
    optional: { reason: { type: 'string' } }
  },
  'access.role.unassign': {
    required: { target: { type: 'string' }, roleId: { type: 'string' } },
    optional: { reason: { type: 'string' } }
  }
});

function operationDescriptorForAction(action, composition, model, registry = builtinMicroPluginRegistry) {
  if (isPrimaryAction(action, composition)) return model.operations?.[action.type];
  if (isCoreAction(action) && coreActionPayloadSchemas[action.type]) {
    return { payload: coreActionPayloadSchemas[action.type], authorize: action.requiredRole ? { roles: [action.requiredRole] } : undefined };
  }
  try {
    return registry.get(action.plugin).schema.schemas.operations[action.type];
  } catch {
    return undefined;
  }
}

function payloadSchemaForAction(action, composition, model, registry = builtinMicroPluginRegistry) {
  if (action.payloadSchema) return action.payloadSchema;
  const descriptor = operationDescriptorForAction(action, composition, model, registry);
  return descriptor?.payload || descriptor || { additional: true };
}

function authorizationRolesForAction(action, composition, model, registry = builtinMicroPluginRegistry) {
  const roles = action.authorize?.roles
    || (action.requiredRole ? [action.requiredRole] : undefined)
    || action.payloadSchema?.authorize?.roles
    || operationDescriptorForAction(action, composition, model, registry)?.authorize?.roles
    || payloadSchemaForAction(action, composition, model, registry)?.authorize?.roles
    || [];
  return Array.isArray(roles) ? roles.filter(Boolean).map(String) : [];
}

function unionParts(type) {
  return String(type || 'unknown').split(' | ').map((part) => part.trim()).filter(Boolean);
}

function withScalarAlias(type, alias) {
  const parts = unionParts(type).map((part) => {
    if (part === 'string') return alias;
    if (part === 'string[]') return `${alias}[]`;
    return part;
  });
  if (!parts.includes('null')) return [...new Set(parts)].join(' | ');
  return [...new Set(parts.filter((part) => part !== 'null')), 'null'].join(' | ');
}

function typeForPayloadField(action, name, spec) {
  if (action.type === 'comments.resolve' && name === 'resolved') return 'boolean';
  if (action.type.startsWith('presence.') && name === 'status') return 'PresenceStatus';
  if (action.type.startsWith('media.room.') && name === 'media') return 'MediaFlags';
  if (action.type.startsWith('media.room.') && name === 'roleAccess') return 'RoomRoleAccess';
  if (action.type.startsWith('message.') && name === 'embeds') return 'MessageEmbed[]';
  if (action.type === 'file.upload' && name === 'event') return 'NostrEvent';
  if (name === 'channelId') return withScalarAlias(typeFromSchema(spec), 'ChannelId');
  if (name === 'messageId' || name === 'replyToId') return withScalarAlias(typeFromSchema(spec), 'MessageId');
  if (name === 'roleId') return withScalarAlias(typeFromSchema(spec), 'RoleId');
  if (name === 'roleIds') return withScalarAlias(typeFromSchema(spec), 'RoleId');
  if (name === 'memberId' || name === 'userId') return withScalarAlias(typeFromSchema(spec), 'MemberId');
  if (name.endsWith('MemberId')) return withScalarAlias(typeFromSchema(spec), 'MemberId');
  if (name === 'userIds') return 'MemberId[]';
  if (name === 'roomId') return withScalarAlias(typeFromSchema(spec), 'RoomId');
  if (name === 'threadId') return withScalarAlias(typeFromSchema(spec), 'ThreadId');
  if (name === 'commentId' || name === 'parentId') return withScalarAlias(typeFromSchema(spec), 'CommentId');
  if (name === 'embedId') return withScalarAlias(typeFromSchema(spec), 'EmbedId');
  if (name === 'shareId') return withScalarAlias(typeFromSchema(spec), 'ShareId');
  if (name === 'scopeType') return withScalarAlias(typeFromSchema(spec), 'ScopeType');
  return typeFromSchema(spec);
}

function typeLabelForField(spec) {
  if (Array.isArray(spec)) return 'string';
  if (!spec || typeof spec !== 'object') return 'string';
  if (spec.type === 'array') return 'array';
  if (spec.type === 'record') return 'record';
  if (spec.type === 'object') return 'object';
  if (spec.type === 'enum') return 'enum';
  return spec.type || 'string';
}

function fieldDoc(name, spec, optional = false) {
  const constraints = [];
  const label = typeLabelForField(spec);
  if (spec && typeof spec === 'object') {
    if (spec.min !== undefined) constraints.push(`>= ${spec.min}`);
    if (spec.max !== undefined) constraints.push(`<= ${spec.max}`);
    if (spec.nullable || spec.clearable) constraints.push('nullable');
    if (optional && (spec.nullable || spec.clearable)) constraints.push('omit to leave unchanged; null to clear');
  }
  return `${name}: ${[label, ...constraints].join(', ')}`;
}

function actionPayloadDocs(action, composition, model, registry = builtinMicroPluginRegistry) {
  const docs = [];
  const roles = authorizationRolesForAction(action, composition, model, registry);
  if (roles.length === 1) docs.push(`Requires \`${roles[0]}\` role.`);
  else if (roles.length > 1) docs.push(`Requires one of ${roles.map((role) => `\`${role}\``).join(', ')} roles.`);
  const payloadSchema = payloadSchemaForAction(action, composition, model, registry);
  for (const [name, spec] of schemaEntries(payloadSchema.required)) {
    docs.push(fieldDoc(name, spec));
  }
  for (const [name, spec] of schemaEntries(payloadSchema.optional)) {
    docs.push(fieldDoc(name, spec, true));
  }
  return docs;
}

function actionPayloadType(action, composition, model, registry = builtinMicroPluginRegistry) {
  const payloadSchema = payloadSchemaForAction(action, composition, model, registry);
  const required = schemaEntries(payloadSchema.required);
  const optional = schemaEntries(payloadSchema.optional);
  const requiredNames = new Set(required.map(([name]) => name));
  const optionalNames = new Set(optional.map(([name]) => name));
  const hasRequiredScope = requiredNames.has('scopeType') && requiredNames.has('scopeId');
  const hasOptionalScope = optionalNames.has('scopeType') && optionalNames.has('scopeId');
  const defaults = action.payloadDefaults || {};
  const chunks = [];
  for (const [name, spec] of required) {
    if ((hasRequiredScope || hasOptionalScope) && (name === 'scopeType' || name === 'scopeId')) continue;
    chunks.push(`${quoteProp(name)}${Object.prototype.hasOwnProperty.call(defaults, name) ? '?' : ''}: ${typeForPayloadField(action, name, spec)}`);
  }
  for (const [name, spec] of optional) {
    if ((hasRequiredScope || hasOptionalScope) && (name === 'scopeType' || name === 'scopeId')) continue;
    chunks.push(`${quoteProp(name)}?: ${typeForPayloadField(action, name, spec)}`);
  }
  const hasShape = payloadSchema.required !== undefined || payloadSchema.optional !== undefined;
  if (payloadSchema.additional === true || !hasShape) chunks.push('[key: string]: unknown');
  const objectType = chunks.length ? `{ ${chunks.join('; ')} }` : 'Record<string, never>';
  if (hasRequiredScope) return objectType === 'Record<string, never>' ? 'ScopeRef' : `${objectType} & ScopeRef`;
  if (hasOptionalScope) return objectType === 'Record<string, never>' ? 'Partial<ScopeRef>' : `${objectType} & Partial<ScopeRef>`;
  return objectType;
}

function actionPayloadEntries(composition, model, registry = builtinMicroPluginRegistry) {
  const entries = [];
  for (const action of composition.actions || []) {
    entries.push([
      action.name,
      actionPayloadType(action, composition, model, registry),
      action.type,
      actionPayloadDocs(action, composition, model, registry)
    ]);
  }
  return entries;
}

function actionsMap(composition, model, registry = builtinMicroPluginRegistry) {
  return Object.fromEntries(actionPayloadEntries(composition, model, registry).map(([name, payloadType]) => [name, payloadType]));
}

module.exports = {
  actionPayloadEntries,
  actionPayloadDocs,
  actionsMap,
  isCoreAction,
  payloadSchemaForAction
};
