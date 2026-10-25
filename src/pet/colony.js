import { createPet, updatePet, blockedSegment } from "./life.js";

const names = ["Хома", "Плюш", "Крош"];
export function setHamsterCount(hamsters, count) {
  if (!Number.isInteger(count) || count < 1 || count > 3) return false;
  while (hamsters.length < count) {
    const member = createPet(),
      index = hamsters.length;
    member.id = index + 1;
    member.name = names[index];
    if (hamsters.length) {
      const first = hamsters[0];
      for (const key of ["supplies", "furniture", "sites", "walls"])
        member[key] = first[key];
      const positions = Array.from({ length: 75 }, (_, i) => 80 + i * 10);
      positions.sort(
        (a, b) =>
          Math.abs(a - (300 + index * 90)) - Math.abs(b - (300 + index * 90)),
      );
      member.x =
        positions.find(
          (x) =>
            !blockedSegment(member, x, 578, x, 578) &&
            hamsters.every((h) => Math.abs(h.x - x) > 45),
        ) ??
        positions.find((x) => !blockedSegment(member, x, 578, x, 578)) ??
        first.x;
    }
    hamsters.push(member);
  }
  hamsters.splice(count);
  return true;
}
export function updateColony(hamsters, dt, random = Math.random) {
  // Shared natural supplies regenerate once per frame, irrespective of population.
  hamsters.forEach((member, index) =>
    updatePet(member, dt, random, index === 0),
  );
}
