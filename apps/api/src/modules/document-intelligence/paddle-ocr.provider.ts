import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { storage } from '../storage/storage.js';
import type { OcrInput, OcrProvider, OcrResult } from './document-intelligence.service.js';

/**
 * PaddleOCR adapter. The OCR engine stays outside the NestJS process.
 * Set PADDLEOCR_URL to the internal worker endpoint when the worker is deployed.
 */
@Injectable()
export class PaddleOcrProvider implements OcrProvider {
  readonly name = 'PADDLEOCR';

  async extract(input: OcrInput): Promise<OcrResult> {
    const baseUrl = process.env.PADDLEOCR_URL;
    if (!baseUrl) throw new ServiceUnavailableException('OCR_PROVIDER_NOT_CONFIGURED');

    const source = await storage.get(input.objectKey);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(source.data)], { type: input.mimeType }), input.objectKey.split('/').pop() ?? 'document');

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/ocr`, { method: 'POST', body: form });
    if (!response.ok) throw new Error(`PADDLEOCR_HTTP_${response.status}`);
    const body = await response.json() as { providerRunId?: string; rawText?: string; fields?: OcrResult['fields']; metadata?: Record<string, unknown> };
    return {
      provider: this.name,
      providerRunId: body.providerRunId,
      rawText: body.rawText ?? '',
      fields: body.fields ?? [],
      metadata: body.metadata,
    };
  }
}
