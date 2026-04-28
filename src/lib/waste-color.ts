export type WasteClass = 'text-success' | 'text-warn' | 'text-danger';

export const WASTE_THRESHOLD_LOW = 15;
export const WASTE_THRESHOLD_HIGH = 30;

export function wasteClass(percent: number): WasteClass {
	if (percent < WASTE_THRESHOLD_LOW) return 'text-success';
	if (percent <= WASTE_THRESHOLD_HIGH) return 'text-warn';
	return 'text-danger';
}
