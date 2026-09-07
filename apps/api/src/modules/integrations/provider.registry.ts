import { Injectable, NotFoundException } from '@nestjs/common';
import type { IntegrationKind, IntegrationProvider } from './provider.contract.js';

@Injectable()
export class IntegrationProviderRegistry {
  private readonly providers = new Map<string, IntegrationProvider>();

  register(provider: IntegrationProvider): void {
    if (this.providers.has(provider.id)) throw new Error(`INTEGRATION_PROVIDER_ALREADY_REGISTERED:${provider.id}`);
    this.providers.set(provider.id, provider);
  }

  get(id: string): IntegrationProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new NotFoundException(`Integration provider introuvable: ${id}`);
    return provider;
  }

  list(kind?: IntegrationKind) {
    return [...this.providers.values()]
      .filter((provider) => !kind || provider.kind === kind)
      .map((provider) => ({
        id: provider.id,
        kind: provider.kind,
        name: provider.name,
        status: provider.status(),
        capabilities: provider.capabilities(),
      }));
  }
}
