export type ContributionVector = [number, number, number, number, number, number, number, number, number, number];

export function zeroVector(): ContributionVector {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

export function vectorForExpressions(ids: number[]): ContributionVector {
  const vector = zeroVector();
  for (const id of ids) if (Number.isInteger(id) && id >= 1 && id <= 9) vector[id] = 1;
  vector[0] = ids.length > 0 ? 1 : 0;
  return vector;
}

export function vectorDiff(next: ContributionVector, previous: ContributionVector): ContributionVector {
  return next.map((value, index) => value - previous[index]) as ContributionVector;
}

export function addVectors(left: ContributionVector, right: ContributionVector): ContributionVector {
  return left.map((value, index) => value + right[index]) as ContributionVector;
}

export function expressionTotal(vector: ContributionVector): number {
  return vector.slice(1).reduce((sum, value) => sum + value, 0);
}

