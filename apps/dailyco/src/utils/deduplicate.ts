import { Simple } from '#types/index';
import { Types } from 'mongoose';

export const deduplicate = <T extends Simple | Types.ObjectId>(arr: T[]): T[] => Array.from(new Set(arr));
