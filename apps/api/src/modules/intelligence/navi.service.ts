import { Injectable } from '@nestjs/common';
import { buildNaviContext } from './navi.context.js';
import { reasonOverContext } from './navi.reasoner.js';

@Injectable()
export class NaviService {
  async query(agencyId: string, query: string) {
    const context = await buildNaviContext(agencyId, query);
    const result = reasonOverContext(context);
    return { ...result, context: { entity: context.entity, missingContext: context.missingContext } };
  }
}
