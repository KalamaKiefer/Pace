const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (inches: number) => inches * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const ftInToCm = (feet: number, inches: number) => inToCm(feet * 12 + inches);
