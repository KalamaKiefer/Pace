import designTokens from '../../../../design/tokens.json';
import { durations, easings } from '../../motion/durations';
import { colors, fontFamily, glow, radius, space, type } from '../tokens';

const camel = (name: string) => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const resolve = (value: string): string => {
  const alias = value.match(/^\{(.+)\}$/);
  if (!alias) return value;
  const target = designTokens.color.tokens.find((t) => t.name === alias[1]);
  if (!target) throw new Error(`Missing alias target ${alias[1]}`);
  return resolve(target.value);
};

describe('theme tokens match the design system', () => {
  it('covers every color with the same value', () => {
    const expected = Object.fromEntries(
      designTokens.color.tokens.map((t) => [camel(t.name), resolve(t.value)]),
    );
    expect(colors).toEqual(expected);
  });

  it('matches spacing', () => {
    const expected = Object.fromEntries(
      designTokens.spacing.tokens.map((t) => [
        t.name.replace('space-', '').replace('-', '.'),
        parseFloat(t.value),
      ]),
    );
    expect(space).toEqual(expected);
  });

  it('matches radii', () => {
    const expected = Object.fromEntries(
      designTokens.radius.tokens.map((t) => [t.name.replace('radius-', ''), parseFloat(t.value)]),
    );
    expect(radius).toEqual(expected);
  });

  it('matches every text style', () => {
    const styles = designTokens.type.groups.flatMap((g) => g.styles);
    expect(Object.keys(type).sort()).toEqual(styles.map((s) => camel(s.name)).sort());
    for (const style of styles) {
      const actual = type[camel(style.name) as keyof typeof type];
      expect(actual.fontSize).toBe(parseFloat(style.fontSize));
      expect(actual.lineHeight).toBe(parseFloat(style.lineHeight));
      expect(actual.fontFamily).toBe(fontFamily[style.fontWeight as keyof typeof fontFamily]);
      const tracking = 'letterSpacing' in style ? parseFloat(style.letterSpacing as string) : 0;
      const actualTracking = 'letterSpacing' in actual ? actual.letterSpacing : 0;
      expect(actualTracking).toBe(tracking);
    }
  });

  it('matches glows', () => {
    for (const token of designTokens.shadow.tokens.filter((t) => t.name.startsWith('glow-'))) {
      const match = token.value.match(/0 0 (\d+)px rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
      expect(match).not.toBeNull();
      const [, blur, r, g, b, alpha] = match!;
      const actual = glow[token.name.replace('glow-', '') as keyof typeof glow];
      const hex = [r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('');
      expect(actual.shadowColor.toLowerCase()).toBe(`#${hex}`);
      expect(actual.shadowRadius).toBe(Number(blur));
      expect(actual.shadowOpacity).toBe(Number(alpha));
    }
  });

  it('matches motion timing', () => {
    for (const token of designTokens.duration.tokens) {
      const key = token.name.replace('dur-', '') as keyof typeof durations;
      expect(durations[key]).toBe(parseFloat(token.value));
    }
    for (const token of designTokens.easing.tokens) {
      const key = token.name.replace('ease-', '') as keyof typeof easings;
      const points = token.value.match(/[\d.]+/g)!.map(Number);
      expect(easings[key]).toEqual(points);
    }
  });
});
