export type IntegrationCapabilityInfo = {
  label: string;
  description: string;
  group: "Messaging" | "Commands" | "Webhooks" | "Secrets";
};

const CAPABILITY_INFO: Record<string, IntegrationCapabilityInfo> = {
  "events.ingress": { label: "Receive room events", description: "Let the integration receive approved encrypted room events.", group: "Messaging" },
  "events.egress": { label: "Send room events", description: "Let the integration publish approved encrypted events to the room.", group: "Messaging" },
  "secrets.write": { label: "Store encrypted secrets", description: "Allow encrypted secret values to be stored and rotated for this integration.", group: "Secrets" },
  "commands.register": { label: "Register commands", description: "Add commands that members can invoke through the integration.", group: "Commands" },
  "commands.invoke": { label: "Invoke commands", description: "Run commands exposed by this integration.", group: "Commands" },
  "commands.result": { label: "Publish command results", description: "Publish the result or error from an integration command.", group: "Commands" },
  "webhooks.receive": { label: "Receive webhooks", description: "Accept inbound webhook deliveries for this integration.", group: "Webhooks" },
  "webhooks.manage": { label: "Manage webhooks", description: "Create, update, and remove webhook policies and rate limits.", group: "Webhooks" }
};

export function integrationCapabilityInfo(capability: string): IntegrationCapabilityInfo {
  return CAPABILITY_INFO[capability] || {
    label: capability.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: "This integration requested a capability that this client does not describe yet.",
    group: "Messaging"
  };
}

export function integrationCapabilityLabel(capability: string) {
  return integrationCapabilityInfo(capability).label;
}

export function integrationCapabilityGroups(capabilities: string[]) {
  const groups = new Map<IntegrationCapabilityInfo["group"], string[]>();
  for (const capability of capabilities) {
    const group = integrationCapabilityInfo(capability).group;
    groups.set(group, [...(groups.get(group) || []), capability]);
  }
  return [...groups.entries()].map(([group, values]) => ({ group, capabilities: values }));
}
