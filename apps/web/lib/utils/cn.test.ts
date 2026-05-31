import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('結合する', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('条件付きクラスを除外する', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('競合する tailwind クラスは後勝ちで解決する', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
