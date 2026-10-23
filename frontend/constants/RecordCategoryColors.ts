/** Shared semantic palette for Home shortcuts and the Records calendar. */
export type RecordCategoryKey = 'reminder' | 'daily' | 'health' | 'weight' | 'care' | 'life';

export const RECORD_CATEGORY_COLORS: Record<RecordCategoryKey, string> = {
  reminder: '#B7653B',
  daily: '#5F9274',
  health: '#C96A58',
  weight: '#68869A',
  care: '#9A8050',
  life: '#8B684D',
};

export const RECORD_CATEGORY_SURFACES: Record<RecordCategoryKey, string> = {
  reminder: '#F8EBDD',
  daily: '#E7F2EA',
  health: '#F6E8E3',
  weight: '#E8EFF3',
  care: '#F2EDDF',
  life: '#EEE6DF',
};

/** 類別文字色獨立於小圓點、圖示等裝飾色，確保淺底小字對比。 */
export const RECORD_CATEGORY_TEXT_COLORS: Record<RecordCategoryKey, string> = {
  reminder: '#984B2C',
  daily: '#3F6F53',
  health: '#B42318',
  weight: '#3F6176',
  care: '#70582D',
  life: '#6A4D38',
};
