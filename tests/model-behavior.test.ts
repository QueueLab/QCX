import { getModel } from '../lib/utils';

describe('getModel', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return the conservative model by default', () => {
    const { behavior } = getModel();
    expect(behavior).toBe('conservative');
  });

  it('should return the aggressive model when MODEL_BEHAVIOR is set to "aggressive"', () => {
    process.env.MODEL_BEHAVIOR = 'aggressive';
    const { behavior } = getModel();
    expect(behavior).toBe('aggressive');
  });

  it('should return the conservative model when MODEL_BEHAVIOR is set to "conservative"', () => {
    process.env.MODEL_BEHAVIOR = 'conservative';
    const { behavior } = getModel();
    expect(behavior).toBe('conservative');
  });

  it('should return the conservative model when MODEL_BEHAVIOR is set to an invalid value', () => {
    process.env.MODEL_BEHAVIOR = 'invalid';
    const { behavior } = getModel();
    expect(behavior).toBe('conservative');
  });
});
