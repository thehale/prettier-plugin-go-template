import { ulid } from "ulid";

export function createID(): string {
  return ulid();
}