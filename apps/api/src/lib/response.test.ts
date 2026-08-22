import { describe, it, expect, vi } from 'vitest';
import { sendSuccess } from './response.js';
import type { Response } from 'express';

describe('Response Utils', () => {
  it('sends standard success response without meta', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const data = { id: 1 };
    sendSuccess(res, data);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
    });
  });

  it('sends success response with custom status code', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const data = { id: 1 };
    sendSuccess(res, data, 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
    });
  });

  it('sends success response with meta', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const data = [{ id: 1 }];
    const meta = { total: 10, limit: 10 };
    sendSuccess(res, data, 200, meta);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
      meta,
    });
  });
});
